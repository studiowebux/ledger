import { Buffer } from "node:buffer";

import { createKeyPairFromSeed, mnemonicToSeed } from "../src/wallet.ts";

// --- Demo: Generate Keypair and Sign a Message ---
const mnemonic = await Deno.readTextFile("./wallets/genesis.txt");
// Or generate random 24 words list
// const mnemonic = generateMnemonic(256);
const seed = mnemonicToSeed(mnemonic.trim(), "");
const { privateKey, publicKey } = createKeyPairFromSeed(seed);

console.log(
  "🔐 Private Key:\n",
  Buffer.from(privateKey.export({ format: "pem", type: "pkcs8" }) as string)
    .toString(
      "hex",
    ),
);
console.log(
  "🔓 Public Key:\n",
  Buffer.from(publicKey.export({ format: "pem", type: "spki" }) as string)
    .toString(
      "hex",
    ),
);
