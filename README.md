## Ledger

A Small experiment using ChatGPT to build a simple Ledger inspired from the UTXO Model.
My goal is to get more familiar with the concepts and for that I like to build random stuff to learn.

- Supports multi assets
- 100% in typescript
- Mocked database
- No external dependencies
- 2 working examples
- Manager and processors to connect external events (mocked as well)
- Built with Deno 2

## Usage

1. Install deno.
2. Enjoy.

```bash
deno deno task demo
deno deno task demo-2
```

**Output (demo)**

```bash
Task demo deno run __tests__/sequence.test.ts
Transaction started.
UTXO created: 94a282eb-fba2-4750-9cb9-428d9ade4bce
Transaction committed.
Funds added with success 94a282eb-fba2-4750-9cb9-428d9ade4bce
Alice's Balance: { coin: 100n, gold: 1000n }




Transfer 30 from Alice to Bob
Transaction started.
UTXO created: a7c5e994-e29a-432c-93c0-f65d5aeb7127
UTXO created: d95f6e75-d588-4699-aae1-c815705455a9
Transaction committed.
Transaction processed successfully!
┌───────┬────────────────────────────┬───────┐
│ (idx) │ balance                    │ utxos │
├───────┼────────────────────────────┼───────┤
│ Alice │ { coin: 70n, gold: 1000n } │     1 │
│ Bob   │ { coin: 30n }              │     1 │
│ Ron   │ {}                         │     0 │
└───────┴────────────────────────────┴───────┘



Exchange 30 from Alice to Bob to Buy a boat_1
Transaction started.
UTXO created: abb58b29-350c-409b-8ca3-bb97e83c9442
UTXO created: 8a3acfda-ca19-4643-b782-0ba01aefff52
Transaction committed.
Transaction processed successfully!
Delivering item boat_1 to player Alice
Player Alice now has item: boat_1
┌───────┬────────────────────────────┬───────┐
│ (idx) │ balance                    │ utxos │
├───────┼────────────────────────────┼───────┤
│ Alice │ { coin: 40n, gold: 1000n } │     1 │
│ Bob   │ { coin: 60n }              │     2 │
│ Ron   │ {}                         │     0 │
└───────┴────────────────────────────┴───────┘



Exchange 5000 from Alice to Bob to Buy a car_1
Transaction started.
UTXO created: d9e2ec0e-1300-4f80-855f-a4fdf0b883fc
Transaction committed.
Funds added with success d9e2ec0e-1300-4f80-855f-a4fdf0b883fc
┌───────┬──────────────────────────────┬───────┐
│ (idx) │ balance                      │ utxos │
├───────┼──────────────────────────────┼───────┤
│ Alice │ { coin: 5000n, gold: 1000n } │     2 │
│ Bob   │ { coin: 60n }                │     2 │
│ Ron   │ {}                           │     0 │
└───────┴──────────────────────────────┴───────┘
Transaction started.
UTXO created: a372fd48-1c61-4339-8369-66aba1744fe5
UTXO created: 72827bd7-a222-4140-a345-f883965bd6ff
Transaction committed.
Transaction processed successfully!
Delivering item car_1 to player Alice
Player Alice now has item: car_1
┌───────┬─────────────────┬───────┐
│ (idx) │ balance         │ utxos │
├───────┼─────────────────┼───────┤
│ Alice │ { gold: 1000n } │     1 │
│ Bob   │ { coin: 5060n } │     3 │
│ Ron   │ {}              │     0 │
└───────┴─────────────────┴───────┘



Test with empty wallet
Transaction started.
Error processing transaction: Insufficient assets
Transaction rolled back.




Send Alice 0 coins to herself
Transaction started.
Error processing transaction: The amount must be higher than 0
Transaction rolled back.




Send Bob 500 coins to himself
Transaction started.
UTXO created: b0138339-df67-443e-87b7-9440ebab6a39
UTXO created: 77d89e6d-73ce-4cd2-8e96-dfc2d2ee5e0d
Transaction committed.
Transaction processed successfully!
┌───────┬─────────────────┬───────┐
│ (idx) │ balance         │ utxos │
├───────┼─────────────────┼───────┤
│ Alice │ { gold: 1000n } │     1 │
│ Bob   │ { coin: 5060n } │     2 │
│ Ron   │ {}              │     0 │
└───────┴─────────────────┴───────┘



Sharing with Ron
Transaction started.
UTXO created: ca753ee5-8602-4778-a004-28a2229eecfb
UTXO created: 4bbee866-64d0-44fd-808f-a32e1ead1ccf
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: 8a41f79e-f1aa-4558-9669-becf53e63bea
UTXO created: 016bfb25-c9ef-418d-9f56-a851b6c37ce9
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: 97b92028-1b33-42c3-be6d-838406187c06
UTXO created: f7952335-16f1-4c9b-bd5a-b5c6ceeea711
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: 3cabfc24-bcef-48d1-9d0b-bc5c11408447
UTXO created: 91b5fd1c-c733-4251-94ab-5c7d5ab3375e
Transaction committed.
Transaction processed successfully!




Ron gives back to Alice
Transaction started.
UTXO created: e64b2915-f6af-4078-8036-bebc07e23fa3
Transaction committed.
Transaction processed successfully!
┌───────┬───────────────────────────┬───────┐
│ (idx) │ balance                   │ utxos │
├───────┼───────────────────────────┼───────┤
│ Alice │ { gold: 1000n, coin: 1n } │     2 │
│ Bob   │ { coin: 5049n }           │     2 │
│ Ron   │ { coin: 10n }             │     3 │
└───────┴───────────────────────────┴───────┘



Testing negative value
Transaction started.
Error processing transaction: The amount must be higher than 0
Transaction rolled back.
┌───────┬───────────────────────────┬───────┐
│ (idx) │ balance                   │ utxos │
├───────┼───────────────────────────┼───────┤
│ Alice │ { gold: 1000n, coin: 1n } │     2 │
│ Bob   │ { coin: 5049n }           │     2 │
│ Ron   │ { coin: 10n }             │     3 │
└───────┴───────────────────────────┴───────┘

```

