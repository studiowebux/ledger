import type { Processor } from "../processor.class.ts";
import type { Metadata } from "../types.ts";

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

  async process(metadata: Metadata[]): Promise<void> {
    if (!metadata) {
      console.log("No post-transaction actions required.");
      return;
    }

    for (const meta of metadata) {
      this.events.get(meta.action)?.Execute(meta);
    }
  }
}
