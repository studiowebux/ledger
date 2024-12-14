## Ledger

A Small experiment using ChatGPT to build a simple Ledger inspired from the UTXO Model.
My goal is to get more familiar with the concepts and for that I like to build random stuff to learn.

- Supports multi assets and contracts
- 100% in typescript
- Built using Postgres DB
- 3 External dependencies: Kafka, Postgres and cbor
- Multiple tests
- Built with Deno 2
- Exponential backoff mechanism to retry processing requests when selected UTXO is already spent.
- Moved to Distributed architecture using Kafka.
- 4 postgres tables: utxos, transactions, contracts and policies.
- Added a feature to Burn Assets or make them immutable (configurable in the policies table)
- Decoupled few parts of the code (Requires more efforts on that side)
- Added Contracts to lock/unlock assets.

## Usage

1. Install deno.
2. Run containers
```bash
docker compose up -d
```
3. Enjoy.

```bash
deno run -A __tests__/clean.ts
deno run -A __tests__/setup.ts
deno run -A __tests__/policy.ts
```

**Start at least two consumers to get faster processing**

```bash
deno run -A __tests__/consumer.test.ts
deno run -A __tests__/consumer.test.ts
```

```bash
deno run -A __tests__/producer.test.ts
```

**To burn tokens**
```bash
deno run -A __tests__/burn.test.ts
```

**Contracts**
```bash
deno run -A __tests__/contract.test.ts
```
