// ------------------ Base32 → Uint8Array ------------------
function base32ToUint8Array(base32) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	let bits = "";
	let cleaned = base32.replace(/=+$/, "").toUpperCase();

	for (let char of cleaned) {
		const val = alphabet.indexOf(char);
		if (val === -1) continue;
		bits += val.toString(2).padStart(5, "0");
	}

	const bytes = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		bytes.push(parseInt(bits.substring(i, i + 8), 2));
	}
	return new Uint8Array(bytes);
}

// ------------------ TOTP Berechnung ------------------
async function generateTOTP(secret, digits = 6, period = 30, algorithm = "SHA-1", offset = 0) {
	const keyData = base32ToUint8Array(secret);
	const counter = Math.floor(Date.now() / 1000 / period) + offset;

	const buffer = new ArrayBuffer(8);
	const view = new DataView(buffer);
	view.setUint32(4, counter);

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: algorithm },
		false,
		["sign"]
	);

	const hmac = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
	const hmacView = new DataView(hmac);

	const offsetBits = hmacView.getUint8(hmac.byteLength - 1) & 0xf;
	const code =
		((hmacView.getUint32(offsetBits) & 0x7fffffff) % 10 ** digits)
			.toString()
			.padStart(digits, "0");

	return code;
}
