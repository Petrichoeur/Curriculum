/* ==========================================
   MODULE: BOOK GENERATOR (Avec Export PDF)
   ========================================== */

const BookGenerator = {
    isInitialized: false,

    init: function() {
        console.log("📚 Module Book Generator : Prêt.");
        
        const btn = document.getElementById('generate-book-btn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => this.startGeneration());
        }
        this.isInitialized = true;
    },

    startGeneration: async function() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const topic = document.getElementById('book-topic').value.trim();
        
        if (!apiKey || !topic) {
            alert("ERREUR SYSTÈME : Veuillez entrer une Clé API et un Sujet.");
            return;
        }

        // Interface UI
        document.querySelector('.book-config-panel').style.display = 'none';
        const loader = document.getElementById('book-loading');
        const display = document.getElementById('book-display');
        const statusLog = document.getElementById('book-status-log');
        
        loader.style.display = 'block';
        display.style.display = 'none';
        display.innerHTML = '';

        // Logs simulés
        const logs = [
            "Connexion au modèle Gemini-1.5-Pro...",
            "Analyse sémantique du sujet...",
            "Structuration de la Table des Matières...",
            "Rédaction du Chapitre 1...",
            "Extension des concepts...",
            "Correction orthographique..."
        ];
        let logIndex = 0;
        const logInterval = setInterval(() => {
            if(logIndex < logs.length) statusLog.textContent = logs[logIndex++];
        }, 1500);

        try {
            // --- PROMPT (Identique) ---
            const prompt = `
                Rôle : Tu es un auteur expert.
                Tâche : Écrire un mini-livre technique sur : "${topic}".
                Contraintes :
                1. Format : Markdown complet.
                2. Structure : TITRE, INTRO, SOMMAIRE, DÉVELOPPEMENT (5 chapitres min), CONCLUSION.
                3. Style : Professionnel, dense, technique.
                4. Langue : Français.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
                })
            });

            const data = await response.json();

            clearInterval(logInterval);
            loader.style.display = 'none';

            if (data.error) throw new Error(data.error.message);

            const rawText = data.candidates[0].content.parts[0].text;

            // 1. On injecte le texte du livre dans une div spécifique pour le PDF
            // Cela permet d'exclure les boutons lors de l'impression
            const bookContentDiv = document.createElement('div');
            bookContentDiv.id = 'printable-area';
            bookContentDiv.innerHTML = marked.parse(rawText);
            display.appendChild(bookContentDiv);

            // --- ZONE DES BOUTONS ---
            const actionsDiv = document.createElement('div');
            actionsDiv.style.marginTop = "30px";
            actionsDiv.style.display = "flex";
            actionsDiv.style.gap = "15px";

            // BOUTON 1 : PDF
            const pdfBtn = document.createElement('button');
            pdfBtn.className = 'cyber-btn';
            pdfBtn.innerHTML = "📥 TÉLÉCHARGER PDF";
            pdfBtn.style.backgroundColor = "var(--neon-cyan)"; // Distinction visuelle
            pdfBtn.style.color = "#000";
            
            pdfBtn.onclick = () => {
                const element = document.getElementById('printable-area');
                const opt = {
                    margin:       10,
                    filename:     `Livre_${topic.replace(/\s+/g, '_')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f0f13' }, // Garde le fond sombre
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                // Génération
                html2pdf().set(opt).from(element).save();
            };

            // BOUTON 2 : RELOAD
            const backBtn = document.createElement('button');
            backBtn.className = 'cyber-btn';
            backBtn.textContent = "↻ GÉNÉRER UN AUTRE";
            backBtn.onclick = () => location.reload();

            actionsDiv.appendChild(pdfBtn);
            actionsDiv.appendChild(backBtn);
            display.appendChild(actionsDiv);

            display.style.display = 'block';

        } catch (error) {
            clearInterval(logInterval);
            loader.style.display = 'none';
            document.querySelector('.book-config-panel').style.display = 'flex';
            alert("ÉCHEC CRITIQUE : " + error.message);
        }
    }
};

window.BookGenerator = BookGenerator;