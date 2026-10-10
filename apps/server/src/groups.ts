/** Anonymous tier groups (D-17): leaves are public identity commitments; roots go onchain. */
import { buildGroup } from "@bisik/zk";
import { be32 } from "@bisik/shared";
import type { DB } from "./db.js";
import type { Chain } from "./chain.js";

export function leaves(db: DB, tier: number, epoch: number): string[] {
  return (db.prepare("SELECT commitment FROM group_leaves WHERE tier=? AND epoch=? ORDER BY idx").all(tier, epoch) as any[]).map((r) => r.commitment);
}

export function rootOf(ls: string[]): { root: bigint; size: number } {
  if (ls.length === 0) return { root: 0n, size: 0 };
  const g = buildGroup(ls);
  return { root: g.root, size: g.size };
}

/** Add a commitment (idempotent) and publish the new root. Returns the leaf index. */
export async function addMember(db: DB, chain: Chain | null, tier: number, epoch: number, commitment: string): Promise<number> {
  const existing = db.prepare("SELECT idx FROM group_leaves WHERE tier=? AND epoch=? AND commitment=?").get(tier, epoch, commitment) as any;
  if (existing) return existing.idx;
  const idx = leaves(db, tier, epoch).length;
  db.prepare("INSERT INTO group_leaves (tier, epoch, idx, commitment) VALUES (?,?,?,?)").run(tier, epoch, idx, commitment);
  const { root, size } = rootOf(leaves(db, tier, epoch));
  if (chain) await chain.publishGroupRoot(tier, epoch, be32(root), size);
  return idx;
}
