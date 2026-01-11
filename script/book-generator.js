/* ==========================================
   MODULE: CYBER BOOK (Robust Edition)
   ========================================== */

const BookGenerator = {
    isInitialized: false,
    fullBookMarkdown: "",
    pageFlip: null,

    init: function () {
        console.log("📚 Module CyberBook : Prêt.");
        const btn = document.getElementById('generate-book-btn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => this.startAgenticGeneration());
        }
        this.isInitialized = true;
    },

    sleep: function (ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

    // --- PARSEUR BLINDÉ CONTRE LES ERREURS ---
    parseJsonSafely: function (text) {
        console.log("Texte brut reçu du plan :", text); // Pour débugger

        // TENTATIVE 1 : Extraction JSON Standard
        try {
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');

            if (firstBracket !== -1 && lastBracket !== -1) {
                const jsonString = text.substring(firstBracket, lastBracket + 1);
                return JSON.parse(jsonString);
            }
        } catch (e) {
            console.warn("Échec parsing JSON, passage en mode manuel...");
        }

        // TENTATIVE 2 : Mode Sauvetage (Extraction manuelle ligne par ligne)
        // Si l'IA a renvoyé :
        // 1. Titre A
        // 2. Titre B
        const lines = text.split('\n');
        const chapters = [];

        lines.forEach(line => {
            // Nettoyage : on enlève les chiffres, points, tirets au début
            // Ex: "1. Introduction" devient "Introduction"
            let cleanLine = line.replace(/^[\d\.\-\*\s"']+|[\"']+$/g, '').trim();

            // Si la ligne contient du texte et n'est pas un crochet json
            if (cleanLine.length > 3 && !cleanLine.includes('[') && !cleanLine.includes(']')) {
                chapters.push(cleanLine);
            }
        });

        // Si on a récupéré au moins 3 chapitres, on valide
        if (chapters.length >= 3) {
            // On limite à 5 chapitres pour ne pas casser la structure
            return chapters.slice(0, 8);
        }

        throw new Error("L'IA a généré un format illisible. Réessayez.");
    },

    startAgenticGeneration: async function () {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const topic = document.getElementById('book-topic').value.trim();
        const selectedModel = document.getElementById('gemini-model-select').value;

        if (!apiKey || !topic) { alert("ERREUR : Clé API et Sujet requis."); return; }

        document.querySelector('.book-config-panel').style.display = 'none';
        const loader = document.getElementById('book-loading');
        const display = document.getElementById('book-display');
        const statusLog = document.getElementById('book-status-log');
        const progressBar = document.querySelector('.loader-progress');

        loader.style.display = 'block';
        display.style.display = 'none';
        display.innerHTML = '';
        this.fullBookMarkdown = "";

        try {
            // PHASE 1 : PLAN
            statusLog.textContent = `PHASE 1 : Architecture du plan (${selectedModel})...`;
            progressBar.style.width = "5%";

            const planPrompt = `
                Sujet: "${topic}". 
                Tâche: Donne-moi une liste de 5 titres de chapitres pour le corps du livre.
                IMPORTANT : Ne mets PAS d'introduction, ni de conclusion. Juste les 5 parties centrales.
                FORMAT : Renvoie UNIQUEMENT un tableau JSON simple. Pas de Markdown. Pas de texte avant ou après.
                Exemple valide : ["Le début de l'ère", "La complexité cachée", "L'impact humain", "La rupture", "Vers l'infini"]
            `;

            const planRes = await this.callGemini(apiKey, planPrompt, 1000, selectedModel);
            const coreChapters = this.parseJsonSafely(planRes); // Utilisation du nouveau parseur

            // Structure forcée
            const allChapters = [
                "1. Introduction",
                ...coreChapters,
                "Ouverture (Pour aller plus loin)"
            ];

            // Entête
            this.fullBookMarkdown += `# ${topic.toUpperCase()}\n\n> *Généré par ${selectedModel}*\n\n## SOMMAIRE\n\n`;
            allChapters.forEach((c, i) => this.fullBookMarkdown += `**${i === 0 || i === allChapters.length - 1 ? '' : (i) + '.'}** ${c}\n\n`);
            this.fullBookMarkdown += `\n---\n\n`;

            // PHASE 2 : RÉDACTION
            for (let i = 0; i < allChapters.length; i++) {
                const title = allChapters[i];
                const progress = Math.round(((i + 1) / allChapters.length) * 100);
                progressBar.style.width = `${progress}%`;
                statusLog.textContent = `PHASE 2 : Écriture "${title}" (${i + 1}/${allChapters.length})...`;

                let instructions = "";
                if (i === 0) instructions = "C'est l'INTRODUCTION. Pose le décor, captive le lecteur.";
                else if (i === allChapters.length - 1) instructions = "C'est la CONCLUSION/OUVERTURE. Ouvre sur le futur.";
                else instructions = "C'est un CHAPITRE CENTRAL. Divise-le OBLIGATOIREMENT en 3 sous-parties (###). Sois technique et détaillé avec un ton engageant et chaleureux. Avec une touche de cynisme si c'est adéquate, tu es un grand écrivain.";

                const chapPrompt = `
                    Livre : "${topic}". Chapitre : "${title}".
                    Consigne : ${instructions}
                    Style : Expert, Fascinant. Markdown, story-telling, vulgarisation.
                `;

                const content = await this.callGemini(apiKey, chapPrompt, 8192, selectedModel);
                this.fullBookMarkdown += `## ${title}\n\n${content}\n\n`;
                await this.sleep(2000);
            }

            // PHASE 3 : RENDU
            statusLog.textContent = "Finalisation...";
            this.renderExperience(topic, selectedModel);
            loader.style.display = 'none';

        } catch (error) {
            console.error(error);
            loader.style.display = 'none';
            document.querySelector('.book-config-panel').style.display = 'flex';
            alert("Erreur (" + selectedModel + ") : " + error.message);
        }
    },

    callGemini: async function (apiKey, prompt, maxTokens, modelName) {
        // Mapping des noms utilisateurs vers les vrais noms d'API Google si besoin
        // Ici on garde l'input direct, mais attention aux noms inventés
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
            })
        });

        const data = await response.json();

        if (data.error) {
            // Si erreur 404 (Modèle introuvable), on peut proposer un fallback
            if (data.error.code === 404 || data.error.status === 'NOT_FOUND') {
                throw new Error(`Le modèle '${modelName}' n'existe pas ou n'est pas accessible avec cette clé.`);
            }
            throw new Error(data.error.message);
        }
        return data.candidates[0].content.parts[0].text;
    },

    renderExperience: function (topic, modelName) {
        const display = document.getElementById('book-display');
        display.innerHTML = '';
        display.style.display = 'block';

        const canvas = document.getElementById('neural-canvas');
        const neuronImage = canvas ? canvas.toDataURL('image/png') : '';

        const controls = document.createElement('div');
        controls.className = 'book-controls-top';
        controls.innerHTML = `
            <div style="font-family:var(--font-tech); color:var(--neon-cyan)">LIVRE TERMINÉ</div>
            <div style="display:flex; gap:10px">
                <button id="btn-dl-pdf" class="cyber-btn" style="padding:10px; font-size:0.8rem">📥 PDF HD</button>
                <button id="btn-new-book" class="cyber-btn" style="padding:10px; font-size:0.8rem">↻ NOUVEAU</button>
            </div>
        `;
        display.appendChild(controls);

        const flipContainer = document.createElement('div');
        flipContainer.className = 'flip-book-viewport';

        const splitContent = this.fullBookMarkdown.split('## ');

        let flipHTML = `<div class="flip-book" id="my-flipbook">`;
        flipHTML += `
            <div class="page page-cover">
                <div class="cover-title">${topic}</div>
                <div class="cover-author">Florian Bobo<br>& ${modelName}</div>
            </div>
        `;

        splitContent.forEach(part => {
            if (!part.trim() || part.includes("SOMMAIRE")) return;
            const fullText = "## " + part;
            const html = marked.parse(fullText);
            flipHTML += `<div class="page"><div class="page-content">${html}</div></div>`;
        });

        flipHTML += `</div>`;
        flipContainer.innerHTML = flipHTML;
        display.appendChild(flipContainer);

        const element = document.getElementById('my-flipbook');
        this.pageFlip = new St.PageFlip(element, {
            width: 400, height: 600, size: "fixed",
            minWidth: 315, maxWidth: 1000, minHeight: 400, maxHeight: 1000,
            maxShadowOpacity: 0.5, showCover: true, mobileScrollSupport: false
        });
        this.pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        document.getElementById('btn-new-book').onclick = () => location.reload();
        document.getElementById('btn-dl-pdf').onclick = () => this.generateHighQualityPDF(topic, neuronImage, modelName);
    },

    generateHighQualityPDF: function (topic, bgImage, modelName) {
        // 1. On récupère le conteneur propre
        const printContainer = document.getElementById('clean-book-container');

        // 2. On prépare le contenu HTML
        // On ajoute une page de garde manuellement avant le contenu markdown
        const coverHTML = `
            <div style="text-align:center; margin-top:5cm; page-break-after:always;">
                <h1 style="font-size:3em; margin-bottom:0.5em; page-break-before:avoid;">${topic}</h1>
                <p style="font-size:1.5em; color:#555;">Un livre généré par Intelligence Artificielle</p>
                <hr style="width:50%; margin: 2cm auto;">
                <p><strong>Auteur :</strong> Florian Bobo</p>
                <p><strong>Co-Auteur :</strong> ${modelName}</p>
                <p style="font-size:0.8em; margin-top:5cm;">Généré le ${new Date().toLocaleDateString()}</p>
            </div>
        `;

        // Conversion du Markdown complet (qui contient déjà Sommaire + Chapitres)
        const bookContentHTML = marked.parse(this.fullBookMarkdown);

        // 3. Injection
        printContainer.innerHTML = coverHTML + bookContentHTML;

        // 4. Lancement de l'impression native
        // Le navigateur va ouvrir sa fenêtre. L'utilisateur choisit "Enregistrer en PDF".
        window.print();

        // (Optionnel) Nettoyage après impression pour ne pas polluer le DOM
        setTimeout(() => { printContainer.innerHTML = ''; }, 1000); 
    }
};

window.BookGenerator = BookGenerator;