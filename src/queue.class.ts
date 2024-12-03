type Task = () => Promise<void>;
type TaskStatus = "pending" | "in-progress" | "completed" | "failed";

interface TaskEntry {
  id: string;
  task: Task;
  status: TaskStatus;
  error?: string;
}

export class Queue {
  private queues: Map<string, TaskEntry[]> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private deadLetterQueue: TaskEntry[] = [];
  private statusMap: Map<string, TaskEntry> = new Map();
  private completionResolvers: Map<string, (status: TaskEntry) => void> =
    new Map();
  private pendingTaskCount = 0;
  private allTasksResolver?: () => void;

  private generateTxId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  enqueue(key: string, task: Task): string {
    const txId = this.generateTxId();
    const taskEntry: TaskEntry = { id: txId, task, status: "pending" };

    if (!this.queues.has(key)) {
      this.queues.set(key, []);
      this.isProcessing.set(key, false);
    }

    this.queues.get(key)!.push(taskEntry);
    this.statusMap.set(txId, taskEntry);

    this.pendingTaskCount++;
    this.processQueue(key);
    return txId;
  }

  private async processQueue(key: string): Promise<void> {
    if (this.isProcessing.get(key)) return;

    this.isProcessing.set(key, true);

    while (this.queues.get(key)!.length > 0) {
      const taskEntry = this.queues.get(key)!.shift()!;
      taskEntry.status = "in-progress";
      this.statusMap.set(taskEntry.id, taskEntry);

      try {
        await taskEntry.task();
        taskEntry.status = "completed";
      } catch (error) {
        taskEntry.status = "failed";
        taskEntry.error = (error as Error).message;
        this.deadLetterQueue.push(taskEntry);
      } finally {
        this.statusMap.set(taskEntry.id, taskEntry);
        this.pendingTaskCount--;

        // Resolve completion for this task
        if (this.completionResolvers.has(taskEntry.id)) {
          this.completionResolvers.get(taskEntry.id)!(taskEntry);
          this.completionResolvers.delete(taskEntry.id);
        }

        // If no pending tasks, resolve global completion
        if (this.pendingTaskCount === 0 && this.allTasksResolver) {
          this.allTasksResolver();
          this.allTasksResolver = undefined;
        }
      }
    }

    this.isProcessing.set(key, false);
  }

  getTaskStatus(txId: string): TaskEntry | undefined {
    return this.statusMap.get(txId);
  }

  getDeadLetterQueue(): TaskEntry[] {
    return this.deadLetterQueue;
  }

  getItems(key: string) {
    return this.queues.get(key);
  }

  async waitForCompletion(txId: string): Promise<TaskEntry> {
    const task = this.statusMap.get(txId);
    if (!task) {
      throw new Error(`Task with ID ${txId} not found`);
    }

    if (task.status === "completed" || task.status === "failed") {
      return task;
    }

    return new Promise<TaskEntry>((resolve) => {
      this.completionResolvers.set(txId, resolve);
    });
  }

  async waitForAllCompletion(): Promise<void> {
    if (this.pendingTaskCount === 0) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.allTasksResolver = resolve;
    });
  }
}
