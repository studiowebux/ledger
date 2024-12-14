import { randomBytes } from "node:crypto";
import { Asset } from "./types.ts";

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

export function aggregateAssets(assets: Asset[]): Asset[] {
  const grouped = assets.reduce(
    (result, asset) => {
      if (!result[asset.unit]) {
        result[asset.unit] = { unit: asset.unit, amount: BigInt(0) };
      }
      result[asset.unit].amount += asset.amount;
      return result;
    },
    {} as Record<string, Asset>,
  );

  // Convert the grouped object back to an array
  return Object.values(grouped);
}
