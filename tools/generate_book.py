#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur du Manuel Fondamental d'Intelligence Artificielle & IAOps (Livre condensé).
Produit un document HTML complet typographié pour livre papier/PDF,
puis le compile en PDF haute fidélité via Google Chrome headless.
"""

import os
import sys
import json
import re
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = REPO_ROOT / "config" / "educational.json"
OUTPUT_HTML = REPO_ROOT / "tools" / "livre_iaops_manuscrit.html"
OUTPUT_PDF = REPO_ROOT / "livre_iaops_condense.pdf"

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Descriptions et introductions approfondies des 6 grandes parties
PART_INTROS = {
    "ch1_stats": {
        "num": "PREMIÈRE PARTIE",
        "title": "FONDATIONS STATISTIQUES, PROBABILITÉS & COMPLEXITÉ DE L'APPRENTISSAGE",
        "intro": """
L'apprentissage automatique et l'intelligence artificielle contemporaine ne sont pas nés d'une génération spontanée du silicium : ils sont le prolongement direct de trois siècles de mathématiques fondamentales, de probabilités infinitésimales et de physique statistique. 

Avant d'ajuster un milliard de paramètres matriciels ou d'aligner un modèle de langage, l'ingénieur doit impérativement maîtriser les lois qui régissent l'incertitude, la dispersion du signal dans le bruit, le vieillissement des systèmes réels et les limites théoriques de ce qu'un algorithme fini peut déduire d'un échantillon fini de données.

Cette première partie pose le socle inébranlable sans lequel tout édifice algorithmique s'effondre : la mécanique du Théorème Central Limite, la géométrie de la distribution gaussienne, les équations d'usure et de défaillance de Weibull pour l'ingénierie de production, et enfin la monumentale Théorie VC (Vapnik-Chervonenkis) qui sépare mathématiquement l'apprentissage authentique de la simple mémorisation par cœur.
"""
    },
    "ch2_ml_foundations": {
        "num": "DEUXIÈME PARTIE",
        "title": "FONDATIONS DU MACHINE LEARNING & DEEP LEARNING",
        "intro": """
Quitter le paradigme de la programmation impérative — où le développeur dicte chaque branche logique — pour embrasser le paradigme de l'apprentissage automatique exige une révolution conceptuelle : le modèle déduit lui-même les relations fonctionnelles à partir d'observations empiriques et optimise ses propres poids numériques.

Cependant, la modernité a souvent tendance à négliger les algorithmes classiques au profit exclusif des réseaux profonds. Or, sur données tabulaires d'entreprise, les forêts aléatoires, le gradient boosting et les algorithmes évolutionnaires surpassent fréquemment les architectures neuronales, tant en performance brute qu'en frugalité énergétique et en robustesse opérationnelle.

Cette deuxième partie explore l'éventail complet de l'apprentissage supervisé : de l'origine historique du Perceptron de Rosenblatt et ses limites topologiques (le drame du XOR), jusqu'au Théorème d'Approximation Universelle des réseaux multicouches (MLP), en passant par la gestion du redoutable « Data Shift » en production et la mécanique computationnelle du triptyque Forward-Loss-Backpropagation au cœur de la mémoire GPU.
"""
    },
    "ch3_sequences": {
        "num": "TROISIÈME PARTIE",
        "title": "REPRÉSENTATIONS VECTORIELLES & ARCHITECTURES SÉQUENTIELLES",
        "intro": """
Le monde réel ne se présente pas sous la forme de vecteurs tabulaires statiques et indépendants. Le langage humain, le code source, la télémétrie des serveurs, les séries temporelles financières ou les signaux acoustiques sont fondamentalement des séquences, où l'ordre des éléments véhicule la totalité du sens.

Traiter une séquence temporelle pose un défi redoutable : comment conserver l'information du passé sans exploser la mémoire vive ni diluer le signal mathématique dans le problème de l'évanouissement du gradient (vanishing gradient) ? 

Cette troisième partie retrace l'épopée des représentations séquentielles : la naissance des réseaux récurrents (RNN) et l'ingéniosité des portes de mémoire LSTM/GRU, la révolution géométrique des plongements lexicaux (Word Embeddings et espaces vectoriels continus), et enfin la rupture majeure de 2017 : l'architecture Transformer, qui abolit la récurrence temporelle au profit de la parallélisation totale par les mécanismes de self-attention multi-têtes.
"""
    },
    "ch4_llms": {
        "num": "QUATRIÈME PARTIE",
        "title": "GRANDS MODÈLES DE LANGAGE (LLM) & INGÉNIERIE D'INFÉRENCE",
        "intro": """
Le passage des modèles de quelques centaines de millions de paramètres à des géants de dizaines ou centaines de milliards de poids a transformé l'apprentissage automatique en une discipline d'ingénierie des systèmes à grande échelle.

Cependant, posséder un modèle pré-entraîné ne suffit pas : la réalité industrielle se heurte immédiatement au mur physique de l'inférence. Comment générer du texte en temps réel pour des millions d'utilisateurs sans épuiser la bande passante de la mémoire vidéo (VRAM) ? Comment orchestrer le partage des matrices d'attention sans saturer les bus PCIe ?

Cette quatrième partie dissèque l'anatomie interne des LLM : la mécanique de génération autorégressive par prédiction de token, la gestion critique du KV Cache (Key-Value Cache), l'ingénierie moderne des serveurs de production (PagedAttention, Continuous Batching, vLLM), la distillation de connaissances pour créer des modèles d'inférence ultra-compacts, et enfin une démystification philosophique et technique essentielle de l'illusion de conscience algorithmique.
"""
    },
    "ch5_advanced": {
        "num": "CINQUIÈME PARTIE",
        "title": "SYSTÈMES AGENTIQUES, PROTOCOLES & NOUVELLES ARCHITECTURES",
        "intro": """
Un grand modèle de langage isolé, enfermé dans sa fenêtre de contexte statique, est un oracle impuissant face aux systèmes d'information vivants. Pour devenir véritablement utile à l'entreprise, il doit être connecté au monde extérieur, outillé, surveillé et orchestré au sein de topologies multi-systèmes.

Cette transformation fait émerger l'ère de l'IA agentique, des architectures composites et des protocoles de standardisation. Mais elle introduit simultanément un nouveau vecteur de risque majeur : l'exécution de code arbitraire, les injections de prompt indirectes et l'autonomie non maîtrisée des agents logiciels.

Cette cinquième partie explore les frontières les plus actives de la recherche et de l'ingénierie : le routage dynamique de requêtes multi-modèles (LLM Router), les paradigmes agentiques et le Function Calling, la conception robuste de sandbox d'exécution et de barrières HITL (Harness de sécurité), l'analyse critique du protocole MCP (Model Context Protocol), et les architectures de rupture alternatives aux LLM comme les modèles JEPA (Joint Embedding Predictive Architecture) de LeCun et les modèles de planification de type System One.
"""
    },
    "ch6_hardware": {
        "num": "SIXIÈME PARTIE",
        "title": "PHYSIQUE DU SILICIUM, ACCÉLÉRATEURS & ÉCO-CONCEPTION",
        "intro": """
Toutes les équations mathématiques, tous les algorithmes de gradient et toutes les architectures de transformeurs demeurent des abstractions stériles sans la physique des semi-conducteurs et la thermodynamique des circuits intégrés.

L'intelligence artificielle n'est pas une entité immatérielle planant dans un nuage virtuel : c'est un flux colossal d'électrons traversant des milliards de transistors gravés à l'échelle nanométrique, dissipant des mégawatts d'énergie thermique et consommant des térawattheures à l'échelle planétaire.

