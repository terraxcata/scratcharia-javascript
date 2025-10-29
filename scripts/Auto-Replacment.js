(function() {
    'use strict';

    // --- CONFIGURATION ---
    const TARGET_LIST_NAME = '_Level';
    const TARGET_SPRITE_NAME = 'Tiles';
    const CHECK_INTERVAL_MS = 50;

    // --- BATCH REPLACEMENTS --
    const NAME_REPLACEMENTS = [
        { findName: 'grass', replaceName: 'chocolate_top' }, // example 1
        { findName: 'dirt', replaceName: 'chocolate' } // example 2
    ];
    // --------------------------

    let intervalId = null;
    let loadingElement = null;
    let loadingDotsInterval = null;

     // Finding the Scratch VM Target (sprite or stage) by its name.
    function findTargetByName(vm, targetName) {
        if (!vm || !vm.runtime) return null;
        return vm.runtime.targets.find(t => t.getName() === targetName);
    }

     // Finding the 1-based costume index (as a string) from a sprite target and costume name.
    function findCostumeIndexByName(spriteTarget, name) {
        if (!spriteTarget || !spriteTarget.sprite) return null;
        // Scratch costume indices are 1-based in the VM list data
        const index = spriteTarget.sprite.costumes.findIndex(c => c.name === name);
        // Returning 1-indexed number as a string, or null if not found
        return index !== -1 ? String(index + 1) : null;
    }


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
        
        // Finding the list variable by name and type
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
        } 

        return replacementCount;
    }

    function processNameReplacements(vm) {
        const tilesSprite = findTargetByName(vm, TARGET_SPRITE_NAME);
        if (!tilesSprite) {
            console.error(`Auto-Editor: Sprite "${TARGET_SPRITE_NAME}" not found. Stopping replacement.`);
            return 0;
        }

        let totalReplacements = 0;

        // Executing all replacements defined in the NAME_REPLACEMENTS array
        NAME_REPLACEMENTS.forEach(rule => {
            const findIndex = findCostumeIndexByName(tilesSprite, rule.findName);
            const replaceIndex = findCostumeIndexByName(tilesSprite, rule.replaceName);

            if (!findIndex || !replaceIndex) {
                const missingName = !findIndex ? rule.findName : rule.replaceName;
                console.warn(`Auto-Editor: Skipping rule. Costume name "${missingName}" not found in sprite "${TARGET_SPRITE_NAME}".`);
                return;
            }

            // The list stores the index (as a string), so we use the indices here.
            totalReplacements += replaceData(TARGET_LIST_NAME, findIndex, replaceIndex);
        });

        return totalReplacements;
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
            console.log(`Auto-Editor: List "${TARGET_LIST_NAME}" is detecting with ${currentData.length} items. Applying name-based rules.`);
            
            const totalReplacements = processNameReplacements(window.vm);

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
