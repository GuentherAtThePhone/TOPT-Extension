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

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
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

async function hash(password){
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  console.log(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-512"
    },
    key,
    512
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));

  const hash = hashArray
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    salt: saltHex,
    hash: hash
  };
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
  var output = await hash(password);
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
  var hash = await browser.storage.local.get("masterPassword");
  await browser.storage.local.set({ masterPasswordEnabled: true });
  await browser.storage.session.set({ isAuthenticated: true });
  await browser.storage.session.set({ sessionPassword: hash.masterPassword });
  console.log("Master password set", password, hash.masterPassword);
  return hash.masterPassword;
}

async function isMasterPassword(password) {
  var input = await browser.storage.local.get("masterPassword");
  
  if(!password || !input.masterPassword){
    console.log("No master password set");
    return false;
  }

  var storedHash = input.masterPassword.hash;
  var saltHex = input.masterPassword.salt;

  const encoder = new TextEncoder();

  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  console.log(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-512"
    },
    key,
    512
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  console.log(hash, storedHash);
  return hash === storedHash;
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

  console.log("already initialized");

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
    } while (!await isMasterPassword(password))

    await browser.storage.session.set({ isAuthenticated: true });
    var hashedPW = await browser.storage.local.get("masterPassword");
    await browser.storage.session.set({ sessionPassword: hashedPW.masterPassword });

    console.log("authenticated", password);

    return hashedPW.masterPassword;
  }

  // Is initialized and master password is enabled and already authenticated

  password = await browser.storage.session.get("sessionPassword");

  return password.sessionPassword;

}

async function changePassword(oldPW, newPW){

  var accounts = await browser.storage.local.get("accounts");
  var masterPW;

  if(accounts.accounts){ // Allready accounts saved from previous version
    try{
      accounts = await loadAccounts(oldPW);
    }catch{
      accounts = [];
    }

    await saveMasterPassword(newPW);
    masterPW = await browser.storage.local.get("masterPassword");
    await saveAccounts(accounts, masterPW.masterPassword);
  }

  masterPW = await browser.storage.local.get("masterPassword");

  await browser.storage.session.set({ isAuthenticated: true });
  await browser.storage.session.set({ sessionPassword: masterPW.masterPassword});
}