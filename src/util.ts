import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";

export function generateTxId(): string {
  return Buffer.from(randomUUID()).toString("hex");
}

export function generateContractId(): string {
  return Buffer.from(randomUUID()).toString("hex");
}

// Generate a unique ID for a UTXO
export function generateUtxoId(): string {
  return Buffer.from(randomUUID()).toString("hex");
}

// export function isDecimal(num: number) {
//   return num % 1 !== 0;
// }

// export function multiplyBigIntByFloat(source: bigint, float: number): bigint {
//   // Convert the float to a string without exponential notation
//   const str = float.toString().replace(/e-?[\d]+/g, "");

//   // Split into integer and fractional parts
//   const [intPartStr, fracPartStr] = str.split(".");
//   if (!fracPartStr) {
//     return source * BigInt(intPartStr || "0");
//   }

//   const intPart = BigInt(intPartStr || "0");
//   const fracDigits = fracPartStr.replace(/0+$/, ""); // Remove trailing zeros
//   const fracPart = fracDigits ? BigInt(fracDigits) : 0n;
//   const fracLength = fracDigits.length || 0;

//   // Calculate denominator as a power of ten based on the fractional digits length
//   const denominator = 10n ** BigInt(fracLength);

//   // Compute numerator: (integer part * denominator + fractional part)
//   const numerator = intPart * denominator + fracPart;

//   // Multiply source by the numerator and then divide by denominator
//   return (source * numerator) / denominator;
// }
