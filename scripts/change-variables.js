(function() {
    'use strict';

    // Check if the plugin is already running to prevent duplicates
    if (document.getElementById('scratch-var-controller')) {
        console.warn("Variable Setter Plugin is already active.");
        return;
    }
    
    // --- Core Logic ---
    let intervalId = null;
    let availableTargets = [];
    const UPDATE_INTERVAL = 1; 
    const VARIABLE_TYPES = ['', 'my cloud variable', 'cloud', 'list'];

    const ID_CONTROLLER = 'scratch-var-controller';
    const ID_TARGET_SELECT = 'scratch-target-select';
    const ID_VAR_NAME = 'scratch-var-name';
    const ID_VAR_VALUE = 'scratch-var-value';
    const ID_STATUS = 'scratch-var-status';
    const ID_START_BTN = 'scratch-var-start';
    const ID_STOP_BTN = 'scratch-var-stop';

    function updateStatus(message, statusClass) {
        const statusElement = document.getElementById(ID_STATUS);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-message'; 
            statusElement.classList.add(statusClass);
        }
    }  

    function findVariable(targetObj, varName) {
        if (!targetObj || !varName) return null;

        const variables = targetObj.variables;
        let foundVar = null;

        for (const varId in variables) {
            const currentVar = variables[varId];

            if (currentVar.name === varName && VARIABLE_TYPES.includes(currentVar.type)) {
                foundVar = currentVar;
                break;
            }
        }
        return foundVar;
    }

    function updateVariable(targetId, varName, value) {
        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;

        if (!targetObj) {
            updateStatus("Error: Selected sprite/stage object not found.", 'status-error');
            stopLoop();
            return;
        }

        const foundVar = findVariable(targetObj, varName);
        
        if (foundVar) {
            foundVar.value = value;
            const targetName = targetObj.isStage ? "Stage" : targetObj.getName();
            updateStatus(`[${targetName}] Setting '${varName}' to: ${value}`, 'status-active');
        } else {
            updateStatus(`Variable '${varName}' not found on target '${targetObj.getName() || "Stage"}'. Stopping.`, 'status-error');
            stopLoop();
        }
    }

    window.stopScratchSetterLoop = function() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        const startBtn = document.getElementById(ID_START_BTN);
        const stopBtn = document.getElementById(ID_STOP_BTN);
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        updateStatus("Loop Stopped. Ready for new input.", 'status-ready');
    };

    window.startScratchSetterLoop = function() {
        const targetId = document.getElementById(ID_TARGET_SELECT).value;
        const varName = document.getElementById(ID_VAR_NAME).value;
        const value = parseFloat(document.getElementById(ID_VAR_VALUE).value);
        
        if (isNaN(value) || !varName) {
            updateStatus("Please enter a valid number and variable name.", 'status-ready');
            return;
        }

        window.stopScratchSetterLoop();
        
        intervalId = setInterval(() => {
            updateVariable(targetId, varName, value);
        }, UPDATE_INTERVAL);

        document.getElementById(ID_START_BTN).disabled = true;
        document.getElementById(ID_STOP_BTN).disabled = false;
        updateStatus(`Loop Active: Setting '${varName}' to ${value} every ${UPDATE_INTERVAL}ms.`, 'status-active');
    };

    // --- Setup Functions ---
    function getAvailableTargets(vm) {
        const targets = [];
        for (const target of vm.runtime.targets) {
            if (target.isStage || target.isOriginal) {
                targets.push({
                    id: target.id,
                    name: target.isStage ? "Stage (Global Variables)" : target.getName(),
                    targetObj: target
                });
            }
        }
        return targets;
    }

    function injectControlPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #${ID_CONTROLLER} { position: fixed; bottom: 20px; right: 20px; z-index: 10000; background-color: white; padding: 15px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); width: 320px; font-family: Arial, sans-serif; }
            .scratch-var-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; color: #4f46e5; }
            .input-group-tm { margin-bottom: 10px; }
            .input-label-tm { display: block; font-size: 12px; margin-bottom: 3px; color: #333; }
            .input-field-tm, .select-field-tm { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
            .button-group-tm { display: flex; gap: 10px; margin-bottom: 10px; }
            .btn-tm { flex-grow: 1; padding: 8px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; }
            #${ID_START_BTN} { background-color: #4f46e5; color: white; }
            #${ID_START_BTN}:hover:not(:disabled) { background-color: #4338ca; }
            #${ID_STOP_BTN} { background-color: #ef4444; color: white; }
            #${ID_STOP_BTN}:hover:not(:disabled) { background-color: #dc2626; }
            .btn-tm:disabled { opacity: 0.5; cursor: not-allowed; }
            .status-message { padding: 5px; border-left: 3px solid; font-size: 12px; border-radius: 4px; }
            .status-ready { background-color: #fffbeb; border-color: #facc15; color: #92400e; }
            .status-active { background-color: #f0fff4; border-color: #34d399; color: #065f46; }
            .status-error { background-color: #fef2f2; border-color: #f87171; color: #b91c1c; }
        `;
        document.head.appendChild(style);

        // --- 2. Define HTML and Populate Dropdown ---
        availableTargets = getAvailableTargets(window.vm);

        const targetOptions = availableTargets.map(t => 
            `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
        ).join('');


        const html = `
            <div class="scratch-var-title">Variable Setter</div>

            <div class="input-group-tm">
                <label for="${ID_TARGET_SELECT}" class="input-label-tm">1. Select Target (Sprite or Stage):</label>
                <select id="${ID_TARGET_SELECT}" class="select-field-tm">${targetOptions}</select>
            </div>
            
            <div class="input-group-tm">
                <label for="${ID_VAR_NAME}" class="input-label-tm">2. Variable Name (E.g., Day Night):</label>
                <input type="text" id="${ID_VAR_NAME}" value="Day Night" class="input-field-tm">
            </div>

            <div class="input-group-tm">
                <label for="${ID_VAR_VALUE}" class="input-label-tm">3. Value to Set:</label>
                <input type="number" id="${ID_VAR_VALUE}" value="1" step="0.01" class="input-field-tm">
            </div>

            <div class="button-group-tm">
                <button id="${ID_START_BTN}" class="btn-tm" onclick="startScratchSetterLoop()">Start Setting</button>
                <button id="${ID_STOP_BTN}" class="btn-tm" onclick="stopScratchSetterLoop()" disabled>Stop</button>
            </div>
            
            <div id="${ID_STATUS}" class="status-message status-ready">
                Ready. Select target and variable name.
            </div>
        `;

        const container = document.createElement('div');
        container.id = ID_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);

        window.stopScratchSetterLoop();
    }

    function checkVMReady() {
        if (typeof window.vm !== 'undefined' && window.vm.runtime && window.vm.runtime.targets.length > 0) {
            injectControlPanel();
        } else {
            setTimeout(checkVMReady, 500);
        }
    }
    checkVMReady();

})();
