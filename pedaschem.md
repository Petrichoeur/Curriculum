# Référentiel Pédagogique des Schémas d'Architecture IA & IAOps

Ce document recense, décrit et analyse l'ensemble des **38 schémas vectoriels (SVG)** intégrés au cursus pédagogique. 

Dans l'enseignement des sciences des données et de l'intelligence artificielle, le schéma n'est pas une simple illustration décorative : il constitue une **prothèse cognitive**. Il permet de passer de l'abstraction des équations matricielles ou du code source à une **représentation spatiale, dynamique et causale** des flux d'information, des allocations mémoire et des frontières décisionnelles.

---

## Sommaire Synoptique des 38 Schémas

- **Partie I : Statistiques, Probabilités & Complexité d'Apprentissage**
  - Schéma 1 : Pulvérisation de 3 points vs échec du XOR sur 4 points *(Module 1.4 - Théorie VC)*
- **Partie II : Fondations du Machine Learning & Deep Learning**
  - Schéma 2 : Programmation classique vs Machine Learning *(Module 2.1 - Intro ML)*
  - Schéma 3 : Random Forest en parallèle vs Gradient Boosting en série *(Module 2.2 - ML Classique)*
  - Schéma 4 : Cycle d’évolution d’un algorithme génétique *(Module 2.2 - ML Classique)*
  - Schéma 5 : Les trois types de dérive de données *(Module 2.3 - Data Shift)*
  - Schéma 6 : Architecture mathématique d'un Perceptron *(Module 2.4 - Le Perceptron)*
  - Schéma 7 : Architecture en couches d'un Multi-Layer Perceptron *(Module 2.5 - Deep MLP)*
  - Schéma 8 : Boucle d’entraînement et répartition de la VRAM *(Module 2.6 - Entraînement)*
  - Schéma 9 : Principe de LoRA et adaptateurs de bas rang *(Module 2.6 - Entraînement)*
- **Partie III : Représentations Vectorielles & Architectures Séquentielles**
  - Schéma 10 : Réseau récurrent déplié dans le temps *(Module 3.1 - RNN et LSTM)*
  - Schéma 11 : Cellule LSTM et ses trois portes de contrôle *(Module 3.1 - RNN et LSTM)*
  - Schéma 12 : Carte géométrique 2D des proximités sémantiques *(Module 3.2 - Embeddings)*
  - Schéma 13 : Table d'indexation matricielle (Embedding Lookup) *(Module 3.2 - Embeddings)*
  - Schéma 14 : Mécanisme d’attention contextuelle *(Module 3.3 - Transformers)*
  - Schéma 15 : Architecture interne d’un bloc Transformer *(Module 3.3 - Transformers)*
