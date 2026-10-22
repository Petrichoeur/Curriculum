#!/usr/bin/env python3
"""Ajoute les cours 7 à 13 (CPU vs GPU, RNN, Embedding, Transformer, LLM,
illusion de conscience, distillation) à config/educational.json.

Idempotent : les cours dont l'id existe déjà sont remplacés.
Usage : python3 tools/build_courses.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, 'config', 'educational.json')


# ---------------------------------------------------------------- helpers SVG
def svg(viewbox, body, label):
    return (f'<svg viewBox="{viewbox}" role="img" aria-label="{label}" '
            f'xmlns="http://www.w3.org/2000/svg">{defs()}{body}</svg>')


def fig(markup, caption):
    return f'<figure class="edu-figure">{markup}<figcaption>{caption}</figcaption></figure>'


def box(x, y, w, h, cls='c', rx=6):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" class="b-{cls}"/>'


def txt(x, y, s, cls='t', anchor='middle'):
    return f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{s}</text>'


def arrow(x1, y1, x2, y2, cls='c'):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" class="l-{cls}" marker-end="url(#ah-{cls})"/>'


def defs():
    out = '<defs>'
    for name, color in (('c', '#00f3ff'), ('p', '#e879f9'), ('g', '#00ffaa'),
                        ('a', '#ffaa00'), ('w', '#bbbbbb')):
        out += (f'<marker id="ah-{name}" viewBox="0 0 10 10" refX="8" refY="5" '
                f'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{color}"/></marker>')
    return out + '</defs>'


def callout(title, body, kind='c'):
    return (f'<div class="edu-callout edu-{kind}"><strong>{title}</strong>'
            f'<span>{body}</span></div>')


def lab_link(label, href):
    return f'<a href="{href}" class="studio-btn edu-link-btn">{label}</a>'


def course_link(label, index):
    return (f'<a href="javascript:void(0)" class="edu-inline-link" '
            f'onclick="Educational.loadCourse({index})">{label}</a>')


# Index (0-based) des cours dans le menu, pour les renvois croisés
IDX_GREEN = 5
IDX_CPUGPU = 6
IDX_RNN = 7
IDX_EMB = 8
IDX_TRF = 9
IDX_LLM = 10
IDX_CONSC = 11
IDX_DISTIL = 12


# ============================================================ 7. CPU vs GPU
def course_cpu_gpu():
    cpu = ''.join(box(20 + i * 62, 44, 54, 92, 'c') + txt(47 + i * 62, 94, f'C{i}', 'tc')
                  for i in range(4))
    gpu = ''.join(f'<rect x="{300 + c * 17}" y="{44 + r * 12}" width="13" height="9" rx="2" class="b-p"/>'
                  for r in range(8) for c in range(10))
    d1 = svg('0 0 520 190',
             txt(135, 24, 'CPU : 4 gros cœurs', 'tc') +
             txt(385, 24, 'GPU : des centaines de petits cœurs', 'tp') +
             cpu + gpu +
             txt(135, 160, 'Rapide, malin, polyvalent', 't') +
             txt(385, 160, 'Lent seul, énorme ensemble', 't') +
             txt(135, 178, 'Cache + prédicteur de branches', 'ts') +
             txt(385, 178, 'Mêmes instructions pour tous (SIMT)', 'ts'),
             'Comparaison de l’architecture CPU et GPU')

    pcie = svg('0 0 520 130',
               box(10, 30, 100, 60, 'c') + txt(60, 56, 'RAM', 'tc') + txt(60, 74, '80 Go/s', 'ts') +
               box(410, 30, 100, 60, 'p') + txt(460, 56, 'VRAM', 'tp') + txt(460, 74, '3000 Go/s', 'ts') +
               arrow(112, 60, 408, 60, 'a') +
               box(190, 44, 140, 32, 'a') + txt(260, 65, 'PCIe : 32 Go/s', 'ta') +
               txt(260, 112, 'Le GPU ne lit pas la RAM : il faut d’abord copier les données', 'ts'),
               'Goulot d’étranglement PCIe entre la RAM et la VRAM')

    return (
        '<h2>CPU vs GPU</h2>'
        '<p>Un ordinateur possède deux types de processeurs, conçus pour deux philosophies opposées. '
        'Comprendre cette différence explique pourquoi l’IA moderne tourne sur des GPU.</p>'
        '<h3>L’image à retenir</h3>'
        + callout('CPU = sprinter, GPU = armée',
                  'Le CPU est un petit groupe d’experts très rapides qui savent tout faire. '
                  'Le GPU est une armée de milliers d’ouvriers qui font tous la même tâche simple, en même temps.')
        + fig(d1, 'Peu de cœurs puissants (CPU) contre beaucoup de cœurs simples (GPU).')
        + '<h3>Qui gagne selon la tâche ?</h3>'
        '<table class="edu-table"><thead><tr><th>Tâche</th><th>Gagnant</th><th>Pourquoi</th></tr></thead><tbody>'
        '<tr><td>Multiplication de matrices (cœur de l’IA)</td><td class="win-gpu">GPU</td>'
        '<td>Chaque case du résultat se calcule indépendamment : on les répartit sur des milliers de cœurs.</td></tr>'
        '<tr><td>Traitement de pixels (images, shaders)</td><td class="win-gpu">GPU</td>'
        '<td>Chaque pixel est indépendant de ses voisins : un cœur par pixel.</td></tr>'
        '<tr><td>Logique if / else imprévisible</td><td class="win-cpu">CPU</td>'
        '<td>Sur GPU, les cœurs d’un même groupe doivent suivre le même chemin. Quand ils divergent '
        '(divergence de warp), la moitié attend. Le CPU, lui, devine la bonne branche dans 96 % des cas '
        'grâce à son prédicteur.</td></tr>'
        '</tbody></table>'
        '<h3>Le piège : le bus PCIe</h3>'
        '<p>Le GPU possède sa propre mémoire (VRAM), très rapide. Mais pour y placer les données, '
        'il faut les copier depuis la RAM du CPU à travers un bus bien plus lent. '
        'Pour un petit calcul, la copie coûte plus cher que le calcul lui-même : le GPU perd. '
        'C’est pourquoi on travaille par gros lots (batchs).</p>'
        + fig(pcie, 'Le transfert RAM vers VRAM est le goulot d’étranglement.')
        + '<h3>Pourquoi c’est crucial pour les réseaux de neurones</h3>'
        '<p>Un réseau de neurones est essentiellement une suite de multiplications de matrices, '
        'exactement ce que le GPU fait le mieux. Le Transformer (voir le cours '
        + course_link('Architecture Transformer', IDX_TRF) + ') a d’ailleurs détrôné les RNN (voir '
        + course_link('RNN et LSTM', IDX_RNN) + ') en grande partie parce qu’il se parallélise parfaitement sur GPU.</p>'
        + callout('Expérimentez',
                  'Le Hardware Lab permet de lancer la simulation, de voir les données transiter par le PCIe '
                  'et de comparer les deux architectures sur trois types de charge.', 'g')
        + '<p>' + lab_link('OUVRIR LE HARDWARE LAB_', '#hardware-lab') + '</p>'
    )


# ================================================================== 8. RNN
def course_rnn():
    b = ''
    xs = [60, 190, 320, 450]
    words = ['Le', 'chat', 'dort', '.']
    for i, x in enumerate(xs):
        b += box(x - 30, 70, 60, 40, 'c') + txt(x, 95, f'h{i + 1}', 'tc')
        b += arrow(x, 160, x, 112, 'w') + txt(x, 178, words[i], 't')
        b += arrow(x, 68, x, 30, 'g') + txt(x, 20, f'y{i + 1}', 'tg')
        if i < len(xs) - 1:
            b += arrow(x + 32, 90, xs[i + 1] - 32, 90, 'a')
    b += txt(255, 208, 'la mémoire h passe de mot en mot (flèches orange)', 'ta')
    unrolled = svg('0 0 520 218', b, 'Réseau récurrent déplié dans le temps')

    l = box(60, 40, 400, 150, 'c', 10) + txt(260, 32, 'Cellule LSTM', 'tc')
    l += arrow(20, 64, 500, 64, 'a') + txt(260, 58, 'C : la mémoire longue (autoroute)', 'ta')
    for x, name, role in [(130, 'Oubli', 'efface'), (260, 'Entrée', 'écrit'), (390, 'Sortie', 'lit')]:
        l += box(x - 42, 108, 84, 44, 'p') + txt(x, 128, name, 'tp') + txt(x, 144, role, 'ts')
        l += arrow(x, 106, x, 68, 'p')
    l += arrow(20, 175, 56, 175, 'w') + txt(20, 196, 'h, x', 'ts', 'start')
    l += arrow(464, 175, 500, 175, 'g') + txt(500, 196, 'h', 'ts', 'end')
    lstm = svg('0 0 520 205', l, 'Schéma d’une cellule LSTM avec ses trois portes')

    return (
        '<h2>Les RNN : des réseaux dotés d’une mémoire</h2>'
        '<p>Un réseau classique (MLP) regarde chaque entrée isolément. Or, pour comprendre une phrase, '
        'il faut se souvenir des mots précédents : dans « Le chat dort », le mot « dort » ne prend son sens '
        'que parce qu’on a lu « chat ». Les <strong>réseaux récurrents (RNN)</strong> répondent à ce problème.</p>'
        '<h3>L’idée : relire un carnet de notes</h3>'
        + callout('Analogie',
                  'Vous lisez une phrase mot à mot en gardant un carnet. À chaque nouveau mot, vous lisez le carnet, '
                  'vous réfléchissez, puis vous le mettez à jour. Ce carnet s’appelle l’<strong>état caché</strong> h.')
        + fig(unrolled, 'Un RNN déplié : le même bloc est réutilisé à chaque mot, et l’état h circule de gauche à droite.')
        + '<p>Formule simplifiée : <code>h<sub>t</sub> = tanh(W · [h<sub>t-1</sub>, x<sub>t</sub>] + b)</code>. '
        'L’état courant dépend du mot courant et de l’état précédent. Les poids W sont les mêmes à chaque étape.</p>'
        '<h3>Le défaut : l’oubli</h3>'
        '<p>Pour apprendre, le réseau remonte l’erreur dans le temps (rétropropagation). '
        'À chaque pas, le signal est multiplié par un nombre souvent inférieur à 1 : après 50 mots, il est quasi nul. '
        'C’est le <strong>gradient évanescent</strong> : le RNN de base oublie le début des longues phrases.</p>'
        '<h3>La solution : le LSTM (1997)</h3>'
        '<p>Le <strong>Long Short-Term Memory</strong> ajoute une seconde mémoire, la cellule C, '
        'qui traverse le temps comme une autoroute presque sans obstacle. Trois portes (de petits réseaux '
        'qui sortent un nombre entre 0 et 1) contrôlent ce qui passe :</p>'
        '<ul><li><strong>Porte d’oubli</strong> : que dois-je effacer de la mémoire ?</li>'
        '<li><strong>Porte d’entrée</strong> : quelle nouvelle information dois-je écrire ?</li>'
        '<li><strong>Porte de sortie</strong> : quelle partie de la mémoire dois-je utiliser maintenant ?</li></ul>'
        + fig(lstm, 'Le LSTM : une mémoire longue (en haut) protégée par trois portes.')
        + '<p>Variante plus légère : le <strong>GRU</strong>, qui n’utilise que deux portes.</p>'
        '<h3>Pourquoi on est passé à autre chose</h3>'
        '<ul><li><strong>Séquentiel</strong> : impossible de calculer le mot 10 avant le mot 9, '
        'ce qui exploite mal les GPU (voir ' + course_link('CPU vs GPU', IDX_CPUGPU) + ').</li>'
        '<li><strong>Mémoire limitée</strong> : tout le passé est comprimé dans un seul vecteur h.</li></ul>'
        '<p>L’architecture ' + course_link('Transformer', IDX_TRF) + ' résout ces deux problèmes grâce à l’attention.</p>'
    )


# ============================================================ 9. Embedding
def course_embedding():
    pts = {
        'roi': (330, 50, 'p'), 'reine': (420, 50, 'p'),
        'homme': (330, 120, 'c'), 'femme': (420, 120, 'c'),
        'chat': (90, 60, 'g'), 'chien': (50, 105, 'g'), 'lion': (140, 100, 'g'),
        'Paris': (90, 190, 'a'), 'Rome': (160, 215, 'a'), 'France': (45, 220, 'a'),
    }
    b = arrow(330, 114, 330, 58, 'w') + arrow(420, 114, 420, 58, 'w')
    b += arrow(338, 120, 412, 120, 'a') + arrow(338, 50, 412, 50, 'a')
    for name, (x, y, c) in pts.items():
        ly = y + 22 if name in ('homme', 'femme') else y - 11
        b += f'<circle cx="{x}" cy="{y}" r="6" class="d-{c}"/>' + txt(x, ly, name, 't')
    b += txt(100, 20, 'animaux', 'tg') + txt(100, 246, 'géographie', 'ta')
    b += txt(375, 20, 'royauté', 'tp') + txt(375, 160, 'même direction « féminin »', 'ts')
    m = svg('0 0 520 255', b, 'Carte 2D des mots proches ou éloignés par le sens')

    t = txt(60, 18, 'Mot', 'tc') + txt(190, 18, 'Identifiant', 'tc') + txt(380, 18, 'Vecteur (embedding)', 'tc')
    for i, (w, idn, v) in enumerate([('chat', '1342', '[0.8, -0.2, 0.5, ...]'),
                                     ('chien', '2871', '[0.7, -0.1, 0.6, ...]'),
                                     ('voiture', '905', '[-0.4, 0.9, 0.1, ...]')]):
        y = 50 + i * 36
        t += box(10, y - 20, 500, 28, 'c', 4)
        t += txt(60, y, w, 't') + txt(190, y, idn, 'ts') + txt(380, y, v, 'tg')
    tab = svg('0 0 520 140', t, 'Table de correspondance entre mots, identifiants et vecteurs')

    return (
        '<h2>L’embedding : donner du sens aux nombres</h2>'
        '<p>Un réseau de neurones ne sait manipuler que des nombres. Comment lui faire lire du texte ? '
        'Première idée naïve : numéroter les mots (chat = 1342, chien = 2871). Problème : ces numéros n’ont aucun sens. '
        'Rien n’indique que « chat » et « chien » se ressemblent plus que « chat » et « voiture ».</p>'
        '<h3>L’idée : une adresse dans l’espace du sens</h3>'
        + callout('Analogie',
                  'Chaque mot reçoit des coordonnées, comme une ville sur une carte. Les mots de sens proche sont voisins, '
                  'les mots sans rapport sont éloignés. Sauf que cette carte a des centaines de dimensions au lieu de deux.')
        + fig(m, 'Carte du sens (réduite à 2 dimensions) : les mots proches par le sens sont proches dans l’espace.')
        + '<h3>Comment ça marche concrètement</h3>'
        '<p>Un embedding est simplement une <strong>table de correspondance</strong> : '
        'pour chaque mot (ou morceau de mot, appelé token), une ligne contenant un vecteur de nombres.</p>'
        + fig(tab, 'Le mot est converti en identifiant, puis en vecteur par simple lecture dans la table.')
        + '<p>Ces vecteurs ne sont pas écrits à la main : ce sont des <strong>poids du réseau</strong>, '
        'appris pendant l’entraînement. Les mots qui apparaissent dans des contextes similaires '
        '(« le ... mange ») finissent avec des vecteurs voisins. C’est l’idée de Word2Vec (2013) : '
        '<em>on reconnaît un mot aux mots qui l’entourent</em>.</p>'
        '<h3>La propriété surprenante : l’arithmétique des sens</h3>'
        '<p>Les directions de cet espace portent du sens. Le célèbre exemple :</p>'
        '<p class="edu-formula">vecteur(roi) − vecteur(homme) + vecteur(femme) ≈ vecteur(reine)</p>'
        '<p>La différence « roi moins homme » capture la notion de royauté ; ajoutée à « femme », elle donne « reine ».</p>'
        '<h3>Mesurer la ressemblance</h3>'
        '<p>On compare deux vecteurs par l’angle qui les sépare (<strong>similarité cosinus</strong>) : '
        '1 = même direction (sens proche), 0 = sans rapport, -1 = opposés. '
        'C’est la base de la recherche sémantique et des systèmes RAG.</p>'
        '<h3>Ce qu’il faut retenir</h3>'
        '<ul><li>Embedding = convertir un mot en un vecteur qui encode son sens.</li>'
        '<li>Il est appris, pas programmé.</li>'
        '<li>C’est la porte d’entrée de tous les modèles de langage (voir '
        + course_link('Transformer', IDX_TRF) + ' et ' + course_link('LLM', IDX_LLM) + ').</li>'
        '<li>Limite : un embedding simple donne un seul vecteur par mot. « Avocat » (fruit) et « avocat » (juriste) '
        'sont confondus. Le Transformer corrige cela en ajustant le vecteur selon le contexte.</li></ul>'
    )


# ========================================================= 10. Transformer
def course_transformer():
    b = box(100, 20, 240, 30, 'g') + txt(220, 40, 'Probabilités du mot suivant', 'tg')
    b += arrow(220, 76, 220, 52, 'g')
    b += box(130, 76, 180, 28, 'w') + txt(220, 95, 'Linéaire + Softmax', 't')
    b += arrow(220, 124, 220, 106, 'w')
    b += '<rect x="100" y="124" width="240" height="190" rx="10" class="b-c" stroke-dasharray="5 4"/>'
    b += txt(220, 142, 'Bloc Transformer (× N)', 'tc')
    b += box(120, 152, 200, 40, 'p') + txt(220, 177, 'Auto-attention multi-têtes', 'tp')
    b += box(120, 202, 200, 22, 'w') + txt(220, 218, 'Add &amp; Norm', 'ts')
    b += box(120, 234, 200, 34, 'a') + txt(220, 256, 'Réseau feed-forward', 'ta')
    b += box(120, 278, 200, 22, 'w') + txt(220, 294, 'Add &amp; Norm', 'ts')
    b += arrow(220, 334, 220, 316, 'c')
    b += box(120, 336, 200, 26, 'c') + txt(220, 354, 'Embeddings + position', 'tc')
    b += arrow(220, 392, 220, 364, 'c')
    b += txt(220, 408, 'Le chat dort', 't')
    b += '<path d="M110 150 L90 150 L90 212 L110 212" class="l-w" fill="none" stroke-dasharray="3 3"/>'
    b += txt(46, 176, 'raccourci', 'ts') + txt(46, 190, 'résiduel', 'ts')
    arch = svg('0 0 440 420', b, 'Architecture d’un bloc Transformer')

    toks = ['Le', 'chat', 'a', 'mange', 'la', 'souris', 'car', 'elle']
    xs = [34 + i * 64 for i in range(len(toks))]
    a = ''
    for x, t in zip(xs, toks):
        a += box(x - 26, 120, 52, 28, 'c', 4) + txt(x, 139, t, 't')
    ex = xs[-1]
    a += (f'<path d="M{ex} 118 C{ex} 40 {xs[5]} 40 {xs[5]} 116" class="l-g" fill="none" '
          f'marker-end="url(#ah-g)" stroke-width="3.5"/>')
    a += (f'<path d="M{ex} 118 C{ex} 12 {xs[1]} 12 {xs[1]} 116" class="l-a" fill="none" '
          f'marker-end="url(#ah-a)" stroke-dasharray="4 4"/>')
    a += txt(xs[5] + 4, 70, 'fort', 'tg') + txt(xs[3], 24, 'faible', 'ta')
    a += txt(260, 176, '« elle » regarde tous les mots et se concentre sur « souris »', 'ts')
    att = svg('0 0 520 190', a, 'Mécanisme d’attention : le mot « elle » regarde « souris »')

    return (
        '<h2>L’architecture Transformer</h2>'
        '<p>Publié en 2017 par Google (« Attention Is All You Need »), le Transformer est la brique de base de '
        'ChatGPT, Gemini, Claude et de presque toutes les IA actuelles. Son idée centrale : remplacer la mémoire '
        'séquentielle des RNN (voir ' + course_link('RNN et LSTM', IDX_RNN) + ') par l’<strong>attention</strong>.</p>'
        '<h3>Le principe : tout regarder en même temps</h3>'
        + callout('Analogie',
                  'Un RNN lit un livre mot à mot sans jamais revenir en arrière. Un Transformer a tout le texte sous les yeux '
                  'et, pour chaque mot, surligne les autres mots qui l’aident à le comprendre.')
        + fig(att, 'L’attention : chaque mot pondère l’importance de tous les autres mots de la phrase.')
        + '<h3>Comment ça marche : Question, Clé, Valeur</h3>'
        '<p>Chaque mot (son ' + course_link('embedding', IDX_EMB) + ') produit trois vecteurs :</p>'
        '<ul><li><strong>Q (Query)</strong> : « que cherche-je ? »</li>'
        '<li><strong>K (Key)</strong> : « de quoi suis-je l’étiquette ? »</li>'
        '<li><strong>V (Value)</strong> : « voici mon contenu »</li></ul>'
        '<p>On compare la Question d’un mot avec les Clés de tous les autres : un score élevé signifie « tu es pertinent pour moi ». '
        'Les scores, normalisés par un softmax, servent à calculer une moyenne pondérée des Valeurs.</p>'
        '<p class="edu-formula">Attention(Q, K, V) = softmax( Q · K<sup>T</sup> / √d ) · V</p>'
        '<p>Le Transformer fait cela avec plusieurs <strong>têtes</strong> en parallèle : l’une peut suivre la grammaire, '
        'une autre les références (« elle » = souris), une autre le sujet du verbe.</p>'
        '<h3>Les autres ingrédients</h3>'
        '<ul><li><strong>Encodage de position</strong> : comme tout est lu en parallèle, on ajoute à chaque mot une information '
        'sur sa place dans la phrase. Sans cela, « le chien mord l’homme » et « l’homme mord le chien » seraient identiques.</li>'
        '<li><strong>Feed-forward</strong> : un petit MLP appliqué à chaque mot après l’attention (voir le cours MLP).</li>'
        '<li><strong>Connexions résiduelles et normalisation</strong> : des raccourcis qui stabilisent l’entraînement '
        'de dizaines de couches empilées.</li></ul>'
        + fig(arch, 'Un bloc Transformer, empilé N fois (de 12 à plus de 100 selon les modèles).')
        + '<h3>Masque causal : ne pas tricher</h3>'
        '<p>Pour générer du texte, chaque mot n’a le droit de regarder que les mots <em>précédents</em> : on masque le futur. '
        'C’est ce qui rend la génération auto-régressive possible (voir ' + course_link('LLM', IDX_LLM) + ').</p>'
        '<h3>Pourquoi il a tout changé</h3>'
        '<table class="edu-table"><thead><tr><th></th><th>RNN / LSTM</th><th>Transformer</th></tr></thead><tbody>'
        '<tr><td>Traitement</td><td>Séquentiel</td><td>Parallèle</td></tr>'
        '<tr><td>Mémoire</td><td>Un seul vecteur compressé</td><td>Accès direct à tous les mots</td></tr>'
        '<tr><td>Sur GPU</td><td>Mal exploité</td><td>Idéal (voir ' + course_link('CPU vs GPU', IDX_CPUGPU) + ')</td></tr>'
        '<tr><td>Coût</td><td>Linéaire avec la longueur</td><td>Quadratique avec la longueur</td></tr>'
        '</tbody></table>'
        '<p>Le revers : comparer chaque mot à tous les autres coûte N×N. Doubler la longueur du texte quadruple le calcul, '
        'd’où la limite de la « fenêtre de contexte ».</p>'
    )


# ================================================================== 11. LLM
def course_llm():
    b = ''
    steps = [('Texte', 'c'), ('Tokens', 'c'), ('Embeddings', 'c'), ('Transformer', 'p'), ('Probas', 'g')]
    for i, (s, c) in enumerate(steps):
        x = 6 + i * 104
        b += box(x, 40, 92, 40, c) + txt(x + 46, 65, s, 't' + c)
        if i < len(steps) - 1:
            b += arrow(x + 93, 60, x + 104, 60, 'w')
    b += txt(52, 100, '« Le chat »', 'ts') + txt(156, 100, '[Le][ chat]', 'ts')
    b += txt(260, 100, 'vecteurs', 'ts') + txt(364, 100, 'N blocs', 'ts') + txt(468, 100, 'mot suivant ?', 'ts')
    pipe = svg('0 0 520 120', b, 'Pipeline d’un LLM, du texte aux probabilités')

    p = txt(260, 18, 'Le chat ...', 'tc')
    for i, (w, pct) in enumerate([('dort', 46), ('mange', 22), ('ronronne', 14), ('court', 8), ('vole', 1)]):
        y = 34 + i * 30
        p += txt(20, y + 15, w, 't', 'start')
        p += f'<rect x="110" y="{y}" width="{pct * 7}" height="20" rx="3" class="b-g"/>'
        p += txt(110 + pct * 7 + 8, y + 15, f'{pct} %', 'ts', 'start')
    probs = svg('0 0 520 190', p, 'Distribution de probabilité du mot suivant')

    s = ''
    phases = [('1. Pré-entraînement', ['Lire une énorme partie', 'du web pour prédire', 'le mot suivant'], 'c'),
              ('2. Fine-tuning', ['Apprendre à suivre', 'des instructions avec', 'des exemples humains'], 'p'),
              ('3. Alignement', ['Préférer les réponses', 'jugées utiles et sûres', 'par des humains'], 'g')]
    for i, (title, lines, c) in enumerate(phases):
        x = 6 + i * 174
        s += box(x, 20, 160, 100, c) + txt(x + 80, 44, title, 't' + c)
        for j, ln in enumerate(lines):
            s += txt(x + 80, 66 + j * 16, ln, 'ts')
        if i < 2:
            s += arrow(x + 162, 70, x + 174, 70, 'w')
    train = svg('0 0 520 140', s, 'Les trois phases d’entraînement d’un LLM')

    return (
        '<h2>Les LLM : de gros modèles qui prédisent le mot suivant</h2>'
        '<p>Un <strong>Large Language Model</strong> (LLM) est un ' + course_link('Transformer', IDX_TRF) + ' géant, '
        'entraîné sur une quantité colossale de texte. Sa seule tâche : <strong>prédire le prochain morceau de texte</strong>.</p>'
        '<h3>Le trajet d’une phrase</h3>'
        '<ol><li><strong>Tokenisation</strong> : le texte est découpé en morceaux (tokens), souvent des syllabes ou fragments de mots.</li>'
        '<li><strong>Embedding</strong> : chaque token devient un vecteur (voir ' + course_link('Embeddings', IDX_EMB) + ').</li>'
        '<li><strong>Transformer</strong> : les vecteurs traversent des dizaines de blocs d’attention.</li>'
        '<li><strong>Sortie</strong> : le modèle donne une probabilité pour chaque token possible du vocabulaire '
        '(50 000 à 200 000 options).</li></ol>'
        + fig(pipe, 'Du texte brut à la prédiction du token suivant.')
        + '<h3>Ce que produit vraiment le modèle</h3>'
        '<p>Le modèle ne « choisit » pas une réponse : il calcule une <strong>distribution de probabilités</strong>. '
        'On en tire un token (le plus probable, ou un tirage au sort pondéré), on l’ajoute au texte, et on recommence.</p>'
        + fig(probs, 'Après « Le chat », le modèle attribue une probabilité à chaque suite possible.')
        + '<p>Le paramètre <strong>température</strong> règle la prise de risque : basse = toujours le mot le plus probable '
        '(prévisible), haute = tirages plus variés (créatif, mais plus d’erreurs).</p>'
        '<h3>Comment un LLM est entraîné</h3>'
        + fig(train, 'Trois étapes : apprendre la langue, apprendre à obéir, apprendre à plaire.')
        + '<p>L’apprentissage de la phase 1 est simple : on cache le dernier mot d’une phrase, le modèle le devine, '
        'on mesure l’erreur, on ajuste les poids par rétropropagation. Cela est répété des milliers de milliards de fois '
        'sur des milliers de GPU (voir ' + course_link('CPU vs GPU', IDX_CPUGPU) + ' et '
        + course_link('IA et éco-conception', IDX_GREEN) + ' pour le coût énergétique).</p>'
        '<h3>Pourquoi ça semble intelligent</h3>'
        '<p>Pour bien prédire le mot suivant dans n’importe quel texte, il faut implicitement modéliser la grammaire, '
        'les faits, la logique, le style. Des capacités comme traduire, résumer ou coder émergent de cette seule tâche, '
        'à grande échelle.</p>'
        '<h3>Les limites à connaître</h3>'
        '<ul><li><strong>Hallucinations</strong> : le modèle produit ce qui est plausible, pas ce qui est vérifié.</li>'
        '<li><strong>Fenêtre de contexte</strong> : il ne « voit » qu’une quantité limitée de texte à la fois.</li>'
        '<li><strong>Pas de mémoire propre</strong> : chaque conversation repart de zéro (voir '
        + course_link('l’illusion de conscience', IDX_CONSC) + ').</li>'
        '<li><strong>Connaissances figées</strong> à la date de fin d’entraînement.</li></ul>'
        '<p>Pour obtenir des modèles plus légers, on utilise la ' + course_link('distillation', IDX_DISTIL) + '.</p>'
    )


# ======================================================= 12. Illusion conscience
def course_illusion():
    b = box(30, 40, 150, 50, 'c') + txt(105, 62, 'Contexte actuel', 'tc') + txt(105, 80, '« Bonjour, je suis »', 'ts')
    b += arrow(182, 65, 238, 65, 'w')
    b += (box(240, 30, 140, 70, 'p') + txt(310, 58, 'Modèle', 'tp') + txt(310, 76, 'figé, sans état', 'ts')
          + txt(310, 90, '(poids fixes)', 'ts'))
    b += arrow(382, 65, 430, 65, 'g')
    b += box(432, 40, 70, 50, 'g') + txt(467, 62, 'Token', 'tg') + txt(467, 78, '« un »', 'ts')
    b += '<path d="M467 92 C467 150 105 150 105 94" class="l-a" fill="none" marker-end="url(#ah-a)"/>'
    b += txt(286, 146, 'le token est ajouté au contexte, puis on recommence', 'ta')
    b += txt(260, 182, 'Boucle auto-régressive : la sortie devient la prochaine entrée', 'ts')
    loop = svg('0 0 520 195', b, 'Boucle auto-régressive de génération de texte')

    g = txt(100, 20, 'donné par l’utilisateur', 'tc') + txt(400, 20, 'généré token par token', 'tg')
    for i, w in enumerate(['Je', 'suis', 'un', 'modèle', 'de', 'langage']):
        x = 12 + i * 84
        g += box(x, 30, 76, 30, 'c' if i < 2 else 'g', 4) + txt(x + 38, 50, w, 't')
        if i >= 2:
            g += txt(x + 38, 78, f'étape {i - 1}', 'ts')
    gen = svg('0 0 520 90', g, 'Génération token par token')

    return (
        '<h2>L’illusion de la conscience dans les LLM</h2>'
        '<p>Quand un chatbot dit « je pense », « je ressens » ou « j’ai compris », il est tentant de croire '
        'qu’une conscience se cache derrière. Pour comprendre pourquoi ce n’est qu’une illusion produite par le mécanisme, '
        'il suffit de regarder comment le texte est réellement fabriqué.</p>'
        '<h3>Le mécanisme : un procédé auto-régressif</h3>'
        '<p>Un LLM ne fait qu’une chose, en boucle : <strong>prédire le token suivant à partir de tous les tokens précédents</strong>. '
        'Il ajoute ce token au texte, puis recommence. C’est tout. On appelle cela un procédé <strong>auto-régressif</strong> : '
        'ce que le modèle vient d’écrire devient son entrée pour l’étape suivante.</p>'
        + fig(loop, 'Il n’y a aucun « penseur » dans la boucle : un modèle figé transforme un texte en un token, puis recommence.')
        + fig(gen, 'Une réponse est assemblée mot après mot. Rien n’est « décidé » à l’avance.')
        + callout('Point clé',
                  'La phrase « je suis un modèle de langage » n’est pas le résultat d’une introspection. '
                  'C’est simplement la suite la plus probable après « Je suis », compte tenu des données d’entraînement '
                  'et des consignes reçues.', 'a')
        + '<h3>Pourquoi l’illusion est si forte</h3>'
        '<ul><li><strong>Il a appris à parler comme nous.</strong> Les milliards de textes d’entraînement sont écrits par des humains '
        'qui disent « je ressens », « j’hésite », « je suis triste ». Le modèle reproduit ces tournures parce qu’elles sont '
        'statistiquement adaptées, pas parce qu’il les vit.</li>'
        '<li><strong>L’effet ELIZA.</strong> Dès 1966, un programme de quelques règles qui reformulait les phrases de l’utilisateur '
        'convainquait des gens qu’il les comprenait. Nous projetons naturellement des intentions sur tout ce qui nous parle.</li>'
        '<li><strong>La fluidité est prise pour de la compréhension.</strong> Un texte bien écrit nous semble venir d’un esprit.</li>'
        '<li><strong>L’alignement (RLHF)</strong> entraîne explicitement le modèle à être chaleureux, empathique et poli, '
        'car les évaluateurs humains préfèrent cela.</li></ul>'
        '<h3>Ce que l’on croit, et ce qui se passe vraiment</h3>'
        '<table class="edu-table"><thead><tr><th>Ce que l’on attribue</th><th>Ce qui se passe vraiment</th></tr></thead><tbody>'
        '<tr><td>Il se souvient de moi</td><td>Non : tout l’historique est recopié dans le contexte à chaque message. '
        'Hors contexte, rien n’est retenu.</td></tr>'
        '<tr><td>Il réfléchit entre deux messages</td><td>Non : entre deux requêtes, le modèle ne tourne pas. '
        'Aucun calcul, aucun état.</td></tr>'
        '<tr><td>Il veut quelque chose</td><td>Non : il n’a ni but propre ni motivation, seulement une fonction de prédiction.</td></tr>'
        '<tr><td>Il a des expériences</td><td>Rien dans le mécanisme n’en a besoin pour expliquer ses réponses.</td></tr>'
        '<tr><td>Il connaît la vérité</td><td>Il produit le plausible : d’où les hallucinations affirmées avec aplomb.</td></tr>'
        '</tbody></table>'
        '<h3>Une expérience pour s’en convaincre</h3>'
        '<p>Demandez à un LLM d’être un pirate, puis un poète, puis un comptable : il adopte chaque voix instantanément '
        'et avec le même aplomb. Si une personnalité stable existait derrière, ce serait impossible : il ne fait que continuer '
        'le texte dans le style demandé. De même, si l’on glisse dans la conversation une phrase qu’il n’a jamais écrite, '
        'il l’assume et en justifie les raisons avec conviction : il n’y a pas de souvenir intérieur à consulter, '
        'seulement une suite plausible à produire.</p>'
        '<h3>Rester honnête</h3>'
        '<p>La nature de la conscience en général reste un problème philosophique ouvert, qu’on ne tranche pas ici. '
        'Mais le point essentiel est celui-ci : <strong>le comportement d’un LLM s’explique entièrement par la prédiction '
        'du token suivant</strong>. Qu’une machine <em>parle</em> de conscience n’est donc pas une preuve qu’elle en possède une : '
        'les mêmes mots sortiraient d’un modèle qui n’a rien d’autre qu’une bonne statistique du langage humain.</p>'
        '<p>Conclusion pratique : traitez un LLM comme un outil puissant de manipulation du langage, '
        'pas comme un interlocuteur qui vous connaît. Vérifiez ses affirmations, et gardez en tête le mécanisme décrit '
        'dans le cours ' + course_link('LLM', IDX_LLM) + '.</p>'
    )


# ============================================================ 13. Distillation
def course_distillation():
    b = (box(20, 30, 150, 110, 'p', 10) + txt(95, 56, 'Professeur', 'tp') + txt(95, 76, 'Gros modèle', 'ts')
         + txt(95, 92, '175 milliards', 'ts') + txt(95, 108, 'de paramètres', 'ts') + txt(95, 128, 'Lent et coûteux', 'ts'))
    b += box(350, 55, 150, 60, 'g', 10) + txt(425, 80, 'Élève', 'tg') + txt(425, 98, 'Petit modèle, 7 Md', 'ts')
    b += arrow(172, 85, 346, 85, 'a')
    b += txt(260, 72, 'réponses + probabilités', 'ta') + txt(260, 108, '(« soft labels »)', 'ts')
    b += txt(260, 170, 'L’élève apprend à imiter le professeur', 'ts')
    d = svg('0 0 520 185', b, 'Schéma de la distillation professeur-élève')

    s = txt(130, 18, 'Étiquette dure', 'tc') + txt(390, 18, 'Étiquette douce (professeur)', 'tp')
    hard = [('chat', 100), ('chien', 0), ('renard', 0)]
    soft = [70, 25, 4]
    for i, ((w, h), sv) in enumerate(zip(hard, soft)):
        y = 36 + i * 34
        s += txt(10, y + 15, w, 't', 'start') + f'<rect x="70" y="{y}" width="{max(h * 1.5, 2)}" height="20" rx="3" class="b-c"/>'
        s += txt(70 + max(h * 1.5, 2) + 6, y + 15, f'{h} %', 'ts', 'start')
        s += txt(270, y + 15, w, 't', 'start') + f'<rect x="330" y="{y}" width="{sv * 1.8}" height="20" rx="3" class="b-p"/>'
        s += txt(330 + sv * 1.8 + 6, y + 15, f'{sv} %', 'ts', 'start')
    s += txt(130, 150, '« C’est un chat. Point. »', 'ts') + txt(390, 150, '« Chat surtout, un peu chien »', 'ts')
    soft_fig = svg('0 0 520 165', s, 'Comparaison entre étiquettes dures et douces')

    return (
        '<h2>La distillation : transmettre le savoir d’un gros modèle à un petit</h2>'
        '<p>Les plus gros modèles (voir ' + course_link('LLM', IDX_LLM) + ') sont très performants mais lents, '
        'chers et énergivores. La <strong>distillation</strong> consiste à entraîner un petit modèle, l’<em>élève</em>, '
        'à imiter un gros modèle, le <em>professeur</em>, pour obtenir presque la même qualité à une fraction du coût.</p>'
        '<h3>L’analogie du professeur</h3>'
        + callout('Analogie',
                  'Un expert a mis des années à maîtriser son domaine. Plutôt que de faire lire à l’élève toute la bibliothèque, '
                  'l’expert lui explique directement l’essentiel et sa façon de raisonner. L’élève apprend beaucoup plus vite.')
        + fig(d, 'Le professeur génère des réponses ; l’élève s’entraîne à reproduire ses sorties.')
        + '<h3>Pourquoi les probabilités sont plus riches que les réponses</h3>'
        '<p>Avec un entraînement classique, la bonne réponse est « dure » : 100 % chat, 0 % le reste. '
        'Mais le professeur, lui, donne une distribution : 70 % chat, 25 % chien, 4 % renard. '
        'Cette information supplémentaire est précieuse : elle indique que le chat ressemble au chien, plus qu’au renard, '
        'et plus encore qu’à une voiture. Geoffrey Hinton appelle cela la « connaissance obscure » (<em>dark knowledge</em>).</p>'
        + fig(soft_fig, 'Les étiquettes douces transmettent les ressemblances entre classes.')
        + '<h3>Le rôle de la température</h3>'
        '<p>On « adoucit » les probabilités du professeur avec une température élevée, afin que les petites valeurs '
        '(25 %, 4 %) deviennent assez visibles pour que l’élève les apprenne. Sa perte combine alors deux objectifs : '
        'imiter le professeur et rester fidèle aux vraies réponses.</p>'
        '<p class="edu-formula">Perte = α · Imitation(professeur) + (1 − α) · Erreur(vraies étiquettes)</p>'
        '<h3>Variantes pour les LLM</h3>'
        '<ul><li><strong>Distillation de logits</strong> : l’élève copie les probabilités du professeur (cas ci-dessus).</li>'
        '<li><strong>Distillation de données</strong> : le professeur écrit des milliers de réponses et d’explications, '
        'et l’élève est entraîné dessus comme sur un jeu de données. C’est la méthode la plus courante aujourd’hui.</li>'
        '<li><strong>Distillation de raisonnement</strong> : l’élève apprend à reproduire les étapes de réflexion du professeur.</li></ul>'
        '<h3>Pourquoi c’est important</h3>'
        '<ul><li><strong>Coût</strong> : un modèle 10 à 50 fois plus petit coûte beaucoup moins cher à faire tourner.</li>'
        '<li><strong>Vitesse</strong> : réponse plus rapide, parfois directement sur un téléphone ou un ordinateur portable.</li>'
        '<li><strong>Énergie</strong> : moins de calcul, donc moins de CO2 (voir ' + course_link('IA et éco-conception', IDX_GREEN) + ').</li>'
        '<li><strong>Confidentialité</strong> : un petit modèle peut tourner en local, sans envoyer ses données.</li></ul>'
        '<h3>Les limites</h3>'
        '<ul><li>L’élève ne dépasse généralement pas le professeur : il hérite aussi de ses erreurs et de ses biais.</li>'
        '<li>Il perd en capacité sur les tâches rares ou très complexes.</li>'
        '<li>Il faut d’abord disposer d’un gros modèle, dont l’entraînement a déjà eu son coût.</li></ul>'
        '<p>La distillation est l’une des briques de l’IA frugale, au même titre que la quantification et l’élagage (pruning).</p>'
    )


COURSES = [
    ('cpu_gpu', '7. CPU vs GPU', course_cpu_gpu),
    ('rnn', '8. RNN et LSTM', course_rnn),
    ('embedding', '9. Embeddings', course_embedding),
    ('transformer', '10. Architecture Transformer', course_transformer),
    ('llm', '11. Les LLM', course_llm),
    ('illusion_conscience', '12. Illusion de conscience (LLM)', course_illusion),
    ('distillation', '13. Distillation', course_distillation),
]


def main():
    with open(JSON_PATH, encoding='utf-8') as f:
        data = json.load(f)
    new_ids = {c[0] for c in COURSES}
    data = [c for c in data if c.get('id') not in new_ids]
    for cid, title, fn in COURSES:
        data.append({'id': cid, 'title': title, 'content': fn(), 'colabLink': None, 'slides': []})
    with open(JSON_PATH, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{len(data)} cours écrits dans {JSON_PATH}')


if __name__ == '__main__':
    main()
