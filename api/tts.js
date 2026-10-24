// Endpoint Serverless Vercel de synthese vocale Edge-TTS en JavaScript pur.
// Utilise les voix neurales haute-fidelite Microsoft Edge (fr-FR-RemyMultilingualNeural).

import crypto from 'node:crypto';
import { WebSocket } from 'ws';
import { generateSecMsGec } from './sec-ms-gec.js';

const MAX_TEXT_LENGTH = 500;
const DEFAULT_VOICE = 'fr-FR-RemyMultilingualNeural';
const DEFAULT_RATE = '+0%';
const DEFAULT_PITCH = '+0Hz';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const EDGE_WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}

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

function synthesizeWithEdgeWs(text, { voice = DEFAULT_VOICE, rate = DEFAULT_RATE, pitch = DEFAULT_PITCH, timeoutMs = 12000 } = {}) {
    return new Promise((resolve, reject) => {
        const secMsGec = generateSecMsGec(TRUSTED_CLIENT_TOKEN);
        const wsUrl = `${EDGE_WS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=2-${CHROMIUM_FULL_VERSION}`;

        const ws = new WebSocket(wsUrl, {
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0`,
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const chunks = [];
        let completed = false;
        let timeoutTimer = null;

        const cleanup = () => {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }
            try {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            } catch (_) {}
        };

        timeoutTimer = setTimeout(() => {
            if (!completed) {
                completed = true;
                cleanup();
                reject(new Error('Delai d attente depasse lors de la synthese Edge TTS'));
            }
        }, timeoutMs);

        ws.on('open', () => {
            // Configuration du format audio (MP3 mono 24kHz 48kbps)
            ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` + JSON.stringify({
                context: {
                    synthesis: {
                        audio: {
                            metadataoptions: {
                                sentenceBoundaryEnabled: 'false',
                                wordBoundaryEnabled: 'false'
                            },
                            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                        }
                    }
                }
            }));

            // Requete SSML
            const requestId = crypto.randomBytes(16).toString('hex');
            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="fr-FR"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}" pitch="${escapeXml(pitch)}">${escapeXml(text)}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });

        ws.on('message', (data, isBinary) => {
            if (isBinary && Buffer.isBuffer(data)) {
                if (data.length >= 2) {
                    const headerLen = data.readUInt16BE(0);
                    if (data.length > 2 + headerLen) {
                        const audioChunk = data.subarray(2 + headerLen);
                        if (audioChunk.length > 0) {
                            chunks.push(audioChunk);
                        }
                    }
                }
            } else {
                const messageText = data.toString('utf8');
                if (messageText.includes('Path:turn.end')) {
                    if (!completed) {
                        completed = true;
                        cleanup();
                        if (chunks.length === 0) {
                            reject(new Error('Aucun flux audio recu d Edge TTS'));
                        } else {
                            resolve(Buffer.concat(chunks));
                        }
                    }
                }
            }
        });

        ws.on('error', (err) => {
            if (!completed) {
                completed = true;
                cleanup();
                reject(err);
            }
        });

        ws.on('close', () => {
            if (!completed) {
                completed = true;
                cleanup();
                if (chunks.length > 0) {
                    resolve(Buffer.concat(chunks));
                } else {
                    reject(new Error('Connexion fermee avant la fin de la synthese'));
                }
            }
        });
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let rawText = '';
        let voice = DEFAULT_VOICE;
        let rate = DEFAULT_RATE;

        if (req.method === 'GET') {
            rawText = req.query?.text || '';
            voice = req.query?.voice || DEFAULT_VOICE;
            rate = req.query?.rate || DEFAULT_RATE;
        } else {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            rawText = body.text || '';
            voice = body.voice || DEFAULT_VOICE;
            rate = body.rate || DEFAULT_RATE;
        }

        const text = cleanTextForSpeech(rawText);
        if (!text) {
            return res.status(400).json({ error: 'Texte vide ou absent' });
        }

        const audioBuffer = await synthesizeWithEdgeWs(text, {
            voice: voice || DEFAULT_VOICE,
            rate: rate || DEFAULT_RATE,
            pitch: DEFAULT_PITCH
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', String(audioBuffer.length));
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.status(200).send(audioBuffer);
    } catch (err) {
        console.error('Erreur synthese Edge TTS:', err);
        return res.status(500).json({ error: 'Erreur interne synthese Edge TTS', detail: err?.message || String(err) });
    }
}