- **Partie IV : Grands Modèles de Langage (LLM) & Ingénierie d'Inférence**
  - Schéma 16 : Pipeline complet d'un LLM du texte aux probabilités *(Module 4.1 - Les LLM)*
  - Schéma 17 : Distribution de probabilités du token suivant *(Module 4.1 - Les LLM)*
  - Schéma 18 : Les trois phases d'apprentissage d'un LLM *(Module 4.1 - Les LLM)*
  - Schéma 19 : Génération avec et sans KV Cache *(Module 4.2 - KV Cache)*
  - Schéma 20 : Les deux phases d'inférence : Prefill et Decode *(Module 4.2 - KV Cache)*
  - Schéma 21 : Régimes d'exécution : Compute-Bound vs Memory-Bound *(Module 4.3 - Serveurs d'Inférence)*
  - Schéma 22 : Batching statique vs Continuous Batching *(Module 4.3 - Serveurs d'Inférence)*
  - Schéma 23 : Protocole de distillation professeur-élève *(Module 4.4 - Distillation)*
  - Schéma 24 : Étiquettes dures vs étiquettes douces *(Module 4.4 - Distillation)*
  - Schéma 25 : Boucle autorégressive sans état interne *(Module 4.5 - Illusion de Conscience)*
  - Schéma 26 : Génération myope token par token *(Module 4.5 - Illusion de Conscience)*
- **Partie V : Systèmes Agentiques, Protocoles & Nouvelles Architectures**
  - Schéma 27 : Topologie d'un routeur dynamique de requêtes LLM *(Module 5.1 - Routeurs LLM)*
  - Schéma 28 : Boucle ReAct : Réflexion, Action, Exécution, Observation *(Module 5.2 - IA Agentique)*
  - Schéma 29 : Architecture du Harness et sas d'isolation *(Module 5.3 - Harness des LLM)*
  - Schéma 30 : Anatomie d'une prétendue « évasion » d'IA *(Module 5.3 - Harness des LLM)*
  - Schéma 31 : Remplacement du maillage M x N par le protocole MCP *(Module 5.4 - Protocole MCP)*
  - Schéma 32 : Saturation du contexte par les schémas d'outils MCP *(Module 5.4 - Protocole MCP)*
  - Schéma 33 : Projection de l'espace des données vers l'espace latent *(Module 5.5 - Modèles JEPA)*
  - Schéma 34 : Architecture de prédiction latente JEPA *(Module 5.5 - Modèles JEPA)*
  - Schéma 35 : LLM génératif token par token vs Modèle System One *(Module 5.6 - System One vs LLM)*
- **Partie VI : Physique du Silicium, Accélérateurs & Éco-conception**
  - Schéma 36 : Comparaison structurelle des architectures CPU et GPU *(Module 6.1 - CPU vs GPU)*
  - Schéma 37 : Goulot d'étranglement du bus PCIe entre RAM et VRAM *(Module 6.1 - CPU vs GPU)*
  - Schéma 38 : Bilan carbone sur l'ensemble du cycle de vie de l'IA *(Module 6.2 - Green AI)*

---

## Inventaire Analytique Détaillé des Schémas

### PARTIE I — FONDATIONS STATISTIQUES, PROBABILITÉS & COMPLEXITÉ D'APPRENTISSAGE

---

#### Schéma 1 : Pulvérisation de 3 points vs échec du XOR sur 4 points
- **Module associé :** Module 1.4 — Théorie VC (Complexité Statistique) (`vc_dimension`)
- **Légende :** *En dimension 2, une droite sépare toujours 3 points non colinéaires, mais échoue sur 4 points disposés en croix (problème XOR).*
- **Description technique :**
  Deux cadres juxtaposés. Le cadre de gauche présente 3 points non colinéaires dans le plan 2D reliés par une droite séparatrice oblique en pointillés verts, validant que les 8 configurations ($2^3$) sont séparables. Le cadre de droite présente 4 points alternés en croix (diagonales de même signe) avec une ligne horizontale rouge d'échec montrant l'impossibilité topologique d'isoler les deux classes.
- **Intérêt pédagogique :**
  Démystifie la notion abstraite de « pulvérisation » (shattering) au cœur de la théorie de Vapnik-Chervonenkis. Il démontre par la géométrie pourquoi la dimension VC d'une droite affine vaut exactement $d_{VC} = 3$ dans $\mathbb{R}^2$, et fournit l'intuition fondamentale de la rupture historique du XOR qui provoqua le premier hiver de l'IA.
- **Portée ingénierie / IAOps :**
  Rappelle que la capacité d'un modèle ne dépend pas du nombre de lignes de code mais de la flexibilité géométrique de sa frontière de décision face à la variance de l'échantillon.

---

### PARTIE II — FONDATIONS DU MACHINE LEARNING & DEEP LEARNING

---

#### Schéma 2 : Programmation classique vs Machine Learning
- **Module associé :** Module 2.1 — Introduction au Machine Learning (`intro`)
- **Légende :** *Comparaison entre le développement logiciel déterministe et l'apprentissage supervisé par données.*
- **Description technique :**
  Deux flux horizontaux superposés. En haut, le flux classique : `Données` + `Règles métier impératives (Code)` $\to$ `Résultats attendus`. En bas, le paradigme de l'apprentissage automatique : `Données brutes` + `Résultats observés (Labels)` $\to$ Boîte d'apprentissage $\to$ `Règles / Modèle prédictif`.
- **Intérêt pédagogique :**
  Installe le changement de paradigme fondamental pour tout débutant ou ingénieur habitué au génie logiciel traditionnel. Fait comprendre que le machine learning n'est pas une écriture algorithmique directe de solutions, mais l'induction empirique d'un opérateur de transformation.
- **Portée ingénierie / IAOps :**
  Met en lumière la dépendance totale du code produit envers la qualité de la donnée d'entraînement : si la donnée est biaisée ou bruitée, la règle déduite sera structurellement fausse.

---

#### Schéma 3 : Random Forest en parallèle vs Gradient Boosting en série
- **Module associé :** Module 2.2 — Machine Learning Classique (`ensemble_ga`)
- **Légende :** *Random Forest fait voter des arbres indépendants en parallèle ; le Gradient Boosting enchaîne des arbres qui corrigent les erreurs résiduelles.*
- **Description technique :**
  Visualisation à deux panneaux. À gauche (Bagging) : plusieurs arbres de décision indépendants branchés sur des sous-échantillons bootstrapés, convergeant vers un module de vote majoritaire / moyenne arithmétique. À droite (Boosting) : chaîne séquentielle où l'Arbre 1 produit une prédiction imparfaite, dont l'erreur résiduelle sert d'entrée d'entraînement à l'Arbre 2, qui affine à son tour l'Arbre 3.
- **Intérêt pédagogique :**
  Distingue clairement la réduction de variance (parallélisme stochastique des forêts) de la réduction de biais (apprentissage séquentiel par gradient des résidus). Permet de comprendre pourquoi le Boosting converge vers une précision supérieure sur données tabulaires au prix d'un risque accru de surapprentissage.
- **Portée ingénierie / IAOps :**
  Dicte le choix de dimensionnement matériel : un Random Forest s'entraîne de manière trivialement distribuée sur plusieurs cœurs CPU, alors que le Gradient Boosting exige une boucle séquentielle stricte.

---

#### Schéma 4 : Cycle d’évolution d’un algorithme génétique
- **Module associé :** Module 2.2 — Machine Learning Classique (`ensemble_ga`)
- **Légende :** *Les 4 étapes d’un algorithme génétique : génération initiale, sélection par fitness, croisement et mutation.*
- **Description technique :**
  Diagramme circulaire en boucle fermée reliant 4 stations ordonnées : 1. Population initiale (vecteurs candidats), 2. Évaluation de la fonction d'adaptation (Fitness), 3. Sélection et recombinaison (Crossover), 4. Mutation stochastique (bruit aléatoire contrôlé pour sortir des optima locaux).
- **Intérêt pédagogique :**
  Enseigne qu'il est possible d'optimiser des systèmes mathématiques complexes sans disposer de dérivée, de gradient continu ou de fonction différentiable. Donne l'intuition des algorithmes évolutionnaires pour la résolution de problèmes NP-complets.
- **Portée ingénierie / IAOps :**
  Très utile pour l'optimisation combinatoire en production : placement de conteneurs, routage réseau, allocation dynamique de charges thermiques sur supercalculateurs.

---

#### Schéma 5 : Les trois types de dérive de données (Data Shift)
- **Module associé :** Module 2.3 — Data Shift (Dérives de données) (`DataShift`)
- **Légende :** *Illustration schématique des trois visages de la dérive en production : entrées, cibles ou logique sous-jacente.*
- **Description technique :**
  Trois blocs d'analyse différentielle :
  1. *Covariate Shift* : la distribution des entrées $P(X)$ dérive mais la relation $P(Y|X)$ reste vraie.
  2. *Prior Shift* : la distribution marginale des sorties $P(Y)$ change brusquement (ex. pic de fraude bancaire).
  3. *Concept Drift* : la relation sous-jacente $P(Y|X)$ elle-même mute, inversant le comportement réel des utilisateurs.
- **Intérêt pédagogique :**
  Fournit une taxonomie claire et rigoureuse d'un problème qui paralyse la majorité des modèles en production. Évite l'erreur classique de tout réentraîner à l'aveugle sans identifier la composante probabiliste qui s'est altérée.
- **Portée ingénierie / IAOps :**
  Directement relié au calcul de l'indice de stabilité de population (PSI) et à la mise en place d'alerting automatisé sur les flux de télémétrie en temps réel.

---

#### Schéma 6 : Architecture mathématique d'un Perceptron
- **Module associé :** Module 2.4 — Le Perceptron (`perceptron`)
- **Légende :** *Schéma synoptique du Perceptron : somme pondérée des entrées, addition du biais, et passage par le seuil d'activation.*
- **Description technique :**
  Schéma de flux vectoriel de gauche à droite : entrées numériques $(x_1, x_2, \dots, x_n)$, coefficients de pondération synaptique $(w_1, w_2, \dots, w_n)$, additionneur central calculant la combinaison affine $\sum w_i x_i + b$, et fonction d'activation à seuil (Heaviside) délivrant la décision binaire $y \in \{-1, +1\}$.
- **Intérêt pédagogique :**
  Dégonfle le mythe biomimétique du « neurone magique ». Montre au lecteur qu'un neurone artificiel n'est rien d'autre qu'une projection scalaire suivie d'un seuillage spatial. Prépare l'introduction des fonctions continues différentiables.
- **Portée ingénierie / IAOps :**
  Permet de visualiser directement pourquoi un tel modèle échoue si les données ne sont pas séparables par un plan affine dans l'espace des caractéristiques.

---

#### Schéma 7 : Architecture en couches d'un Multi-Layer Perceptron (MLP)
- **Module associé :** Module 2.5 — Multi-Layer Perceptron (Deep Learning) (`mlp`)
- **Légende :** *Réseau de neurones profond (Deep MLP) : passage d'un vecteur d'entrée à travers des représentations cachées successives.*
- **Description technique :**
  Réseau complet à 4 colonnes interconnectées par un maillage dense de liens synaptiques : Couche d'entrée (Input Vector $X$), première couche cachée avec activations non-linéaires ReLU, deuxième couche cachée extrayant des motifs d'ordre supérieur, et couche de sortie (Logits de prédiction).
- **Intérêt pédagogique :**
  Visualise le mécanisme de déformation d'espace. Explique comment l'introduction de non-linéarités entre les couches permet de plier l'espace géométrique pour rendre linéairement séparables des classes inextricables en entrée (Théorème d'Approximation Universelle).
