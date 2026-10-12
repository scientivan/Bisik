import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { keccak, toHex, utf8 } from "@bisik/shared";
import { useWallet } from "../lib/wallet";
import { api } from "../lib/api";
import { P, send } from "../lib/chain";
import { short } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { cachedApi, useDataVersion } from "../lib/live";
import type { Market } from "../lib/api";
import { Feedback, Frame, Pill, WalletActionButton } from "./ui";
import { InfoTip } from "./info-tip";

/**
 * The operator's v1 oracle duty made visible: every recorded outcome with its evidence hash and
 * signer, plus the open outcome windows the operator can check or sign. Trust assumption: the
 * operator is the only oracle besides the buyer (record_outcome accepts buyer or operator).
 */
const scan = new Connection(import.meta.env.VITE_SOLANA_SCAN_RPC_URL || "https://api.devnet.solana.com", "confirmed");
// Kind 1 also covers buyer marks recorded before the 13 Oct upgrade; new marks use kind 3 (N2).
const KIND = ["Deployment found", "Grant or buyer mark", "Default rule", "Buyer marked most valuable"];

interface Recorded { market: number; buyer: string; option: number; kind: number; evidence: string; by: string; at: number; onTime: boolean }
interface Pending { market: number; buyerIndex: number; buyer: string; option: number; deployWallet: string | null; recorded: boolean; outcomeEnd: number }

function visible(m: any, i: number): number {
  const all = m.optionCount >= 16 ? 0xffff : (1 << m.optionCount) - 1;
  const b = m.buyers[i].toBase58(), def = PublicKey.default.toBase58();
  const w0 = m.winners[0].toBase58(), w1 = m.winners[1].toBase58();
  if (m.kind === 0 || (b === w0 && b !== def)) return all;
  if (b === w1 && b !== def) return all & ~m.hidden[0];
  return all & ~(m.hidden[0] | m.hidden[1]);
}

