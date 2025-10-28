(function() {
    'use strict';

    const ID_MH_CONTROLLER = 'scratch-mh-controller';
    if (document.getElementById(ID_MH_CONTROLLER)) {
        console.warn("Infinite Health Setter Plugin is already active. Returning.");
        return;
    }

    const VARIABLE_TYPES = ['', 'my cloud variable', 'cloud', 'list'];
    
    const ID_MH_HEADER = 'scratch-mh-header';
    const ID_MH_CONTENT = 'scratch-mh-content';
    const ID_MH_STATUS = 'scratch-mh-status';
    const ID_MH_START_BTN = 'scratch-mh-start';
    const ID_MH_STOP_BTN = 'scratch-mh-stop';

    const PLAYER_HEALTH_VAR = "Player Health";
    const PLAYER_MAX_HEALTH_VAR = "Player Max Health";
    const MEGA_VALUE = 9999999999999;
    const DEFAULT_VALUE = 10;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let targetId = null;
    let targetName = null;
    let availableTargets = [];
    
    let loopData = {
        isActive: false,
        targetId: null,
        varName: null,
        value: null
    };

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_MH_CONTROLLER); 
        if (!controller) return;

        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        const controller = document.getElementById(ID_MH_CONTROLLER); 
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
        const statusElement = document.getElementById(ID_MH_STATUS);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-message'; 
            statusElement.classList.add(statusClass);
        }
    }

    function findVariable(targetObj, varName) {
        if (!targetObj || !varName) return null;
        const variables = targetObj.variables;

        for (const varId in variables) {
            const currentVar = variables[varId];
            if (currentVar.name === varName && VARIABLE_TYPES.includes(currentVar.type)) {
                return currentVar;
            }
        }
        return null;
    }

    function setSpecificVariable(targetId, varName, value) {
        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;

        if (!targetObj) {
            updateStatus("Error: Target object not found.", 'status-error');
            return false;
        }

        const foundVar = findVariable(targetObj, varName);
        
        if (foundVar) {
            foundVar.value = value;
            return true;
        } else {
            updateStatus(`Error: Variable '${varName}' not found in target.`, 'status-error');
            window.MH_stopMegaHealth(); 
            return false;
        }
    }

    function continuousSetterLoop() {
        if (!loopData.isActive) return;

        setSpecificVariable(loopData.targetId, loopData.varName, loopData.value);

        setTimeout(continuousSetterLoop, 0);
    }

    window.MH_stopMegaHealth = function() {
        if (loopData.isActive) {
            loopData.isActive = false;
        }
        
        if (targetId) {
            setSpecificVariable(targetId, PLAYER_MAX_HEALTH_VAR, DEFAULT_VALUE);
            setSpecificVariable(targetId, PLAYER_HEALTH_VAR, DEFAULT_VALUE);
        }

        const startBtn = document.getElementById(ID_MH_START_BTN);
        const stopBtn = document.getElementById(ID_MH_STOP_BTN);
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        updateStatus(`God Mode Stopped. Health reset to ${DEFAULT_VALUE}.`, 'status-ready');
    };

    window.MH_startMegaHealth = function() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime || !targetId) {
             updateStatus("Error: Scratch VM or Player Sprite not accessible.", 'status-error');
             return;
        }

        window.MH_stopMegaHealth();

        for (let i = 0; i < 3; i++) {
            if (!setSpecificVariable(targetId, PLAYER_MAX_HEALTH_VAR, MEGA_VALUE)) {
                 return;
            }
        }
        
        loopData.isActive = true;
        loopData.targetId = targetId;
        loopData.varName = PLAYER_HEALTH_VAR;
        loopData.value = MEGA_VALUE;
        
        continuousSetterLoop();

        document.getElementById(ID_MH_START_BTN).disabled = true;
        document.getElementById(ID_MH_STOP_BTN).disabled = false;
        updateStatus(`Infinite Health Active. Max Health: ${MEGA_VALUE}`, 'status-active');
    };
    
    window.MH_toggleMinimize = function() {
        const content = document.getElementById(ID_MH_CONTENT);
        const controller = document.getElementById(ID_MH_CONTROLLER);
        const button = document.querySelector(`#${ID_MH_HEADER} .minimize-btn`);
        
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
                    name: target.isStage ? "Stage" : target.getName(),
                    targetObj: target
                });
            }
        }
        return targets;
    }

    function injectControlPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #${ID_MH_CONTROLLER} { 
                position: fixed; bottom: 20px; right: 20px; z-index: 10001; 
                background-color: #f7f7f7; padding: 0; border: 1px solid #ccc;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                width: 320px; font-family: Arial, sans-serif;
            }
            #${ID_MH_HEADER} {
                padding: 8px 15px; background-color: #059669; color: white; 
                font-size: 16px; font-weight: bold; cursor: move; 
                border-top-left-radius: 8px; border-top-right-radius: 8px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #${ID_MH_HEADER} .minimize-btn {
                background: none; border: none; color: white; font-size: 18px;
                cursor: pointer; padding: 0 5px; line-height: 1;
            }
            #${ID_MH_CONTENT} {
                padding: 15px;
            }
            .input-group-tm { margin-bottom: 10px; }
            .button-group-tm { display: flex; gap: 10px; margin-bottom: 10px; }
            .btn-tm { flex-grow: 1; padding: 12px; border: none; border-radius: 4px; font-weight: 700; cursor: pointer; transition: background-color 0.15s; }
            #${ID_MH_START_BTN} { background-color: #10b981; color: white; } 
            #${ID_MH_START_BTN}:hover:not(:disabled) { background-color: #059669; }
            #${ID_MH_STOP_BTN} { background-color: #ef4444; color: white; }
            #${ID_MH_STOP_BTN}:hover:not(:disabled) { background-color: #dc2626; }
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
        
        const mainTarget = availableTargets.find(t => t.name === "Player");

        if (!mainTarget) {
            console.error("Scratch sprite named 'Player' not found.");
            updateStatus("Error: Sprite 'Player' not found. Please check the sprite name is exactly 'Player'.", 'status-error');
            return;
        }

        targetId = mainTarget.id;
        targetName = mainTarget.name;

        const html = `
            <div id="${ID_MH_HEADER}" class="scratch-var-title">
                <span>Infinite Health</span>
                <button class="minimize-btn" onclick="MH_toggleMinimize()">—</button>
            </div>
            <div id="${ID_MH_CONTENT}">
                <div class="input-group-tm">
                    <p style="font-size: 14px; margin-bottom: 10px; color: #333;">
                        This tool sets your health to a big ass number;
                        <br/>
                        &bull; **Player Max Health** (Set to ${MEGA_VALUE.toLocaleString()})
                        <br/>
                        &bull; **Player Health** (Loop Set to ${MEGA_VALUE.toLocaleString()})
                    </p>
                </div>

                <div class="button-group-tm">
                    <button id="${ID_MH_START_BTN}" class="btn-tm" onclick="MH_startMegaHealth()">ACTIVATE GOD MODE</button>
                    <button id="${ID_MH_STOP_BTN}" class="btn-tm" onclick="MH_stopMegaHealth()" disabled>STOP & RESET</button>
                </div>
                
                <div id="${ID_MH_STATUS}" class="status-message status-ready">
                    Ready. Press ACTIVATE to set health variables.
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.id = ID_MH_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);
        
        document.getElementById(ID_MH_HEADER).onmousedown = dragMouseDown;

        window.MH_stopMegaHealth();
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
