// DENO_TLS_CA_STORE=system deno run -A client.ts

import { Buffer } from "node:buffer";
import { sign } from "node:crypto";

import { createKeyPairFromSeed, mnemonicToSeed } from "../src/wallet.ts";
import { Asset } from "../src/types.ts";
import { stringify } from "../src/encoder_decoder.ts";

const ws = new WebSocket("wss://127.0.0.1:8080");

const mnemonic = Deno.readTextFileSync("./sender/mnemonic.txt").trim();
// Or generate random 24 words list
// const mnemonic = generateMnemonic(256);
const seed = mnemonicToSeed(mnemonic);
const { privateKey, publicKey } = createKeyPairFromSeed(seed);
const publicKeyHex = Buffer.from(
  publicKey.export({ format: "pem", type: "spki" }) as string,
).toString("hex");

ws.onopen = () => {
  console.log("🟢 Connected to host");
  ws.send(stringify({ type: "hello", sender: publicKeyHex }));

  // Simulate sending a tx
  setTimeout(() => {
    const payload: {
      sender: string;
      recipient: string;
      assets: Asset[];
    } = {
      sender: publicKeyHex,
      recipient: Deno.readTextFileSync("./receiver/public.key").trim(),
      assets: [{
        policy_id: "currency",
        name: "aether",
        amount: 1_000_000n,
      }],
    };

    const signature: Buffer = sign(
      null,
      Buffer.from(stringify(payload)),
      privateKey,
    );

    ws.send(stringify({
      type: "tx",
      sender: publicKeyHex,
      tx: { payload, signature: signature.toString("hex") },
    }));
  }, 1000);

  setInterval(() => {
    ws.send(stringify({
      type: "balance",
      sender: Deno.readTextFileSync("./receiver/public.key").trim(),
    }));
    ws.send(stringify({
      type: "balance",
      sender: publicKeyHex,
    }));
  }, 30_000);
};

ws.onmessage = (event) => {
  console.log("📥 Message from network:", event.data);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected from WebSocket server");
};
