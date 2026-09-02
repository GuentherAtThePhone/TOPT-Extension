/**
 * Unit Tests for HOTP Generator (RFC 4226) and base32ToBytes.
 */

describe('HOTP Generator (RFC 4226)', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC 4226 Appendix D 20-byte test secret

  describe('base32ToBytes()', () => {
    it('should convert valid Base32 to byte array', () => {
      const bytes = base32ToBytes(secret);
      expect(bytes.length).toBe(20);
      expect(bytes[0]).toBe(0x31); // '1'
      expect(bytes[1]).toBe(0x32); // '2'
      expect(bytes[2]).toBe(0x33); // '3'
      expect(bytes[3]).toBe(0x34); // '4'
      expect(bytes[4]).toBe(0x35); // '5'
    });

    it('should ignore padding characters', () => {
      const bytes = base32ToBytes('MZXW6===');
      expect(bytes.length).toBe(3);
      expect(bytes[0]).toBe(102); // 'f'
      expect(bytes[1]).toBe(111); // 'o'
      expect(bytes[2]).toBe(111); // 'o'
    });
  });

  describe('generateHOTP() - RFC 4226 Test Vectors (6 digits)', () => {
    const rfcVectors6 = [
      { counter: 0, expected: '755224' },
      { counter: 1, expected: '287082' },
      { counter: 2, expected: '359152' },
      { counter: 3, expected: '969429' },
      { counter: 4, expected: '338314' },
      { counter: 5, expected: '254676' },
      { counter: 6, expected: '287922' },
      { counter: 7, expected: '162583' },
      { counter: 8, expected: '399871' },
      { counter: 9, expected: '520489' }
    ];

    rfcVectors6.forEach(({ counter, expected }) => {
      it(`should return "${expected}" for counter ${counter}`, async () => {
        const code = await generateHOTP(secret, counter, 6);
        expect(code).toBe(expected);
      });
    });
  });

  describe('generateHOTP() - RFC 4226 Test Vectors (8 digits)', () => {
    const rfcVectors8 = [
      { counter: 0, expected: '84755224' },
      { counter: 1, expected: '94287082' },
      { counter: 2, expected: '37359152' },
      { counter: 3, expected: '26969429' },
      { counter: 4, expected: '73338314' },
      { counter: 5, expected: '72254676' },
      { counter: 6, expected: '25287922' },
      { counter: 7, expected: '47162583' },
      { counter: 8, expected: '88399871' },
      { counter: 9, expected: '45520489' }
    ];

    rfcVectors8.forEach(({ counter, expected }) => {
      it(`should return 8-digit code "${expected}" for counter ${counter}`, async () => {
        const code = await generateHOTP(secret, counter, 8);
        expect(code).toBe(expected);
        expect(code.length).toBe(8);
      });
    });
  });
});