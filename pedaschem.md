# Guide Synthétique des 38 Schémas d'Architecture

Tableau de bord minimaliste des 38 schémas SVG du cursus : description factuelle, concept clé et impact terrain.

---

## Tableau Synoptique

| N° | Module | Intitulé du Schéma | Ce qu'il montre | Enjeu clé & Règle IAOps |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `vc_dimension` (1.4) | Pulvérisation 2D vs XOR | 3 points séparables vs 4 points inséparables | Fixe la dimension VC ($d_{VC}=3$ en 2D) et la limite du linéaire. |
| **02** | `intro` (2.1) | Code classique vs Machine Learning | Règles impératives vs induction par la donnée | Le modèle déduit la fonction ; la qualité des données dicte le code. |
| **03** | `ensemble_ga` (2.2) | Random Forest vs Gradient Boosting | Arbres en parallèle (vote) vs en série (résidus) | Bagging (baisse de variance) vs Boosting (baisse de biais). |
| **04** | `ensemble_ga` (2.2) | Cycle de l'algorithme génétique | Population $\to$ Fitness $\to$ Croisement $\to$ Mutation | Optimisation combinatoire sur fonctions non-différentiables. |
| **05** | `DataShift` (2.3) | Les 3 types de Data Shift | Covariate ($P(X)$), Prior ($P(Y)$), Concept ($P(Y \mid X)$) | Isole la cause de dérive pour choisir l'action (réentraînement vs seuils). |
| **06** | `perceptron` (2.4) | Architecture du Perceptron | Somme pondérée $\sum w_i x_i + b$ et seuil binaire | Neurone = hyperplan affine, pas de magie biologique. |
| **07** | `mlp` (2.5) | Réseau profond (Deep MLP) | Couches denses alternées avec non-linéarités | Pliage de l'espace géométrique (Approximation Universelle). |
| **08** | `training` (2.6) | Boucle d'entraînement & VRAM | Forward $\to$ Loss $\to$ Backward $\to$ Optimizer Step | L'entraînement consomme 4x à 6x plus de VRAM que l'inférence. |
| **09** | `training` (2.6) | Adaptateurs LoRA | Poids gelés $W_0$ + matrices de bas rang $A \cdot B$ | Fine-tuning sobre en n'ajustant que $< 0.1\%$ des paramètres. |
| **10** | `rnn` (3.1) | RNN déplié dans le temps | Cellule récurrente itérée et passage de $h_t$ | Dépendance séquentielle stricte : impossible à paralléliser. |
| **11** | `rnn` (3.1) | Cellule LSTM et ses 3 portes | Canal direct $C_t$ régulé par Oubli, Entrée, Sortie | Supprime l'évanouissement du gradient sur les séquences longues. |
| **12** | `embedding` (3.2) | Carte sémantique 2D | Mots regroupés par proximité vectorielle | La similarité cosinus quantifie le sens et les analogies. |
| **13** | `embedding` (3.2) | Embedding Lookup | Token $\to$ ID entier $\to$ ligne de matrice $E$ | La projection d'entrée est un simple indexage mémoire sans calcul. |
| **14** | `transformer` (3.3) | Mécanisme d'attention | Le pronom « elle » pondère le mot « souris » | Résout les anaphores en $\mathcal{O}(N^2)$ via $\text{Softmax}(QK^T/\sqrt{d_k})$. |
| **15** | `transformer` (3.3) | Bloc Transformer canonique | Multi-Head Attention + MLP + liens résiduels | Les connexions résiduelles permettent d'empiler $> 80$ couches. |
| **16** | `llm` (4.1) | Pipeline complet d'un LLM | Texte $\to$ Tokenizer $\to$ Blocs $\to$ Softmax | Vue d'ensemble : du caractère brut au vecteur de probabilités. |
| **17** | `llm` (4.1) | Distribution du mot suivant | Barres de probabilité après « Le chat... » | Le modèle est un estimateur de densité conditionnelle $P(w_t \mid w_{<t})$. |
| **18** | `llm` (4.1) | Les 3 phases d'apprentissage | Pré-entraînement $\to$ SFT $\to$ Alignement (RLHF) | Pré-entraîner donne le savoir ; SFT et RLHF fixent l'obéissance. |
| **19** | `kv_cache` (4.2) | Avec vs Sans KV Cache | Recalcul quadratique vs conservation des tenseurs | Échange de la mémoire VRAM contre un temps de calcul constant $\mathcal{O}(1)$. |
| **20** | `kv_cache` (4.2) | Prefill vs Decode | Traitement parallèle du prompt vs génération mot à mot | Distingue le temps au premier token (TTFT) du débit (TPS). |
| **21** | `inference_servers` (4.3) | Compute-Bound vs Memory-Bound | Modèle Roofline : calcul saturé vs mémoire saturée | En Decode, le GPU attend les octets de la VRAM (Memory-Bound). |
| **22** | `inference_servers` (4.3) | Statique vs Continuous Batching | Attente de la requête la plus longue vs insertion fluide | Élimine les bulles d'inactivité GPU et triple le débit de requêtes. |
| **23** | `distillation` (4.4) | Distillation Professeur-Élève | Gros modèle (175B) guidant un petit modèle (7B) | Compresse l'expertise sans perte massive de précision. |
| **24** | `distillation` (4.4) | Hard Labels vs Soft Labels | Binaire (100%/0%) vs distribution douce (70%/25%/5%) | Transmet l'information de parenté entre classes (« dark knowledge »). |
| **25** | `illusion_conscience` (4.5) | Boucle autorégressive sans état | Modèle figé réinjectant sa sortie en entrée | Aucun penseur interne : simple automate stochastique en lecture seule. |
| **26** | `illusion_conscience` (4.5) | Décision myope token par token | Choix mot après mot sans vue d'ensemble | Explique pourquoi un LLM s'enferme dans ses propres hallucinations. |
| **27** | `llm_router` (5.1) | Routeur dynamique de LLM | Entonnoir aiguillant vers Frugal, Code ou Raisonnement | Divise les coûts par 5 en évitant d'utiliser un modèle lourd pour tout. |
| **28** | `agentic` (5.2) | Boucle ReAct | Thought $\to$ Action (Tool) $\to$ Exec $\to$ Observation | L'agent ajuste son raisonnement grâce au retour direct du système hôte. |
| **29** | `llm_harness` (5.3) | Architecture du Harness | Sas étanche : validation, sandbox, politiques, HITL | La sécurité dépend du logiciel d'encadrement, jamais du prompt. |
| **30** | `llm_harness` (5.3) | Évasion IA : Mythe vs Réalité | Fable médiatique vs shell root exposé sans sandbox | Toute faille est une erreur de configuration humaine de l'hôte. |
| **31** | `mcp` (5.4) | Standard MCP vs maillage M x N | Connecteurs spaghetti vs bus universel JSON-RPC | Évite de réécrire un connecteur par client (analogie port USB). |
| **32** | `mcp` (5.4) | Saturation de contexte MCP | 40k tokens gaspillés par 80 définitions d'outils | Trop d'outils chargés dilue l'attention et fait exploser les coûts. |
| **33** | `jepa_latent` (5.5) | Espace physique vs Espace latent | Bruit de pixels éliminé pour ne garder que la structure | Inutile de prédire chaque détail instable pour comprendre le monde. |
| **34** | `jepa_latent` (5.5) | Architecture JEPA | Encodeurs contexte/cible et prédiction purement latente | Apprentissage auto-supervisé non-génératif pour la planification. |
| **35** | `system_one_jev` (5.6) | LLM texte libre vs System One typé | Génération mot à mot lente vs évaluation parallèle typée | Décision instantanée en 1 passe sans crash de parsing JSON. |
| **36** | `cpu_gpu` (6.1) | Architecture CPU vs GPU | Quelques gros cœurs complexes vs armée de petits cœurs | CPU = latence et logique séquentielle ; GPU = débit matriciel SIMT. |
| **37** | `cpu_gpu` (6.1) | Goulot du bus PCIe | RAM (80 Go/s) $\leftrightarrow$ PCIe (32 Go/s) $\leftrightarrow$ VRAM (3000 Go/s) | Le GPU passe son temps à attendre si les données ne restent pas en VRAM. |
| **38** | `GreenAI` (6.2) | Cycle de vie de l'empreinte carbone | Fabrication ($15\%$) + Entraînement ($15\%$) + Inférence ($70\%$) | Le vrai levier écologique est l'inférence en production 24h/24. |

