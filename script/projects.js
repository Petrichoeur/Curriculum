/* ==========================================
   MODULE: PROJECTS
   ========================================== */

const Projects = {
    isInitialized: false,
    projects: [],

    init: async function (globalConfig) {
        console.log("🚀 Module Projects : Chargement...");

        const container = document.getElementById('projects-list');
        if (!container) return;

        try {
            const response = await fetch('config/projects.json');
            if (!response.ok) throw new Error("Impossible de charger les projets");
            this.projects = await response.json();
            console.log("✅ Projets chargés :", this.projects.length);
        } catch (error) {
            console.error("Erreur critique Projets:", error);
            container.innerHTML = '<p style="color:red; padding:10px;">Erreur de chargement des projets.</p>';
            return;
        }

        this.render();
        this.isInitialized = true;
    },

    render: function () {
        const container = document.getElementById('projects-list');
        if (!container) return;

        if (this.projects.length === 0) {
            container.innerHTML = "<p>Coming soon...</p>";
            return;
        }

        container.innerHTML = `
            <div class="projects-grid">
                ${this.projects.map(project => `
                    <div class="project-card glass-panel">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <div class="project-tags">
                            ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        <div class="project-actions">
                            <a href="${project.url}" target="_blank" class="cyber-btn small">DÉCOUVRIR_</a>
                            ${project.demoVideo ? `<button onclick="Projects.openVideoModal('${project.demoVideo}')" class="cyber-btn small secondary">VOIR LA DÉMO_</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Modal Vidéo Unique -->
            <div id="video-modal" class="modal" onclick="Projects.closeVideoModal()">
                <div class="modal-content video-container" onclick="event.stopPropagation()">
                    <span class="close-modal" onclick="Projects.closeVideoModal()">&times;</span>
                    <video id="demo-video" controls preload="metadata">
                        Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                </div>
            </div>
        `;
    },

    openVideoModal: function (videoSrc) {
        const modal = document.getElementById('video-modal');
        const video = document.getElementById('demo-video');
        if (!modal || !video) return;

        video.src = videoSrc;
        modal.style.display = "flex";
        video.play();
    },

    closeVideoModal: function () {
        const modal = document.getElementById('video-modal');
        const video = document.getElementById('demo-video');
        if (!modal || !video) return;

        modal.style.display = "none";
        video.pause();
        video.src = ""; // Stop loading
    }
};

window.Projects = Projects;