- **Portée ingénierie / IAOps :**
  Fait comprendre la notion de profondeur et de représentation hiérarchique, tout en posant la question du passage à l'échelle du calcul matriciel (multiplications de matrices denses).

---

#### Schéma 8 : Boucle d’entraînement et répartition de la mémoire VRAM
- **Module associé :** Module 2.6 — L’entraînement d’un modèle IA (`training`)
- **Légende :** *Les 4 étapes d’un pas d’entraînement et l’explosion de la mémoire VRAM nécessaire.*
- **Description technique :**
  En haut, boucle circulaire d'optimisation en 4 étapes : 1. Forward Pass (inférence), 2. Calcul de la fonction de perte (Loss), 3. Backward Pass (calcul des gradients par règle de chaîne), 4. Optimizer Step (mise à jour des poids via AdamW). En bas, jauge horizontale détaillant la facture mémoire VRAM : Poids (1x), Gradients (1x), États d'optimiseur AdamW (2x à 3x), et Tenseurs d'activation intermédiaires (variable selon batch).
- **Intérêt pédagogique :**
  Détruit l'illusion selon laquelle la taille d'un modèle en mémoire correspond simplement à ses poids. Montre concrètement pourquoi l'entraînement exige entre 4 et 6 fois plus de mémoire vive que l'inférence.
- **Portée ingénierie / IAOps :**
  Indispensable pour tout calcul de dimensionnement de cluster d'entraînement GPU, expliquant la nécessité du checkpointing d'activation et du calcul en précision mixte (FP16 / BF16).

---

#### Schéma 9 : Principe de LoRA et adaptateurs de bas rang
- **Module associé :** Module 2.6 — L’entraînement d’un modèle IA (`training`)
- **Légende :** *Avec LoRA / QLoRA, seuls les petits adaptateurs orange sont modifiés : plus besoin de stocker les gradients ni l’optimiseur du modèle géant.*
- **Description technique :**
  Diagramme montrant la matrice de poids principale $W_0$ de dimension $d \times k$ verrouillée par un cadenas de gel de gradient. En parallèle, un embranchement calculatoire fait transiter l'entrée $x$ par une matrice de compression descendante $A$ ($k \times r$) puis par une matrice de décompression ascendante $B$ ($r \times d$), le résultat étant sommé avec la sortie de base avec un rang $r \ll d$.
- **Intérêt pédagogique :**
  Donne une intuition spatiale immédiate de la factorisation matricielle de bas rang. Démontre comment adapter un modèle de dizaines de milliards de paramètres en n'ajustant qu'une fraction infime de poids ($< 0.1\%$).
- **Portée ingénierie / IAOps :**
  Fondement des architectures de déploiement multi-tenant en production : un seul modèle de base partagé en VRAM peut servir des centaines d'adaptateurs LoRA interchangeables à la volée.

---

### PARTIE III — REPRÉSENTATIONS VECTORIELLES & ARCHITECTURES SÉQUENTIELLES

---

#### Schéma 10 : Réseau récurrent déplié dans le temps (RNN)
- **Module associé :** Module 3.1 — RNN et LSTM (`rnn`)
- **Légende :** *Un RNN déplié : le même bloc est réutilisé à chaque mot, et l’état h circule de gauche à droite.*
- **Description technique :**
  Représentation d'une cellule récurrente dupliquée le long d'une ligne d'étapes temporelles successives $(t-1, t, t+1)$. L'état caché $h_t$ se propage horizontalement de bloc en bloc, combiné à chaque pas avec le token textuel entrant $x_t$ pour produire la prédiction locale $y_t$.
- **Intérêt pédagogique :**
  Clarifie la nature de la mémoire dans les modèles pré-Transformers. Fait toucher du doigt le goulot d'étranglement séquentiel : l'étape $t$ ne peut pas débuter avant que l'étape $t-1$ soit achevée, interdisant toute parallélisation massive sur GPU.
- **Portée ingénierie / IAOps :**
  Explique la cause première du problème d'évanouissement et d'explosion du gradient (vanishing/exploding gradient) : les multiplications répétées par la même matrice de transition finissent par écraser ou faire diverger le signal sur les séquences longues.

---

#### Schéma 11 : Cellule LSTM et ses trois portes de contrôle
- **Module associé :** Module 3.1 — RNN et LSTM (`rnn`)
- **Légende :** *Le LSTM : une mémoire longue (en haut) protégée par trois portes.*
- **Description technique :**
  Coupe structurelle d'une unité LSTM. Une ligne horizontale supérieure fait office d'autoroute d'état cellulaire ($C_t$), modifiée uniquement par des additions et des masquages régulés par trois portes logiques à base de sigmoïdes et de tangentes hyperboliques : la porte d'oubli ($f_t$), la porte d'entrée ($i_t$ et $\tilde{C}_t$), et la porte de sortie ($o_t$).
- **Intérêt pédagogique :**
  Fait comprendre l'innovation technique majeure d'Hochreiter et Schmidhuber : en créant un canal additif direct sans multiplication matricielle compressive, l'état cellulaire permet au gradient de remonter des centaines d'étapes sans s'évanouir.
- **Portée ingénierie / IAOps :**
  Modèle de référence historique pour le traitement de séries temporelles, de signaux d'alertes infrastructure et de télémétrie de serveurs avant la généralisation des Transformers.

---

