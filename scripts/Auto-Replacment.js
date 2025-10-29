(function() {
    'use strict';

    const TARGET_LIST_NAME = '_Level';
    const CHECK_INTERVAL_MS = 1000; 
    
    const REPLACEMENT_MAP = {
        '23': '42',
        '21': '41',
        '24': '42'
    };

    let intervalId;
    let loadingElement = null;
    let loadingDotsInterval = null;

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
            loadingElement.textContent = `Loading${dots}`;
        }
    }

    function WL_startLoadingAnimation() {
        WL_createStatusElement();
        let dotCount = 0;
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

    function WL_findLevelList(vm) {
        if (!vm || !vm.runtime || vm.runtime.targets.length === 0) {
            return null;
        }

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

    function WL_checkAndReplace() {
        if (typeof window.vm === 'undefined' || !window.vm.runtime) {
            console.log("World Data Auto-Editor: Scratch VM not ready. Retrying in 1s.");
            return;
        }

        const levelList = WL_findLevelList(window.vm);
        
        if (!levelList) {
            console.log(`World Data Auto-Editor: List "${TARGET_LIST_NAME}" not found on Stage. Retrying in 1s.`);
            return;
        }

        const currentData = levelList.value;

        if (currentData.length > 0) {
            console.log(`World Data Auto-Editor: List "${TARGET_LIST_NAME}" detected with ${currentData.length} items. Starting silent replacement.`);
            
            let totalReplaceCount = 0;
            const newData = [];

            for (let i = 0; i < currentData.length; i++) {
                let item = String(currentData[i]);
                
                if (REPLACEMENT_MAP.hasOwnProperty(item)) {
                    newData.push(REPLACEMENT_MAP[item]);
                    totalReplaceCount++;
                } else {
                    newData.push(item);
                }
            }

            if (totalReplaceCount > 0) {
                levelList.value = newData;
                console.log(`World Data Auto-Editor: SUCCESS! Performed ${totalReplaceCount} total replacements across all rules.`);
            } else {
                console.log("World Data Auto-Editor: SUCCESS! List populated, but no matches found for defined replacement rules.");
            }
            
            clearInterval(intervalId);
            WL_stopLoadingAnimation("Loaded");
            console.log("World Data Auto-Editor: Script execution complete and stopped.");
        } else {
            if (!loadingElement) {
                WL_startLoadingAnimation();
            }
            console.log(`World Data Auto-Editor: List "${TARGET_LIST_NAME}" found on Stage, but is empty. Waiting...`);
        }
    }

    intervalId = setInterval(WL_checkAndReplace, CHECK_INTERVAL_MS);
    WL_startLoadingAnimation();
})();
