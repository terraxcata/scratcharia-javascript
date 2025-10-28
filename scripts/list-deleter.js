(function() {
'use strict';

const ID_CONTROLLER = 'list-deleter-controller';
if (document.getElementById(ID_CONTROLLER)) return;

const ID_HEADER = 'list-deleter-header';
const ID_CONTENT = 'list-deleter-content';
const ID_TARGET_SELECT = 'list-target-select';
const ID_LIST_NAME = 'list-name-input';
const ID_LOAD_BTN = 'list-load-btn';
const ID_CLEAR_BTN = 'list-clear-btn';
const ID_STATUS = 'list-status';
const ID_LIST_INFO = 'list-info-display';

let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
let availableTargets = [];
let currentListVar = null;
let currentListName = '';

function updateStatus(message, statusClass) {
    const statusElement = document.getElementById(ID_STATUS);
    if (statusElement) {
        statusElement.innerHTML = message;
        statusElement.className = 'status-message';
        statusElement.classList.add(statusClass);
    }
}

function findList(targetObj, listName) {
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

function getAvailableTargets(vm) {
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

window.loadListInfo = function() {
    if (typeof window.vm === 'undefined' || !window.vm.runtime) {
        return updateStatus("Error: Scratch VM not accessible.", 'status-error');
    }

    const targetId = document.getElementById(ID_TARGET_SELECT).value;
    const listName = document.getElementById(ID_LIST_NAME).value.trim();
    const infoDisplay = document.getElementById(ID_LIST_INFO);
    const clearButton = document.getElementById(ID_CLEAR_BTN);

    const target = availableTargets.find(t => t.id === targetId);
    
    currentListVar = null;
    currentListName = '';
    infoDisplay.textContent = 'List not loaded.';
    clearButton.disabled = true;

    if (!target || !listName) {
        return updateStatus("Please select a target and enter a list name.", 'status-ready');
    }

    let listVar = findList(target.targetObj, listName);

    if (!listVar) {
        let foundElsewhere = null;
        for (const t of availableTargets) {
            if (t.id !== targetId) {
                const foundList = findList(t.targetObj, listName);
                if (foundList) {
                    foundElsewhere = t.name;
                    break;
                }
            }
        }
        
        let errorMessage = `List **'${listName}'** not found in target **'${target.name}'**.`;
        if (foundElsewhere) {
            errorMessage += `<br>It seems to exist in the **'${foundElsewhere}'** sprite.`;
        }
        return updateStatus(errorMessage, 'status-error');
    }

    currentListVar = listVar;
    currentListName = listName;
    const length = listVar.value.length;
    
    infoDisplay.textContent = `Current List Length: ${length} items.`;
    clearButton.disabled = length === 0;

    updateStatus(`List **'${listName}'** loaded successfully.`, 'status-active');
};

window.clearList = function() {
    if (!currentListVar) {
        return updateStatus("Error: No list loaded. Please use 'Check List' first.", 'status-ready');
    }
    
    if (currentListVar.value.length === 0) {
        return updateStatus(`List **'${currentListName}'** is already empty.`, 'status-active');
    }

    currentListVar.value = []; 

    const infoDisplay = document.getElementById(ID_LIST_INFO);
    infoDisplay.textContent = 'Current List Length: 0 items.';
    document.getElementById(ID_CLEAR_BTN).disabled = true;

    updateStatus(`Successfully **DELETED ALL ${currentListName} DATA**. List is now empty.`, 'status-warning');
};

window.dragMouseDown = function(e) {
    e = e || window.event;
    e.preventDefault();
    const controller = document.getElementById(ID_CONTROLLER);
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
}

function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    const controller = document.getElementById(ID_CONTROLLER);
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

window.toggleMinimize = function() {
    const content = document.getElementById(ID_CONTENT);
    const controller = document.getElementById(ID_CONTROLLER);
    const button = document.querySelector(`#${ID_HEADER} .minimize-btn`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        controller.style.width = '350px';
        button.textContent = '—';
    } else {
        content.style.display = 'none';
        controller.style.width = 'fit-content';
        button.textContent = '◻';
    }
};

function injectControlPanel() {
    if (typeof window.vm !== 'undefined' && window.vm.runtime) {
        availableTargets = getAvailableTargets(window.vm);
    }

    const style = document.createElement('style');
    style.textContent = `
        #${ID_CONTROLLER} { 
            position: fixed; bottom: 20px; right: 20px; z-index: 10000;
            background-color: #1e1e1e;
            color: #e0e0e0;
            padding: 0; 
            border: 1px solid #333;
            border-radius: 8px; 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            width: 350px; 
            font-family: sans-serif;
        }
        #${ID_HEADER} {
            padding: 8px 15px; 
            background-color: #f87171; 
            color: white;
            font-size: 16px; 
            font-weight: bold; 
            cursor: move; 
            border-top-left-radius: 8px; 
            border-top-right-radius: 8px;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
        }
        #${ID_HEADER} .minimize-btn {
            background: none; border: none; color: white; font-size: 18px;
            cursor: pointer; padding: 0 5px; line-height: 1;
        }
        #${ID_CONTENT} {
            padding: 15px;
            background-color: #2d2d2d;
        }
        .input-group-tm { margin-bottom: 10px; }
        .input-label-tm { display: block; font-size: 12px; margin-bottom: 3px; color: #e0e0e0; font-weight: 600; }
        
        .input-field-tm, .select-field-tm { 
            width: 100%; padding: 8px; 
            border: 1px solid #555; 
            border-radius: 4px; 
            font-size: 14px; 
            box-sizing: border-box; 
            background-color: #3d3d3d; 
            color: white; 
        }
        
        .button-group-tm { display: flex; gap: 10px; margin-top: 10px; margin-bottom: 15px; }
        .btn-tm { flex-grow: 1; padding: 10px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; color: white; }
        
        #${ID_LOAD_BTN} { background-color: #3b82f6; } 
        #${ID_LOAD_BTN}:hover:not(:disabled) { background-color: #2563eb; }

        #${ID_CLEAR_BTN} { background-color: #dc2626; } 
        #${ID_CLEAR_BTN}:hover:not(:disabled) { background-color: #b91c1c; }
        #${ID_CLEAR_BTN}:disabled { background-color: #444; color: #777; cursor: not-allowed; }
        
        #${ID_LIST_INFO} {
            font-size: 14px;
            font-weight: bold;
            padding: 10px;
            background-color: #383838;
            border-radius: 4px;
            margin-bottom: 15px;
            color: #facc15;
            text-align: center;
        }

        .status-message { padding: 5px; border-left: 3px solid; font-size: 12px; border-radius: 4px; margin-top: 10px;}
        .status-ready { background-color: #333322; border-color: #facc15; color: #facc15; }
        .status-active { background-color: #223322; border-color: #34d399; color: #34d399; }
        .status-error { background-color: #332222; border-color: #f87171; color: #f87171; }
        .status-warning { background-color: #332222; border-color: #f97316; color: #f97316; }
    `;
    document.head.appendChild(style);

    const targetOptions = availableTargets.map(t =>
        `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
    ).join('');

    const initialStatus = 'Ready to find and delete list data.';

    const html = `
        <div id="${ID_HEADER}">
            <span>List Data Deleter</span>
            <button class="minimize-btn" onclick="toggleMinimize()">—</button>
        </div>
        <div id="${ID_CONTENT}">
            
            <div class="input-group-tm">
                <label for="${ID_TARGET_SELECT}" class="input-label-tm">1. Target (Sprite/Stage):</label>
                <select id="${ID_TARGET_SELECT}" class="select-field-tm">${targetOptions}</select>
            </div>
            
            <div class="input-group-tm">
                <label for="${ID_LIST_NAME}" class="input-label-tm">2. List Name (E.g., Inventory, Saves):</label>
                <input type="text" id="${ID_LIST_NAME}" value="Inventory" class="input-field-tm">
            </div>
            
            <div class="button-group-tm">
                <button id="${ID_LOAD_BTN}" class="btn-tm" onclick="loadListInfo()">Check/Refresh List</button>
            </div>

            <div id="${ID_LIST_INFO}">List not loaded.</div>

            <div class="button-group-tm">
                <button id="${ID_CLEAR_BTN}" class="btn-tm" onclick="clearList()" disabled>⚠️ Clear All List Data</button>
            </div>
            
            <div id="${ID_STATUS}" class="status-message status-ready">
                ${initialStatus}
            </div>
        </div>
    `;

    const container = document.createElement('div');
    container.id = ID_CONTROLLER;
    container.innerHTML = html;
    document.body.appendChild(container);

    document.getElementById(ID_HEADER).onmousedown = window.dragMouseDown;

    updateStatus(initialStatus, 'status-ready');

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
