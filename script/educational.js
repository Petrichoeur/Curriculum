/* ==========================================
   MODULE: EDUCATIONAL (Pédagogie IA & Slideshow)
   ========================================== */

const Educational = {
    isInitialized: false,
    currentSlideIndex: 0, // Pour suivre la slide active

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
                <p>Le MLP résout le problème du Perceptron simple en ajoutant des <strong>couches cachées</strong>.</p>
                <p>C'est ici que la magie de la "Backpropagation" opère pour ajuster les poids à travers plusieurs couches.</p>
            `,
            colabLink: 'https://colab.research.google.com/github/Petrichoeur/Neural_Net_from_scratch/blob/master/Neural_net_class/Simple_to_use_Neural_net.ipynb'
        },
        {
            id: 'DataShift',
            title: '4. Data Shift ',
            content: `
                <h2>Data Shift </h2>
                <p> Mathématiquement, c'est simple : la distribution de vos données de production <strong>X<sub>prod</sub></strong> n'est plus la même que celle de vos données d'entraînement <strong> X<sub>train</sub> </strong>.</p>
                <p>Le monde bouge, les comportements clients évoluent, et votre modèle, lui, reste figé dans le passé.</p>
            `, 
            colabLink: null
            slides: ["data/datashift/dsslide1.jpeg",
                "data/datashift/dsslide2.jpeg",
                "data/datashift/dsslide3.jpeg", 
                "data/datashift/dsslide4.jpeg",
                "data/datashift/dsslide5.jpeg",
                "data/datashift/dsslide6.jpeg",
                "data/datashift/dsslide7.jpeg"
            ]
        }
    ],

    init: function(globalConfig) {
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
        
        // Reset navigation et index
        this.courses.forEach(c => { if(c.btnElement) c.btnElement.classList.remove('active'); });
        if(course.btnElement) course.btnElement.classList.add('active');
        this.currentSlideIndex = 0; 

        let htmlContent = course.content;

        // --- GÉNÉRATION DU SLIDESHOW SI PRÉSENT ---
        if (course.slides && course.slides.length > 0) {
            htmlContent += `
                <div class="slideshow-container">
                    <div class="slides-wrapper">
                        ${course.slides.map((src, i) => `
                            <img src="${src}" class="slide-img ${i === 0 ? 'active' : ''}" alt="Slide ${i+1}">
                        `).join('')}
                    </div>
                    
                    ${course.slides.length > 1 ? `
                        <button class="slide-nav prev-btn" onclick="Educational.changeSlide(-1)">❮</button>
                        <button class="slide-nav next-btn" onclick="Educational.changeSlide(1)">❯</button>
                        <div class="slide-counter">SCAN: 1 / ${course.slides.length}</div>
                    ` : ''}
                </div>
            `;
        }

        // Génération Colab ( inchangé )
        if (course.colabLink) {
            htmlContent += `
                <div class="colab-card">
                    <div class="colab-icon"></div>
                    <div class="colab-info"><h4>ENVIRONNEMENT PYTHON DÉTECTÉ</h4><p>Exécuter la simulation.</p></div>
                    <a href="${course.colabLink}" target="_blank" class="colab-btn">INITIALISER NOTEBOOK_</a>
                </div>
            `;
        }

        display.style.opacity = 0;
        setTimeout(() => { display.innerHTML = htmlContent; display.style.opacity = 1; }, 200);
    },

    // --- NOUVELLE FONCTION : CHANGEMENT DE SLIDE ---
    changeSlide: function(direction) {
        const slides = document.querySelectorAll('.slide-img');
        const total = slides.length;
        if(total === 0) return;

        // Calcul du nouvel index (avec boucle au début/fin)
        this.currentSlideIndex += direction;
        if (this.currentSlideIndex >= total) this.currentSlideIndex = 0;
        if (this.currentSlideIndex < 0) this.currentSlideIndex = total - 1;

        // Mise à jour DOM
        slides.forEach(s => s.classList.remove('active'));
        slides[this.currentSlideIndex].classList.add('active');
        
        // Mise à jour compteur
        const counter = document.querySelector('.slide-counter');
        if(counter) counter.textContent = `SCAN: ${this.currentSlideIndex + 1} / ${total}`;
    }
};

window.Educational = Educational;