#### Schéma 12 : Carte géométrique 2D des proximités sémantiques (Embeddings)
- **Module associé :** Module 3.2 — Embeddings (Espaces vectoriels) (`embedding`)
- **Légende :** *Carte du sens (réduite à 2 dimensions) : les mots proches par le sens sont proches dans l’espace.*
- **Description technique :**
  Plan cartésien représentant des points sémantiques regroupés par îlots thématiques : famille du vivant (chat, chien, félin), famille technique (serveur, RAM, CPU), famille géographique (Paris, France, Tokyo, Japon). Des vecteurs orientés illustrent les relations de translation sémantique constante ($\vec{v}_{\text{France}} \to \vec{v}_{\text{Paris}}$ identique à $\vec{v}_{\text{Japon}} \to \vec{v}_{\text{Tokyo}}$).
- **Intérêt pédagogique :**
  Ancre le concept d'espace vectoriel continu. Montre que la signification des mots peut être quantifiée par des distances euclidiennes et des similarités cosinus.
- **Portée ingénierie / IAOps :**
  Fondement mathématique absolu des moteurs de recherche sémantique, des bases de données vectorielles (Qdrant, Milvus, pgvector) et des architectures RAG (Retrieval-Augmented Generation).

---

#### Schéma 13 : Table d'indexation matricielle (Embedding Lookup)
- **Module associé :** Module 3.2 — Embeddings (Espaces vectoriels) (`embedding`)
- **Légende :** *Le mot est converti en identifiant, puis en vecteur par simple lecture dans la table.*
- **Description technique :**
  Diagramme de conversion en 3 phases discrètes : 1. Mot texte brut (« serveur »), 2. Tokenizer convertissant la chaîne en index entier unique (ID : 4812), 3. Matrice de poids géante $E \in \mathbb{R}^{V \times D}$ où l'ID 4812 sélectionne directement la ligne 4812 sans aucun calcul, renvoyant le vecteur dense de dimension $D$.
- **Intérêt pédagogique :**
  Démystifie la première couche de tout modèle de Deep Learning textuel. Montre que l'entrée n'est pas un calcul arithmétique complexe mais un simple tableau de correspondance (Lookup Table) rapide et statique.
- **Portée ingénierie / IAOps :**
  Explique pourquoi la taille du vocabulaire influe directement sur le volume mémoire initial du modèle : un vocabulaire de 128k tokens en dimension 4096 représente immédiatement 1 Go de VRAM rien que pour la table d'entrée.

---

#### Schéma 14 : Mécanisme d’attention contextuelle (Self-Attention)
- **Module associé :** Module 3.3 — Architecture Transformer (`transformer`)
- **Légende :** *L’attention : chaque mot pondère l’importance de tous les autres mots de la phrase.*
- **Description technique :**
  Phrase d'exemple : *« La souris a mangé la pomme car elle avait faim »*. Le mot *« elle »* émet des lignes d'attention pondérées vers tous les autres mots. La ligne reliant *« elle »* à *« souris »* est épaisse et marquée d'un score massif (0.85), tandis que les lignes vers *« pomme »* ou *« mange »* sont fines et quasi-transparentes.
- **Intérêt pédagogique :**
  Explique visuellement comment un Transformer résout l'ambiguïté sémantique et les dépendances grammaticales croisées sans récurrence temporelle. Démontre la mécanique du produit scalaire normalisé entre requêtes ($Q$) et clés ($K$).
- **Portée ingénierie / IAOps :**
  Fait comprendre la complexité quadratique $\mathcal{O}(N^2)$ : si la phrase compte $N$ tokens, chaque token doit évaluer ses affinités avec les $N-1$ autres, expliquant l'explosion calculatoire sur les contextes longs.

---

#### Schéma 15 : Architecture interne d’un bloc Transformer
- **Module associé :** Module 3.3 — Architecture Transformer (`transformer`)
- **Légende :** *Un bloc Transformer, empilé N fois (de 12 à plus de 100 selon les modèles).*
- **Description technique :**
  Schéma d'ingénierie modulaire empilant de bas en haut : 1. Entrée avec encodage positionnel (Positional Encoding), 2. Bloc Multi-Head Attention entouré d'une dérivation résiduelle (Add & LayerNorm), 3. Bloc Feed-Forward à deux couches denses (MLP d'expansion et projection), lui aussi entouré d'une dérivation résiduelle (Add & LayerNorm), produisant la sortie de couche.
- **Intérêt pédagogique :**
  Fournit le plan d'architecte canonique du papier fondateur *« Attention Is All You Need »*. Met l'accent sur les connexions résiduelles sans lesquelles il serait impossible d'entraîner des réseaux de plus de 100 couches sans blocage du gradient.
- **Portée ingénierie / IAOps :**
  Squelette de référence pour identifier où s'exécutent les FLOPS : environ un tiers du calcul réside dans l'attention, et deux tiers dans les couches denses Feed-Forward.

---

### PARTIE IV — GRANDS MODÈLES DE LANGAGE (LLM) & INGÉNIERIE D'INFÉRENCE

---

#### Schéma 16 : Pipeline complet d'un LLM, du texte aux probabilités
- **Module associé :** Module 4.1 — Les LLM (`llm`)
- **Légende :** *Du texte brut à la prédiction du token suivant.*
- **Description technique :**
  Chaîne d'ingénierie de bout en bout : Texte brut $\to$ Module de tokenisation (BPE/SentencePiece) $\to$ Embedding vectoriel $\to$ Pile de $N$ blocs Transformers $\to$ Tête de dé-projection finale (Unembedding) $\to$ Normalisation Softmax $\to$ Vecteur de probabilités sur l'intégralité du vocabulaire.
- **Intérêt pédagogique :**
  Permet à l'étudiant d'assembler mentalement toutes les pièces du puzzle vues dans les chapitres précédents au sein d'une chaîne causale unifiée.
- **Portée ingénierie / IAOps :**
  Vision indispensable pour comprendre à quel endroit s'insèrent les optimisations logicielles (fusion de noyaux CUDA, FlashAttention, quantization de l'unembedding).

---

#### Schéma 17 : Distribution de probabilités du mot suivant
- **Module associé :** Module 4.1 — Les LLM (`llm`)
- **Légende :** *Après « Le chat », le modèle attribue une probabilité à chaque suite possible.*
- **Description technique :**
  Histogramme à barres horizontales affichant les scores issus du Softmax après la phrase d'amorce *« Le chat »* : *« dort »* ($42\%$), *« mange »* ($28\%$), *« saute »* ($15\%$), *« miaule »* ($10\%$), et une longue traîne de tokens improbables comme *« avion »* ($0.001\%$).
- **Intérêt pédagogique :**
  Rappelle la nature strictement probabiliste des modèles génératifs. Explique le rôle des hyperparamètres de décodage comme la température, le Top-P ou le Top-K pour façonner l'échantillonnage final.
