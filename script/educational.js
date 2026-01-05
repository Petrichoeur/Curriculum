/* ==========================================
   MODULE: EDUCATIONAL (Pédagogie IA)
   ========================================== */

const Educational = {
    isInitialized: false,

    courses: [
        {
            id: 'intro',
            title: '1. Introduction',
            content: `
                <h2>Introduction à l'IA</h2>
                <p>L'Intelligence Artificielle n'est pas de la magie, c'est des mathématiques. À la base de tout, il y a l'idée de reproduire le fonctionnement cognitif humain par des algorithmes.</p>
                <p>Nous allons explorer ici les briques fondamentales, du simple neurone artificiel aux réseaux profonds complexes.</p>
            `,
            // Pas de Colab pour l'intro
            colabLink: null 
        },
        {
            id: 'perceptron',
            title: '2. Le Perceptron',
            content: `
                <h2>Le Perceptron (1957)</h2>
                <p>Inventé par Frank Rosenblatt, c'est l'ancêtre du neurone artificiel. Il s'agit d'un <strong>classifieur binaire</strong> capable de séparer des données linéairement.</p>
                <p>Formule mathématique de base : <br><code>f(x) = step(w * x + b)</code></p>
                <ul>
                    <li><strong>w (Weights)</strong> : Les poids synaptiques.</li>
                    <li><strong>b (Bias)</strong> : Le seuil d'activation.</li>
                </ul>
                <p>Cliquez ci-dessous pour expérimenter avec le code Python (Numpy) :</p>
            `,
            // Mets ici le vrai lien de ton Colab
            colabLink: 'https://colab.research.google.com/github/Petrichoeur/Neural_Net_from_scratch/blob/master/Perceptron_from_scratch.ipynb' 
        },
        {
            id: 'mlp',
            title: '3. Multi-Layer Perceptron (DeepLearning)',
            content: `
                <h2>Multi-Layer Perceptron (MLP)</h2>
                <p>Le MLP résout le problème du Perceptron simple (XOR) en ajoutant des <strong>couches cachées</strong>.</p>
                <p>C'est ici que la magie de la "Backpropagation" opère pour ajuster les poids à travers plusieurs couches.</p>
            `,
            colabLink: 'https://colab.research.google.com/github/Petrichoeur/Neural_Net_from_scratch/blob/master/Neural_net_class/Simple_to_use_Neural_net.ipynb'
        }
    ],

    init: function(globalConfig) {
        console.log("🎓 Module Pédagogie initialisé");
        
        const listContainer = document.getElementById('pedagogy-list');
        if(!listContainer) return;

        listContainer.innerHTML = ''; 
        this.courses.forEach((course, index) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = 'course-btn';
            btn.textContent = course.title;
            btn.onclick = () => this.loadCourse(index);
            course.btnElement = btn; 
            li.appendChild(btn);
            listContainer.appendChild(li);
        });

        this.loadCourse(0);
        this.isInitialized = true;
    },

    loadCourse: function(index) {
        const course = this.courses[index];
        const display = document.getElementById('pedagogy-content');
        
        // Mise à jour menu actif
        this.courses.forEach(c => {
            if(c.btnElement) c.btnElement.classList.remove('active');
        });
        if(course.btnElement) course.btnElement.classList.add('active');

        // Construction du contenu
        let htmlContent = course.content;

        // AJOUT DU BLOC COLAB SI LE LIEN EXISTE
        if (course.colabLink) {
            htmlContent += `
                <div class="colab-card">
                    <div class="colab-icon"></div>
                    <div class="colab-info">
                        <h4>ENVIRONNEMENT PYTHON DÉTECTÉ</h4>
                        <p>Exécuter la simulation neurale via Google Colab.</p>
                    </div>
                    <a href="${course.colabLink}" target="_blank" class="colab-btn">
                        INITIALISER LE NOTEBOOK_
                    </a>
                </div>
            `;
        }

        // Animation Fade-in
        display.style.opacity = 0;
        setTimeout(() => {
            display.innerHTML = htmlContent;
            display.style.opacity = 1;
        }, 200);
    }
};

window.Educational = Educational;