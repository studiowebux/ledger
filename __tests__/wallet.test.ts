import { Buffer } from "node:buffer";
import { sign, verify } from "node:crypto";
import { assertEquals } from "jsr:@std/assert";

import {
  createKeyPairFromSeed,
  generateMnemonic,
  mnemonicToSeed,
} from "../src/wallet.ts";

Deno.test("Create wallet", () => {
  // --- Demo: Generate Keypair and Sign a Message ---
  const mnemonic =
    "permit write garlic letter govern music valley run world pulse wood enrich evoke cruel forget lazy stock coffee language noise beach settle snow grunt";
  // Or generate random 24 words list
  // const mnemonic = generateMnemonic(256)!;
  const seed = mnemonicToSeed(mnemonic);
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
  console.log(
    "🔐 Private Key:\n",
    Buffer.from(privateKey.export({ format: "pem", type: "pkcs8" }) as string)
      .toString("hex"),
  );
  console.log(
    "🔓 Public Key:\n",
    Buffer.from(publicKey.export({ format: "pem", type: "spki" }) as string)
      .toString("hex"),
  );

  // --- Sign and Verify ---
  const message = Buffer.from("Hello vanilla Ed25519!");
  const signature = sign(null, message, privateKey);
  const isValid = verify(null, message, publicKey, signature);

  console.log("\n📜 Message:", message.toString());
  console.log("✍️ Signature:", signature.toString("hex"));
  console.log("✅ Valid Signature?", isValid);

  // assertEquals(seed, "");
  assertEquals(
    signature.toString("hex"),
    "1063c1339caffd1a6805a2b1343b0ec541299b4fa0dd57b7eb29c29c53e698add27d0aaaf7e47af14c0d2eb6983e695bdc6920eb8d220405e2813663468e6f04",
  );

  assertEquals(
    isValid,
    true,
  );

  assertEquals(
    Buffer.from(privateKey.export({ format: "pem", type: "pkcs8" }) as string)
      .toString(
        "hex",
      ),
    "2d2d2d2d2d424547494e2050524956415445204b45592d2d2d2d2d0a4d43344341514177425159444b3256774243494549464f613369582b52726d766d68394b6e6e4f54394a49453744326b774f6147377966453042494a447250310a2d2d2d2d2d454e442050524956415445204b45592d2d2d2d2d0a",
  );

  assertEquals(
    Buffer.from(publicKey.export({ format: "pem", type: "spki" }) as string)
      .toString(
        "hex",
      ),
    "2d2d2d2d2d424547494e205055424c4943204b45592d2d2d2d2d0a4d436f77425159444b32567741794541583363514a424f73743975355830796967336e4335455874326777497462797a724d56306b41466f68646b3d0a2d2d2d2d2d454e44205055424c4943204b45592d2d2d2d2d0a",
  );
});
