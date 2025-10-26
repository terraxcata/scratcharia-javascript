if (hasLoadedMod === true) {
    const timerId = setTimeout(() => {
        hasLoadedMod = false;
    }, 500);
}

if (hasLoadedTexturePack === true) {
    const timerId = setTimeout(() => {
        hasLoadedTexturePack = false;
    }, 500);
}
