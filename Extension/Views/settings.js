const themeSelect = document.getElementById("themeSelect");
const syncMozillaSelect = document.getElementById("syncMozillaSelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const showNextCodeSelect = document.getElementById("showNextCodeSelect");
const useMasterPasswordSelect = document.getElementById("useMasterPasswordSelect");
const useBiometricsSelect = document.getElementById("useBiometricsSelect");

const saveBtn = document.getElementById("saveBtn");

saveBtn.addEventListener('click', saveSettings);

document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = browser.i18n.getMessage(key);
});

browser.storage.local.get("settings").then(async result => {

    var settings;
    if(!result.settings){
        settings = await createDefaultSettings();
    }else{
        settings = result.settings;
    }

    if(await isDarkMode()){
        document.body.classList.add("dark");   // Dark
    }
        
    // TODO
    themeSelect.value = settings.theme;
    syncMozillaSelect.value = settings.syncMozilla.toString();
    fontSizeSelect.value = settings.fontSize;
    showNextCodeSelect.value = settings.nextCode.toString();
    useMasterPasswordSelect.value = settings.masterPasswordEnabled.toString();
    useBiometricsSelect.value = settings.useBiometrics.toString();
});

async function saveSettings(){
    var settings = new Settings(
        themeSelect.value,
        syncMozillaSelect.value,
        fontSizeSelect.value,
        showNextCodeSelect.value,
        useMasterPasswordSelect.value,
        useBiometricsSelect.value
    );
    await browser.storage.local.set({settings : settings});

    if(await isDarkMode()){
        document.body.classList.add("dark");   // Dark
    } else{
        document.body.classList.remove("dark");
    }
}

