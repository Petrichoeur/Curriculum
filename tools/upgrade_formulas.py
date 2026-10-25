#!/usr/bin/env python3
"""Met à niveau toutes les formules mathématiques des cours vers un format LaTeX élégant.
Utilise KaTeX pour un rendu typographique parfait (fractions, racines, intégrales, sommes).
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "config", "educational.json")

def upgrade():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        courses = json.load(f)

    for c in courses:
        cid = c.get("id")
        content = c["content"]

        if cid == "proba_fondamentales":
            repl1 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\mathbb{E}[X] = \\sum_{i=1}^{n} x_i \\cdot P(X = x_i)">\\mathbb{E}[X] = \\sum_{i=1}^{n} x_i \\cdot P(X = x_i)</div>
    <span class="formula-note">Espérance mathématique : moyenne théorique pondérée par les probabilités (centre de gravité)</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Espérance E\(X\).*?</div>',
                lambda m: repl1,
                content,
                flags=re.DOTALL
            )

            repl2 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\text{Var}(X) = \\mathbb{E}\\left[(X - \\mu)^2\\right] = \\sigma^2 \\qquad \\sigma = \\sqrt{\\text{Var}(X)}">\\text{Var}(X) = \\mathbb{E}\\left[(X - \\mu)^2\\right] = \\sigma^2 \\qquad \\sigma = \\sqrt{\\text{Var}(X)}</div>
    <span class="formula-note">Variance et écart-type : mesure de la dispersion des valeurs autour de la moyenne</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Variance Var\(X\).*?</div>',
                lambda m: repl2,
                content,
                flags=re.DOTALL
            )

            repl3 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="Z_N = \\frac{\\bar{X}_N - \\mu}{\\frac{\\sigma}{\\sqrt{N}}} \\xrightarrow[N \\to \\infty]{\\mathcal{D}} \\mathcal{N}(0, 1)">Z_N = \\frac{\\bar{X}_N - \\mu}{\\frac{\\sigma}{\\sqrt{N}}} \\xrightarrow[N \\to \\infty]{\\mathcal{D}} \\mathcal{N}(0, 1)</div>
    <span class="formula-note">Théorème Central Limite : la moyenne empirique converge en loi vers une loi normale standard (dispersion réduite par √N)</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Z<sub>N</sub> = \(Moyenne observée.*?</div>',
                lambda m: repl3,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("proba_fondamentales mis a jour")

        elif cid == "loi_normale":
            repl1 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)">f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)</div>
    <span class="formula-note">Densité de probabilité gaussienne : profil de la courbe en cloche au point x</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*f\(x\) = \[ 1 /.*?</div>',
                lambda m: repl1,
                content,
                flags=re.DOTALL
            )

            repl2 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="Z = \\frac{X - \\mu}{\\sigma} \\sim \\mathcal{N}(0, 1)">Z = \\frac{X - \\mu}{\\sigma} \\sim \\mathcal{N}(0, 1)</div>
    <span class="formula-note">Score standardisé Z : distance à la moyenne mesurée en unités d'écart-type</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Z = \(X − μ\) / σ.*?</div>',
                lambda m: repl2,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("loi_normale mis a jour")

        elif cid == "loi_weibull":
            repl1 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="f(t) = \\frac{k}{\\lambda} \\left(\\frac{t}{\\lambda}\\right)^{k-1} \\exp\\left( -\\left(\\frac{t}{\\lambda}\\right)^k \\right) \\quad (t \\ge 0)">f(t) = \\frac{k}{\\lambda} \\left(\\frac{t}{\\lambda}\\right)^{k-1} \\exp\\left( -\\left(\\frac{t}{\\lambda}\\right)^k \\right) \\quad (t \\ge 0)</div>
    <span class="formula-note">Densité de probabilité de Weibull : répartition temporelle des défaillances</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Densité f\(t\).*?</div>',
                lambda m: repl1,
                content,
                flags=re.DOTALL
            )

            repl2 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="R(t) = \\mathbb{P}(T > t) = \\exp\\left( -\\left(\\frac{t}{\\lambda}\\right)^k \\right)">R(t) = \\mathbb{P}(T > t) = \\exp\\left( -\\left(\\frac{t}{\\lambda}\\right)^k \\right)</div>
    <span class="formula-note">Fiabilité / Survie R(t) : probabilité de fonctionner sans panne après une durée t</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Fiabilité / Survie R\(t\).*?</div>',
                lambda m: repl2,
                content,
                flags=re.DOTALL
            )

            repl3 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="h(t) = \\frac{f(t)}{R(t)} = \\frac{k}{\\lambda} \\left(\\frac{t}{\\lambda}\\right)^{k-1}">h(t) = \\frac{f(t)}{R(t)} = \\frac{k}{\\lambda} \\left(\\frac{t}{\\lambda}\\right)^{k-1}</div>
    <span class="formula-note">Taux de défaillance instantané (Hazard Rate) : risque conditionnel de panne immédiate</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Taux de panne instantané h\(t\).*?</div>',
                lambda m: repl3,
                content,
                flags=re.DOTALL
            )

            repl4 = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\text{MTTF} = \\mathbb{E}[T] = \\lambda \\cdot \\Gamma\\left(1 + \\frac{1}{k}\\right)">\\text{MTTF} = \\mathbb{E}[T] = \\lambda \\cdot \\Gamma\\left(1 + \\frac{1}{k}\\right)</div>
    <span class="formula-note">Durée moyenne avant panne (MTTF) : espérance de vie moyenne (avec Γ fonction Gamma d'Euler)</span>
</div>"""
            content = re.sub(
                r'<div class="edu-formula">\s*Durée moyenne avant panne \(MTTF\).*?</div>',
                lambda m: repl4,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("loi_weibull mis a jour")

        elif cid == "embedding":
            repl = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\vec{v}_{\\text{roi}} - \\vec{v}_{\\text{homme}} + \\vec{v}_{\\text{femme}} \\approx \\vec{v}_{\\text{reine}}">\\vec{v}_{\\text{roi}} - \\vec{v}_{\\text{homme}} + \\vec{v}_{\\text{femme}} \\approx \\vec{v}_{\\text{reine}}</div>
    <span class="formula-note">Arithmétique sémantique dans l'espace vectoriel latent des plongements lexicaux</span>
</div>"""
            content = re.sub(
                r'<p class="edu-formula">vecteur\(roi\).*?</p>',
                lambda m: repl,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("embedding mis a jour")

        elif cid == "transformer":
            repl = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{Q K^T}{\\sqrt{d_k}} \\right) V">\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{Q K^T}{\\sqrt{d_k}} \\right) V</div>
    <span class="formula-note">Attention produit scalaire mise à l'échelle (Scaled Dot-Product Attention)</span>
</div>"""
            content = re.sub(
                r'<p class="edu-formula">Attention\(Q, K, V\).*?</p>',
                lambda m: repl,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("transformer mis a jour")

        elif cid == "distillation":
            repl = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\mathcal{L}_{\\text{total}} = \\alpha \\, \\mathcal{L}_{\\text{KD}}(P_{\\text{élève}}, P_{\\text{prof}}) + (1 - \\alpha) \\, \\mathcal{L}_{\\text{CE}}(y, P_{\\text{élève}})">\\mathcal{L}_{\\text{total}} = \\alpha \\, \\mathcal{L}_{\\text{KD}}(P_{\\text{élève}}, P_{\\text{prof}}) + (1 - \\alpha) \\, \\mathcal{L}_{\\text{CE}}(y, P_{\\text{élève}})</div>
    <span class="formula-note">Fonction de perte combinée : distillation de connaissances douces (KD) et étiquettes réelles (CE)</span>
</div>"""
            content = re.sub(
                r'<p class="edu-formula">Perte = α · Imitation.*?</p>',
                lambda m: repl,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("distillation mis a jour")

        elif cid == "kv_cache":
            repl = """<div class="edu-formula">
    <div class="math-tex math-display" data-tex="\\text{Mémoire}_{\\text{KV}} = 2 \\times n_{\\text{couches}} \\times n_{\\text{têtes}} \\times d_{\\text{tête}} \\times L_{\\text{contexte}} \\times \\text{octets_par_élément}">\\text{Mémoire}_{\\text{KV}} = 2 \\times n_{\\text{couches}} \\times n_{\\text{têtes}} \\times d_{\\text{tête}} \\times L_{\\text{contexte}} \\times \\text{octets_par_élément}</div>
    <span class="formula-note">Dimensionnement mémoire du cache des clés et valeurs (K et V) lors de la génération</span>
</div>"""
            content = re.sub(
                r'<p class="edu-formula">Taille KV Cache = 2.*?</p>',
                lambda m: repl,
                content,
                flags=re.DOTALL
            )
            c["content"] = content
            print("kv_cache mis a jour")

        elif cid == "training":
            if "LoRA" in content and "W = W_0" not in content:
                content = content.replace(
                    "<h3>4. L’astuce MLOps : le Fine-Tuning léger avec LoRA et QLoRA</h3>",
                    """<h3>4. L’astuce MLOps : le Fine-Tuning léger avec LoRA et QLoRA</h3>
<div class="edu-formula">
    <div class="math-tex math-display" data-tex="W = W_0 + \\Delta W = W_0 + \\frac{\\alpha}{r} \\left( B \\times A \\right)">W = W_0 + \\Delta W = W_0 + \\frac{\\alpha}{r} \\left( B \\times A \\right)</div>
    <span class="formula-note">Décomposition de rang faible LoRA : poids de base gelés W₀ et adaptateurs légers B et A de rang r</span>
</div>"""
                )
                c["content"] = content
                print("training mis a jour")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Mise a niveau des formules terminee.")

if __name__ == "__main__":
    upgrade()
