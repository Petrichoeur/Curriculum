/**
 * MIRZA // Widget Copilote Vocal Cyberpunk
 *
 * Chatbot flottant vocal connecte au modele du Jumeau Numerique via /api/chat
 * et a la synthese vocale haute-fidelite Microsoft Edge TTS via /api/tts.
 *
 * Icone interactive : Oeil Reacteur Mirza (reticules concentriques,
 * ondes radiales de voix et pads d'accostage animes sur Canvas).
 *
 * Regles strictes : Zero emoji, esthetique cyberpunk glassmorphism,
 * reponses ultra-concises orientees IA & MLOps.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // Configuration & Etats
    // -------------------------------------------------------------
    const CONFIG = {
        chatEndpoint: '/api/chat',
        ttsEndpoint: '/api/tts',
        voice: 'fr-FR-RemyMultilingualNeural',
        maxTokens: 140,
        temperature: 0.65,
        storageMuteKey: 'mirza_voice_muted',
        defaultWelcome: 'Mirza connecte. Posez votre question par ecrit, je reponds de vive voix et de maniere concise.'
    };

    let isOpen = false;
    let isSpeaking = false;
    let isThinking = false;
    let isMuted = localStorage.getItem(CONFIG.storageMuteKey) === 'true';
    let currentAudio = null;

    const conversationHistory = [
        {
            role: 'assistant',
            content: CONFIG.defaultWelcome
        }
    ];

    // Cache des URL audio synthetisees (cle: texte)
    const audioCache = new Map();

    // -------------------------------------------------------------
    // Injection du DOM du widget
    // -------------------------------------------------------------
    function injectWidgetDOM() {
        if (document.getElementById('mirza-widget-root')) return;

        const root = document.createElement('div');
        root.id = 'mirza-widget-root';
        root.className = 'mirza-widget-root';

        root.innerHTML = `
            <!-- Bouton Lanceur Flottant -->
            <button id="mirza-launcher-btn" class="mirza-launcher-btn" type="button" aria-label="Ouvrir le copilote vocal Mirza">
                <canvas id="mirza-launcher-canvas" class="mirza-launcher-canvas" width="68" height="68"></canvas>
                <div class="mirza-launcher-ring"></div>
                <div class="mirza-status-dot" id="mirza-status-dot"></div>
                <div class="mirza-launcher-tooltip">
                    <span class="mirza-tooltip-tag">COPILOTE IA</span>
                    <span class="mirza-tooltip-title">MIRZA // VOCAL</span>
                </div>
            </button>

            <!-- Fenetre de Chat Flottante -->
            <div id="mirza-chat-window" class="mirza-chat-window" aria-hidden="true">
                <!-- En-tete HUD -->
                <div class="mirza-chat-header">
                    <div class="mirza-header-left">
                        <canvas id="mirza-header-canvas" class="mirza-header-canvas" width="34" height="34"></canvas>
                        <div class="mirza-header-info">
                            <div class="mirza-header-title">MIRZA <span class="mirza-version-badge">NEMOTRON ULTRA</span></div>
                            <div class="mirza-header-sub" id="mirza-header-sub">STANDBY // PRET</div>
                        </div>
                    </div>
                    <div class="mirza-header-actions">
                        <button id="mirza-mute-btn" class="mirza-icon-btn ${isMuted ? 'muted' : ''}" type="button" title="Activer / Couper la voix" aria-label="Mute toggle">
                            <span class="mirza-btn-label">${isMuted ? 'VOIX: OFF' : 'VOIX: ON'}</span>
                        </button>
                        <button id="mirza-close-btn" class="mirza-icon-btn mirza-close-btn" type="button" title="Reduire" aria-label="Fermer le chat">
                            [X]
                        </button>
                    </div>
                </div>

                <!-- Indicateur de synthese audio -->
                <div class="mirza-audio-meter" id="mirza-audio-meter">
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <div class="mirza-meter-bar"></div>
                    <span class="mirza-meter-text" id="mirza-meter-text">TRANSMISSION VOCALE</span>
                </div>

                <!-- Historique des Messages -->
                <div class="mirza-chat-messages" id="mirza-chat-messages">
                    <div class="mirza-msg mirza-msg-assistant">
                        <div class="mirza-msg-meta">MIRZA // SYSTEM</div>
                        <div class="mirza-msg-body">${escapeHTML(CONFIG.defaultWelcome)}</div>
                    </div>
                </div>

                <!-- Zone de Saisie -->
                <form id="mirza-chat-form" class="mirza-chat-form">
                    <input
                        type="text"
                        id="mirza-chat-input"
                        class="mirza-chat-input"
                        placeholder="Posez votre question par ecrit..."
                        maxlength="400"
                        autocomplete="off"
                        required
                    />
                    <button type="submit" id="mirza-chat-send" class="mirza-chat-send" aria-label="Envoyer">
                        <span class="mirza-send-text">ENVOYER</span>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(root);

        // Attachement des evenements UI
        initUIEvents();

        // Initialisation des canvas Reacteur Mirza
        initReactorCanvases();
    }

    // -------------------------------------------------------------
    // Gestionnaire des evenements UI
    // -------------------------------------------------------------
    function initUIEvents() {
        const launcherBtn = document.getElementById('mirza-launcher-btn');
        const closeBtn = document.getElementById('mirza-close-btn');
        const muteBtn = document.getElementById('mirza-mute-btn');
        const chatForm = document.getElementById('mirza-chat-form');
        const chatInput = document.getElementById('mirza-chat-input');

        launcherBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', closeChat);

        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem(CONFIG.storageMuteKey, isMuted ? 'true' : 'false');
            muteBtn.classList.toggle('muted', isMuted);
            const label = muteBtn.querySelector('.mirza-btn-label');
            if (label) label.textContent = isMuted ? 'VOIX: OFF' : 'VOIX: ON';

            if (isMuted && currentAudio) {
                currentAudio.pause();
                currentAudio = null;
                setSpeaking(false);
            }
        });

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text || isThinking) return;

            chatInput.value = '';
            await handleUserMessage(text);
        });

        // Fermeture sur touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeChat();
            }
        });

        // Masquage automatique des que l'onglet Jumeau Numerique est actif
        window.addEventListener('hashchange', updateVisibilityForCurrentTab);
        window.addEventListener('popstate', updateVisibilityForCurrentTab);

        const dtSection = document.getElementById('digital-twin');
        if (dtSection) {
            const observer = new MutationObserver(updateVisibilityForCurrentTab);
            observer.observe(dtSection, { attributes: true, attributeFilter: ['class'] });
        }
        updateVisibilityForCurrentTab();
    }

    function updateVisibilityForCurrentTab() {
        const root = document.getElementById('mirza-widget-root');
        if (!root) return;

        const isDigitalTwin = window.location.hash === '#digital-twin' ||
            Boolean(document.getElementById('digital-twin')?.classList.contains('active'));

        if (isDigitalTwin) {
            root.classList.add('tab-hidden');
            if (isOpen) {
                closeChat();
            }
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
                setSpeaking(false);
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        } else {
            root.classList.remove('tab-hidden');
        }
    }

    function toggleChat() {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    function openChat() {
        isOpen = true;
        const win = document.getElementById('mirza-chat-window');
        const btn = document.getElementById('mirza-launcher-btn');
        const input = document.getElementById('mirza-chat-input');

        win.classList.add('open');
        win.setAttribute('aria-hidden', 'false');
        btn.classList.add('active');

        setTimeout(() => {
            if (input) input.focus();
            scrollMessagesToBottom();
        }, 150);
    }

    function closeChat() {
        isOpen = false;
        const win = document.getElementById('mirza-chat-window');
        const btn = document.getElementById('mirza-launcher-btn');

        win.classList.remove('open');
        win.setAttribute('aria-hidden', 'true');
        btn.classList.remove('active');
    }

    function setSpeaking(speaking) {
        isSpeaking = speaking;
        const meter = document.getElementById('mirza-audio-meter');
        const sub = document.getElementById('mirza-header-sub');
        const dot = document.getElementById('mirza-status-dot');

        if (meter) {
            meter.classList.toggle('active', speaking);
        }
        if (sub) {
            sub.textContent = speaking ? 'TRANSMISSION VOCALE...' : (isThinking ? 'REFLEXION EN COURS...' : 'STANDBY // PRET');
        }
        if (dot) {
            dot.classList.toggle('speaking', speaking);
        }
    }

    function setThinking(thinking) {
        isThinking = thinking;
        const sendBtn = document.getElementById('mirza-chat-send');
        const input = document.getElementById('mirza-chat-input');
        const sub = document.getElementById('mirza-header-sub');

        if (sendBtn) sendBtn.disabled = thinking;
        if (input) input.disabled = thinking;

        if (sub && !isSpeaking) {
            sub.textContent = thinking ? 'REFLEXION EN COURS...' : 'STANDBY // PRET';
        }
    }

    // -------------------------------------------------------------
    // Envoi de message & Traitement Conversationnel
    // -------------------------------------------------------------
    async function handleUserMessage(userText) {
        appendMessage('user', userText);
        conversationHistory.push({ role: 'user', content: userText });

        // Garde un historique compact (max 10 derniers messages)
        if (conversationHistory.length > 10) {
            conversationHistory.splice(1, 2);
        }

        setThinking(true);
        const thinkingId = appendThinkingBubble();

        try {
            const response = await fetch(CONFIG.chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: conversationHistory,
                    maxTokens: CONFIG.maxTokens,
                    temperature: CONFIG.temperature
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Erreur serveur HTTP ${response.status}`);
            }

            const data = await response.json();
            const assistantText = data?.choices?.[0]?.message?.content || data?.reply || 'Transmission sans contenu.';

            removeThinkingBubble(thinkingId);
            appendMessage('assistant', assistantText);
            conversationHistory.push({ role: 'assistant', content: assistantText });

            // Synthese vocale Edge TTS si non silencieux
            if (!isMuted) {
                speakWithEdgeTTS(assistantText);
            }
        } catch (error) {
            removeThinkingBubble(thinkingId);
            const errMsg = `Erreur de communication : ${error.message}`;
            appendMessage('assistant', errMsg, false);
        } finally {
            setThinking(false);
            const input = document.getElementById('mirza-chat-input');
            if (input) input.focus();
        }
    }

    // -------------------------------------------------------------
    // Synthese Vocale Edge-TTS
    // -------------------------------------------------------------
    async function speakWithEdgeTTS(text) {
        if (!text || isMuted) return;

        // Arreter toute lecture en cours
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const cleaned = text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/[*_~#>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned) return;

        setSpeaking(true);

        try {
            let audioUrl = audioCache.get(cleaned);

            if (!audioUrl) {
                const res = await fetch(CONFIG.ttsEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: cleaned,
                        voice: CONFIG.voice
                    })
                });

                if (!res.ok) {
                    throw new Error(`TTS HTTP ${res.status}`);
                }

                const blob = await res.blob();
                audioUrl = URL.createObjectURL(blob);
                audioCache.set(cleaned, audioUrl);
            }

            const audio = new Audio(audioUrl);
            currentAudio = audio;

            audio.onplay = () => setSpeaking(true);
            audio.onended = () => {
                currentAudio = null;
                setSpeaking(false);
            };
            audio.onerror = () => {
                currentAudio = null;
                // Fallback direct sur la synthese Web Speech si echec
                fallbackWebSpeech(cleaned);
            };

            await audio.play();
        } catch (err) {
            console.warn('Fallback synthese locale suite a incident Edge TTS:', err);
            fallbackWebSpeech(cleaned);
        }
    }

    let cachedVoices = [];
    function loadVoices() {
        if ('speechSynthesis' in window) {
            cachedVoices = window.speechSynthesis.getVoices();
        }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    function findFrenchMaleVoice(voices) {
        if (!voices || !voices.length) return null;
        const frVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
        if (!frVoices.length) return null;

        // 1. Voix d'homme prioritaires (Remy Multilingual, Henri Edge, Thomas, Alain, Paul, Nicolas, Arthur, Daniel)
        const maleNames = ['remy', 'remymultilingual', 'henri', 'thomas', 'alain', 'paul', 'nicolas', 'arthur', 'daniel', 'claude'];
        for (const name of maleNames) {
            const found = frVoices.find(v => v.name.toLowerCase().includes(name));
            if (found) return found;
        }

        // 2. Exclusion des voix feminines connues pour garantir une voix masculine
        const femaleNames = ['denise', 'eloise', 'brigitte', 'audrey', 'aurelie', 'amelie', 'alice', 'marie', 'celeste', 'julie', 'hortense'];
        const maleCandidate = frVoices.find(v => {
            const lower = v.name.toLowerCase();
            return !femaleNames.some(f => lower.includes(f));
        });
        if (maleCandidate) return maleCandidate;

        return frVoices[0];
    }

    function fallbackWebSpeech(text) {
        if (!('speechSynthesis' in window) || isMuted) {
            setSpeaking(false);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0; // Cadence naturelle
        utterance.pitch = 0.90; // Timbre masculin

        const voices = (cachedVoices && cachedVoices.length) ? cachedVoices : window.speechSynthesis.getVoices();
        const maleVoice = findFrenchMaleVoice(voices);
        if (maleVoice) utterance.voice = maleVoice;

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }

    // -------------------------------------------------------------
    // Rendu des bulles de messages
    // -------------------------------------------------------------
    function appendMessage(role, text, withReplay = true) {
        const container = document.getElementById('mirza-chat-messages');
        if (!container) return;

        const isUser = role === 'user';
        const msgDiv = document.createElement('div');
        msgDiv.className = `mirza-msg mirza-msg-${isUser ? 'user' : 'assistant'}`;

        const metaText = isUser ? 'UTILISATEUR' : 'MIRZA // NEMOTRON ULTRA';
        let replayBtnHtml = '';
        if (!isUser && withReplay) {
            replayBtnHtml = `
                <div class="mirza-msg-actions">
                    <button type="button" class="mirza-replay-btn" title="Rejouer l'audio">
                        [AUDIO REPLAY]
                    </button>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="mirza-msg-meta">${metaText}</div>
            <div class="mirza-msg-body">${escapeHTML(text)}</div>
            ${replayBtnHtml}
        `;

        const replayBtn = msgDiv.querySelector('.mirza-replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                speakWithEdgeTTS(text);
            });
        }

        container.appendChild(msgDiv);
        scrollMessagesToBottom();
    }

    function appendThinkingBubble() {
        const container = document.getElementById('mirza-chat-messages');
        if (!container) return null;

        const id = 'thinking-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'mirza-msg mirza-msg-assistant mirza-msg-thinking';
        div.innerHTML = `
            <div class="mirza-msg-meta">MIRZA // TRAITEMENT</div>
            <div class="mirza-msg-body">
                <span class="mirza-pulse-text">ACQUISITION NEURONALE</span>
                <span class="mirza-dot-pulse">...</span>
            </div>
        `;
        container.appendChild(div);
        scrollMessagesToBottom();
        return id;
    }

    function removeThinkingBubble(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollMessagesToBottom() {
        const container = document.getElementById('mirza-chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // -------------------------------------------------------------
    // Moteur Graphique : Oeil Reacteur Mirza (Canvas 2D)
    // -------------------------------------------------------------
    function initReactorCanvases() {
        const launcherCanvas = document.getElementById('mirza-launcher-canvas');
        const headerCanvas = document.getElementById('mirza-header-canvas');

        if (!launcherCanvas) return;

        const dpr = window.devicePixelRatio || 1;

        // Initialisation taille Launcher Canvas (68x68 logique)
        const lSize = 68;
        launcherCanvas.width = Math.round(lSize * dpr);
        launcherCanvas.height = Math.round(lSize * dpr);
        const lCtx = launcherCanvas.getContext('2d');
        lCtx.scale(dpr, dpr);

        // Initialisation taille Header Canvas (34x34 logique)
        let hCtx = null;
        let hSize = 34;
        if (headerCanvas) {
            headerCanvas.width = Math.round(hSize * dpr);
            headerCanvas.height = Math.round(hSize * dpr);
            hCtx = headerCanvas.getContext('2d');
            hCtx.scale(dpr, dpr);
        }

        let speechPulse = 0;
        let radialWavePhase = 0;
        let angleReticle = 0;
        let angleOuterDock = 0;
        let smoothRadialAmp = 2.5;

        // Palette Cyber Crimson & Or de Mirza
        const cr = 239, cg = 68, cb = 68;
        const dimR = Math.round(cr * 0.52);
        const dimG = Math.round(cg * 0.52);
        const dimB = Math.round(cb * 0.52);

        function renderReactorEye(ctx, size) {
            const cx = size / 2;
            const cy = size / 2;
            const scale = size / 300;
            const baseR = size * 0.38;

            const targetAmp = (isSpeaking ? 16.0 : (isThinking ? 6.5 : 2.5)) * scale;
            smoothRadialAmp += (targetAmp - smoothRadialAmp) * 0.14;

            const dynamicR = baseR + Math.sin(speechPulse * (isSpeaking ? 3.0 : 1.2)) * (3 * scale);

            // COUCHE 1 : HALO LASER CENTRAL
            const halo = ctx.createRadialGradient(cx, cy, 2 * scale, cx, cy, dynamicR * 1.25);
            halo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            halo.addColorStop(0.2, `rgba(${cr}, ${cg}, ${cb}, ${isSpeaking ? 0.95 : 0.75})`);
            halo.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${isSpeaking ? 0.45 : 0.25})`);
            halo.addColorStop(0.85, `rgba(${dimR}, ${dimG}, ${dimB}, 0.08)`);
            halo.addColorStop(1, 'transparent');

            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, dynamicR * 1.25, 0, Math.PI * 2);
            ctx.fill();

            // COUCHE 2 : RETICULE CONCENTRIQUE
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleReticle);

            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.85)`;
            ctx.lineWidth = Math.max(1, 1.4 * scale);
            ctx.beginPath();
            ctx.arc(0, 0, dynamicR * 0.28, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, dynamicR * 0.34, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.35)`;
            ctx.lineWidth = Math.max(0.8, 0.9 * scale);
            ctx.beginPath();
            ctx.arc(0, 0, dynamicR * 0.52, 0, Math.PI * 2);
            ctx.stroke();

            // Croix de collimation
            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.55)`;
            ctx.lineWidth = Math.max(0.8, 1.0 * scale);
            const crossLen = dynamicR * 0.65;
            ctx.beginPath();
            ctx.moveTo(-crossLen, 0);
            ctx.lineTo(crossLen, 0);
            ctx.moveTo(0, -crossLen);
            ctx.lineTo(0, crossLen);
            ctx.stroke();

            ctx.restore();

            // COUCHE 3 : COURONNE D'ONDES RADIALES DE LA VOIX (8 STRANDS)
            const numRadialStrands = 8;
            const rRadialBase = dynamicR * 0.68;

            for (let s = 0; s < numRadialStrands; s++) {
                const strandRatio = s / (numRadialStrands - 1);
                const strandRadiusOffset = (strandRatio - 0.5) * (10 * scale);
                const strandPhase = radialWavePhase + s * 0.32;
                const strandFreq = 4;

                ctx.save();
                ctx.translate(cx, cy);

                ctx.strokeStyle = s % 2 === 0 ? '#ffd166' : `rgb(${cr}, ${cg}, ${cb})`;
                ctx.lineWidth = Math.max(1, (s === 0 || s === numRadialStrands - 1 ? 1.6 : 1.1) * scale);
                ctx.globalAlpha = 0.85 - strandRatio * 0.25;

                ctx.beginPath();
                const numSteps = 48;
                for (let step = 0; step <= numSteps; step++) {
                    const theta = ((Math.PI * 2) / numSteps) * step;
                    const wave1 = Math.sin(theta * strandFreq + strandPhase);
                    const wave2 = Math.cos(theta * (strandFreq * 2) - strandPhase * 0.8);
                    const totalDisplacement = (wave1 * 0.65 + wave2 * 0.35) * smoothRadialAmp;
                    const r = rRadialBase + strandRadiusOffset + totalDisplacement;
                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);
                    if (step === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            // COUCHE 4 : PADS D'ACCOSTAGE ET ARCS EXTERIEURS
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleOuterDock);

            const rOuterTrack = dynamicR * 0.94;
            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.35)`;
            ctx.lineWidth = Math.max(0.8, 1.0 * scale);
            ctx.beginPath();
            ctx.arc(0, 0, rOuterTrack, 0, Math.PI * 2);
            ctx.stroke();

            const padArcLen = 0.25;
            for (let pIdx = 0; pIdx < 4; pIdx++) {
                const pAng = (Math.PI / 2) * pIdx;
                ctx.strokeStyle = `rgb(${cr}, ${cg}, ${cb})`;
                ctx.lineWidth = Math.max(1.2, 2.2 * scale);
                ctx.beginPath();
                ctx.arc(0, 0, rOuterTrack + 3 * scale, pAng - padArcLen / 2, pAng + padArcLen / 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        function animLoop() {
            // Mise a jour temporelle
            const speedFactor = isSpeaking ? 1.8 : (isThinking ? 1.4 : 0.8);
            speechPulse += 0.04 * speedFactor;
            radialWavePhase += 0.05 * speedFactor;
            angleReticle += 0.001 * speedFactor;
            angleOuterDock -= 0.0012 * speedFactor;

            // Rendu Launcher
            lCtx.clearRect(0, 0, lSize, lSize);
            renderReactorEye(lCtx, lSize);

            // Rendu Header si chat ouvert
            if (hCtx && isOpen) {
                hCtx.clearRect(0, 0, hSize, hSize);
                renderReactorEye(hCtx, hSize);
            }

            requestAnimationFrame(animLoop);
        }

        requestAnimationFrame(animLoop);
    }

    // Lancement au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectWidgetDOM);
    } else {
        injectWidgetDOM();
    }
})();
