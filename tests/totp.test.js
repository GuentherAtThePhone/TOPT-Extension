/**
 * Unit Tests for TOTP Generator (RFC 6238) and Base32 conversion.
 */

describe('TOTP Generator & Base32 Decoding', () => {
  const originalDateNow = Date.now;

  // RFC 6238 Appendix B & Errata 2866 Test Secrets:
  // SHA-1 (20 bytes): "12345678901234567890" in Base32
  const rfcSecret1 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  // SHA-256 (32 bytes): "12345678901234567890123456789012" in Base32
  const rfcSecret256 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA';
  // SHA-512 (64 bytes): "1234567890123456789012345678901234567890123456789012345678901234" in Base32
  const rfcSecret512 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA';

  const setTime = (seconds) => {
    Date.now = () => seconds * 1000;
  };

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('base32ToUint8Array()', () => {
    it('should decode valid standard base32 string', () => {
      const bytes = base32ToUint8Array('JBSWY3DPEHPK3PXP');
      expect(bytes).toBeDefined();
      expect(bytes).toHaveLength(10);
      // "JBSWY3DPEHPK3PXP" begins with ASCII "Hello!"
      expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe('Hello!');
    });

    it('should decode RFC 20-byte secret for SHA-1', () => {
      const bytes = base32ToUint8Array(rfcSecret1);
      expect(bytes).toHaveLength(20);
      expect(new TextDecoder().decode(bytes)).toBe('12345678901234567890');
    });

    it('should decode RFC 32-byte secret for SHA-256', () => {
      const bytes = base32ToUint8Array(rfcSecret256);
      expect(bytes).toHaveLength(32);
      expect(new TextDecoder().decode(bytes)).toBe('12345678901234567890123456789012');
    });

    it('should decode RFC 64-byte secret for SHA-512', () => {
      const bytes = base32ToUint8Array(rfcSecret512);
      expect(bytes).toHaveLength(64);
      expect(new TextDecoder().decode(bytes)).toBe('1234567890123456789012345678901234567890123456789012345678901234');
    });

    it('should handle padding characters and lowercase input', () => {
      const bytesUpper = base32ToUint8Array('MZXW6===');
      const bytesLower = base32ToUint8Array('mzxw6===');
      expect(bytesUpper).toHaveLength(3);
      expect(new TextDecoder().decode(bytesUpper)).toBe('foo');
      expect(bytesLower).toEqual(bytesUpper);
    });

    it('should ignore whitespace and formatting spaces', () => {
      const bytesWithSpaces = base32ToUint8Array('JBSWY 3DPEH PK3PXP');
      const bytesClean = base32ToUint8Array('JBSWY3DPEHPK3PXP');
      expect(bytesWithSpaces).toEqual(bytesClean);
    });

    it('should return empty Uint8Array for empty string', () => {
      expect(base32ToUint8Array('')).toHaveLength(0);
    });
  });

  describe('RFC 6238 Test Vectors (SHA-1, 8 digits)', () => {
    const vectors = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130']
    ];

    for (const [time, expected] of vectors) {
      it(`should generate code ${expected} at timestamp ${time}s`, async () => {
        setTime(time);
        expect(await generateTOTP(rfcSecret1, 8, 30, 'SHA-1')).toBe(expected);
      });
    }
  });

  describe('Standard 6-digit TOTP (SHA-1)', () => {
    const vectors = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037']
    ];

    for (const [time, expected] of vectors) {
      it(`should generate 6-digit code ${expected} at timestamp ${time}s`, async () => {
        setTime(time);
        expect(await generateTOTP(rfcSecret1, 6, 30, 'SHA-1')).toBe(expected);
      });
    }
  });

  describe('RFC 6238 Test Vectors (SHA-256, 8 digits)', () => {
    const vectors = [
      [59, '46119246'],
      [1111111109, '68084774'],
      [1111111111, '67062674'],
      [1234567890, '91819424'],
      [2000000000, '90698825'],
      [20000000000, '77737706']
    ];

    for (const [time, expected] of vectors) {
      it(`should generate SHA-256 code ${expected} at timestamp ${time}s`, async () => {
        setTime(time);
        expect(await generateTOTP(rfcSecret256, 8, 30, 'SHA-256')).toBe(expected);
      });
    }
  });

  describe('RFC 6238 Test Vectors (SHA-512, 8 digits)', () => {
    const vectors = [
      [59, '90693936'],
      [1111111109, '25091201'],
      [1111111111, '99943326'],
      [1234567890, '93441116'],
      [2000000000, '38618901'],
      [20000000000, '47863826']
    ];

    for (const [time, expected] of vectors) {
      it(`should generate SHA-512 code ${expected} at timestamp ${time}s`, async () => {
        setTime(time);
        expect(await generateTOTP(rfcSecret512, 8, 30, 'SHA-512')).toBe(expected);
      });
    }
  });

  describe('Period, Offset & Formatting', () => {
    it('should respect custom period (e.g. 60 seconds)', async () => {
      setTime(60);
      expect(await generateTOTP(rfcSecret1, 6, 60, 'SHA-1')).toBe('287082'); // Counter 1
      expect(await generateTOTP(rfcSecret1, 6, 30, 'SHA-1')).toBe('359152'); // Counter 2
    });

    it('should generate next period code when offset is +1', async () => {
      setTime(0);
      expect(await generateTOTP(rfcSecret1, 6, 30, 'SHA-1', 0)).toBe('755224'); // Counter 0
      expect(await generateTOTP(rfcSecret1, 6, 30, 'SHA-1', 1)).toBe('287082'); // Counter 1
    });

    it('should pad code with leading zeros if needed', async () => {
      setTime(1111111109);
      const code = await generateTOTP(rfcSecret1, 6, 30, 'SHA-1');
      expect(code).toBe('081804');
      expect(code).toHaveLength(6);
    });
  });
});