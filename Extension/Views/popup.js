// ------------------ Element References ------------------
const settingsBtn = document.getElementById("settingsBtn");
const accountsView = document.getElementById("accountsView");
const accountsDiv = document.getElementById("accounts");
const addAccountBtn = document.getElementById("addAccount");
const exportAccountsBtn = document.getElementById("exportAccounts");

const addAccountView = document.getElementById("addAccountView");
const importBtn = document.getElementById("importBtn");
const importManualBtn = document.getElementById("manualEntry");

const manualEntryView = document.getElementById("manualEntryView");
const nameInput = document.getElementById("nameInput");
const secretInput = document.getElementById("secretInput");
const toggleSecretBtn = document.getElementById("toggleSecret");
const digitsInput = document.getElementById("digitsInput");
const algorithmInput = document.getElementById("algorithmInput");
const periodInput = document.getElementById("periodInput");

const saveAccountBtn = document.getElementById("saveAccount");
const cancelAddBtn = document.getElementById("cancelAdd");
const deleteBtn = document.getElementById("deleteAccount");

const passwordEntryView = document.getElementById("passwordEntryView");
const passwordInput = document.getElementById("passwordInput");
const passwordSetBtn = document.getElementById("setPasswordButton");

// ------------------ Global Elements ------------------

let accounts = [];
let accountElements = new Map();
let lastTimeSlot = [];
let editingIndex = null;
let unlockedPassword = null;
var password;

// ------------------ Button Event Listeners ------------------

settingsBtn.addEventListener("click", () => {
  try{
    browser.tabs.create({ url: browser.runtime.getURL('../Views/settings.html') });
  } catch (e) {
  }
  window.close();
});

addAccountBtn.addEventListener("click", () => showAddOptions());

exportAccountsBtn.addEventListener("click", () => {
  if (!accounts.length) {
    alert(browser.i18n.getMessage("ExportFailedText"));
    return;
  }

  const dataStr = JSON.stringify(accounts, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "totp-backup.json";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => {
  try {
    browser.tabs.create({ url: browser.runtime.getURL('../Views/import.html') });
  } catch (e) {
  }
  window.close();
});

importManualBtn.addEventListener("click", () => showAddView());

toggleSecretBtn.addEventListener("click", () => {
  if (secretInput.type === "password") {
    secretInput.type = "text";
    toggleSecretBtn.textContent = "🙈";
  } else {
    secretInput.type = "password";
    toggleSecretBtn.textContent = "👁";
  }
});

deleteBtn.addEventListener("click", async () => {
  if (editingIndex !== null) {
    const acc = accounts[editingIndex];
    // Bestätigungsdialog
    const confirmed = confirm(browser.i18n.getMessage("confirmDeleteAccountText").replace("{accName}", acc.name));
    if (!confirmed) return;

    accounts.splice(editingIndex, 1);
    await saveAccounts(accounts, password);
    showAccountsView();
    renderAccounts();
  }
});

saveAccountBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const secret = secretInput.value.trim();
  const digits = parseInt(digitsInput.value);
  const algorithm = algorithmInput.value;
  const period = parseInt(periodInput.value);

  if (!name) return;
  if (!secret && editingIndex === null) return;

  if (editingIndex !== null) {
    const acc = accounts[editingIndex];
    acc.name = name;
    if (secret) acc.secret = secret;
    acc.digits = digits;
    acc.algorithm = algorithm;
    acc.period = period;
  } else {
    accounts.push(new Account(name, secret, name, name, undefined, digits, algorithm, 'TOTP', undefined, period));
  }

  await saveAccounts(accounts, password);
  browser.storage.local.remove("uiState");
  showAccountsView();
  renderAccounts();
});

cancelAddBtn.addEventListener("click", showAccountsView);


// ------------------ Functions -----------------

