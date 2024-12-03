## Ledger

A Small experiment using ChatGPT to build a simple Ledger inspired from the UTXO Model.
My goal is to get more familiar with the concepts and for that I like to build random stuff to learn.

- Supports multi assets
- 100% in typescript
- Moved to Postgres DB
- 2 External dependencies: Postgres and cbor
- 1 working example, with multiple sequences
- Manager and processors to connect external events (mocked)
- Built with Deno 2
- Exponential backoff mechanism to retry processing requests when selected UTXO is already spent.
- Added queue to process wallet in parallel, and each of there transactions sequentially to reduce the UTXO already spent issue. (but now I need to distribute the load, next step)

## Usage

1. Install deno.
2. Enjoy.

```bash
deno run -A __tests__/pg.test.ts
```

**Output (pg.test.ts)**

```bash
UTXO created: bd4b0ebf-cb8e-43c0-8a3c-2e2969341de1
Funds added with success bd4b0ebf-cb8e-43c0-8a3c-2e2969341de1
┌───────┬─────────────────────────────────────────────┬───────┐
│ (idx) │ balance                                     │ utxos │
├───────┼─────────────────────────────────────────────┼───────┤
│ Alice │ { gold: 1000n, silver: 777n, coin: 10000n } │     1 │
│ Bob   │ {}                                          │     0 │
│ Ron   │ {}                                          │     0 │
└───────┴─────────────────────────────────────────────┴───────┘



UTXO created: 66036e15-3ff9-475f-8f64-98abd9f52813
Funds added with success 66036e15-3ff9-475f-8f64-98abd9f52813
┌───────┬─────────────────────────────────────────────┬───────┐
│ (idx) │ balance                                     │ utxos │
├───────┼─────────────────────────────────────────────┼───────┤
│ Alice │ { gold: 1123n, silver: 777n, coin: 10000n } │     2 │
│ Bob   │ {}                                          │     0 │
│ Ron   │ {}                                          │     0 │
└───────┴─────────────────────────────────────────────┴───────┘



UTXO created: cd752ef7-0673-48a7-bc76-71efd6207e23
UTXO created: b22f03ec-66b4-4f46-9e97-34d163e116a2
Transaction processed successfully!
┌───────┬────────────────────────────────────────────┬───────┐
│ (idx) │ balance                                    │ utxos │
├───────┼────────────────────────────────────────────┼───────┤
│ Alice │ { gold: 623n, silver: 777n, coin: 10000n } │     2 │
│ Bob   │ { gold: 500n }                             │     1 │
│ Ron   │ {}                                         │     0 │
└───────┴────────────────────────────────────────────┴───────┘



UTXO created: db536b28-77c3-4a61-a97b-a142af9569d4
UTXO created: bad56435-db13-4523-99d7-7a8be8aaba9e
Transaction processed successfully!
┌───────┬────────────────────────────────────────────┬───────┐
│ (idx) │ balance                                    │ utxos │
├───────┼────────────────────────────────────────────┼───────┤
│ Alice │ { gold: 499n, silver: 777n, coin: 10000n } │     1 │
│ Bob   │ { gold: 624n }                             │     2 │
│ Ron   │ {}                                         │     0 │
└───────┴────────────────────────────────────────────┴───────┘



UTXO created: 6e9108ac-b800-4182-9eba-907aee79ef4d
UTXO created: df4b17db-d8f5-43f5-8adb-bf16f6b98596
Transaction processed successfully!
Transaction Failed UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Error processing transaction: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Retry attempt 1: Error: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Transaction Failed UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Error processing transaction: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Retry attempt 1: Error: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Transaction Failed UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Error processing transaction: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Retry attempt 1: Error: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Transaction Failed UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Error processing transaction: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
Retry attempt 1: Error: UTXO bad56435-db13-4523-99d7-7a8be8aaba9e already spent
UTXO created: a1e9b9ea-c97f-46bf-acb2-11bf16cc9e4d
UTXO created: a6e34214-2957-4ec4-b017-e0b18682354c
Transaction processed successfully!
Transaction Failed UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Error processing transaction: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Retry attempt 1: Error: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Transaction Failed UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Error processing transaction: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Retry attempt 1: Error: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Transaction Failed UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Error processing transaction: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Retry attempt 1: Error: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Transaction Failed UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Error processing transaction: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
Retry attempt 1: Error: UTXO df4b17db-d8f5-43f5-8adb-bf16f6b98596 already spent
UTXO created: f4789721-cea8-44fc-80b9-33be09844a0f
UTXO created: 3573359a-6dc5-4210-9dc5-6c9aec6b5440
Transaction processed successfully!
Transaction Failed UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Error processing transaction: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Retry attempt 2: Error: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Transaction Failed UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Error processing transaction: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Retry attempt 2: Error: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
UTXO created: 166dfb14-671e-402a-a588-5dee52888edc
Transaction Failed UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Error processing transaction: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Retry attempt 2: Error: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
UTXO created: d009ca35-5cee-44b9-9f11-d84e96c1bb4d
Transaction processed successfully!
Transaction Failed UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Error processing transaction: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Retry attempt 2: Error: UTXO a6e34214-2957-4ec4-b017-e0b18682354c already spent
Transaction Failed UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
Error processing transaction: UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
Retry attempt 2: Error: UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
Transaction Failed UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
Error processing transaction: UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
Retry attempt 2: Error: UTXO 3573359a-6dc5-4210-9dc5-6c9aec6b5440 already spent
UTXO created: fca4deee-d73e-4e93-8f23-f48808ee6fe7
UTXO created: 466d7bb4-1298-4c5e-96d8-44b1232c4fce
Transaction processed successfully!
Transaction Failed UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Error processing transaction: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Retry attempt 3: Error: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Transaction Failed UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Error processing transaction: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Retry attempt 3: Error: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Transaction Failed UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Error processing transaction: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Retry attempt 3: Error: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Transaction Failed UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Error processing transaction: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Retry attempt 3: Error: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Transaction Failed UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Error processing transaction: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
Retry attempt 3: Error: UTXO d009ca35-5cee-44b9-9f11-d84e96c1bb4d already spent
UTXO created: 2fc6dda9-7e76-4881-babd-0baf9b1dcad1
UTXO created: 169dabbc-1dae-43f7-9490-6e6b8ddee522
Transaction processed successfully!
Transaction Failed UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Error processing transaction: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Retry attempt 4: Error: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Transaction Failed UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Error processing transaction: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Retry attempt 4: Error: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Transaction Failed UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Error processing transaction: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Retry attempt 4: Error: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Transaction Failed UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Error processing transaction: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
Retry attempt 4: Error: UTXO 466d7bb4-1298-4c5e-96d8-44b1232c4fce already spent
UTXO created: ac19127f-c3d8-490a-9435-e873f2133826
UTXO created: bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68
Transaction processed successfully!
Transaction Failed UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Error processing transaction: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Retry attempt 5: Error: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Transaction Failed UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Error processing transaction: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Retry attempt 5: Error: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Transaction Failed UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Error processing transaction: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
Retry attempt 5: Error: UTXO 169dabbc-1dae-43f7-9490-6e6b8ddee522 already spent
UTXO created: 2aa698f2-95d5-42cf-ad74-3c095a13ca35
UTXO created: ff07c2ae-213a-4fe4-a727-500db2172de2
Transaction processed successfully!
Transaction Failed UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
Error processing transaction: UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
Retry attempt 6: Error: UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
Transaction Failed UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
Error processing transaction: UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
Retry attempt 6: Error: UTXO bbe57c8b-1087-4cd0-a2cc-ed44a92dbc68 already spent
UTXO created: 41d405f5-34f2-449a-9465-2374d264cb86
UTXO created: eb866976-0dd5-45d6-a309-6a5b2ddf4f1a
Transaction processed successfully!
Transaction Failed UTXO ff07c2ae-213a-4fe4-a727-500db2172de2 already spent
Error processing transaction: UTXO ff07c2ae-213a-4fe4-a727-500db2172de2 already spent
Retry attempt 7: Error: UTXO ff07c2ae-213a-4fe4-a727-500db2172de2 already spent
UTXO created: cf4c519c-5949-4464-b2c8-a19979a1fc2d
UTXO created: be142cdc-5b8d-42df-8258-d17c29c7a97e
Transaction processed successfully!
┌───────┬────────────────────────────────────────────┬───────┐
│ (idx) │ balance                                    │ utxos │
├───────┼────────────────────────────────────────────┼───────┤
│ Alice │ { gold: 444n, silver: 777n, coin: 10000n } │     1 │
│ Bob   │ { gold: 679n }                             │    12 │
│ Ron   │ {}                                         │     0 │
└───────┴────────────────────────────────────────────┴───────┘



Exchange 5000 from Alice to Bob to Buy a car_1
UTXO created: 6f27374f-d899-4e37-854c-b38c4d461cb8
UTXO created: 49840d4a-3ce0-40e8-8768-391db27bee4d
Transaction processed successfully!
Delivering item car_1 to player Alice
Player Alice now has item: car_1
┌───────┬───────────────────────────────────────────┬───────┐
│ (idx) │ balance                                   │ utxos │
├───────┼───────────────────────────────────────────┼───────┤
│ Alice │ { gold: 444n, silver: 777n, coin: 5000n } │     1 │
│ Bob   │ { gold: 679n, coin: 5000n }               │    13 │
│ Ron   │ {}                                        │     0 │
└───────┴───────────────────────────────────────────┴───────┘



UTXO created: 63815682-87d2-4c07-8024-8708efdeab61
Funds added with success 63815682-87d2-4c07-8024-8708efdeab61
┌───────┬───────────────────────────────────────────┬───────┐
│ (idx) │ balance                                   │ utxos │
├───────┼───────────────────────────────────────────┼───────┤
│ Alice │ { gold: 444n, silver: 777n, coin: 5000n } │     1 │
│ Bob   │ { gold: 679n, coin: 5000n }               │    13 │
│ Ron   │ { coin: 3333666666999999n }               │     1 │
└───────┴───────────────────────────────────────────┴───────┘


```
