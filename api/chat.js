// Ce code tourne sur les serveurs de Vercel, pas dans le navigateur.
// La clé est en sécurité ici.

export default async function handler(req, res) {
    // 1. Sécurité : On accepte uniquement les POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Récupération de la clé depuis les variables d'env Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (API KEY)' });
    }

    const MODEL_NAME = "gemma-2-27b-it";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    try {
        // 3. On récupère le body envoyé par ton script.js
        const { contents, generationConfig } = req.body;

        // 4. On appelle Google Gemini depuis le serveur
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig
            })
        });

        const data = await response.json();

        // 5. On renvoie la réponse de Google à ton Front
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erreur serveur proxy:", error);
        res.status(500).json({ error: 'Erreur interne lors de l\'appel à Gemini' });
    }
}
