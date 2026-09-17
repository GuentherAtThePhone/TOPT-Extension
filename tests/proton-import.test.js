/**
 * Unit Tests für den Proton Authenticator Backup Import.
 *
 * Testet beide Backup-Dateien aus TestFiles/:
 *  1. proton_authenticator_backup.json         – unverschlüsselt (4 Accounts)
 *  2. proton_authenticator_backup_pw;123.json  – verschlüsselt mit Passwort "123"
 *
 * Die Funktion parseJson() (converter.js) verarbeitet beide Formate:
 *  - Unverschlüsselt: { version, entries: [{ content: { uri } }] }
 *  - Verschlüsselt:   { version, salt, content }  → zeigt Alert, gibt kein Array zurück
 */

describe('Proton Authenticator Backup Import', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // Hilfsfunktionen
  // ─────────────────────────────────────────────────────────────────────────

  /** Liest eine Datei aus TestFiles/ als UTF-8-String. */
  function readTestFileAsText(filename) {
    if (typeof require !== 'undefined') {
      const fs   = require('fs');
      const path = require('path');
      return Promise.resolve(
        fs.readFileSync(path.resolve(__dirname, 'TestFiles', filename), 'utf8')
      );
    }
    return fetch('TestFiles/' + filename).then(r => r.text());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Dateien einlesbar & valides JSON
  // ─────────────────────────────────────────────────────────────────────────

  describe('Dateien einlesbar und valides JSON', () => {
    it('sollte proton_authenticator_backup.json ohne Fehler einlesen', async () => {
      const text = await readTestFileAsText('proton_authenticator_backup.json');
      expect(text).toBeDefined();
      expect(text.length).not.toBe(0);
    });

    it('sollte proton_authenticator_backup.json als valides JSON parsen', async () => {
      const text   = await readTestFileAsText('proton_authenticator_backup.json');
      const parsed = JSON.parse(text);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });

    it('sollte proton_authenticator_backup_pw;123.json ohne Fehler einlesen', async () => {
      const text = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      expect(text).toBeDefined();
      expect(text.length).not.toBe(0);
    });

    it('sollte proton_authenticator_backup_pw;123.json als valides JSON parsen', async () => {
      const text   = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      const parsed = JSON.parse(text);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Struktur der unverschlüsselten Backup-Datei
  // ─────────────────────────────────────────────────────────────────────────

  describe('Struktur: unverschlüsselte Backup-Datei', () => {
    let parsed;

    beforeEach(async () => {
      const text = await readTestFileAsText('proton_authenticator_backup.json');
      parsed = JSON.parse(text);
    });

    it('sollte das Feld "version" enthalten', () => {
      expect(parsed.version).toBeDefined();
      expect(parsed.version).toBe(1);
    });

    it('sollte ein Array "entries" enthalten', () => {
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    it('sollte genau 4 Einträge enthalten', () => {
      expect(parsed.entries).toHaveLength(4);
    });

    it('sollte kein "salt"- oder "content"-Feld besitzen (kein verschlüsseltes Format)', () => {
      expect(parsed.salt).toBeUndefined();
      expect(parsed.content).toBeUndefined();
    });

    it('jeder Eintrag sollte eine otpauth:// URI im Feld content.uri haben', () => {
      parsed.entries.forEach((entry, i) => {
        expect(entry.content).toBeDefined();
        expect(typeof entry.content.uri).toBe('string');
        expect(entry.content.uri.startsWith('otpauth://')).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Struktur der verschlüsselten Backup-Datei
  // ─────────────────────────────────────────────────────────────────────────

  describe('Struktur: verschlüsselte Backup-Datei (PW: "123")', () => {
    let parsed;

    beforeEach(async () => {
      const text = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      parsed = JSON.parse(text);
    });

    it('sollte das Feld "version" enthalten', () => {
      expect(parsed.version).toBeDefined();
      expect(parsed.version).toBe(1);
    });

    it('sollte ein "salt"-Feld (Base64-String) enthalten', () => {
      expect(typeof parsed.salt).toBe('string');
      expect(parsed.salt.length).not.toBe(0);
    });

    it('sollte ein "content"-Feld (verschlüsselter Ciphertext) enthalten', () => {
      expect(typeof parsed.content).toBe('string');
      expect(parsed.content.length).not.toBe(0);
    });

    it('sollte kein "entries"-Array besitzen (Daten sind verschlüsselt)', () => {
      expect(parsed.entries).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. parseJson() – unverschlüsselte Datei importieren
  // ─────────────────────────────────────────────────────────────────────────

  describe('parseJson() – unverschlüsselte Backup-Datei', () => {
    let accounts;

    beforeEach(async () => {
      const text = await readTestFileAsText('proton_authenticator_backup.json');
      accounts = await parseJson(text);
    });

    it('sollte ein Array zurückgeben', () => {
      expect(Array.isArray(accounts)).toBe(true);
    });

    it('sollte genau 4 Accounts zurückgeben', () => {
      expect(accounts).toHaveLength(4);
    });

    it('alle zurückgegebenen Accounts sollten definiert und keine null-Werte sein', () => {
      accounts.forEach(acc => {
        expect(acc).toBeDefined();
        expect(acc === null).toBe(false);
      });
    });

    it('alle Accounts sollten ein nicht-leeres secret haben', () => {
      accounts.forEach(acc => {
        expect(typeof acc.secret).toBe('string');
        expect(acc.secret.length).not.toBe(0);
      });
    });

    it('Account 1 – TestUser: sollte korrekte Felder haben (SHA-512, 8 Ziffern, 30s)', () => {
      const acc = accounts[0];
      expect(acc.issuer).toBe('SomeIssuer');
      expect(acc.account).toBe('TestUser@Usergoup | TOTPDEACFFDA5');
      expect(acc.algorithm).toBe('SHA-512');
      expect(acc.digits).toBe(8);
      expect(acc.period).toBe(30);
      expect(acc.type).toBe('totp');
      expect(acc.secret).toBe('3AIHD4T7JSFK3GOTD4JFQFYZ2HY2RXWRV6F43DGNTEHUNCZCY3E2M5EXON673V6VRCB6YO66PKRFBYX4WCVWSCLRBQ53SGJAZ5OD7LA');
    });

    it('Account 2 – TestAccount: sollte korrekte Felder haben (SHA-512, 6 Ziffern, 30s)', () => {
      const acc = accounts[1];
      expect(acc.issuer).toBe('AnotherIssuer');
      expect(acc.account).toBe('TestAccount@Usergoup | TOTPDEBA3DA1');
      expect(acc.algorithm).toBe('SHA-512');
      expect(acc.digits).toBe(6);
      expect(acc.period).toBe(30);
      expect(acc.type).toBe('totp');
    });

    it('Account 3 – UserAccount: sollte korrekte Felder haben (SHA-256, 6 Ziffern, 60s)', () => {
      const acc = accounts[2];
      expect(acc.issuer).toBe('AnotherIssuer');
      expect(acc.account).toBe('UserAccount@Usergoup | TOTPDEKI849A');
      expect(acc.algorithm).toBe('SHA-256');
      expect(acc.digits).toBe(6);
      expect(acc.period).toBe(60);
      expect(acc.type).toBe('totp');
    });

    it('Account 4 – AccountTest: sollte korrekte Felder haben (SHA-1, 8 Ziffern, 30s)', () => {
      const acc = accounts[3];
      expect(acc.issuer).toBe('SomeIssuer');
      expect(acc.account).toBe('AccountTest@Usergoup | TOTPDEKI8ABC');
      expect(acc.algorithm).toBe('SHA-1');
      expect(acc.digits).toBe(8);
      expect(acc.period).toBe(30);
      expect(acc.type).toBe('totp');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. parseJson() – verschlüsselte Datei: Format erkannt, kein Absturz
  // ─────────────────────────────────────────────────────────────────────────

  describe('parseJson() – verschlüsselte Backup-Datei (PW: "123")', () => {
    let alertCalled;
    let originalAlert;

    beforeEach(() => {
      alertCalled = false;
      // window.alert mocken – parseJson ruft alert() für verschlüsselte Proton-Backups auf
      originalAlert = (typeof globalThis !== 'undefined' ? globalThis : window).alert;
      (typeof globalThis !== 'undefined' ? globalThis : window).alert = () => {
        alertCalled = true;
      };
    });

    afterEach(() => {
      (typeof globalThis !== 'undefined' ? globalThis : window).alert = originalAlert;
    });

    it('sollte keinen Fehler werfen (kein Absturz beim Erkennen des Formats)', async () => {
      const text = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      let threw = false;
      try {
        await parseJson(text);
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    it('sollte window.alert() aufrufen (Nutzer auf verschlüsseltes Format hinweisen)', async () => {
      const text = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      await parseJson(text);
      expect(alertCalled).toBe(true);
    });

    it('sollte kein Account-Array zurückgeben (Daten sind nicht entschlüsselt)', async () => {
      const text   = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      const result = await parseJson(text);
      // parseJson() gibt für verschlüsselte Proton-Backups das originale JSON-Objekt
      // {version, salt, content} zurück – kein Array mit Account-Objekten.
      expect(Array.isArray(result)).toBe(false);
    });

    it('sollte das verschlüsselte Format korrekt erkennen (version + salt + content)', async () => {
      const text   = await readTestFileAsText('proton_authenticator_backup_pw;123.json');
      const parsed = JSON.parse(text);
      // Sicherstellen, dass die Erkennungslogik greift:
      expect(parsed.version).toBeDefined();
      expect(typeof parsed.salt).toBe('string');
      expect(typeof parsed.content).toBe('string');
      // Kein entries-Array – das ist das Unterscheidungsmerkmal
      expect(Array.isArray(parsed.entries)).toBe(false);
    });
  });
});

