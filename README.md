## Usage

1. Install deno.
2. Enjoy.

```bash
deno deno task demo
```

**Output**

```bash
Task demo deno run __tests__/sequence.test.ts
Transaction started.
UTXO created: c9726387-7f96-484f-8f75-a3bbba6b6546 100 coins for Alice
Transaction committed.
Funds added with success c9726387-7f96-484f-8f75-a3bbba6b6546
Alice's Balance: 100


Transfer 30 from Alice to Bob
Transaction started.
UTXO c9726387-7f96-484f-8f75-a3bbba6b6546 spent.
UTXO created: afeb029e-58f0-4c05-babb-4edc7dda0eae 30 coins for Bob
UTXO created: d3f31dea-abb8-4220-a408-379f7f5d36f2 70 coins for Alice
Transaction committed.
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │      70 │     1 │
│ Bob   │      30 │     1 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Exchange 30 from Alice to Bob to Buy a boat_1
Transaction started.
UTXO d3f31dea-abb8-4220-a408-379f7f5d36f2 spent.
UTXO created: 4ecbfd30-b3c9-405e-a21b-ad3f70d7006e 30 coins for Bob
UTXO created: a4cf955d-11a1-48f1-8772-680113fe21cf 40 coins for Alice
Transaction committed.
Delivering item boat_1 to player Alice
Player Alice now has item: boat_1
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │      40 │     1 │
│ Bob   │      60 │     2 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Exchange 5000 from Alice to Bob to Buy a car_1
Transaction started.
UTXO created: 5aad2852-5157-449d-953b-e48e022f1402 4960 coins for Alice
Transaction committed.
Funds added with success 5aad2852-5157-449d-953b-e48e022f1402
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │    5000 │     2 │
│ Bob   │      60 │     2 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘
Transaction started.
UTXO a4cf955d-11a1-48f1-8772-680113fe21cf spent.
UTXO 5aad2852-5157-449d-953b-e48e022f1402 spent.
UTXO created: 261495e7-a99c-427f-9f86-da5de5d67f95 5000 coins for Bob
Transaction committed.
Delivering item car_1 to player Alice
Player Alice now has item: car_1
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │       0 │     0 │
│ Bob   │    5060 │     3 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Test with empty wallet
Transaction started.
UTXO created: 876b7121-0618-4092-bac4-23867c74d076 5000 coins for Bob
Transaction rolled back.


Test Double spending
Transaction started.
Transaction rolled back.
Catched UTXO 5aad2852-5157-449d-953b-e48e022f1402 already spent
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │       0 │     0 │
│ Bob   │    5060 │     3 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Send Alice 0 coins to herself
Transaction started.
UTXO created: 44bbe825-fb02-49ac-8cb7-a9fef7b79e90 0 coins for Alice
Transaction committed.
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │       0 │     1 │
│ Bob   │    5060 │     3 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Send Bob 500 coins to himself
Transaction started.
UTXO afeb029e-58f0-4c05-babb-4edc7dda0eae spent.
UTXO 4ecbfd30-b3c9-405e-a21b-ad3f70d7006e spent.
UTXO 261495e7-a99c-427f-9f86-da5de5d67f95 spent.
UTXO created: ef098b32-fa4b-4c2c-8ad0-054f4812b135 555 coins for Bob
UTXO created: 7bdd358f-d5c0-4962-ae67-7ae1857519db 4505 coins for Bob
Transaction committed.
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │       0 │     1 │
│ Bob   │    5060 │     2 │
│ Ron   │       0 │     0 │
└───────┴─────────┴───────┘


Sharing with Ron
Transaction started.
UTXO ef098b32-fa4b-4c2c-8ad0-054f4812b135 spent.
UTXO 7bdd358f-d5c0-4962-ae67-7ae1857519db spent.
UTXO created: 6c83253f-bb83-4176-b45f-a9eb550c13cf 1 coins for Ron
UTXO created: 8d4d49c6-9bc4-4425-9ae7-77d6eabedd3b 5059 coins for Bob
Transaction committed.
Transaction started.
UTXO 8d4d49c6-9bc4-4425-9ae7-77d6eabedd3b spent.
UTXO created: 66a635bb-5df2-4633-89df-209fb9149000 2 coins for Ron
UTXO created: c4fd3eb3-0bbc-40a6-9c03-9c88f19d49f2 5057 coins for Bob
Transaction committed.
Transaction started.
UTXO c4fd3eb3-0bbc-40a6-9c03-9c88f19d49f2 spent.
UTXO created: ea4e45a3-531d-4d82-90f9-b1d6fe7325eb 3 coins for Ron
UTXO created: 3194f4a1-f9c1-4d3d-bbc6-56688839dc4d 5054 coins for Bob
Transaction committed.
Transaction started.
UTXO 3194f4a1-f9c1-4d3d-bbc6-56688839dc4d spent.
UTXO created: 54178240-4db4-4dda-a1f9-a390970bc698 5 coins for Ron
UTXO created: 05e137c0-7aa9-4ce5-835a-093ca874da90 5049 coins for Bob
Transaction committed.


Ron gives back to Alice
Transaction started.
UTXO 6c83253f-bb83-4176-b45f-a9eb550c13cf spent.
UTXO 66a635bb-5df2-4633-89df-209fb9149000 spent.
UTXO ea4e45a3-531d-4d82-90f9-b1d6fe7325eb spent.
UTXO 54178240-4db4-4dda-a1f9-a390970bc698 spent.
UTXO created: 51788ee0-1ea7-410a-85e8-4469a2889292 1 coins for Alice
UTXO created: a50930fd-642f-4a08-9848-2b4f5014313e 10 coins for Ron
Transaction committed.
┌───────┬─────────┬───────┐
│ (idx) │ balance │ utxos │
├───────┼─────────┼───────┤
│ Alice │       1 │     2 │
│ Bob   │    5049 │     1 │
│ Ron   │      10 │     1 │
└───────┴─────────┴───────┘
```
