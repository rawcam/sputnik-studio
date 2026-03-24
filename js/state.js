// tracts.js
const TractsModule = (function() {
    let unsubscribe = null;
    let currentViewMode = 'single'; // 'single', 'all'

    function renderPathsList() {
        const state = AppState.getState();
        const paths = state.paths;
        const activePathId = state.activePathId;
        const listEl = document.getElementById('sidebarPathsList');
        if (!listEl) return;

        let html = '';
        paths.forEach(path => {
            const isActive = (activePathId === path.id);
            html += `<li>
                <div class="path-name ${isActive ? 'active' : ''}" data-path-id="${path.id}">${escapeHtml(path.name)}</div>
                <div class="path-actions">
                    <button class="rename-path" data-path-id="${path.id}" title="Переименовать"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-path" data-path-id="${path.id}" title="Удалить"><i class="fas fa-trash-alt"></i></button>
                </div>
            </li>`;
        });
        listEl.innerHTML = html;

        // Навешиваем обработчики на элементы списка (делегирование)
        listEl.querySelectorAll('.path-name').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = parseInt(el.dataset.pathId);
                setActivePath(id);
            });
        });
        listEl.querySelectorAll('.rename-path').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.pathId);
                renamePath(id);
            });
        });
        listEl.querySelectorAll('.delete-path').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.pathId);
                deletePath(id);
            });
        });
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function addPath() {
        const state = AppState.getState();
        const newId = state.nextPathId;
        const newName = `Тракт ${newId}`;
        AppState.setState({
            paths: [...state.paths, { id: newId, name: newName, sourceDevices: [], sinkDevices: [] }],
            nextPathId: newId + 1,
            activePathId: newId,
            viewMode: 'single'
        });
    }

    function renamePath(id) {
        const state = AppState.getState();
        const path = state.paths.find(p => p.id === id);
        if (!path) return;
        const newName = prompt('Новое название тракта:', path.name);
        if (newName && newName.trim()) {
            const newPaths = state.paths.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
            AppState.setState({ paths: newPaths });
        }
    }

    function deletePath(id) {
        const state = AppState.getState();
        const path = state.paths.find(p => p.id === id);
        if (!path) return;
        if (confirm(`Удалить тракт "${path.name}"?`)) {
            const newPaths = state.paths.filter(p => p.id !== id);
            let newActivePathId = state.activePathId;
            if (state.activePathId === id) {
                newActivePathId = newPaths.length ? newPaths[0].id : null;
            }
            AppState.setState({
                paths: newPaths,
                activePathId: newActivePathId,
                viewMode: newPaths.length === 0 ? 'single' : state.viewMode
            });
            // TODO: освободить порты устройств, если будут
        }
    }

    function setActivePath(id) {
        const state = AppState.getState();
        if (state.activePathId === id) return;
        AppState.setState({
            activePathId: id,
            viewMode: 'single'
        });
    }

    function showAllTracts() {
        AppState.setState({ viewMode: 'all' });
    }

    function init() {
        // Подписываемся на изменения состояния
        unsubscribe = AppState.subscribe((newState) => {
            renderPathsList();
            // Здесь будет рендеринг активного тракта или всех трактов
            // Пока заглушка
        });

        // Навешиваем обработчики на кнопки управления трактами
        const addPathBtn = document.getElementById('addPathBtnSidebar');
        if (addPathBtn) addPathBtn.addEventListener('click', addPath);

        const showAllBtn = document.getElementById('showAllTractsBtn');
        if (showAllBtn) showAllBtn.addEventListener('click', showAllTracts);

        // Первоначальная отрисовка
        renderPathsList();
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
