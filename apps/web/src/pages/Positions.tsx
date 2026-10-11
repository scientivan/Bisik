import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { computeBudget } from "@bisik/sdk";
import { fromHex, toHex, be32, keccak, utf8 } from "@bisik/shared";
import { useWallet } from "../lib/wallet";
import { api } from "../lib/api";
import { P, TOKEN_PROGRAM_ID, tokenAccount, send } from "../lib/chain";
import {
  read,
  rememberPosition,
  download,
  type Scout,
  type PositionRecord,
} from "../lib/storage";
import { amount } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Note, PageTitle, Pill } from "../components/ui";
import { proving } from "./Stake";
export default function Positions() {
  const wallet = useWallet(),
    action = useAction();
  const scout = read<Scout | null>("scout", null);
  const [records, setRecords] = useState(() =>
      read<PositionRecord[]>("positions", []),
    ),
    [states, setStates] = useState<Record<string, any>>({}),
    [recipient, setRecipient] = useState(""),
    [recoverMarket, setRecoverMarket] = useState(""),
    [intros, setIntros] = useState<any[]>([]),
    [picked, setPicked] = useState<PositionRecord | null>(null),
    [contacts, setContacts] = useState<Record<string, string>>({}),
    [disputeId, setDisputeId] = useState(""),
    [response, setResponse] = useState("");
  const key = (r: PositionRecord) => `${r.marketId}:${r.nullifier}`;
  async function load() {
    if (!wallet.program) return;
    const next: Record<string, any> = {};
    for (const r of records) {
      next[key(r)] = await wallet.program.account.position.fetchNullable(
        P.position(P.market(r.marketId), fromHex(r.nullifier)),
      );
    }
    setStates(next);
  }
  useEffect(() => {
    void load().catch(() => {});
    const t = setInterval(() => void load().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [wallet.program, records]);
  async function groupFor(r: PositionRecord) {
    const zk = await proving();
    if (r.leaves) return zk.buildGroup(r.leaves);
    const g = await api(`/groups/${r.tier}/${r.epoch}`);
    for (let n = g.leaves.length; n > 0; n--) {
      const candidate = zk.buildGroup(g.leaves.slice(0, n));
      if (toHex(be32(candidate.root)) === r.root) return candidate;
    }
    throw Error(
      "The original group root could not be rebuilt. Restore the backup made when you staked.",
    );
  }
  async function ownership(
    r: PositionRecord,
    actionName: string,
    payload: any,
  ) {
    if (!scout) throw Error("Restore your scout identity first.");
    const zk = await proving();
    const bound = keccak(
      utf8(
        JSON.stringify({
          action: actionName,
          id: payload.id,
          accept: payload.accept ?? null,
          content: payload.content ?? null,
        }),
      ),
    );
    const { semaphore } = await zk.proveClaim({
      identity: zk.importIdentity(scout.secret),
      group: await groupFor(r),
      marketId: BigInt(r.marketId),
      slot: r.slot,
      recipient: bound,
    });
    return {
      proof: semaphore,
      marketId: r.marketId,
      nullifier: r.nullifier,
      slot: r.slot,
    };
  }
  return (
    <>
      <PageTitle title="Your calls, your claims.">
        Position records stay on this device. Claim to an address you choose
        after settlement.
      </PageTitle>
      {!scout && (
        <Note title="Restore your private identity">
          <Link to="/scout/onboard">Open scout onboarding</Link>
        </Note>
      )}
      <div className="positions-layout">
        <div className="stack">
          <Frame>
            <div className="stack">
              <h3>Claim destination</h3>
              <label className="field">
                <span>Recipient Solana address</span>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="A fresh address you control"
                />
              </label>
              <p className="fine">
                The connected wallet pays transaction fees. Mock USDC is sent to
                the recipient’s token account.
              </p>
              <button
                className="button outline"
                onClick={() =>
                  download("bisik-scout-backup.json", {
                    version: 1,
                    scout,
                    positions: records,
                  })
                }
                disabled={!scout}
              >
                Export identity and positions
              </button>
            </div>
          </Frame>
          <Frame>
            <div className="stack">
              <h3>Recover a market’s positions</h3>
              <p>
                Uses your identity to match the three slot nullifiers against
                onchain positions. Team picks cannot be recovered from public
                ciphertext.
              </p>
              <label className="field">
                <span>Market ID</span>
                <input
                  inputMode="numeric"
                  value={recoverMarket}
                  onChange={(e) => setRecoverMarket(e.target.value)}
                />
              </label>
              <button
                className="button outline"
                disabled={
                  !scout ||
                  !wallet.program ||
                  !!action.busy ||
                  !/^\d+$/.test(recoverMarket)
                }
                onClick={() =>
                  action.run("Recovering your positions", async () => {
                    const id = Number(recoverMarket),
                      zk = await proving(),
                      identity = zk.importIdentity(scout!.secret),
                      all = await wallet.program.account.position.all([
                        {
                          memcmp: { offset: 8, bytes: P.market(id).toBase58() },
                        },
                      ]);
                    let found = 0;
                    for (const entry of all) {
                      const p = entry.account;
                      const leaves = (await api(`/groups/${p.tier}/${p.epoch}`))
                        .leaves;
                      const r: PositionRecord = {
                        marketId: id,
                        slot: p.slot,
                        tier: p.tier,
                        epoch: p.epoch,
                        nullifier: toHex(Uint8Array.from(p.nullifier)),
                        root: toHex(Uint8Array.from(p.root)),
                        optionIndex: -1,
                      };
                      const group = await groupFor(r);
                      const proof = await zk.proveClaim({
                        identity,
                        group,
                        marketId: BigInt(id),
                        slot: p.slot,
                        recipient: wallet.publicKey!.toBytes(),
                      });
                      if (toHex(proof.solana.nullifier) === r.nullifier) {
                        rememberPosition({
                          ...r,
                          leaves: leaves.slice(0, group.size),
                        });
                        found++;
                      }
                    }
                    setRecords(read("positions", []));
                    return `${found} positions recovered.`;
                  })
                }
              >
                Recover positions
              </button>
            </div>
          </Frame>
        </div>
        <div className="stack positions-list">
          {!records.length && (
            <Note title="No positions saved on this device">
              Stake in an open market or recover positions using your identity
              and a market ID.
            </Note>
          )}
          {records.map((r) => {
            const state = states[key(r)];
            return (
              <Frame key={key(r)}>
                <div className="stack">
                  <div className="row between">
                    <h3>
                      Market {r.marketId} · slot {r.slot}
                    </h3>
                    <Pill state={state?.claimed ? "public" : "sealed"}>
                      {!state
                        ? "Not found or not loaded"
                        : state.claimed
                          ? "Claimed"
                          : state.slashed
                            ? "Hoax upheld"
                            : state.settled
                              ? "Ready to claim"
                              : "Awaiting settlement"}
                    </Pill>
                  </div>
                  <div className="list-row">
                    <span>Stake</span>
                    <strong>
                      {state ? `${amount(state.amount)} USDC` : "Not loaded yet"}
                    </strong>
                  </div>
                  <div className="list-row">
                    <span>Reward</span>
                    <strong>
                      {state?.settled
                        ? `${amount(state.payout)} USDC`
                        : "After settlement"}
                    </strong>
                  </div>
                  <div className="row">
                    <Link
                      className="button small outline"
                      to={`/markets/${r.marketId}`}
                    >
                      Open market
                    </Link>
                    <button
                      className="button small"
                      disabled={
                        !!action.busy ||
                        !wallet.provider ||
                        !scout ||
                        !state?.settled ||
                        state?.claimed ||
                        state?.slashed ||
                        !recipient.trim()
                      }
                      onClick={() =>
                        action.run(
                          "Proving ownership and claiming mock USDC",
                          async () => {
                            const owner = new PublicKey(recipient),
                              zk = await proving(),
                              { solana } = await zk.proveClaim({
                                identity: zk.importIdentity(scout!.secret),
                                group: await groupFor(r),
                                marketId: BigInt(r.marketId),
                                slot: r.slot,
                                recipient: owner.toBytes(),
                              });
                            if (
                              toHex(solana.nullifier) !== r.nullifier ||
                              toHex(solana.root) !== r.root
                            )
                              throw Error(
                                "This proof does not match the stored position.",
                              );
                            const ixs = [computeBudget()],
                              recipientToken = await tokenAccount(
                                wallet.provider,
                                owner,
                                ixs,
                              ),
                              m = P.market(r.marketId);
                            ixs.push(
                              await wallet.program.methods
                                .claim(
                                  Array.from(solana.proof),
                                  Array.from(solana.root),
                                )
                                .accounts({
                                  payer: wallet.publicKey,
                                  market: m,
                                  position: P.position(m, solana.nullifier),
                                  recipientToken,
                                  escrow: P.escrow(m),
                                  tokenProgram: TOKEN_PROGRAM_ID,
                                })
                                .instruction(),
                            );
                            const sig = await send(wallet.provider, ixs);
                            await load();
                            return `Claim confirmed. Transaction ${sig}`;
                          },
                        )
                      }
                    >
                      Claim stake and reward
                    </button>
                    <button
                      className="button small outline"
                      disabled={!!action.busy || r.optionIndex < 0}
                      title={
                        r.optionIndex < 0
                          ? "This position was recovered from the chain. Its team pick is encrypted, so introductions can only be checked on the device that staked it."
                          : undefined
                      }
                      onClick={() =>
                        action.run(
                          "Checking introduction requests",
                          async () => {
                            setPicked(r);
                            setIntros(
                              await api(
                                `/intro/open/${r.marketId}/${r.optionIndex}`,
                              ),
                            );
                            return "Introduction requests loaded.";
                          },
                        )
                      }
                    >
                      Check introductions
                    </button>
                    <button
                      className="button small outline"
                      onClick={() => {
                        // Intro requests belong to the previously picked position; never carry them over.
                        setIntros([]);
                        setPicked(r);
                      }}
                    >
                      Respond to a dispute
                    </button>
                  </div>
                  <p className="fine details">Nullifier {r.nullifier}</p>
                </div>
              </Frame>
            );
          })}
          <Feedback action={action} />
        </div>
        <aside className="stack">
          <Note dark title="Your identity unlocks the claim">
            Keep your private backup. A recipient address is public, and funding
            relationships may still be traceable.
          </Note>
          {picked && (
            <Frame>
              <div className="stack">
                <h3>Scout response</h3>
                <p>
                  Market {picked.marketId}, slot {picked.slot}. A fresh
                  ownership proof binds your answer to this position.
                </p>
                {intros.map((i) => (
                  <div className="stack" key={i.id}>
                    <Pill>{i.status}</Pill>
                    <p className="details">Request {i.id}</p>
                    <label className="field">
                      <span>Contact to share with this buyer</span>
                      <textarea
                        rows={3}
                        value={contacts[i.id] ?? ""}
                        onChange={(e) =>
                          setContacts({ ...contacts, [i.id]: e.target.value })
                        }
                      />
                    </label>
                    <div className="row">
                      <button
                        className="button small"
                        disabled={!!action.busy || !(contacts[i.id] ?? "").trim()}
                        onClick={() =>
                          action.run(
                            "Encrypting your introduction response",
                            async () => {
                              const { sealContact } =
                                  await import("../lib/contact"),
                                cipher = await sealContact(
                                  contacts[i.id],
                                  i.buyer_x25519,
                                );
                              const proof = await ownership(picked, "intro", {
                                id: i.id,
                                accept: true,
                                content: cipher,
                              });
                              await api(`/intro/${i.id}/respond`, {
                                accept: true,
                                contactCiphertext: cipher,
                                ...proof,
                              });
                              return "Encrypted contact shared only with this buyer.";
                            },
                          )
                        }
                      >
                        Accept and share
                      </button>
                      <button
                        className="button small outline"
                        disabled={!!action.busy}
                        onClick={() =>
                          action.run("Declining introduction", async () => {
                            await api(`/intro/${i.id}/respond`, {
                              accept: false,
                              ...(await ownership(picked, "intro", {
                                id: i.id,
                                accept: false,
                              })),
                            });
                            return "Introduction declined.";
                          })
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                <label className="field">
                  <span>Dispute ID</span>
                  <input
                    value={disputeId}
                    onChange={(e) => setDisputeId(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Your evidence response</span>
                  <textarea
                    rows={4}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                  />
                </label>
                <button
                  className="button outline"
                  disabled={!!action.busy || !disputeId || !response.trim()}
                  onClick={() =>
                    action.run(
                      "Proving and submitting your response",
                      async () => {
                        await api(`/disputes/${disputeId}/respond`, {
                          response,
                          ...(await ownership(picked, "dispute", {
                            id: disputeId,
                            content: response,
                          })),
                        });
                        return "Response submitted to the operator.";
                      },
                    )
                  }
                >
                  Submit dispute response
                </button>
              </div>
            </Frame>
          )}
        </aside>
      </div>
    </>
  );
}
