#!/usr/bin/env python3
"""Module de nettoyage deterministe de watermarks et canaux caches Unicode.
Portage fidele du depot open-source cyzanfar/text-watermark-remover en pur Python.

Supprime les artefacts invisibles inseres par les modeles d'IA (zero-width,
variation selectors, tags block, espaces exotiques et controles bidi isoles)
avant ecriture dans educational.json, evitant tout ralentissement du DOM client.
"""

import unicodedata
from typing import Dict, List, Optional, Set, Tuple

POLICY_VERSION = "2026.08"

# Regles canoniques : (start, end, category, action, token, safe_rule)
POLICY_RULES: List[Tuple[int, int, str, str, str, str]] = [
    (0x00AD, 0x00AD, "soft_hyphen", "delete", "SHY", "preserve"),
    (0x034F, 0x034F, "other_invisible", "delete", "CGJ", "preserve"),
    (0x061C, 0x061C, "bidi_control", "delete", "ALM", "bidi_context"),
    (0x115F, 0x1160, "other_invisible", "delete", "HANGUL_FILLER", "script_context"),
    (0x17B4, 0x17B5, "other_invisible", "delete", "KHMER_INHERENT", "script_context"),
    (0x180E, 0x180E, "other_invisible", "delete", "MVS", "preserve"),
    (0x200B, 0x200B, "zero_width", "delete", "ZWSP", "delete"),
    (0x200C, 0x200C, "zero_width", "delete", "ZWNJ", "join_context"),
    (0x200D, 0x200D, "zero_width", "delete", "ZWJ", "join_context"),
    (0x200E, 0x200F, "bidi_control", "delete", "BIDI_MARK", "bidi_context"),
    (0x202A, 0x202E, "bidi_control", "delete", "BIDI_EMBED", "bidi_context"),
    (0x2060, 0x2060, "zero_width", "delete", "WJ", "preserve"),
    (0x2061, 0x2064, "other_invisible", "delete", "INVISIBLE_OPERATOR", "preserve"),
    (0x2066, 0x2069, "bidi_control", "delete", "BIDI_ISOLATE", "bidi_context"),
    (0x206A, 0x206F, "bidi_control", "delete", "BIDI_DEPRECATED", "bidi_context"),
    (0xFE00, 0xFE0F, "variation_selector", "delete", "VS", "variation_context"),
    (0xFEFF, 0xFEFF, "zero_width", "delete", "BOM", "leading_bom"),
    (0xFFF9, 0xFFFB, "other_invisible", "delete", "INTERLINEAR", "preserve"),
    (0xE0000, 0xE007F, "tags_block", "delete", "TAG", "emoji_tag_context"),
    (0xE0100, 0xE01EF, "variation_selector", "delete", "VS", "variation_context"),
    (0x00A0, 0x00A0, "exotic_space", "space", "NBSP", "space"),
    (0x1680, 0x1680, "exotic_space", "space", "OGHAM", "space"),
    (0x2000, 0x200A, "exotic_space", "space", "SPACE", "space"),
    (0x2028, 0x2029, "exotic_space", "space", "LINE_SEPARATOR", "preserve"),
    (0x202F, 0x202F, "exotic_space", "space", "NNBSP", "space"),
    (0x205F, 0x205F, "exotic_space", "space", "MMSP", "space"),
    (0x3000, 0x3000, "exotic_space", "space", "IDSP", "space"),
]

RTL_SCRIPTS: Set[str] = {"Arabic", "Hebrew", "Syriac", "Thaana"}


def _is_mark(char: str) -> bool:
    return unicodedata.category(char).startswith("M")


def _is_emoji(char: str) -> bool:
    cp = ord(char)
    # Emoji ranges principaux
    return (
        0x1F300 <= cp <= 0x1FAFF
        or 0x2600 <= cp <= 0x27BF
        or 0x1F1E6 <= cp <= 0x1F1FF
    )


def _get_script(char: str) -> str:
    if not char:
        return "Common"
    try:
        name = unicodedata.name(char)
    except ValueError:
        return "Common"

    for prefix, script in (
        ("LATIN", "Latin"),
        ("ARABIC", "Arabic"),
        ("HEBREW", "Hebrew"),
        ("SYRIAC", "Syriac"),
        ("THAANA", "Thaana"),
        ("DEVANAGARI", "Devanagari"),
        ("BENGALI", "Bengali"),
        ("GURMUKHI", "Gurmukhi"),
        ("GUJARATI", "Gujarati"),
        ("ORIYA", "Oriya"),
        ("TAMIL", "Tamil"),
        ("TELUGU", "Telugu"),
        ("KANNADA", "Kannada"),
        ("MALAYALAM", "Malayalam"),
        ("SINHALA", "Sinhala"),
        ("THAI", "Thai"),
        ("LAO", "Lao"),
        ("TIBETAN", "Tibetan"),
        ("MYANMAR", "Myanmar"),
        ("HANGUL", "Hangul"),
        ("KHMER", "Khmer"),
        ("CJK", "Han"),
        ("IDEOGRAPH", "Han"),
    ):
        if name.startswith(prefix):
            return script
    if _is_mark(char):
        return "Inherited"
    return "Common"


def _rule_for(code_point: int) -> Optional[Tuple[int, int, str, str, str, str]]:
    for rule in POLICY_RULES:
        if rule[0] <= code_point <= rule[1]:
            return rule
    return None


def _is_variation(cp: int) -> bool:
    return (0xFE00 <= cp <= 0xFE0F) or (0xE0100 <= cp <= 0xE01EF)