Cette ultime partie confronte l'ingénieur à la matérialité tangible de son métier : la comparaison structurelle intime entre l'architecture à faible latence des CPU et le parallélisme massif SIMT des processeurs graphiques (GPU), les goulets d'étranglement de bande passante mémoire (HBM vs PCIe), et l'impératif éthique et industriel de l'éco-conception (Green AI, PUE des datacenters, compression de modèles et quantification INT8/INT4).
"""
    }
}

# Synthèses spécifiques et protocoles d'expérimentation pour les simulateurs
SIMULATOR_REPLACEMENTS = {
    "proba_fondamentales": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">PROTOCOLE EXPÉRIMENTAL</span>
        <h4>Démonstration Empirique du Théorème Central Limite</h4>
    </div>
    <p><strong>Cadre expérimental :</strong> On génère des tirages aléatoires issus d'une distribution uniforme continue $X \\sim \\mathcal{U}(0, 1)$ (moyenne théorique $\\mu = 0.5$, variance $\\sigma^2 = \\frac{1}{12} \\approx 0.0833$). On calcule la moyenne empirique $\\bar{X}_N = \\frac{1}{N} \\sum_{i=1}^N X_i$ pour des échantillons de taille croissante $N \\in \\{1, 5, 30, 500\\}$.</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Taille d'échantillon $N$</th>
                <th>Distribution de $\\bar{X}_N$</th>
                <th>Écart-type mesuré $\\sigma / \\sqrt{N}$</th>
                <th>Observation empirique</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>$N = 1$</td>
                <td>Uniforme plate sur $[0, 1]$</td>
                <td>$0.2887$</td>
                <td>Aucune concentration centrale ; tous les états sont équiprobables.</td>
            </tr>
            <tr>
                <td>$N = 5$</td>
                <td>Distribution triangulaire</td>
                <td>$0.1291$</td>
                <td>Ébauche de cloche, amincissement rapide des queues de distribution.</td>
            </tr>
            <tr>
                <td>$N = 30$</td>
                <td>Quasi-gaussienne symétrique</td>
                <td>$0.0527$</td>
                <td>Le test de Shapiro-Wilk confirme l'adhésion gaussienne à $p > 0.05$.</td>
            </tr>
            <tr>
                <td>$N = 500$</td>
                <td>Gaussienne Dirac ultra-étroite</td>
                <td>$0.0129$</td>
                <td>Convergence asymptotique quasi-parfaite autour de la moyenne réelle $\\mu = 0.5$.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Conclusion pour l'ingénieur :</strong> Quelle que soit l'irrégularité ou la non-linéarité d'un signal capteur ou d'une métrique serveur, l'agrégation statistique en paquets de taille $N \\ge 30$ permet d'appliquer les formules d'inférence gaussiennes et les intervalles de confiance à 95% et 99% avec une rigueur mathématique irréprochable.</p>
</div>
""",
    "loi_normale": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">RÈGLE PRATIQUE D'INGÉNIERIE</span>
        <h4>Distribution des Intervalles et Détection d'Anomalies (Règle 68 - 95 - 99.7)</h4>
    </div>
    <p>En inférence statistique et en surveillance de production (AIOps), la loi normale $\\mathcal{N}(\\mu, \\sigma^2)$ structure le standard de détection de dérives via le calcul du score standardisé (Z-Score) : $Z = \\frac{x - \\mu}{\\sigma}$.</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Intervalle autour de $\\mu$</th>
                <th>Couverture de population</th>
                <th>Taux d'anomalies hors intervalle</th>
                <th>Signification industrielle</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>$[\\mu - 1\\sigma, \\mu + 1\\sigma]$</td>
                <td>$68.27\\%$</td>
                <td>$31.73\\%$ (1 sur 3)</td>
                <td>Régime nominal moyen standard.</td>
            </tr>
            <tr>
                <td>$[\\mu - 2\\sigma, \\mu + 2\\sigma]$</td>
                <td>$95.45\\%$</td>
                <td>$4.55\\%$ (1 sur 22)</td>
                <td>Seuil d'avertissement préliminaire (warning).</td>
            </tr>
            <tr>
                <td>$[\\mu - 3\\sigma, \\mu + 3\\sigma]$</td>
                <td>$99.73\\%$</td>
                <td>$0.27\\%$ (1 sur 370)</td>
                <td>Seuil de détection d'anomalie critique (alerte pager).</td>
            </tr>
            <tr>
                <td>$[\\mu - 6\\sigma, \\mu + 6\\sigma]$</td>
                <td>$99.9999998\\%$</td>
                <td>$3.4$ par million (Six Sigma)</td>
                <td>Exigence de qualité industrielle aéronautique et hardware critique.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Avertissement méthodologique :</strong> L'hypothèse de normalité n'est valide que si le bruit est additif et non corrélé. En présence de phénomènes à queues épaisses (black swans de Taleb, pannes en cascade), l'ingénieur doit compléter le Z-Score par des métriques d'ordre non-paramétriques (interquartile IQR, isolation forests).</p>
</div>
""",
    "loi_weibull": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">GRILLE D'ANALYSE FIABILISTE</span>
        <h4>Diagnostic des Pannes Matérielles selon le Paramètre de Forme $\\beta$</h4>
    </div>
    <p>La fonction de risque de Weibull $\\lambda(t) = \\frac{\\beta}{\\eta} \\left( \\frac{t}{\\eta} \\right)^{\\beta - 1}$ permet d'isoler avec certitude la cause racine d'une instabilité sur un parc de serveurs ou de clusters GPU.</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Valeur de forme $\\beta$</th>
                <th>Comportement du risque $\\lambda(t)$</th>
                <th>Phase de la courbe en baignoire</th>
                <th>Actions correctives AIOps recommandées</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>$\\beta < 1$ $(\\approx 0.5)$</td>
                <td>Décroissant dans le temps</td>
                <td>Mortalité infantile (défauts d'usine, bugs d'amorçage)</td>
                <td>Augmenter le temps de burn-in test avant mise en cluster, rejeter les lots de fabrication défectueux.</td>
            </tr>
            <tr>
                <td>$\\beta = 1$</td>
                <td>Strictement constant $\\lambda = 1/\\eta$</td>
                <td>Période de vie utile (loi exponentielle pure sans mémoire)</td>
                <td>Les pannes surviennent par chocs aléatoires (surtensions, incidents réseau). Aucun remplacement préventif d'âge utile.</td>
            </tr>
            <tr>
                <td>$\\beta > 1$ $(\\approx 2.5 - 4)$</td>
                <td>Croissant rapidement avec le temps</td>
                <td>Usure mécanique, vieillissement thermique du silicium</td>
                <td>Remplacement proactif calendaire avant le coude d'accélération des pannes. Maintenance prédictive planifiée.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Métrique reine :</strong> La MTTF (Mean Time To Failure) est donnée par $\\text{MTTF} = \\eta \\cdot \\Gamma\\left(1 + \\frac{1}{\\beta}\\right)$. Elle ne correspond au temps moyen mesuré que si $\\beta$ est stable au cours du temps d'observation.</p>
</div>
""",
    "vc_dimension": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">SYNTHÈSE GÉOMÉTRIQUE</span>
        <h4>Capacité de Pulvérisation et Théorème de Séparabilité Linéaire</h4>
    </div>
    <p>La Dimension VC d'une famille d'hypothèses $\\mathcal{H}$ correspond au cardinal maximal $N$ d'un ensemble de points qu'elle peut étiqueter arbitrairement de toutes les manières possibles ($2^N$ combinaisons).</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Espace & Modèle</th>
                <th>Points testés $N$</th>
                <th>Configurations possibles</th>
                <th>Verdict mathématique de pulvérisation</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Hyperplan 2D (Ligne droite)</td>
                <td>$N = 3$ points non colinéaires</td>
                <td>$2^3 = 8$ étiquetages</td>
                <td><strong>PULVÉRISATION RÉUSSIE :</strong> Une droite peut séparer n'importe quelle bipartition des 3 points.</td>
            </tr>
            <tr>
                <td>Hyperplan 2D (Ligne droite)</td>
                <td>$N = 4$ points quelconques</td>
                <td>$2^4 = 16$ étiquetages</td>
                <td><strong>ÉCHEC STRUCTUREL :</strong> La configuration XOR (points diagonaux de même classe) est topologiquement inséparable par une ligne droite. $d_{VC} = 3$.</td>
            </tr>
            <tr>
                <td>Hyperplan dans $\\mathbb{R}^d$</td>
                <td>$N = d + 1$ points</td>
                <td>$2^{d+1}$ configurations</td>
                <td><strong>THÉORÈME GÉNÉRAL :</strong> Pour les classifieurs linéaires dans $\\mathbb{R}^d$, la dimension VC vaut exactement $d_{VC} = d + 1$.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Borne de généralisation de Vapnik :</strong> L'erreur réelle $R(h)$ est bornée par l'erreur d'apprentissage $R_{emp}(h) + \\sqrt{\\frac{8 d_{VC} \\ln(2N/d_{VC}) + 8 \\ln(4/\\delta)}{N}}$. Si le nombre de paramètres augmente sans données supplémentaires proportionnelles, la borne diverge et le surapprentissage devient inéluctable.</p>