**Output (demo-2)**

```bash
Task demo-2 deno run __tests__/multi-assets.test.ts
Transaction started.
UTXO created: c75fb6a0-82ff-4e1c-a9a1-467efea68570
Transaction committed.
Funds added with success c75fb6a0-82ff-4e1c-a9a1-467efea68570
Transaction started.
UTXO created: 38ee93b4-0eda-470b-af3c-0e03e9a09055
Transaction committed.
Funds added with success 38ee93b4-0eda-470b-af3c-0e03e9a09055
Transaction started.
UTXO created: a5153e9c-2422-47ee-97da-163410849a70
UTXO created: 34e2f503-5924-4d5a-85dc-c017a75c74de
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: be0f9ebe-3d17-45c4-bf75-c3628600289a
UTXO created: 47b43840-de5e-432f-86c5-86ebe0206978
Transaction committed.
Transaction processed successfully!
{ gold: 499n, silver: 777n, coin: 10000n } [
  {
    id: "47b43840-de5e-432f-86c5-86ebe0206978",
    assets: [
      { unit: "gold", amount: 499n },
      { unit: "silver", amount: 777n },
      { unit: "coin", amount: 10000n }
    ],
    owner: "wallet_1",
    spent: false
  }
]
{ gold: 624n } [
  {
    id: "a5153e9c-2422-47ee-97da-163410849a70",
    assets: [ { amount: 500n, unit: "gold" } ],
    owner: "wallet_2",
    spent: false
  },
  {
    id: "be0f9ebe-3d17-45c4-bf75-c3628600289a",
    assets: [ { amount: 124n, unit: "gold" } ],
    owner: "wallet_2",
    spent: false
  }
]
{
  "db": {
    "utxos": [
      {
        "id": "c75fb6a0-82ff-4e1c-a9a1-467efea68570",
        "assets": [
          {
            "amount": 1000,
            "unit": "gold"
          },
          {
            "amount": 777,
            "unit": "silver"
          },
          {
            "amount": 10000,
            "unit": "coin"
          }
        ],
        "owner": "wallet_1",
        "spent": true
      },
      {
        "id": "38ee93b4-0eda-470b-af3c-0e03e9a09055",
        "assets": [
          {
            "amount": 123,
            "unit": "gold"
          }
        ],
        "owner": "wallet_1",
        "spent": true
      },
      {
        "id": "a5153e9c-2422-47ee-97da-163410849a70",
        "assets": [
          {
            "amount": 500,
            "unit": "gold"
          }
        ],
        "owner": "wallet_2",
        "spent": false
      },
      {
        "id": "34e2f503-5924-4d5a-85dc-c017a75c74de",
        "assets": [
          {
            "unit": "gold",
            "amount": 500
          },
          {
            "unit": "silver",
            "amount": 777
          },
          {
            "unit": "coin",
            "amount": 10000
          }
        ],
        "owner": "wallet_1",
        "spent": true
      },
      {
        "id": "be0f9ebe-3d17-45c4-bf75-c3628600289a",
        "assets": [
          {
            "amount": 124,
            "unit": "gold"
          }
        ],
        "owner": "wallet_2",
        "spent": false
      },
      {
        "id": "47b43840-de5e-432f-86c5-86ebe0206978",
        "assets": [
          {
            "unit": "gold",
            "amount": 499
          },
          {
            "unit": "silver",
            "amount": 777
          },
          {
            "unit": "coin",
            "amount": 10000
          }
        ],
        "owner": "wallet_1",
        "spent": false
      }
    ],
    "transactionInProgress": false,
    "transactionBackup": {
      "created": [],
      "updated": []
    }
  }
}
```
