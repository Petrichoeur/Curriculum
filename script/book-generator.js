/* ==========================================
   MODULE: CYBER BOOK (Structure Rigide & PDF HD)
   ========================================== */

const BookGenerator = {
    isInitialized: false,
    fullBookMarkdown: "",
    pageFlip: null,

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

    parseJsonSafely: function(text) {
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket === -1 || lastBracket === -1) throw new Error("Format de liste invalide.");
        try {
            return JSON.parse(text.substring(firstBracket, lastBracket + 1));
        } catch (e) {
            throw new Error("Erreur de lecture du plan généré.");
        }
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

        try {
            // PHASE 1 : GÉNÉRATION DES 5 CHAPITRES CENTRAUX
            statusLog.textContent = `PHASE 1 : Architecture stricte (1 Intro + 5 Chapitres + Ouverture)...`;
            progressBar.style.width = "5%";
            
            // On demande juste les 5 chapitres du milieu
            const planPrompt = `
                Sujet: "${topic}". 
                Tâche: Génère une liste de 5 titres de chapitres techniques et accrocheurs pour le corps du livre.
                IMPORTANT : Ne mets PAS d'introduction, ni de conclusion. Juste les 5 parties centrales.
                FORMAT STRICT : Tableau JSON de strings. Exemple: ["Titre A", "Titre B", "Titre C", "Titre D", "Titre E"]
            `;
            
            const planRes = await this.callGemini(apiKey, planPrompt, 1000, selectedModel);
            const coreChapters = this.parseJsonSafely(planRes);

            // ON CONSTRUIT LA STRUCTURE FORCÉE
            const allChapters = [
                "1. Introduction", 
                ...coreChapters, 
                "Ouverture (Pour aller plus loin)"
            ];

            // Entête Markdown
            this.fullBookMarkdown += `# ${topic.toUpperCase()}\n\n> *Généré par ${selectedModel}*\n\n## SOMMAIRE\n\n`;
            allChapters.forEach((c, i) => this.fullBookMarkdown += `**${i === 0 || i === allChapters.length - 1 ? '' : (i) + '.'}** ${c}\n\n`);
            this.fullBookMarkdown += `\n---\n\n`;

            // PHASE 2 : RÉDACTION STRUCTURÉE
            for (let i = 0; i < allChapters.length; i++) {
                const title = allChapters[i];
                const progress = Math.round(((i + 1) / allChapters.length) * 100);
                progressBar.style.width = `${progress}%`;
                statusLog.textContent = `PHASE 2 : Écriture "${title}" (${i+1}/${allChapters.length})...`;
                
                // --- LOGIQUE DE PROMPT VARIABLE SELON LA POSITION ---
                let instructionsSpecifiques = "";
                
                if (i === 0) {
                    // INTRODUCTION
                    instructionsSpecifiques = `
                        Ceci est l'INTRODUCTION.
                        Objectifs : Définir le sujet, accrocher le lecteur, présenter la problématique.
                        Ne fais pas de sous-parties complexes. Reste fluide et engageant avec une touche de cynisme et d'humour.
                    `;
                } else if (i === allChapters.length - 1) {
                    // OUVERTURE / CONCLUSION
                    instructionsSpecifiques = `
                        Ceci est l'OUVERTURE (Conclusion).
                        Objectifs : Résumer les points clés et surtout ouvrir sur le futur, les tendances à venir, l'impact long terme.
                        Donne une vision inspirante.
                    `;
                } else {
                    // LES 5 CHAPITRES CŒUR
                    instructionsSpecifiques = `
                        Ceci est un CHAPITRE TECHNIQUE MAJEUR.
                        STRUCTURE OBLIGATOIRE : Tu dois impérativement diviser ce chapitre en 3 SOUS-PARTIES distinctes (utilise des titres niveau ###).
                        Contenu : Sois dense, expert, donne des exemples, simplifie et vulgarise les concepts, soit le plus engageant possible.
                    `;
                }

                const chapPrompt = `
                    Livre : "${topic}".
                    Chapitre actuel : "${title}".
                    
                    CONSIGNES :
                    ${instructionsSpecifiques}
                    
                    Style Global : Cyberpunk, Tech-Noir, Expert mais Fascinant.
                    Format : Markdown.
                `;
                
                const content = await this.callGemini(apiKey, chapPrompt, 8192, selectedModel);
                
                this.fullBookMarkdown += `## ${title}\n\n${content}\n\n`;
                await this.sleep(2000);
            }

            // PHASE 3 : RENDU
            statusLog.textContent = "Finalisation du rendu...";
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
            if(data.error.code === 404) throw new Error(`Modèle '${modelName}' introuvable ou indisponible.`);
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
            if(!part.trim()) return;
            if(part.includes("SOMMAIRE")) return; 

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

// ... Le début du fichier reste le même ...

    generateHighQualityPDF: function(topic, bgImage, modelName) {
        const btn = document.getElementById('btn-dl-pdf');
        const originalText = btn.innerText;
        btn.innerText = "⏳ GÉNÉRATION DU MASTER...";
        btn.disabled = true;

        // 1. CRÉATION DU CONTENEUR TEMPORAIRE (VISIBLE)
        // S'il n'est pas dans le flux visible, html2canvas échoue souvent.
        let container = document.createElement('div');
        container.id = 'pdf-staging-container';
        document.body.appendChild(container);

        // 2. CRÉATION DE LA COUVERTURE
        const coverDiv = document.createElement('div');
        coverDiv.className = 'pdf-page pdf-cover';
        coverDiv.innerHTML = `
            <img src="${bgImage}" class="pdf-neuron-bg">
            <div class="pdf-cover-content">
                <h1 style="font-size:36pt; color:#00f3ff; margin-bottom:20px; text-transform:uppercase; line-height:1.2">${topic}</h1>
                <h3 style="color:#ffffff; font-weight:lighter; font-size:18pt; letter-spacing:2px">MANUSCRIT GÉNÉRÉ PAR IA</h3>
                <p style="color:#bd00ff; margin-top:50px; font-size:12pt; font-family:monospace">ARCHITECTE : FLORIAN BOBO<br>MOTEUR : ${modelName.toUpperCase()}</p>
            </div>
        `;
        container.appendChild(coverDiv);

        // 3. CRÉATION DU CONTENU
        const contentDiv = document.createElement('div');
        contentDiv.className = 'pdf-page pdf-content-text';
        
        const signedMarkdown = this.fullBookMarkdown + 
            `\n\n---\n\n*Ce document a été généré le ${new Date().toLocaleDateString()} par l'Architecture Neurale de Florian Bobo.*\n**Hash Signature:** ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        contentDiv.innerHTML = marked.parse(signedMarkdown);
        container.appendChild(contentDiv);

        // 4. CONFIGURATION ROBUSTE DE HTML2PDF
        const opt = {
            margin:       0, // On gère les marges en CSS (padding)
            filename:     `Livre_${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, // Haute résolution
                useCORS: true, // Important pour l'image de fond
                scrollY: 0,
                backgroundColor: '#080808', // Force le fond noir dans le canvas
                windowWidth: 1200 // Force une largeur virtuelle pour le rendu
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 5. GÉNÉRATION AVEC DÉLAI DE SÉCURITÉ
        // Le setTimeout permet au navigateur de "peindre" le DOM avant la capture
        setTimeout(() => {
            html2pdf().set(opt).from(container).save().then(() => {
                // NETTOYAGE
                document.body.removeChild(container);
                btn.innerText = originalText;
                btn.disabled = false;
            }).catch(err => {
                console.error(err);
                alert("Erreur PDF. Vérifiez la console.");
                document.body.removeChild(container);
                btn.innerText = originalText;
                btn.disabled = false;
            });
        }, 1000); // 1 seconde de pause pour assurer le chargement des images
    }

};

window.BookGenerator = BookGenerator;