</div>
""",
    "DataShift": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">MATRICE DE PILOTAGE MLOPS</span>
        <h4>Typologie des Dérives et Seuils d'Alerte PSI (Population Stability Index)</h4>
    </div>
    <p>Le monitoring des modèles en production repose sur le calcul régulier de la divergence entre la distribution de référence d'entraînement $P(x)$ et la distribution d'inférence en production $Q(x)$.</p>
    <div class="math-tex math-display">\\text{PSI} = \\sum_{b=1}^B \\left( Q(b) - P(b) \\right) \\times \\ln\\left( \\frac{Q(b)}{P(b)} \\right)</div>
    <table class="book-table">
        <thead>
            <tr>
                <th>Valeur du PSI</th>
                <th>Diagnostic de stabilité</th>
                <th>Impact sur la précision</th>
                <th>Action opérationnelle requise</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>$\\text{PSI} < 0.10$</td>
                <td>Distribution stable</td>
                <td>Dégradation nulle ou marginale</td>
                <td>Aucune action. Surveillance passive de routine.</td>
            </tr>
            <tr>
                <td>$0.10 \\le \\text{PSI} < 0.20$</td>
                <td>Dérive modérée détectée</td>
                <td>Perte mesurable de calibration</td>
                <td>Planification d'un audit de données et d'un réentraînement programmé.</td>
            </tr>
            <tr>
                <td>$\\text{PSI} \\ge 0.20$</td>
                <td>Dérive critique majeure</td>
                <td>Chute brutale de performance</td>
                <td>Alerte de niveau 1. Déclenchement automatique du pipeline de réentraînement ou bascule sur modèle de repli.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Les 3 visages de la dérive :</strong> <em>Covariate Shift</em> ($P(X)$ change mais $P(Y|X)$ reste constant), <em>Prior Shift</em> ($P(Y)$ change, comme une explosion du taux de fraude), et <em>Concept Drift</em> ($P(Y|X)$ change, le comportement fondamental des utilisateurs s'est inversé).</p>
</div>
""",
    "llm_harness": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">ARCHITECTURE DE DÉFENSE EN PROFONDEUR</span>
        <h4>Matrice de Sécurité du Harness pour Agents LLM Autonomes</h4>
    </div>
    <p>L'autonomie sans contrôle est une faille critique. Le « Harness » d'un agent LLM forme un sas étanche entre la génération de texte probabiliste et le système d'exploitation hôte.</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Barrière défensive</th>
                <th>Attaque neutralisée</th>
                <th>Mécanisme technique</th>
                <th>Conséquence si désactivée</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Validation de Schéma (Pydantic / TypeBox)</strong></td>
                <td>Hallucination de paramètres, injection de commandes SQL/Bash via arguments JSON</td>
                <td>Filtrage strict par regex, types stricts et rejet des clés non prévues dans l'API</td>
                <td>Crash du backend ou exécution non typée de chaînes arbitraires dans la base de données.</td>
            </tr>
            <tr>
                <td><strong>Détection d'Injections (Jailbreak Filter)</strong></td>
                <td>Prompt injection indirecte nichée dans des PDF, emails ou pages web aspirées</td>
                <td>Modèle de classification d'intention secondaire et analyse lexicale des motifs d'exfiltration</td>
                <td>Le modèle obéit à l'attaquant au lieu de l'utilisateur légitime (vol de clés API, leak de contexte).</td>
            </tr>
            <tr>
                <td><strong>Isolation Sandbox (gVisor / Firecracker / Docker)</strong></td>
                <td>Élévation de privilèges, compromission du conteneur hôte</td>
                <td>Noyau virtualisé étanche, système de fichiers éphémère en lecture seule, zéro accès root</td>
                <td>Rançonlogiciel ou persistance malveillante au sein de l'infrastructure de production.</td>
            </tr>
            <tr>
                <td><strong>Gouvernance Réseau & Egress Firewall</strong></td>
                <td>Exfiltration de données confidentielles vers des serveurs C2 (Command & Control)</td>
                <td>Blocage de tout trafic sortant sauf domaines explicitement inscrits en liste blanche stricte</td>
                <td>Fuite intégrale des variables d'environnement et tokens secrets via requêtes HTTP masquées.</td>
            </tr>
            <tr>
                <td><strong>Human-in-the-Loop (HITL)</strong></td>
                <td>Actions irréversibles (virements bancaires, suppressions de bases, déploiements prod)</td>
                <td>Interruption asynchrone du graphe d'exécution et attestation cryptographique humaine</td>
                <td>Destruction catastrophique de données ou pertes financières non supervisées.</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Règle d'or :</strong> Ne jamais faire confiance à l'output d'un modèle de langage pour des opérations privilégiées. Tout appel système doit être traité comme provenant d'une entrée utilisateur hostile non assainie.</p>
</div>
""",
    "GreenAI": """
