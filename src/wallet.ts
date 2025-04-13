// GPT Generated, the goal is to improve my understanding on how all of this work.
import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import { Buffer } from "node:buffer";

const __filename = new URL("", import.meta.url).pathname;
// Will contain trailing slash
const __dirname = new URL(".", import.meta.url).pathname;

// --- BIP39 Wordlist (English, first 2048 words) ---
const wordlist = Deno.readTextFileSync(`${__dirname}/../bip39-wordlist.txt`)
  .trim() // remove trailling enter (last line)
  .split("\n");

// --- Generate mnemonic ---
export function generateMnemonic(bits = 128) {
  const entropy = randomBytes(bits / 8);
  const hash = createHash("sha256").update(entropy).digest();
  const entropyBits = [...entropy].map((b) => b.toString(2).padStart(8, "0"))
    .join("");
  const checksumBits = hash[0].toString(2).padStart(8, "0").slice(0, bits / 32);
  const bitsConcat = entropyBits + checksumBits;
  const chunks = bitsConcat.match(/.{1,11}/g);
  return chunks?.map((bin) => wordlist[parseInt(bin, 2)]).join(" ");
}

// --- BIP39 mnemonic → seed ---
export function mnemonicToSeed(mnemonic: string, passphrase = "") {
  return pbkdf2Sync(
    mnemonic.normalize("NFKD"),
    ("mnemonic" + passphrase).normalize("NFKD"),
    2048,
    64,
    "sha512",
  );
}

// --- SLIP-0010: seed → master key (Ed25519) ---
export function getMasterKeyFromSeed(seed: Buffer) {
  const hmac = createHmac("sha512", "ed25519 seed");
  hmac.update(seed);
  const I = hmac.digest();
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

// --- Create ASN.1 DER PKCS#8 Private Key from 32-byte Ed25519 seed ---
export function createPKCS8Ed25519PrivateKey(rawKey: Buffer) {
  const seedPrefix = Buffer.from([
    0x30,
    0x2e,
    0x02,
    0x01,
    0x00,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x70,
    0x04,
    0x22,
    0x04,
    0x20,
  ]);
  return Buffer.concat([seedPrefix as Uint8Array, rawKey as Uint8Array]);
}

// --- Create Keypair from Seed ---
export function createKeyPairFromSeed(seed: Buffer) {
  const { key: privateKeyRaw } = getMasterKeyFromSeed(seed);
  const pkcs8Key = createPKCS8Ed25519PrivateKey(privateKeyRaw);
  const privateKey = createPrivateKey({
    key: pkcs8Key,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey };
}
