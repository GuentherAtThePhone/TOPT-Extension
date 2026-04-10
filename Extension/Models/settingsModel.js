class Settings{
    theme;
    fontSize;
    nextCode;
    masterPasswordEnabled;
    constructor(theme, fontSize, nextCode, masterPasswordEnabled){
        this.theme = theme;
        this.fontSize = fontSize;
        this.nextCode = nextCode;
        this.masterPasswordEnabled = masterPasswordEnabled;
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
        "medium",
        true,
        result.masterPasswordEnabled,
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