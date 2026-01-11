/* ==========================================
   MODULE: CYBER BOOK (Context Aware & Native Print)
   ========================================== */

const BookGenerator = {
    isInitialized: false,
    fullBookMarkdown: "",
    
    // On stocke le dernier chapitre généré pour le donner en contexte au suivant
    lastChapterContent: "", 

    init: function() {
        console.log("📚 Module CyberBook : Prêt.");
        const btn = document.getElementById('generate-book-btn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => this.startAgenticGeneration());
        }
        this.isInitialized = true;
    },

    sleep: function(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

    // --- PARSEUR BLINDÉ ---
    parseJsonSafely: function(text) {
        try {
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                return JSON.parse(text.substring(firstBracket, lastBracket + 1));
            }
        } catch (e) { console.warn("Parsing JSON manuel requis..."); }

        // Mode manuel si le JSON a échoué
        const lines = text.split('\n');
        const chapters = [];
        lines.forEach(line => {
            let cleanLine = line.replace(/^[\d\.\-\*\s"']+|[\"']+$/g, '').trim();
            if (cleanLine.length > 3 && !cleanLine.includes('[') && !cleanLine.includes(']')) {
                chapters.push(cleanLine);
            }
        });
        if (chapters.length >= 3) return chapters.slice(0, 8);
        throw new Error("L'IA n'a pas réussi à générer un plan valide.");
    },

    startAgenticGeneration: async function() {
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
        this.lastChapterContent = ""; // Reset du contexte

        try {
            // PHASE 1 : PLAN
            statusLog.textContent = `PHASE 1 : Architecture du plan (${selectedModel})...`;
            progressBar.style.width = "5%";
            
            const planPrompt = `
                Sujet: "${topic}". 
                Tâche: Donne-moi une liste de 5 titres de chapitres pour le corps du livre.
                IMPORTANT : Ne mets PAS d'introduction, ni de conclusion. Juste les 5 parties centrales.
                FORMAT : Renvoie UNIQUEMENT un tableau JSON simple.
                Exemple : ["Le contexte historique", "Les défis techniques", "La solution", "L'impact sociétal", "Les limites"]
            `;
            
            const planRes = await this.callGemini(apiKey, planPrompt, 1000, selectedModel);
            const coreChapters = this.parseJsonSafely(planRes);

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

            // PHASE 2 : RÉDACTION (AVEC CONTEXTE)
            for (let i = 0; i < allChapters.length; i++) {
                const title = allChapters[i];
                const progress = Math.round(((i + 1) / allChapters.length) * 100);
                progressBar.style.width = `${progress}%`;
                statusLog.textContent = `PHASE 2 : Écriture "${title}" (${i+1}/${allChapters.length})...`;
                
                let contextInstruction = "";
                
                // --- C'EST ICI QUE LA MAGIE OPÈRE ---
                // Si ce n'est pas le premier chapitre, on injecte le résumé du précédent
                if (i > 0 && this.lastChapterContent) {
                    contextInstruction = `
                    CONTEXTE PRÉCÉDENT (Ce que tu viens d'écrire juste avant) :
                    """
                    ${this.lastChapterContent.slice(-4000)} ... (fin du chapitre précédent)
                    """
                    CONSIGNE DE CONTINUITÉ : Assure une transition fluide avec ce contenu. Ne répète pas ce qui a déjà été dit. Ne continue pas 
                    directement le texte. Continue le fil de la pensée. 
                    `;
                }

                let specificInstruction = "";
                if (i === 0) specificInstruction = "C'est l'INTRODUCTION. Pose le décor, captive le lecteur.";
                else if (i === allChapters.length - 1) specificInstruction = "C'est la CONCLUSION. Résume et ouvre sur le futur.";
                else specificInstruction = `
                C'est un CHAPITRE CENTRAL.  Sois technique et détaillé.
                STRUCTURE OBLIGATOIRE DU CHAPITRE :
                    Tu dois développer ce chapitre en **3 SOUS-SECTIONS (Titre ###)** distinctes.
                OBJECTIF DE LONGUEUR : Ce chapitre doit être MASSIF et EXHAUSTIF (Viser 1500 mots).
                    Il ne s'agit pas d'un résumé, mais d'un cours magistral complet.
                    
                    
                POUR CHAQUE SOUS-SECTION, TU DOIS INCLURE :
                    1. La théorie détaillée et le contexte historique, si le sujet s'y prete .
                    2. Une mise en application concrète ou un exemple complexe, si le sujet s'y prete.
                    3. Les nuances, les contre-exemples ou les pièges à éviter.
                    4. Une analogie pour bien comprendre.
                    
                INTERDICTIONS :
                    - Interdit de faire des listes à puces courtes. Fais des paragraphes rédigés.
                    - Interdit de dire "En résumé" ou "Bref".
                    - Ne t'arrête pas tant que tu n'as pas couvert le sujet en profondeur absolue.`;

                const chapPrompt = `
                    Livre : "${topic}". 
                    Chapitre à écrire maintenant : "${title}".
                    
                    ${contextInstruction} 


                    
                    Instructions pour ce chapitre :
                    ${specificInstruction}
                    Format: Markdown
                    Style : Expert, Pédagogue, Humour dosé, Story-telling.
                `;
                
                // Appel API
                const content = await this.callGemini(apiKey, chapPrompt, 8192, selectedModel);
                
                // Sauvegarde pour le prochain tour de boucle
                this.lastChapterContent = content;
                
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

    callGemini: async function(apiKey, prompt, maxTokens, modelName) {
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
            if(data.error.code === 404 || data.error.status === 'NOT_FOUND') {
                 throw new Error(`Le modèle '${modelName}' n'est pas disponible.`);
            }
            throw new Error(data.error.message);
        }
        return data.candidates[0].content.parts[0].text;
    },

    renderExperience: function(topic, modelName) {
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
                <button id="btn-dl-pdf" class="cyber-btn" style="padding:10px; font-size:0.8rem">📥 TÉLÉCHARGER PDF (CLEAN)</button>
                <button id="btn-new-book" class="cyber-btn" style="padding:10px; font-size:0.8rem">↻ NOUVEAU</button>
            </div>
        `;
        display.appendChild(controls);

        // --- FLIPBOOK POUR LA LECTURE ÉCRAN ---
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
            if(!part.trim() || part.includes("SOMMAIRE")) return;
            const fullText = "## " + part;
            const html = marked.parse(fullText);
            flipHTML += `<div class="page"><div class="page-content">${html}</div></div>`;
        });
        
        flipHTML += `</div>`;
        flipContainer.innerHTML = flipHTML;
        display.appendChild(flipContainer);

        const element = document.getElementById('my-flipbook');
        // Initialisation sécurisée du flipbook
        if(typeof St !== 'undefined') {
            this.pageFlip = new St.PageFlip(element, {
                width: 400, height: 600, size: "fixed",
                minWidth: 315, maxWidth: 1000, minHeight: 400, maxHeight: 1000,
                maxShadowOpacity: 0.5, showCover: true, mobileScrollSupport: false 
            });
            this.pageFlip.loadFromHTML(document.querySelectorAll('.page'));
        }

        document.getElementById('btn-new-book').onclick = () => location.reload();
        // Clic sur PDF = Méthode Propre "Native Print"
        document.getElementById('btn-dl-pdf').onclick = () => this.generateHighQualityPDF(topic, neuronImage, modelName);
    },

    // --- GÉNÉRATION PDF SIMPLE ET ROBUSTE (NATIVE PRINT) ---
    generateHighQualityPDF: function(topic, bgImage, modelName) {
        const printContainer = document.getElementById('clean-book-container');
        if (!printContainer) {
            alert("Erreur: Conteneur d'impression manquant dans index.html");
            return;
        }
        
        // Page de garde propre
        const coverHTML = `
            <div style="text-align:center; margin-top:5cm; page-break-after:always;">
                <h1 style="font-size:3em; margin-bottom:0.5em; page-break-before:avoid; font-family:serif;">${topic}</h1>
                <p style="font-size:1.5em; color:#555;">Un livre généré par Intelligence Artificielle</p>
                <hr style="width:50%; margin: 2cm auto; border:1px solid #000;">
                <p><strong>Auteur :</strong> Florian Bobo</p>
                <p><strong>Co-Auteur :</strong> ${modelName}</p>
                <p style="font-size:0.8em; margin-top:5cm;">Généré le ${new Date().toLocaleDateString()}</p>
            </div>
        `;

        const bookContentHTML = marked.parse(this.fullBookMarkdown);

        printContainer.innerHTML = coverHTML + bookContentHTML;

        // On lance l'impression native du navigateur
        // C'est la méthode la plus fiable pour avoir un PDF propre
        setTimeout(() => {
            window.print();
        }, 500);
    }
};

window.BookGenerator = BookGenerator;