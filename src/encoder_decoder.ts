import { Asset } from "./types.ts";

export const replacer = (_key: unknown, value: unknown): unknown =>
  typeof value === "bigint" ? value.toString() : value;

export function stringify(input: object): string {
  return JSON.stringify(
    input,
    (key, value) => replacer(key, value),
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
      if (!result[`${asset.policy_id}.${asset.name}`]) {
        result[`${asset.policy_id}.${asset.name}`] = {
          policy_id: asset.policy_id,
          amount: BigInt(0),
          name: asset.name,
        };
      }
      result[`${asset.policy_id}.${asset.name}`].amount += asset.amount;
      return result;
    },
    {} as Record<string, Asset>,
  );

  // Convert the grouped object back to an array
  return Object.values(grouped);
}