export function OutcomeOracle({ operator, allowed }: { operator: string | null; allowed: boolean }) {
  const wallet = useWallet(), action = useAction(), version = useDataVersion();
  const [recorded, setRecorded] = useState<Recorded[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState("");
  const [manual, setManual] = useState<{ key: string; kind: number; evidence: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const sdk = await import("@bisik/sdk");
      const program: any = sdk.program(new sdk.anchor.AnchorProvider(scan, {} as any, { commitment: "confirmed" }));
      const { markets } = await cachedApi<{ markets: Market[] }>("/markets");
      const ends = new Map(markets.map((m) => [m.id, m.outcomeEnd]));
      const byKey = new Map(markets.map((m) => [P.market(m.id).toBase58(), m.id]));
      const rows = (await program.account.outcomeRecord.all()).map((r: any): Recorded => {
        const id = byKey.get(r.account.market.toBase58()) ?? -1;
        return {
          market: id,
          buyer: r.account.buyer.toBase58(),
          option: r.account.option,
          kind: r.account.kind,
          evidence: toHex(Uint8Array.from(r.account.evidenceHash)),
          by: r.account.recordedBy.toBase58(),
          at: Number(r.account.at),
          onTime: Number(r.account.at) <= (ends.get(id) ?? Infinity),
        };
      }).sort((a: Recorded, b: Recorded) => b.at - a.at);
      const open: Pending[] = [];
      for (const m of markets.filter((x) => x.status === "OutcomeWindow")) {
        const acct: any = await program.account.market.fetch(P.market(m.id));
        const options: any[] = await Promise.all(Array.from({ length: acct.optionCount }, (_, i) => program.account.optionEntry.fetchNullable(P.option(P.market(m.id), i))));
        for (let bi = 0; bi < acct.buyerCount; bi++) {
          const mask = visible(acct, bi);
          for (let o = 0; o < acct.optionCount; o++) {
            if (!(mask & (1 << o))) continue;
            const opt = options[o];
            open.push({
              market: m.id, buyerIndex: bi, buyer: acct.buyers[bi].toBase58(), option: o,
              deployWallet: opt?.optedIn ? opt.deployWallet.toBase58() : null,
              recorded: !!(Number(acct.masks[bi]) & (1 << o)), outcomeEnd: m.outcomeEnd,
            });
          }
        }
      }
      if (live) { setRecorded(rows); setPending(open); setError(""); }
    })().catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [version]);

  const auth = async () => wallet.token ?? wallet.login();
  const byOperator = (r: Recorded) => r.by === operator;
  const opCount = recorded?.filter(byOperator).length ?? 0;

  return (
    <Frame>
      <div className="stack">
        <div className="record-head">
          <h3 id="oracle">Outcome oracle</h3>
          <InfoTip title="Who can record an outcome" align="start">
            The program accepts an outcome only from the buyer who bought the signal or from this operator wallet. In v1 the operator is the only independent oracle. Every record keeps its signer and an evidence hash onchain, so anyone can audit it.
          </InfoTip>
        </div>
        <p className="fine">The operator checks deployments on Solana and signs the outcome. Buyers can also record their own grant outcome.</p>

        {error && <div className="note-card"><p><strong>Could not read outcomes.</strong> {error}</p></div>}

        <div className="oracle-stats">
          <div><strong>{recorded?.length ?? "…"}</strong><span>Outcomes recorded</span></div>
          <div><strong>{recorded ? opCount : "…"}</strong><span>Signed by the operator</span></div>
          <div><strong>{recorded ? recorded.length - opCount : "…"}</strong><span>Signed by buyers</span></div>
          <div><strong>{pending.filter((p) => !p.recorded).length}</strong><span>Waiting in open windows</span></div>
        </div>

        <h4>Open outcome windows</h4>
        {pending.length === 0 ? (
          <p className="fine">No market is in its outcome window right now. Markets enter it after the auction and allocation.</p>
        ) : (
          <div className="oracle-list">
            {pending.map((p) => {
              const key = `${p.market}:${p.buyerIndex}:${p.option}`;
              const editing = manual?.key === key;
              return (
                <div className="oracle-row" key={key}>
                  <div className="oracle-main">
                    <strong>Market #{p.market} · option {p.option + 1}</strong>
                    <span className="fine">
                      Buyer {short(p.buyer)} · {p.deployWallet ? <>deploy wallet {short(p.deployWallet)}</> : "no deploy wallet registered"} · window closes {new Date(p.outcomeEnd * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {p.recorded ? <Pill state="yours">Recorded</Pill> : (
                    <div className="oracle-actions">
                      <WalletActionButton
                        className="button small outline"
                        disabled={!allowed || !p.deployWallet || !!action.busy}
                        title={p.deployWallet ? "Search the deploy wallet's transactions for a program deployment" : "The team has not registered a deploy wallet"}
                        onClick={() => action.run("Checking deployments on Solana", async () => {
                          const r = await api("/outcomes/check", { marketId: p.market, optionIndex: p.option, buyerIndex: p.buyerIndex }, await auth());
                          return r.found ? `Deployment found in ${short(r.txSig)}. Outcome signed by the operator.` : r.reason ? `Nothing recorded. The ${r.reason}.` : "No deployment found in this window yet. Nothing was recorded.";
                        })}
                      >
                        Check deployment
                      </WalletActionButton>
                      <button className="button small outline" disabled={!allowed} onClick={() => setManual(editing ? null : { key, kind: 0, evidence: "" })}>
                        {editing ? "Cancel" : "Sign with evidence"}
                      </button>
                    </div>
                  )}
                  {editing && manual && (
                    <div className="oracle-manual">
                      <label className="field">
                        <span>What happened</span>
                        <select value={manual.kind} onChange={(e) => setManual({ ...manual, kind: Number(e.target.value) })}>
                          <option value={0}>The team deployed on Solana</option>
                          <option value={1}>The team received a grant or investment</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Evidence</span>
                        <textarea rows={2} value={manual.evidence} onChange={(e) => setManual({ ...manual, evidence: e.target.value })} placeholder="Transaction signature, explorer link or attestation URL" />
                        <small>Only its hash goes onchain. Keep the original so anyone can check it later.</small>
                      </label>
                      <WalletActionButton
                        className="button small"
                        disabled={!allowed || !manual.evidence.trim() || !!action.busy}
                        onClick={() => action.run("Signing the outcome as operator", async () => {
                          const hash = keccak(utf8(manual.evidence.trim()));
                          const ix = await wallet.program.methods
                            .recordOutcome(p.buyerIndex, p.option, manual.kind, Array.from(hash))
                            .accounts({ signer: wallet.publicKey, config: P.config(), market: P.market(p.market), outcome: P.outcome(P.market(p.market), p.buyerIndex, p.option), buyerRecord: P.buyerRecord(new PublicKey(p.buyer)) })
                            .instruction();
                          await send(wallet.provider, [ix]);
                          setManual(null);
                          return `Outcome signed for market #${p.market}, option ${p.option + 1}. Evidence hash ${toHex(hash).slice(0, 10)}…`;
                        })}
                      >
                        Sign outcome
                      </WalletActionButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <h4>Recorded outcomes</h4>
        {!recorded ? <p className="fine">Reading outcome records from Solana devnet.</p> : recorded.length === 0 ? (
          <p className="fine">No outcome has been recorded yet.</p>
        ) : (
          <div className="oracle-list">
            {recorded.map((r) => (
              <div className="oracle-row" key={`${r.market}:${r.buyer}:${r.option}`}>
                <div className="oracle-main">
                  <strong>Market #{r.market < 0 ? "?" : r.market} · option {r.option + 1} · {KIND[r.kind] ?? `kind ${r.kind}`}</strong>
                  <span className="fine">
                    For buyer {short(r.buyer)} · {new Date(r.at * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · evidence <code>{r.evidence.slice(0, 12)}…</code>
                  </span>
                </div>
                <div className="oracle-actions">
                  <Pill state={byOperator(r) ? "sealed" : "public"}>{byOperator(r) ? "Signed by operator" : r.by === r.buyer ? "Signed by buyer" : `Signed by ${short(r.by)}`}</Pill>
                  {!r.onTime && <Pill>Late</Pill>}
                </div>
              </div>
            ))}
          </div>
        )}
        <Feedback action={action} />
      </div>
    </Frame>
  );
}
