/**
 * Unit Tests for TOTP Generator (RFC 6238) and Base32 conversion.
 */

describe('TOTP Generator & Base32 Decoding', () => {
  const originalDateNow = Date.now;

  // RFC 6238 Test Secret (20-byte key "12345678901234567890" in Base32)
  const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('base32ToUint8Array()', () => {
    it('should decode valid standard base32 string', () => {
      // "JBSWY3DPEHPK3PXP" is Base32 for "Hello!\xde\xad\xbe\xef" -> ascii starts with "Hello!"
      const bytes = base32ToUint8Array('JBSWY3DPEHPK3PXP');
      expect(bytes).toBeDefined();
      expect(bytes.length).toBe(10);
      expect(bytes[0]).toBe(72); // 'H'
      expect(bytes[1]).toBe(101); // 'e'
      expect(bytes[2]).toBe(108); // 'l'
      expect(bytes[3]).toBe(108); // 'l'
      expect(bytes[4]).toBe(111); // 'o'
      expect(bytes[5]).toBe(33); // '!'
    });

    it('should decode RFC 20-byte secret', () => {
      const bytes = base32ToUint8Array(rfcSecret);
      expect(bytes.length).toBe(20);
      expect(bytes[0]).toBe(0x31); // '1'
      expect(bytes[1]).toBe(0x32); // '2'
      expect(bytes[2]).toBe(0x33); // '3'
      expect(bytes[3]).toBe(0x34); // '4'
      expect(bytes[4]).toBe(0x35); // '5'
    });

    it('should handle padding characters and lowercase input', () => {
      const bytesUpper = base32ToUint8Array('MZXW6===');
      const bytesLower = base32ToUint8Array('mzxw6===');
      expect(bytesUpper.length).toBe(3); // 'foo'
      expect(bytesUpper[0]).toBe(102); // 'f'
      expect(bytesUpper[1]).toBe(111); // 'o'
      expect(bytesUpper[2]).toBe(111); // 'o'
      expect(bytesLower).toEqual(bytesUpper);
    });

    it('should ignore invalid characters like whitespace', () => {
      const bytes1 = base32ToUint8Array('JBSWY 3DPEH PK3PXP');
      const bytes2 = base32ToUint8Array('JBSWY3DPEHPK3PXP');
      expect(bytes1).toEqual(bytes2);
    });

    it('should return empty Uint8Array for empty string', () => {
      const bytes = base32ToUint8Array('');
      expect(bytes.length).toBe(0);
    });
  });

  describe('generateTOTP() - RFC 6238 Test Vectors (SHA-1, 8 digits)', () => {
    const testVectors = [
      { time: 59, expected: '94287082' },
      { time: 1111111109, expected: '07081804' },
      { time: 1111111111, expected: '14050471' },
      { time: 1234567890, expected: '89005924' },
      { time: 2000000000, expected: '69279037' },
      { time: 20000000000, expected: '65353130' }
    ];

    testVectors.forEach(({ time, expected }) => {
      it(`should generate code ${expected} at timestamp ${time}s`, async () => {
        Date.now = () => time * 1000;
        const code = await generateTOTP(rfcSecret, 8, 30, 'SHA-1', 0);
        expect(code).toBe(expected);
      });
    });
  });

  describe('generateTOTP() - Standard 6-digit TOTP (SHA-1)', () => {
    const testVectors = [
      { time: 59, expected: '287082' },
      { time: 1111111109, expected: '081804' },
      { time: 1111111111, expected: '050471' },
      { time: 1234567890, expected: '005924' },
      { time: 2000000000, expected: '279037' }
    ];

    testVectors.forEach(({ time, expected }) => {
      it(`should generate 6-digit code ${expected} at timestamp ${time}s`, async () => {
        Date.now = () => time * 1000;
        const code = await generateTOTP(rfcSecret, 6, 30, 'SHA-1', 0);
        expect(code).toBe(expected);
      });
    });
  });

  describe('generateTOTP() - RFC 6238 Test Vectors (SHA-256, 8 digits)', () => {
    const testVectors = [
      { time: 59, expected: '46114546' },
      { time: 1111111109, expected: '68084774' },
      { time: 1111111111, expected: '67062674' },
      { time: 1234567890, expected: '91819424' },
      { time: 2000000000, expected: '90698825' },
      { time: 20000000000, expected: '77737706' }
    ];

    testVectors.forEach(({ time, expected }) => {
      it(`should generate SHA-256 code ${expected} at timestamp ${time}s`, async () => {
        Date.now = () => time * 1000;
        const code = await generateTOTP(rfcSecret, 8, 30, 'SHA-256', 0);
        expect(code).toBe(expected);
      });
    });
  });

  describe('generateTOTP() - RFC 6238 Test Vectors (SHA-512, 8 digits)', () => {
    const testVectors = [
      { time: 59, expected: '90693936' },
      { time: 1111111109, expected: '25091201' },
      { time: 1111111111, expected: '99943326' },
      { time: 1234567890, expected: '93441996' },
      { time: 2000000000, expected: '38618901' },
      { time: 20000000000, expected: '47863826' }
    ];

    testVectors.forEach(({ time, expected }) => {
      it(`should generate SHA-512 code ${expected} at timestamp ${time}s`, async () => {
        Date.now = () => time * 1000;
        const code = await generateTOTP(rfcSecret, 8, 30, 'SHA-512', 0);
        expect(code).toBe(expected);
      });
    });
  });

  describe('generateTOTP() - Period and Offset handling', () => {
    it('should respect custom period (e.g. 60 seconds)', async () => {
      Date.now = () => 60000; // 60s -> counter with period 60 is 1, with period 30 is 2
      const code60 = await generateTOTP(rfcSecret, 6, 60, 'SHA-1', 0);
      const code30 = await generateTOTP(rfcSecret, 6, 30, 'SHA-1', 0);
      expect(code60).toBe('287082'); // Counter 1
      expect(code30).toBe('359152'); // Counter 2
    });

    it('should generate next period code when offset is +1', async () => {
      Date.now = () => 0;
      const currentCode = await generateTOTP(rfcSecret, 6, 30, 'SHA-1', 0);
      const nextCode = await generateTOTP(rfcSecret, 6, 30, 'SHA-1', 1);
      expect(currentCode).toBe('755224'); // Counter 0
      expect(nextCode).toBe('287082'); // Counter 1
    });

    it('should pad code with leading zeros if needed', async () => {
      Date.now = () => 1111111109 * 1000;
      const code = await generateTOTP(rfcSecret, 6, 30, 'SHA-1', 0);
      expect(code).toBe('081804');
      expect(code.length).toBe(6);
      expect(code.startsWith('0')).toBe(true);
    });
  });
});