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

// Metadata to interact with the processors
export type Metadata = {
  sender?: string;
  recipient?: string;
  action: "BuyItem";
  itemId?: string;
};
