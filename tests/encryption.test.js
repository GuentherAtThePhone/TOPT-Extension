/**
 * Unit Tests for Encryption & Authentication Logic (encryption.js).
 */

describe('Encryption & Master Password Authentication', () => {

  beforeEach(async () => {
    await browser.storage.local.clear();
    await browser.storage.session.clear();
  });

  describe('encrypt() & decrypt()', () => {
    it('should encrypt and decrypt a plaintext string correctly (round-trip)', async () => {
      const plaintext = 'Secret TOTP Account Data: JBSWY3DPEHPK3PXP';
      const password = 'StrongPassword123!';

      const encryptedData = await encrypt(plaintext, password);

      expect(encryptedData).toBeDefined();
      expect(Array.isArray(encryptedData.encrypted)).toBe(true);
      expect(Array.isArray(encryptedData.iv)).toBe(true);
      expect(Array.isArray(encryptedData.salt)).toBe(true);
      expect(encryptedData.iv.length).toBe(12);
      expect(encryptedData.salt.length).toBe(16);

      const decrypted = await decrypt(encryptedData, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt complex Unicode and JSON strings', async () => {
      const complexObject = JSON.stringify({
        accounts: [
          { name: '🔒 Test & Émile 🚀', secret: 'MZXW6===' }
        ]
      });
      const password = '🔑 Master Key 2026';

      const encryptedData = await encrypt(complexObject, password);
      const decrypted = await decrypt(encryptedData, password);

      expect(decrypted).toBe(complexObject);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(complexObject));
    });

    it('should fail to decrypt with wrong password', async () => {
      const plaintext = 'Sensitive payload';
      const encryptedData = await encrypt(plaintext, 'correct-password');

      let failed = false;
      try {
        await decrypt(encryptedData, 'wrong-password');
      } catch (e) {
        failed = true;
      }
      expect(failed).toBe(true);
    });

    it('should generate different ciphertext and IV for identical plaintexts (salt/IV randomness)', async () => {
      const plaintext = 'Same text';
      const password = 'SamePassword';

      const enc1 = await encrypt(plaintext, password);
      const enc2 = await encrypt(plaintext, password);

      // IVs and salts should be uniquely randomized
      expect(enc1.iv).not.toEqual(enc2.iv);
      expect(enc1.salt).not.toEqual(enc2.salt);
      expect(enc1.encrypted).not.toEqual(enc2.encrypted);
    });
  });

  describe('hash()', () => {
    it('should generate 512-bit (128 hex chars) hash and 16-byte (32 hex chars) salt', async () => {
      const result = await hash('myMasterPassword');

      expect(result).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.salt.length).toBe(32); // 16 bytes = 32 hex chars
      expect(result.hash.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate unique salts for successive calls with the same password', async () => {
      const res1 = await hash('password');
      const res2 = await hash('password');

      expect(res1.salt).not.toBe(res2.salt);
      expect(res1.hash).not.toBe(res2.hash);
    });
  });

  describe('saveMasterPassword() & isMasterPassword()', () => {
    it('should save hashed master password to local storage', async () => {
      await saveMasterPassword('SuperSecret123');

      const stored = await browser.storage.local.get('masterPassword');
      expect(stored.masterPassword).toBeDefined();
      expect(stored.masterPassword.hash).toBeDefined();
      expect(stored.masterPassword.salt).toBeDefined();
    });

    it('should verify correct master password returns true', async () => {
      await saveMasterPassword('ValidPassword999');

      const isCorrect = await isMasterPassword('ValidPassword999');
      expect(isCorrect).toBe(true);
    });

    it('should verify incorrect master password returns false', async () => {
      await saveMasterPassword('ValidPassword999');

      const isCorrect = await isMasterPassword('WrongPassword');
      expect(isCorrect).toBe(false);
    });

    it('should return false if no master password is saved', async () => {
      const isCorrect = await isMasterPassword('SomePassword');
      expect(isCorrect).toBe(false);
    });

    it('should return false when passing empty string', async () => {
      await saveMasterPassword('ValidPassword');
      const isCorrect = await isMasterPassword('');
      expect(isCorrect).toBe(false);
    });
  });
});