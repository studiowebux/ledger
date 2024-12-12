export type Unit = string;
export type Asset = {
  unit: Unit;
  amount: bigint;
};

export type UTXO = {
  id: string;
  assets: Asset[];
  owner: string;
  spent: boolean;
};

export type RawUTXO = {
  id: string;
  assets: string; // cbor encoded
  owner: string;
  spent: boolean;
};

// Metadata to interact with the processors
export type Metadata = {
  sender?: string;
  recipient?: string;
  action: "BuyItem";
  itemId?: string;
};

export type Contract = {
  id?: string;
  outputs: Asset[]; // listed asset(s) for selling
  inputs: Asset[]; // input(s) required to unlock the ouput
  owner?: string;
  executed?: boolean;
};

export type Transaction = {
  id: string;
  owner: string;
  assets: string;
  filed: boolean;
  failed: boolean;
  reason: string;
  type: "exchange" | "contract";
  created_at: string;
  updated_at: string;
};
