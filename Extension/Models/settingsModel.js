class Settings{
    theme;
    syncMozilla;
    fontSize;
    nextCode;
    masterPasswordEnabled;
    useBiometrics;
    constructor(theme, syncMozilla, fontSize, nextCode, masterPasswordEnabled, useBiometrics){
        this.theme = theme;
        this.syncMozilla = syncMozilla;
        this.fontSize = fontSize;
        this.nextCode = nextCode;
        this.masterPasswordEnabled = masterPasswordEnabled;
        this.useBiometrics = useBiometrics;
    }
}

/**
 * Creates and saves default settings
 * @returns DefaultSettings
 */
async function createDefaultSettings(){
    var result = await browser.storage.local.get("masterPasswordEnabled");

    var settings = new Settings(
        "default",
        false,
        "medium",
        true,
        result.masterPasswordEnabled,
        false
    );

    await browser.storage.local.set({settings: settings});

    return settings;
}

async function isDarkMode(){
    var result = await browser.storage.local.get("settings");
    if(!result.settings || result.settings.theme === "default"){
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    
    return (result.settings.theme === "dark") ? true : false;
}

async function isShowNextCode(){
    var result = await browser.storage.local.get("settings");
    if(!result.settings)
        return true;

    return result.settings.nextCode;
}

async function getFontSize(){
    var result = await browser.storage.local.get("settings");
    if(!result.settings)
        return "medium";

    return result.settings.fontSize;
}