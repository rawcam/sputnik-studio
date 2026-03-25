// logger.js
const LoggerModule = (function() {
    let unsubscribe = null;
    let networkMonitorInterval = null;
    const MAX_LOGS = 500; // ограничим количество записей

    // Получение системной информации
    function getSystemInfo() {
        const userAgent = navigator.userAgent;
        let os = 'Unknown';
        if (userAgent.indexOf('Win') !== -1) os = 'Windows';
        else if (userAgent.indexOf('Mac') !== -1) os = 'macOS';
        else if (userAgent.indexOf('Linux') !== -1) os = 'Linux';
        else if (userAgent.indexOf('Android') !== -1) os = 'Android';
        else if (userAgent.indexOf('iOS') !== -1) os = 'iOS';
        
        return {
            os: os,
            userAgent: userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            timestamp: new Date().toISOString()
        };
    }

    // Получение информации о сети
    async function getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        let info = {
            online: navigator.onLine,
            type: connection ? connection.type : 'unknown',
            effectiveType: connection ? connection.effectiveType : 'unknown',
            downlink: connection ? connection.downlink : null,
            rtt: connection ? connection.rtt : null,
            timestamp: new Date().toISOString()
        };
        // Если нужно измерить скорость, можно добавить тестовую загрузку
        if (info.online && info.downlink === null) {
            // Попытка измерить скорость через загрузку небольшого файла (опционально)
            try {
                const start = performance.now();
                await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
                const duration = (performance.now() - start) / 1000;
                const size = 14000; // примерный размер в байтах
                info.downlink = (size * 8) / duration / 1000000; // Мбит/с
            } catch(e) {}
        }
        return info;
    }

    // Сохранение лога в localStorage
    function saveLog(log) {
        let logs = getLogs();
        logs.unshift(log); // новое в начало
        if (logs.length > MAX_LOGS) logs.pop();
        localStorage.setItem('sputnik_logs', JSON.stringify(logs));
    }

    function getLogs() {
        const logs = localStorage.getItem('sputnik_logs');
        return logs ? JSON.parse(logs) : [];
    }

    function clearLogs() {
        localStorage.removeItem('sputnik_logs');
        alert('Логи очищены');
        if (window.displayLogs) window.displayLogs(); // обновить отображение если открыто
    }

    // Основная функция логирования
    function log(message, type = 'info', data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type, // info, warn, error, action
            message: message,
            data: data
        };
        saveLog(logEntry);
        // Также выводим в консоль для удобства отладки
        if (type === 'error') console.error(message, data);
        else if (type === 'warn') console.warn(message, data);
        else console.log(message, data);
    }

    // Мониторинг сети: периодически проверяем состояние и логируем изменения
    function startNetworkMonitoring() {
        // Логируем начальное состояние сети
        getNetworkInfo().then(info => {
            log(`Сеть: ${info.online ? 'онлайн' : 'офлайн'}, тип: ${info.type}, скорость: ${info.downlink ? info.downlink.toFixed(2) + ' Мбит/с' : 'неизвестно'}`, 'info', info);
        });
        
        // Слушаем события онлайн/офлайн
        window.addEventListener('online', () => {
            getNetworkInfo().then(info => {
                log('Соединение восстановлено', 'info', info);
            });
        });
        window.addEventListener('offline', () => {
            log('Соединение потеряно', 'warn');
        });
        
        // Можно раз в минуту проверять качество соединения
        if (networkMonitorInterval) clearInterval(networkMonitorInterval);
        networkMonitorInterval = setInterval(() => {
            if (navigator.onLine) {
                getNetworkInfo().then(info => {
                    if (info.downlink !== null) {
                        log(`Текущая скорость: ${info.downlink.toFixed(2)} Мбит/с, RTT: ${info.rtt} мс`, 'info', info);
                    } else {
                        log(`Сеть: ${info.online ? 'онлайн' : 'офлайн'}, тип: ${info.type}`, 'info', info);
                    }
                });
            }
        }, 60000); // каждую минуту
    }

    // Перехват событий DOM (клики, изменения)
    function captureEvents() {
        // Используем делегирование для отслеживания кликов по всем интерактивным элементам
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('button, .mode-btn, .add-device-btn, .rename-path, .delete-path, .path-name, .section-header, .ergo-tab');
            if (target) {
                let action = '';
                if (target.classList.contains('mode-btn')) action = `нажата кнопка режима: ${target.dataset.mode}`;
                else if (target.classList.contains('add-device-btn')) action = `нажата кнопка добавления устройства в тракт ${target.dataset.pathId} сегмент ${target.dataset.segment}`;
                else if (target.classList.contains('rename-path')) action = `нажата кнопка переименования тракта ${target.dataset.pathId}`;
                else if (target.classList.contains('delete-path')) action = `нажата кнопка удаления тракта ${target.dataset.pathId}`;
                else if (target.classList.contains('path-name')) action = `выбран тракт ${target.dataset.pathId}`;
                else if (target.classList.contains('section-header')) action = `аккордеон ${target.dataset.section} ${target.classList.contains('collapsed') ? 'закрыт' : 'открыт'}`;
                else if (target.classList.contains('ergo-tab')) action = `переключена вкладка эргономики на ${target.dataset.tab}`;
                else if (target.id === 'addPathBtnSidebar') action = 'создание нового тракта';
                else if (target.id === 'showAllTractsBtn') action = 'показать все тракты';
                else if (target.id === 'saveToBrowserBtn') action = 'сохранить проект';
                else if (target.id === 'exportJsonBtn') action = 'экспорт JSON';
                else if (target.id === 'importJsonBtn') action = 'импорт JSON';
                else if (target.id === 'printReportBtnSidebar') action = 'печать отчёта';
                else if (target.id === 'wikiBtnSidebar') action = 'открыть Wiki';
                else if (target.id === 'resetProjectBtn') action = 'сброс проекта';
                else if (target.id === 'showErgoCalcBtn') action = 'показать калькулятор эргономики';
                else if (target.id === 'closeErgoBtn') action = 'закрыть калькулятор эргономики';
                else action = `клик по элементу: ${target.tagName} ${target.className}`;
                log(action, 'action', { id: target.id, classList: target.classList.toString() });
            }
        });
        
        // Отслеживаем изменения в полях ввода (select, input)
        document.body.addEventListener('change', (e) => {
            const target = e.target;
            if (target.matches('select, input:not([type="checkbox"]), input[type="checkbox"]')) {
                const value = target.type === 'checkbox' ? target.checked : target.value;
                log(`Изменение поля ${target.id || target.name}: ${value}`, 'action', { id: target.id, value: value });
            }
        });
        document.body.addEventListener('input', (e) => {
            const target = e.target;
            if (target.matches('input[type="range"], input[type="number"], input[type="text"]')) {
                log(`Ввод в поле ${target.id}: ${target.value}`, 'action', { id: target.id, value: target.value });
            }
        });
    }

    // Отображение логов в модальном окне
    function showLogsModal() {
        const logs = getLogs();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow: auto;">
                <span class="modal-close" style="float:right; cursor:pointer;">&times;</span>
                <h3>Журнал событий</h3>
                <div style="margin-bottom: 10px;">
                    <button id="clearLogsBtn" class="btn-secondary">Очистить логи</button>
                </div>
                <div id="logsList" style="font-family: monospace; font-size: 12px; max-height: 60vh; overflow-y: auto;">
                    ${logs.map(log => `<div style="border-bottom:1px solid #ccc; padding:4px;">
                        <span style="color:#666;">${log.timestamp}</span> 
                        <strong style="color:${log.type==='error'?'red':log.type==='warn'?'orange':'green'}">[${log.type}]</strong> 
                        ${log.message}
                        ${log.data ? `<span style="color:#888;"> ${JSON.stringify(log.data)}</span>` : ''}
                    </div>`).join('')}
                </div>
                <div class="modal-buttons" style="margin-top: 10px;">
                    <button id="closeLogsBtn" class="btn-primary">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('#closeLogsBtn').addEventListener('click', closeModal);
        modal.querySelector('#clearLogsBtn').addEventListener('click', () => {
            clearLogs();
            // обновим содержимое
            const logsDiv = modal.querySelector('#logsList');
            logsDiv.innerHTML = '<div>Логи очищены</div>';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // сохраним функцию для обновления при очистке
        window.displayLogs = () => {
            const logsDiv = modal.querySelector('#logsList');
            if (logsDiv) {
                const newLogs = getLogs();
                logsDiv.innerHTML = newLogs.map(log => `<div style="border-bottom:1px solid #ccc; padding:4px;">
                    <span style="color:#666;">${log.timestamp}</span> 
                    <strong style="color:${log.type==='error'?'red':log.type==='warn'?'orange':'green'}">[${log.type}]</strong> 
                    ${log.message}
                    ${log.data ? `<span style="color:#888;"> ${JSON.stringify(log.data)}</span>` : ''}
                </div>`).join('');
            }
        };
    }

    function init() {
        // Логируем запуск приложения с системной информацией
        const sysInfo = getSystemInfo();
        log(`Приложение запущено. ОС: ${sysInfo.os}, язык: ${sysInfo.language}, экран: ${sysInfo.screen}`, 'info', sysInfo);
        
        // Стартуем мониторинг сети
        startNetworkMonitoring();
        
        // Захватываем события пользователя
        captureEvents();
        
        // Подписываемся на изменения состояния
        unsubscribe = AppState.subscribe((newState) => {
            // Логируем только важные изменения (например, создание/удаление трактов)
            // Для простоты логируем все изменения, но можно фильтровать
            log('Состояние обновлено', 'info', { viewMode: newState.viewMode, pathsCount: newState.paths.length });
        });
        
        // Добавляем кнопку просмотра логов в раздел управления (если ещё не добавлена)
        const manageContent = document.getElementById('manageContent');
        if (manageContent && !document.getElementById('showLogsBtn')) {
            const btn = document.createElement('button');
            btn.id = 'showLogsBtn';
            btn.className = 'btn-secondary';
            btn.innerHTML = '<i class="fas fa-history"></i><span> Показать логи</span>';
            btn.addEventListener('click', showLogsModal);
            const buttonsContainer = manageContent.querySelector('.manage-buttons');
            if (buttonsContainer) {
                buttonsContainer.appendChild(btn);
            } else {
                manageContent.appendChild(btn);
            }
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
        if (networkMonitorInterval) clearInterval(networkMonitorInterval);
    }

    return { init, destroy, getLogs, clearLogs, showLogsModal };
})();
