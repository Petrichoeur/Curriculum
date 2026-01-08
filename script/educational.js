/* ==========================================
   MODULE: EDUCATIONAL (JSON DATA LOADING)
   ========================================== */

const Educational = {
    isInitialized: false,
    currentCourseIndex: 0,
    currentSlideIndex: 0,
    courses: [], // Vide au départ, sera rempli par le JSON

    /**
     * Initialisation : Charge le JSON puis construit l'interface
     */
    init: async function(globalConfig) {
        console.log("🎓 Module Pédagogie : Chargement...");

        const listContainer = document.getElementById('pedagogy-list');
        if(!listContainer) return;

        // 1. Récupération des données depuis le fichier JSON
        try {
            const response = await fetch('config/educational.json');
            if (!response.ok) throw new Error("Impossible de charger les cours");
            this.courses = await response.json();
            console.log("✅ Cours chargés :", this.courses.length);
        } catch (error) {
            console.error("Erreur critique Pédagogie:", error);
            listContainer.innerHTML = '<li style="color:red; padding:10px;">Erreur de chargement des données.</li>';
            return;
        }

        // 2. Construction du Menu
        listContainer.innerHTML = ''; 
        this.courses.forEach((course, index) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = 'course-btn';
            btn.textContent = course.title;
            btn.onclick = () => this.loadCourse(index);
            
            // On stocke la référence du bouton dans l'objet course pour gérer la classe active
            course.btnElement = btn; 
            
            li.appendChild(btn);
            listContainer.appendChild(li);
        });

        // 3. Gestionnaires d'événements (Clavier pour Modal)
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('slide-modal').style.display === "block") {
                if (e.key === "Escape") this.closeModal();
                if (e.key === "ArrowRight") this.changeModalSlide(1);
                if (e.key === "ArrowLeft") this.changeModalSlide(-1);
            }
        });

        // 4. Charger le premier cours par défaut
        if (this.courses.length > 0) {
            this.loadCourse(0);
        }

        this.isInitialized = true;
    },

    /**
     * Affiche le contenu d'un cours spécifique
     */
    loadCourse: function(index) {
        this.currentCourseIndex = index;
        const course = this.courses[index];
        const display = document.getElementById('pedagogy-content');
        
        // Gestion de la classe Active sur le menu
        this.courses.forEach(c => { if(c.btnElement) c.btnElement.classList.remove('active'); });
        if(course.btnElement) course.btnElement.classList.add('active');
        
        this.currentSlideIndex = 0; 

        let htmlContent = course.content;

        // --- GÉNÉRATION DU SLIDESHOW (Si slides présentes dans le JSON) ---
        if (course.slides && course.slides.length > 0) {
            htmlContent += `
                <div class="slideshow-container">
                    <div class="slides-wrapper">
                        ${course.slides.map((src, i) => `
                            <img src="${src}" 
                                 class="slide-img ${i === 0 ? 'active' : ''}" 
                                 alt="Slide ${i+1}"
                                 onclick="Educational.openModal(${i})"
                                 style="cursor: zoom-in;">
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

        // --- GÉNÉRATION COLAB (Si lien présent dans le JSON) ---
        if (course.colabLink) {
            htmlContent += `
                <div class="colab-card">
                    <div class="colab-icon"></div>
                    <div class="colab-info"><h4>ENVIRONNEMENT PYTHON DÉTECTÉ</h4><p>Exécuter la simulation.</p></div>
                    <a href="${course.colabLink}" target="_blank" class="colab-btn">INITIALISER NOTEBOOK_</a>
                </div>
            `;
        }

        // Animation Fade-in
        display.style.opacity = 0;
        setTimeout(() => { display.innerHTML = htmlContent; display.style.opacity = 1; }, 200);
    },

    changeSlide: function(direction) {
        const slides = document.querySelectorAll('.slide-img');
        const total = slides.length;
        if(total === 0) return;

        this.currentSlideIndex += direction;
        if (this.currentSlideIndex >= total) this.currentSlideIndex = 0;
        if (this.currentSlideIndex < 0) this.currentSlideIndex = total - 1;

        slides.forEach(s => s.classList.remove('active'));
        slides[this.currentSlideIndex].classList.add('active');
        
        const counter = document.querySelector('.slide-counter');
        if(counter) counter.textContent = `SCAN: ${this.currentSlideIndex + 1} / ${total}`;
    },

    /* ==========================================
       GESTION DU MODAL (LIGHTBOX)
       ========================================== */
    
    openModal: function(slideIndex) {
        const modal = document.getElementById('slide-modal');
        const modalImg = document.getElementById("modal-img");
        const captionText = document.getElementById("modal-caption");
        
        const currentSlides = this.courses[this.currentCourseIndex].slides;
        if (!currentSlides) return;

        this.currentSlideIndex = slideIndex;

        modal.style.display = "block";
        modalImg.src = currentSlides[this.currentSlideIndex];
        captionText.innerHTML = `DATA_VISUALIZATION: ${this.currentSlideIndex + 1} / ${currentSlides.length}`;
    },

    closeModal: function() {
        document.getElementById('slide-modal').style.display = "none";
    },

    changeModalSlide: function(n) {
        const modal = document.getElementById('slide-modal');
        if (modal.style.display !== "block") return;

        const currentSlides = this.courses[this.currentCourseIndex].slides;
        const total = currentSlides.length;

        this.currentSlideIndex += n;
        if (this.currentSlideIndex >= total) this.currentSlideIndex = 0;
        if (this.currentSlideIndex < 0) this.currentSlideIndex = total - 1;

        document.getElementById("modal-img").src = currentSlides[this.currentSlideIndex];
        document.getElementById("modal-caption").innerHTML = `DATA_VISUALIZATION: ${this.currentSlideIndex + 1} / ${total}`;
    }
};

window.Educational = Educational;