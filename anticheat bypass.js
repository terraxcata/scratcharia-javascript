document.removeEventListener("contextmenu", e => e.preventDefault());
document.onkeydown = null;
console.log("DevTools keybinds and right-click have been restored.");
