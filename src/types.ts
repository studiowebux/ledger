export type Unit = string; // PolicyId + Name
export type PolicyId = string;
export type PublicKey = string;

export type Asset = {
  policy_id: PolicyId;
  amount: bigint;
  name: string;
  metadata?: object;
};

export type Utxo = {
  id: string;
  assets: Asset[];
  owner: PublicKey;
  spent: boolean;
  created_at?: string; // Only when returned by the Database.
  updated_at?: string; // Only when returned by the Database.
};

export type UtxoRaw = Utxo & {
  assets: string; // The database returns a String that must be parsed
};

export type Contract = {
  id: string;
  outputs: Asset[]; // listed asset(s) for selling
  inputs: Asset[]; // input(s) required to unlock the ouput
  owner: PublicKey;
  executed: boolean;
};

export type ContractRaw = Contract & {
  outputs: string;
  inputs: string;
  created_at: string;
  updated_at: string;
};

export type Policy = {
  policy_id: PolicyId;
  immutable: boolean;
  owner: PublicKey[];
};

export type PolicyRaw = Policy & {
  created_at: string;
  updated_at: string;
};

// This is what the user has to sign
export type TransactionPayload = {
  id: string;
  owner: PublicKey;
  assets: Asset[];
  type: "exchange" | "contract";
};

export type Transaction = TransactionPayload & {
  executed: boolean;
  failed: boolean;
  reason: string;
  signature: string;
  created_at: string;
  updated_at: string;
};

// Database representation
export type TransactionRaw = Transaction & {
  assets: string;
};

export type Id = {
  id: string;
};
