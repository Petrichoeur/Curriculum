/* ==========================================
   MODULE: CYBER BOOK (Robust JSON Parsing)
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

    // --- NOUVELLE FONCTION : NETTOYAGE JSON ROBUSTE ---
    parseJsonSafely: function(text) {
        // 1. On cherche la première occurence de '[' et la dernière de ']'
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');

        if (firstBracket === -1 || lastBracket === -1) {
            throw new Error("L'IA n'a pas renvoyé de liste valide.");
        }

        // 2. On extrait juste ce qu'il y a entre les deux
        const jsonString = text.substring(firstBracket, lastBracket + 1);

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Brut fautif :", jsonString);
            throw new Error("Erreur de syntaxe dans le plan généré par l'IA. Réessayez.");
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
            // PHASE 1 : PLAN
            statusLog.textContent = `PHASE 1 : Architecture du plan (${selectedModel})...`;
            progressBar.style.width = "5%";
            
            // Prompt renforcé pour éviter le bavardage
            const planPrompt = `
                Sujet: "${topic}". 
                Tâche: Donne-moi une liste de 8 titres de chapitres pour un livre.
                FORMAT STRICT : Renvoie UNIQUEMENT un tableau JSON Array de strings. RIEN D'AUTRE avant ou après.
                Exemple: ["Titre 1", "Titre 2"]
            `;
            
            const planRes = await this.callGemini(apiKey, planPrompt, 1000, selectedModel);
            
            // UTILISATION DU NOUVEAU PARSEUR
            let chapters = this.parseJsonSafely(planRes);

            // Entête Markdown
            this.fullBookMarkdown += `# ${topic.toUpperCase()}\n\n> *Généré par ${selectedModel}*\n\n## SOMMAIRE\n\n`;
            chapters.forEach((c, i) => this.fullBookMarkdown += `**${i+1}.** ${c}\n\n`);
            this.fullBookMarkdown += `\n---\n\n`;

            // PHASE 2 : RÉDACTION
            for (let i = 0; i < chapters.length; i++) {
                const title = chapters[i];
                const progress = Math.round(((i + 1) / chapters.length) * 100);
                progressBar.style.width = `${progress}%`;
                statusLog.textContent = `PHASE 2 : Écriture "${title}" (${i+1}/${chapters.length})...`;
                
                const chapPrompt = `Écris le chapitre "${title}" du livre "${topic}". Style: Cyberpunk, Tech-Noir, Expert mais Fascinant. Markdown. Min 1000 mots.`;
                
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
        // Fallback si le modèle n'existe pas encore vraiment, on pointe vers flash par défaut en cas d'erreur 404
        // Mais ici on garde la logique stricte demandée
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
            // Gestion spécifique des erreurs Google
            if(data.error.code === 404) {
                throw new Error(`Le modèle '${modelName}' n'est pas encore disponible sur l'API publique.`);
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
                <button id="btn-dl-pdf" class="cyber-btn" style="padding:10px; font-size:0.8rem">📥 PDF HD</button>
                <button id="btn-new-book" class="cyber-btn" style="padding:10px; font-size:0.8rem">↻ NOUVEAU</button>
            </div>
        `;
        display.appendChild(controls);

        const flipContainer = document.createElement('div');
        flipContainer.className = 'flip-book-viewport';
        
        // Séparation propre des chapitres
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

    generateHighQualityPDF: function(topic, bgImage, modelName) {
        let container = document.getElementById('pdf-hidden-container');
        if(!container) {
            container = document.createElement('div');
            container.id = 'pdf-hidden-container';
            document.body.appendChild(container);
        }
        container.innerHTML = ''; 

        const coverDiv = document.createElement('div');
        coverDiv.className = 'pdf-page pdf-cover';
        coverDiv.innerHTML = `
            <img src="${bgImage}" class="pdf-neuron-bg">
            <div class="pdf-cover-content">
                <h1 style="font-size:3rem; color:#00f3ff; margin-bottom:20px; text-transform:uppercase">${topic}</h1>
                <h3 style="color:#fff; font-weight:lighter">GÉNÉRÉ PAR L'INTELLIGENCE ARTIFICIELLE</h3>
                <p style="color:#bd00ff; margin-top:50px">FLORIAN BOBO // ${modelName.toUpperCase()}</p>
            </div>
        `;
        container.appendChild(coverDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'pdf-page';
        const signedMarkdown = this.fullBookMarkdown + 
            `\n\n---\n\n*Document généré via le modèle ${modelName}.*\n**Hash:** ${Math.random().toString(36).substr(2, 9)}`;
        
        contentDiv.innerHTML = marked.parse(signedMarkdown);
        container.appendChild(contentDiv);

        const opt = {
            margin: 0, filename: `Livre_${topic.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const btn = document.getElementById('btn-dl-pdf');
        const originalText = btn.innerText;
        btn.innerText = "⏳ CRÉATION...";

        html2pdf().set(opt).from(container).save().then(() => {
            btn.innerText = originalText;
        });
    }
};

window.BookGenerator = BookGenerator;