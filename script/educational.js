/* =========================================================================
   MODULE: EDUCATIONAL (ORGANISATION PAR CHAPITRES & LABS INTERACTIFS)
   Gestion des cours, navigation par chapitres et ergonomie mobile optimisée.
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
        18: 'llm_harness',
        19: 'mcp',
        20: 'jepa_latent',
        21: 'system_one_jev',
        22: 'ensemble_ga'
    },

    isMobile: function() {
        return window.innerWidth <= 900;
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
                const response = await fetch('config/educational.json?v=5.1');
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

            this.initModalListeners();
            this.isInitialized = true;
        })();

        return this.initPromise;
    },

    /**
     * Construction du menu latéral hiérarchisé par chapitres
     */
    renderMenu: function() {
        const filterBar = document.getElementById('pedagogy-filter-bar');
        const listContainer = document.getElementById('pedagogy-list');
        if (!listContainer) return;

        // 1. Barre de filtres par domaine
        if (filterBar) {
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
        }

        // 2. Construction des blocs de chapitres
        listContainer.innerHTML = '';
        listContainer.className = 'pedagogy-chapters-container';

        this.chapters.forEach((ch, chIdx) => {
            const isVisible = (this.activeFilter === 'ALL' || this.activeFilter === ch.id);
            const groupEl = document.createElement('div');
            // Seul le premier chapitre est déplié par défaut, les autres sont repliés
            const startCollapsed = chIdx > 0;
            groupEl.className = `pedagogy-chapter-group ${isVisible ? '' : 'hidden'} ${startCollapsed ? 'collapsed' : ''} ${chIdx === 0 ? 'active-group' : ''}`;
            groupEl.id = `chapter-group-${ch.id}`;

            const headerEl = document.createElement('div');
            headerEl.className = 'pedagogy-chapter-header';
            headerEl.setAttribute('role', 'button');
            headerEl.setAttribute('aria-expanded', startCollapsed ? 'false' : 'true');
            headerEl.onclick = () => this.toggleChapter(ch.id);

            headerEl.innerHTML = `
                <div class="chapter-header-left">
                    <span class="chapter-num-badge">${ch.num}</span>
                    <span class="chapter-title-text">${ch.title.replace(/Chapitre \d+ : /, '')}</span>
                </div>
                <div class="chapter-header-right">
                    <span class="chapter-count-badge">${ch.courses.length}</span>
                    <span class="chapter-chevron" id="chevron-${ch.id}" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </span>
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
     * Gestion du tiroir menu sur mobile
     */
    toggleMobileMenu: function() {
        const menuBody = document.getElementById('pedagogy-menu-body');
        const icon = document.getElementById('mobile-menu-btn-icon');
        const btn = document.getElementById('pedagogy-mobile-menu-btn');
        if (!menuBody) return;

        const isOpen = menuBody.classList.toggle('mobile-open');
        if (icon) icon.textContent = isOpen ? '▲' : '▼';
        if (btn) btn.classList.toggle('active', isOpen);
    },

    closeMobileMenu: function() {
        const menuBody = document.getElementById('pedagogy-menu-body');
        const icon = document.getElementById('mobile-menu-btn-icon');
        const btn = document.getElementById('pedagogy-mobile-menu-btn');
        if (!menuBody) return;

        menuBody.classList.remove('mobile-open');
        if (icon) icon.textContent = '▼';
        if (btn) btn.classList.remove('active');
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
     * Dépliage / repliage d'un chapitre (effet accordéon fluide)
     */
    toggleChapter: function(chapterId) {
        const targetGroup = document.getElementById(`chapter-group-${chapterId}`);
        if (!targetGroup) return;

        const isCurrentlyCollapsed = targetGroup.classList.contains('collapsed');

        // Sur mobile : mode accordéon pour préserver l'espace vertical
        if (isCurrentlyCollapsed && this.isMobile()) {
            this.chapters.forEach(ch => {
                if (ch.id !== chapterId) {
                    const otherGroup = document.getElementById(`chapter-group-${ch.id}`);
                    if (otherGroup) {
                        otherGroup.classList.add('collapsed');
                        const header = otherGroup.querySelector('.pedagogy-chapter-header');
                        if (header) header.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }

        const willBeCollapsed = !isCurrentlyCollapsed;
        targetGroup.classList.toggle('collapsed', willBeCollapsed);
        const header = targetGroup.querySelector('.pedagogy-chapter-header');
        if (header) header.setAttribute('aria-expanded', willBeCollapsed ? 'false' : 'true');
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

        // Dépliage automatique du chapitre parent et mise en surbrillance
        if (course.domainId) {
            if (this.activeFilter !== 'ALL' && this.activeFilter !== course.domainId) {
                this.setFilter('ALL');
            }
            this.chapters.forEach(ch => {
                const group = document.getElementById(`chapter-group-${ch.id}`);
                if (group) {
                    if (ch.id === course.domainId) {
                        group.classList.remove('collapsed');
                        group.classList.add('active-group');
                        const header = group.querySelector('.pedagogy-chapter-header');
                        if (header) header.setAttribute('aria-expanded', 'true');
                    } else if (this.isMobile()) {
                        group.classList.add('collapsed');
                        group.classList.remove('active-group');
                        const header = group.querySelector('.pedagogy-chapter-header');
                        if (header) header.setAttribute('aria-expanded', 'false');
                    } else {
                        group.classList.remove('active-group');
                    }
                }
            });
        }

        // Mise à jour de l'indicateur mobile du cours courant
        const mobileTitle = document.getElementById('mobile-current-title');
        if (mobileTitle) {
            mobileTitle.textContent = course.title;
        }

        // Si on est sur mobile, replier le menu pour laisser 100% de place au texte et scroller en haut
        if (this.isMobile()) {
            this.closeMobileMenu();
            const viewer = document.querySelector('.pedagogy-viewer');
            if (viewer) {
                viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

            // Liaison interactive des figures et schémas SVG (zoom modal)
            this.bindSchemaModals(display);

            // Rendu des formules mathématiques KaTeX
            this.renderMath(display);

            // Montage des simulations interactives Canvas
            if (window.PedagogyInteractive) {
                window.PedagogyInteractive.initForCourse(course.id);
            }
        }, 150);
    },

    /**
     * Attache les gestionnaires d'agrandissement modal sur les figures et schémas
     */
    bindSchemaModals: function(container) {
        if (!container) return;
        const figures = container.querySelectorAll('.edu-figure, .edu-svg-wrap');
        figures.forEach(fig => {
            const hasSvgOrImg = fig.querySelector('svg, img');
            if (!hasSvgOrImg) return;

            fig.style.cursor = 'zoom-in';
            fig.setAttribute('title', 'Cliquer pour agrandir le schéma');

            // Ajout du bouton d'agrandissement en haut a gauche s'il n'existe pas encore
            if (!fig.querySelector('.edu-figure-zoom-badge')) {
                const badge = document.createElement('div');
                badge.className = 'edu-figure-zoom-badge';
                badge.setAttribute('aria-label', 'Agrandir le schéma');
                badge.setAttribute('title', 'Cliquer pour agrandir le schéma');
                badge.innerHTML = `<svg class="edu-zoom-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
                fig.appendChild(badge);
            }

            fig.onclick = (e) => {
                if (e.target.closest('a, button, input, select')) return;
                this.openSchemaModal(fig);
            };
        });
    },

    /**
     * Ouvre la modale pour un schéma SVG ou une image de cours
     */
    openSchemaModal: function(figureEl) {
        const modal = document.getElementById('slide-modal');
        const modalImg = document.getElementById('modal-img');
        const schemaContainer = document.getElementById('modal-schema-container');
        const captionText = document.getElementById('modal-caption');
        const prevBtn = document.getElementById('modal-prev-btn');
        const nextBtn = document.getElementById('modal-next-btn');
        if (!modal || !schemaContainer) return;

        if (modalImg) modalImg.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';

        const svgEl = figureEl.querySelector('svg:not(.edu-zoom-svg-icon)');
        const imgEl = figureEl.querySelector('img');
        const figcaptionEl = figureEl.querySelector('figcaption');

        schemaContainer.innerHTML = '';
        if (svgEl) {
            const clone = svgEl.cloneNode(true);
            clone.setAttribute('width', '100%');
            clone.removeAttribute('height');
            clone.style.maxWidth = '100%';
            clone.style.height = 'auto';
            schemaContainer.appendChild(clone);
        } else if (imgEl) {
            const cloneImg = document.createElement('img');
            cloneImg.src = imgEl.src;
            cloneImg.alt = imgEl.alt || 'Schéma agrandi';
            schemaContainer.appendChild(cloneImg);
        } else {
            return;
        }

        schemaContainer.style.display = 'flex';
        if (captionText) {
            captionText.innerHTML = figcaptionEl ? figcaptionEl.innerHTML : 'SCHÉMA PÉDAGOGIQUE DÉTAILLÉ';
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
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
        const modalImg = document.getElementById('modal-img');
        const schemaContainer = document.getElementById('modal-schema-container');
        const captionText = document.getElementById('modal-caption');
        const prevBtn = document.getElementById('modal-prev-btn');
        const nextBtn = document.getElementById('modal-next-btn');

        const currentSlides = this.courses[this.currentCourseIndex].slides;
        if (!currentSlides) return;

        this.currentSlideIndex = slideIndex;
        if (schemaContainer) {
            schemaContainer.innerHTML = '';
            schemaContainer.style.display = 'none';
        }
        if (modalImg) {
            modalImg.style.display = 'block';
            modalImg.src = currentSlides[this.currentSlideIndex];
        }
        if (prevBtn) prevBtn.style.display = currentSlides.length > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = currentSlides.length > 1 ? 'block' : 'none';
        if (captionText) {
            captionText.innerHTML = `DATA_VISUALIZATION: ${this.currentSlideIndex + 1} / ${currentSlides.length}`;
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    },

    closeModal: function() {
        const modal = document.getElementById('slide-modal');
        const modalImg = document.getElementById('modal-img');
        const schemaContainer = document.getElementById('modal-schema-container');
        if (modal) modal.style.display = 'none';
        if (modalImg) modalImg.style.display = 'none';
        if (schemaContainer) {
            schemaContainer.innerHTML = '';
            schemaContainer.style.display = 'none';
        }
        document.body.style.overflow = '';
    },

    changeModalSlide: function(n) {
        const modal = document.getElementById('slide-modal');
        if (!modal || modal.style.display !== 'block') return;

        const currentSlides = this.courses[this.currentCourseIndex].slides;
        if (!currentSlides || currentSlides.length === 0) return;
        const total = currentSlides.length;

        this.currentSlideIndex += n;
        if (this.currentSlideIndex >= total) this.currentSlideIndex = 0;
        if (this.currentSlideIndex < 0) this.currentSlideIndex = total - 1;

        const modalImg = document.getElementById('modal-img');
        if (modalImg) modalImg.src = currentSlides[this.currentSlideIndex];
        const caption = document.getElementById('modal-caption');
        if (caption) caption.innerHTML = `DATA_VISUALIZATION: ${this.currentSlideIndex + 1} / ${total}`;
    },

    initModalListeners: function() {
        const modal = document.getElementById('slide-modal');
        if (!modal || this._modalListenersBound) return;
        this._modalListenersBound = true;

        // Fermeture par clic sur l'arrière-plan sombre
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Fermeture via la touche Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });
    },

    /**
     * Rendu des formules mathématiques au format LaTeX via KaTeX
     */
    renderMath: function(container) {
        if (!container) return;
        const mathElements = container.querySelectorAll('.math-tex');
        if (mathElements.length === 0) return;

        const renderAll = () => {
            if (!window.katex) return;
            mathElements.forEach(el => {
                const tex = el.getAttribute('data-tex') || el.textContent;
                const isDisplay = el.classList.contains('math-display') || el.tagName === 'DIV';
                try {
                    window.katex.render(tex, el, {
                        displayMode: isDisplay,
                        throwOnError: false
                    });
                } catch (err) {
                    console.warn('Erreur rendu KaTeX:', err);
                }
            });
        };

        if (window.katex) {
            renderAll();
        } else {
            let attempts = 0;
            const timer = setInterval(() => {
                attempts++;
                if (window.katex) {
                    clearInterval(timer);
                    renderAll();
                } else if (attempts > 30) {
                    clearInterval(timer);
                }
            }, 100);
        }
    }
};

window.Educational = Educational;
