// app.js
(function() {
    // Инициализируем все модули
    Accordion.init();
    VideoModule.init();
    NetworkModule.init();
    TractsModule.init();
    LedModule.init();
    SoundModule.init();
    VcModule.init();
    ErgoModule.init();
    StorageModule.init();

    function initTheme() {
        const themeSwitch = document.getElementById('themeSwitch');
        function setTheme(theme) {
            if(theme === 'dark'){
                document.body.classList.add('dark');
                themeSwitch.innerHTML='<i class="fas fa-moon"></i>';
                localStorage.setItem('theme','dark');
            } else {
                document.body.classList.remove('dark');
                themeSwitch.innerHTML='<i class="fas fa-sun"></i>';
                localStorage.setItem('theme','light');
            }
        }
        themeSwitch.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark');
            setTheme(isDark ? 'light' : 'dark');
        });
        if(localStorage.getItem('theme') === 'dark') setTheme('dark');
    }

    function initSidebarCollapse() {
        const sidebar = document.getElementById('sidebar');
        const collapseBtn = document.getElementById('collapseSidebarBtn');
        function setSidebarCollapsed(collapsed) {
            if(collapsed){
                sidebar.classList.add('collapsed');
                collapseBtn.innerHTML='<i class="fas fa-chevron-right"></i>';
                localStorage.setItem('sidebarCollapsed','true');
            } else {
                sidebar.classList.remove('collapsed');
                collapseBtn.innerHTML='<i class="fas fa-chevron-left"></i>';
                localStorage.setItem('sidebarCollapsed','false');
            }
        }
        collapseBtn.addEventListener('click', () => setSidebarCollapsed(!sidebar.classList.contains('collapsed')));
        if(localStorage.getItem('sidebarCollapsed') === 'true') setSidebarCollapsed(true);
    }

    function initMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        mobileToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', e => {
            if(window.innerWidth<=768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileToggle) {
                sidebar.classList.remove('open');
            }
        });
    }

    initTheme();
    initSidebarCollapse();
    initMobileMenu();
})();
