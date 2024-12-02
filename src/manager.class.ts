import type { Ledger } from "./ledger.class.ts";
import type { PostTransactionProcessor } from "./processors/post-transaction.class.ts";
import type { Asset, Metadata } from "./types.ts";

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
    assets: Asset[],
    metadata?: Metadata[],
  ): void {
    // Process the transaction
    try {
      this.ledger.processTransaction(fromCharacterId, toCharacterId, assets);
      if (metadata) {
        this.processor.process(metadata);
      }
    } catch (e) {
      throw new Error(`Transaction failed: ${(e as Error).message}`);
    }
  }
}
