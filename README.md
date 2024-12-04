## Ledger

A Small experiment using ChatGPT to build a simple Ledger inspired from the UTXO Model.
My goal is to get more familiar with the concepts and for that I like to build random stuff to learn.

- Supports multi assets
- 100% in typescript
- Moved to Postgres DB
- 2 External dependencies: Kafka, Postgres and cbor
- 1 working example, with multiple sequences
- Manager and processors to connect external events (mocked)
- Built with Deno 2
- Exponential backoff mechanism to retry processing requests when selected UTXO is already spent.
- Moved to Distributed architecture using Kafka, need to improve this part as well.
- Two postgres Tables, one for utxos and one for transaction status.

## Usage

1. Install deno.
2. Run containers
```bash
docker compose up -d
```
3. Enjoy.

```bash
deno run -A __tests__/consumer.test.ts
```

```bash
deno run -A __tests__/producer.test.ts
```
