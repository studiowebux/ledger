import type { Metadata } from "./types.ts";

export abstract class Processor {
  static Execute(_metadata: Metadata): void {
    throw new Error("Not Implemented");
  }
}
