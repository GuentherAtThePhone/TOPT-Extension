let stream = null;
let scanning = false;

const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = browser.i18n.getMessage(key);
});

var password;
var accounts;

window.onload = async () => {
  password = await getSessionPassword();

  accounts = await loadAccounts(password);
}

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Stop camera if switching away
    if (tabName !== 'camera' && scanning) {
      stopCamera();
    }
  });
});

// Camera controls
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const cameraStatus = document.getElementById('cameraStatus');
const result = document.getElementById('result');

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    scanning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    cameraStatus.textContent = browser.i18n.getMessage("cameraStatusScanningText");
    scanQRCode();
  } catch (err) {
    
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  scanning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  cameraStatus.textContent = '';
  video.srcObject = null;
}

function scanQRCode() {
  if (!scanning) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  if (canvas.width > 0 && canvas.height > 0) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Warte auf jsQR zu laden
    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        processQRCode(code.data);
        window.close();
        return;
      }
    }
  }
  
  requestAnimationFrame(scanQRCode);
}

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    console.log('Selected file for import:', file);
    if (!file) return;
    var accs;
    var qrResult;
    try{
        if(file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.2fas')){
            if(file.name.toLowerCase().endsWith('.json')){
              accs = parseJson(await file.text());
              console.log('Parsed accounts from JSON file:', accs);
            }else{
              accs = await parse2fas(await file.text());
              console.log('Parsed accounts from 2FAS file:', accs);
            }
        }else{
          console.log('Parsing picture:', file.name);
            // Scann QR code from image and parse to Account object
            try {
              qrResult = await new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (event) => {
                  const img = new Image();

                  img.onload = () => {
                    try {
                      resolve(processImageForQR(img));
                    } catch (e) {
                      reject(e);
                    }
                  };

                  img.onerror = reject;
                  img.src = event.target.result;
                };

                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              processQRCode(qrResult);

            } catch (err) {
              console.error('Fehler beim Verarbeiten des Bildes:', err);
            }
        }
  }catch(err){
      console.error('Import Fehler:', err);
      alert(browser.i18n.getMessage("importFailedText") + err.message);
  }
  if(accs && accs.length && qrResult === undefined){
      console.log('Importing accounts:', accs);
      accounts.push(...accs);
      console.log('Imported accounts:', accs);
      await saveAccounts(accounts, password);
      alert(browser.i18n.getMessage("importSuccessfullText").replace("{accs.lenght}", accs.length));
      window.close();
  }else{
  }
});


async function processQRCode(qrResult) {
  var accs;
  console.log('QR code data:', qrResult);
  if(qrResult.startsWith('otpauth://')){
    console.log('Parsing otpauth URI from QR code:', qrResult);
    accs = [];
    accs.push(await parseOtpauth(qrResult));
    console.log('Parsed account from otpauth URI:', accs);
  }
  else if(qrResult.startsWith('otpauth-migration://')){
    console.log('Parsing Google Authenticator Migration QR code:', qrResult);
    accs = parseGoogleAuth(qrResult);
  }
  else{
    console.log('QR code does not contain valid content', qrResult);
  }

  if(accs && accs.length){
      console.log('Importing accounts:', accs);
      accounts.push(...accs);
      console.log('Imported accounts:', accs);
      await saveAccounts(accounts, password);
      alert(browser.i18n.getMessage("importSuccessfullText").replace("{accs.lenght}", accs.length));
      window.close();
  }
}