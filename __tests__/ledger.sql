CREATE TABLE IF NOT EXISTS utxos (
    id VARCHAR(255) PRIMARY KEY,
    assets BYTEA NOT NULL,
    owner VARCHAR(255) NOT NULL,
    spent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(255) PRIMARY KEY,
    filed BOOLEAN DEFAULT FALSE,
    failed BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255),
    assets BYTEA,
    type VARCHAR(255),
    owner VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(255) PRIMARY KEY,
    immutable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

CREATE TABLE IF NOT EXISTS contracts (
    id VARCHAR(255) PRIMARY KEY,
    inputs BYTEA,
    outputs BYTEA,
    owner VARCHAR(255) NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

select
    count(*)
from
    transactions
where
    filed = true;

select
    count(*)
from
    transactions
where
    failed = true;
