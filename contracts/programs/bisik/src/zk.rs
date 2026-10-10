//! Semaphore v4 proof verification (Groth16 on BN254 via `groth16-solana`).
//!
//! Public inputs, in order: [merkle_root, nullifier, field_hash(message), field_hash(scope)],
//! where field_hash(x) = keccak256(x as 32-byte big-endian) >> 8. This must match
//! `@semaphore-protocol/proof` and `@bisik/shared` exactly.

use crate::vk::VERIFYING_KEY;
use groth16_solana::groth16::Groth16Verifier;
use solana_keccak_hasher::hashv;

pub fn keccak(parts: &[&[u8]]) -> [u8; 32] {
    hashv(parts).to_bytes()
}

/// keccak256(x) >> 8, big-endian.
pub fn field_hash(x: &[u8; 32]) -> [u8; 32] {
    let h = keccak(&[x]);
    let mut out = [0u8; 32];
    out[1..].copy_from_slice(&h[..31]);
    out
}

/// scope = (market_id << 8) | slot, as a 32-byte big-endian integer.
pub fn scope_bytes(market_id: u64, slot: u8) -> [u8; 32] {
    let v: u128 = ((market_id as u128) << 8) | slot as u128;
    let mut out = [0u8; 32];
    out[16..].copy_from_slice(&v.to_be_bytes());
    out
}

pub fn enc_option_hash(pubkey: &[u8; 32], nonce: u128, ct: &[u8; 32]) -> [u8; 32] {
    keccak(&[pubkey, &nonce.to_le_bytes(), ct])
}

pub fn credit_hash(ct: &[u8; 32], nonce: u128) -> [u8; 32] {
    keccak(&[ct, &nonce.to_le_bytes()])
}

/// message = keccak(market_id u64 BE ‖ slot ‖ amount u64 BE ‖ enc_option_hash ‖ reason_hash ‖ credit_hash)
pub fn stake_message(market_id: u64, slot: u8, amount: u64, enc_option_hash: &[u8; 32], reason_hash: &[u8; 32], credit_hash: &[u8; 32]) -> [u8; 32] {
    keccak(&[&market_id.to_be_bytes(), &[slot], &amount.to_be_bytes(), enc_option_hash, reason_hash, credit_hash])
}

/// message = keccak("bisik-claim" ‖ recipient)
pub fn claim_message(recipient: &anchor_lang::prelude::Pubkey) -> [u8; 32] {
    keccak(&[b"bisik-claim", recipient.as_ref()])
}

/// proof = proof_a (already negated) ‖ proof_b ‖ proof_c.
pub fn verify(proof: &[u8; 256], root: &[u8; 32], nullifier: &[u8; 32], message: &[u8; 32], scope: &[u8; 32]) -> bool {
    let a: [u8; 64] = proof[..64].try_into().unwrap();
    let b: [u8; 128] = proof[64..192].try_into().unwrap();
    let c: [u8; 64] = proof[192..].try_into().unwrap();
    let inputs = [*root, *nullifier, field_hash(message), field_hash(scope)];
    match Groth16Verifier::new(&a, &b, &c, &inputs, &VERIFYING_KEY) {
        Ok(mut v) => v.verify().is_ok(),
        Err(_) => false,
    }
}
