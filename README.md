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
UTXO created: 556b2885-ce9c-49d3-992d-57db298e2505
Transaction committed.
Funds added with success 556b2885-ce9c-49d3-992d-57db298e2505
Alice's Balance: { coin: 100n, gold: 1000n }


Transfer 30 from Alice to Bob
Transaction started.
UTXO created: 5156954d-6da8-4b29-890e-37f9a7051338
UTXO created: 738a449e-97b7-4ffa-b110-884e2c0c2e34
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
UTXO created: 2d7b38a8-7d94-428f-bc10-64c34e4e5188
UTXO created: 11678283-36b1-42b3-bc59-b7788b3844b7
Transaction committed.
Transaction processed successfully!
Delivering item boat_1 to player undefined
Player undefined now has item: boat_1
┌───────┬────────────────────────────┬───────┐
│ (idx) │ balance                    │ utxos │
├───────┼────────────────────────────┼───────┤
│ Alice │ { coin: 40n, gold: 1000n } │     1 │
│ Bob   │ { coin: 60n }              │     2 │
│ Ron   │ {}                         │     0 │
└───────┴────────────────────────────┴───────┘


Exchange 5000 from Alice to Bob to Buy a car_1
Transaction started.
UTXO created: a9cb492f-d6d8-490d-9fe2-f60de7a131bb
Transaction committed.
Funds added with success a9cb492f-d6d8-490d-9fe2-f60de7a131bb
┌───────┬──────────────────────────────┬───────┐
│ (idx) │ balance                      │ utxos │
├───────┼──────────────────────────────┼───────┤
│ Alice │ { coin: 5000n, gold: 1000n } │     2 │
│ Bob   │ { coin: 60n }                │     2 │
│ Ron   │ {}                           │     0 │
└───────┴──────────────────────────────┴───────┘
Transaction started.
UTXO created: e527b06e-9869-4a55-9250-bf8128cc67d8
UTXO created: f6c988e0-dc00-411a-a732-ef67feee32af
Transaction committed.
Transaction processed successfully!
Delivering item car_1 to player undefined
Player undefined now has item: car_1
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
┌───────┬─────────────────┬───────┐
│ (idx) │ balance         │ utxos │
├───────┼─────────────────┼───────┤
│ Alice │ { gold: 1000n } │     1 │
│ Bob   │ { coin: 5060n } │     3 │
│ Ron   │ {}              │     0 │
└───────┴─────────────────┴───────┘


Send Alice 0 coins to herself
Transaction started.
Error processing transaction: The amount must be higher than 0
Transaction rolled back.


Send Bob 500 coins to himself
Transaction started.
UTXO created: eff1e16c-0467-4a7a-aa44-4af759252246
UTXO created: 7e3ec504-0bb8-4675-b7de-0a0ff84eac94
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
UTXO created: 21a14a76-f954-4e11-a192-f8e0f9cde278
UTXO created: 431a09cb-9582-4b14-a6bd-8b43d10f9274
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: f5f2f967-1f2d-47a6-842a-2cf73e2a3bd2
UTXO created: d505f161-26d1-45bd-8972-83c05df60624
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: ddf80693-ee68-4de3-ac50-b9af274a37f1
UTXO created: 28fb5518-5f99-4ca7-8a45-93f2cdc1bd9e
Transaction committed.
Transaction processed successfully!
Transaction started.
UTXO created: 868fc999-8efa-4e1e-b424-45006d38d287
UTXO created: a2222854-321b-40f9-b7fc-f575afca9a0c
Transaction committed.
Transaction processed successfully!


Ron gives back to Alice
Transaction started.
UTXO created: 92b72dc9-a4ae-4238-b911-8706ac1c2402
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
