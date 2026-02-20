// Update v2

(function() {
    'use strict';

    const ID_LDL_CONTROLLER = 'scratch-ldl-controller';
    if (document.getElementById(ID_LDL_CONTROLLER)) {
        console.warn("List Data Loader Plugin is already active. Returning.");
        return;
    }

    const VARIABLE_TYPES = ['', 'my cloud variable', 'cloud', 'list'];

    const ID_LDL_HEADER = 'scratch-ldl-header';
    const ID_LDL_CONTENT = 'scratch-ldl-content';
    const ID_LDL_TARGET_SELECT = 'scratch-ldl-target-select';
    const ID_LDL_LIST_NAME = 'scratch-ldl-list-name';
    const ID_LDL_STATUS = 'scratch-ldl-status';
    const ID_LDL_LOAD_FILE = 'scratch-ldl-load-file';
    const ID_LDL_SAVE_FILE = 'scratch-ldl-save-file';
    const ID_LDL_FILE_INPUT = 'scratch-ldl-file-input';

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let availableTargets = [];

    function LDL_dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_LDL_CONTROLLER); 
        if (!controller) return;

        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.onmouseup = LDL_closeDragElement;
        document.onmousemove = LDL_elementDrag;
    }

    function LDL_elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        const controller = document.getElementById(ID_LDL_CONTROLLER); 
        if (!controller) return;

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        controller.style.top = (controller.offsetTop - pos2) + "px";
        controller.style.left = (controller.offsetLeft - pos1) + "px";
    }

    function LDL_closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function LDL_updateStatus(message, statusClass) {
        const statusElement = document.getElementById(ID_LDL_STATUS);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'status-message'; 
            statusElement.classList.add(statusClass);
        }
    }

    function LDL_findList(targetObj, listName) {
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

    function LDL_findListInAllTargets(listName) {
        let listDetails = { listVar: null, targetId: null, targetName: null };
        for (const target of availableTargets) {
            const listVar = LDL_findList(target.targetObj, listName);
            if (listVar) {
                listDetails.listVar = listVar;
                listDetails.targetId = target.id;
                listDetails.targetName = target.name;
                break;
            }
        }
        return listDetails;
    }

    function LDL_getListDetails(targetId, listName) {
        const targetObj = availableTargets.find(t => t.id === targetId)?.targetObj;
        if (!targetObj) return null;
        const listVar = LDL_findList(targetObj, listName);
        if (!listVar) return null;
        return { listVar, targetObj };
    }

    window.LDL_handleLoadFile = function() {
        document.getElementById(ID_LDL_FILE_INPUT).click();
    };

    function LDL_handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const textData = e.target.result;
                LDL_loadListIntoVM(textData);
            } catch (error) {
                LDL_updateStatus(`Error reading file: ${error.message}`, 'status-error');
            }
        };
        reader.onerror = function(e) {
            LDL_updateStatus(`Error reading file: ${e.target.error}`, 'status-error');
        };
        reader.readAsText(file);
        document.getElementById(ID_LDL_FILE_INPUT).value = ''; 
    }

    function LDL_loadListIntoVM(textData) {
        const targetId = document.getElementById(ID_LDL_TARGET_SELECT).value;
        const listName = document.getElementById(ID_LDL_LIST_NAME).value.trim();

        if (!listName) {
            LDL_updateStatus("Error: List name is required.", 'status-error');
            return;
        }

        const details = LDL_getListDetails(targetId, listName);

        if (!details) {
            const found = LDL_findListInAllTargets(listName);
            if (found.listVar) {
                 LDL_updateStatus(`List '${listName}' found in sprite '${found.targetName}'. Please select that target.`, 'status-error');
            } else {
                 LDL_updateStatus(`List '${listName}' not found in any available target.`, 'status-error');
            }
            return;
        }
        
        if (typeof textData !== 'string') {
            LDL_updateStatus("Error: File content is not a valid text string.", 'status-error');
            return;
        }

        const newListArray = textData.split(/\r?\n/).map(item => String(item).trim()).filter(item => item.length > 0);
        details.listVar.value = newListArray;
        LDL_updateStatus(`List '${listName}' (${newListArray.length} items) loaded silently into ${details.targetObj.getName()} from TXT file.`, 'status-success');
    }

    window.LDL_handleSaveFile = function() {
        const targetId = document.getElementById(ID_LDL_TARGET_SELECT).value;
        const listName = document.getElementById(ID_LDL_LIST_NAME).value.trim();

        if (!listName) {
            LDL_updateStatus("Error: List name is required.", 'status-error');
            return;
        }

        const details = LDL_getListDetails(targetId, listName);

        if (!details) {
            const found = LDL_findListInAllTargets(listName);
            if (found.listVar) {
                 LDL_updateStatus(`List '${listName}' found in sprite '${found.targetName}'. Please select that target.`, 'status-error');
            } else {
                 LDL_updateStatus(`List '${listName}' not found in any available target.`, 'status-error');
            }
            return;
        }

        const listData = details.listVar.value;
        const textString = listData.join('\n'); 
        
        const blob = new Blob([textString], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${listName}_list_data.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        LDL_updateStatus(`List '${listName}' (${listData.length} items) saved silently to TXT file.`, 'status-ready');
    };
    
    window.LDL_toggleMinimize = function() {
        const content = document.getElementById(ID_LDL_CONTENT);
        const controller = document.getElementById(ID_LDL_CONTROLLER);
        const button = document.querySelector(`#${ID_LDL_HEADER} .minimize-btn`);
        
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

    function LDL_getAvailableTargets(vm) {
        const targets = [];
        for (const target of vm.runtime.targets) {
            if (target.isStage || target.isOriginal) {
                targets.push({
                    id: target.id,
                    name: target.isStage ? "Stage (Global Lists)" : target.getName(),
                    targetObj: target
                });
            }
        }
        return targets;
    }

    function LDL_injectControlPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #${ID_LDL_CONTROLLER} { 
                position: fixed; bottom: 20px; right: 20px; z-index: 10002; 
                background-color: #2d3748; padding: 0; border: 1px solid #4a5568;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                width: 320px; font-family: 'Inter', sans-serif; color: #e2e8f0;
            }
            #${ID_LDL_HEADER} {
                padding: 8px 15px; background-color: #1a202c; color: white; 
                font-size: 16px; font-weight: bold; cursor: move; 
                border-top-left-radius: 8px; border-top-right-radius: 8px;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid #4a5568;
            }
            #${ID_LDL_HEADER} .minimize-btn {
                background: none; border: none; color: white; font-size: 18px;
                cursor: pointer; padding: 0 5px; line-height: 1;
            }
            #${ID_LDL_CONTENT} {
                padding: 15px;
            }
            .input-group-ldl { margin-bottom: 12px; }
            .input-label-ldl { display: block; font-size: 12px; margin-bottom: 4px; color: #a0aec0; }
            .input-field-ldl, .select-field-ldl { width: 100%; padding: 8px; background-color: #1a202c; border: 1px solid #4a5568; border-radius: 4px; font-size: 14px; box-sizing: border-box; color: #e2e8f0; }
            .button-group-ldl { display: flex; gap: 10px; margin-bottom: 10px; }
            .btn-ldl { flex-grow: 1; padding: 10px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; color: white;}
            
            #${ID_LDL_LOAD_FILE} { background-color: #48bb78; }
            #${ID_LDL_LOAD_FILE}:hover:not(:disabled) { background-color: #38a169; }
            
            #${ID_LDL_SAVE_FILE} { background-color: #4299e1; }
            #${ID_LDL_SAVE_FILE}:hover:not(:disabled) { background-color: #3182ce; }
            
            .btn-ldl:disabled { opacity: 0.5; cursor: not-allowed; }
            .status-message { padding: 8px; border-left: 3px solid; font-size: 12px; border-radius: 4px; margin-top: 10px; }
            .status-ready { background-color: #2d3748; border-color: #ecc94b; color: #f6ad55; }
            .status-success { background-color: #2f855a; border-color: #68d391; color: #e6fffa; }
            .status-error { background-color: #c53030; border-color: #fc8181; color: #fed7d7; }
        `;
        document.head.appendChild(style);

        if (typeof window.vm === 'undefined' || !window.vm.runtime || window.vm.runtime.targets.length === 0) {
            console.error("Scratch VM not ready for panel injection.");
            return;
        }

        availableTargets = LDL_getAvailableTargets(window.vm);

        const targetOptions = availableTargets.map(t => 
            `<option value="${t.id}" style="background-color: #1a202c; color: #e2e8f0;" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
        ).join('');

        const html = `
            <div id="${ID_LDL_HEADER}" class="scratch-ldl-title" onmousedown="LDL_dragMouseDown(event)">
                <span>List Data Loader</span>
                <button class="minimize-btn" onclick="LDL_toggleMinimize()">—</button>
            </div>
            <div id="${ID_LDL_CONTENT}">
                <div class="input-group-ldl">
                    <label for="${ID_LDL_TARGET_SELECT}" class="input-label-ldl">1. List Owner (Sprite/Stage):</label>
                    <select id="${ID_LDL_TARGET_SELECT}" class="select-field-ldl">${targetOptions}</select>
                </div>
                
                <div class="input-group-ldl">
                    <label for="${ID_LDL_LIST_NAME}" class="input-label-ldl">2. List Name (e.g., _Level):</label>
                    <input type="text" id="${ID_LDL_LIST_NAME}" value="" placeholder="Enter list name..." class="input-field-ldl">
                </div>

                <div class="button-group-ldl">
                    <button id="${ID_LDL_LOAD_FILE}" class="btn-ldl" onclick="LDL_handleLoadFile()">Load Data (From File)</button>
                    <button id="${ID_LDL_SAVE_FILE}" class="btn-ldl" onclick="LDL_handleSaveFile()">Save Data (To File)</button>
                </div>
                
                <div id="${ID_LDL_STATUS}" class="status-message status-ready">
                    Ready. Enter list details to load or save a TXT file.
                </div>
                
                <input type="file" id="${ID_LDL_FILE_INPUT}" style="display: none;" accept=".txt">
            </div>
        `;

        const container = document.createElement('div');
        container.id = ID_LDL_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);
        
        document.getElementById(ID_LDL_FILE_INPUT).addEventListener('change', LDL_handleFileSelect);
    }

    function LDL_checkVMReady() {
        if (typeof window.vm !== 'undefined' && window.vm.runtime && window.vm.runtime.targets.length > 0) {
            LDL_injectControlPanel();
        } else {
            setTimeout(LDL_checkVMReady, 500);
        }
    }

    LDL_checkVMReady();

})();
