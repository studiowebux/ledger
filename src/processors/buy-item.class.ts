import { Processor } from "../processor.class.ts";
import type { Metadata } from "../types.ts";

export class BuyItem extends Processor {
  static override Execute(metadata: Metadata): void {
    console.log(
      `Delivering item ${metadata.itemId} to player ${metadata.sender}`,
    );
    console.log(`Player ${metadata.sender} now has item: ${metadata.itemId}`);
  }
}
