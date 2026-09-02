/**
 * Unit Tests for Account & Settings Models (account.js, settingsModel.js).
 */

describe('Account & Settings Models', () => {

  beforeEach(async () => {
    await browser.storage.local.clear();
    await browser.storage.session.clear();
  });

  describe('Account Model', () => {
    it('should correctly instantiate Account with all properties', () => {
      const acc = new Account(
        'GitHub user',
        'JBSWY3DPEHPK3PXP',
        'GitHub:user',
        'user',
        'GitHub',
        6,
        'SHA-1',
        'totp',
        0,
        30
      );

      expect(acc.name).toBe('GitHub user');
      expect(acc.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(acc.label).toBe('GitHub:user');
      expect(acc.account).toBe('user');
      expect(acc.issuer).toBe('GitHub');
      expect(acc.digits).toBe(6);
      expect(acc.algorithm).toBe('SHA-1');
      expect(acc.type).toBe('totp');
      expect(acc.counter).toBe(0);
      expect(acc.period).toBe(30);
    });

    it('should save and load unencrypted accounts when password is null', async () => {
      const accountsList = [
        new Account('Google', 'JBSWY3DPEHPK3PXP', 'Google:u', 'u', 'Google', 6, 'SHA-1', 'totp', 0, 30),
        new Account('GitHub', 'HXDMVJECJJWSRB3H', 'GitHub:u', 'u', 'GitHub', 6, 'SHA-1', 'totp', 0, 30)
      ];

      await saveAccounts(accountsList, null);
      const loaded = await loadAccounts(null);

      expect(loaded).toBeDefined();
      expect(loaded.length).toBe(2);
      expect(loaded[0].name).toBe('Google');
      expect(loaded[1].name).toBe('GitHub');
    });

    it('should save and load encrypted accounts when master password hash is provided', async () => {
      const accountsList = [
        new Account('Proton', 'JBSWY3DPEHPK3PXP', 'Proton:u', 'u', 'Proton', 6, 'SHA-256', 'totp', 0, 30)
      ];

      const pwHash = await hash('MyMasterKey123');

      await saveAccounts(accountsList, pwHash);

      // Verify raw storage contains encrypted payload object (not plaintext JSON array)
      const rawStored = await browser.storage.local.get('accounts');
      expect(rawStored.accounts.encrypted).toBeDefined();
      expect(rawStored.accounts.iv).toBeDefined();
      expect(rawStored.accounts.salt).toBeDefined();

      // Load with correct password
      const decryptedAccounts = await loadAccounts(pwHash);
      expect(decryptedAccounts.length).toBe(1);
      expect(decryptedAccounts[0].name).toBe('Proton');
      expect(decryptedAccounts[0].secret).toBe('JBSWY3DPEHPK3PXP');
    });

    it('should return empty array when no accounts are saved', async () => {
      const loaded = await loadAccounts(null);
      expect(loaded).toEqual([]);
    });
  });

  describe('Settings Model', () => {
    it('should instantiate Settings object with specified values', () => {
      const s = new Settings('dark', 'large', false, true);
      expect(s.theme).toBe('dark');
      expect(s.fontSize).toBe('large');
      expect(s.nextCode).toBe(false);
      expect(s.masterPasswordEnabled).toBe(true);
    });

    it('createDefaultSettings() should save and return default settings', async () => {
      await browser.storage.local.set({ masterPasswordEnabled: false });

      const settings = await createDefaultSettings();
      expect(settings.theme).toBe('default');
      expect(settings.fontSize).toBe('medium');
      expect(settings.nextCode).toBe(true);
      expect(settings.masterPasswordEnabled).toBe(false);

      const stored = await browser.storage.local.get('settings');
      expect(stored.settings.theme).toBe('default');
    });

    it('isDarkMode() should return correct value based on stored theme', async () => {
      await browser.storage.local.set({ settings: { theme: 'dark' } });
      const isDark = await isDarkMode();
      expect(isDark).toBe(true);

      await browser.storage.local.set({ settings: { theme: 'light' } });
      const isLight = await isDarkMode();
      expect(isLight).toBe(false);
    });

    it('isShowNextCode() should return stored nextCode preference', async () => {
      await browser.storage.local.set({ settings: { nextCode: false } });
      expect(await isShowNextCode()).toBe(false);

      await browser.storage.local.set({ settings: { nextCode: true } });
      expect(await isShowNextCode()).toBe(true);

      // Default when settings is missing
      await browser.storage.local.clear();
      expect(await isShowNextCode()).toBe(true);
    });

    it('getFontSize() should return stored font size or default', async () => {
      await browser.storage.local.set({ settings: { fontSize: 'small' } });
      expect(await getFontSize()).toBe('small');

      await browser.storage.local.clear();
      expect(await getFontSize()).toBe('medium');
    });
  });
});