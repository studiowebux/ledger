import { Kafka, Partitioners, type Consumer, type Producer } from "kafkajs";
import { generateTxId } from "./util.ts";

export const kafkaProducer: Kafka = new Kafka({
  clientId: `${generateTxId()}-producer`,
  brokers: ["127.0.0.1:9092"],
});

export const kafkaConsumer: Kafka = new Kafka({
  clientId: `${generateTxId()}-consumer`,
  brokers: ["127.0.0.1:9092"],
});

export const kafkaAdmin: Kafka = new Kafka({
  clientId: `${generateTxId()}-admin`,
  brokers: ["127.0.0.1:9092"],
});

export class PubSub {
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.producer = kafkaProducer.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    this.consumer = kafkaConsumer.consumer({ groupId: "ledger" });

    this.producer.on("producer.connect", () => {
      console.log("Kafka Producer connected");
    });
    this.producer.on("producer.disconnect", () => {
      console.log("Kafka Producer disconnected");
    });

    this.consumer.on("consumer.connect", () => {
      console.log("Kafka Consumer connected");
    });
    this.consumer.on("consumer.disconnect", () => {
      console.log("Kafka Consumer disconnected");
    });
  }

  async close() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async setupProducer() {
    try {
      await this.producer.connect();
    } catch (e) {
      console.error("Producer error", e);
    }
    return this;
  }

  async setupConsumer() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: ["transactions"],
        fromBeginning: true,
      });
    } catch (e) {
      console.log("Consumer Error: ", e);
    }
    return this;
  }

  async consume(fn: (message: string) => Promise<void>) {
    try {
      await this.consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: async ({
          _topic,
          _partition,
          message,
          _heartbeat,
          _pause,
        }) => {
          if (!message?.value?.toString()) {
            throw new Error("No payload received");
          }

          await fn(message?.value?.toString());
        },
      });
    } catch (e) {
      console.log("Consumer Run Error: ", (e as Error).message);
    }
  }

  async sendMessage(topic: string, messages: { key: string; value: string }[]) {
    await this.producer.send({
      topic,
      messages,
      timeout: 30000,
    });
  }
}