- **Portée ingénierie / IAOps :**
  Éclaire la question de la reproductibilité : un modèle d'IA n'est déterministe que si la température est fixée à zéro (greedy decoding) et que l'ordonnancement des threads GPU est strictement verrouillé.

---

#### Schéma 18 : Les trois phases d'apprentissage d'un LLM
- **Module associé :** Module 4.1 — Les LLM (`llm`)
- **Légende :** *Trois étapes : apprendre la langue, apprendre à obéir, apprendre à plaire.*
- **Description technique :**
  Frise chronologique en 3 blocs progressifs :
  1. *Pré-entraînement non supervisé* : absorption de trillions de tokens pour modéliser la grammaire et les connaissances générales (consomme $98\%$ du budget de calcul).
  2. *SFT (Supervised Fine-Tuning)* : paires questions/réponses de haute qualité pour apprendre la posture d'assistant conversationnel.
  3. *Alignement (RLHF / DPO)* : optimisation par retour d'expérience humain pour éliminer les dérives nocives et affiner la concision.
- **Intérêt pédagogique :**
  Démêle la confusion courante entre « savoir » et « obéir ». Explique pourquoi un modèle brut (base model) ne répond pas aux questions mais se contente de continuer le texte, nécessitant la phase d'alignement.
- **Portée ingénierie / IAOps :**
  Fondamental pour la stratégie d'entreprise : montre pourquoi il est presque toujours inutile de pré-entraîner un modèle depuis zéro, l'adaptation métier se faisant par RAG, LoRA ou SFT ciblé.

---

#### Schéma 19 : Comparaison de la génération avec et sans KV Cache
- **Module associé :** Module 4.2 — Le KV Cache (`kv_cache`)
- **Légende :** *Sans cache, on recalcule tout à chaque pas. Avec le KV Cache, on garde les K et V passés en VRAM.*
- **Description technique :**
  Deux frises comparatives. En haut (Sans cache) : pour générer le token 5, le modèle ré-exécute les calculs sur les tokens 1, 2, 3 et 4, gaspillant un volume massif de calcul redondant. En bas (Avec KV Cache) : les tenseurs $K$ et $V$ des tokens 1 à 4 sont conservés en mémoire VRAM, le modèle ne calcule que les projections du token 5 et vient interroger le cache en temps constant.
- **Intérêt pédagogique :**
  Rend immédiatement intelligible l'arbitrage fondamental entre mémoire et calcul. Montre comment on ramène la complexité d'une étape de décodage de quadratique à constante au détriment de l'occupation mémoire vive.
- **Portée ingénierie / IAOps :**
  Point névralgique de la saturation VRAM en production : un contexte long (128k tokens) avec plusieurs utilisateurs concurrents consomme rapidement plus de mémoire pour son KV Cache que pour les poids du modèle lui-même.

---