---

## Fiches Minimalistes par Module

### 1. Théorie VC (`vc_dimension`)
- **Schéma 1 (Pulvérisation 2D vs XOR) :** 3 points séparables par une droite vs échec sur 4 points en croix. Démontre géométriquement $d_{VC}=3$ en 2D et prouve l'incapacité d'un modèle linéaire face aux fonctions non-linéaires.

### 2. Introduction au Machine Learning (`intro`)
- **Schéma 2 (Programmation vs ML) :** Code classique (Données + Règles $\to$ Résultats) vs ML (Données + Résultats $\to$ Modèle). Fixe le principe d'induction : l'algorithme calibre une fonction, la donnée dicte la règle.

### 3. Machine Learning Classique (`ensemble_ga`)
- **Schéma 3 (Random Forest vs Gradient Boosting) :** Arbres en parallèle (moyenne de modèles indépendants) vs en série (correction itérative des résidus). Bagging réduit la variance ; Boosting réduit le biais.
- **Schéma 4 (Algorithme Génétique) :** Boucle Population $\to$ Évaluation $\to$ Croisement $\to$ Mutation. Démontre qu'une optimisation ne requiert ni dérivée ni fonction continue.

### 4. Data Shift (`DataShift`)
- **Schéma 5 (Les 3 dérives) :** Dérive des entrées $P(X)$, des cibles $P(Y)$ ou de la relation $P(Y \mid X)$. Permet d'isoler la cause d'une perte de précision pour agir avec discernement (réentraînement vs calibration).

