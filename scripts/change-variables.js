(function() {
    'use strict';

    const ID_CONTROLLER = 'scratch-var-controller';
    if (document.getElementById(ID_CONTROLLER)) {
        console.warn("Variable Setter Plugin is already active. Returning.");
        return;
    }

    const VARIABLE_TYPES = ['', 'my cloud variable', 'cloud', 'list'];

    const ID_HEADER = 'scratch-var-header';
    const ID_CONTENT = 'scratch-var-content';
    const ID_TARGET_SELECT = 'scratch-target-select';
    const ID_VAR_NAME = 'scratch-var-name';
    const ID_VAR_VALUE = 'scratch-var-value';
    const ID_STATUS = 'scratch-var-status';
    const ID_START_BTN = 'scratch-var-start';
    const ID_STOP_BTN = 'scratch-var-stop';

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    let loopData = {
        isActive: false,
        targetId: null,
        varName: null,
        value: null
    };
    let availableTargets = [];

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_CONTROLLER); 
        if (!controller) return;

        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        const controller = document.getElementById(ID_CONTROLLER); 
        if (!controller) return;

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        controller.style.top = (controller.offsetTop - pos2) + "px";
        controller.style.left = (controller.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

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
            updateStatus("Error: Target object not found.", 'status-error');
            return;
        }

        const foundVar = findVariable(targetObj, varName);
        
        if (foundVar) {
            foundVar.value = value;
            const targetName = targetObj.isStage ? "Stage" : targetObj.getName();
            updateStatus(`[${targetName}] Setting '${varName}' to: ${value}`, 'status-active');
        } else {
            updateStatus(`Variable '${varName}' not found. Check name/target.`, 'status-error');
            window.Setter_stopLoop(); 
        }
    }
    
    function continuousSetterLoop() {
        if (!loopData.isActive) return;

        updateVariable(loopData.targetId, loopData.varName, loopData.value);

        setTimeout(continuousSetterLoop, 0);
    }

    window.Setter_stopLoop = function() {
        if (loopData.isActive) {
            loopData.isActive = false;
        }
        
        const startBtn = document.getElementById(ID_START_BTN);
        const stopBtn = document.getElementById(ID_STOP_BTN);
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        updateStatus("Loop Stopped. Ready for new input.", 'status-ready');
    };

    window.Setter_startLoop = function() {
        const targetId = document.getElementById(ID_TARGET_SELECT).value;
        const varName = document.getElementById(ID_VAR_NAME).value;
        const value = parseFloat(document.getElementById(ID_VAR_VALUE).value);
        
        if (isNaN(value) || !varName) {
            updateStatus("Please enter a valid number and variable name.", 'status-ready');
            return;
        }
        
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
             updateStatus("Error: Scratch VM not accessible.", 'status-error');
             return;
        }

        window.Setter_stopLoop();

        loopData.isActive = true;
        loopData.targetId = targetId;
        loopData.varName = varName;
        loopData.value = value;
        
        continuousSetterLoop();

        document.getElementById(ID_START_BTN).disabled = true;
        document.getElementById(ID_STOP_BTN).disabled = false;
        updateStatus(`Loop Active: Setting '${varName}'. `, 'status-active');
    };
    
    window.Setter_toggleMinimize = function() {
        const content = document.getElementById(ID_CONTENT);
        const controller = document.getElementById(ID_CONTROLLER);
        const button = document.querySelector(`#${ID_HEADER} .minimize-btn`);
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            controller.style.width = '320px';
            button.textContent = '—';
        } else {
            content.style.display = 'none';
            controller.style.width = 'fit-content';
            button.textContent = '◻';
        }
    };

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
            #${ID_CONTROLLER} { 
                position: fixed; bottom: 20px; right: 20px; z-index: 10000;
                background-color: #f7f7f7; padding: 0; border: 1px solid #ccc;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                width: 320px; font-family: Arial, sans-serif;
            }
            #${ID_HEADER} {
                padding: 8px 15px; background-color: #4f46e5; color: white;
                font-size: 16px; font-weight: bold; cursor: move; 
                border-top-left-radius: 8px; border-top-right-radius: 8px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #${ID_HEADER} .minimize-btn {
                background: none; border: none; color: white; font-size: 18px;
                cursor: pointer; padding: 0 5px; line-height: 1;
            }
            #${ID_CONTENT} {
                padding: 15px;
            }
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

        if (typeof window.vm === 'undefined' || !window.vm.runtime || window.vm.runtime.targets.length === 0) {
            console.error("Scratch VM not ready for panel injection.");
            return;
        }

        availableTargets = getAvailableTargets(window.vm);

        const targetOptions = availableTargets.map(t => 
            `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
        ).join('');


        const html = `
            <div id="${ID_HEADER}" class="scratch-var-title">
                <span>Scratch Variable Setter</span>
                <button class="minimize-btn" onclick="Setter_toggleMinimize()">—</button>
            </div>
            <div id="${ID_CONTENT}">
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
                    <input type="number" id="${ID_VAR_VALUE}" value="" step="0.01" placeholder="Enter number here..." class="input-field-tm">
                </div>

                <div class="button-group-tm">
                    <button id="${ID_START_BTN}" class="btn-tm" onclick="Setter_startLoop()">Start Setting</button>
                    <button id="${ID_STOP_BTN}" class="btn-tm" onclick="Setter_stopLoop()" disabled>Stop</button>
                </div>
                
                <div id="${ID_STATUS}" class="status-message status-ready">
                    Ready. Enter value and start loop.
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.id = ID_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);
        
        document.getElementById(ID_HEADER).onmousedown = dragMouseDown;

        window.Setter_stopLoop();
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
