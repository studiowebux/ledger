CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS utxos (
    id TEXT PRIMARY KEY,
    assets JSONB NOT NULL,
    owner TEXT NOT NULL,
    spent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    filed BOOLEAN DEFAULT FALSE,
    failed BOOLEAN DEFAULT FALSE,
    reason TEXT,
    assets JSONB,
    type VARCHAR(255), -- contract or exchange
    owner TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS policies (
    unit TEXT PRIMARY KEY,
    immutable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    inputs JSONB,
    outputs JSONB,
    owner TEXT NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);
