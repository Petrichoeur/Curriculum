#!/usr/bin/env python3
"""Script de nettoyage et d'assainissement amont des cours pédagogiques.
Exécute le nettoyeur de watermarks Unicode avant enregistrement sur disque.
Garantit que le DOM client reçoit un JSON 100% propre sans aucun surcoût de parsing.

Usage : python3 tools/sanitize_courses.py
"""

import json
import os
import sys

from watermark_remover import sanitize_with_report

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "config", "educational.json")


def sanitize_all_courses(json_path=JSON_PATH):
    if not os.path.exists(json_path):
        print(f"Erreur : fichier introuvable {json_path}", file=sys.stderr)
        return

    with open(json_path, "r", encoding="utf-8") as f:
        courses = json.load(f)

    total_modified = 0
    global_counts = {}

    for idx, c in enumerate(courses):
        cid = c.get("id", f"index_{idx}")
        course_changed = False

        for field in ["title", "chapterTitle", "chapterShort", "domainTitle", "content"]:
            val = c.get(field)
            if isinstance(val, str):
                cleaned, changed, counts = sanitize_with_report(val)
                if changed:
                    c[field] = cleaned
                    course_changed = True
                    for cat, cnt in counts.items():
                        global_counts[cat] = global_counts.get(cat, 0) + cnt

        if course_changed:
            total_modified += 1
            print(f"Cours nettoye : {cid} ({c.get('title')})")

    with open(json_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Assainissement termine sur {len(courses)} cours.")
    print(f"Cours contenant des watermarks nettoyes : {total_modified}")
    if global_counts:
        print(f"Rapport des artefacts supprimes : {global_counts}")
    else:
        print("Aucun artefact Unicode covert detecte : tous les cours etaient deja 100% propres.")


if __name__ == "__main__":
    sanitize_all_courses()