<div class="book-experiment-box">
    <div class="exp-header">
        <span class="exp-badge">BILAN DE SOBRIÉTÉ NUMÉRIQUE</span>
        <h4>Équation Fondamentale de l'Empreinte Énergétique & Gains de Compression</h4>
    </div>
    <p>L'énergie électrique consommée par un cluster de calcul pour l'inférence ou l'entraînement d'un modèle d'IA est régie par la formule canonique :</p>
    <div class="math-tex math-display">E = P_{\\text{serveur}} \\times t \\times \\text{PUE} \\times \\text{CI}</div>
    <p>Où $P_{\\text{serveur}}$ est la puissance moyenne absorbée en Watts, $t$ la durée d'exécution en heures, $\\text{PUE}$ (Power Usage Effectiveness) l'efficacité énergétique du datacenter (généralement entre $1.15$ et $1.6$), et $\\text{CI}$ l'intensité carbone du réseau électrique local en $\\text{gCO}_2\\text{/kWh}$.</p>
    <table class="book-table">
        <thead>
            <tr>
                <th>Format de Quantification</th>
                <th>Taille mémoire d'un modèle 70B</th>
                <th>Débit d'inférence (tokens/s)</th>
                <th>Gain d'énergie mesuré</th>
                <th>Dégradation de perplexité</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>FP16 / BF16 (16 bits)</strong></td>
                <td>$140\\text{ Go}$ (exige 2x GPU A100 80Go)</td>
                <td>$1.0\\times$ (référence)</td>
                <td>$0\\%$ (base standard)</td>
                <td>$0.00$ (précision d'entraînement intégrale)</td>
            </tr>
            <tr>
                <td><strong>INT8 (8 bits)</strong></td>
                <td>$70\\text{ Go}$ (tient sur 1x GPU A100 80Go)</td>
                <td>$1.8\\times$</td>
                <td>$\\approx 45\\% - 50\\%$</td>
                <td>$< 0.05$ (différence humaine indétectable)</td>
            </tr>
            <tr>
                <td><strong>INT4 (AWQ / GPTQ)</strong></td>
                <td>$35\\text{ Go}$ (tient sur 1x GPU commercial 48Go)</td>
                <td>$3.2\\times$</td>
                <td>$\\approx 70\\% - 78\\%$</td>
                <td>$\\approx 0.10 - 0.20$ (négligeable sur la plupart des tâches)</td>
            </tr>
        </tbody>
    </table>
    <p class="exp-conclusion"><strong>Impact stratégique :</strong> La quantification en INT4 ne divise pas seulement les coûts d'infrastructure par trois : elle permet d'héberger des modèles de niveau état de l'art sur des serveurs uniques sans interconnexion InfiniBand énergivore, réduisant directement l'empreinte carbone globale du cycle de vie de l'IA.</p>
</div>
"""
}

# Stylisation des SVGs pour le mode livre imprimé haute lisibilité
def adapt_svg_for_print(svg_html: str) -> str:
    # 1. Remplacement des couleurs d'accent néon par des teintes d'encre d'impression contrastées
    replacements = [
        # Couleurs de remplissage et traits des markers et éléments
        (r'#00f3ff', r'#0284c7'),  # Cyan néon -> Bleu océan soutenu
        (r'#e879f9', r'#7e22ce'),  # Magenta néon -> Violet profond
        (r'#00ffaa', r'#15803d'),  # Vert néon -> Vert forêt soutenu
        (r'#ffaa00', r'#b45309'),  # Ambre néon -> Terre de Sienne / Ambre soutenu
        (r'#bbbbbb', r'#64748b'),  # Gris clair -> Ardoise lisible
        (r'fill="rgba\(0,\s*243,\s*255,\s*0\.08\)"', r'fill="#f0f9ff"'),
        (r'fill="rgba\(232,\s*121,\s*249,\s*0\.12\)"', r'fill="#faf5ff"'),
        (r'fill="rgba\(0,\s*255,\s*170,\s*0\.18\)"', r'fill="#f0fdf4"'),
        (r'fill="rgba\(255,\s*170,\s*0,\s*0\.12\)"', r'fill="#fffbeb"'),
        (r'fill="rgba\(255,\s*255,\s*255,\s*0\.05\)"', r'fill="#ffffff"'),
    ]
    for old, new in replacements:
        svg_html = re.sub(old, new, svg_html)
    return svg_html

def clean_and_format_course_html(course_id: str, content: str) -> str:
    # 1. Traitement des simulateurs interactifs
    if course_id in SIMULATOR_REPLACEMENTS:
        # Remplacement du bloc simulateur complet par l'encadré expérimental livre
        rep = SIMULATOR_REPLACEMENTS[course_id]
        content = re.sub(
            r'<div class="interactive-sim-card"[^>]*>.*?</div>\s*</div>',
            lambda m: rep,
            content,
            flags=re.DOTALL
        )
    else:
        # Pour tout simulateur résiduel éventuel
        content = re.sub(
            r'<div class="interactive-sim-card"[^>]*>.*?</div>\s*</div>',
            '',
            content,
            flags=re.DOTALL
        )

    # 2. Adaptation des liens internes pour le livre
    content = re.sub(
        r'<a [^>]*onclick="Educational\.loadCourse\(\'([^\']+)\'\)"[^>]*>(.*?)</a>',
        r'<span class="book-ref">\2 <em>(cf. module \1)</em></span>',
        content
    )
    content = re.sub(
        r'<a [^>]*class="[^"]*studio-btn[^"]*"[^>]*>(.*?)</a>',
        r'',
        content
    )

    # 3. Adaptation des schémas SVG pour l'impression
    def svg_sub(m):
        return adapt_svg_for_print(m.group(0))

    content = re.sub(r'<svg.*?</svg>', svg_sub, content, flags=re.DOTALL)

    return content

def build_full_html(courses: list) -> str:
    # Regroupement par chapitres
    chapters = []
    chapter_map = {}
    for c in courses:
        ch_id = c.get("domainId", "ch1_stats")
        if ch_id not in chapter_map:
            chapter_map[ch_id] = {
                "id": ch_id,
                "num": c.get("chapterNum", "CH"),
                "title": c.get("chapterTitle", "Chapitre"),
                "courses": []
            }
            chapters.append(chapter_map[ch_id])
        chapter_map[ch_id]["courses"].append(c)

    with open(REPO_ROOT / "tools" / "katex" / "katex.min.css", "r", encoding="utf-8") as f:
        katex_css = f.read()
    with open(REPO_ROOT / "tools" / "katex" / "katex.min.js", "r", encoding="utf-8") as f:
        katex_js = f.read()

    # Construction du document HTML complet
    html = []
    head_template = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Manuel Fondamental d'Intelligence Artificielle & IAOps</title>
    <!-- KaTeX CSS integre pour la typographie vectorielle des formules -->
    <style>
/* __KATEX_CSS__ */
    </style>
    <style>
        @page {
            size: A4;
            margin: 24mm 20mm 24mm 20mm;
            @bottom-right {
                content: counter(page);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 9pt;
                color: #64748b;
            }
            @top-left {
                content: "MANUEL FONDAMENTAL D'INTELLIGENCE ARTIFICIELLE & IAOPS";
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 8pt;
                letter-spacing: 0.5px;
                color: #94a3b8;
                text-transform: uppercase;
            }
        }

        @page:first {
            margin: 0;
            @top-left { content: none; }
            @bottom-right { content: none; }
        }

        body {
            font-family: "Charter", "Bitstream Charter", "Georgia", serif;
            font-size: 11pt;
            line-height: 1.68;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
        }

        /* --- Page de couverture de livre --- */
        .cover-page {
            page-break-after: always;
            box-sizing: border-box;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 70mm 28mm 40mm 28mm;
            background: linear-gradient(145deg, #090614 0%, #17112c 50%, #0d0a1a 100%);
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .cover-header-tag {
            font-size: 12pt;
            font-weight: 700;
            letter-spacing: 3.5px;
            color: #00f3ff;
            text-transform: uppercase;
            margin-bottom: 24px;
        }
        .cover-title {
            font-size: 34pt;
            line-height: 1.15;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #ffffff;
            margin: 0 0 20px 0;
        }
        .cover-subtitle {
            font-size: 16pt;
            line-height: 1.45;
            font-weight: 400;
            color: #cbd5e1;
            margin: 0 0 40px 0;
            max-width: 90%;
        }
        .cover-divider {
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #00f3ff, #bd00ff);
            margin-bottom: 40px;
        }
        .cover-footer {
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10pt;
            color: #cbd5e1;
            letter-spacing: 0.5px;
        }
        .cover-mention {
            font-size: 10.5pt;
            color: #cbd5e1;
            line-height: 1.5;
        }
        .cover-mention strong {
            color: #00f3ff;
            font-size: 11pt;
            letter-spacing: 0.5px;
        }

        /* --- Page de Garde Éditoriale --- */
        .editorial-page {
            page-break-after: always;
            padding: 30mm 15mm 20mm 15mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 85vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .editorial-box {
            background: #f8fafc;
            border-left: 4px solid #0284c7;
            padding: 20px 24px;
            border-radius: 0 8px 8px 0;
            margin: 40px 0;
        }
        .editorial-box h3 {
            margin-top: 0;
            font-size: 13pt;
            color: #0f172a;
        }
        .editorial-box p {
            margin-bottom: 0;
            font-size: 10pt;
            line-height: 1.6;
            color: #334155;
        }

        /* --- Sommaire analytique --- */
        .toc-page {
            page-break-after: always;
            padding-top: 10mm;
        }
        .toc-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 24pt;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 30px;
        }
        .toc-part-item {
            margin-top: 22px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .toc-part-num {
            font-size: 9pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #0369a1;
            text-transform: uppercase;
        }
        .toc-part-title {
            font-size: 12.5pt;
            font-weight: 700;
            color: #0f172a;
            margin: 2px 0 8px 0;
        }
        .toc-course-list {
            list-style: none;
            padding-left: 16px;
            margin: 0 0 14px 0;
        }
        .toc-course-item {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            line-height: 1.7;
            color: #334155;
            border-bottom: 1px dotted #cbd5e1;
            padding: 2px 0;
        }
        .toc-course-item span.title {
            font-weight: 500;
        }

        /* --- Avant-Propos & Pages d'Intercalaires de Parties --- */
        .part-divider-page {
            page-break-before: always;
            page-break-after: always;
            box-sizing: border-box;
            height: 85vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 15mm;
            background: #f8fafc;
            border-left: 8px solid #0f172a;
        }
        .part-num-tag {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11pt;
            font-weight: 800;
            letter-spacing: 3px;
            color: #0284c7;
            text-transform: uppercase;
            margin-bottom: 16px;
        }
        .part-main-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 26pt;
            font-weight: 900;
            line-height: 1.2;
            color: #0f172a;
            margin: 0 0 28px 0;
        }
        .part-intro-text {
            font-size: 11.5pt;
            line-height: 1.75;
            color: #334155;
            max-width: 90%;
            text-align: justify;
        }

        /* --- Structure d'un Chapitre / Cours --- */
        .chapter-container {
            page-break-before: always;
            padding-top: 10mm;
        }
        .chapter-header {
            margin-bottom: 30px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
        }
        .chapter-badge {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 9pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #0284c7;
            text-transform: uppercase;
            display: block;
            margin-bottom: 6px;
        }
        .chapter-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 22pt;
            font-weight: 800;
            line-height: 1.25;
            color: #0f172a;
            margin: 0 0 10px 0;
        }
        .chapter-desc {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #475569;
            font-style: italic;
            margin: 0;
        }

        /* Corps de texte du cours */
        h2 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 15pt;
            font-weight: 700;
            color: #0f172a;
            margin-top: 32px;
            margin-bottom: 14px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            page-break-after: avoid;
            break-after: avoid;
        }
        h3 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12.5pt;
            font-weight: 600;
            color: #1e293b;
            margin-top: 24px;
            margin-bottom: 10px;
            page-break-after: avoid;
            break-after: avoid;
        }
        p {
            margin-top: 0;
            margin-bottom: 14px;
            text-align: justify;
        }
        ul, ol {
            margin-top: 0;
            margin-bottom: 16px;
            padding-left: 24px;
        }
        li {
            margin-bottom: 6px;
            line-height: 1.6;
        }
        strong {
            color: #0f172a;
            font-weight: 700;
        }

        /* Formules mathématiques */
        .edu-formula {
            background: #f8fafc;
            border-left: 3px solid #0284c7;
            padding: 14px 18px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .edu-formula .formula-title {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 700;
            font-size: 10.5pt;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .math-tex {
            font-size: 10.5pt;
        }
        .math-display {
            display: block;
            margin: 12px 0;
            text-align: center;
        }

        /* Encadrés pédagogiques (Callouts) */
        .edu-callout {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #0284c7;
            border-radius: 6px;
            padding: 14px 18px;
            margin: 20px 0;
            font-size: 10pt;
            line-height: 1.6;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .edu-callout.edu-a {
            border-left-color: #d97706;
            background: #fffbeb;
        }
        .edu-callout.edu-g {
            border-left-color: #16a34a;
            background: #f0fdf4;
        }
        .edu-callout.edu-c {
            border-left-color: #0284c7;
            background: #f0f9ff;
        }
        .edu-callout strong {
            display: block;
            margin-bottom: 4px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 10pt;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }

        /* Schémas SVG imprimés */
        .edu-figure {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px 14px 12px 14px;
            margin: 24px 0;
            page-break-inside: avoid;
            break-inside: avoid;
            text-align: center;
        }
        .edu-figure svg {
            width: 100%;
            max-width: 540px;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .edu-figure figcaption {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 9pt;
            line-height: 1.45;
            color: #64748b;
            font-style: italic;
            margin-top: 10px;
            text-align: center;
        }
        .edu-figure text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            fill: #1e293b;
            font-size: 12.5px;
            letter-spacing: -0.1px;
        }
        .edu-figure .ts { font-size: 11px; fill: #64748b; font-weight: 400; }
        .edu-figure .tc { fill: #0369a1; font-weight: 700; font-size: 13px; }
        .edu-figure .tp { fill: #7e22ce; font-weight: 700; font-size: 13px; }
        .edu-figure .tg { fill: #15803d; font-weight: 700; font-size: 13px; }
        .edu-figure .ta { fill: #b45309; font-weight: 700; font-size: 13px; }
        .edu-figure .t  { fill: #1e293b; font-size: 12.5px; }

        .edu-figure .b-c { fill: #f0f9ff; stroke: #0284c7; stroke-width: 1.4; }
        .edu-figure .b-p { fill: #faf5ff; stroke: #9333ea; stroke-width: 1.4; }
        .edu-figure .b-g { fill: #f0fdf4; stroke: #16a34a; stroke-width: 1.4; }
        .edu-figure .b-a { fill: #fffbeb; stroke: #d97706; stroke-width: 1.4; }
        .edu-figure .b-w { fill: #ffffff; stroke: #94a3b8; stroke-width: 1.4; }

        .edu-figure .l-c { stroke: #0284c7; stroke-width: 1.8; }
        .edu-figure .l-p { stroke: #9333ea; stroke-width: 1.8; }
        .edu-figure .l-g { stroke: #16a34a; stroke-width: 1.8; }
        .edu-figure .l-a { stroke: #d97706; stroke-width: 1.8; }
        .edu-figure .l-w { stroke: #64748b; stroke-width: 1.6; }

        .edu-figure .d-c { fill: #0284c7; }
        .edu-figure .d-p { fill: #9333ea; }
        .edu-figure .d-g { fill: #16a34a; }
        .edu-figure .d-a { fill: #d97706; }

        /* Tables */
        .edu-table, .book-table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            font-size: 9.5pt;
            page-break-inside: avoid;
            break-inside: avoid;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .edu-table th, .book-table th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 600;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #0f172a;
        }
        .edu-table td, .book-table td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            color: #334155;
        }
        .edu-table tr:nth-child(even), .book-table tr:nth-child(even) {
            background: #f8fafc;
        }

        /* Encadrés d'ateliers et protocoles expérimentaux */
        .book-experiment-box {
            background: #f8fafc;
            border: 1px solid #0284c7;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .book-experiment-box .exp-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        .book-experiment-box .exp-badge {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0284c7;
            color: #ffffff;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 3px 8px;
            border-radius: 4px;
        }
        .book-experiment-box h4 {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11pt;
            color: #0f172a;
        }
        .book-experiment-box p {
            font-size: 9.5pt;
            line-height: 1.55;
            color: #334155;
            margin-bottom: 10px;
        }
        .book-experiment-box .exp-conclusion {
            background: #ffffff;
            border-left: 3px solid #16a34a;
            padding: 8px 12px;
            margin-top: 10px;
            margin-bottom: 0;
            font-size: 9pt;
            color: #14532d;
        }

        /* Synthèse de fin de chapitre */
        .chapter-recap {
            background: #f1f5f9;
            border-top: 3px solid #0f172a;
            padding: 14px 18px;
            margin-top: 30px;
            page-break-inside: avoid;
            break-inside: avoid;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .chapter-recap h4 {
            margin: 0 0 8px 0;
            font-size: 10.5pt;
            letter-spacing: 0.5px;
            color: #0f172a;
            text-transform: uppercase;
        }
        .chapter-recap ul {
            margin: 0;
            padding-left: 18px;
            font-size: 9.5pt;
            color: #334155;
        }

        .book-ref {
            color: #0369a1;
            font-weight: 600;
        }
    </style>
</head>
<body>
"""
    html.append(head_template.replace("/* __KATEX_CSS__ */", katex_css))

    # 1. Page de Couverture
    html.append("""
    <div class="cover-page">
        <div>
            <div class="cover-header-tag">OUVRAGE FONDAMENTAL &amp; INGÉNIERIE SYSTÈMES</div>
            <h1 class="cover-title">MANUEL DE RÉFÉRENCE<br>IA &amp; IAOPS</h1>
            <p class="cover-subtitle">Des Probabilités Élémentaires &amp; la Théorie VC aux Systèmes Agentiques et à la Physique du Silicium</p>
            <div class="cover-divider"></div>
        </div>
        <div class="cover-footer">
            <div class="cover-mention">
                <strong>Manuscrit Préparatoire pour l'Auto-Édition</strong><br>
                Synthèse intégrale des 26 modules pédagogiques de référence
            </div>
            <div>
                Édition Préparatoire &middot; 2026
            </div>
        </div>
    </div>
""")

    # 2. Page de Garde Éditoriale & Avertissement
    html.append("""
    <div class="editorial-page">
        <div>
            <h2 style="border:none; margin-top:0; font-size:18pt;">NOTE DE CADRAGE ÉDITORIAL</h2>
            <p style="font-size:10.5pt; color:#475569;">Ce manuscrit constitue le support de travail condensé et rigoureux de l'ensemble du programme pédagogique. Il est conçu pour servir de socle textuel, conceptuel et architectural à l'auteur pour la rédaction finale de son livre auto-édité.</p>
            
            <div class="editorial-box">
                <h3>FIL CONDUCTEUR DE L'OUVRAGE</h3>
                <p>La plupart des publications contemporaines sur l'intelligence artificielle commettent l'une de ces deux erreurs symétriques : soit elles s'enferment dans un formalisme théorique désincarné sans lien avec les contraintes d'exécution, soit elles se réduisent à des tutoriels d'API éphémères et superficiels.</p>
                <p style="margin-top:8px;">L'ambition de ce manuel est de rétablir la <strong>continuité physique et causale</strong> : comment une propriété statistique fondamentale (le théorème central limite ou la dimension VC) dicte la convergence d'un gradient, comment la bande passante d'une mémoire HBM façonne la taille d'un KV Cache, et pourquoi la sécurité d'un agent autonome dépend d'une sandbox déterministe plutôt que de voeux de prompt engineering.</p>
            </div>

            <div style="font-size:9.5pt; color:#64748b; line-height:1.6; margin-top:30px;">
                <strong>Structure du Manuscrit :</strong>
                <ul>
                    <li><strong>Partie I :</strong> Fondations Statistiques, Probabilités &amp; Complexité de l'Apprentissage (Modules 1.1 à 1.4)</li>
                    <li><strong>Partie II :</strong> Machine Learning Classique &amp; Deep Learning (Modules 2.1 à 2.6)</li>
                    <li><strong>Partie III :</strong> Représentations Vectorielles &amp; Architectures Séquentielles (Modules 3.1 à 3.3)</li>
                    <li><strong>Partie IV :</strong> Grands Modèles de Langage (LLM) &amp; Ingénierie d'Inférence (Modules 4.1 à 4.5)</li>
                    <li><strong>Partie V :</strong> Systèmes Agentiques, Protocoles &amp; Nouvelles Architectures (Modules 5.1 à 5.6)</li>
                    <li><strong>Partie VI :</strong> Physique du Silicium, Accélérateurs &amp; Éco-conception (Modules 6.1 à 6.2)</li>
                </ul>
            </div>
        </div>
        <div style="font-size:8.5pt; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px;">
            Document généré à partir du référentiel pédagogique IAOps. Reproduction et adaptation réservées à l'auteur pour son projet d'auto-édition.
        </div>
    </div>
""")

    # 3. Sommaire Analytique
    html.append("""
    <div class="toc-page">
        <h2 class="toc-title">TABLE DES MATIÈRES DÉTAILLÉE</h2>
""")
    for ch in chapters:
        ch_meta = PART_INTROS.get(ch["id"], {"num": ch["num"], "title": ch["title"]})
        html.append(f"""
        <div class="toc-part-item">
            <span class="toc-part-num">{ch_meta["num"]}</span>
            <div class="toc-part-title">{ch_meta["title"]}</div>
            <ul class="toc-course-list">
""")
        for c in ch["courses"]:
            html.append(f"""
                <li class="toc-course-item">
                    <span class="title">{c['title']}</span>
                    <span style="color:#94a3b8; font-size:8.5pt;">Module {c['id']}</span>
                </li>
""")
        html.append("""
            </ul>
        </div>
""")
    html.append("</div>")

    # 4. Corps des Chapitres et Modules
    for ch in chapters:
        ch_id = ch["id"]
        ch_meta = PART_INTROS.get(ch_id, {
            "num": ch["num"],
            "title": ch["title"],
            "intro": "Présentation des enjeux conceptuels et techniques du chapitre."
        })

        # Intercalaire de Partie
        html.append(f"""
    <div class="part-divider-page">
        <div class="part-num-tag">{ch_meta['num']}</div>
        <h1 class="part-main-title">{ch_meta['title']}</h1>
        <div class="part-intro-text">
            {ch_meta['intro'].strip().replace(chr(10), '</p><p>')}
        </div>
    </div>
""")

        # Chaque cours de la partie
        for c in ch["courses"]:
            cid = c["id"]
            title = c["title"]
            desc = c.get("desc", "")
            raw_content = c.get("content", "")
            cleaned_content = clean_and_format_course_html(cid, raw_content)

            html.append(f"""
    <article class="chapter-container" id="module-{cid}">
        <header class="chapter-header">
            <span class="chapter-badge">{ch_meta['num']} &middot; MODULE {cid.upper()}</span>
            <h1 class="chapter-title">{title}</h1>
            <p class="chapter-desc">{desc}</p>
        </header>
        <div class="chapter-body">
            {cleaned_content}
        </div>
        <div class="chapter-recap">
            <h4>Points Cardinaux &amp; Synthèse pour l'Ingénieur</h4>
            <ul>
                <li><strong>Fondement :</strong> Maîtriser le mécanisme causal sous-jacent et non une simple heuristique.</li>
                <li><strong>Goulot d'étranglement :</strong> Identifier si la contrainte principale est le calcul (Compute-bound), la mémoire (Memory-bound) ou la variance des données.</li>
                <li><strong>Posture terrain :</strong> Valider en permanence le comportement empirique par des métriques quantifiables et des tests d'hypothèses étanches.</li>
            </ul>
        </div>
    </article>
""")

    # 5. Conclusion Générale & Postface
    html.append("""
    <article class="chapter-container" style="page-break-before: always;">
        <header class="chapter-header">
            <span class="chapter-badge">ÉPILOGUE DE L'OUVRAGE</span>
            <h1 class="chapter-title">Conclusion Générale &amp; Perspectives pour l'Ingénieur IA</h1>
            <p class="chapter-desc">De la maîtrise du silicium à l'autonomie responsable des systèmes</p>
        </header>
        <div class="chapter-body">
            <p>Parvenu au terme de cette traversée intégrale des 26 modules de référence, un enseignement majeur s'impose : <strong>l'intelligence artificielle n'est ni de la magie, ni un simple exercice de programmation logicielle standard</strong>. Elle constitue la rencontre intime entre l'analyse fonctionnelle, les probabilités infinitésimales, l'architecture des microprocesseurs et la théorie des systèmes complexes.</p>

            <h2>Les Trois Lois Fondamentales de l'Ingénierie IA</h2>
            <ol>
                <li><strong>La primauté de la physique sur l'algorithme :</strong> Un modèle ne s'exécute pas dans l'éther. Sa latence réelle est dictée par la loi d'Ohm, la capacitance des interconnexions HBM, la vitesse de commutation des transistors FinFET et le goulot d'étranglement du bus PCIe. Négliger le matériel, c'est s'interdire de construire des systèmes viables à l'échelle.</li>
                <li><strong>La loi de conservation de l'incertitude :</strong> Tout apprentissage sur un échantillon fini comporte une marge d'erreur inhérente, bornée par la dimension VC et les dérives de distribution (Data Shift). Aucun modèle de langage, aussi gigantesque soit-il, ne peut s'affranchir de la stochasticité de sa distribution d'entraînement. C'est le rôle du « Harness » et de l'ingénieur de borner cette incertitude par des barrières déterministes.</li>
                <li><strong>L'impératif de sobriété et de modularité :</strong> Le temps du gigantisme naïf où l'on augmentait aveuglément le nombre de paramètres pour pallier les faiblesses conceptuelles touche à ses limites thermodynamiques et financières. L'avenir appartient aux modèles compacts, distillés, quantifiés en INT4, routés intelligemment selon la difficulté de la tâche et couplés à des représentations latentes spécialisées (JEPA, System One).</li>
            </ol>

            <div class="edu-callout edu-g">
                <strong>NOTE FINALE POUR LA RÉDACTION DU LIVRE</strong>
                Ce condensé rassemble les vérités mathématiques et les leçons d'ingénierie les plus solides du domaine. Dans votre propre démarche d'écriture et d'auto-édition, faites vivre ce texte avec vos propres retours d'expérience, vos anecdotes de mise en production, vos choix stylistiques et votre vision personnelle de la discipline.
            </div>
        </div>
    </article>
""")

    # 6. Glossaire & Index des Notions Clés
    html.append("""
    <article class="chapter-container" style="page-break-before: always;">
        <header class="chapter-header">
            <span class="chapter-badge">RÉFÉRENTIEL TERMINOLOGIQUE &amp; CONCEPTUEL</span>
            <h1 class="chapter-title">Glossaire &amp; Index des Notions Clés (de A à Z)</h1>
            <p class="chapter-desc">Définitions canoniques, formalismes et points de repère pour l'ingénieur et l'auteur</p>
        </header>
        <div class="chapter-body">
            <table class="book-table">
                <thead>
                    <tr>
                        <th style="width: 24%;">Notion / Terme clé</th>
                        <th style="width: 28%;">Formalisme &amp; Définition canonique</th>
                        <th style="width: 48%;">Rôle en ingénierie de production &amp; IAOps</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Attention (Scaled Dot-Product)</strong></td>
                        <td>$$\\text{Softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$</td>
                        <td>Pondération dynamique du contexte entre tokens. Remplaçante universelle de la récurrence séquentielle.</td>
                    </tr>
                    <tr>
                        <td><strong>Backpropagation (Rétropropagation)</strong></td>
                        <td>$$\\frac{\\partial \\mathcal{L}}{\\partial w_{ij}} = \\frac{\\partial \\mathcal{L}}{\\partial z_j} \\cdot \\frac{\\partial z_j}{\\partial w_{ij}}$$</td>
                        <td>Application systématique de la règle de dérivation en chaîne (Chain Rule) pour propager l'erreur et ajuster les gradients.</td>
                    </tr>
                    <tr>
                        <td><strong>Continuous Batching</strong></td>
                        <td>Ordonnancement dynamique itération-par-itération (token-level)</td>
                        <td>Élimine l'attente des séquences longues. Maximise l'occupation des cœurs Tensor Cores sur serveurs d'inférence (vLLM, TGI).</td>
                    </tr>
                    <tr>
                        <td><strong>Covariate Shift</strong></td>
                        <td>$$P_{\\text{train}}(X) \\neq P_{\\text{prod}}(X) \\quad \\text{avec } P(Y|X) \\text{ stable}$$</td>
                        <td>Dérive statistique des entrées capteurs ou utilisateurs. Détectable en temps réel par le calcul de l'indice PSI.</td>
                    </tr>
                    <tr>
                        <td><strong>Distillation de Connaissance</strong></td>
                        <td>$$\\mathcal{L} = \\alpha \\mathcal{L}_{CE} + (1-\\alpha) D_{KL}(P_{\\text{Teacher}} \\parallel P_{\\text{Student}})$$</td>
                        <td>Compression d'un modèle lourd vers un modèle compact ultra-rapide en transférant la distribution douce des probabilités.</td>
                    </tr>
                    <tr>
                        <td><strong>Embedding (Plongement)</strong></td>
                        <td>Projection $x \\mapsto \\mathbf{e} \\in \\mathbb{R}^D$ ($D \\sim 768 - 4096$)</td>
                        <td>Espace vectoriel continu où la proximité géométrique (similarité cosinus) reflète la parenté sémantique.</td>
                    </tr>
                    <tr>
                        <td><strong>FlashAttention</strong></td>
                        <td>Tiling mémoire exploitant la SRAM GPU ($20\\text{ To/s}$)</td>
                        <td>Calcule l'attention exacte sans jamais matérialiser la matrice $N \\times N$ en HBM lente, réduisant la mémoire de quadratique à linéaire.</td>
                    </tr>
                    <tr>
                        <td><strong>GEMM (General Matrix Multiply)</strong></td>
                        <td>$$C = \\alpha AB + \\beta C$$</td>
                        <td>Cœur arithmétique de 95% des calculs en Deep Learning, accéléré nativement par les unités matricielles (Tensor Cores).</td>
                    </tr>
                    <tr>
                        <td><strong>GQA (Grouped-Query Attention)</strong></td>
                        <td>$H_Q$ têtes de requête regroupées sur $H_{KV}$ têtes Clé/Valeur</td>
                        <td>Division par 4 ou 8 de la taille du KV Cache en mémoire VRAM tout en préservant 99% de la qualité de raisonnement.</td>
                    </tr>
                    <tr>
                        <td><strong>Harness d'Exécution</strong></td>
                        <td>Architecture de défense en profondeur (Sandbox, HITL, Regex)</td>
                        <td>Sas d'isolement étanche empêchant un modèle agentique d'exécuter des commandes système non autorisées ou d'exfiltrer des secrets.</td>
                    </tr>
                    <tr>
                        <td><strong>JEPA (Joint Embedding Predictive)</strong></td>
                        <td>Prédiction directe dans l'espace latent $\\mathcal{S}_y = g(\\mathcal{S}_x)$</td>
                        <td>Paradigme de LeCun évitant la génération de pixels ou de tokens inutiles, concentrant la capacité sur les concepts sémantiques stables.</td>
                    </tr>
                    <tr>
                        <td><strong>KV Cache (Key-Value Cache)</strong></td>
                        <td>Mémorisation en VRAM des tenseurs $\\mathbf{K}, \\mathbf{V}$ historiques</td>
                        <td>Transforme la génération autorégressive de $\\mathcal{O}(N^2)$ calculs à $\\mathcal{O}(1)$ calculs par nouveau token généré.</td>
                    </tr>
                    <tr>
                        <td><strong>LoRA (Low-Rank Adaptation)</strong></td>
                        <td>$$W = W_0 + \\frac{\\alpha}{r} (B \\cdot A) \\quad \\text{avec } r \\ll d$$</td>
                        <td>Fine-tuning frugal : gèle les milliards de paramètres du modèle de base et n'entraîne que des matrices de rang réduit (rang 8 à 64).</td>
                    </tr>
                    <tr>
                        <td><strong>MCP (Model Context Protocol)</strong></td>
                        <td>Standard ouvert JSON-RPC client-serveur pour LLM</td>
                        <td>Normalise l'interopérabilité des outils et contextes externes, évitant l'écriture de connecteurs sur mesure pour chaque modèle.</td>
                    </tr>
                    <tr>
                        <td><strong>MLP (Multi-Layer Perceptron)</strong></td>
                        <td>$$f(x) = \\sigma(W_2 \\cdot \\sigma(W_1 x + b_1) + b_2)$$</td>
                        <td>Architecture pionnière à couches denses validant le Théorème d'Approximation Universelle (Hornik, 1989).</td>
                    </tr>
                    <tr>
                        <td><strong>PagedAttention</strong></td>
                        <td>Allocation mémoire non-contiguë inspirée de la mémoire virtuelle OS</td>
                        <td>Supprime la fragmentation interne et externe de la VRAM, doublant le débit de requêtes concurrentes sur GPU.</td>
                    </tr>
                    <tr>
                        <td><strong>Perceptron</strong></td>
                        <td>$$y = \\text{sign}(w \\cdot x + b)$$</td>
                        <td>Classifieur linéaire historique (Rosenblatt, 1957). Impuissant face aux fonctions non-linéaires sans couches cachées (échec du XOR).</td>
                    </tr>
                    <tr>
                        <td><strong>PSI (Population Stability Index)</strong></td>
                        <td>$$\\sum_{b} (Q(b) - P(b)) \\ln\\left(\\frac{Q(b)}{P(b)}\\right)$$</td>
                        <td>Métrique canonique de surveillance MLOps. Seuil d'alerte critique conventionnel fixé à $\\ge 0.20$.</td>
                    </tr>
                    <tr>
                        <td><strong>Quantization (Quantification)</strong></td>
                        <td>Mapping discret $\\mathbb{R} \\to [ -2^{b-1}, 2^{b-1}-1 ]$</td>
                        <td>Conversion en INT8 ou INT4 (AWQ/GPTQ) divisant la taille par 2 à 4 et réduisant drastiquement l'empreinte thermique.</td>
                    </tr>
                    <tr>
                        <td><strong>SIMT (Single Instruction Multiple Threads)</strong></td>
                        <td>Exécution par Warps de 32 threads matériels synchrones</td>
                        <td>Modèle matériel des GPU maximisant la densité de calcul matriciel brut par unité de surface de silicium.</td>
                    </tr>
                    <tr>
                        <td><strong>Théorème Central Limite (TCL)</strong></td>
                        <td>$$\\sqrt{n} \\left( \\frac{\\bar{X}_n - \\mu}{\\sigma} \\right) \\xrightarrow{\\mathcal{D}} \\mathcal{N}(0, 1)$$</td>
                        <td>Fondation universelle justifiant l'usage de distributions gaussiennes pour modéliser le bruit de mesure et les incertitudes d'agrégation.</td>
                    </tr>
                    <tr>
                        <td><strong>Théorie VC (Vapnik-Chervonenkis)</strong></td>
                        <td>Capacité de pulvérisation géométrique maximale $d_{\\text{VC}}$</td>
                        <td>Borne supérieure mathématique de l'erreur de généralisation réelle en fonction de la taille finie du jeu de données.</td>
                    </tr>
                    <tr>
                        <td><strong>Weibull (Loi de)</strong></td>
                        <td>$$\\lambda(t) = \\frac{\\beta}{\\eta} \\left( \\frac{t}{\\eta} \\right)^{\\beta - 1}$$</td>
                        <td>Modèle de fiabilité prédictive (AIOps) distinguant la jeunesse ($\\beta < 1$), le régime aléatoire ($\\beta = 1$) et l'usure ($\\beta > 1$).</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </article>
""")

    # Script de rendu des formules KaTeX integre et synchrone
    render_script = """
    // Execution synchrone immediate du rendu de toutes les formules mathematiques
    var mathElements = document.querySelectorAll('.math-tex');
    mathElements.forEach(function(el) {
        var tex = el.getAttribute('data-tex') || el.textContent;
        var isDisplay = el.classList.contains('math-display') || el.tagName === 'DIV';
        try {
            katex.render(tex, el, {
                displayMode: isDisplay,
                throwOnError: false
            });
        } catch (err) {
            console.warn("Erreur KaTeX:", err);
        }
    });
    """
    html.append("<script>\n" + katex_js + "\n" + render_script + "\n</script>\n</body>\n</html>\n")

    return "".join(html)

def main():
    print("Chargement des cours depuis config/educational.json...")
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        courses = json.load(f)

    print(f"{len(courses)} cours charges avec succes.")
    print("Generation du document HTML complet...")
    full_html = build_full_html(courses)

    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Manuscrit HTML genere : {OUTPUT_HTML} ({len(full_html)} octets)")

    print(f"Compilation en PDF haute resolution via Chrome headless : {OUTPUT_PDF}...")
    chrome_cmd = [
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={OUTPUT_PDF}",
        str(OUTPUT_HTML)
    ]
    
    try:
        res = subprocess.run(chrome_cmd, capture_output=True, text=True, check=True)
        pdf_size = os.path.getsize(OUTPUT_PDF)
        print(f"PDF genere avec succes : {OUTPUT_PDF} ({pdf_size / (1024*1024):.2f} Mo)")
    except subprocess.CalledProcessError as e:
        print(f"Erreur lors de la generation Chrome : {e.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    main()
