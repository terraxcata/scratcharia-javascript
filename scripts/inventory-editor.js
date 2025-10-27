(function() {
'use strict';

const ID_CONTROLLER = 'inventory-editor-controller';
if (document.getElementById(ID_CONTROLLER)) return;

const ID_HEADER = 'inventory-editor-header';
const ID_CONTENT = 'inventory-editor-content';
const ID_TARGET_SELECT = 'inventory-target-select';
const ID_LIST_NAME = 'inventory-list-name';
const ID_TABLE_CONTAINER = 'inventory-table-container';
const ID_LOAD_BTN = 'inventory-load-btn';
const ID_SAVE_BTN = 'inventory-save-btn';
const ID_ADD_BTN = 'inventory-add-btn';
const ID_STATUS = 'inventory-editor-status';
const ID_MAX_CAPACITY = 'inventory-max-capacity';
const ID_SHOW_ALL_BTN = 'inventory-show-all-btn';
const ID_ALL_ITEMS_MODAL = 'inventory-all-items-modal';

let dynamicItemMap = {};

function getItemName(id) {
    const numericId = parseInt(id);
    if (isNaN(numericId) || numericId < 0) return 'Invalid ID';
    if (numericId === 0) return 'Empty Slot (ID 0)';

    if (dynamicItemMap[numericId]) {
        return dynamicItemMap[numericId];
    }
    
    return `Item ID ${numericId} (Unknown/Missing Costume)`;
}

window.updateItemName = function(inputElement) {
    const id = inputElement.value;
    const nameElement = inputElement.closest('tr').querySelector('.item-name-display');
    if (nameElement) {
        nameElement.textContent = getItemName(id);
    }
};

let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
let availableTargets = [];
let currentListVar = null;

function updateStatus(message, statusClass) {
    const statusElement = document.getElementById(ID_STATUS);
    if (statusElement) {
        statusElement.textContent = message;
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

function loadCostumeMap(vm) {
    const tilesTarget = vm.runtime.targets.find(t => t.getName() === 'Tiles' && t.isOriginal);
    dynamicItemMap = {};

    if (!tilesTarget) {
        console.warn("Tiles sprite not found. Item names will only show 'Unknown/Missing Costume'.");
        return;
    }

    const costumes = tilesTarget.sprite.costumes;
    costumes.forEach((costume, index) => {
        const id = index + 1;
        dynamicItemMap[id] = costume.name;
    });

    console.log(`Loaded ${Object.keys(dynamicItemMap).length} items from 'Tiles' costumes.`);
}

function addRow(id = '0', amount = '0') {
    const tableBody = document.querySelector(`#${ID_TABLE_CONTAINER} tbody`);
    if (!tableBody) return;

    const name = getItemName(id);

    const row = tableBody.insertRow();
    row.innerHTML = `
        <td class="td-tm item-id-col">
            <input type="number" class="input-table-tm" value="${id}" min="0" oninput="updateItemName(this)">
        </td>
        <td class="td-tm item-name-col">
            <span class="item-name-display">${name}</span>
        </td>
        <td class="td-tm amount-col">
            <input type="number" class="input-table-tm" value="${amount}" min="0">
        </td>
        <td class="td-tm delete-col"><button class="btn-delete-tm" onclick="this.closest('tr').remove()">X</button></td>
    `;
}

window.loadInventory = function() {
    if (typeof window.vm === 'undefined' || !window.vm.runtime) {
        return updateStatus("Error: Scratch VM not accessible.", 'status-error');
    }

    const targetId = document.getElementById(ID_TARGET_SELECT).value;
    const listName = document.getElementById(ID_LIST_NAME).value.trim();
    const tableBody = document.querySelector(`#${ID_TABLE_CONTAINER} tbody`);

    const target = availableTargets.find(t => t.id === targetId);
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
        
        currentListVar = null;
        let errorMessage = `List **'${listName}'** not found in target **'${target.name}'**.`;
        if (foundElsewhere) {
            errorMessage += ` It seems to exist in the **'${foundElsewhere}'** sprite. Please select that target in the dropdown above.`;
        }
        return updateStatus(errorMessage, 'status-error');
    }

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    const listContent = listVar.value;
    currentListVar = listVar;
    document.getElementById(ID_MAX_CAPACITY).value = listContent.length;

    let activeSlots = 0;
    let foundNonZero = false;

    for (let i = listContent.length - 1; i >= 0; i--) {
        if (listContent[i].toString() !== '0' && listContent[i].toString() !== '') {
            foundNonZero = true;
            activeSlots = Math.ceil((i + 1) / 2);
            break;
        }
    }

    if (!foundNonZero) {
        activeSlots = 0;
    }

    for (let i = 0; i < activeSlots * 2; i += 2) {
        const id = listContent[i] || '0';
        const amount = listContent[i + 1] || '0';
        if (id.toString() !== '0' || amount.toString() !== '0' || activeSlots > 0) {
            addRow(id.toString(), amount.toString());
        }
    }

    updateStatus(`Loaded '${listName}'. Max Slots: ${listContent.length / 2}. **Editing Live Data.**`, 'status-active');

};

window.saveInventory = function() {
    if (!currentListVar) {
        return updateStatus("Please load a list before attempting to save.", 'status-ready');
    }

    const maxCapacity = parseInt(document.getElementById(ID_MAX_CAPACITY).value);
    if (isNaN(maxCapacity) || maxCapacity <= 0) {
        return updateStatus("Internal Error: Max capacity not set.", 'status-error');
    }

    const rows = document.querySelectorAll(`#${ID_TABLE_CONTAINER} tbody tr`);
    let newContent = [];

    rows.forEach(row => {
        const idInput = row.querySelector('.item-id-col input');
        const amountInput = row.querySelector('.amount-col input');

        if (idInput && amountInput) {
            const id = parseInt(idInput.value.trim());
            const amount = parseInt(amountInput.value.trim());

            if (!isNaN(id) && !isNaN(amount)) {
                newContent.push(id.toString());
                newContent.push(amount.toString());
            }
        }
    });

    while (newContent.length < maxCapacity) {
        newContent.push('0');
    }

    if (newContent.length > maxCapacity) {
        newContent = newContent.slice(0, maxCapacity);
    }

    currentListVar.value = newContent;

    updateStatus(`Successfully saved ${newContent.length / 2} pairs. Changes applied **instantly** to the live VM data.`, 'status-active');
};

window.addItemRow = function() {
    addRow('0', '1');
}

function generateItemListTableHtml(filterQuery = '') {
    const query = filterQuery.toLowerCase().trim();
    let html = `
        <table class="item-list-table-tm">
            <thead>
                <tr><th style="width: 25%;">ID</th><th>Item Name (Costume)</th></tr>
            </thead>
            <tbody>
    `;

    if ('empty slot (id 0)'.includes(query) || '0'.includes(query) || query === '') {
        html += `<tr><td>0</td><td>Empty Slot (ID 0)</td></tr>`;
    }

    const sortedIds = Object.keys(dynamicItemMap).map(Number).sort((a, b) => a - b);
    
    sortedIds.forEach(id => {
        if (id > 0) {
            const name = dynamicItemMap[id];
            const nameLower = name.toLowerCase();
            const idString = id.toString();

            if (query === '' || nameLower.includes(query) || idString.includes(query)) {
                html += `<tr><td>${id}</td><td>${name}</td></tr>`;
            }
        }
    });

    html += `
            </tbody>
        </table>
    `;
    return html;
}

window.filterAllItems = function(query) {
    const modal = document.getElementById(ID_ALL_ITEMS_MODAL);
    const content = modal.querySelector('.modal-content-tm');
    content.innerHTML = generateItemListTableHtml(query);
};

window.showAllItems = function() {
    const modal = document.getElementById(ID_ALL_ITEMS_MODAL);
    const content = modal.querySelector('.modal-content-tm');

    content.innerHTML = generateItemListTableHtml();

    const searchInput = document.getElementById('item-search-input-tm');
    if (searchInput) {
        searchInput.value = '';
    }

    modal.style.display = 'flex';
};

window.closeAllItemsModal = function() {
    document.getElementById(ID_ALL_ITEMS_MODAL).style.display = 'none';
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
        controller.style.width = '420px';
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
        loadCostumeMap(window.vm);
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
            width: 420px; 
            font-family: sans-serif;
        }
        #${ID_HEADER} {
            padding: 8px 15px; 
            background-color: #22c55e; 
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
        
        .table-container-tm { max-height: 250px; overflow-y: auto; border: 1px solid #444; border-radius: 4px; margin-bottom: 10px; }
        .table-tm { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; color: #e0e0e0; }
        .table-tm thead { position: sticky; top: 0; background-color: #383838; z-index: 10; }
        .th-tm { padding: 5px 8px; text-align: left; border-bottom: 2px solid #22c55e; }
        .td-tm { padding: 2px 4px; border-bottom: 1px solid #444; vertical-align: middle; }
        
        .item-id-col { width: 20%; }
        .item-name-col { width: 45%; }
        .amount-col { width: 20%; }
        .delete-col { width: 15%; text-align: center; }

        .input-table-tm { 
            width: 100%; padding: 4px; 
            border: 1px solid #555; 
            border-radius: 3px; 
            font-size: 13px; 
            text-align: center;
            background-color: #3d3d3d; 
            color: white;
        }
        .item-name-display { display: block; padding: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;}
        
        .button-group-tm { display: flex; gap: 10px; margin-top: 10px; margin-bottom: 10px; }
        .btn-tm { flex-grow: 1; padding: 8px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; color: white; }
        
        #${ID_LOAD_BTN} { background-color: #f59e0b; } 
        #${ID_LOAD_BTN}:hover:not(:disabled) { background-color: #d97706; }
        #${ID_SAVE_BTN} { background-color: #2563eb; } 
        #${ID_SAVE_BTN}:hover:not(:disabled) { background-color: #1e40af; }
        #${ID_ADD_BTN} { background-color: #10b981; }
        #${ID_ADD_BTN}:hover:not(:disabled) { background-color: #059669; }
        #${ID_SHOW_ALL_BTN} { background-color: #9333ea; }
        #${ID_SHOW_ALL_BTN}:hover:not(:disabled) { background-color: #7e22ce; }
        .btn-delete-tm { background-color: #dc2626; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 12px; }
        
        .status-message { padding: 5px; border-left: 3px solid; font-size: 12px; border-radius: 4px; margin-top: 10px;}
        .status-ready { background-color: #333322; border-color: #facc15; color: #facc15; }
        .status-active { background-color: #223322; border-color: #34d399; color: #34d399; }
        .status-error { background-color: #332222; border-color: #f87171; color: #f87171; }

        #${ID_ALL_ITEMS_MODAL} {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 500px;
            max-height: 80vh;
            background-color: #1e1e1e;
            border: 2px solid #22c55e;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.8);
            z-index: 20000;
            display: none;
            flex-direction: column;
        }
        .modal-header-tm {
            padding: 10px 15px;
            background-color: #22c55e;
            color: white;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }
        .modal-search-tm {
            padding: 0 15px 10px 15px;
            background-color: #2d2d2d;
        }
        #item-search-input-tm {
            width: 100%; 
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            background-color: #3d3d3d;
            color: white;
        }
        .modal-content-tm {
            padding: 15px;
            overflow-y: auto;
            color: #e0e0e0;
        }
        .modal-close-btn-tm {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
        .item-list-table-tm {
            width: 100%;
            border-collapse: collapse;
        }
        .item-list-table-tm th, .item-list-table-tm td {
            padding: 5px;
            border-bottom: 1px solid #444;
            text-align: left;
        }
        .item-list-table-tm th {
            background-color: #3d3d3d;
        }
        .item-list-table-tm tr:hover {
            background-color: #282828;
        }
    `;
    document.head.appendChild(style);

    const targetOptions = availableTargets.map(t =>
        `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
    ).join('');

    const initialStatus = 'Ready to edit live list data.';

    const html = `
        <div id="${ID_HEADER}">
            <span>Inventory Editor (Live)</span>
            <button class="minimize-btn" onclick="toggleMinimize()">—</button>
        </div>
        <div id="${ID_CONTENT}">
            
            <input type="hidden" id="${ID_MAX_CAPACITY}" value="0">
            <div class="input-group-tm">
                <label for="${ID_TARGET_SELECT}" class="input-label-tm">1. Target (Sprite/Stage):</label>
                <select id="${ID_TARGET_SELECT}" class="select-field-tm">${targetOptions}</select>
            </div>
            
            <div class="input-group-tm">
                <label for="${ID_LIST_NAME}" class="input-label-tm">2. List Name (E.g., Inventory):</label>
                <input type="text" id="${ID_LIST_NAME}" value="Inventory" class="input-field-tm">
            </div>
            
            <div class="button-group-tm">
                <button id="${ID_LOAD_BTN}" class="btn-tm" onclick="loadInventory()">Load List</button>
            </div>

            <div class="input-group-tm">
                <label class="input-label-tm">3. Edit Inventory Slots:</label>
            </div>

            <div class="button-group-tm">
                <button id="${ID_ADD_BTN}" class="btn-tm" onclick="addItemRow()">+ Add Item</button>
                <button id="${ID_SHOW_ALL_BTN}" class="btn-tm" onclick="showAllItems()">Show All Items</button>
            </div>
            
            <div id="${ID_TABLE_CONTAINER}" class="table-container-tm">
                <table class="table-tm">
                    <thead>
                        <tr>
                            <th class="th-tm item-id-col">ID</th>
                            <th class="th-tm item-name-col">Item Name</th>
                            <th class="th-tm amount-col">Qty</th>
                            <th class="th-tm delete-col">Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        
                    </tbody>
                </table>
            </div>
            
            <div class="button-group-tm">
                <button id="${ID_SAVE_BTN}" class="btn-tm" onclick="saveInventory()">Save Changes to Game</button>
            </div>
            
            <div id="${ID_STATUS}" class="status-message status-ready">
                ${initialStatus}
            </div>
        </div>
        <div id="${ID_ALL_ITEMS_MODAL}" style="display: none;">
            <div class="modal-header-tm">
                All Available Item IDs
                <button class="modal-close-btn-tm" onclick="closeAllItemsModal()">×</button>
            </div>
            <div class="modal-search-tm">
                <input type="text" id="item-search-input-tm" class="input-field-tm" placeholder="Search by ID or Name..." oninput="filterAllItems(this.value)">
            </div>
            <div class="modal-content-tm">
                <!-- Item list content goes here -->
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
