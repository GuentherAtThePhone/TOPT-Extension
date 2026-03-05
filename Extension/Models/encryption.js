const checkText = "This is a test text to check the validity of the key.";

async function encrypt(text, password) {
    const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(text)
  );

  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    salt: Array.from(salt)
  };
}

async function decrypt(encryptedData, password) {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const { encrypted, iv, salt } = encryptedData;

  // Passwort importieren
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  // Key wieder exakt gleich ableiten
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  // Entschlüsseln
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv)
    },
    key,
    new Uint8Array(encrypted)
  );
  return dec.decode(decrypted);
}

//---------------------------------------- PasswordAndSessionLogic --------------------------------------
//Saved Value: (local) masterPassword
//             (local) masterPasswordEnabled (boolean)
//           (session) sessionPassword (string, not encrypted, only for current session)
//             (local) isInitialized (boolean, to check if the extension is used for the first time)
//           (session) isAuthenticated (boolean, to check if the user is authenticated for the current session)

async function saveMasterPassword(password) {
  if(!password){
    return;
  }
  var output = await encrypt(checkText, password);
  await browser.storage.local.set({ masterPassword: output });
  console.log("Master password saved");
}

async function setMasterPassword(){
  console.log("Setting master password...");

  const password = await setPassword();

  if(!password){
    await browser.storage.local.set({ masterPasswordEnabled: false });
    console.log("Master password disabled");
    return;
  }
  await saveMasterPassword(password);
  await browser.storage.local.set({ masterPasswordEnabled: true });
  await browser.storage.session.set({ isAuthenticated: true });
  await browser.storage.session.set({ sessionPassword: password });
  console.log("Master password set", password);
  return password;
}

async function isMasterPassword(password) {
    var input = await browser.storage.local.get("masterPassword");
    console.log("Checking master password...", password, input.masterPassword);
    if(!password || !input.masterPassword){
      console.log("No master password set");
      return false;
    }

    console.log("Decrypting master password...");
    var decryptedCheckText;
    try{
      decryptedCheckText = await decrypt(input.masterPassword, password);
      console.log("Decrypted check text", decryptedCheckText);
    } catch{
      console.log("Decryption failed");
      return false;
    }

    if(decryptedCheckText === checkText){
      console.log("Master password is correct");
      return true;
    }
    console.log("Master password is incorrect");
    return false;
}

async function getSessionPassword(){
  var password;

  console.log("Getting session password...");

  var result = await browser.storage.local.get(["isInitialized"]);

  if(!result.isInitialized){ // First time use, not yet initialized
    console.log("initializing")
    password = await setMasterPassword();
    browser.storage.local.set({ isInitialized: true });

    var accounts = browser.storage.local.get("accounts");
    if(accounts.accounts){ // Allready accounts saved from previous version
      await saveAccounts(accounts.accounts, password);
    }
  }

  console.log("initialized");

  var masterPWEnabled = await browser.storage.local.get("masterPasswordEnabled");


  if(!masterPWEnabled.masterPasswordEnabled){ //Is initialized, but master password is disabled
    console.log("master password disabled");
    return password;
  }

  result = await browser.storage.session.get("isAuthenticated");

  if(!result.isAuthenticated){ // Is initialized, masterpassword enabled, but not yet authenticated
    console.log("not authenticated yet");
    do{
      password = await setPassword();
      console.log("Password entered", password);
    } while (!await isMasterPassword(password))

    browser.storage.session.set({ isAuthenticated: true });
    browser.storage.session.set({ sessionPassword: password })

    console.log("authenticated", password);

    return password;
  }

  // Is initialized and master password is enabled and already authenticated

  console.log("already authenticated", await browser.storage.session.get("sessionPassword"));
  password = await browser.storage.session.get("sessionPassword");

  return password.sessionPassword;

}

async function changePassword(oldPW, newPW){

  var accounts = browser.storage.local.get("accounts");
  if(accounts.accounts){ // Allready accounts saved from previous version
    try{
      accounts = await loadAccounts(oldPW);
    }catch{
      accounts = [];
    }

    saveMasterPassword(newPW);
    
    await saveAccounts(accounts, newPW);
  }

  browser.storage.session.set({ isAuthenticated: true });
  browser.storage.session.set({ sessionPassword: newPW })
}