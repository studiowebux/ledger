import type postgres from "postgresjs";
import type { Admin, Consumer, Producer } from "kafkajs";
import { Postgres } from "./db/postgres.class.ts";
import type { UTXO, Asset } from "./types.ts";
import { retryWithBackoff } from "./retry.ts";
import { kafkaAdmin, kafkaConsumer, kafkaProducer } from "./kafka.ts";

export const replacer = (_key: unknown, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

function generateTxId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export class Ledger {
  private db: Postgres;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;

  constructor(db: Postgres) {
    this.db = db;
    this.producer = kafkaProducer.producer({ allowAutoTopicCreation: true });
    this.consumer = kafkaConsumer.consumer({ groupId: "ledger" });
    this.admin = kafkaAdmin.admin();

    this.producer.on("producer.connect", () => {
      console.log("Kafka Producer connected");
    });

    this.producer.on("producer.disconnect", () => {
      console.log("Kafka Producer disconnected");
    });

    this.consumer.on("consumer.connect", () => {
      console.log("Kafka Consumer connected");
    });
  }

  async close() {
    await this.admin.disconnect();
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async setupProducer() {
    try {
      await this.admin.connect();
      await this.producer.connect();
    } catch (e) {
      console.error("Producer error", e);
    }
    return this;
  }

  async setupConsumer() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        // topics: [/wallet-.*/i],
        topics: ["transactions"],
        fromBeginning: true,
      });
    } catch (e) {
      console.log("Consumer Error: ", e);
    }
    return this;
  }

  async process() {
    try {
      await this.consumer.run({
        eachMessage: async ({
          _topic,
          _partition,
          message,
          _heartbeat,
          _pause,
        }) => {
          const txId = message?.key?.toString();

          if (!txId) {
            throw new Error("No transaction id received");
          }
          if (!message?.value?.toString()) {
            throw new Error("No payload received");
          }
          const { sender, recipient, assetsToSend } = JSON.parse(
            message?.value?.toString(),
          );
          const assets = assetsToSend.map((asset: Asset) => ({
            ...asset,
            amount: BigInt(asset.amount),
          }));
          try {
            await this.processRequest(txId, sender, recipient, assets);
          } catch (e) {
            console.error(e);
            await this.db.updateTransaction(
              txId,
              true,
              assets,
              (e as Error).message,
              true,
            );
          }
        },
      });
    } catch (e) {
      console.log("Consumer Run Error: ", e);
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
    await retryWithBackoff(
      async () => {
        try {
          const tx = await this.db.findTransaction(txId);

          if (!tx) {
            console.log(
              `Ignoring transaction ${txId} has it does not exists in the database`,
            );
            return;
          }
          const isValid = assetsToSend.every((asset) => asset.amount > 0);

          if (!isValid) {
            throw new Error("The amount must be higher than 0");
          }

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
                const isFulfilled = assetsToSend.every(
                  (asset) => collectedAssets[asset.unit] >= asset.amount,
                );
                if (isFulfilled) {
                  break;
                }
              }

              // Check if we have all required assets
              const hasEnough = assetsToSend.every(
                (asset) => (collectedAssets[asset.unit] || 0) >= asset.amount,
              );
              if (!hasEnough) {
                throw new Error("Insufficient assets");
              }

              // Spend UTXOs
              for (const utxo of usedUtxos) {
                await this.db.updateUTXO(utxo.id, true, { sql });
              }

              // Create new UTXO for the recipient
              await this.db.createUTXO(recipient, assetsToSend, { sql });

              // Handle change: return unused assets to the sender
              const remainingAssets: Asset[] = [];
              for (const [unit, amount] of Object.entries(collectedAssets)) {
                const requiredAmount =
                  assetsToSend.find((asset) => asset.unit === unit)?.amount ||
                  BigInt(0);
                if (amount > requiredAmount) {
                  remainingAssets.push({
                    unit,
                    amount: amount - requiredAmount,
                  });
                }
              }
              if (remainingAssets.length > 0) {
                await this.db.createUTXO(sender, remainingAssets, { sql });
              }

              await this.db.updateTransaction(txId, true);
              console.log(`Transaction processed successfully!`);
            });
          } catch (e) {
            console.error("Transaction Failed", (e as Error).message);
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
        retries: 5,
        delay: 250, // Start with 250ms
        factor: 1.25, // Exponential backoff multiplier
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
    await retryWithBackoff(
      async () => {
        // const topic = `wallet-${sender}`;
        const topic = "transactions";
        await this.admin.createTopics({
          topics: [{ topic }],
          waitForLeaders: true,
        });
        await this.producer.send({
          topic,
          messages: [
            {
              key: id,
              value: JSON.stringify(
                { sender, recipient, assetsToSend },
                replacer,
              ),
            },
          ],
          timeout: 30000,
        });

        console.log(`Transaction ${id} sent to the queue`);
      },
      {
        retries: 5,
        delay: 50, // Start with 250ms
        factor: 1.5, // Exponential backoff multiplier
        onRetry: (attempt, error) =>
          console.log(`Retry attempt ${attempt}: ${error}`),
      },
    );

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
