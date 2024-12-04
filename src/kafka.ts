import { Kafka } from "kafkajs";

function generateTxId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const kafkaProducer: Kafka = new Kafka({
  clientId: `${generateTxId()}-producer`,
  brokers: ["127.0.0.1:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
});

export const kafkaConsumer: Kafka = new Kafka({
  clientId: `${generateTxId()}-consumer`,
  brokers: ["127.0.0.1:9092"],
});

export const kafkaAdmin: Kafka = new Kafka({
  clientId: `${generateTxId()}-admin`,
  brokers: ["127.0.0.1:9092"],
});
