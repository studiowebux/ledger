import type { Processor } from "../processor.class.ts";
import type { Transaction } from "../types.ts";

export class PostTransactionProcessor {
  private events: Map<string, Processor> = new Map();

  public AddEvent(
    eventName: string,
    processor: Processor,
  ): PostTransactionProcessor {
    this.events.set(eventName, processor);
    return this;
  }

  public RemoveEvent(eventName: string): PostTransactionProcessor {
    this.events.delete(eventName);
    return this;
  }

  process(transaction: Transaction): void {
    const { metadata } = transaction;

    if (!metadata) {
      console.log("No post-transaction actions required.");
      return;
    }

    for (const meta of metadata) {
      this.events.get(meta.action)?.Execute(meta);
    }
  }
}
