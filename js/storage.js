// storage.js
const StorageModule = (function() {
    let unsubscribe = null;

    function saveToLocalStorage() {
        const state = AppState.getState();
        const projectData = {
            version: '6.1.0',
            globalSettings: state.globalSettings,
            paths: state.paths,
            projectSwitches: state.projectSwitches,
            ledConfig: state.ledConfig,
            soundConfig: state.soundConfig,
            vcConfig: state.vcConfig,
            nextPathId: state.nextPathId,
            nextSwitchId: state.nextSwitchId,
            activePathId: state.activePathId,
            viewMode: state.viewMode
        };
        localStorage.setItem('sputnik_studio_project', JSON.stringify(projectData));
        alert('Проект сохранён в браузере');
    }

    function exportToJson() {
        const state = AppState.getState();
        const projectData = {
            version: '6.1.0',
            exportDate: new Date().toISOString(),
            globalSettings: state.globalSettings,
            paths: state.paths,
            projectSwitches: state.projectSwitches,
            ledConfig: state.ledConfig,
            soundConfig: state.soundConfig,
            vcConfig: state.vcConfig,
            nextPathId: state.nextPathId,
            nextSwitchId: state.nextSwitchId,
            activePathId: state.activePathId,
            viewMode: state.viewMode
        };
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sputnik-studio_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Проект экспортирован в JSON');
    }

    function importFromJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (confirm('Загрузить проект из файла? Текущий проект будет заменён.')) {
                        AppState.setState({
                            globalSettings: data.globalSettings,
                            paths: data.paths,
                            projectSwitches: data.projectSwitches,
                            ledConfig: data.ledConfig,
                            soundConfig: data.soundConfig,
                            vcConfig: data.vcConfig,
                            nextPathId: data.nextPathId,
                            nextSwitchId: data.nextSwitchId,
                            activePathId: data.activePathId,
                            viewMode: data.viewMode || 'single'
                        });
                        // Обновляем короткие имена после загрузки
                        Utils.updateAllShortNames(AppState.getState());
                        alert('Проект загружен');
                    }
                } catch(err) {
                    alert('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function printReport() {
        const state = AppState.getState();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head><title>Отчёт Sputnik Studio</title>
            <style>
                body { font-family: sans-serif; margin: 2cm; }
                h1, h2 { color: #2563eb; }
                table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #f0f0f0; }
                .summary { margin: 1em 0; }
            </style>
            </head>
            <body>
            <h1>Sputnik Studio – Отчёт проекта</h1>
            <p>Дата: ${new Date().toLocaleString()}</p>
            <h2>Общие настройки</h2>
            <p>Разрешение: ${state.globalSettings.resolution}<br>
            Субдискретизация: ${state.globalSettings.chroma}<br>
            FPS: ${state.globalSettings.fps}<br>
            Цветовое пространство: ${state.globalSettings.colorSpace}<br>
            Глубина цвета: ${state.globalSettings.bitDepth} бит</p>
            <h2>Сеть</h2>
            <p>Среда передачи: ${state.globalSettings.cable}<br>
            Multicast: ${state.globalSettings.multicast ? 'Вкл' : 'Выкл'}<br>
            QoS: ${state.globalSettings.qos ? 'Вкл' : 'Выкл'}<br>
            Тип сети: ${state.globalSettings.networkType}<br>
            Синхронизация: ${state.globalSettings.syncProtocol}<br>
            Резервирование: ${state.globalSettings.redundancy ? 'Да' : 'Нет'}</p>
            <h2>Тракты</h2>
            ${state.paths.map((path, idx) => `
                <h3>${path.name}</h3>
                <p>Источники: ${path.sourceDevices.map(d => d.name).join(', ') || '—'}<br>
                Приёмники: ${path.sinkDevices.map(d => d.name).join(', ') || '—'}</p>
            `).join('')}
            <h2>LED-экран</h2>
            <p>Режим: ${state.ledConfig.activeMode}<br>
            Размер: ${state.ledConfig.width_m.toFixed(2)}×${state.ledConfig.height_m.toFixed(2)} м<br>
            Разрешение: ${state.ledConfig.resW}×${state.ledConfig.resH}<br>
            Площадь: ${state.ledConfig.area.toFixed(2)} м²<br>
            Мощность: ${Math.round(state.ledConfig.power)} Вт</p>
            <h2>Акустика</h2>
            <p>Активный режим: ${state.soundConfig.activeMode}<br>
            Параметры: чувствительность ${state.soundConfig.sensitivity} дБ, мощность ${state.soundConfig.sourcePower} Вт, расстояние ${state.soundConfig.distance} м</p>
            <h2>ВКС</h2>
            <p>Активный режим: ${state.vcConfig.activeMode}<br>
            Платформа: ${state.vcConfig.codecPreset}, разрешение ${state.vcConfig.resolution}, FPS ${state.vcConfig.fps}</p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    function resetProject() {
        if (!confirm('Сбросить все данные? Текущий проект будет удалён.')) return;
        const defaultState = {
            globalSettings: {
                resolution: '4K', chroma: '422', fps: 60, colorSpace: 'YCbCr', bitDepth: 10,
                cable: 'Cat6', multicast: false, qos: false, networkType: 'managed', syncProtocol: 'ptp', redundancy: false
            },
            paths: [],
            projectSwitches: [],
            ledConfig: {
                activeMode: 'cabinets', pitchIndex: 0, cabinetPreset: '600x337.5', cabinetWidth: 600, cabinetHeight: 337.5,
                cabinetsW: 1, cabinetsH: 1, targetResolution: 'fhd', customResW: 1920, customResH: 1080,
                stitchedScreenId: null, stitchCountW: 2, stitchCountH: 1,
                width_m: 0, height_m: 0, resW: 0, resH: 0, area: 0, power: 0
            },
            soundConfig: {
                sensitivity: 89, sourcePower: 1, distance: 1, headroom: 9, roomGain: 3,
                sourceType: 'point', startDistance: 1, endDistance: 16,
                powerChangeFrom: 1, powerChangeTo: 2, activeMode: 'spl',
                roomVolume: 200, roomArea: 100, avgAbsorption: 0.2,
                roomLength: 10, roomWidth: 10, roomHeight: 3, speakerPower: 30, speakerSensitivity: 90, requiredSPL: 85
            },
            vcConfig: {
                activeMode: 'codec', codecPreset: 'trueconf', resolution: '1080p', fps: 30, participants: 2, multipointParticipants: 4
            },
            nextPathId: 1,
            nextSwitchId: 1,
            activePathId: null,
            viewMode: 'single'
        };
        AppState.setState(defaultState);
        // Добавляем один тракт по умолчанию
        const state = AppState.getState();
        if (state.paths.length === 0) {
            state.paths.push({ id: state.nextPathId++, name: 'Тракт 1', sourceDevices: [], sinkDevices: [] });
            state.activePathId = 1;
            AppState.setState(state);
        }
        Utils.updateAllShortNames(state);
        alert('Проект сброшен');
    }

    function init() {
        unsubscribe = AppState.subscribe((newState) => {
            // При любом изменении состояния можно автосохранять, но для производительности не будем
        });

        // Кнопки управления
        document.getElementById('saveToBrowserBtn').addEventListener('click', saveToLocalStorage);
        document.getElementById('exportJsonBtn').addEventListener('click', exportToJson);
        document.getElementById('importJsonBtn').addEventListener('click', importFromJson);
        document.getElementById('printReportBtnSidebar').addEventListener('click', printReport);
        document.getElementById('resetProjectBtn').addEventListener('click', () => {
            const modal = document.getElementById('resetModal');
            if (modal) modal.style.display = 'flex';
        });
        document.getElementById('confirmResetBtn').addEventListener('click', () => {
            resetProject();
            document.getElementById('resetModal').style.display = 'none';
        });
        document.getElementById('saveBeforeResetBtn').addEventListener('click', () => {
            saveToLocalStorage();
            resetProject();
            document.getElementById('resetModal').style.display = 'none';
        });
        document.getElementById('cancelResetBtn').addEventListener('click', () => {
            document.getElementById('resetModal').style.display = 'none';
        });
        document.getElementById('closeResetModal').addEventListener('click', () => {
            document.getElementById('resetModal').style.display = 'none';
        });

        // Wiki (заглушка)
        document.getElementById('wikiBtnSidebar').addEventListener('click', () => {
            window.open('wiki.html', '_blank');
        });

        // Восстановление из localStorage при старте
        const saved = localStorage.getItem('sputnik_studio_project');
        if (saved) {
            if (confirm('Обнаружен сохранённый проект. Загрузить его?')) {
                try {
                    const data = JSON.parse(saved);
                    AppState.setState({
                        globalSettings: data.globalSettings,
                        paths: data.paths,
                        projectSwitches: data.projectSwitches,
                        ledConfig: data.ledConfig,
                        soundConfig: data.soundConfig,
                        vcConfig: data.vcConfig,
                        nextPathId: data.nextPathId,
                        nextSwitchId: data.nextSwitchId,
                        activePathId: data.activePathId,
                        viewMode: data.viewMode || 'single'
                    });
                    Utils.updateAllShortNames(AppState.getState());
                    alert('Проект загружен из браузера');
                } catch(e) { console.error(e); }
            }
        } else {
            // Если нет сохранённого, создаём тракт по умолчанию
            const state = AppState.getState();
            if (state.paths.length === 0) {
                state.paths.push({ id: state.nextPathId++, name: 'Тракт 1', sourceDevices: [], sinkDevices: [] });
                state.activePathId = 1;
                AppState.setState(state);
            }
        }
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
