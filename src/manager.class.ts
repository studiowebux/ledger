import type { Ledger } from "./ledger.class.ts";
import type { PostTransactionProcessor } from "./processors/post-transaction.class.ts";
import type { Metadata, Transaction, UTXO } from "./types.ts";

export class LedgerManager {
  private ledger: Ledger;
  private processor: PostTransactionProcessor;

  constructor(ledger: Ledger, processor: PostTransactionProcessor) {
    this.ledger = ledger;
    this.processor = processor;
  }

  transferFunds(
    fromCharacterId: string,
    toCharacterId: string,
    amount: number,
    metadata?: Metadata[],
  ): void {
    const fromLedger = this.ledger.getUtxos(fromCharacterId);
    const toLedger = this.ledger.getUtxos(toCharacterId);
    if (!fromLedger || !toLedger) {
      throw new Error("Ledgers not found");
    }

    // Create a transaction
    const transaction: Transaction = {
      inputs: fromLedger.map((utxo: UTXO) => utxo.id),
      outputs: [],
      metadata:
        metadata?.map((meta) => ({
          ...meta,
          sender: fromCharacterId,
          recipient: toCharacterId,
        })) || [],
    };

    // Output to recipient
    transaction.outputs.push({
      amount,
      recipient: toCharacterId,
    });

    // Return change to sender, if any
    if (
      fromLedger.reduce((sum, current) => (sum += current.amount), 0) > amount
    ) {
      transaction.outputs.push({
        amount:
          fromLedger.reduce((sum, current) => (sum += current.amount), 0) -
          amount,
        recipient: fromCharacterId,
      });
    }

    // Process transactions for both ledgers
    try {
      this.ledger.processTransaction({
        inputs: transaction.inputs,
        outputs: transaction.outputs,
      });
      this.processor.process(transaction);
    } catch (e) {
      throw e;
    }
  }
}
