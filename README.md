# Curriculum

Portfolio / CV interactif : profil, jumeau numérique (chat LLM), projets,
ressources pédagogiques et **MLP Studio**, un perceptron multicouche écrit
from scratch avec visualisation en temps réel.

## Stack

Aucune dépendance, aucun build. HTML/CSS/JS vanilla, déployé en statique
sur Vercel avec une serverless function comme proxy LLM.

| Couche | Fichiers |
|---|---|
| Page | `index.html` |
| Styles | `style/style.css` |
| Modules UI | `script/main.js`, `digital-twin.js`, `projects.js`, `educational.js` |
| MLP Studio | `script/mlp/{app.js,core/*,viz/*}` |
| Backend | `api/chat.js` |
| Données | `config/{data,educational,projects}.json` |

## Lancer en local

Le site est statique, mais `/api/chat` nécessite un runtime Node pour la
fonction serverless :

```bash
npx vercel dev
cp .env.example .env   # puis renseigner OPENROUTER_API_KEY
```

Sans clé API, le reste du site fonctionne normalement ; seul le chat est
inopérant (le serveur renvoie un message d'erreur explicite).

## Variables d'environnement

Voir `.env.example`. La seule obligatoire est `OPENROUTER_API_KEY`.

`ALLOWED_ORIGIN` restreint les appels à `/api/chat` à une origine donnée.
Fortement recommandée en production : elle empêche d'utiliser le déploiement
comme proxy gratuit vers OpenRouter.

## Architecture

Le routage est un **registre de modules lazy-load** piloté par le hash de
l'URL. Chaque onglet déclare un `data-module` dans `index.html`, et
`main.js` appelle `window[moduleName].init(config)` au premier affichage.

```
DOMContentLoaded → main.js
  ├─ initNeuralNetwork()      canvas aurora (rAF, suspendu onglet caché)
  ├─ loadGlobalConfig()       fetch config/data.json
  │    └─ DigitalTwin.init() sidebar + tickers + chat
  └─ handleRouting()          lit location.hash
       └─ Projects / Educational / MLPStudio .init() au 1er affichage
```

Le MLP Studio utilise de vrais ES modules avec injection par
`setDependencies()` :

```
DataGenerator → NeuralNetwork → NetworkRenderer + ChartRenderer
```

### MLP Studio

- Architecture `1 → 8 → 6 → 8 → 1` (22 neurones cachés), Swish/SiLU sur les
  couches cachées, sortie linéaire.
- Initialisation de Xavier/Glorot, rétropropagation full-batch,
  **Adam** avec correction de biais.
- Régularisation **L1** + **élagage structurel** périodique. Un poids mis à
  zéro par l'élagage ne repousse jamais (`if (w === 0) continue` dans la
  boucle Adam) : c'est une sparsification définitive.
- `NetworkRenderer` fait une analyse de reachability avant/arrière pour
  n'afficher que les neurones encore connectés des deux côtés.

Les hyperparamètres (`lrScale`, `l1Lambda`, `pruneInterval`,
`pruneThreshold`, `protectStrength`, `protectTopK`) sont surchargeables via
le constructeur `NeuralNetwork(architecture, options)`.

## Sécurité

- `/api/chat` applique un **rate-limiting**, un **contrôle d'origine** et une
  **validation stricte** du payload (rôles autorisés, bornes de taille).
  Seuls `temperature` et `maxOutputTokens` (bornés) sont transmis à Google —
  rien d'autre du client n'est réinjecté.
- Le rate-limiting est **en mémoire, best-effort** : les instances Vercel sont
  éphémères et non partagées. Pour une garantie ferme, brancher un store
  partagé (Upstash Redis / Vercel KV).
- Toute sortie LLM est échappée avant insertion dans le DOM
  (`DigitalTwin.escapeHtml`). Seuls les littéraux HTML écrits dans le code
  passent par `addMessage(..., trusted = true)`.
- La clé API ne vit que dans l'environnement serveur.

## À noter

Le prompt système envoyé à OpenRouter contient des informations personnelles
détaillées issues de `config/data.json` (localisation, entourage). C'est un
choix assumé — à revoir si les données évoluent.

## Jumeau numérique — OpenRouter

Le chat du jumeau numérique passe par OpenRouter, en API compatible OpenAI
(`POST /api/v1/chat/completions`), avec `openrouter/free` par défaut : OpenRouter
route vers un modèle gratuit de son catalogue. Même approche que le moteur
distant de mirza (`mirza/engine/llm/openRouterLlm.py`), dont on reprend notamment
les en-têtes d'attribution `HTTP-Referer` et `X-Title`.

Le modèle se change sans toucher au code via `OPENROUTER_MODEL`, par exemple
`anthropic/claude-sonnet-4.5`.

Côté client, `messages` ne contient que des tours `user`/`assistant`. Le prompt
système est transmis dans un champ séparé `systemPrompt` et **reconstruit côté
serveur**, qui le place en tête : le client ne peut pas s'en servir pour
s'affranchir de la persona. Seuls `temperature` et `max_tokens` sont acceptés
et bornés ; tout le reste du corps de la requête est reconstruit.
