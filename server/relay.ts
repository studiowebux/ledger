import { Buffer } from "node:buffer";
import { verify } from "node:crypto";
import { Asset } from "../src/types.ts";
import Logger from "@studiowebux/deno-minilog";
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";
import { stringify } from "../src/encoder_decoder.ts";

const clients = new Set<WebSocket>();

export type Message =
  | { type: "hello"; sender: string }
  | { type: "balance"; sender: string }
  | {
    type: "tx";
    tx: {
      payload: {
        sender: string;
        recipient: string;
        assets: Asset[];
      };
      signature: string;
    };
  };

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const logger = new Logger();
const db = new Postgres(url, logger);
const pubSub = new PubSub();
await pubSub.setupProducer();

const ledger = new Ledger({
  db,
  sendMessage: (topic, messages) => pubSub.sendMessage(topic, messages),
  logger,
});

Deno.serve({
  port: 8080,
  cert: Deno.readTextFileSync("./ssl/server.crt"),
  key: Deno.readTextFileSync("./ssl/server.key"),
}, (req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.addEventListener("open", () => {
    clients.add(socket);
    logger.info("🟢 Peer connected");
  });

  socket.addEventListener("message", async (event) => {
    const data: Message = JSON.parse(event.data);
    logger.info("📩 Received:", data);

    if (data.type === "balance") {
      socket.send("Wait a second..");
      const balance = await ledger.getBalance(data.sender);
      return socket.send(stringify(balance));
    }

    if (data.type === "tx") {
      const { payload, signature } = data.tx;

      const isValid = verify(
        null,
        Buffer.from(stringify(payload)),
        Buffer.from(payload.sender, "hex").toString("utf8"),
        Buffer.from(signature, "hex"),
      );

      if (!isValid) {
        socket.send("Transaction is not valid.");
        return;
      }

      logger.info("Transaction is valid.");

      const transactionId = await ledger.addRequest(
        payload.sender,
        payload.recipient,
        payload.assets,
        signature,
      );

      socket.send(`Transaction Submitted: ${transactionId}`);

      ledger.waitForTransactions([transactionId]).then((info) => {
        socket.send(
          `Transaction Executed: ${transactionId}, Failed: ${info?.failed}, Reason: ${info?.reason}`,
        );
      });
    }
  });

  socket.addEventListener("close", () => {
    clients.delete(socket);
    logger.info("🔴 Peer disconnected");
  });
  return response;
});
