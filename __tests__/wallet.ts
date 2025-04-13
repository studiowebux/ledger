import { Buffer } from "node:buffer";
import { sign, verify } from "node:crypto";

import { createKeyPairFromSeed, mnemonicToSeed } from "../src/wallet.ts";

// --- Demo: Generate Keypair and Sign a Message ---
const mnemonic =
  "permit write garlic letter govern music valley run world pulse wood enrich evoke cruel forget lazy stock coffee language noise beach settle snow grunt";
// Or generate random 24 words list
// const mnemonic = generateMnemonic(256);
const seed = mnemonicToSeed(mnemonic, "password");
const { privateKey, publicKey } = createKeyPairFromSeed(seed);

console.log("🔑 Mnemonic:\n", mnemonic, "\n");
console.log(
  "🔐 Private Key:\n",
  privateKey.export({ format: "pem", type: "pkcs8" }),
);
console.log(
  "🔓 Public Key:\n",
  publicKey.export({ format: "pem", type: "spki" }),
);

// --- Sign and Verify ---
const message = Buffer.from("Hello vanilla Ed25519!");
const signature = sign(null, message, privateKey);
const isValid = verify(null, message, publicKey, signature);

console.log("\n📜 Message:", message.toString());
console.log("✍️ Signature:", signature.toString("hex"));
console.log("✅ Valid Signature?", isValid);
