/* =========================================================================
   MODULE: TEXT WATERMARK REMOVER (CYZANFAR/TEXT-WATERMARK-REMOVER PORT)
   Nettoyeur deterministe de watermarks et canaux caches Unicode pour le texte.
   Supprime les artefacts invisibles : zero-width, variation selectors,
   tags block, espaces exotiques non-standards et controles bidi isoles.
   ========================================================================= */

(function (global) {
  'use strict';

  const POLICY_VERSION = '2026.08';

  const POLICY_RULES = Object.freeze([
    [0x00ad, 0x00ad, 'soft_hyphen', 'delete', 'SHY', 'preserve'],
    [0x034f, 0x034f, 'other_invisible', 'delete', 'CGJ', 'preserve'],
    [0x061c, 0x061c, 'bidi_control', 'delete', 'ALM', 'bidi_context'],
    [0x115f, 0x1160, 'other_invisible', 'delete', 'HANGUL_FILLER', 'script_context'],
    [0x17b4, 0x17b5, 'other_invisible', 'delete', 'KHMER_INHERENT', 'script_context'],
    [0x180e, 0x180e, 'other_invisible', 'delete', 'MVS', 'preserve'],
    [0x200b, 0x200b, 'zero_width', 'delete', 'ZWSP', 'delete'],
    [0x200c, 0x200c, 'zero_width', 'delete', 'ZWNJ', 'join_context'],
    [0x200d, 0x200d, 'zero_width', 'delete', 'ZWJ', 'join_context'],
    [0x200e, 0x200f, 'bidi_control', 'delete', 'BIDI_MARK', 'bidi_context'],
    [0x202a, 0x202e, 'bidi_control', 'delete', 'BIDI_EMBED', 'bidi_context'],
    [0x2060, 0x2060, 'zero_width', 'delete', 'WJ', 'preserve'],
    [0x2061, 0x2064, 'other_invisible', 'delete', 'INVISIBLE_OPERATOR', 'preserve'],
    [0x2066, 0x2069, 'bidi_control', 'delete', 'BIDI_ISOLATE', 'bidi_context'],
    [0x206a, 0x206f, 'bidi_control', 'delete', 'BIDI_DEPRECATED', 'bidi_context'],
    [0xfe00, 0xfe0f, 'variation_selector', 'delete', 'VS', 'variation_context'],
    [0xfeff, 0xfeff, 'zero_width', 'delete', 'BOM', 'leading_bom'],
    [0xfff9, 0xfffb, 'other_invisible', 'delete', 'INTERLINEAR', 'preserve'],
    [0xe0000, 0xe007f, 'tags_block', 'delete', 'TAG', 'emoji_tag_context'],
    [0xe0100, 0xe01ef, 'variation_selector', 'delete', 'VS', 'variation_context'],
    [0x00a0, 0x00a0, 'exotic_space', 'space', 'NBSP', 'space'],
    [0x1680, 0x1680, 'exotic_space', 'space', 'OGHAM', 'space'],
    [0x2000, 0x200a, 'exotic_space', 'space', 'SPACE', 'space'],
    [0x2028, 0x2029, 'exotic_space', 'space', 'LINE_SEPARATOR', 'preserve'],
    [0x202f, 0x202f, 'exotic_space', 'space', 'NNBSP', 'space'],
    [0x205f, 0x205f, 'exotic_space', 'space', 'MMSP', 'space'],
    [0x3000, 0x3000, 'exotic_space', 'space', 'IDSP', 'space'],
  ]);

  const mark = /\p{Mark}/u;
  const emoji = /\p{Extended_Pictographic}/u;
  const scriptMatchers = [
    ['Latin', /\p{Script=Latin}/u],
    ['Arabic', /\p{Script=Arabic}/u],
    ['Hebrew', /\p{Script=Hebrew}/u],
    ['Syriac', /\p{Script=Syriac}/u],
    ['Thaana', /\p{Script=Thaana}/u],
    ['Devanagari', /\p{Script=Devanagari}/u],
    ['Bengali', /\p{Script=Bengali}/u],
    ['Gurmukhi', /\p{Script=Gurmukhi}/u],
    ['Gujarati', /\p{Script=Gujarati}/u],
    ['Oriya', /\p{Script=Oriya}/u],
    ['Tamil', /\p{Script=Tamil}/u],
    ['Telugu', /\p{Script=Telugu}/u],
    ['Kannada', /\p{Script=Kannada}/u],
    ['Malayalam', /\p{Script=Malayalam}/u],
    ['Sinhala', /\p{Script=Sinhala}/u],
    ['Thai', /\p{Script=Thai}/u],
    ['Lao', /\p{Script=Lao}/u],
    ['Tibetan', /\p{Script=Tibetan}/u],
    ['Myanmar', /\p{Script=Myanmar}/u],
    ['Hangul', /\p{Script=Hangul}/u],
    ['Khmer', /\p{Script=Khmer}/u],
    ['Han', /\p{Script=Han}/u],
  ];
  const rtlScripts = new Set(['Arabic', 'Hebrew', 'Syriac', 'Thaana']);

  function ruleFor(value) {
    return POLICY_RULES.find(([start, end]) => value >= start && value <= end) || null;
  }

  function scriptOf(character) {
    if (!character) return 'Common';
    for (const [name, matcher] of scriptMatchers) {
      if (matcher.test(character)) return name;
    }
    return mark.test(character) ? 'Inherited' : 'Common';
  }

  function isVariation(value) {
    return (value >= 0xfe00 && value <= 0xfe0f) || (value >= 0xe0100 && value <= 0xe01ef);
  }

  function nearestBase(points, position, direction) {
    let cursor = position + direction;
    for (let attempt = 0; attempt < 8 && cursor >= 0 && cursor < points.length; attempt += 1) {
      const character = points[cursor];
      const value = character.codePointAt(0);
      if (mark.test(character) || value === 0x200c || value === 0x200d || isVariation(value)) {
        cursor += direction;
        continue;
      }
      return character;
    }
    return '';
  }

  function meaningfulJoin(points, position) {
    const left = nearestBase(points, position, -1);
    const right = nearestBase(points, position, 1);
    if (points[position].codePointAt(0) === 0x200d && emoji.test(left) && emoji.test(right)) return true;
    const leftScript = scriptOf(left);
    return leftScript === scriptOf(right) && !['Common', 'Inherited', 'Latin'].includes(leftScript);
  }

  function meaningfulVariation(points, position) {
    const left = nearestBase(points, position, -1);
    const immediateRight = points[position + 1] || '';
    const value = points[position].codePointAt(0);
    if (!left) return false;
    if (emoji.test(left)) return true;
    if (value >= 0xe0100) return scriptOf(left) === 'Han';
    if (value === 0xfe0f && '#*0123456789'.includes(left) && immediateRight.codePointAt(0) === 0x20e3) return true;
    return left.codePointAt(0) >= 0x80;
  }

  function hasRtlContext(points, position) {
    return points.slice(Math.max(0, position - 64), position + 65).some((character) => rtlScripts.has(scriptOf(character)));
  }

  function validEmojiTags(points) {
    const valid = new Set();
    for (let position = 0; position < points.length; position += 1) {
      if (points[position].codePointAt(0) !== 0x1f3f4) continue;
      let cursor = position + 1;
      while (cursor < points.length) {
        const value = points[cursor].codePointAt(0);
        if (value < 0xe0020 || value > 0xe007e) break;
        cursor += 1;
      }
      if (cursor > position + 1 && cursor < points.length && points[cursor].codePointAt(0) === 0xe007f) {
        for (let member = position + 1; member <= cursor; member += 1) valid.add(member);
        position = cursor;
      }
    }
    return valid;
  }

  function contextDecision(points, position, category, safeRule, validTags) {
    const value = points[position].codePointAt(0);
    if (safeRule === 'delete') return [false, 'actionable', 'unambiguous covert character'];
    if (safeRule === 'space') return [false, 'contextual', 'non-standard spacing'];
    if (safeRule === 'preserve') return [true, 'contextual', 'semantic formatting use is possible'];
    if (safeRule === 'leading_bom') {
      return position === 0
        ? [true, 'informational', 'leading Unicode byte-order mark']
        : [false, 'actionable', 'embedded byte-order mark'];
    }
    if (safeRule === 'join_context') {
      const meaningful = meaningfulJoin(points, position);
      return meaningful
        ? [true, 'informational', 'emoji or script-shaping join control']
        : [false, 'actionable', 'join control outside a recognized shaping context'];
    }
    if (safeRule === 'variation_context') {
      const meaningful = meaningfulVariation(points, position);
      return meaningful
        ? [true, 'informational', 'compatible glyph-selection context']
        : [false, 'actionable', 'selector outside a recognized glyph-selection context'];
    }
    if (safeRule === 'emoji_tag_context') {
      return validTags.has(position)
        ? [true, 'informational', 'valid emoji tag sequence']
        : [false, 'actionable', 'tag outside a valid emoji tag sequence'];
    }
    if (safeRule === 'bidi_context') {
      return hasRtlContext(points, position)
        ? [true, 'contextual', 'bidirectional control near strong RTL text']
        : [false, 'actionable', 'bidirectional control without nearby RTL text'];
    }
    if (safeRule === 'script_context') {
      const nativeScript = value <= 0x1160 ? 'Hangul' : 'Khmer';
      const meaningful = scriptOf(nearestBase(points, position, -1)) === nativeScript || scriptOf(nearestBase(points, position, 1)) === nativeScript;
      return meaningful
        ? [true, 'informational', 'format character in its native script']
        : [false, 'contextual', 'format character outside its native script'];
    }
    return [false, category === 'bidi_control' ? 'actionable' : 'contextual', 'unknown policy context'];
  }

  function inspectText(text) {
    if (typeof text !== 'string') return [];
    const points = Array.from(text);
    const validTags = validEmojiTags(points);
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const findings = [];
    let utf16Index = 0;
    let byteOffset = 0;

    for (let index = 0; index < points.length; index += 1) {
      const character = points[index];
      const value = character.codePointAt(0);
      const rule = ruleFor(value);
      if (rule) {
        const [, , category, , token, safeRule] = rule;
        const [preserved, disposition, context] = contextDecision(points, index, category, safeRule, validTags);
        findings.push({
          index,
          utf16Index,
          byteOffset,
          codepoint: 'U+' + value.toString(16).toUpperCase().padStart(4, '0'),
          category,
          label: token,
          disposition,
          context,
          safeAction: preserved ? 'preserve' : rule[3],
        });
      }
      utf16Index += character.length;
      byteOffset += encoder ? encoder.encode(character).length : character.length;
    }
    return findings;
  }

  function sanitizeTextWithReport(text) {
    if (typeof text !== 'string') return { cleanedText: text, changed: false, counts: {}, edits: [], policyVersion: POLICY_VERSION };
    const points = Array.from(text);
    const validTags = validEmojiTags(points);
    const output = [];
    const edits = [];
    const counts = {};
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    let byteOffset = 0;

    for (let index = 0; index < points.length; index += 1) {
      const character = points[index];
      const value = character.codePointAt(0);
      const rule = ruleFor(value);
      const charBytes = encoder ? encoder.encode(character).length : character.length;

      if (!rule) {
        output.push(character);
        byteOffset += charBytes;
        continue;
      }
      const [, , category, action, , safeRule] = rule;
      const [preserved, disposition, context] = contextDecision(points, index, category, safeRule, validTags);
      if (preserved) {
        output.push(character);
        byteOffset += charBytes;
        continue;
      }
      const replacement = action === 'space' ? ' ' : '';
      output.push(replacement);
      counts[category] = (counts[category] || 0) + 1;
      edits.push({
        index,
        byteOffset,
        codepoint: 'U+' + value.toString(16).toUpperCase().padStart(4, '0'),
        category,
        action,
        original: character,
        replacement,
        disposition,
        context,
        stage: 'policy',
      });
      byteOffset += charBytes;
    }

    const strippedText = output.join('');
    const cleanedText = typeof strippedText.normalize === 'function' ? strippedText.normalize('NFC') : strippedText;

    return {
      cleanedText,
      changed: cleanedText !== text,
      counts,
      edits,
      policyVersion: POLICY_VERSION,
    };
  }

  function sanitizeText(text) {
    return sanitizeTextWithReport(text).cleanedText;
  }

  const TextWatermarkRemover = {
    POLICY_VERSION,
    POLICY_RULES,
    inspectText,
    sanitizeTextWithReport,
    sanitize: sanitizeText,
    sanitizeText,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextWatermarkRemover;
  } else {
    global.TextWatermarkRemover = TextWatermarkRemover;
  }
})(typeof window !== 'undefined' ? window : globalThis);
