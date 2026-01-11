/* ==========================================
   MODULE: MEGA BOOK GENERATOR (Catchy Edition)
   ========================================== */

const BookGenerator = {
    isInitialized: false,
    fullBookMarkdown: "", 

    init: function() {
        console.log("📚 Module Mega-Book : Prêt.");
        const btn = document.getElementById('generate-book-btn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => this.startAgenticGeneration());
        }
        this.isInitialized = true;
    },

    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    startAgenticGeneration: async function() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const topic = document.getElementById('book-topic').value.trim();
        
        if (!apiKey || !topic) {
            alert("ERREUR : Veuillez entrer une Clé API et un Sujet.");
            return;
        }

        // UI Setup
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
            // --- ÉTAPE 1 : ARCHITECTE (PLAN PUNCHY) ---
            statusLog.textContent = "PHASE 1 : Conception d'un plan captivant...";
            progressBar.style.width = "5%";

            const planPrompt = `
                Sujet : "${topic}".
                Tâche : Génère une liste de 10 chapitres pour un livre best-seller.
                Style : Les titres doivent être ACCROCHEURS, provocateurs ou mystérieux (Style TedX / Malcolm Gladwell). Pas de titres scolaires comme "Introduction" ou "Chapitre 1".
                Format de réponse attendu : UNIQUEMENT un tableau JSON de chaînes de caractères.
                Exemple : ["Le mythe de la perfection", "Pourquoi tout va s'effondrer", "L'équation secrète"]
            `;

            const planResponse = await this.callGemini(apiKey, planPrompt, 2000);
            
            let cleanJson = planResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            let chapters = JSON.parse(cleanJson);

            if (!Array.isArray(chapters) || chapters.length === 0) throw new Error("Échec du plan.");

            // Entête du livre
            this.fullBookMarkdown += `# ${topic.toUpperCase()}\n\n`;
            this.fullBookMarkdown += `> *"Un voyage au cœur du système."*\n\n`; // Petite citation stylée
            this.fullBookMarkdown += `## SOMMAIRE\n\n`;
            chapters.forEach((chap, index) => this.fullBookMarkdown += `**${index + 1}.** ${chap}\n\n`);
            this.fullBookMarkdown += `\n---\n\n`;

            // --- ÉTAPE 2 : RÉDACTEUR (TON CATCHY) ---
            for (let i = 0; i < chapters.length; i++) {
                const chapterTitle = chapters[i];
                const progress = Math.round(((i + 1) / chapters.length) * 100);
                progressBar.style.width = `${progress}%`;
                statusLog.textContent = `PHASE 2 : Rédaction de "${chapterTitle}" (${i+1}/${chapters.length})...`;

                const chapterPrompt = `
                    Tu écris un livre best-seller sur : "${topic}".
                    CHAPITRE ACTUEL : "${chapterTitle}".
                    
                    CONSIGNES DE STYLE (CRUCIAL) :
                    1. Ton : "Catchy", provocateur, passionnant. Fuis le style académique ou wikipédia.
                    2. Utilise du Storytelling : commence par une anecdote, une histoire vraie ou un scénario futuriste.
                    3. Interpelle le lecteur ("Vous pensez peut-être que...", "Imaginez un monde où...").
                    4. Sois dense mais fluide (1500 mots minimum).
                    5. Utilise des métaphores puissantes pour expliquer la technique.
                    
                    FORMAT : Markdown (Titres, gras, italique). Ne remets pas le titre du livre, juste le contenu du chapitre.
                `;

                const chapterContent = await this.callGemini(apiKey, chapterPrompt, 8192);
                
                this.fullBookMarkdown += `\n\n## ${chapterTitle}\n\n${chapterContent}`;
                await this.sleep(2500); // Pause légèrement augmentée pour la sécurité
            }

            // --- ÉTAPE 3 : SIGNATURE & RENDU ---
            statusLog.textContent = "Finalisation et signature...";
            
            // AJOUT DE LA SIGNATURE
            this.fullBookMarkdown += `\n\n<br><br>\n\n---\n\n`;
            this.fullBookMarkdown += `### *Fin de transmission.*\n\n`;
            this.fullBookMarkdown += `**Florian Bobo & Son Jumeau Numérique (Gemini-3-flash)**`;

            this.renderBook(topic);
            loader.style.display = 'none';

        } catch (error) {
            console.error(error);
            loader.style.display = 'none';
            document.querySelector('.book-config-panel').style.display = 'flex';
            alert("Erreur : " + error.message);
        }
    },

    callGemini: async function(apiKey, prompt, maxTokens) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens } // Température augmentée pour plus de créativité
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    },

    renderBook: function(topicTitle) {
        const display = document.getElementById('book-display');
        
        const bookContentDiv = document.createElement('div');
        bookContentDiv.id = 'printable-area';
        bookContentDiv.innerHTML = marked.parse(this.fullBookMarkdown);
        display.appendChild(bookContentDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.marginTop = "30px";
        actionsDiv.style.display = "flex";
        actionsDiv.style.gap = "15px";

        const pdfBtn = document.createElement('button');
        pdfBtn.className = 'cyber-btn';
        pdfBtn.innerHTML = "📥 TÉLÉCHARGER LE LIVRE (PDF)";
        pdfBtn.style.backgroundColor = "var(--neon-cyan)";
        pdfBtn.style.color = "#000";
        
        pdfBtn.onclick = () => {
            const element = document.getElementById('printable-area');
            const opt = {
                margin:       15,
                filename:     `Livre_${topicTitle.replace(/\s+/g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f0f13' },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };
            html2pdf().set(opt).from(element).save();
        };

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'cyber-btn';
        reloadBtn.textContent = "↻ NOUVEAU LIVRE";
        reloadBtn.onclick = () => location.reload();

        actionsDiv.appendChild(pdfBtn);
        actionsDiv.appendChild(reloadBtn);
        display.appendChild(actionsDiv);

        display.style.display = 'block';
    }
};

window.BookGenerator = BookGenerator;