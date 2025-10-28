(function() {
    'use strict';
    const ID_MAIN_CONTROLLER = 'eg-main-controller';
    if (document.getElementById(ID_MAIN_CONTROLLER)) {
        return;
    }
    const ID_HEADER = 'eg-header';
    const ID_CONTENT = 'eg-tab-container';
    const ID_STATUS_INV = 'eg-status-inventory';
    const ID_STATUS_VAR = 'eg-status-var';
    const ID_TARGET_SELECT = 'inv-target-select';
    const ID_LIST_NAME = 'inv-list-name';
    const ID_TABLE_CONTAINER = 'inv-table-container';
    const ID_LOAD_BTN = 'inv-load-btn';
    const ID_SAVE_BTN = 'inv-save-btn';
    const ID_ADD_BTN = 'inv-add-btn';
    const ID_MAX_CAPACITY = 'inv-max-capacity';
    const ID_SHOW_ALL_BTN = 'inv-show-all-btn';
    const ID_ALL_ITEMS_MODAL = 'inv-all-items-modal';
    const ID_MODAL_SEARCH_INPUT = 'item-search-input-tm';
    const ID_VAR_TARGET_SELECT = 'var-target-select';
    const ID_VAR_NAME = 'var-name-input';
    const ID_VAR_VALUE = 'var-value-input';
    const ID_VAR_LOAD_BTN = 'var-load-btn';
    const ID_VAR_SET_BTN = 'var-set-btn';
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let availableTargets = [];
    let currentListVar = null;
    let dynamicItemMap = {};
    let currentVariable = null;
    function updateStatus(message, statusId, statusClass) {
        const statusElement = document.getElementById(statusId);
        if (statusElement) {
            statusElement.innerHTML = message;
            statusElement.className = 'eg-status-message';
            statusElement.classList.add(statusClass);
        }
    }
    function getAvailableTargets(vm) {
        const targets = [];
        for (const target of vm.runtime.targets) {
            if (target.isStage || target.isOriginal) {
                targets.push({
                    id: target.id,
                    name: target.isStage ? "Stage (Global Lists/Vars)" : target.getName(),
                    targetObj: target
                });
            }
        }
        return targets;
    }
    function getItemName(id) {
        const numericId = parseInt(id);
        if (isNaN(numericId) || numericId < 0) return 'Invalid ID';
        if (numericId === 0) return 'Empty Slot (ID 0)';
        return dynamicItemMap[numericId] || `Item ID ${numericId} (Unknown/Missing Costume)`;
    }
    window.updateItemName = function(inputElement) {
        const id = inputElement.value;
        const nameElement = inputElement.closest('tr').querySelector('.item-name-display');
        if (nameElement) {
            nameElement.textContent = getItemName(id);
        }
    };
    function loadCostumeMap(vm) {
        const tilesTarget = vm.runtime.targets.find(t => t.getName() === 'Tiles' && t.isOriginal);
        dynamicItemMap = {};
        if (!tilesTarget) return;
        const costumes = tilesTarget.sprite.costumes;
        costumes.forEach((costume, index) => {
            const id = index + 1;
            dynamicItemMap[id] = costume.name;
        });
    }
    function findList(targetObj, listName) {
        if (!targetObj || !listName) return null;
        for (const varId in targetObj.variables) {
            const currentVar = targetObj.variables[varId];
            if (currentVar.name === listName && currentVar.type === 'list') {
                return currentVar;
            }
        }
        return null;
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
            return updateStatus("Error: Scratch VM not accessible.", ID_STATUS_INV, 'status-error');
        }
        const targetId = document.getElementById(ID_TARGET_SELECT).value;
        const listName = document.getElementById(ID_LIST_NAME).value.trim();
        const tableBody = document.querySelector(`#${ID_TABLE_CONTAINER} tbody`);
        const target = availableTargets.find(t => t.id === targetId);
        if (!target || !listName) {
            return updateStatus("Please select a target and enter a list name.", ID_STATUS_INV, 'status-ready');
        }
        let listVar = findList(target.targetObj, listName);
        if (!listVar) {
             return updateStatus(`List **'${listName}'** not found in target **'${target.name}'**.`, ID_STATUS_INV, 'status-error');
        }
        while (tableBody.firstChild) { tableBody.removeChild(tableBody.firstChild); }
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
        if (!foundNonZero) { activeSlots = 0; }
        for (let i = 0; i < activeSlots * 2; i += 2) {
            const id = listContent[i] || '0';
            const amount = listContent[i + 1] || '0';
            if (id.toString() !== '0' || amount.toString() !== '0' || activeSlots > 0) {
                addRow(id.toString(), amount.toString());
            }
        }
        updateStatus(`Loaded **'${listName}'**. Max Slots: ${listContent.length / 2}. **Editing Live Data.**`, ID_STATUS_INV, 'status-active');
    };
    window.saveInventory = function() {
        if (!currentListVar) {
            return updateStatus("Please load a list before attempting to save.", ID_STATUS_INV, 'status-ready');
        }
        const maxCapacity = parseInt(document.getElementById(ID_MAX_CAPACITY).value);
        if (isNaN(maxCapacity) || maxCapacity <= 0) {
            return updateStatus("Internal Error: Max capacity not set.", ID_STATUS_INV, 'status-error');
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
        while (newContent.length < maxCapacity) { newContent.push('0'); }
        if (newContent.length > maxCapacity) { newContent = newContent.slice(0, maxCapacity); }
        currentListVar.value = newContent;
        updateStatus(`Successfully saved ${newContent.length / 2} pairs to the VM.`, ID_STATUS_INV, 'status-active');
    };
    window.addItemRow = function() {
        addRow('0', '1');
    }
    function generateItemListTableHtml(filterQuery = '') {
        const query = filterQuery.toLowerCase().trim();
        let generatedHtml = `
            <table class="item-list-table-tm">
                <thead>
                    <tr><th style="width: 25%;">ID</th><th>Item Name (Costume)</th></tr>
                </thead>
                <tbody>
        `;
        if ('empty slot (id 0)'.includes(query) || '0'.includes(query) || query === '') {
            generatedHtml += `<tr><td>0</td><td>Empty Slot (ID 0)</td></tr>`;
        }
        const sortedIds = Object.keys(dynamicItemMap).map(Number).sort((a, b) => a - b);
        sortedIds.forEach(id => {
            if (id > 0) {
                const name = dynamicItemMap[id];
                const nameLower = name.toLowerCase();
                const idString = id.toString();
                if (query === '' || nameLower.includes(query) || idString.includes(query)) {
                    generatedHtml += `<tr><td>${id}</td><td>${name}</td></tr>`;
                }
            }
        });
        generatedHtml += `</tbody></table>`;
        return generatedHtml;
    }
    window.filterAllItems = function(query) {
        const modal = document.getElementById(ID_ALL_ITEMS_MODAL);
        const content = modal.querySelector('.modal-content-tm');
        content.innerHTML = generateItemListTableHtml(query);
    };
    window.refreshItemList = function() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            return updateStatus("Error: Scratch VM not accessible for item refresh.", ID_STATUS_INV, 'status-error');
        }
        loadCostumeMap(window.vm);
        const searchInput = document.getElementById(ID_MODAL_SEARCH_INPUT);
        const currentQuery = searchInput ? searchInput.value : '';
        window.filterAllItems(currentQuery);
        updateStatus(`Item list refreshed. ${Object.keys(dynamicItemMap).length} items loaded.`, ID_STATUS_INV, 'status-active');
    }
    window.showAllItems = function() {
        const modal = document.getElementById(ID_ALL_ITEMS_MODAL);
        const searchInput = document.getElementById(ID_MODAL_SEARCH_INPUT);
        if (searchInput) searchInput.value = '';
        const content = modal.querySelector('.modal-content-tm');
        content.innerHTML = generateItemListTableHtml();
        modal.style.display = 'flex';
    };
    window.closeAllItemsModal = function() {
        document.getElementById(ID_ALL_ITEMS_MODAL).style.display = 'none';
    };
    function findVariable(targetObj, varName) {
        if (!targetObj || !varName) return null;
        for (const varId in targetObj.variables) {
            const currentVar = targetObj.variables[varId];
            if (currentVar.name === varName && currentVar.type === 'variable') {
                return currentVar;
            }
        }
        return null;
    }
    window.loadVariable = function() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            return updateStatus("Error: Scratch VM not accessible.", ID_STATUS_VAR, 'status-error');
        }
        const targetId = document.getElementById(ID_VAR_TARGET_SELECT).value;
        const varName = document.getElementById(ID_VAR_NAME).value.trim();
        const valueInput = document.getElementById(ID_VAR_VALUE);
        const target = availableTargets.find(t => t.id === targetId);
        if (!target || !varName) {
            return updateStatus("Select a target and enter a variable name.", ID_STATUS_VAR, 'status-ready');
        }
        let variable = findVariable(target.targetObj, varName);
        if (!variable) {
            currentVariable = null;
            return updateStatus(`Variable **'${varName}'** not found in target **'${target.name}'**.`, ID_STATUS_VAR, 'status-error');
        }
        currentVariable = variable;
        valueInput.value = variable.value;
        updateStatus(`Loaded **'${varName}'**. Current value: **${variable.value}**.`, ID_STATUS_VAR, 'status-active');
    }
    window.setVariable = function() {
        if (!currentVariable) {
            return updateStatus("Please load a variable before attempting to set it.", ID_STATUS_VAR, 'status-ready');
        }
        const newValue = document.getElementById(ID_VAR_VALUE).value;
        const finalValue = isNaN(Number(newValue)) || newValue.trim() === '' ? newValue : Number(newValue);
        currentVariable.value = finalValue;
        updateStatus(`Set **'${currentVariable.name}'** to **${finalValue}**.`, ID_STATUS_VAR, 'status-active');
    }
    window.setGodMode = function(isGod) {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            return updateStatus("Error: Scratch VM not accessible.", 'eg-status-godmode', 'status-error');
        }
        const playerTarget = window.vm.runtime.targets.find(t => t.getName() === 'Player' && t.isOriginal);
        if (!playerTarget) {
            return updateStatus("Could not find a target named 'Player'. **God Mode failed.**", 'eg-status-godmode', 'status-error');
        }
        let hpVar = findVariable(playerTarget, 'hp');
        let statusId = 'eg-status-godmode';
        if (isGod) {
            if (hpVar) hpVar.value = 99999;
            updateStatus('**GOD MODE ACTIVATED!** Health set to max (99999).', statusId, 'status-active');
        } else {
            if (hpVar) hpVar.value = 10;
            updateStatus('**God Mode Deactivated.** Health reset to default (10).', statusId, 'status-ready');
        }
    }
    window.EG_dragMouseDown = function(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_MAIN_CONTROLLER);
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = EG_closeDragElement;
        document.onmousemove = EG_elementDrag;
    }
    function EG_elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        const controller = document.getElementById(ID_MAIN_CONTROLLER);
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
    };
    window.EG_toggleMinimize = function() {
        const content = document.getElementById(ID_CONTENT);
        const controller = document.getElementById(ID_MAIN_CONTROLLER);
        const button = document.querySelector(`#${ID_HEADER} .eg-minimize-btn`);
        if (content.style.display === 'none') {
            content.style.display = 'block';
            controller.style.width = '420px';
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
    function EG_injectControlPanel() {
        if (typeof window.vm !== 'undefined' && window.vm.runtime) {
            availableTargets = getAvailableTargets(window.vm);
            loadCostumeMap(window.vm);
        }
        const style = document.createElement('style');
        style.textContent = `
            #${ID_MAIN_CONTROLLER} { position: fixed; bottom: 20px; right: 20px; z-index: 10001; background-color: #1a202c; color: #f7f7f7; padding: 0; border: 1px solid #4a5568; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7); width: 420px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            #${ID_HEADER} { padding: 8px 15px; background-color: #2d3748; color: #63b3ed; font-size: 16px; font-weight: bold; cursor: move; border-top-left-radius: 8px; border-top-right-radius: 8px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4a5568; }
            #${ID_HEADER} .eg-minimize-btn { background: none; border: none; color: #f7f7f7; font-size: 18px; cursor: pointer; padding: 0 5px; line-height: 1; }
            #eg-tab-links { display: flex; background-color: #4a5568; border-bottom: 1px solid #4a5568; }
            .eg-tab-link { flex-grow: 1; padding: 10px 0; text-align: center; cursor: pointer; font-size: 13px; font-weight: 600; color: #cbd5e0; border-bottom: 3px solid transparent; transition: background-color 0.2s, color 0.2s; }
            .eg-tab-link.active { background-color: #1a202c; color: #63b3ed; border-bottom: 3px solid #63b3ed; }
            .eg-tab-content { padding: 15px; background-color: #1a202c; display: none; overflow-y: auto; max-height: 450px; }
            .input-group-tm { margin-bottom: 10px; }
            .input-label-tm { display: block; font-size: 12px; margin-bottom: 3px; color: #cbd5e0; font-weight: 600; }
            .input-field-tm, .select-field-tm { width: 100%; padding: 8px; border: 1px solid #4a5568; border-radius: 4px; font-size: 14px; box-sizing: border-box; background-color: #2d3748; color: #f7f7f7; }
            .button-group-tm { display: flex; gap: 10px; margin-top: 10px; margin-bottom: 10px; }
            .btn-tm { flex-grow: 1; padding: 8px; border: none; border-radius: 4px; font-weight: 700; cursor: pointer; transition: background-color 0.15s; color: white; }
            #${ID_LOAD_BTN}, #${ID_VAR_LOAD_BTN} { background-color: #ecc94b; color: #1a202c; } 
            #${ID_LOAD_BTN}:hover, #${ID_VAR_LOAD_BTN}:hover { background-color: #d69e2e; }
            #${ID_SAVE_BTN}, #${ID_VAR_SET_BTN} { background-color: #48bb78; } 
            #${ID_SAVE_BTN}:hover, #${ID_VAR_SET_BTN}:hover { background-color: #38a169; }
            #${ID_ADD_BTN} { background-color: #9f7aea; } 
            #${ID_ADD_BTN}:hover { background-color: #805ad5; }
            #${ID_SHOW_ALL_BTN} { background-color: #63b3ed; } 
            #${ID_SHOW_ALL_BTN}:hover { background-color: #4299e1; }
            .btn-god-on { background-color: #e53e3e !important; }
            .btn-god-on:hover { background-color: #c53030 !important; }
            .btn-god-off { background-color: #48bb78 !important; }
            .btn-god-off:hover { background-color: #38a169 !important; }
            .btn-delete-tm { background-color: #e53e3e; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 12px; }
            .eg-status-message { padding: 8px; border-left: 3px solid; font-size: 12px; border-radius: 4px; margin-top: 10px; color: #f7f7f7; }
            .status-ready { background-color: #2d3748; border-color: #ecc94b; color: #ecc94b; }
            .status-active { background-color: #2f855a; border-color: #48bb78; color: #f7f7f7; }
            .status-error { background-color: #c53030; border-color: #fc8181; color: #f7f7f7; }
            .table-container-tm { max-height: 250px; overflow-y: auto; border: 1px solid #4a5568; border-radius: 4px; margin-bottom: 10px; }
            .table-tm { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; color: #f7f7f7; }
            .table-tm thead { position: sticky; top: 0; background-color: #2d3748; z-index: 10; }
            .th-tm { padding: 5px 8px; text-align: left; border-bottom: 2px solid #63b3ed; }
            .td-tm { padding: 2px 4px; border-bottom: 1px solid #4a5568; vertical-align: middle; }
            .table-tm tbody tr:nth-child(even) { background-color: #1a202c; }
            .table-tm tbody tr:nth-child(odd) { background-color: #2d3748; }
            .item-id-col { width: 20%; }
            .item-name-col { width: 45%; }
            .amount-col { width: 20%; }
            .delete-col { width: 15%; text-align: center; }
            .input-table-tm { width: 100%; padding: 4px; border: 1px solid #6b7280; border-radius: 3px; font-size: 13px; text-align: center; background-color: #1a202c; color: #f7f7f7; }
            .item-name-display { display: block; padding: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;}
            #${ID_ALL_ITEMS_MODAL} { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 500px; max-height: 80vh; background-color: #1a202c; border: 2px solid #63b3ed; border-radius: 8px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.9); z-index: 20000; display: none; flex-direction: column; }
            .modal-header-tm { padding: 10px 15px; background-color: #2d3748; color: #63b3ed; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border-top-left-radius: 6px; border-top-right-radius: 6px; }
            .modal-search-tm { padding: 0 15px 10px 15px; background-color: #1a202c; }
            .modal-search-group-tm { display: flex; gap: 10px; }
            #${ID_MODAL_SEARCH_INPUT} { flex-grow: 1; width: 100%; padding: 8px; border: 1px solid #4a5568; border-radius: 4px; font-size: 14px; box-sizing: border-box; background-color: #2d3748; color: #f7f7f7; }
            #item-refresh-btn-tm { background-color: #9f7aea; color: white; border: none; border-radius: 4px; padding: 8px 12px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; }
            #item-refresh-btn-tm:hover { background-color: #805ad5; }
            .modal-content-tm { padding: 15px; overflow-y: auto; color: #f7f7f7; }
            .modal-close-btn-tm { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
            .item-list-table-tm { width: 100%; border-collapse: collapse; }
            .item-list-table-tm th, .item-list-table-tm td { padding: 5px; border-bottom: 1px solid #4a5568; text-align: left; }
            .item-list-table-tm th { background-color: #2d3748; }
        `;
        document.head.appendChild(style);
        const targetOptions = availableTargets.map(t =>
            `<option value="${t.id}" ${t.name.includes("Stage") ? 'selected' : ''}>${t.name}</option>`
        ).join('');
        const html = `
            <div id="${ID_HEADER}">
                <span>Everything GUI</span>
                <button class="eg-minimize-btn" onclick="EG_toggleMinimize()">—</button>
            </div>
            <div id="${ID_CONTENT}">
                <div id="eg-tab-links">
                    <a class="eg-tab-link active" onclick="EG_openTab('tab-inventory')">Inventory</a>
                    <a class="eg-tab-link" onclick="EG_openTab('tab-var-setter')">Var Setter</a>
                    <a class="eg-tab-link" onclick="EG_openTab('tab-god-mode')">God Mode</a>
                </div>
                <div id="tab-inventory" class="eg-tab-content" style="display: block;">
                    <input type="hidden" id="${ID_MAX_CAPACITY}" value="0">
                    <div class="input-group-tm">
                        <label for="${ID_TARGET_SELECT}" class="input-label-tm">1. List Target (Sprite/Stage):</label>
                        <select id="${ID_TARGET_SELECT}" class="select-field-tm">${targetOptions}</select>
                    </div>
                    <div class="input-group-tm">
                        <label for="${ID_LIST_NAME}" class="input-label-tm">2. List Name (e.g., _inv):</label>
                        <input type="text" id="${ID_LIST_NAME}" value="_inv" class="input-field-tm">
                    </div>
                    <div class="button-group-tm">
                        <button id="${ID_LOAD_BTN}" class="btn-tm" onclick="loadInventory()">Load List</button>
                    </div>
                    <div class="input-group-tm">
                        <label class="input-label-tm">3. Edit Inventory Slots (ID/Qty pairs):</label>
                    </div>
                    <div class="button-group-tm">
                        <button id="${ID_ADD_BTN}" class="btn-tm" onclick="addItemRow()">+ Add Slot</button>
                        <button id="${ID_SHOW_ALL_BTN}" class="btn-tm" onclick="showAllItems()">Search Item IDs</button>
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
                            <tbody></tbody>
                        </table>
                    </div>
                    <div class="button-group-tm">
                        <button id="${ID_SAVE_BTN}" class="btn-tm" onclick="saveInventory()">Save Changes to Game</button>
                    </div>
                    <div id="${ID_STATUS_INV}" class="eg-status-message status-ready">Ready. Load list to begin editing.</div>
                </div>
                <div id="tab-var-setter" class="eg-tab-content">
                    <div class="input-group-tm">
                        <label for="${ID_VAR_TARGET_SELECT}" class="input-label-tm">1. Variable Target (Sprite/Stage):</label>
                        <select id="${ID_VAR_TARGET_SELECT}" class="select-field-tm">${targetOptions}</select>
                    </div>
                    <div class="input-group-tm">
                        <label for="${ID_VAR_NAME}" class="input-label-tm">2. Variable Name:</label>
                        <input type="text" id="${ID_VAR_NAME}" value="score" class="input-field-tm">
                    </div>
                    <div class="button-group-tm">
                        <button id="${ID_VAR_LOAD_BTN}" class="btn-tm" onclick="loadVariable()">Load Variable</button>
                    </div>
                    <div class="input-group-tm">
                        <label for="${ID_VAR_VALUE}" class="input-label-tm">3. New Value:</label>
                        <input type="text" id="${ID_VAR_VALUE}" value="0" class="input-field-tm">
                    </div>
                    <div class="button-group-tm">
                        <button id="${ID_VAR_SET_BTN}" class="btn-tm" onclick="setVariable()">Set New Value</button>
                    </div>
                    <div id="${ID_STATUS_VAR}" class="eg-status-message status-ready">Load a variable to view/change its value.</div>
                </div>
                <div id="tab-god-mode" class="eg-tab-content">
                    <p class="input-label-tm" style="margin-top: 0;">Toggle invincibility and maximum health for the Player sprite.</p>
                    <div class="button-group-tm">
                        <button class="btn-tm btn-god-on" onclick="setGodMode(true)">Activate God Mode</button>
                        <button class="btn-tm btn-god-off" onclick="setGodMode(false)">Deactivate God Mode</button>
                    </div>
                    <div id="eg-status-godmode" class="eg-status-message status-ready">Awaiting God Mode command. (Assumes 'Player' sprite and 'hp' variable exist)</div>
                </div>
            </div>
            <div id="${ID_ALL_ITEMS_MODAL}" style="display: none;">
                <div class="modal-header-tm">
                    All Available Item IDs
                    <button class="modal-close-btn-tm" onclick="closeAllItemsModal()">×</button>
                </div>
                <div class="modal-search-tm">
                    <div class="modal-search-group-tm">
                        <input type="text" id="${ID_MODAL_SEARCH_INPUT}" class="input-field-tm" placeholder="Search by ID or Name..." oninput="filterAllItems(this.value)">
                        <button id="item-refresh-btn-tm" onclick="refreshItemList()">Refresh</button>
                    </div>
                </div>
                <div class="modal-content-tm"></div>
            </div>
        `;
        const container = document.createElement('div');
        container.id = ID_MAIN_CONTROLLER;
        container.innerHTML = html;
        document.body.appendChild(container);
        document.getElementById(ID_HEADER).onmousedown = window.EG_dragMouseDown;
        updateStatus("Ready. Load list to begin editing.", ID_STATUS_INV, 'status-ready');
    }
    function EG_checkVMReady() {
        if (typeof window.vm !== 'undefined' && window.vm.runtime && window.vm.runtime.targets.length > 0) {
            EG_injectControlPanel();
        } else {
            setTimeout(EG_checkVMReady, 500);
        }
    }
    EG_checkVMReady();
})();  
