(function() {
    'use strict';

    // --- CONFIGURATION ---
    const TARGET_LIST_NAME = '_Level';
    const CHECK_INTERVAL_MS = 50;
    // --- REPLACEMENTS ---
    const REPLACEMENTS = [
        { find: '23', replace: '42' }, // example 1
        { find: '21', replace: '41' }, // example 2
        { find: '24', replace: '43' } // example 3
    ];
    // --------------------------

    let intervalId = null;
    let loadingElement = null;
    let loadingDotsInterval = null;

    // Finding the target list variable on the Stage.
    function findLevelList(vm) {
        if (!vm || !vm.runtime) return null;
        const stageTarget = vm.runtime.targets.find(t => t.isStage);
        if (!stageTarget) return null;

        const variables = stageTarget.variables;
        for (const varId in variables) {
            const currentVar = variables[varId];
            if (currentVar.name === TARGET_LIST_NAME && currentVar.type === 'list') {
                return currentVar;
            }
        }
        return null;
    }

    function replaceData(listName, oldValue, newValue) {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            console.error("Scratch VM not available. Cannot perform replacement.");
            return 0;
        }

        const vm = window.vm;
        const stageTarget = vm.runtime.targets.find(t => t.isStage);
        
        if (!stageTarget) return 0;

        let targetList = null;
        const variables = stageTarget.variables;
        
        // Finding the list variable (name and type)
        for (const varId in variables) {
            const currentVar = variables[varId];
            if (currentVar.name === listName && currentVar.type === 'list') {
                targetList = currentVar;
                break;
            }
        }

        if (!targetList) return 0;

        const currentData = targetList.value;
        let replacementCount = 0;
        const stringifiedOldValue = String(oldValue);
        const stringifiedNewValue = String(newValue);

        // Iterating and replacing
        const newData = currentData.map(item => {
            if (String(item) === stringifiedOldValue) {
                replacementCount++;
                return stringifiedNewValue;
            }
            return item;
        });

        // Applying the updated data back to the VM
        if (replacementCount > 0) {
            targetList.value = newData;
            console.log(`REPLACEMENT: Applying "${oldValue}" -> "${newValue}" ${replacementCount} time(s).`);
        } else {
            console.log(`No instances of "${oldValue}" found.`);
        }

        return replacementCount;
    }

    function WL_createStatusElement() {
        if (document.getElementById('wl-status-indicator')) return;
        loadingElement = document.createElement('div');
        loadingElement.id = 'wl-status-indicator';
        loadingElement.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            padding: 5px 10px;
            background: #222;
            color: #fff;
            font-family: monospace;
            font-size: 14px;
            border-radius: 4px;
            z-index: 99999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(loadingElement);
    }

    function WL_updateLoadingIndicator(dots) {
        if (loadingElement) {
            loadingElement.textContent = `Monitoring${dots}`;
        }
    }

    function WL_startLoadingAnimation() {
        WL_createStatusElement();
        let dotCount = 0;
        if (loadingDotsInterval) clearInterval(loadingDotsInterval);
        loadingDotsInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            const dots = '.'.repeat(dotCount);
            WL_updateLoadingIndicator(dots);
        }, 500);
    }

    function WL_stopLoadingAnimation(status) {
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
            loadingDotsInterval = null;
        }

        if (loadingElement) {
            loadingElement.textContent = status;
            
            setTimeout(() => {
                loadingElement.style.opacity = '0';
                loadingElement.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    loadingElement.remove();
                    loadingElement = null;
                }, 500);
            }, 2000); 
        }
    }

    function WL_monitorAndReplace() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            return;
        }

        const levelList = findLevelList(window.vm);
        if (!levelList) {
            return;
        }

        const currentData = levelList.value;

        if (currentData.length > 0) {
            console.log(`Auto-Editor: List "${TARGET_LIST_NAME}" is detecting with ${currentData.length} items. Applying batch rules.`);
            
            let totalReplacements = 0;
            
            REPLACEMENTS.forEach(rule => {
                totalReplacements += replaceData(TARGET_LIST_NAME, rule.find, rule.replace);
            });

            console.log(`Auto-Editor: SUCCESS! Total replacements made: ${totalReplacements}.`);
            
            clearInterval(intervalId);
            WL_stopLoadingAnimation("Loaded");
            console.log("Auto-Editor: Script is complete and monitoring is stopping.");
        } else {
            if (!loadingElement) {
                WL_startLoadingAnimation();
            }
        }
    }

    window.replaceData = replaceData;
    intervalId = setInterval(WL_monitorAndReplace, CHECK_INTERVAL_MS);
    WL_startLoadingAnimation();

})();
