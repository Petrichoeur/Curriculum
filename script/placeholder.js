/* ==========================================
   MODULE: PROJECTS
   ========================================== */

const Projects = {
    init: function(data) {
        console.log("🚀 Module Projects chargé");
        this.render(data);
    },

    render: function(data) {
        const container = document.querySelector('#projects .placeholder-container');
        if(!container) return;

        // Exemple : Injecter du contenu dynamiquement plus tard
        // container.innerHTML = "<h1>Mes Projets</h1>...";
    }
};