function waitForButtonClick(buttonElement, inputElement) {
  return new Promise((resolve) => {
    function cleanup(event) {
      buttonElement.removeEventListener("click", onClick);
      inputElement.removeEventListener("keydown", onKeyDown);
      resolve(event);
    }

    function onClick(event) {
      cleanup(event);
    }

    function onKeyDown(event) {
      if (event.key === "Enter") {
        cleanup(event);
      }
    }

    buttonElement.addEventListener("click", onClick);
    inputElement.addEventListener("keydown", onKeyDown);
  });
}

async function setPassword() {
  accountsView.style.display = "none";
  addAccountView.style.display = "none";
  manualEntryView.style.display = "none";
  passwordEntryView.style.display = "block";

  await waitForButtonClick(passwordSetBtn, passwordInput);
  
  accountsView.style.display = "block";
  addAccountView.style.display = "none";
  manualEntryView.style.display = "none";
  passwordEntryView.style.display = "none";

  return passwordInput.value;
}

function showAddOptions() {
  accountsView.style.display = "none";
  addAccountView.style.display = "block";
  manualEntryView.style.display = "none";
  passwordEntryView.style.display = "none";
}

function showAddView(editIndex = null) {
  editingIndex = editIndex;
  accountsView.style.display = "none";
  addAccountView.style.display = "none";
  passwordEntryView.style.display = "none";
  manualEntryView.style.display = "block";

  if (editIndex !== null) {
    const acc = accounts[editIndex];
    nameInput.value = acc.name;
    secretInput.value = acc.secret;
    digitsInput.value = acc.digits;
    algorithmInput.value = acc.algorithm || "SHA-1";
    periodInput.value = acc.period || 30;
    deleteBtn.style.display = "block";
    document.getElementById("newAccountLabel").textContent = browser.i18n.getMessage("editAccountText");
  } else {
    nameInput.value = "";
    secretInput.value = "";
    digitsInput.value = "6";
    algorithmInput.value = "SHA-1";
    periodInput.value = 30;
    deleteBtn.style.display = "none";
    document.getElementById("newAccountLabel").textContent = browser.i18n.getMessage("newAccountText");
  }

  secretInput.type = "password";
  toggleSecretBtn.textContent = "👁";
  saveUIState();
}

function showAccountsView() {
  editingIndex = null;
  addAccountView.style.display = "none";
  accountsView.style.display = "block";
  manualEntryView.style.display = "none";
  passwordEntryView.style.display = "none";
  saveUIState();
}

function openEdit(index) {
  showAddView(index);
}

