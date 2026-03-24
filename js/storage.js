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
        const fileName = `sputnik-studio_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Проект экспортирован в файл ${fileName}`);
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
                        // Обновляем состояние
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
                        // Обновляем DOM элементы видео/сети
                        const settings = data.globalSettings;
                        document.getElementById('resolutionSidebar').value = settings.resolution;
                        document.getElementById('chromaSidebar').value = settings.chroma;
                        document.getElementById('fpsSidebar').value = settings.fps;
                        document.getElementById('colorSpace').value = settings.colorSpace;
                        document.getElementById('bitDepth').value = settings.bitDepth;
                        document.getElementById('globalCable').value = settings.cable;
                        document.getElementById('globalMulticast').checked = settings.multicast;
                        document.getElementById('globalQoS').checked = settings.qos;
                        document.getElementById('networkType').value = settings.networkType;
                        document.getElementById('syncProtocol').value = settings.syncProtocol;
                        document.getElementById('redundancy').checked = settings.redundancy;

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
            <!DOCTYPE html>
            <html>
            <head><title>Отчёт Sputnik Studio</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2563eb; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                th { background: #f0f0f0; }
                .section { margin-bottom: 30px; }
            </style>
            </head>
            <body>
            <h1>Sputnik Studio – Отчёт по проекту</h1>
            <p>Дата: ${new Date().toLocaleString()}</p>
            <div class="section">
                <h2>Видеонастройки</h2>
                <p>Разрешение: ${state.globalSettings.resolution}</p>
                <p>Субдискретизация: ${state.globalSettings.chroma}</p>
                <p>FPS: ${state.globalSettings.fps}</p>
                <p>Цветовое пространство: ${state.globalSettings.colorSpace}</p>
                <p>Глубина цвета: ${state.globalSettings.bitDepth} бит</p>
            </div>
            <div class="section">
                <h2>Сетевые настройки</h2>
                <p>Среда: ${state.globalSettings.cable}</p>
                <p>Multicast: ${state.globalSettings.multicast ? 'Вкл' : 'Выкл'}</p>
                <p>QoS: ${state.globalSettings.qos ? 'Вкл' : 'Выкл'}</p>
                <p>Тип сети: ${state.globalSettings.networkType}</p>
                <p>Синхронизация: ${state.globalSettings.syncProtocol}</p>
                <p>Резервирование: ${state.globalSettings.redundancy ? 'Да' : 'Нет'}</p>
            </div>
            <div class="section">
                <h2>Тракты (${state.paths.length})</h2>
                ${state.paths.map(path => `
                    <h3>${path.name}</h3>
                    <p><strong>Источники:</strong> ${path.sourceDevices.map(d => d.name).join(', ') || '—'}</p>
                    <p><strong>Приёмники:</strong> ${path.sinkDevices.map(d => d.name).join(', ') || '—'}</p>
                `).join('')}
            </div>
            <div class="section">
                <h2>LED-конфигурация</h2>
                <p>Режим: ${state.ledConfig.activeMode}</p>
                <p>Размер экрана: ${state.ledConfig.width_m.toFixed(2)}×${state.ledConfig.height_m.toFixed(2)} м</p>
                <p>Разрешение: ${state.ledConfig.resW}×${state.ledConfig.resH}</p>
                <p>Площадь: ${state.ledConfig.area.toFixed(2)} м²</p>
                <p>Мощность: ${Math.round(state.ledConfig.power)} Вт</p>
            </div>
            <div class="section">
                <h2>Акустические настройки</h2>
                <p>Активный режим: ${state.soundConfig.activeMode}</p>
                <p>Чувствительность: ${state.soundConfig.sensitivity} дБ</p>
                <p>Мощность источника: ${state.soundConfig.sourcePower} Вт</p>
                <p>Расстояние: ${state.soundConfig.distance} м</p>
                <p>RT60: ${state.soundConfig.roomVolume} м³, α=${state.soundConfig.avgAbsorption}</p>
            </div>
            <div class="section">
                <h2>ВКС</h2>
                <p>Активный режим: ${state.vcConfig.activeMode}</p>
                <p>Кодек: ${state.vcConfig.codecPreset}</p>
                <p>Разрешение: ${state.vcConfig.resolution}</p>
                <p>Участников: ${state.vcConfig.participants}</p>
            </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    function resetProject() {
        if (confirm('Сбросить все данные? Текущий проект будет удалён.')) {
            // Сброс состояния к начальному
            const newState = {
                globalSettings: {
                    resolution: '4K',
                    chroma: '422',
                    fps: 60,
                    colorSpace: 'YCbCr',
                    bitDepth: 10,
                    cable: 'Cat6',
                    multicast: false,
                    qos: false,
                    networkType: 'managed',
                    syncProtocol: 'ptp',
                    redundancy: false
                },
                paths: [],
                projectSwitches: [],
                ledConfig: {
                    activeMode: 'cabinets',
                    pitchIndex: 0,
                    cabinetPreset: '600x337.5',
                    cabinetWidth: 600,
                    cabinetHeight: 337.5,
                    cabinetsW: 1,
                    cabinetsH: 1,
                    targetResolution: 'fhd',
                    customResW: 1920,
                    customResH: 1080,
                    stitchedScreenId: null,
                    stitchCountW: 2,
                    stitchCountH: 1,
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
                    activeMode: 'codec',
                    codecPreset: 'trueconf',
                    resolution: '1080p',
                    fps: 30,
                    participants: 2,
                    multipointParticipants: 4
                },
                nextPathId: 1,
                nextSwitchId: 1,
                activePathId: null,
                viewMode: 'single'
            };
            AppState.setState(newState);
            // Обновляем DOM элементы видео/сети
            document.getElementById('resolutionSidebar').value = newState.globalSettings.resolution;
            document.getElementById('chromaSidebar').value = newState.globalSettings.chroma;
            document.getElementById('fpsSidebar').value = newState.globalSettings.fps;
            document.getElementById('colorSpace').value = newState.globalSettings.colorSpace;
            document.getElementById('bitDepth').value = newState.globalSettings.bitDepth;
            document.getElementById('globalCable').value = newState.globalSettings.cable;
            document.getElementById('globalMulticast').checked = newState.globalSettings.multicast;
            document.getElementById('globalQoS').checked = newState.globalSettings.qos;
            document.getElementById('networkType').value = newState.globalSettings.networkType;
            document.getElementById('syncProtocol').value = newState.globalSettings.syncProtocol;
            document.getElementById('redundancy').checked = newState.globalSettings.redundancy;

            Utils.updateAllShortNames(newState);
            alert('Проект сброшен');
        }
    }

    function init() {
        // Загрузка сохранённого проекта при старте, если есть
        const savedProject = localStorage.getItem('sputnik_studio_project');
        if (savedProject && confirm('Обнаружен сохранённый проект. Загрузить его?')) {
            try {
                const data = JSON.parse(savedProject);
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
                // Обновляем DOM
                const settings = data.globalSettings;
                document.getElementById('resolutionSidebar').value = settings.resolution;
                document.getElementById('chromaSidebar').value = settings.chroma;
                document.getElementById('fpsSidebar').value = settings.fps;
                document.getElementById('colorSpace').value = settings.colorSpace;
                document.getElementById('bitDepth').value = settings.bitDepth;
                document.getElementById('globalCable').value = settings.cable;
                document.getElementById('globalMulticast').checked = settings.multicast;
                document.getElementById('globalQoS').checked = settings.qos;
                document.getElementById('networkType').value = settings.networkType;
                document.getElementById('syncProtocol').value = settings.syncProtocol;
                document.getElementById('redundancy').checked = settings.redundancy;
                Utils.updateAllShortNames(AppState.getState());
                alert('Проект загружен из браузера');
            } catch(e) {
                console.error(e);
            }
        } else {
            // Если нет сохранённого, создаём дефолтный тракт
            const state = AppState.getState();
            if (state.paths.length === 0) {
                const newPath = { id: state.nextPathId++, name: `Тракт ${state.nextPathId - 1}`, sourceDevices: [], sinkDevices: [] };
                state.paths.push(newPath);
                AppState.setState({ activePathId: newPath.id });
            }
        }

        // Подписка на изменения (можно не делать, но оставим для совместимости)
        unsubscribe = AppState.subscribe(() => {});

        // Обработчики кнопок управления
        document.getElementById('saveToBrowserBtn').addEventListener('click', saveToLocalStorage);
        document.getElementById('exportJsonBtn').addEventListener('click', exportToJson);
        document.getElementById('importJsonBtn').addEventListener('click', importFromJson);
        document.getElementById('printReportBtnSidebar').addEventListener('click', printReport);
        document.getElementById('resetProjectBtn').addEventListener('click', () => {
            const resetModal = document.getElementById('resetModal');
            if (resetModal) resetModal.style.display = 'flex';
        });
        document.getElementById('wikiBtnSidebar').addEventListener('click', () => {
            window.open('wiki.html', '_blank');
        });

        // Модалка сброса
        const resetModal = document.getElementById('resetModal');
        const closeResetModal = document.getElementById('closeResetModal');
        const cancelResetBtn = document.getElementById('cancelResetBtn');
        const confirmResetBtn = document.getElementById('confirmResetBtn');
        const saveBeforeResetBtn = document.getElementById('saveBeforeResetBtn');

        if (closeResetModal) closeResetModal.addEventListener('click', () => resetModal.style.display = 'none');
        if (cancelResetBtn) cancelResetBtn.addEventListener('click', () => resetModal.style.display = 'none');
        if (confirmResetBtn) confirmResetBtn.addEventListener('click', () => {
            resetModal.style.display = 'none';
            resetProject();
        });
        if (saveBeforeResetBtn) saveBeforeResetBtn.addEventListener('click', () => {
            saveToLocalStorage();
            resetModal.style.display = 'none';
            resetProject();
        });
        window.addEventListener('click', e => { if (e.target === resetModal) resetModal.style.display = 'none'; });
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
    }

    return { init, destroy };
})();
