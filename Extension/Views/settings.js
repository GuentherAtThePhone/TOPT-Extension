class Settings{
    theme;
    language;
    syncMozilla;
    fontSize;
    nextCode;
    masterPasswordEnabled;
    useBiometrics;
    constructor(theme, language, syncMozilla, fontSize, nextCode, masterPasswordEnabled, useBiometrics){
        this.theme = theme;
        this.language = language;
        this.syncMozilla = syncMozilla;
        this.fontSize = fontSize;
        this.nextCode = nextCode;
        this.masterPasswordEnabled = masterPasswordEnabled;
        this.useBiometrics = useBiometrics;
    }
}

const themeSelect = document.getElementById("themeSelect");
const languageSelect = document.getElementById("languageSelect");
const syncMozillaSelect = document.getElementById("syncMozillaSelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const showNextCodeSelect = document.getElementById("showNextCodeSelect");
const useMasterPasswordSelect = document.getElementById("useMasterPasswordSelect");
const useBiometricsSelect = document.getElementById("useBiometricsSelect");


async function createDefaultSettings(){
    var result = await browser.storage.local.get("masterPasswordEnabled");

    var settings = new Settings(
        "default",
        "en-us",
        false,
        "medium",
        true,
        result.masterPasswordEnabled,
        false
    );
    return settings;
}

browser.storage.local.get("settings").then(async result => {
    var settings;
    if(!result.settings){
        settings = await createDefaultSettings();
        await browser.storage.local.set({settings: settings});
    }else{
        settings = result.settings;
    }
    
    // TODO
    themeSelect.value = settings.theme;
    languageSelect.value = settings.language;
    syncMozillaSelect.value = settings.syncMozilla.toString();
    fontSizeSelect.value = settings.fontSize;
    showNextCodeSelect.value = settings.nextCode.toString();
    useMasterPasswordSelect.value = settings.masterPasswordEnabled.toString();
    useBiometricsSelect.value = settings.useBiometrics.toString();
});