### 5. Le Perceptron (`perceptron`)
- **Schéma 6 (Architecture synoptique) :** Entrées $\times$ poids, addition du biais et seuil d'activation Heaviside. Montre qu'un neurone artificiel est un hyperplan affine décisionnel.

### 6. Deep MLP (`mlp`)
- **Schéma 7 (Réseau multicouche) :** Couche d'entrée, couches cachées avec ReLU et couche de sortie. Illustre le pliage de l'espace rendant séparables des données complexes.

### 7. Entraînement des Modèles (`training`)
- **Schéma 8 (Boucle d'optimisation & VRAM) :** Forward $\to$ Loss $\to$ Backward $\to$ Optimizer Step, avec jauge mémoire. Révèle que gradients et états d'optimiseur quadruplent l'empreinte mémoire par rapport aux seuls poids.
- **Schéma 9 (Adaptateurs LoRA) :** Matrice de base gelée $W_0$ dérivée sur deux matrices de bas rang $A \cdot B$. Permet d'adapter un modèle massif en n'entraînant que $0.1\%$ de paramètres.

### 8. RNN & LSTM (`rnn`)
- **Schéma 10 (RNN déplié) :** Cellule récurrente réutilisée à chaque token avec passage d'état caché $h_t$. Met en évidence la contrainte séquentielle non parallélisable.
- **Schéma 11 (Cellule LSTM) :** Autoroute d'état $C_t$ contrôlée par 3 portes (Oubli, Entrée, Sortie). Élimine l'évanouissement du gradient sur les longues séquences.

### 9. Embeddings (`embedding`)
- **Schéma 12 (Espace 2D) :** Projection cartésienne de mots regroupés par proximité thématique. Démontre la similarité cosinus et les analogies vectorielles.
- **Schéma 13 (Embedding Lookup) :** Chaîne Mot $\to$ Token ID $\to$ Sélection d'une ligne de matrice. Prouve que l'entrée d'un réseau est une table d'indexation statique en mémoire.

### 10. Architecture Transformer (`transformer`)
- **Schéma 14 (Self-Attention) :** Connexions pondérées entre mots d'une même phrase. Explique la résolution d'anaphores par produit scalaire normalisé sans récurrence temporelle.
- **Schéma 15 (Bloc Transformer) :** Multi-Head Attention, dérivations résiduelles Add & Norm et MLP dense. Présente le bloc unitaire empilé pour former les modèles modernes.

### 11. Grands Modèles de Langage (`llm`)
- **Schéma 16 (Pipeline LLM) :** De la chaîne de caractères brute au vecteur de probabilités de vocabulaire. Donne la vue d'ensemble macroscopique du système.
- **Schéma 17 (Distribution suivante) :** Barres de probabilité pour la suite de « Le chat ». Rappelle la nature d'estimateur statistique conditionnel du modèle.
- **Schéma 18 (Cycle en 3 phases) :** Pré-entraînement (savoir) $\to$ SFT (forme) $\to$ RLHF/DPO (alignement). Distingue la création de connaissances du guidage comportemental.

### 12. KV Cache (`kv_cache`)
- **Schéma 19 (Avec vs Sans cache) :** Recalcul complet quadratique vs réutilisation des tenseurs $K$ et $V$. Ramène le coût par token de $\mathcal{O}(N)$ à $\mathcal{O}(1)$ au prix d'une occupation VRAM accrue.
- **Schéma 20 (Prefill vs Decode) :** Phase Prefill (parallèle, rapide, calcul saturé) vs Phase Decode (séquentielle, token par token, bande passante saturée).

### 13. Serveurs d'Inférence (`inference_servers`)
- **Schéma 21 (Compute-Bound vs Memory-Bound) :** Modèle Roofline confrontant le plafond de calcul et le débit mémoire. Démontre pourquoi le décodage dépend de la bande passante HBM.
- **Schéma 22 (Continuous Batching) :** Remplacement du batching statique par l'insertion fluide de requêtes au niveau de chaque token. Supprime les temps morts du GPU.

### 14. Distillation (`distillation`)
- **Schéma 23 (Professeur-Élève) :** Modèle 175B transférant sa distribution de probabilités à un modèle 7B. Permet de créer des modèles compacts hautement performants.
- **Schéma 24 (Hard vs Soft Labels) :** Binaire strict ($100\%/0\%$) vs probabilités nuancées ($70\%/25\%/5\%$). Transmet la parenté structurelle entre classes.

### 15. Démystification de la Conscience (`illusion_conscience`)
- **Schéma 25 (Boucle sans état) :** Modèle figé en lecture seule réinjectant son token de sortie en entrée. Prouve l'absence d'entité consciente ou de mémoire vivante dans le réseau.
- **Schéma 26 (Décision myope) :** Génération token par token sans plan préconçu. Explique les contradictions et hallucinations par dérive de contexte.

### 16. Routeurs de LLM (`llm_router`)
- **Schéma 27 (Aiguillage dynamique) :** Analyse de la requête pour routage vers modèle frugal, spécialisé code ou raisonnement lourd. Divise les coûts cloud par 5.

### 17. IA Agentique (`agentic`)
- **Schéma 28 (Boucle ReAct) :** Cycle Thought $\to$ Action $\to$ Execution $\to$ Observation. Démontre la capacité d'auto-correction d'un agent au contact de son environnement.

### 18. Harness des LLM (`llm_harness`)
- **Schéma 29 (Architecture du Harness) :** Sas d'intermédiation : filtrage, validation de types, sandbox gVisor et validation humaine HITL. La sécurité réside dans le code hôte, pas dans le prompt.
- **Schéma 30 (Évasion : Mythe vs Réalité) :** Fable médiatique d'une IA rusée vs audit réel d'un shell root sans restriction réseau. Responsabilise l'ingénieur système.

### 19. Protocole MCP (`mcp`)
- **Schéma 31 (Standard vs Maillage M x N) :** Remplacement des connecteurs sur mesure par un bus JSON-RPC normalisé. Standardise l'outillage des agents.
- **Schéma 32 (Saturation du contexte) :** 40 000 tokens consommés par les schémas verbeux de 80 outils. Met en garde contre la dilution d'attention et la hausse des coûts.

### 20. Modèles JEPA (`jepa_latent`)
- **Schéma 33 (Données physiques vs Espace latent) :** Filtrage du bruit de pixels imprévisible pour isoler la structure abstraite exploitable.
- **Schéma 34 (Architecture JEPA) :** Prédiction opérant exclusivement entre représentations latentes sans décodage physique. Base d'une IA sobre pour la planification.

### 21. System One vs LLM (`system_one_jev`)
- **Schéma 35 (Génératif vs Évaluation directe) :** Décodage caractère par caractère fragile vs évaluation typée en une seule passe parallèle. Idéal pour les décisions critiques rapides.

### 22. Matériel : CPU vs GPU (`cpu_gpu`)
- **Schéma 36 (Comparaison architecturale) :** Gros cœurs complexes à forte mémoire cache (CPU) vs armée de cœurs SIMT simples (GPU).
- **Schéma 37 (Goulot du bus PCIe) :** Étranglement à 32 Go/s entre la RAM (80 Go/s) et la VRAM (3000 Go/s). Impose de conserver les données sur le GPU.

### 23. Green AI (`GreenAI`)
- **Schéma 38 (Empreinte carbone sur le cycle de vie) :** Fabrication ($15\%$), Entraînement ($15\%$) et Inférence continue en production ($70\%$). Situe le véritable levier écologique dans l'optimisation de l'inférence.
