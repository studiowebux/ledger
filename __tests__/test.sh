#!/bin/bash

deno run -A __tests__/clean.ts
deno run -A __tests__/setup.ts
deno run -A __tests__/policy.ts

deno test -A __tests__/burn.test.ts
deno test -A __tests__/contract.test.ts

deno run -A __tests__/producer.test.ts &
deno run -A __tests__/consumer.test.ts
