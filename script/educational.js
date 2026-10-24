/* =========================================================================
   MODULE: EDUCATIONAL (ORGANISATION PAR CHAPITRES & LABS INTERACTIFS)
   Gestion des cours, de la navigation par chapitres et de l'interactivité.
   ========================================================================= */

const Educational = {
    isInitialized: false,
    needsConfig: false,
    currentCourseIndex: 0,
    currentSlideIndex: 0,
    courses: [],
    chapters: [],
    activeFilter: 'ALL',

    // Table de correspondance legacy index -> id sémantique
    legacyIndexMap: {
        0: 'intro',
        1: 'perceptron',
        2: 'mlp',
        3: 'DataShift',
        4: 'vc_dimension',
        5: 'GreenAI',
        6: 'cpu_gpu',
        7: 'rnn',
        8: 'embedding',
        9: 'transformer',
        10: 'llm',
        11: 'training',
        12: 'inference_servers',
        13: 'illusion_conscience',
        14: 'distillation',
        15: 'kv_cache',
        16: 'llm_router',
        17: 'agentic',
        18: 'mcp',
        19: 'jepa_latent',
        20: 'ensemble_ga',
        21: 'system_one_jev'
    },

    /**
     * Initialisation : Charge les cours JSON structurés par domaines
     */
    init: function () {
        if (this.isInitialized) return this.initPromise;

        const listContainer = document.getElementById('pedagogy-list');
        if (!listContainer) return;

        this.initPromise = (async () => {
            try {
                const response = await fetch('config/educational.json?v=4.0');
                if (!response.ok) throw new Error("Impossible de charger les cours");
                this.courses = await response.json();
            } catch (error) {
                console.error("Erreur critique Pédagogie:", error);
                listContainer.innerHTML = '<div style="color:red; padding:15px;">Erreur de chargement des cours.</div>';
                return;
            }

            // Groupement des cours par chapitres / domaines
            const chapterMap = new Map();
            this.courses.forEach((course, idx) => {
                const chId = course.domainId || 'ch1_stats';
                if (!chapterMap.has(chId)) {
                    chapterMap.set(chId, {
                        id: chId,
                        num: course.chapterNum || 'CH',
                        title: course.chapterTitle || 'Chapitre',
                        short: course.chapterShort || 'DOM',
                        courses: []
                    });
                }
                chapterMap.get(chId).courses.push({ course, index: idx });
            });
            this.chapters = Array.from(chapterMap.values());

            // Construction du Menu par Chapitres
            this.renderMenu();

            // Raccourcis clavier pour visionneuse modal
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('slide-modal');
                if (modal && modal.style.display === "block") {
                    if (e.key === "Escape") this.closeModal();
                    if (e.key === "ArrowRight") this.changeModalSlide(1);
                    if (e.key === "ArrowLeft") this.changeModalSlide(-1);
                }
            });

            // Charger le premier cours par défaut
            if (this.courses.length > 0) {
                this.loadCourse(0);
            }

            this.isInitialized = true;
        })();

        return this.initPromise;
    },

    /**
     * Construction du menu latéral hiérarchisé par chapitres
     */
    renderMenu: function() {
        const menuContainer = document.querySelector('.pedagogy-menu');
        const listContainer = document.getElementById('pedagogy-list');
        if (!listContainer || !menuContainer) return;

        // 1. Barre de filtres par domaine
        let filterBar = document.getElementById('pedagogy-filter-bar');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.id = 'pedagogy-filter-bar';
            filterBar.className = 'pedagogy-filter-bar';
            const menuH3 = menuContainer.querySelector('h3');
            if (menuH3) {
                menuH3.textContent = 'MODULES PAR CHAPITRE';
                menuH3.insertAdjacentElement('afterend', filterBar);
            } else {
                menuContainer.insertBefore(filterBar, listContainer);
            }
        }

        const filterItems = [
            { id: 'ALL', label: 'TOUS' },
            ...this.chapters.map(ch => ({ id: ch.id, label: ch.short }))
        ];

        filterBar.innerHTML = filterItems.map(f => `
            <button class="pedagogy-filter-pill ${this.activeFilter === f.id ? 'active' : ''}" 
                    onclick="Educational.setFilter('${f.id}')">
                ${f.label}
            </button>
        `).join('');

        // 2. Construction des blocs de chapitres
        listContainer.innerHTML = '';
        listContainer.className = 'pedagogy-chapters-container';

        this.chapters.forEach(ch => {
            const isVisible = (this.activeFilter === 'ALL' || this.activeFilter === ch.id);
            const groupEl = document.createElement('div');
            groupEl.className = `pedagogy-chapter-group ${isVisible ? '' : 'hidden'}`;
            groupEl.id = `chapter-group-${ch.id}`;

            const headerEl = document.createElement('div');
            headerEl.className = 'pedagogy-chapter-header';
            headerEl.onclick = () => this.toggleChapter(ch.id);
            headerEl.innerHTML = `
                <div class="chapter-header-left">
                    <span class="chapter-num-badge">${ch.num}</span>
                    <span class="chapter-title-text">${ch.title.replace(/Chapitre \d+ : /, '')}</span>
                </div>
                <div class="chapter-header-right">
                    <span class="chapter-count-badge">${ch.courses.length}</span>
                    <span class="chapter-chevron" id="chevron-${ch.id}">▼</span>
                </div>
            `;

            const coursesUl = document.createElement('ul');
            coursesUl.className = 'pedagogy-chapter-courses';
            coursesUl.id = `courses-ul-${ch.id}`;

            ch.courses.forEach(({ course, index }) => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.className = 'course-btn';
                btn.setAttribute('data-course-id', course.id);
                btn.textContent = course.title;
                btn.onclick = () => this.loadCourse(index);
                course.btnElement = btn;
                li.appendChild(btn);
                coursesUl.appendChild(li);
            });

            groupEl.appendChild(headerEl);
            groupEl.appendChild(coursesUl);
            listContainer.appendChild(groupEl);
        });
    },

    /**
     * Filtrage rapide par domaine / chapitre
     */
    setFilter: function(filterId) {
        this.activeFilter = filterId;
        const pills = document.querySelectorAll('.pedagogy-filter-pill');
        pills.forEach(p => p.classList.remove('active'));

        const targetPill = Array.from(pills).find(p => {
            if (filterId === 'ALL') return p.textContent.trim() === 'TOUS';
            const ch = this.chapters.find(c => c.id === filterId);
            return ch && p.textContent.trim() === ch.short;
        });
        if (targetPill) targetPill.classList.add('active');

        this.chapters.forEach(ch => {
            const group = document.getElementById(`chapter-group-${ch.id}`);
            if (group) {
                if (filterId === 'ALL' || filterId === ch.id) {
                    group.classList.remove('hidden');
                } else {
                    group.classList.add('hidden');
                }
            }
        });
    },

    /**
     * Dépliage / repliage d'un chapitre
     */
    toggleChapter: function(chapterId) {
        const coursesUl = document.getElementById(`courses-ul-${chapterId}`);
        const chevron = document.getElementById(`chevron-${chapterId}`);
        if (!coursesUl) return;

        const isCollapsed = coursesUl.classList.toggle('collapsed');
        if (chevron) {
            chevron.textContent = isCollapsed ? '▶' : '▼';
        }
    },

    /**
     * Charge un cours par son index numérique ou son identifiant textuel
     */
    loadCourse: function(target) {
        let index = -1;
        if (typeof target === 'number') {
            if (target >= 0 && target < this.courses.length) {
                index = target;
            } else if (this.legacyIndexMap[target]) {
                const mappedId = this.legacyIndexMap[target];
                index = this.courses.findIndex(c => c.id === mappedId);
            }
        } else if (typeof target === 'string') {
            index = this.courses.findIndex(c => c.id === target);
        }

        if (index < 0) index = 0;
        this.currentCourseIndex = index;
        const course = this.courses[index];
        const display = document.getElementById('pedagogy-content');
        if (!display) return;

        // Mise à jour de la classe active sur les boutons
        this.courses.forEach(c => {
            if (c.btnElement) c.btnElement.classList.remove('active');
        });
        if (course.btnElement) {
            course.btnElement.classList.add('active');
        }

        // Dépliage du chapitre parent si replié ou masqué
        if (course.domainId) {
            const group = document.getElementById(`chapter-group-${course.domainId}`);
            if (group && group.classList.contains('hidden')) {
                this.setFilter('ALL');
            }
            const coursesUl = document.getElementById(`courses-ul-${course.domainId}`);
            const chevron = document.getElementById(`chevron-${course.domainId}`);
            if (coursesUl && coursesUl.classList.contains('collapsed')) {
                coursesUl.classList.remove('collapsed');
                if (chevron) chevron.textContent = '▼';
            }
        }

        this.currentSlideIndex = 0;
        let htmlContent = course.content;

        // Slideshow si présent
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

        // Colab si présent
        if (course.colabLink) {
            htmlContent += `
                <div class="colab-card">
                    <div class="colab-icon"></div>
                    <div class="colab-info"><h4>ENVIRONNEMENT PYTHON DÉTECTÉ</h4><p>Exécuter la simulation interactive.</p></div>
                    <a href="${course.colabLink}" target="_blank" class="colab-btn">INITIALISER NOTEBOOK_</a>
                </div>
            `;
        }

        // Injection et animation
        display.style.opacity = 0;
        setTimeout(() => {
            display.innerHTML = htmlContent;
            display.style.opacity = 1;
            display.scrollTop = 0;

            // Montage des simulations interactives Canvas
            if (window.PedagogyInteractive) {
                window.PedagogyInteractive.initForCourse(course.id);
            }
        }, 150);
    },

    changeSlide: function(direction) {
        const slides = document.querySelectorAll('.slide-img');
        const total = slides.length;
        if (total === 0) return;

        this.currentSlideIndex += direction;
        if (this.currentSlideIndex >= total) this.currentSlideIndex = 0;
        if (this.currentSlideIndex < 0) this.currentSlideIndex = total - 1;

        slides.forEach(s => s.classList.remove('active'));
        slides[this.currentSlideIndex].classList.add('active');

        const counter = document.querySelector('.slide-counter');
        if (counter) counter.textContent = `SCAN: ${this.currentSlideIndex + 1} / ${total}`;
    },

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
        const modal = document.getElementById('slide-modal');
        if (modal) modal.style.display = "none";
    },

    changeModalSlide: function(n) {
        const modal = document.getElementById('slide-modal');
        if (!modal || modal.style.display !== "block") return;

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