def _nearest_base(chars: List[str], position: int, direction: int) -> str:
    cursor = position + direction
    attempts = 0
    while 0 <= cursor < len(chars) and attempts < 8:
        ch = chars[cursor]
        cp = ord(ch)
        if _is_mark(ch) or cp == 0x200C or cp == 0x200D or _is_variation(cp):
            cursor += direction
            attempts += 1
            continue
        return ch
    return ""


def _meaningful_join(chars: List[str], position: int) -> bool:
    left = _nearest_base(chars, position, -1)
    right = _nearest_base(chars, position, 1)
    if ord(chars[position]) == 0x200D and _is_emoji(left) and _is_emoji(right):
        return True
    left_script = _get_script(left)
    right_script = _get_script(right)
    return left_script == right_script and left_script not in {"Common", "Inherited", "Latin"}


def _meaningful_variation(chars: List[str], position: int) -> bool:
    left = _nearest_base(chars, position, -1)
    cp = ord(chars[position])
    if not left:
        return False
    if _is_emoji(left):
        return True
    if cp >= 0xE0100:
        return _get_script(left) == "Han"
    if cp == 0xFE0F and left in "#*0123456789":
        if position + 1 < len(chars) and ord(chars[position + 1]) == 0x20E3:
            return True
    return ord(left) >= 0x80


def _has_rtl_context(chars: List[str], position: int) -> bool:
    start = max(0, position - 64)
    end = min(len(chars), position + 65)
    return any(_get_script(ch) in RTL_SCRIPTS for ch in chars[start:end])


def _valid_emoji_tag_positions(chars: List[str]) -> Set[int]:
    valid: Set[int] = set()
    pos = 0
    while pos < len(chars):
        if ord(chars[pos]) == 0x1F3F4:  # Drapeau noir
            cursor = pos + 1
            while cursor < len(chars) and 0xE0020 <= ord(chars[cursor]) <= 0xE007E:
                cursor += 1
            if cursor > pos + 1 and cursor < len(chars) and ord(chars[cursor]) == 0xE007F:
                for idx in range(pos + 1, cursor + 1):
                    valid.add(idx)
                pos = cursor
        pos += 1
    return valid


def _context_decision(
    chars: List[str],
    position: int,
    category: str,
    safe_rule: str,
    valid_tags: Set[int],
) -> Tuple[bool, str, str]:
    cp = ord(chars[position])
    if safe_rule == "delete":
        return False, "actionable", "unambiguous covert character"
    if safe_rule == "space":
        return False, "contextual", "non-standard spacing"
    if safe_rule == "preserve":
        return True, "contextual", "semantic formatting use is possible"
    if safe_rule == "leading_bom":
        return (True, "informational", "leading BOM") if position == 0 else (False, "actionable", "embedded BOM")
    if safe_rule == "join_context":
        return (
            (True, "informational", "valid join control")
            if _meaningful_join(chars, position)
            else (False, "actionable", "isolated join control")
        )
    if safe_rule == "variation_context":
        return (
            (True, "informational", "valid glyph variation")
            if _meaningful_variation(chars, position)
            else (False, "actionable", "isolated variation selector")
        )
    if safe_rule == "emoji_tag_context":
        return (
            (True, "informational", "valid emoji tag sequence")
            if position in valid_tags
            else (False, "actionable", "isolated tag character")
        )
    if safe_rule == "bidi_context":
        return (
            (True, "contextual", "bidi in RTL text")
            if _has_rtl_context(chars, position)
            else (False, "actionable", "bidi control outside RTL")
        )
    if safe_rule == "script_context":
        native = "Hangul" if cp <= 0x1160 else "Khmer"
        left_s = _get_script(_nearest_base(chars, position, -1))
        right_s = _get_script(_nearest_base(chars, position, 1))
        meaningful = (left_s == native or right_s == native)
        return (
            (True, "informational", f"native {native} formatting")
            if meaningful
            else (False, "contextual", f"isolated {native} formatting")
        )
    return False, "contextual", "unknown policy"


def sanitize_with_report(text: str) -> Tuple[str, bool, Dict[str, int]]:
    """Assainit le texte selon la politique stricte de cyzanfar/text-watermark-remover.

    Renvoie : (texte_nettoye, a_ete_modifie, compteur_par_categorie)
    """
    if not isinstance(text, str):
        return text, False, {}

    chars = list(text)
    valid_tags = _valid_emoji_tag_positions(chars)
    output: List[str] = []
    counts: Dict[str, int] = {}

    for pos, ch in enumerate(chars):
        cp = ord(ch)
        rule = _rule_for(cp)
        if not rule:
            output.append(ch)
            continue

        _, _, category, action, _, safe_rule = rule
        preserved, _, _ = _context_decision(chars, pos, category, safe_rule, valid_tags)
        if preserved:
            output.append(ch)
            continue

        replacement = " " if action == "space" else ""
        output.append(replacement)
        counts[category] = counts.get(category, 0) + 1

    stripped = "".join(output)
    cleaned = unicodedata.normalize("NFC", stripped)
    changed = (cleaned != text)
    return cleaned, changed, counts


def sanitize(text: str) -> str:
    """Version rapide de sanitisation renvoyant directement la chaine propre."""
    cleaned, _, _ = sanitize_with_report(text)
    return cleaned


if __name__ == "__main__":
    test_str = "U\ufe02n g\ufe06rand\ufe00 mo\ufe09dèle d\ufe0ee la\ufe09n\ufe04g\ufe01ag\ufe05e\ufe05 (LLM)\u200b!"
    res, mod, rep = sanitize_with_report(test_str)
    print("Avant :", repr(test_str))
    print("Apres :", repr(res))
    print("Modifie :", mod)
    print("Rapport :", rep)
