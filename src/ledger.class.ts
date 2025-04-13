import type postgres from "postgresjs";
import Logger from "@studiowebux/deno-minilog";

import type { Postgres } from "./db/postgres.class.ts";
import type { Asset, Contract, Unit, Utxo } from "./types.ts";
import { retryWithBackoff } from "./retry.ts";
import { generateContractId, generateTxId, generateUtxoId } from "./util.ts";
import { parseAssets, stringify, aggregateAssets } from "./encoder_decoder.ts";

export class Ledger {
  private db: Postgres;
  private sendMessage: (
    topic: string,
    messages: { key: string; value: string }[],
  ) => Promise<void>;
  private logger: Logger;

  /**
   * Initializes a new instance of the Ledger class with provided options.
   * @param {Object} options - The configuration options for Ledger
   * @param {Postgres} options.db - Database connection object
   * @param {(topic: string, messages: Array<{key: string, value: string}>) => Promise<void>} [options.sendMessage] - Function to send messages via a topic
   * @param {Logger} options.logger - Logger instance for logging information
   */
  constructor(options: {
    db: Postgres;
    sendMessage?: (
      topic: string,
      messages: { key: string; value: string }[],
    ) => Promise<void>;
    logger: Logger;
  }) {
    this.db = options.db;
    this.sendMessage = options.sendMessage || (async () => {});
    this.logger = options.logger.fork("ledger");
  }

  /**
   * Processes a message containing transaction data.
   * @param {string} message - The JSON stringified transaction message to process
   * @returns {Promise<void>} A promise that resolves when processing is complete
   */
  async process(message: string): Promise<void> {
    this.logger.verbose("process", message);
    const { id, sender, recipient, assetsToSend, contractId } = JSON.parse(
      message,
    );
    let assets = [];
    try {
      const tx = await this.db.findTransaction(id);

      if (!tx) {
        this.logger.warn(
          `Ignoring transaction ${id} has it does not exists in the database`,
        );
        return;
      }
      if (tx.type === "exchange") {
        assets = assetsToSend?.map((asset: Asset) => ({
          ...asset,
          amount: asset.amount,
        }));
        await this.processRequest(id, sender, recipient, assets);
      } else if (tx.type === "contract") {
        await this.processContract(id, sender, contractId);
      } else {
        throw new Error("Invalid transaction type provided");
      }
    } catch (e) {
      this.logger.error(
        "Process terminated with an error, ",
        (e as Error).message,
      );
      await this.db.updateTransaction(
        id,
        true,
        assets,
        (e as Error).message,
        true,
      );
    }
  }

  /**
   * Adds assets to a specified wallet.
   * @param {string} walletId - The ID of the wallet to which assets will be added
   * @param {Asset[]} assets - List of assets to add
   * @returns {Promise<string>} A promise that resolves with the UTXO ID of the created asset entry
   */
  async addAssets(walletId: string, assets: Asset[]): Promise<string> {
    this.logger.verbose("addAssets", walletId, assets);
    try {
      const utxoId = await this.db.createUTXO(walletId, {
        id: generateUtxoId(),
        assets,
        owner: walletId,
        spent: false,
      });
      this.logger.info("Funds added with success", utxoId);
      return utxoId;
    } catch (e) {
      this.logger.error("Add funds failed", (e as Error).message);
      throw e;
    }
  }

  /**
   * Retrieves the balance of a specified wallet.
   * @param {string} walletId - The ID of the wallet whose balance is to be retrieved
   * @returns {Promise<Record<Unit, bigint>>} A promise that resolves with the balance record for the wallet
   */
  async getBalance(walletId: string): Promise<Record<Unit, bigint>> {
    this.logger.verbose("getBalance", walletId);
    const utxos = await this.db.findUTXOFor(walletId);
    const parsedUtxos = utxos.map((utxo) => ({
      ...utxo,
      assets: parseAssets(utxo.assets),
    }));
    return parsedUtxos.reduce((balance: Record<Unit, bigint>, utxo) => {
      for (const asset of utxo.assets) {
        balance[asset.unit] = (balance[asset.unit] || BigInt(0)) + asset.amount;
      }
      return balance;
    }, {});
  }

  /**
   * Retrieves all UTXOs associated with a specified wallet.
   * @param {string} walletId - The ID of the wallet whose UTXOs are to be retrieved
   * @returns {Promise<Utxo[]>} A promise that resolves with an array of UTXO objects for the wallet
   */
  async getUtxos(walletId: string): Promise<Utxo[]> {
    this.logger.verbose("getUtxos", walletId);
    const utxos = await this.db.findUTXOFor(walletId);
    return utxos.map((utxo) => ({ ...utxo, assets: parseAssets(utxo.assets) }));
  }

