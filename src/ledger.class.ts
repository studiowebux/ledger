import type postgres from "postgresjs";
import Logger from "@studiowebux/deno-minilog";

import type { Postgres } from "./db/postgres.class.ts";
import type { Asset, Contract, Transaction, Unit, Utxo } from "./types.ts";
import { retryWithBackoff } from "./retry.ts";
import {
  generateContractId,
  generateTxId,
  generateUtxoId,
  // isDecimal,
} from "./util.ts";
import { aggregateAssets, parseAssets, stringify } from "./encoder_decoder.ts";

// const calculateRemainingAssets = (inputs: Asset[], assets: Asset[]) => {
//   return inputs
//     .map((input) => ({
//       ...input,
//       amount: input.amount,
//     }))
//     .reduce((acc, asset) => {
//       const partialAsset = assets.find((p) => p.policy_id === asset.policy_id);
//       if (partialAsset) {
//         acc.push({
//           policy_id: asset.policy_id,
//           amount: asset.amount - partialAsset.amount,
//         });
//       } else {
//         acc.push(asset);
//       }
//       return acc;
//     }, [] as Asset[]);
// };

/**
 * Ledger class responsible for handling various transaction types.
 */
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
    const { id, sender, recipient, assetsToSend, contractId, signature } = JSON
      .parse(
        message,
      );

    this.logger.debug("assetsToSend", assetsToSend);
    const assets: Asset[] = assetsToSend?.map((asset: Asset) => ({
      ...asset,
      amount: BigInt(asset.amount),
    }));
    this.logger.debug("assets", assets);
    try {
      const tx = await this.db.findTransaction(id);

      if (!tx) {
        this.logger.warn(
          `Ignoring transaction ${id} has it does not exists in the database`,
        );
        return;
      }
      if (tx.type === "exchange") {
        await this.processRequest(id, sender, recipient, assets, signature);
      } else if (tx.type === "contract") {
        await this.processContract(id, sender, contractId);
      } else {
        throw new Error("Invalid transaction type provided");
      }
    } catch (e) {
      this.logger.error(
        "Process terminated with an error,",
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
      // const policy = await this.db.findPolicy();

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

    return utxos.reduce((balance: Record<Unit, bigint>, utxo) => {
      for (const asset of utxo.assets) {
        balance[`${asset.policy_id}.${asset.name}`] =
          (balance[`${asset.policy_id}.${asset.name}`] || BigInt(0)) +
          asset.amount;
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
    return utxos;
  }

  /**
   * Processes a contract transaction.
   * @param {string} txId - The ID of the transaction to process
   * @param {string} buyer - The ID of the buyer involved in the contract
   * @param {string} contractId - The ID of the contract to be processed
   * @returns {Promise<void>} A promise that resolves when the contract processing is complete
   */
  async processContract(
    txId: string,
    buyer: string,
    contractId: string,
    inputs?: Asset[],
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
              await this.db.updateTransaction(
                txId,
                true,
                [
                  ...aggregateAssets(parseAssets(contract.inputs)),
                  ...aggregateAssets(parseAssets(contract.outputs)),
                ],
                "",
                false,
                {
                  sql,
                },
              );
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

  // 2025-04-13: was trying to do the fractional with bigint ... put aside for now, I am building this to learn and maybe to use in my game ???
  // async processContract(
  //   txId: string,
  //   buyer: string,
  //   contractId: string,
  //   inputs?: Asset[],
  // ): Promise<void> {
  //   this.logger.verbose("processContract", txId, buyer, contractId);
  //   if (!buyer || buyer === "") {
  //     throw new Error("Missing buyer");
  //   }
  //   if (!contractId || contractId === "") {
  //     throw new Error("No contract received");
  //   }
  //   await retryWithBackoff(
  //     async () => {
  //       try {
  //         await this.db.sql.begin(async (sql: postgres.Sql) => {
  //           const contract = await this.db.findContract(contractId, { sql });
  //           try {
  //             // Calculate the total input value for the contract and provided inputs
  //             const totalContractInputValue = parseAssets(
  //               contract.inputs,
  //             ).reduce((sum, asset) => sum + asset.amount, 0);
  //             this.logger.verbose(
  //               `totalContractInputValue ${totalContractInputValue}`,
  //             );

  //             // If the user provider a specific inputs, use it (partial)
  //             // otherwise it is all-or-nothing
  //             const specifiedInputValue = (
  //               inputs || parseAssets(contract.inputs)
  //             ).reduce((sum, asset) => sum + asset.amount, 0);
  //             this.logger.verbose(`specifiedInputValue ${specifiedInputValue}`);

  //             // Compute the ratio based on specified input amounts
  //             if (
  //               totalContractInputValue === 0 ||
  //               specifiedInputValue > totalContractInputValue
  //             ) {
  //               throw new Error("Invalid partial input amounts");
  //             }

  //             const executionRatio = specifiedInputValue /
  //               totalContractInputValue;
  //             this.logger.verbose(`executionRatio ${executionRatio}`);

  //             this.logger.verbose(
  //               `${executionRatio * parseAssets(contract.inputs)[0].amount} ${
  //                 parseAssets(contract.inputs)[0].policy_id
  //               } = ${
  //                 executionRatio * parseAssets(contract.outputs)[0].amount
  //               }x ${parseAssets(contract.outputs)[0].policy_id}`,
  //             );

  //             const partialInputs = parseAssets(contract.inputs).map(
  //               (input) => ({
  //                 ...input,
  //                 amount: input.amount * executionRatio,
  //               }),
  //             );
  //             this.logger.verbose(`partialInputs ${stringify(partialInputs)}`);

  //             const partialOutputs = parseAssets(contract.outputs).map(
  //               (output) => ({
  //                 ...output,
  //                 amount: output.amount * executionRatio,
  //               }),
  //             );
  //             this.logger.verbose(
  //               `Partial Outputs ${stringify(partialOutputs)}`,
  //             );

  //             if (
  //               partialInputs.some((input) => isDecimal(input.amount)) ||
  //               partialOutputs.some((output) => isDecimal(output.amount))
  //             ) {
  //               throw new Error("The input or output contains decimals.");
  //             }

  //             if (buyer !== contract.owner) {
  //               this.logger.verbose(`Executing Contract #${contractId}`);

  //               // Send assets to sender
  //               await this.exchange(
  //                 buyer,
  //                 contract.owner, // 2025-02-02: replace to the owner address instead. contractId,
  //                 aggregateAssets(partialInputs), // 2025-02-06 - Here we have to send not only the unlock assets, but the remaining inputs... like for fractional transaction.
  //                 { sql },
  //               );
  //             }
  //             // Calculate and execute partial output based on the ratio

  //             // Unlock assets from contract
  //             await this.exchange(
  //               contractId,
  //               buyer,
  //               aggregateAssets(partialOutputs), // 2025-02-06 - same as inputs but send the remaining assets to the buyer (like its change address)
  //               { sql },
  //             );

  //             this.logger.verbose(`Contract id ${contractId}`);

  //             // TODO: using partialInputs and partialOutputs (two variables independant)
  //             // I need a fucntion that returns the new amount (using contract.inputs and contract.outputs)

  //             if (executionRatio === 1) {
  //               await this.db.updateContractState(
  //                 contractId,
  //                 calculateRemainingAssets(
  //                   parseAssets(contract.inputs),
  //                   partialInputs,
  //                 ),
  //                 calculateRemainingAssets(
  //                   parseAssets(contract.outputs),
  //                   partialOutputs,
  //                 ),
  //                 true,
  //                 { sql },
  //               );

  //               this.logger.info(`Contract ${txId} fully executed!`);
  //             } else {
  //               await this.db.updateContractState(
  //                 contractId,
  //                 calculateRemainingAssets(
  //                   parseAssets(contract.inputs),
  //                   partialInputs,
  //                 ),
  //                 calculateRemainingAssets(
  //                   parseAssets(contract.outputs),
  //                   partialOutputs,
  //                 ),
  //                 false,
  //                 { sql },
  //               );
  //               this.logger.info(`Contract ${txId} partially executed`);
  //             }

  //             // Update transaction to mark it as processed
  //             await this.db.updateTransaction(
  //               txId,
  //               true,
  //               [...partialInputs, ...partialOutputs], // the assets sent to owner and assets sent to "buyer"
  //               "",
  //               false,
  //               {
  //                 sql,
  //               },
  //             );

  //             this.logger.info(`Contract ${txId} processed successfully!`);
  //           } catch (e) {
  //             this.logger.error(
  //               `Contract ${txId} Failed,`,
  //               (e as Error).message,
  //             );
  //             throw e;
  //           }
  //         });
  //       } catch (error) {
  //         this.logger.error(
  //           "Error processing contract:",
  //           (error as Error).message,
  //         );
  //         throw error;
  //       }
  //     },
  //     {
  //       retries: 3,
  //       delay: 50, // Start with 50ms
  //       factor: 1.5, // Exponential backoff multiplier
  //       onRetry: (attempt, error) =>
  //         this.logger.warn(`Retry attempt ${attempt}: ${error}`),
  //     },
  //   );
  // }

  /**
   * Handles asset exchanges between sender and recipient.
   * @param {string} sender - The ID of the sender wallet
   * @param {string} recipient - The ID of the recipient wallet
   * @param {Asset[]} assetsToSend - List of assets to be transferred
   * @param {Object} [options] - Additional options, including optional sql transaction context
   * @returns {Promise<void>} A promise that resolves when the exchange is complete
   */
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
              const policy = await this.db.findPolicy(asset.policy_id);
              if (policy.immutable) {
                throw new Error(
                  `The amount for ${asset.policy_id} must be higher than 0`,
                );
              }
            }
          }

          // buggy but partially works
          // await this.db.sql.begin(async (sql: postgres.Sql) => {
          const senderUtxos = await this.db.findUTXOFor(sender, { sql });
          const collectedAssets: { [unit: Unit]: bigint } = {};
          const usedUtxos: Utxo[] = [];

          // Collect UTXOs until we have enough assets
          for (const utxo of senderUtxos) {
            this.logger.debug("utxo.id:", utxo.id);
            for (const asset of utxo.assets) {
              this.logger.debug(
                "asset.unit:",
                `${asset.policy_id}.${asset.name}`,
              );
              collectedAssets[`${asset.policy_id}.${asset.name}`] =
                (collectedAssets[`${asset.policy_id}.${asset.name}`] ||
                  BigInt(0)) +
                asset.amount;
            }
            usedUtxos.push(utxo);
          }

          this.logger.debug(assetsToSend, collectedAssets, usedUtxos);

          // Check if we have all required assets
          const hasEnough = assetsToSend.every((asset) =>
            asset.amount >= 0
              ? (collectedAssets[`${asset.policy_id}.${asset.name}`] ||
                BigInt(0)) >= asset.amount
              : (collectedAssets[`${asset.policy_id}.${asset.name}`] ||
                BigInt(0)) >=
                BigInt(-1) * asset.amount
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
              `${asset.policy_id}.${asset.name}` === unit
            )?.amount || BigInt(0);

            // An asset has been found, so need to check if there is more than expected amount
            // if so we need to split the amount
            if (amount > requiredAmount) {
              // Calculate the remaining amount after sending or burning
              const remainingAmount = requiredAmount >= 0
                ? amount - requiredAmount // Sending positive amounts
                : amount + requiredAmount; // Burning negative amounts

              const [policy_id, name] = unit.split(".");
              if (remainingAmount > 0) {
                remainingAssets.push({
                  policy_id,
                  name,
                  amount: remainingAmount,
                });
              }
            }
          }

          this.logger.debug("remainingAssets", remainingAssets);

          // Create UTXO to send back to the sender (change address)
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
    signature: string,
  ): Promise<void> {
    this.logger.verbose(
      "processRequest",
      txId,
      sender,
      recipient,
      assetsToSend,
      signature,
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
    if (!signature || signature.length === 0) {
      throw new Error("Missing signature");
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
    signature: string,
  ): Promise<string> {
    this.logger.verbose("addRequest", sender, recipient, assetsToSend);
    const id = generateTxId();
    await this.db.createTransaction(id, sender, "exchange", signature);
    await this.sendMessage("transactions", [
      {
        key: sender,
        value: stringify({ id, sender, recipient, assetsToSend, signature }),
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
    signature: string,
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
    await this.db.createTransaction(txId, owner, "exchange", signature);
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
  async addContract(
    buyer: string,
    contractId: string,
    signature: string,
  ): Promise<string> {
    this.logger.verbose("addContract", buyer, contractId);

    const txId = generateTxId();
    const contract = await this.db.findContract(contractId);
    if (!contract || contract.executed === true) {
      throw new Error("Contract not found or already executed");
    }
    await this.db.createTransaction(txId, buyer, "contract", signature);
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
  ): Promise<Transaction | undefined> {
    this.logger.info("Wait For transactions to be executed:", txs.join(","));
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const checkCondition = async () => {
        try {
          let completed = true;
          let transactionInfo: undefined | Transaction = undefined;
          for (const txId of txs) {
            const tx = await this.db.findTransaction(txId);
            if (tx.executed === false) {
              completed = false;
              break;
            }
            transactionInfo = tx;
          }
          if (completed) {
            this.logger.info("All transactions completed");
            return resolve(transactionInfo);
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
