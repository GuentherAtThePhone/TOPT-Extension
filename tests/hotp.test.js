/**
 * Unit Tests for HOTP Generator (RFC 4226) and base32ToBytes.
 */

describe('HOTP Generator (RFC 4226)', () => {
  // RFC 4226 Appendix D 20-byte test secret ("12345678901234567890" in Base32)
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  describe('base32ToBytes()', () => {
    it('should convert valid Base32 to byte array', () => {
      const bytes = base32ToBytes(secret);
      expect(bytes).toHaveLength(20);
      expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('12345');
    });

    it('should ignore padding characters and decode correctly', () => {
      const bytes = base32ToBytes('MZXW6===');
      expect(bytes).toHaveLength(3);
      expect(new TextDecoder().decode(bytes)).toBe('foo');
    });
  });

  describe('RFC 4226 Test Vectors (6 digits)', () => {
    const vectors = [
      [0, '755224'],
      [1, '287082'],
      [2, '359152'],
      [3, '969429'],
      [4, '338314'],
      [5, '254676'],
      [6, '287922'],
      [7, '162583'],
      [8, '399871'],
      [9, '520489']
    ];

    for (const [counter, expected] of vectors) {
      it(`should return "${expected}" for counter ${counter}`, async () => {
        expect(await generateHOTP(secret, counter, 6)).toBe(expected);
      });
    }
  });

  describe('RFC 4226 Test Vectors (8 digits)', () => {
    // Derived from RFC 4226 Appendix D Table 2 truncated decimal values modulo 10^8:
    // Count 0: 1284755224 -> 84755224
    // Count 1: 1094287082 -> 94287082
    // Count 2:  137359152 -> 37359152
    // Count 3: 1726969429 -> 26969429
    // Count 4: 1640338314 -> 40338314
    // Count 5:  868254676 -> 68254676
    // Count 6: 1918287922 -> 18287922
    // Count 7:   82162583 -> 82162583
    // Count 8:  673399871 -> 73399871
    // Count 9:  645520489 -> 45520489
    const vectors = [
      [0, '84755224'],
      [1, '94287082'],
      [2, '37359152'],
      [3, '26969429'],
      [4, '40338314'],
      [5, '68254676'],
      [6, '18287922'],
      [7, '82162583'],
      [8, '73399871'],
      [9, '45520489']
    ];

    for (const [counter, expected] of vectors) {
      it(`should return 8-digit code "${expected}" for counter ${counter}`, async () => {
        const code = await generateHOTP(secret, counter, 8);
        expect(code).toBe(expected);
        expect(code).toHaveLength(8);
      });
    }
  });
});