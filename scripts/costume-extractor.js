function getCostumeData(spriteName) {
    if (typeof window.vm === 'undefined' || !window.vm.runtime) {
        console.error("[Extractor] VM API not available. Ensure 'window.vm' is initialized.");
        return null;
    }

    const runtime = window.vm.runtime;
    const target = runtime.getSpriteTargetByName(spriteName);

    if (!target) {
        const availableSprites = runtime.targets.filter(t => t.isSprite).map(t => t.getName());
        console.error(`[Extractor] Sprite "${spriteName}" not found. Available sprites:`, availableSprites);
        return null;
    }

    const extractedData = target.sprite.costumes.map(costume => {
        const asset = costume.asset;
        const dataURL = asset ? asset.dataURL : null;

        return {
            costume_name: costume.name,
            asset_id: costume.assetId,
            mime_type: costume.dataFormat,
            base64_image_data: dataURL ? dataURL.split(',')[1] : 'ERROR_ASSET_NOT_LOADED'
        };
    });

    return extractedData;
}

function saveJsonFile(data) {
    if (!data || data.length === 0) {
        updateStatus('Error: No data extracted yet!', 'red');
        return;
    }

    try {
        const fileName = `costumes_extracted_${Date.now()}.json`;
        const jsonStr = JSON.stringify(data, null, 2);

        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateStatus(`Success! Saved ${data.length} costume(s) to ${fileName}`, 'green');
    } catch (error) {
        console.error("[Extractor] Failed to save file:", error);
        updateStatus("Failed to save JSON file. See console for details.", 'red');
    }
}

let lastExtractedData = null; 
let guiPanel = null;
let saveButton = null;
let statusArea = null;
let inputField = null;
let minimizeButton = null;
let contentArea = null;
let isMinimized = false;

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

const BG_DARK = '#2d3748';
const BG_LIGHTER = '#4a5568';
const BORDER_ACCENT = '#63b3ed';
const TEXT_LIGHT = '#edf2f7';
const BUTTON_PRIMARY = '#4299e1';
const BUTTON_SUCCESS = '#48bb78';
const TEXT_STATUS_GREEN = '#81c784';
const TEXT_STATUS_RED = '#ef9a9a';

function updateStatus(message, color = 'blue') {
    if (statusArea) {
        let bgColor, textColor;
        if (color === 'green') {
            bgColor = '#38a169';
            textColor = TEXT_STATUS_GREEN; 
        } else if (color === 'red') {
            bgColor = '#c53030';
            textColor = TEXT_STATUS_RED;
        } else {
            bgColor = '#2b6cb0';
            textColor = BORDER_ACCENT;
        }

        statusArea.textContent = message;
        statusArea.style.backgroundColor = bgColor;
        statusArea.style.color = textColor;
    }
    console.log(`[Status] ${message}`);
}

function handleExtract() {
    const spriteName = inputField.value.trim();
    if (!spriteName) {
        updateStatus('Error: Please enter a Sprite Name!', 'red');
        return;
    }

    updateStatus(`Attempting to extract costumes from "${spriteName}"...`, 'blue');

    lastExtractedData = getCostumeData(spriteName);

    if (lastExtractedData && lastExtractedData.length > 0) {
        saveButton.disabled = false;
        saveButton.style.backgroundColor = BUTTON_SUCCESS; 
        saveButton.style.cursor = 'pointer';
        saveButton.onmouseover = () => saveButton.style.backgroundColor = '#38a169';
        saveButton.onmouseout = () => saveButton.style.backgroundColor = BUTTON_SUCCESS;
        updateStatus(`Extracted ${lastExtractedData.length} costume(s) successfully! Ready to save.`, 'green');
    } else {
        saveButton.disabled = true;
        saveButton.style.backgroundColor = BG_LIGHTER; 
        saveButton.style.cursor = 'not-allowed';
        saveButton.onmouseover = () => saveButton.style.backgroundColor = BG_LIGHTER;
        saveButton.onmouseout = () => saveButton.style.backgroundColor = BG_LIGHTER;
        updateStatus(`Extraction failed for "${spriteName}". Check console errors.`, 'red');
    }
}

function handleMinimizeToggle() {
    isMinimized = !isMinimized;
    
    if (isMinimized) {
        contentArea.style.display = 'none';
        guiPanel.style.width = '200px'; 
        guiPanel.style.height = 'auto';
        guiPanel.style.padding = '10px 15px 10px 15px';
        minimizeButton.textContent = '+';
        minimizeButton.title = 'Maximize';
        updateStatus('Panel minimized.', 'blue');
    } else {
        contentArea.style.display = 'block';
        guiPanel.style.width = '300px';
        guiPanel.style.height = 'auto';
        guiPanel.style.padding = '15px';
        minimizeButton.textContent = '-';
        minimizeButton.title = 'Minimize';
        updateStatus('Panel maximized.', 'blue');
    }
}