async function renderAccounts() {
  accountsDiv.innerHTML = "";
  accountElements.clear();
  lastTimeSlot = [];
  accountsDiv.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(accountsDiv, e.clientY);

    if (afterElement == null) {
      accountsDiv.appendChild(dragging);
    } else {
      accountsDiv.insertBefore(dragging, afterElement);
    }
  });

  accountsDiv.addEventListener("drop", () => {
    saveNewOrder();
  });

  accountElements.clear();

  accounts.forEach((acc, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "account";
    wrapper.draggable = true;
    wrapper.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
      wrapper.classList.add("dragging");
    });

    wrapper.addEventListener("dragend", () => {
      wrapper.classList.remove("dragging");
    });
    wrapper.dataset.index = index;

    const left = document.createElement("div");
    left.className = "account-left";

    const right = document.createElement("div");
    right.className = "account-right";

    // Content wrapper für Name, Code, etc.
    const content = document.createElement("div");
    content.className = "account-content";

    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = acc.name;

    const labelEL = document.createElement("div");
    labelEL.className = "label";
    labelEL.textContent = acc.label;

    const codeEl = document.createElement("div");
    codeEl.className = "code";
    codeEl.addEventListener("click", () => {
      navigator.clipboard.writeText(codeEl.textContent);
      codeEl.style.color = "green";
      setTimeout(() => (codeEl.style.color = ""), 500);
    });

    const nextCodeEl = document.createElement("div");
    nextCodeEl.className = "next-code";

    const timerEl = document.createElement("div");
    timerEl.className = "timer";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", () => openEdit(index));

    content.appendChild(nameEl);
    if(labelEL.textContent !== nameEl.textContent)
      content.appendChild(labelEL);
    content.appendChild(codeEl);
    content.appendChild(nextCodeEl);
    content.appendChild(timerEl);

    left.appendChild(content);

    right.appendChild(editBtn);

    wrapper.appendChild(left);
    wrapper.appendChild(right);

    accountsDiv.appendChild(wrapper);

    accountElements.set(index, {
      codeEl,
      nextCodeEl,
      timerEl,
      currentCode: "",
      nextCode: ""
    });

    if (!lastTimeSlot[index]) lastTimeSlot[index] = null;
  });

  await updateCodes(true);
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".account:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function updateCodes() {
  const now = Math.floor(Date.now() / 1000);

  for (let [index, acc] of accounts.entries()) {
    const el = accountElements.get(index);
    if (!el) continue;

    const period = Number(acc.period) || 30;
    const currentSlot = Math.floor(now / period);
    const nextSlot = currentSlot + 1;
    const remaining = period - (now % period);

    // --- Current Code nur neu berechnen, wenn Slot gewechselt ---
    if (!lastTimeSlot[index]) lastTimeSlot[index] = {};
    if (lastTimeSlot[index].current !== currentSlot) {
      el.currentCode = await generateTOTP(acc.secret, acc.digits, period, acc.algorithm);
      if (el.codeEl.textContent !== el.currentCode) el.codeEl.textContent = el.currentCode;
      lastTimeSlot[index].current = currentSlot;
    }

    // --- Next Code nur neu berechnen, wenn Slot für nächsten Code gewechselt ---
    if (lastTimeSlot[index].next !== nextSlot) {
      el.nextCode = await generateTOTP(acc.secret, acc.digits, period, acc.algorithm, 1);
      lastTimeSlot[index].next = nextSlot;
    }

    // --- UI Update für Next Code nur wenn remaining <=10 ---
    const nextText = remaining <= 10 ? browser.i18n.getMessage("nextCodeText") + el.nextCode : "";
    if (el.nextCodeEl.textContent !== nextText) el.nextCodeEl.textContent = nextText;

    // --- Timer immer aktualisieren ---
    el.timerEl.textContent = remaining + browser.i18n.getMessage("timeTillNextCode");
  }
}

async function saveNewOrder() {
  const newOrder = [];
  const elements = accountsDiv.querySelectorAll(".account");

  elements.forEach(el => {
    const index = Number(el.dataset.index);
    newOrder.push(accounts[index]);
  });

  accounts = newOrder;
  await saveAccounts(accounts, password);

  renderAccounts().then(() => {
    updateCodes(true); // force=true
  });
}

function saveUIState() {
  const isAddView = manualEntryView.style.display === "block";

  const state = {
    currentView: isAddView ? "add" : "accounts",
    editingIndex,
    draft: isAddView
      ? {
          name: nameInput.value,
          secret: secretInput.value,
          digits: digitsInput.value,
          algorithm: algorithmInput.value,
          period: periodInput.value
        }
      : null
  };

  browser.storage.local.set({ uiState: state });
}

function restoreUIState(state) {
  if(state === undefined) return;
  if (state.currentView === "add") {
    showAddView(state.editingIndex);

    if (state.draft) {
      nameInput.value = state.draft.name || "";
      secretInput.value = state.draft.secret || "";
      digitsInput.value = state.draft.digits || 6;
      algorithmInput.value = state.draft.algorithm || "SHA-1";
      periodInput.value = state.draft.period || 30;
    }
  } else {
    showAccountsView();
  }
}


// ------------------ Run At Start ------------------

[nameInput, secretInput, digitsInput, algorithmInput, periodInput]
  .forEach(input => {
    input.addEventListener("input", saveUIState);
    input.addEventListener("change", saveUIState);
});

document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = browser.i18n.getMessage(key);
});

browser.storage.local.get(["uiState"]).then(async result => {

  password = await getSessionPassword();

  accounts = await loadAccounts(password);
  renderAccounts();
  restoreUIState(result.uiState);

  if(await isDarkMode()){
    document.body.classList.add("dark");   // Dark
  }
});

setInterval(updateCodes, 500);