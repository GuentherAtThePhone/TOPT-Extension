const themeSelect = document.getElementById("themeSelect");
const syncMozillaSelect = document.getElementById("syncMozillaSelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const showNextCodeSelect = document.getElementById("showNextCodeSelect");
const useMasterPasswordSelect = document.getElementById("useMasterPasswordSelect");
const useBiometricsSelect = document.getElementById("useBiometricsSelect");

const saveBtn = document.getElementById("saveBtn");
const changePwBtn = document.getElementById("changePwBtn");

var useMasterPasswordChanged = false;

const popup = document.getElementById("popupOverlay");
const openBtn = document.getElementById("openPopup");
const closeBtn = document.getElementById("closePopup");

openBtn.addEventListener("click", (e) => {
  e.preventDefault();
  popup.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
});
popup.addEventListener("click", (e) => {
  if (e.target === popup) {
    popup.style.display = "none";
  }
});

saveBtn.addEventListener('click', saveSettings);

document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = browser.i18n.getMessage(key);
});

changePwBtn.addEventListener('click', async () => {
    var oldPW = getSessionPassword();
    var newPW = prompt(browser.i18n.getMessage('enterNewPasswordText'));
    await changePassword(oldPW, newPW);
});

useMasterPasswordSelect.addEventListener('change', () => {
    if(useMasterPasswordSelect.value === "true"){
        changePwBtn.style.display = "block";
    }else{
        changePwBtn.style.display = "none";
    }
    useMasterPasswordChanged = true;
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

    switch (await getFontSize()){
        case "small":
        document.body.classList.add("small");
        break;
        case "medium":
        break;
        case "large":
        document.body.classList.add("large");
        break;
        default:
        break;
    }

    if(!settings.masterPasswordEnabled){
        changePwBtn.style.display = "none";
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
        syncMozillaSelect.value === "true",
        fontSizeSelect.value,
        showNextCodeSelect.value === "true",
        useMasterPasswordSelect.value === "true",
        useBiometricsSelect.value === "true"
    );

    await browser.storage.local.set({settings : settings});

    if(await isDarkMode()){
        document.body.classList.add("dark");   // Dark
    } else{
        document.body.classList.remove("dark");
    }

    switch (settings.fontSize){
        case "small":
        document.body.classList.add("small");
        break;
        case "medium":
            document.body.classList.remove("small");
            document.body.classList.remove("large");
        break;
        case "large":
        document.body.classList.add("large");
        break;
        default:
        break;
    }

    if(useMasterPasswordChanged){
        var result = await browser.storage.local.get("masterPasswordEnabled");
        if(settings.masterPasswordEnabled && !result.masterPasswordEnabled){ // Masterpassword got  activated
            var password;
            do{
                password = prompt(browser.i18n.getMessage('enterNewPasswordText'));
            } while (!password);
            await changePassword(undefined, password);
            await browser.storage.local.set({ masterPasswordEnabled: true });
        }else{ // Masterpassword got deactivated

            var password = await getSessionPassword();

            await browser.storage.local.set({ masterPasswordEnabled: false });
            
            browser.storage.local.get("accounts").then(async accounts => {
                if(accounts.accounts){
                    var accs = await loadAccounts(password);
                    await saveAccounts(accs, undefined);
                }
            });
        }
    }
}