#### Schéma 20 : Les deux phases de l’inférence : Prefill et Decode
- **Module associé :** Module 4.2 — Le KV Cache (`kv_cache`)
- **Légende :** *Prefill calcule tout le prompt d’un coup ; Decode génère ensuite token par token.*
- **Description technique :**
  Deux sections contrastées. Section 1 : *Prefill* (calcul en bloc parallèle de tous les tokens de la consigne d'entrée, saturation de la puissance de calcul, très court). Section 2 : *Decode* (série de petits pas séquentiels émettant un seul token à la fois, rythmés par la lecture continue de la mémoire VRAM).
- **Intérêt pédagogique :**
  Fait comprendre que le temps de traitement d'une requête se divise en deux réalités physiques totalement différentes : le temps jusqu'au premier token (TTFT - Time To First Token) et le débit de génération (TPS - Tokens Per Second).
- **Portée ingénierie / IAOps :**
  Conditionne le dimensionnement des SLAs (Service Level Agreements) et l'architecture des moteurs de serving (désynchronisation possible des workers de prefill et de décodage).

---

#### Schéma 21 : Régimes d'exécution : Compute-Bound vs Memory-Bound
- **Module associé :** Module 4.3 — Inférence, Serveurs et Continuous Batching (`inference_servers`)
- **Légende :** *La phase Prefill sature les unités de calcul du GPU ; la phase Decode sature la bande passante de la mémoire VRAM.*
- **Description technique :**
  Représentation graphique du modèle Roofline. La phase Prefill se situe sur le plateau supérieur des opérations matricielles denses (saturation des TFLOPS des Tensor Cores). La phase Decode est bloquée sur la pente ascendante (Memory-Bound) : le GPU passe son temps à attendre l'acheminement des octets depuis les puces mémoire HBM vers la SRAM locale des processeurs de flux.
- **Intérêt pédagogique :**
  Enseigne la physique des systèmes d'inférence. Démontre pourquoi accélérer les cœurs de calcul n'améliore en rien la vitesse de décodage d'un utilisateur isolé si la bande passante mémoire reste fixe.
- **Portée ingénierie / IAOps :**
  Justifie le choix des processeurs haut de gamme équipés de mémoires HBM3e à plus de 3 To/s plutôt que de cartes graphiques grand public limitées par des bus mémoire étroits.

---

#### Schéma 22 : Batching statique vs Continuous Batching (vLLM)
- **Module associé :** Module 4.3 — Inférence, Serveurs et Continuous Batching (`inference_servers`)
- **Légende :** *En Continuous Batching, dès qu’une requête émet son token de fin (EOS), sa place est libérée à la milliseconde suivante pour un nouvel arrivant.*
- **Description technique :**
  Chronogramme comparatif de 4 requêtes concurrentes de longueurs hétérogènes. En batching statique, les requêtes courtes terminées attendent passivement dans le GPU que la requête la plus longue s'achève, laissant des bulles d'inactivité massives. En Continuous Batching (au niveau de l'itération), dès qu'une requête s'interrompt, un nouvel utilisateur est inséré dans le même pas de calcul sans latence.
- **Intérêt pédagogique :**
  Visualise le saut d'efficience majeur apporté par les moteurs d'inférence modernes (vLLM, TGI, TensorRT-LLM). Explique comment l'ordonnancement dynamique supprime les temps morts du GPU.
- **Portée ingénierie / IAOps :**
  Multiplie par 3 à 5 le débit réel de requêtes traitées par kilowatt-heure consommé dans un datacenter.

---

#### Schéma 23 : Schéma de la distillation professeur-élève
- **Module associé :** Module 4.4 — Distillation (`distillation`)
- **Légende :** *Le professeur génère des réponses ; l’élève s’entraîne à reproduire ses sorties.*
- **Description technique :**
  Flux de transfert de compétences entre un grand réseau « Enseignant » (175 milliards de paramètres, lourd et lent) et un réseau « Étudiant » (7 milliards de paramètres, compact et véloce). Le grand modèle fournit à la fois ses réponses textuelles et ses distributions de probabilités complètes pour guider l'entraînement de l'élève.
- **Intérêt pédagogique :**
  Explique comment les modèles de petite taille contemporains rivalisent avec les géants d'il y a trois ans. Fait comprendre la notion de compression de connaissances et de transfert d'expertise.
- **Portée ingénierie / IAOps :**
  Permet de concevoir des architectures d'entreprise économiques : utiliser un modèle géant dans le cloud pour distiller des petits modèles hébergés localement sur des serveurs économiques.

---

#### Schéma 24 : Comparaison entre étiquettes dures et étiquettes douces
- **Module associé :** Module 4.4 — Distillation (`distillation`)
- **Légende :** *Les étiquettes douces transmettent les ressemblances entre classes.*
- **Description technique :**
  Tableau comparatif de distribution. À gauche, l'étiquette dure (Hard Label binaire) : *Chat = 100%, Chien = 0%, Renard = 0%*. À droite, l'étiquette douce issue du professeur (Soft Label) : *Chat = 70%, Chien = 25%, Renard = 5%*.
- **Intérêt pédagogique :**
  Rend limpide le concept de « connaissance sombre » (dark knowledge) formalisé par Geoffrey Hinton : l'étiquette douce enseigne à l'élève la structure sous-jacente du monde (un chat partage des attributs morphologiques avec un chien mais aucun avec une table).
- **Portée ingénierie / IAOps :**
  Démontre pourquoi l'entraînement par distillation converge beaucoup plus rapidement et avec moins d'exemples que l'apprentissage supervisé standard.

---

#### Schéma 25 : Boucle auto-régressive de génération de texte
- **Module associé :** Module 4.5 — Illusion de conscience (LLM) (`illusion_conscience`)
- **Légende :** *Il n’y a aucun « penseur » dans la boucle : un modèle figé transforme un texte en un token, puis recommence.*
- **Description technique :**
  Circuit en boucle fermée montrant un contexte textuel statique (« Bonjour, je suis ») injecté dans un réseau aux poids figés en lecture seule. Le réseau produit un unique token (« un »), qui est concaténé au contexte initial pour reformer une nouvelle entrée (« Bonjour, je suis un »), le cycle recommençant de manière mécanique.
- **Intérêt pédagogique :**
  Démonstration technique contre l'anthropomorphisme. Prouve qu'il n'existe aucune entité consciente ou pensante résidant dans la machine : le système est un transformateur d'états déterministe qui s'alimente de ses propres sorties antérieures.
- **Portée ingénierie / IAOps :**
  Rappelle à l'ingénieur que la gestion des hallucinations nécessite des contraintes structurelles externes (vérificateurs de types, assertions) et non des supplications dans le prompt.

---

#### Schéma 26 : Génération token par token
- **Module associé :** Module 4.5 — Illusion de conscience (LLM) (`illusion_conscience`)
- **Légende :** *Une réponse est assemblée mot après mot. Rien n’est « décidé » à l’avance.*
- **Description technique :**
  Décomposition séquentielle pas à pas de la phrase *« Je suis un modèle de langage »*. Les tokens sont empilés les uns après les autres sans qu'aucun plan d'ensemble n'ait été pré-calculé avant l'émission du premier mot.
- **Intérêt pédagogique :**
  Fait comprendre pourquoi les LLM s'enferment parfois dans des impasses logiques : une fois un token malencontreux émis, le modèle est forcé de conditionner la suite sur cette erreur pour préserver la cohérence statistique locale.
- **Portée ingénierie / IAOps :**
  Justifie l'utilisation de mécanismes de retour en arrière (backtracking), de recherche arborescente (Tree of Thoughts) ou de réécriture supervisée dans les pipelines critiques.

---

### PARTIE V — SYSTÈMES AGENTIQUES, PROTOCOLES & NOUVELLES ARCHITECTURES

---

#### Schéma 27 : Topologie d'un routeur dynamique de LLM
- **Module associé :** Module 5.1 — Les routeurs de LLM (`llm_router`)
- **Légende :** *Le routeur examine la requête et choisit dynamiquement quel modèle appeler.*
- **Description technique :**
  Arbre de décision où la requête entrante traverse un classifieur rapide (analyse d'intention, de criticité et de complexité syntaxique) pour être dispatchée vers l'un des trois récepteurs : 1. Modèle compact ultra-rapide (tâches simples, résumés courts), 2. Modèle spécialisé (génération de code, requêtes SQL), 3. Grand modèle de raisonnement lourd (démonstrations mathématiques, arbitrages d'architecture).
- **Intérêt pédagogique :**
  Met fin au dogme du « modèle unique universel ». Enseigne l'ingénierie des coûts et de l'efficience énergétique au niveau du cluster d'entreprise.
- **Portée ingénierie / IAOps :**
  Composant central des passerelles d'inférence (LLM Gateways), permettant de réduire la facture cloud de 60% à 80% tout en abaissant la latence médiane perçue par les utilisateurs.

---

#### Schéma 28 : Boucle ReAct d’un agent IA
- **Module associé :** Module 5.2 — L’IA agentique et les outils (`agentic`)
- **Légende :** *La boucle agentique : l’observation du résultat réel corrige la suite du raisonnement.*
- **Description technique :**
  Cycle itératif en 4 phases :
  1. *Thought (Réflexion)* : le modèle analyse l'état courant et déduit la sous-tâche à réaliser.
  2. *Action (Appel d'outil)* : émission d'une commande structurée en JSON (ex. `run_sql_query`).
  3. *Execution (Environnement)* : le système informatique exécute l'action dans le monde réel.
  4. *Observation (Résultat)* : la sortie brute (stdout ou erreur) est renvoyée au modèle pour réajuster sa planification.
- **Intérêt pédagogique :**
  Illustre la transition entre un générateur passif de prose et un système autonome interactif capable de corriger ses propres erreurs au contact du réel.
- **Portée ingénierie / IAOps :**
  Montre le risque inhérent d'emballement : sans condition d'arrêt stricte (max iterations) ou timeout d'exécution, la boucle peut boucler indéfiniment en cas d'erreur de parsing.

---

#### Schéma 29 : Architecture du Harness et pont d'exécution
- **Module associé :** Module 5.3 — Le « Harness » des LLM (Exécution & Sécurité) (`llm_harness`)
- **Légende :** *Le Harness comme intermédiaire mécanique d'exécution et de sécurité entre l'utilisateur, le LLM et la machine.*
- **Description technique :**
  Schéma d'infrastructure en 3 couches étanches : Couche Utilisateur $\to$ Couche Harness (sas logiciel déterministe comprenant le formateur de prompt, le moteur de politiques de sécurité, le validateur de schéma, le superviseur de bac à sable et le mécanisme de validation humaine HITL) $\to$ Couche Machine / Système d'exploitation.
- **Intérêt pédagogique :**
  Démontre que la sécurité d'une IA ne repose jamais sur la bonne volonté du modèle ou des injonctions de prompt engineering (« sois gentil, ne supprime rien »), mais sur une barrière logicielle classique hermétique.
- **Portée ingénierie / IAOps :**
  Cahier des charges architectural obligatoire pour tout déploiement d'agents autonomes en environnement bancaire ou industriel sensible.

---

#### Schéma 30 : Anatomie d'une prétendue « évasion » d'IA : Mythe vs Réalité
- **Module associé :** Module 5.3 — Le « Harness » des LLM (Exécution & Sécurité) (`llm_harness`)
- **Légende :** *Mythe médiatique de « l'évasion » vs réalité technique d'infrastructure.*
- **Description technique :**
  Confrontation visuelle en deux colonnes. À gauche, la fable médiatique sensationnaliste : une IA acquiert une volonté propre et brise ses chaînes logicielles. À droite, le compte-rendu d'incident d'ingénierie réelle : un script mal configuré a branché la sortie du modèle sur un terminal root non isolé avec accès réseau ouvert, le modèle n'ayant fait qu'exécuter un pattern CTF présent dans son jeu d'entraînement.
- **Intérêt pédagogique :**
  Éduque l'esprit critique de l'ingénieur. Rappelle que toute faille de sécurité impliquant une IA est une défaillance de configuration logicielle humaine et non une manifestation d'autonomie cybernétique mystique.
- **Portée ingénierie / IAOps :**
  Oriente les audits de sécurité vers la conteneurisation stricte (gVisor, microVM Firecracker, lecture seule du système de fichiers) plutôt que vers des débats philosophiques.

---

#### Schéma 31 : Le protocole MCP remplace le maillage M x N par un standard universel
- **Module associé :** Module 5.4 — Le protocole MCP (et ses limites) (`mcp`)
- **Légende :** *Au lieu de réécrire chaque connecteur pour chaque application, tout passe par le standard MCP.*
- **Description technique :**
  À gauche, le schéma spaghetti : chaque interface cliente (IDE, Chat, Agent) développe un connecteur propriétaire pour chaque service externe (Git, SQL, Slack, JIRA), conduisant à $M \times N$ intégrations fragiles. À droite, l'architecture normalisée MCP : les clients et les serveurs s'interfacent via un bus unique de communication normalisé en JSON-RPC ($M + N$ connecteurs).
- **Intérêt pédagogique :**
  Fait l'analogie avec l'introduction du standard USB pour le matériel ou du Language Server Protocol (LSP) pour le développement logiciel. Explique la dynamique de standardisation en cours dans l'écosystème IA.
- **Portée ingénierie / IAOps :**
  Accélère l'intégration industrielle des outils tout en posant la question de la gouvernance et de la mise à jour des versions de protocole.

---

#### Schéma 32 : Saturation de la fenêtre de contexte par les définitions d’outils MCP
- **Module associé :** Module 5.4 — Le protocole MCP (et ses limites) (`mcp`)
- **Légende :** *Chaque serveur MCP injecte les schémas complets de tous ses outils dans le contexte du modèle.*
- **Description technique :**
  Jauge de mémoire de contexte de 128k tokens divisée en blocs d'occupation. Une part écrasante (près de 40 000 tokens) est absorbée par les définitions JSON Schema verbeuses de 80 outils déclarés par 5 serveurs MCP connectés, réduisant la place disponible pour l'historique conversationnel et diluant l'attention du modèle.
- **Intérêt pédagogique :**
  Met en garde contre l'illusion de la gratuité architecturale. Fait comprendre qu'offrir des dizaines d'outils à un modèle dégrade sa vitesse, augmente ses coûts et provoque des hallucinations par surcharge cognitive.
- **Portée ingénierie / IAOps :**
  Justifie la mise en œuvre de serveurs MCP dynamiques et de mécanismes de recherche vectorielle d'outils (Tool RAG) pour n'injecter dans le prompt que les 2 ou 3 outils pertinents à chaque pas.

---

#### Schéma 33 : Passage de l’espace des données brutes à l’espace latent abstrait
- **Module associé :** Module 5.5 — Modèles JEPA et espace latent (`jepa_latent`)
- **Légende :** *L’encodeur élimine les détails chaotiques pour ne garder que la structure abstraite dans l’espace latent.*
- **Description technique :**
  Entonnoir d'abstraction. À gauche, l'espace physique brut des pixels et des bruits de capteur (chaque feuille d'arbre qui tremble, les reflets sur une flaque d'eau, le bruit ISO de la caméra), trop chaotique pour être prédit avec précision. Au centre, l'encodeur invariant. À droite, l'espace latent abstrait ne conservant que les composantes utiles à l'action (vitesse et trajectoire d'un véhicule, présence d'un piéton).
- **Intérêt pédagogique :**
  Explique la thèse de Yann LeCun sur les limites des modèles génératifs purs. Démontre pourquoi il est absurde de prédire chaque pixel pour comprendre la dynamique physique du monde.
- **Portée ingénierie / IAOps :**
  Clé de voûte des architectures de vision pour véhicules autonomes et robotique industrielle, où la prédiction doit être robuste aux variations atmosphériques et d'éclairage.

---

#### Schéma 34 : Architecture JEPA : prédiction dans l’espace latent
- **Module associé :** Module 5.5 — Modèles JEPA et espace latent (`jepa_latent`)
- **Légende :** *Architecture JEPA : l’encodeur extrait l’essentiel, et le prédicteur opère uniquement entre états latents.*
- **Description technique :**
  Diagramme structurel complet : le contexte $x$ passe dans l'encodeur de contexte pour donner l'état latent $s_x$. La cible future $y$ passe dans l'encodeur cible pour donner l'état latent $s_y$. Un prédicteur calcule $\hat{s}_y$ à partir de $s_x$ et d'une variable de conditionnement $z$. La fonction de coût mesure l'écart entre $s_y$ et $\hat{s}_y$ directement dans l'espace latent, sans jamais générer de données physiques $y$.
- **Intérêt pédagogique :**
  Formalise l'alternative majeure aux modèles autorégressifs. Montre comment entraîner un système d'apprentissage auto-supervisé capable de planifier sans s'épuiser à reconstruire des images ou du texte.
- **Portée ingénierie / IAOps :**
  Ouvre des perspectives d'inférence ultra-frugale en temps réel sur des processeurs embarqués à faible consommation.

---

#### Schéma 35 : LLM génératif token par token vs Modèle System One (type Jev)
- **Module associé :** Module 5.6 — Modèles System One (type Jev) vs LLM (`system_one_jev`)
- **Légende :** *Un LLM classique rédige laborieusement du texte JSON caractère par caractère ; un modèle System One (Jev) évalue directement des primitives typées en une seule passe.*
- **Description technique :**
  Comparaison en deux voies. En haut, le flux LLM : prompt texte $\to$ boucle de décodage caractère par caractère $\to$ syntaxe JSON fragile $\to$ risque élevé de corruption syntaxique et latence importante. En bas, le flux System One (Jev) : schéma formel typé $\to$ évaluation parallèle de classification en une seule passe $\to$ réponse typée instantanée, déterministe et garantie sans crash de parsing.
- **Intérêt pédagogique :**
  Oppose la lenteur délibérative et fragile de la génération de texte libre à l'efficacité brute des classifieurs d'action spécialisés. Permet de faire le lien avec la distinction psychologique de Daniel Kahneman entre Système 1 (rapide, automatique) et Système 2 (lent, analytique).
- **Portée ingénierie / IAOps :**
  Idéal pour les briques de filtrage d'intention et de sélection d'outils où une latence de 5 millisecondes et un typage strict sont exigés en tête de pipeline.

---

### PARTIE VI — PHYSIQUE DU SILICIUM, ACCÉLÉRATEURS & ÉCO-CONCEPTION

---

#### Schéma 36 : Comparaison de l’architecture CPU et GPU
- **Module associé :** Module 6.1 — CPU vs GPU (`cpu_gpu`)
- **Légende :** *Peu de cœurs puissants (CPU) contre beaucoup de cœurs simples (GPU).*
- **Description technique :**
  Deux puces de silicium stylisées côte à côte. Le CPU est dominé par 4 à 8 cœurs volumineux accompagnés d'immenses mémoires caches L2/L3 et de circuits sophistiqués d'exécution spéculative et de prédiction de branchement. Le GPU est une mosaïque dense de centaines de minuscules unités de calcul arithmétique (ALU / Tensor Cores) organisées en multiprocesseurs de flux pour exécuter la même instruction en parallèle (SIMT).
- **Intérêt pédagogique :**
  Donne le modèle mental physique du matériel. Explique pourquoi le CPU est imbattable sur le code logique ramifié complexe (if/else séquentiel) et pourquoi le GPU règne sans partage sur les calculs matriciels du Deep Learning.
- **Portée ingénierie / IAOps :**
  Empêche les erreurs de conception logicielle consistant à vouloir tout porter sur GPU, y compris le pré-traitement de données qui est souvent ralenti par les structures non vectorisables.

---

#### Schéma 37 : Goulot d’étranglement PCIe entre la RAM et la VRAM
- **Module associé :** Module 6.1 — CPU vs GPU (`cpu_gpu`)
- **Légende :** *Le transfert RAM vers VRAM est le goulot d’étranglement.*
- **Description technique :**
  Schéma de flux mettant en évidence un étranglement physique : la mémoire vive système (RAM DDR5 à 80 Go/s) et la mémoire vidéo du GPU (VRAM HBM à plus de 3000 Go/s) sont séparées par la passerelle étroite du bus PCIe Gen 5 plafonnant à 32 ou 64 Go/s.
- **Intérêt pédagogique :**
  Rend visible le mur du transfert de données. Démontre qu'une puce GPU ultra-rapide passe la majorité de son temps à attendre si les tenseurs doivent être copiés en continu depuis la mémoire hôte.
- **Portée ingénierie / IAOps :**
  Règle d'or de l'accélérateur : toutes les opérations intermédiaires d'un pipeline doivent demeurer confinées dans la mémoire VRAM pour éviter le coût rédhibitoire de l'aller-retour sur le bus PCIe.

---

#### Schéma 38 : Cycle de vie de l'empreinte carbone d'une IA (Green AI)
- **Module associé :** Module 6.2 — IA & éco-conception (`GreenAI`)
- **Légende :** *Répartition de l'empreinte carbone sur le cycle de vie complet : l'inférence en production domine largement l'entraînement.*
- **Description technique :**
  Diagramme en secteurs découpant l'impact environnemental global :
  1. *Énergie grise (Fabrication du matériel)* : environ $15\%$ (extraction des terres rares, fonderie TSMC, transport).
  2. *Entraînement initial du modèle* : environ $10\%$ à $15\%$ (pics énergétiques intenses mais limités dans le temps).
  3. *Inférence en production* : environ $70\%$ à $80\%$ (flux continu de millions de requêtes 24h/24 sur plusieurs années).
- **Intérêt pédagogique :**
  Déconstruit une idée reçue omniprésente dans le débat public qui focalise toute l'attention sur l'entraînement des modèles géants. Montre que le véritable défi écologique de l'IA réside dans l'optimisation quotidienne de l'inférence.
- **Portée ingénierie / IAOps :**
  Justifie pleinement les efforts de quantification (INT8/INT4), de distillation, de pruning et de mise en place de routeurs frugaux pour préserver les ressources énergétiques et l'eau de refroidissement des datacenters.

---

## Matrice Méthodologique pour l'Écriture de l'Ouvrage

Pour la rédaction de votre futur livre auto-édité, ces 38 schémas se répartissent selon 4 grands niveaux d'abstraction complémentaires :

| Niveau d'abstraction | Schémas concernés | Rôle didactique dans le livre |
| :--- | :--- | :--- |
| **Fondements Mathématiques & Théorie** | Schémas 1, 6, 7, 10, 11, 12, 14 | Installer la rigueur des équations, la géométrie des espaces vectoriels et les limites de complexité. |
| **Architectures de Modèles & Pipelines** | Schémas 2, 3, 4, 8, 9, 13, 15, 16, 17, 18, 23, 24, 33, 34 | Décomposer le fonctionnement interne des réseaux (Transformers, LSTM, JEPA, LoRA). |
| **Systèmes, Agents & Sécurité** | Schémas 5, 25, 26, 27, 28, 29, 30, 31, 32, 35 | Démystifier l'autonomie, documenter le confinement des agents et la dérive de données. |
| **Physique du Silicium & Infrastructure** | Schémas 19, 20, 21, 22, 36, 37, 38 | Confronter la théorie mathématique aux réalités thermiques, mémoires et matérielles. |

Ce découpage permettra à vos lecteurs de ne jamais perdre de vue la continuité logique entre la théorie la plus pure et l'exécution matérielle la plus concrète.
