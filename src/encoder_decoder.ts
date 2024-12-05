import { Buffer } from "node:buffer";
import { decode, encode } from "cbor";
import { Asset } from "./types.ts";

export function serialize(input: object): string {
  const cbor = encode(
    JSON.stringify(input, (_, value) =>
      typeof value === "bigint" ? Number(value) : value,
    ),
  ).toString("hex");

  return cbor;
}

export function deserialize<T>(input: string): T {
  const cbor = decode(Buffer.from(input, "hex"));
  return cbor;
}

export function parseAssets(assets: string): Asset[] {
  return JSON.parse(deserialize<string>(assets)).map((asset: Asset) => ({
    ...asset,
    amount: BigInt(asset.amount),
  }));
}
