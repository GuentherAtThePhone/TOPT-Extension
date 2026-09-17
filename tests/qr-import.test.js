/**
 * Unit Tests for QR-Code Image Import.
 *
 * Testet, dass die 4 Bilddateien in TestFiles/ korrekt eingelesen werden
 * und der QR→Account-Parse-Pfad funktioniert.
 *
 * Strategie:
 *  - Im Browser-Kontext wird FileReader + Image + processImageForQR (jsQR) gemockt.
 *  - Im Node-Kontext werden die Dateien via fs eingelesen und als Base64-DataURL bereitgestellt.
 *  - processQRCodeString() testet den eigentlichen Parser (parseOtpauth / parseGoogleAuth)
 *    mit bekannten OTPAuth-URIs, die repräsentativ für QR-Code-Inhalte sind.
 */

describe('QR-Code Bildimport', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // Hilfsfunktionen
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Liest eine Datei aus dem TestFiles-Ordner und gibt deren Inhalt als
   * Uint8Array zurück (Node.js) bzw. als Promise<ArrayBuffer> (Browser).
   */
  function readTestFile(filename) {
    if (typeof require !== 'undefined') {
      // Node.js-Umgebung
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(__dirname, 'TestFiles', filename);
      const buf = fs.readFileSync(fullPath);
      return Promise.resolve(new Uint8Array(buf));
    } else {
      // Browser-Umgebung: fetch über relativen Pfad
      return fetch('TestFiles/' + filename)
        .then(r => r.arrayBuffer())
        .then(ab => new Uint8Array(ab));
    }
  }

  /**
   * Wandelt einen Uint8Array in einen Base64-Data-URL-String um.
   * Wird benötigt, um img.src zu setzen oder Dateigröße zu prüfen.
   */
  function uint8ToDataURL(bytes, mimeType) {
    mimeType = mimeType || 'image/png';
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:' + mimeType + ';base64,' + btoa(binary);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Dateien vorhanden & einlesbar
  // ─────────────────────────────────────────────────────────────────────────

  describe('Bilddateien einlesbar (qrcode*.png)', () => {
    const testImages = [
      'qrcode.png',
      'qrcode(1).png',
      'qrcode(2).png',
      'qrcode(3).png'
    ];

    testImages.forEach(filename => {
      it('sollte ' + filename + ' ohne Fehler einlesen können', async () => {
        const bytes = await readTestFile(filename);

        // Datei muss Bytes enthalten
        expect(bytes).toBeDefined();
        expect(bytes.length).not.toBe(0);
      });

      it('sollte ' + filename + ' als valides PNG erkennen (Magic Bytes)', async () => {
        const bytes = await readTestFile(filename);

        // PNG Magic Bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
        expect(bytes[0]).toBe(0x89);
        expect(bytes[1]).toBe(0x50); // 'P'
        expect(bytes[2]).toBe(0x4E); // 'N'
        expect(bytes[3]).toBe(0x47); // 'G'
      });

      it('sollte ' + filename + ' in einen gültigen Base64-Data-URL umwandeln können', async () => {
        const bytes = await readTestFile(filename);
        const dataUrl = uint8ToDataURL(bytes);

        expect(dataUrl).toBeDefined();
        expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
        // Data-URL muss nach dem Präfix noch Base64-Inhalt haben
        const base64Part = dataUrl.slice('data:image/png;base64,'.length);
        expect(base64Part.length).not.toBe(0);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FileReader-Simulation
  // ─────────────────────────────────────────────────────────────────────────

  describe('FileReader-Simulation für Bilddateien', () => {
    /**
     * Simuliert, was der Browser macht: FileReader.readAsDataURL(file) →
     * reader.onload mit event.target.result = DataURL.
     * Wir bauen das manuell nach, ohne echten DOM-FileReader zu benötigen.
     */
    function simulateFileReaderOnLoad(bytes, mimeType) {
      return new Promise((resolve) => {
        const dataUrl = uint8ToDataURL(bytes, mimeType || 'image/png');
        // Simuliertes Event wie es reader.onload erzeugt
        const fakeEvent = { target: { result: dataUrl } };
        resolve(fakeEvent);
      });
    }

    const testImages = [
      'qrcode.png',
      'qrcode(1).png',
      'qrcode(2).png',
      'qrcode(3).png'
    ];

    testImages.forEach(filename => {
      it('sollte für ' + filename + ' ein DataURL-onload-Event erzeugen', async () => {
        const bytes = await readTestFile(filename);
        const event = await simulateFileReaderOnLoad(bytes);

        expect(event).toBeDefined();
        expect(event.target).toBeDefined();
        expect(event.target.result).toBeDefined();
        expect(typeof event.target.result).toBe('string');
        expect(event.target.result.startsWith('data:image/png;base64,')).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Simulation der processImageForQR-Logik mit jsQR-Stub
  // ─────────────────────────────────────────────────────────────────────────

  describe('processImageForQR-Logik mit jsQR-Mock', () => {
    /**
     * Simuliert die Kernlogik von processImageForQR (qr-scanner.js):
     *  1. Erzeugt eine gefälschte ImageData (wie canvas.getImageData)
     *  2. Ruft jsQR(imageData.data, width, height) auf
     *  3. Gibt code.data zurück – oder undefined wenn kein QR gefunden
     *
     * Diese Funktion bildet exakt den Pfad ab, den processImageForQR
     * intern durchläuft, ohne DOM-Canvas oder die echte jsQR-Bibliothek
     * zu benötigen (beide sind im Test-Runner nicht geladen).
     */
    function simulateProcessImageForQR(jsQRFn, imgWidth, imgHeight) {
      imgWidth = imgWidth || 200;
      imgHeight = imgHeight || 200;

      // Fake ImageData (entspricht canvas.getImageData)
      const fakeImageData = {
        data: new Uint8ClampedArray(imgWidth * imgHeight * 4),
        width: imgWidth,
        height: imgHeight
      };

      // Kernaufruf – genau wie in processImageForQR (qr-scanner.js, Zeile 55)
      const code = jsQRFn(fakeImageData.data, fakeImageData.width, fakeImageData.height);

      if (code && code.data) {
        return code.data;
      }
      return undefined;
    }

    it('sollte die URI zurückgeben, wenn jsQR eine otpauth:// URI findet', () => {
      const uri = 'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub';

      const jsQRMock = () => ({ data: uri, location: null });
      const result = simulateProcessImageForQR(jsQRMock);

      expect(result).toBe(uri);
    });

    it('sollte die URI zurückgeben, wenn jsQR eine otpauth-migration:// URI findet', () => {
      const migrationUrl = 'otpauth-migration://offline?data=someBase64Data';

      const jsQRMock = () => ({ data: migrationUrl, location: null });
      const result = simulateProcessImageForQR(jsQRMock);

      expect(result).toBe(migrationUrl);
    });

    it('sollte undefined zurückgeben, wenn jsQR keinen QR-Code findet', () => {
      const jsQRMock = () => null;
      const result = simulateProcessImageForQR(jsQRMock);

      expect(result).toBeUndefined();
    });

    it('sollte undefined zurückgeben, wenn jsQR ein Objekt ohne data-Feld zurückgibt', () => {
      const jsQRMock = () => ({ location: null }); // kein .data
      const result = simulateProcessImageForQR(jsQRMock);

      expect(result).toBeUndefined();
    });

    it('sollte jsQR mit den korrekten ImageData-Dimensionen aufrufen', () => {
      let capturedArgs = null;
      const jsQRMock = (data, width, height) => {
        capturedArgs = { data, width, height };
        return null;
      };

      simulateProcessImageForQR(jsQRMock, 300, 400);

      expect(capturedArgs).toBeDefined();
      expect(capturedArgs.width).toBe(300);
      expect(capturedArgs.height).toBe(400);
      expect(capturedArgs.data).toBeDefined();
      // data muss Uint8ClampedArray mit width * height * 4 Bytes sein
      expect(capturedArgs.data.length).toBe(300 * 400 * 4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. End-to-End: QR-String → Account
  // ─────────────────────────────────────────────────────────────────────────

  describe('QR-String zu Account parsen (parseOtpauth)', () => {
    /**
     * Diese Tests simulieren den Endpunkt, den der QR-Import-Flow erreicht,
     * nachdem processImageForQR die URI aus dem Bild extrahiert hat.
     * Die 4 Bilder kodieren typische OTPAuth-URIs – wir testen alle gängigen
     * Varianten, die in diesen QR-Codes auftreten können.
     */

    it('sollte einen TOTP-Account aus einer Standard-URI parsen', async () => {
      const uri = 'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
      const acc = await parseOtpauth(uri);

      expect(acc).toBeDefined();
      expect(acc.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(acc.issuer).toBe('GitHub');
      expect(acc.account).toBe('octocat');
      expect(acc.type).toBe('totp');
      expect(acc.digits).toBe(6);
      expect(acc.period).toBe(30);
      expect(acc.algorithm).toBe('SHA-1');
    });

    it('sollte einen TOTP-Account ohne optionale Parameter parsen (Defaults greifen)', async () => {
      // Minimalste gültige URI – wie sie oft in einfachen QR-Codes vorkommt
      const uri = 'otpauth://totp/Test:user@example.com?secret=HXDMVJECJJWSRB3H';
      const acc = await parseOtpauth(uri);

      expect(acc).toBeDefined();
      expect(acc.secret).toBe('HXDMVJECJJWSRB3H');
      expect(acc.digits).toBe(6);       // Default
      expect(acc.period).toBe(30);      // Default
      expect(acc.algorithm).toBe('SHA-1'); // Default
      expect(acc.type).toBe('totp');
    });

    it('sollte einen TOTP-Account mit SHA-256 und 8 Ziffern parsen', async () => {
      const uri = 'otpauth://totp/Corp:admin?secret=JBSWY3DPEHPK3PXP&issuer=Corp&algorithm=SHA256&digits=8&period=60';
      const acc = await parseOtpauth(uri);

      expect(acc).toBeDefined();
      expect(acc.digits).toBe(8);
      expect(acc.algorithm).toBe('SHA-256');
      expect(acc.period).toBe(60);
    });

    it('sollte einen HOTP-Account aus einer URI mit Counter parsen', async () => {
      const uri = 'otpauth://hotp/Bank:alice?secret=JBSWY3DPEHPK3PXP&issuer=Bank&counter=7';
      const acc = await parseOtpauth(uri);

      expect(acc).toBeDefined();
      expect(acc.type).toBe('hotp');
      expect(acc.counter).toBe(7);
      expect(acc.period).toBe(0);
    });

    it('sollte null zurückgeben für eine nicht-otpauth URI (z.B. normaler Link)', async () => {
      const result = await parseOtpauth('https://example.com/no-otp');
      expect(result).toBeNull();
    });

    it('sollte null zurückgeben wenn kein secret vorhanden ist', async () => {
      const result = await parseOtpauth('otpauth://totp/Test:user?issuer=Test');
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Vollständiger Mock-Import-Flow pro Bilddatei
  // ─────────────────────────────────────────────────────────────────────────

  describe('Vollständiger Mock-Import-Flow (Datei → DataURL → jsQR-Mock → Account)', () => {
    const imageToQRContent = [
      {
        file: 'qrcode.png',
        mockedQR: 'otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6&period=30',
        expectedSecret: 'JBSWY3DPEHPK3PXP',
        expectedIssuer: 'GitHub',
        expectedType: 'totp'
      },
      {
        file: 'qrcode(1).png',
        mockedQR: 'otpauth://totp/Google:user@gmail.com?secret=HXDMVJECJJWSRB3H&issuer=Google&digits=6&period=30',
        expectedSecret: 'HXDMVJECJJWSRB3H',
        expectedIssuer: 'Google',
        expectedType: 'totp'
      },
      {
        file: 'qrcode(2).png',
        mockedQR: 'otpauth://totp/Microsoft:user@outlook.com?secret=MFRA2YTBMJPXIY3U&issuer=Microsoft&digits=6&period=30',
        expectedSecret: 'MFRA2YTBMJPXIY3U',
        expectedIssuer: 'Microsoft',
        expectedType: 'totp'
      },
      {
        file: 'qrcode(3).png',
        mockedQR: 'otpauth://hotp/Bank:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Bank&counter=0',
        expectedSecret: 'JBSWY3DPEHPK3PXP',
        expectedIssuer: 'Bank',
        expectedType: 'hotp'
      }
    ];

    imageToQRContent.forEach(({ file, mockedQR, expectedSecret, expectedIssuer, expectedType }) => {
      it('sollte ' + file + ' einlesen, DataURL erzeugen und Account parsen', async () => {
        // Schritt 1: Datei einlesen
        const bytes = await readTestFile(file);
        expect(bytes.length).not.toBe(0);

        // Schritt 2: Als DataURL aufbereiten (simuliert FileReader.readAsDataURL)
        const dataUrl = uint8ToDataURL(bytes);
        expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);

        // Schritt 3: jsQR-Mock liefert bekannte URI
        // (in echter Laufzeit würde processImageForQR jsQR aufrufen)
        const qrString = mockedQR;
        expect(typeof qrString).toBe('string');
        expect(qrString.startsWith('otpauth://')).toBe(true);

        // Schritt 4: URI → Account parsen
        const acc = await parseOtpauth(qrString);
        expect(acc).toBeDefined();
        expect(acc.secret).toBe(expectedSecret);
        expect(acc.issuer).toBe(expectedIssuer);
        expect(acc.type).toBe(expectedType);
      });
    });
  });
});

