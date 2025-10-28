(function() {
    'use strict';

    document.removeEventListener("contextmenu", e => e.preventDefault());
    document.onkeydown = null;

    const ID_MAIN_CONTROLLER = 'eg-main-controller';
    if (document.getElementById(ID_MAIN_CONTROLLER)) {
        return;
    }

    const VARIABLE_TYPES = ['', 'my cloud variable', 'cloud', 'list'];
    const MEGA_VALUE = 9999999999999;
    const DEFAULT_HEALTH_VALUE = 10;
    const PLAYER_HEALTH_VAR = "Player Health";
    const PLAYER_MAX_HEALTH_VAR = "Player Max Health";

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let availableTargets = [];

    let EG_MegaHealthLoopData = {
        isActive: false,
        targetId: null,
        varName: null,
        value: null
    };
    let EG_VariableSetterLoopData = {
        isActive: false,
        targetId: null,
        varName: null,
        value: null
    };

    function EG_dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_MAIN_CONTROLLER);
        if (!controller) return;

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = EG_closeDragElement;
        document.onmousemove = EG_elementDrag;
    }

    function EG_elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        const controller = document.getElementById(ID_MAIN_CONTROLLER);
        if (!controller) return;

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        controller.style.top = (controller.offsetTop - pos2) + "px";
        controller.style.left = (controller.offsetLeft - pos1) + "px";
    }

    function EG_closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function EG_updateStatus(tabId, message, statusClass) {
        const statusElement = document.getElementById(`eg-status-${tabId}`);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'eg-status-message';
            statusElement.classList.add(statusClass);
        }
    }

    function EG_findVariable(targetObj, varName) {
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

    function EG_getAvailableTargets(vm) {
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

    window.EG_openTab = function(tabName) {
        const tabContent = document.getElementsByClassName("eg-tab-content");
        for (let i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }

        const tabLinks = document.getElementsByClassName("eg-tab-link");
        for (let i = 0; i < tabLinks.length; i++) {
            tabLinks[i].classList.remove("active");
        }

        document.getElementById(tabName).style.display = "block";
        event.currentTarget.classList.add("active");

        EG_updateStatus('inventory', "Ready. Select target and set list item.", 'status-ready');
        EG_updateStatus('health', "Ready. Press ACTIVATE to enable God Mode.", 'status-ready');
        EG_updateStatus('variable', "Ready. Enter details and start loop.", 'status-ready');
    };

    window.EG_toggleMinimize = function() {
        const content = document.getElementById('eg-tab-container');
        const controller = document.getElementById(ID_MAIN_CONTROLLER);
        const button = document.querySelector(`#eg-header .eg-minimize-btn`);

        if (content.style.display === 'none') {
            content.style.display = 'block';
            controller.style.width = '320px';
            button.textContent = '—';
            const activeTab = document.querySelector('.eg-tab-link.active');
            if (activeTab) {
                const targetId = activeTab.getAttribute('onclick').match(/'(.*)'/)[1];
                document.getElementById(targetId).style.display = 'block';
            }
        } else {
            content.style.display = 'none';
            controller.style.width = 'fit-content';
            button.textContent = '◻';
        }
    };


    function EG_findList(targetObj, listName) {
        if (!targetObj || !listName) return null;
        const variables = targetObj.variables;

        for (const varId in variables) {
            const currentVar = variables[varId];
            if (currentVar.name === listName && currentVar.type === 'list') {
                return currentVar;
            }
        }
        return null;
    }

    window.EG_setItemInList = function() {
        const targetId = document.getElementById('eg-inv-target-select').value;
        const listName = document.getElementById('eg-inv-list-name').value;
        const index = parseInt(document.getElementById('eg-inv-index').value);
        const value = document.getElementById('eg-inv-value').value;

        if (!listName || isNaN(index) || index < 1) {
            EG_updateStatus('inventory', "Please enter a list name and a valid index (starting at 1).", 'status-ready');
            return;
        }

        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;

        if (!targetObj) {
            EG_updateStatus('inventory', "Error: Target object not found.", 'status-error');
            return;
        }

        const foundList = EG_findList(targetObj, listName);

        if (foundList) {
            const listData = foundList.value;
            const targetName = targetObj.isStage ? "Stage" : targetObj.getName();

            if (index > listData.length) {
                EG_updateStatus('inventory', `Error: Index ${index} is out of bounds for list '${listName}' (Length: ${listData.length}).`, 'status-error');
                return;
            }

            listData[index - 1] = value;
            EG_updateStatus('inventory', `[${targetName}] Set list '${listName}' index ${index} to: "${value}"`, 'status-active');
        } else {
            EG_updateStatus('inventory', `Error: List '${listName}' not found in target.`, 'status-error');
        }
    };

    function EG_setSpecificVariable(targetId, varName, value) {
        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;

        if (!targetObj) {
            EG_updateStatus('health', "Error: Target object not found.", 'status-error');
            return false;
        }

        const foundVar = EG_findVariable(targetObj, varName);

        if (foundVar) {
            foundVar.value = value;
            return true;
        } else {
            if (EG_MegaHealthLoopData.isActive) {
                EG_updateStatus('health', `Error: Variable '${varName}' not found in target.`, 'status-error');
                window.EG_stopMegaHealth();
            }
            return false;
        }
    }

    function EG_continuousMegaHealthLoop() {
        if (!EG_MegaHealthLoopData.isActive) return;

        EG_setSpecificVariable(EG_MegaHealthLoopData.targetId, EG_MegaHealthLoopData.varName, EG_MegaHealthLoopData.value);

        setTimeout(EG_continuousMegaHealthLoop, 0);
    }

    window.EG_stopMegaHealth = function() {
        const loopData = EG_MegaHealthLoopData;
        if (loopData.isActive) {
            loopData.isActive = false;
        }

        const mainTarget = availableTargets.find(t => t.name === "Player");
        const targetId = mainTarget ? mainTarget.id : null;

        if (targetId) {
            EG_setSpecificVariable(targetId, PLAYER_MAX_HEALTH_VAR, DEFAULT_HEALTH_VALUE);
            EG_setSpecificVariable(targetId, PLAYER_HEALTH_VAR, DEFAULT_HEALTH_VALUE);
        }

        const startBtn = document.getElementById('eg-health-start-btn');
        const stopBtn = document.getElementById('eg-health-stop-btn');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        EG_updateStatus('health', `God Mode Stopped. Health reset to ${DEFAULT_HEALTH_VALUE}.`, 'status-ready');
    };

    window.EG_startMegaHealth = function() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            EG_updateStatus('health', "Error: Scratch VM not accessible.", 'status-error');
            return;
        }

        const mainTarget = availableTargets.find(t => t.name === "Player");
        if (!mainTarget) {
            EG_updateStatus('health', "Error: Sprite 'Player' not found. Please check name.", 'status-error');
            return;
        }
        const targetId = mainTarget.id;

        window.EG_stopMegaHealth();

        for (let i = 0; i < 3; i++) {
            if (!EG_setSpecificVariable(targetId, PLAYER_MAX_HEALTH_VAR, MEGA_VALUE)) {
                return;
            }
        }

        const loopData = EG_MegaHealthLoopData;
        loopData.isActive = true;
        loopData.targetId = targetId;
        loopData.varName = PLAYER_HEALTH_VAR;
        loopData.value = MEGA_VALUE;

        EG_continuousMegaHealthLoop();

        document.getElementById('eg-health-start-btn').disabled = true;
        document.getElementById('eg-health-stop-btn').disabled = false;
        EG_updateStatus('health', `Infinite Health Active. Max Health: ${MEGA_VALUE.toLocaleString()}`, 'status-active');
    };

    function EG_updateVariable(targetId, varName, value) {
        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;

        if (!targetObj) {
            EG_updateStatus('variable', "Error: Target object not found.", 'status-error');
            return;
        }

        const foundVar = EG_findVariable(targetObj, varName);

        if (foundVar) {
            foundVar.value = value;
            const targetName = targetObj.isStage ? "Stage (Global Variables)" : targetObj.getName();
            EG_updateStatus('variable', `[${targetName}] Setting '${varName}' to: ${value}`, 'status-active');
        } else {
            EG_updateStatus('variable', `Variable '${varName}' not found. Check name/target.`, 'status-error');
            window.EG_stopVariableLoop();
        }
    }

    function EG_continuousSetterLoop() {
        if (!EG_VariableSetterLoopData.isActive) return;

        EG_updateVariable(EG_VariableSetterLoopData.targetId, EG_VariableSetterLoopData.varName, EG_VariableSetterLoopData.value);

        setTimeout(EG_continuousSetterLoop, 0);
    }

    window.EG_stopVariableLoop = function() {
        if (EG_VariableSetterLoopData.isActive) {
            EG_VariableSetterLoopData.isActive = false;
        }

        const startBtn = document.getElementById('eg-var-start-btn');
        const stopBtn = document.getElementById('eg-var-stop-btn');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        EG_updateStatus('variable', "Loop Stopped. Ready for new input.", 'status-ready');
    };

    window.EG_startVariableLoop = function() {
        const targetId = document.getElementById('eg-target-select').value;
        const varName = document.getElementById('eg-var-name').value;
        const value = document.getElementById('eg-var-value').value;
        let parsedValue;

        if (!varName) {
            EG_updateStatus('variable', "Please enter a variable name.", 'status-ready');
            return;
        }

        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
            parsedValue = value;
        }

        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            EG_updateStatus('variable', "Error: Scratch VM not accessible.", 'status-error');
            return;
        }

        window.EG_stopVariableLoop();

        const loopData = EG_VariableSetterLoopData;
        loopData.isActive = true;
        loopData.targetId = targetId;
        loopData.varName = varName;
        loopData.value = parsedValue;

        EG_continuousSetterLoop();

        document.getElementById('eg-var-start-btn').disabled = true;
        document.getElementById('eg-var-stop-btn').disabled = false;
        EG_updateStatus('variable', `Loop Active: Setting '${varName}' to: ${parsedValue}`, 'status-active');
    };

    function EG_injectControlPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #${ID_MAIN_CONTROLLER} {
                position: fixed; bottom: 20px; right: 20px; z-index: 10001;
                background-color: #f7f7f7; padding: 0; border: 1px solid #ccc;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                width: 320px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #eg-header {
                padding: 8px 15px; background-color: #3b82f6; color: white;
                font-size: 16px; font-weight: bold; cursor: move;
                border-top-left-radius: 8px; border-top-right-radius: 8px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #eg-header .eg-minimize-btn {
                background: none; border: none; color: white; font-size: 18px;
                cursor: pointer; padding: 0 5px; line-height: 1;
            }
            #eg-tab-links {
                display: flex; background-color: #e5e7eb; border-bottom: 1px solid #ccc;
            }
            .eg-tab-link {
                flex-grow: 1; padding: 10px 0; text-align: center; cursor: pointer;
                font-size: 13px; font-weight: 600; color: #4b5563; border-bottom: 3px solid transparent;
                transition: background-color 0.2s, color 0.2s;
            }
            .eg-tab-link:hover {
                background-color: #d1d5db;
            }
            .eg-tab-link.active {
                background-color: #f7f7f7;
                color: #3b82f6;
                border-bottom: 3px solid #3b82f6;
            }
            .eg-tab-content {
                padding: 15px; display: none;
            }
            .input-group-tm { margin-bottom: 12px; }
            .input-label-tm { display: block; font-size: 12px; margin-bottom: 3px; color: #333; font-weight: 600; }
            .input-field-tm, .select-field-tm { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
            .button-group-tm { display: flex; gap: 10px; margin-bottom: 10px; }
            .btn-tm { flex-grow: 1; padding: 10px; border: none; border-radius: 4px; font-weight: 700; cursor: pointer; transition: background-color 0.15s; }
            #eg-inv-set-btn { background-color: #2563eb; color: white; }
            #eg-inv-set-btn:hover:not(:disabled) { background-color: #1d4ed8; }
            #eg-health-start-btn { background-color: #10b981; color: white; }
            #eg-health-start-btn:hover:not(:disabled) { background-color: #059669; }
            #eg-health-stop-btn { background-color: #ef4444; color: white; }
            #eg-health-stop-btn:hover:not(:disabled) { background-color: #dc2626; }
            #eg-var-start-btn { background-color: #4f46e5; color: white; }
            #eg-var-start-btn:hover:not(:disabled) { background-color: #4338ca; }
            #eg-var-stop-btn { background-color: #ef4444; color: white; }
            #eg-var-stop-btn:hover:not(:disabled) { background-color: #dc2626; }
            .btn-tm:disabled { opacity: 0.5; cursor: not-allowed; }
            .eg-status-message { padding: 8px; border-left: 3px solid; font-size: 12px; border-radius: 4px; margin-top: 5px;}
            .status-ready { background-color: #fffbeb; border-color: #facc15; color: #92400e; }
            .status-active { background-color: #ecfdf5; border-color: #34d399; color: #065f46; }
            .status-error { background-color: #fef2f2; border-color: #f87171; color: #b91c1c; }
        `;
        document.head.appendChild(style);

        if (typeof window.vm === 'undefined' || !window.vm.runtime || window.vm.runtime.targets.length === 0) {
            return;
        }

        availableTargets = EG_getAvailableTargets(window.vm);

        const targetOptions = availableTargets.map(t =>
            `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
        ).join('');

        const html = `
            <div id="eg-header">
                <span>Everything GUI</span>
                <button class="eg-minimize-btn" onclick="EG_toggleMinimize()">—</button>
            </div>
            <div id="eg-tab-container">
                <div id="eg-tab-links">
                    <a class="eg-tab-link active" onclick="EG_openTab('tab-inventory')">Inventory Editor</a>
                    <a class="eg-tab-link" onclick="EG_openTab('tab-health')">God Mode</a>
                    <a class="eg-tab-link" onclick="EG_openTab('tab-variable')">Variable Setter</a>
                </div>

                <div id="tab-inventory" class="eg-tab-content" style="display: block;">
                    <div class="input-group-tm">
                        <label for="eg-inv-target-select" class="input-label-tm">1. Target Sprite/Stage:</label>
                        <select id="eg-inv-target-select" class="select-field-tm">${targetOptions}</select>
                    </div>

                    <div class="input-group-tm">
                        <label for="eg-inv-list-name" class="input-label-tm">2. List Name (E.g., Inventory):</label>
                        <input type="text" id="eg-inv-list-name" value="Inventory" class="input-field-tm">
                    </div>

                    <div class="input-group-tm" style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label for="eg-inv-index" class="input-label-tm">3. Index (1-based):</label>
                            <input type="number" id="eg-inv-index" value="1" min="1" class="input-field-tm">
                        </div>
                        <div style="flex: 2;">
                            <label for="eg-inv-value" class="input-label-tm">4. Value to Set:</label>
                            <input type="text" id="eg-inv-value" placeholder="Item Name or Number..." class="input-field-tm">
                        </div>
                    </div>

                    <div class="button-group-tm">
                        <button id="eg-inv-set-btn" class="btn-tm" onclick="EG_setItemInList()">Set List Item</button>
                    </div>

                    <div id="eg-status-inventory" class="eg-status-message status-ready">
                        Ready. Select target and set list item.
                    </div>
                </div>

                <div id="tab-health" class="eg-tab-content">
                    <p style="font-size: 14px; margin-bottom: 10px; color: #333;">
                        Requires variables named **"${PLAYER_HEALTH_VAR}"** and **"${PLAYER_MAX_HEALTH_VAR}"** in a sprite named **"Player"**.
                        <br/>
                        &bull; Max Health set to **${MEGA_VALUE.toLocaleString()}**
                        <br/>
                        &bull; (Your health is continuously set to the Max value btw).
                    </p>

                    <div class="button-group-tm">
                        <button id="eg-health-start-btn" class="btn-tm" onclick="EG_startMegaHealth()">ACTIVATE GOD MODE</button>
                        <button id="eg-health-stop-btn" class="btn-tm" onclick="EG_stopMegaHealth()" disabled>STOP & RESET</button>
                    </div>

                    <div id="eg-status-health" class="eg-status-message status-ready">
                        Ready. Press ACTIVATE to enable God Mode.
                    </div>
                </div>

                <div id="tab-variable" class="eg-tab-content">
                    <div class="input-group-tm">
                        <label for="eg-target-select" class="input-label-tm">1. Select Target (Sprite or Stage):</label>
                        <select id="eg-target-select" class="select-field-tm">${targetOptions}</select>
                    </div>

                    <div class="input-group-tm">
                        <label for="eg-var-name" class="input-label-tm">2. Variable Name (Case-Sensitive):</label>
                        <input type="text" id="eg-var-name" value="Score" class="input-field-tm">
                    </div>

                    <div class="input-group-tm">
                        <label for="eg-var-value" class="input-label-tm">3. Value to Set:</label>
                        <input type="text" id="eg-var-value" value="9999" placeholder="Enter number or text here..." class="input-field-tm">
                    </div>

                    <div class="button-group-tm">
                        <button id="eg-var-start-btn" class="btn-tm" onclick="EG_startVariableLoop()">Start Setting</button>
                        <button id="eg-var-stop-btn" class="btn-tm" onclick="EG_stopVariableLoop()" disabled>Stop</button>
                    </div>

                    <div id="eg-status-variable" class="eg-status-message status-ready">
                        Ready. Enter details and start loop.
                    </div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.id = ID_MAIN_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);

        document.getElementById('eg-header').onmousedown = EG_dragMouseDown;

        window.EG_stopMegaHealth();
        window.EG_stopVariableLoop();
    }

    function EG_checkVMReady() {
        if (typeof window.vm !== 'undefined' && window.vm.runtime && window.vm.runtime.targets.length > 0) {
            EG_injectControlPanel();
        } else {
            if (typeof hasLoadedMod !== 'undefined' && hasLoadedMod === true) {
                setTimeout(() => {
                    hasLoadedMod = false;
                }, 500);
            }
            if (typeof hasLoadedTexturePack !== 'undefined' && hasLoadedTexturePack === true) {
                setTimeout(() => {
                    hasLoadedTexturePack = false;
                }, 500);
            }

            setTimeout(EG_checkVMReady, 500);
        }
    }

    EG_checkVMReady();

})();
