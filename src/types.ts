export type UTXO = {
  id: string;
  amount: number;
  owner: string;
  spent: boolean;
};

export type TransactionInput = string;

export type TransactionOutput = {
  amount: number;
  recipient: string;
};

export type Metadata = {
  sender?: string;
  recipient?: string;
  action: "BuyItem";
  itemId?: string;
};

export type Transaction = {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  metadata?: Metadata[];
};
