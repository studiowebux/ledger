import { randomBytes } from "node:crypto";

export function generateTxId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function generateContractId(): string {
  return randomBytes(32).toString("hex");
}

export const replacer = (_key: unknown, value: unknown): unknown =>
  typeof value === "bigint" ? value.toString() : value;

// Generate a unique ID for a UTXO
export function generateUtxoId(): string {
  return crypto.randomUUID();
}
