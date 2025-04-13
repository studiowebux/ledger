import { Asset } from "./types.ts";

export function stringify(input: object): string {
  return JSON.stringify(
    input,
    (_, value) => typeof value === "bigint" ? Number(value) : value,
  );
}

export function parseAssets(assets: string): Asset[] {
  return JSON.parse(assets).map((asset: Asset) => ({
    ...asset,
    amount: BigInt(asset.amount),
  }));
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
