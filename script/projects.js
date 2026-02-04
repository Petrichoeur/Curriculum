/* ==========================================
   MODULE: PROJECTS
   ========================================== */

const Projects = {
    isInitialized: false,
    projects: [],

    init: async function(globalConfig) {
        console.log("🚀 Module Projects : Chargement...");
        
        const container = document.getElementById('projects-list');
        if(!container) return;

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

    render: function() {
        const container = document.getElementById('projects-list');
        if(!container) return;

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
                        <a href="${project.url}" target="_blank" class="cyber-btn small">DÉCOUVRIR_</a>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

window.Projects = Projects;