type RetryOptions = {
  retries: number; // Max retry attempts
  delay: number; // Initial delay (ms)
  factor?: number; // Backoff multiplier
  onRetry?: (attempt: number, error: unknown) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  task: () => Promise<T>,
  { retries, delay, factor = 2, onRetry }: RetryOptions,
): Promise<T> {
  let backoff = delay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt === retries) throw error;

      onRetry?.(attempt + 1, error);
      await sleep(backoff);
      backoff *= factor;
    }
  }

  throw new Error("Unreachable: retryWithBackoff fell through.");
}