  async processContract(
    txId: string,
    buyer: string,
    contractId: string,
  ): Promise<void> {
    this.logger.verbose("processContract", txId, buyer, contractId);
    if (!buyer || buyer === "") {
      throw new Error("Missing buyer");
    }
    if (!contractId || contractId === "") {
      throw new Error("No contract received");
    }
    await retryWithBackoff(
      async () => {
        try {
          await this.db.sql.begin(async (sql: postgres.Sql) => {
            const contract = await this.db.findContract(contractId, { sql });
            try {
              if (buyer !== contract.owner) {
                this.logger.verbose(`Executing Contract #${contractId}`);
                // Send assets to sender
                await this.exchange(
                  buyer,
                  contractId,
                  aggregateAssets(parseAssets(contract.inputs)),
                  { sql },
                );
              }
              // Unlock assets from contract
              await this.exchange(
                contractId,
                buyer,
                aggregateAssets(parseAssets(contract.outputs)),
                { sql },
              );
              await this.db.updateContract(contractId, true, {
                sql,
              });
              // Update transaction to mark it as processed
              await this.db.updateTransaction(txId, true, [], "", false, {
                sql,
              });
              this.logger.info(`Contract ${txId} processed successfully!`);
            } catch (e) {
              this.logger.error(
                `Contract ${txId} Failed,`,
                (e as Error).message,
              );
              throw e;
            }
          });
        } catch (error) {
          this.logger.error(
            "Error processing contract:",
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
          this.logger.warn(`Retry attempt ${attempt}: ${error}`),
      },
    );
  }

  async exchange(
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
    options: { sql?: postgres.Sql },
  ): Promise<void> {
    this.logger.verbose("exchange", sender, recipient, assetsToSend);
    const sql = options?.sql || this.db.sql;
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
            for (
              const asset of assetsToSend.filter(
                (asset) => asset.amount < 0,
              )
            ) {
              const policy = await this.db.findPolicy(asset.unit);
              if (policy.immutable) {
                throw new Error(
                  `The amount for ${asset.unit} must be higher than 0`,
                );
              }
            }
          }

          // buggy but partially works
          // await this.db.sql.begin(async (sql: postgres.Sql) => {
          const senderUtxos = await this.db.findUTXOFor(sender, { sql });
          const parsedSenderUtxos: Utxo[] = senderUtxos.map((utxo) => ({
            ...utxo,
            assets: parseAssets(utxo.assets),
          }));
          const collectedAssets: { [id: string]: bigint } = {};
          const usedUtxos: Utxo[] = [];

          // Collect UTXOs until we have enough assets
          for (const utxo of parsedSenderUtxos) {
            for (const asset of utxo.assets) {
              collectedAssets[asset.unit] =
                (collectedAssets[asset.unit] || BigInt(0)) +
                asset.amount;
            }
            usedUtxos.push(utxo);
            const isFulfilled = assetsToSend.every((asset) =>
              asset.amount >= 0
                ? (collectedAssets[asset.unit] || BigInt(0)) >= asset.amount
                : (collectedAssets[asset.unit] || BigInt(0)) >=
                  BigInt(-1) * asset.amount
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
              `Insufficient assets (${stringify(assetsToSend)}) from ${sender}`,
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
            await this.db.createUTXO(
              recipient,
              {
                id: generateUtxoId(),
                assets: recipientAssets,
                owner: recipient,
                spent: false,
              },
              { sql },
            );
          }

          // Handle change: return unused assets to the sender, excluding burned assets
          const remainingAssets: Asset[] = [];

          for (const [unit, amount] of Object.entries(collectedAssets)) {
            const requiredAmount = assetsToSend.find((asset) =>
              asset.unit === unit
            )?.amount || BigInt(0);

            if (amount > requiredAmount) {
              // Calculate the remaining amount after sending or burning
              const remainingAmount = requiredAmount >= 0
                ? amount - requiredAmount // Sending positive amounts
                : amount + requiredAmount; // Burning negative amounts

              if (remainingAmount > 0) {
                remainingAssets.push({ unit, amount: remainingAmount });
              }
            }
          }

          if (remainingAssets.length > 0) {
            await this.db.createUTXO(
              sender,
              {
                id: generateUtxoId(),
                assets: remainingAssets,
                owner: sender,
                spent: false,
              },
              { sql },
            );
          }
        } catch (error) {
          this.logger.error(
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
          this.logger.warn(`Retry attempt ${attempt}: ${error}`),
      },
    );
  }

  /**
   * Processes unilateral requests for asset transfers.
   * @param {string} txId - The ID of the transaction to process
   * @param {string} sender - The ID of the sender wallet
   * @param {string} recipient - The ID of the recipient wallet
   * @param {Asset[]} assetsToSend - List of assets to be transferred
   * @returns {Promise<void>} A promise that resolves when the request processing is complete
   */
  async processRequest(
    txId: string,
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
  ): Promise<void> {
    this.logger.verbose(
      "processRequest",
      txId,
      sender,
      recipient,
      assetsToSend,
    );

    if (!sender || sender === "") {
      throw new Error("Missing sender");
    }
    if (!recipient || recipient === "") {
      throw new Error("Missing recipient");
    }
    if (!assetsToSend || assetsToSend.length === 0) {
      throw new Error("No assets to send");
    }

    try {
      await this.db.sql.begin(async (sql: postgres.Sql) => {
        await this.exchange(sender, recipient, assetsToSend, { sql });
        // Update transaction to mark it as processed
        await this.db.updateTransaction(txId, true, assetsToSend, "", false);
        this.logger.info(`Transaction ${txId} processed successfully!`);
      });
    } catch (e) {
      this.logger.error(`Transaction ${txId} Failed,`, (e as Error).message);
      throw e;
    }
  }

  /**
   * Creates a unilateral transaction to send assets.
   * @param {string} sender - The ID of the sender wallet
   * @param {string} recipient - The ID of the recipient wallet
   * @param {Asset[]} assetsToSend - List of assets to be transferred
   * @returns {Promise<string>} A promise that resolves with the transaction ID of the created request
   */
  async addRequest(
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
  ): Promise<string> {
    this.logger.verbose("addRequest", sender, recipient, assetsToSend);
    const id = generateTxId();
    await this.db.createTransaction(id, sender, "exchange");
    await this.sendMessage("transactions", [
      {
        key: sender,
        value: stringify({ id, sender, recipient, assetsToSend }),
      },
    ]);

    this.logger.debug(`Transaction ${id} sent to the queue`);

    return id;
  }

  /**
   * Creates a new contract involving asset trades.
   * @param {string} owner - The ID of the contract owner wallet
   * @param {Pick<Contract, "inputs" | "outputs">} contract - Details of the inputs and outputs for the contract
   * @returns {Promise<string>} A promise that resolves with the contract ID of the created contract
   */
  async createContract(
    owner: string,
    contract: Pick<Contract, "inputs" | "outputs">,
  ): Promise<string> {
    this.logger.verbose("createContract", owner, contract);

    if (
      contract.inputs.some((input) => input.amount < 0) ||
      contract.outputs.some((output) => output.amount < 0)
    ) {
      throw new Error("Only positive value are allowed for a contract");
    }

    const id = generateContractId();
    this.logger.verbose("Create Contract", id);

    await this.db.createContract(
      id,
      aggregateAssets(contract.inputs),
      aggregateAssets(contract.outputs),
      owner,
    );

    const txId = generateTxId();
    this.logger.verbose("Transfer asset(s) from owner to contract");
    await this.db.createTransaction(txId, owner, "exchange");
    await this.processRequest(
      txId,
      owner,
      id,
      aggregateAssets(contract.outputs),
    );

    return id;
  }

  /**
   * Initiates a process to handle an existing contract as a buyer.
   * @param {string} buyer - The ID of the buyer wallet
   * @param {string} contractId - The ID of the contract to participate in
   * @returns {Promise<string>} A promise that resolves with the transaction ID associated with adding the contract
   */
  async addContract(buyer: string, contractId: string): Promise<string> {
    this.logger.verbose("addContract", buyer, contractId);

    const txId = generateTxId();
    const contract = await this.db.findContract(contractId);
    if (!contract || contract.executed === true) {
      throw new Error("Contract not found or already executed");
    }
    await this.db.createTransaction(txId, buyer, "contract");
    await this.sendMessage("contracts", [
      {
        key: contract.owner, // seller wallet
        value: stringify({ id: txId, contractId: contract.id }),
      },
    ]);

    this.logger.debug(
      `Contract ${contract.id} with transaction ${txId} sent to the queue`,
    );

    return txId;
  }

  /**
   * Waits for specified transactions to be completed within a timeout period.
   * @param {string[]} txs - List of transaction IDs to wait on
   * @param {number} [interval=500] - Interval in milliseconds to check the transaction status
   * @param {number} [timeout=60000] - Timeout in milliseconds before giving up on waiting
   * @returns {Promise<void>} A promise that resolves when all transactions are completed or rejects if timeout occurs
   */
  waitForTransactions(
    txs: string[],
    interval: number = 500,
    timeout: number = 60000,
  ): Promise<void> {
    this.logger.info("Wait For transactions to be filed:", txs.join(","));
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
            this.logger.info("All transactions completed");
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
