export type Unit = string;
export type Asset = {
  unit: Unit;
  amount: bigint;
};

export type Utxo = {
  id: string;
  assets: Asset[];
  owner: string;
  spent: boolean;
};

export type UtxoRaw = Utxo & {
  assets: string;
  created_at: string;
  updated_at: string;
};

export type Contract = {
  id: string;
  outputs: Asset[]; // listed asset(s) for selling
  inputs: Asset[]; // input(s) required to unlock the ouput
  owner: string;
  executed: boolean;
};

export type ContractRaw = Contract & {
  outputs: string;
  inputs: string;
  created_at: string;
  updated_at: string;
};

export type Policy = {
  unit: Unit;
  immutable: boolean;
};

export type PolicyRaw = Policy & {
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  owner: string;
  assets: Asset[];
  filed: boolean;
  failed: boolean;
  reason: string;
  type: "exchange" | "contract";
};

export type TransactionRaw = Transaction & {
  assets: string;
  created_at: string;
  updated_at: string;
};

export type Id = {
  id: string;
};
