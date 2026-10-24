// Endpoint Serverless Vercel de synthese vocale Edge-TTS en JavaScript pur.
// Utilise les voix neurales haute-fidelite Microsoft Edge (fr-FR-HenriNeural).

import { EdgeTTS } from 'node-edge-tts';

const MAX_TEXT_LENGTH = 500;
const DEFAULT_VOICE = 'fr-FR-HenriNeural';

function cleanTextForSpeech(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
        // Supprime le formatage Markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[*_~#>]/g, ' ')
        // Normalise les espaces
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TEXT_LENGTH);
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let rawText = '';
        let voice = DEFAULT_VOICE;

        if (req.method === 'GET') {
            rawText = req.query?.text || '';
            voice = req.query?.voice || DEFAULT_VOICE;
        } else {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            rawText = body.text || '';
            voice = body.voice || DEFAULT_VOICE;
        }

        const text = cleanTextForSpeech(rawText);
        if (!text) {
            return res.status(400).json({ error: 'Texte vide ou absent' });
        }

        const tts = new EdgeTTS({
            voice: voice || DEFAULT_VOICE,
            lang: 'fr-FR',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        const chunks = [];
        for await (const chunk of tts.streamAudio(text)) {
            if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
            }
        }

        if (chunks.length === 0) {
            return res.status(502).json({ error: 'Synthese Edge-TTS sans flux audio' });
        }

        const audioBuffer = Buffer.concat(chunks);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', String(audioBuffer.length));
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.status(200).send(audioBuffer);
    } catch (err) {
        console.error('Erreur synthese Edge TTS:', err);
        return res.status(500).json({ error: 'Erreur interne synthese Edge TTS', detail: err?.message || String(err) });
    }
}
