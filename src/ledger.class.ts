import type postgres from "postgresjs";

import { Postgres } from "./db/postgres.class.ts";
import type { UTXO, Asset } from "./types.ts";
import { retryWithBackoff } from "./retry.ts";
import { generateTxId, replacer } from "./util.ts";
import { PubSub } from "./kafka.ts";

export class Ledger {
  private db: Postgres;
  private pubSub: PubSub;

  constructor(db: Postgres, pubSub: PubSub) {
    this.db = db;
    this.pubSub = pubSub;
  }

  async process(message: string) {
    const { id, sender, recipient, assetsToSend } = JSON.parse(message);
    const assets = assetsToSend.map((asset: Asset) => ({
      ...asset,
      amount: BigInt(asset.amount),
    }));
    try {
      const tx = await this.db.findTransaction(id);

      if (!tx) {
        console.log(
          `Ignoring transaction ${id} has it does not exists in the database`,
        );
        return;
      }
      await this.processRequest(id, sender, recipient, assets);
    } catch (e) {
      console.error("Process terminated with an error, ", (e as Error).message);
      await this.db.updateTransaction(
        id,
        true,
        assets,
        (e as Error).message,
        true,
      );
    }
  }

  async addFunds(walletId: string, assets: Asset[]): Promise<UTXO> {
    try {
      const utxo = await this.db.createUTXO(walletId, assets);
      console.log("Funds added with success", utxo.id);
      return utxo;
    } catch (e) {
      console.error("Add funds failed", (e as Error).message);
      throw e;
    }
  }

  async getBalance(walletId: string): Promise<Record<string, bigint>> {
    const utxos = await this.db.findUTXOFor(walletId);
    return utxos.reduce((balance: Record<string, bigint>, utxo) => {
      for (const asset of utxo.assets) {
        balance[asset.unit] = (balance[asset.unit] || BigInt(0)) + asset.amount;
      }
      return balance;
    }, {});
  }

  async getUtxos(walletId: string): Promise<UTXO[]> {
    return await this.db.findUTXOFor(walletId);
  }

  async processRequest(
    txId: string,
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
  ) {
    if (!sender || sender === "") {
      throw new Error("Missing sender");
    }
    if (!recipient || recipient === "") {
      throw new Error("Missing recipient");
    }
    if (!assetsToSend || assetsToSend.length === 0) {
      throw new Error("No assets to send");
    }
    await retryWithBackoff(
      async () => {
        try {
          const isNegativeValue = assetsToSend.some(
            (asset) => asset.amount > 0,
          );

          if (!isNegativeValue) {
            for (const asset of assetsToSend.filter(
              (asset) => asset.amount < 0,
            )) {
              const policy = await this.db.findPolicy(asset.unit);
              if (policy.immutable) {
                throw new Error(
                  `The amount for ${asset.unit} must be higher than 0`,
                );
              }
            }
          }

          // buggy but partially works
          try {
            await this.db.sql.begin(async (sql: postgres.Sql) => {
              const senderUtxos = await this.db.findUTXOFor(sender, { sql });
              const collectedAssets: { [id: string]: bigint } = {};
              const usedUtxos: UTXO[] = [];

              // Collect UTXOs until we have enough assets
              for (const utxo of senderUtxos) {
                for (const asset of utxo.assets) {
                  collectedAssets[asset.unit] =
                    (collectedAssets[asset.unit] || BigInt(0)) + asset.amount;
                }
                usedUtxos.push(utxo);
                const isFulfilled = assetsToSend.every((asset) =>
                  asset.amount >= 0
                    ? (collectedAssets[asset.unit] || BigInt(0)) >= asset.amount
                    : (collectedAssets[asset.unit] || BigInt(0)) >=
                      BigInt(-1) * asset.amount,
                );
                if (isFulfilled) {
                  break;
                }
              }

              // Check if we have all required assets
              const hasEnough = assetsToSend.every((asset) =>
                asset.amount >= 0
                  ? (collectedAssets[asset.unit] || BigInt(0)) >= asset.amount
                  : (collectedAssets[asset.unit] || BigInt(0)) >=
                    BigInt(-1) * asset.amount,
              );
              if (!hasEnough) {
                throw new Error(
                  `Insufficient assets (${JSON.stringify(assetsToSend, replacer)}) for transaction ${txId}`,
                );
              }

              // Spend UTXOs
              for (const utxo of usedUtxos) {
                await this.db.updateUTXO(utxo.id, true, { sql });
              }

              // Create new UTXO for the recipient
              const recipientAssets = assetsToSend.filter(
                (asset) => asset.amount > 0,
              );
              if (recipientAssets.length > 0) {
                await this.db.createUTXO(recipient, recipientAssets, { sql });
              }

              // Handle change: return unused assets to the sender, excluding burned assets
              const remainingAssets: Asset[] = [];

              for (const [unit, amount] of Object.entries(collectedAssets)) {
                const requiredAmount =
                  assetsToSend.find((asset) => asset.unit === unit)?.amount ||
                  BigInt(0);

                if (amount > requiredAmount) {
                  // Calculate the remaining amount after sending or burning
                  const remainingAmount =
                    requiredAmount >= 0
                      ? amount - requiredAmount // Sending positive amounts
                      : amount + requiredAmount; // Burning negative amounts

                  if (remainingAmount > 0) {
                    remainingAssets.push({ unit, amount: remainingAmount });
                  }
                }
              }

              if (remainingAssets.length > 0) {
                await this.db.createUTXO(sender, remainingAssets, { sql });
              }

              // Update transaction to mark it as processed
              await this.db.updateTransaction(
                txId,
                true,
                assetsToSend,
                "",
                false,
                { sql },
              );
              console.log(`Transaction ${txId} processed successfully!`);
            });
          } catch (e) {
            console.error(`Transaction ${txId} Failed,`, (e as Error).message);
            throw e;
          }
        } catch (error) {
          console.error(
            "Error processing transaction:",
            (error as Error).message,
          );
          throw error;
        }
      },
      {
        retries: 3,
        delay: 50, // Start with 50ms
        factor: 1.5, // Exponential backoff multiplier
        onRetry: (attempt, error) =>
          console.log(`Retry attempt ${attempt}: ${error}`),
      },
    );
  }

  async addRequest(
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
  ): Promise<string> {
    const id = generateTxId();
    await this.db.createTransaction(id, sender);
    await this.pubSub.sendMessage("transactions", [
      {
        key: sender,
        value: JSON.stringify(
          { id, sender, recipient, assetsToSend },
          replacer,
        ),
      },
    ]);

    console.log(`Transaction ${id} sent to the queue`);

    return id;
  }

  async waitForTransactions(
    txs: string[],
    interval: number = 500,
    timeout: number = 60000,
  ): Promise<void> {
    console.log("Wait For Transactions to be Filed:", txs.join(","));
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const checkCondition = async () => {
        try {
          let completed = true;
          for (const txId of txs) {
            const tx = await this.db.findTransaction(txId);
            if (tx.filed === false) {
              completed = false;
              break;
            }
          }
          if (completed) {
            console.log("All transactions completed");
            return resolve();
          }
          if (Date.now() - start >= timeout) {
            return reject(
              new Error("Timeout reached while waiting for condition"),
            );
          }
          setTimeout(checkCondition, interval);
        } catch (error) {
          reject(error);
        }
      };

      checkCondition();
    });
  }
}
