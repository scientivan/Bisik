import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type DB = DatabaseSync;

export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, identity_commitment TEXT NOT NULL, status TEXT NOT NULL,
      tier INTEGER, epoch INTEGER, leaf_index INTEGER, error TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS source_nullifiers (hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS group_leaves (
      tier INTEGER NOT NULL, epoch INTEGER NOT NULL, idx INTEGER NOT NULL, commitment TEXT NOT NULL,
      PRIMARY KEY (tier, epoch, idx), UNIQUE (tier, epoch, commitment)
    );
    CREATE TABLE IF NOT EXISTS team_refs (
      market_id INTEGER NOT NULL, commitment TEXT NOT NULL, category INTEGER NOT NULL, ciphertext TEXT NOT NULL,
      PRIMARY KEY (market_id, commitment)
    );
    CREATE TABLE IF NOT EXISTS reasons (
      id TEXT PRIMARY KEY, market_id INTEGER NOT NULL, option_index INTEGER NOT NULL, reason_hash TEXT NOT NULL,
      ciphertext TEXT NOT NULL, filtered_text TEXT NOT NULL, d REAL NOT NULL, a REAL, drs REAL NOT NULL,
      flags TEXT NOT NULL, claims TEXT NOT NULL, embedding TEXT, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reasons_by_hash ON reasons (market_id, reason_hash);
    CREATE TABLE IF NOT EXISTS summaries (market_id INTEGER NOT NULL, option_index INTEGER NOT NULL, json TEXT NOT NULL,
      PRIMARY KEY (market_id, option_index));
    CREATE TABLE IF NOT EXISTS market_questions (market_id INTEGER PRIMARY KEY, question TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, pubkey TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS intros (
      id TEXT PRIMARY KEY, market_id INTEGER NOT NULL, option_index INTEGER NOT NULL, buyer TEXT NOT NULL,
      buyer_x25519 TEXT NOT NULL, status TEXT NOT NULL, contact_ciphertext TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY, market_id INTEGER NOT NULL, nullifier TEXT NOT NULL, buyer TEXT NOT NULL, claim_id TEXT NOT NULL,
      evidence TEXT NOT NULL, response TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);
  return db;
}