function setupDragging() {
    const header = document.getElementById('extractor-header');
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffsetX = e.clientX - guiPanel.offsetLeft;
        dragOffsetY = e.clientY - guiPanel.offsetTop;
        header.style.cursor = 'grabbing';
        guiPanel.style.transition = 'none'; 
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;
        
        newX = Math.max(0, Math.min(newX, window.innerWidth - guiPanel.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - guiPanel.offsetHeight));

        guiPanel.style.left = newX + 'px';
        guiPanel.style.top = newY + 'px';
        guiPanel.style.right = 'auto'; 
        guiPanel.style.bottom = 'auto'; 
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        header.style.cursor = 'grab';
        guiPanel.style.transition = 'all 0.3s ease'; 
    });
}


function createGUI() {
    if (guiPanel) guiPanel.remove();

    guiPanel = document.createElement('div');
    guiPanel.id = 'costume-extractor-gui';

    guiPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        padding: 15px;
        background: ${BG_DARK};
        border: 2px solid ${BORDER_ACCENT};
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
        z-index: 99999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: ${TEXT_LIGHT};
        transition: all 0.3s ease;
    `;

    document.body.appendChild(guiPanel); 

    const rect = guiPanel.getBoundingClientRect();
    const initialLeft = rect.left;
    const initialTop = rect.top;

    guiPanel.style.left = `${initialLeft}px`;
    guiPanel.style.top = `${initialTop}px`;
    guiPanel.style.right = 'auto';
    guiPanel.style.bottom = 'auto';

    const header = document.createElement('div');
    header.id = 'extractor-header';
    header.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: grab; padding: 0 0 5px 0; border-bottom: 1px solid ${BG_LIGHTER};`;
    
    const title = document.createElement('h3');
    title.textContent = 'Costume Extractor';
    title.style.cssText = `font-size: 18px; font-weight: bold; color: ${BORDER_ACCENT}; user-select: none;`;
    
    minimizeButton = document.createElement('button');
    minimizeButton.textContent = '-'; 
    minimizeButton.title = 'Minimize';
    minimizeButton.style.cssText = `padding: 0 8px; font-size: 20px; border: none; background: transparent; cursor: pointer; color: ${BORDER_ACCENT}; font-weight: bold; line-height: 1;`;
    minimizeButton.onclick = handleMinimizeToggle;

    header.appendChild(title);
    header.appendChild(minimizeButton);
    guiPanel.appendChild(header);

    contentArea = document.createElement('div');
    contentArea.id = 'extractor-content';

    inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Enter Sprite Name (e.g., Cat)';
    inputField.value = 'Sprite1'; 
    inputField.style.cssText = `width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid ${BG_LIGHTER}; border-radius: 6px; box-sizing: border-box; background-color: ${BG_LIGHTER}; color: ${TEXT_LIGHT};`;

    const extractButton = document.createElement('button');
    extractButton.textContent = 'Extract Costumes';
    extractButton.style.cssText = `width: 100%; padding: 10px; margin-bottom: 10px; border: none; border-radius: 6px; background-color: ${BUTTON_PRIMARY}; color: white; font-weight: bold; cursor: pointer; transition: background-color 0.2s;`;
    extractButton.onmouseover = () => extractButton.style.backgroundColor = '#3182ce';
    extractButton.onmouseout = () => extractButton.style.backgroundColor = BUTTON_PRIMARY;
    extractButton.onclick = handleExtract;

    saveButton = document.createElement('button');
    saveButton.textContent = 'Save JSON File';
    saveButton.disabled = true;
    saveButton.style.cssText = `width: 100%; padding: 10px; border: none; border-radius: 6px; background-color: ${BG_LIGHTER}; color: #a0aec0; font-weight: bold; cursor: not-allowed; transition: background-color 0.2s; margin-bottom: 10px;`;
    saveButton.onclick = () => saveJsonFile(lastExtractedData);

    saveButton.onmouseover = () => { if (!saveButton.disabled) saveButton.style.backgroundColor = '#38a169'; };
    saveButton.onmouseout = () => { if (!saveButton.disabled) saveButton.style.backgroundColor = BUTTON_SUCCESS; };


    statusArea = document.createElement('div');
    statusArea.style.cssText = 'padding: 8px; border-radius: 6px; text-align: center; font-size: 12px; height: 35px; overflow: hidden;';
    updateStatus('Ready. Enter sprite name.', 'blue');

    contentArea.appendChild(inputField);
    contentArea.appendChild(extractButton);
    contentArea.appendChild(saveButton);
    contentArea.appendChild(statusArea);
    guiPanel.appendChild(contentArea);

    setupDragging();

    console.log("[Extractor] GUI loaded in Dark Mode.");
}

createGUI();
