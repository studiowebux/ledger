type RetryOptions = {
  retries: number; // Maximum number of retry attempts
  delay: number; // Initial delay in milliseconds
  factor?: number; // Multiplier for the delay after each attempt
  onRetry?: (attempt: number, error: unknown) => void; // Callback for retry events
};

export async function retryWithBackoff<T>(
  task: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries, delay, factor = 2, onRetry } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Try executing the task
      return await task();
    } catch (error) {
      attempt++;

      // If we've exceeded retries, throw the error
      if (attempt > retries) {
        throw error;
      }

      // Optional callback on retry
      onRetry?.(attempt, error);

      // Calculate the next delay (exponential backoff)
      const backoffDelay = delay * Math.pow(factor, attempt - 1);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // This line is unreachable but included for type safety
  throw new Error("Unexpected execution flow in retry logic.");
}
