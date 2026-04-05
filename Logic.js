const loadScriptDefinition = window.parent.document.createElement("script");
loadScriptDefinition.textContent = `
    function loadScript() {
        alert("Use githack not raw github as it doesnt work, just replace githubusercontent with githack in your url.")
        let url = prompt('Enter the URL of the external script to load');

        if (url === null) {
            alert("Script loading cancelled by user.");
            return;
        }

        let trimmedUrl = url.trim();

        if (!trimmedUrl) {
            alert("URL cannot be empty. Script loading cancelled.");
            return;
        }
        
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('//')) {
            trimmedUrl = 'https://' + trimmedUrl;
            alert("Protocol missing. Adjusted URL to: " + trimmedUrl);
        }

        alert("Attempting to load script from: " + trimmedUrl + "...");

        const newScript = document.createElement('script');
        newScript.type = 'text/javascript';
        newScript.src = trimmedUrl;

        newScript.onload = () => {
            alert("Successfully loaded script from: " + trimmedUrl + ". Check your console for any executed code.");
            
            if (trimmedUrl.includes('axios.min.js') && typeof axios !== 'undefined') {
                console.log('Test successful: axios object is available in the global scope.');
            }
        };
        newScript.onerror = () => {
            alert("Failed to load script from: " + trimmedUrl + ". Check console for network errors.");
        };
        document.body.appendChild(newScript);
    }
`;

const AntiAntiModDef = window.parent.document.createElement("script");
AntiAntiModDef.textContent = `
    function AntiAntiMod() {
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
    }
`;

window.parent.document.head.appendChild(AntiAntiModDef);
window.parent.document.body.appendChild(loadScriptDefinition);

const newGui = window.parent.document.createElement("div");
newGui.id = "gui-container";
newGui.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
        <label style="color: white; font-family: sans-serif; font-size: 12px;">Execute Script</label>
        <button id="send-button" onclick="loadScript()">Run</button>
    </div>
    <div style="display: flex; flex-direction: column; gap: 5px;">
        <label style="color: white; font-family: sans-serif; font-size: 12px;">Server AntiMod Bypass</label>
        <button id="bypass-button" onclick="AntiAntiMod()">Run</button>
    </div>
`;
window.parent.document.body.appendChild(newGui);

const newStyle = window.parent.document.createElement("style");
newStyle.textContent = `
    #gui-container {
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px;
        background-color: black;
        border: 2px solid black;
        z-index: 10000; 
        display: flex;
        flex-direction: column;
    }
    #gui-container button {
        position: relative;
        z-index: 9999;
        cursor: pointer;
    }
`;
window.parent.document.head.appendChild(newStyle);

document.removeEventListener("contextmenu", e => e.preventDefault());
document.onkeydown = null;
console.log("Anticheat Bypassed");

// Code made by rhysgames22/SML-ModsRevived