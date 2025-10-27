(function() {
    'use strict';
    
    const EMBED_CONTAINER_ID = 'turbowarp-editor-injection-container';

    // --- Configuration ---
    const PROJECT_ID = '767890722';
    const EXTENSION_URL = 'PLACEHOLDER';

    // Construct the full editor URL with the extension parameter
    const EDITOR_URL = `https://turbowarp.org/${PROJECT_ID}/editor?extension=${encodeURIComponent(EXTENSION_URL)}`;
    
    if (document.getElementById(EMBED_CONTAINER_ID)) {
        console.log('TurboWarp Editor container already exists.');
        return;
    }

    const styles = `
        #${EMBED_CONTAINER_ID} {
            position: fixed;
            top: 50px;
            right: 50px;
            z-index: 10000;
            resize: both; 
            overflow: auto; 
            width: 800px; 
            height: 600px; 
            min-width: 482px;
            min-height: 412px;
            border: 2px solid #3b82f6; 
            padding: 0;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            background-color: #fff;
        }
        #${EMBED_CONTAINER_ID} iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    const container = document.createElement('div');
    container.id = EMBED_CONTAINER_ID;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', EDITOR_URL);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'auto'); 
    iframe.setAttribute('allowfullscreen', '');

    container.appendChild(iframe);
    document.body.appendChild(container);

    console.log('TurboWarp Editor Iframe injected successfully.');
})();
