## Ledger

A Small experiment using ChatGPT to build a simple Ledger inspired from the UTXO Model.
My goal is to get more familiar with the concepts and for that I like to build random stuff to learn.

- Supports multi assets and contracts
- 100% in typescript
- Built using Postgres DB
- 2 External dependencies: Kafka, Postgres
- Multiple tests
- Built with Deno 2
- Exponential backoff mechanism to retry processing requests when selected UTXO is already spent.
- Distributed architecture using Kafka.
- 4 postgres tables: utxos, transactions, contracts and policies.
- Burn Assets or make them immutable (configurable in the policies table)
- Contracts to lock/unlock assets.
- Custom logger

### Transactions

The transaction flow is built with a 'I want to send X coins to Y wallet' instead of an offline deterministic approach.
Meaning that the user does not have to build a transaction, only send its intent.
For a simple exchange it has to know the recipient id and the assets to send and for a contract it has to know the contract ID and the required inputs to unlock the output.
Then the system tries to achieve the request, if it was public and decentralize. This approach would lead to a lot of spam onto the network because it tries few times to process the request.

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
