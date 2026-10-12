import { useDataVersion } from "../lib/live";
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
import { amount, remaining } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Note, PageTitle, Pill, WalletActionButton } from "../components/ui";
import { Steps } from "../components/roles";
import { proving } from "./Stake";
/** A dispute on one of this device's positions. Onchain fields are null until the buyer opens it onchain. */
type OwnDispute = {
  id: string;
  record: PositionRecord;
  deadline: number | null;
  status: number | null;
  claimHash: string | null;
  evidenceHash: string | null;
};
type DisputeDetail = {
  claimText: string | null;
  evidence: string;
  response: string | null;
  matches: boolean | null;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "closes 19 Oct 14:00, in 6 days" in the viewer's local time. */
function deadlineText(deadline: number) {
  const d = new Date(deadline * 1000),
    when = `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return deadline > Date.now() / 1000
    ? `Response window closes ${when}, in ${remaining(deadline)}. The operator decides after that time.`
    : `Response window closed ${when}. The operator can decide at any time now.`;
}
function disputeStatus(status: number | null) {
  return status === null
    ? "Not opened onchain yet"
    : status === 0
      ? "Open"
      : status === 1
        ? "Hoax upheld"
        : "Dispute rejected";
}
export default function Positions() {
  const dataVersion = useDataVersion();
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
    [response, setResponse] = useState(""),
    [disputes, setDisputes] = useState<OwnDispute[]>([]),
    [details, setDetails] = useState<Record<string, DisputeDetail>>({}),
    [replies, setReplies] = useState<Record<string, string>>({});
  const key = (r: PositionRecord) => `${r.marketId}:${r.nullifier}`;
  /**
   * Finds disputes on positions saved on this device. The server returns every dispute ID and
   * disputed nullifier for a market (both public onchain); matching against local nullifiers
   * happens here, so the server never learns which positions belong to this scout.
   */
  async function loadDisputes() {
    const mine = new Map(records.map((r) => [`${r.marketId}:${r.nullifier.toLowerCase()}`, r]));
    const found: OwnDispute[] = [];
    for (const marketId of [...new Set(records.map((r) => r.marketId))]) {
      const list = await api<{ disputes: { id: string; nullifier: string }[] }>(`/disputes/open/${marketId}`);
      for (const item of list.disputes) {
        const record = mine.get(`${marketId}:${item.nullifier.toLowerCase()}`);
        if (!record) continue;
        const onchain = wallet.program
          ? await wallet.program.account.dispute
              .fetchNullable(P.dispute(P.market(marketId), fromHex(record.nullifier)))
              .catch(() => null)
          : null;
        found.push({
          id: item.id,
          record,
          deadline: onchain ? Number(onchain.deadline) : null,
          status: onchain ? Number(onchain.status) : null,
          claimHash: onchain ? toHex(Uint8Array.from(onchain.claimHash)) : null,
          evidenceHash: onchain ? toHex(Uint8Array.from(onchain.evidenceHash)) : null,
        });
      }
    }
    setDisputes(found);
  }
  useEffect(() => {
    void loadDisputes().catch(() => {});
  }, [wallet.program, records, dataVersion]);
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
  }, [wallet.program, records, dataVersion]);
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

      <Steps role="scout" at={2} />
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
              <WalletActionButton
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
              </WalletActionButton>
            </div>
          </Frame>
        </div>
        <div className="stack positions-list">
          {!scout && (
        <Note title="Restore your private identity">
          <Link to="/scout/onboard">Open scout onboarding</Link>
        </Note>
      )}
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
                    <WalletActionButton
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
                    </WalletActionButton>
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
                      Respond by dispute ID
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
          {records.length > 0 && (
            <Frame>
              <div className="stack">
                <h3>Disputes on your calls</h3>
                <p>
                  A buyer can flag a verifiable claim in your reason as a
                  possible hoax. Answer with your own evidence before the
                  window closes.
                </p>
                {!disputes.length && (
                  <p className="fine">
                    No disputes on the positions saved on this device.
                  </p>
                )}
                {disputes.map((dsp) => {
                  const detail = details[dsp.id];
                  return (
                    <div className="stack" key={dsp.id}>
                      <div className="row between">
                        <strong>
                          Market {dsp.record.marketId} · slot {dsp.record.slot}
                        </strong>
                        <Pill state={dsp.status === 0 ? "yours" : "public"}>
                          {disputeStatus(dsp.status)}
                        </Pill>
                      </div>
                      <p className="fine">
                        {dsp.deadline !== null
                          ? deadlineText(dsp.deadline)
                          : "The buyer filed evidence but has not opened the dispute onchain. No deadline runs yet."}
                      </p>
                      {!detail ? (
                        <button
                          className="button small outline"
                          disabled={!!action.busy || !scout}
                          onClick={() =>
                            action.run(
                              "Proving ownership to read this dispute",
                              async () => {
                                const v = await api(
                                  `/disputes/${dsp.id}/view`,
                                  await ownership(dsp.record, "dispute-view", {
                                    id: dsp.id,
                                  }),
                                );
                                const matches =
                                  dsp.claimHash && dsp.evidenceHash && v.claimText
                                    ? toHex(keccak(utf8(v.claimText))) === dsp.claimHash &&
                                      toHex(keccak(utf8(v.evidence))) === dsp.evidenceHash
                                    : null;
                                setDetails((cur) => ({
                                  ...cur,
                                  [dsp.id]: { ...v, matches },
                                }));
                                return "Dispute loaded. Only you, the buyer and the operator see this evidence.";
                              },
                            )
                          }
                        >
                          Show claim and evidence
                        </button>
                      ) : (
                        <>
                          <div className="list-row">
                            <span>Claim under dispute</span>
                          </div>
                          <p>{detail.claimText ?? "The claim text is no longer stored on the server."}</p>
                          <div className="list-row">
                            <span>Buyer evidence</span>
                          </div>
                          <p>{detail.evidence}</p>
                          <p className="fine">
                            {detail.matches === true
                              ? "Claim and evidence match the hashes recorded onchain."
                              : detail.matches === false
                                ? "This copy does not match the onchain dispute. It may be an earlier draft the buyer never opened."
                                : "No onchain record to compare yet."}
                          </p>
                          {detail.response && (
                            <p className="fine">
                              You already answered. A new answer replaces it.
                            </p>
                          )}
                          <label className="field">
                            <span>Your evidence response</span>
                            <textarea
                              rows={4}
                              value={replies[dsp.id] ?? ""}
                              onChange={(e) =>
                                setReplies({ ...replies, [dsp.id]: e.target.value })
                              }
                            />
                          </label>
                          <button
                            className="button small"
                            disabled={
                              !!action.busy ||
                              !(replies[dsp.id] ?? "").trim() ||
                              (dsp.status !== null && dsp.status !== 0)
                            }
                            onClick={() =>
                              action.run(
                                "Proving and submitting your response",
                                async () => {
                                  const text = replies[dsp.id];
                                  await api(`/disputes/${dsp.id}/respond`, {
                                    response: text,
                                    ...(await ownership(dsp.record, "dispute", {
                                      id: dsp.id,
                                      content: text,
                                    })),
                                  });
                                  setDetails((cur) => ({
                                    ...cur,
                                    [dsp.id]: { ...cur[dsp.id], response: text },
                                  }));
                                  return "Response submitted to the operator.";
                                },
                              )
                            }
                          >
                            Submit dispute response
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
                <p className="fine">
                  Only a proven hoax is penalized, and that stake goes to
                  charity. A call that turns out wrong is never slashed.
                </p>
              </div>
            </Frame>
          )}
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
                      <span>Your contact to share with this buyer</span>
                      <small>Ask the team’s consent before sharing their contact details or arranging an introduction.</small>
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
                  <small>
                    Disputes on this device’s positions are listed above. Use
                    this only for an ID you received directly.
                  </small>
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
