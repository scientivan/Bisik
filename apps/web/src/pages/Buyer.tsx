import { useDataVersion } from "../lib/live";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  anchor,
  arciumAccounts,
  encryptForMxe,
  fetchMxeKey,
  queueAndWait,
  newViewKey,
  decryptSignals,
  PROGRAM_ID,
} from "@bisik/sdk";
import { PublicKey } from "@solana/web3.js";
import { fromHex, toHex, keccak, utf8 } from "@bisik/shared";
import { useWallet } from "../lib/wallet";
import { api, type Market, type Signals } from "../lib/api";
import {
  P,
  TOKEN_PROGRAM_ID,
  fetchMarketAccount,
  requireWallet,
  send,
  tokenAccount,
} from "../lib/chain";
import { amount, category, parseUsdc } from "../lib/amounts";
import { read, write } from "../lib/storage";
import { useMarket, useAction } from "../lib/hooks";
import {
  WalletActionButton,
  Feedback,
  Frame,
  Hatch,
  Icon,
  Note,
  PageTitle,
  Pill,
  Sonogram,
  StrengthBars,
  StatusStrip,
} from "../components/ui";
import { Steps } from "../components/roles";
import { IndicatorNote, SignalDetails } from "../components/SignalDetails";
const cluster = Number(import.meta.env.VITE_ARCIUM_CLUSTER_OFFSET || 456);
const mockMarket: Market = {
  id: 3,
  kind: 1,
  status: "Auction",
  category: 0,
  submitEnd: 0,
  auctionEnd: 0,
  outcomeEnd: 0,
  optionCount: 3,
  positions: 4,
  minStake: 10e6,
  maxStake: 500e6,
  minReasonLen: 200,
  reservePrice: 100e6,
  flatPrice: 90e6,
  preview: { backed: 3, strong: 2, medium: 0, weak: 1 },
  options: [0, 1, 2].map((index) => ({
    index,
    category: index + 1,
    optedIn: false,
  })),
};
const demoReasons = [
  "I mentored this team during the hackathon. They told me they will pick a chain within 14 days, and two ecosystems have already pitched them. Their lead engineer leaves his job next month to work on this full-time. None of this is public yet.",
  "In a judging session the founders said a rival ecosystem offered them a $150k grant last week, and they have not signed it. They need an audit and about $50k to reach mainnet next month. Whoever covers the audit first probably wins them.",
  "During office hours they showed me a private beta with about 3,000 weekly users, which they have not announced anywhere. In the final demo, though, judges found the live numbers ran on mocked data. Verify before you back them.",
];
const demoClaims = [
  "Will choose a chain within 14 days",
  "Holds an unsigned $150k grant offer from a rival ecosystem",
  "Private beta with about 3,000 weekly users",
];
const demoOpinions = [
  "The team will likely choose whichever chain helps them hire first",
  "The founders seem ready to switch for the right audit support",
  "The beta looks promising, but the team may be overstating traction",
];
/** Synthetic Veritas indicators, varied so the demo shows each label. */
const demoChecks: { D: number; A: number | null; flags: string[] }[] = [
  { D: 0.08, A: 0.12, flags: [] },
  { D: 0.12, A: 0.3, flags: [] },
  { D: 0.83, A: null, flags: ["likely_duplicate", "ai_unavailable"] },
];
export default function Buyer({ demo = false }: { demo?: boolean }) {
  const { id } = useParams(),
    live = useMarket(demo ? undefined : id),
    market = demo ? mockMarket : live.market,
    wallet = useWallet(),
    action = useAction();
  const dataVersion = useDataVersion();
  const [chain, setChain] = useState<any>(null),
    [bidAccount, setBidAccount] = useState<any>(null),
    [signals, setSignals] = useState<Signals | null>(null),
    [weights, setWeights] = useState<bigint[] | null>(null),
    [revealed, setRevealed] = useState(false),
    [ceiling, setCeiling] = useState("400"),
    [bid, setBid] = useState("300"),
    [selected, setSelected] = useState<number[]>([]),
    [grantOption, setGrantOption] = useState(0),
    [evidence, setEvidence] = useState(""),
    [nullifier, setNullifier] = useState(""),
    [claimId, setClaimId] = useState(""),
    [introId, setIntroId] = useState(""),
    [introResponse, setIntroResponse] = useState<any>(null),
    [introKey, setIntroKey] = useState("");
  async function refresh() {
    if (!demo && id) {
      await live.refresh();
      setChain(await fetchMarketAccount(Number(id)));
    }
  }
  useEffect(() => {
    if (demo || !id) return;
    let active = true;
    const load = () =>
      fetchMarketAccount(Number(id))
        .then((m) => {
          if (active) setChain(m);
        })
        .catch(() => {});
    void load();
    return () => {
      active = false;
    };
  }, [demo, id, dataVersion]);
  useEffect(() => {
    let active = true;
    setBidAccount(null);
    if (!demo && id && wallet.publicKey && wallet.program) {
      void wallet.program.account.bid
        .fetchNullable(P.bid(P.market(Number(id)), wallet.publicKey))
        .then((bid: any) => {
          if (active) setBidAccount(bid);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [demo, id, wallet.publicKey?.toBase58(), wallet.program, chain]);
  useEffect(() => {
    setSignals(null);
    setWeights(null);
    setRevealed(false);
    setIntroResponse(null);
  }, [wallet.publicKey?.toBase58(), id]);
  const address = wallet.publicKey?.toBase58(),
    bi =
      chain?.buyers
        .slice(0, chain.buyerCount)
        .findIndex((k: PublicKey) => k.toBase58() === address) ?? -1,
    rank =
      chain?.winners.findIndex((k: PublicKey) => k.toBase58() === address) ??
      -1;
  const canSelect = chain?.status === 3 && rank >= 0 && chain.nextRank === rank,
    hasAllocation = bi >= 0;
  const finalView =
    hasAllocation &&
    chain?.status >= 3 &&
    (chain.kind === 0 ||
      rank === 0 ||
      (rank === 1 && chain.nextRank >= 1) ||
      chain.nextRank >= 2);
  const markMask: number = demo ? 0 : Number(chain?.masks?.[bi] ?? 0),
    marked = (signals?.options ?? [])
      .map((o) => o.index)
      .filter((i) => bi >= 0 && markMask & (1 << i)),
    teamName = (i: number) =>
      signals?.options.find((o) => o.index === i)?.teamRef ?? `Option ${i + 1}`;
  async function token() {
    return wallet.token ?? (await wallet.login());
  }
  async function decrypt() {
    if (demo) {
      setSignals({
        buyerIndex: 0,
        visibleMask: 7,
        encryptedSignals: null,
        options: ["Team Lumen", "Team Nadi", "Team Arka"].map(
          (teamRef, index) => ({
            index,
            teamRef,
            score: [0.44, 0.38, 0.18][index],
            nScouts: [2, 1, 1][index],
            tierDist: [
              [0, 1, 1],
              [1, 0, 0],
              [1, 0, 0],
            ][index],
            claims: [
              {
                id: `demo-${index}`,
                text: demoClaims[index],
                kind: "verifiable",
              },
              {
                id: `demo-op-${index}`,
                text: demoOpinions[index],
                kind: "opinion",
              },
            ],
            reasons: [
              {
                filteredText: demoReasons[index],
                ...demoChecks[index],
              },
            ],
          }),
        ),
      });
      setRevealed(true);
      return "Synthetic view opened. No transaction was sent.";
    }
    const provider = requireWallet(wallet.provider);
    const auth = await token(),
      m = P.market(market!.id),
      key = await fetchMxeKey(provider),
      storageKey = `view:${market!.id}:${address}`;
    const old = read<{ secret: string; public: string } | null>(
      storageKey,
      null,
    );
    const view = old
      ? { secretKey: fromHex(old.secret), publicKey: fromHex(old.public) }
      : newViewKey();
    if (!old)
      write(storageKey, {
        secret: toHex(view.secretKey),
        public: toHex(view.publicKey),
      });
    let s = await api<Signals>(
      `/markets/${market!.id}/signals`,
      undefined,
      auth,
    );
    await queueAndWait(provider, PROGRAM_ID, (o) =>
      wallet.program.methods
        .revealSignals(o, Array.from(view.publicKey))
        .accountsPartial({
          payer: wallet.publicKey,
          market: m,
          agg: P.agg(m),
          signals: P.signals(m, wallet.publicKey!),
          ...arciumAccounts(PROGRAM_ID, cluster, o, "reveal_signals"),
        }),
    );
    s = await api<Signals>(`/markets/${market!.id}/signals`, undefined, auth);
    if (!s.encryptedSignals)
      throw Error(
        "MPC has not published your encrypted view yet. Try again shortly.",
      );
    const values = decryptSignals(s.encryptedSignals, view.secretKey, key);
    setWeights(values);
    setSignals(s);
    setGrantOption(s.options[0]?.index ?? 0);
    setRevealed(true);
    return "Your allocated weights were decrypted on this device. Reasons came from the operator API.";
  }
  if (!demo && live.loading)
    return (
      <Note title="Loading buyer market">
        Reading the market and its allocation rules.
      </Note>
    );
  if (!market || (!demo && live.error))
    return (
      <Note title="Market unavailable">
        {live.error}
        <Link to="/markets">Back to markets</Link>
      </Note>
    );
  const end =
    market.status === "Open"
      ? market.submitEnd
      : market.status === "Auction"
        ? market.auctionEnd
        : market.status === "OutcomeWindow"
          ? market.outcomeEnd
          : undefined;
  return (
    <>
      <PageTitle
        title={
          demo
            ? "Which DeFi teams are worth courting before they pick a chain?"
            : (market.question ?? `Market ${market.id}`)
        }
      >
        Market {market.id}. You are the buyer. Read the public spread, bid for
        exclusivity, then decrypt your own view of who scouts backed and why.
      </PageTitle>

      <Steps role="buyer" at={1} />
      {demo && (
        <Note title="Synthetic demo data">
          This is an interactive design walkthrough. Team names, reasons and
          weights are synthetic. Wallet transactions are disabled.
          <Link to="/markets">Open live markets</Link>
        </Note>
      )}
      <StatusStrip status={market.status} end={demo ? undefined : end} />
      <div className="columns">
        <div className="main-column stack">
          <Frame className="signals-frame">
            <div className="signals-heading">
              <div>
                <h3>Signals</h3>
                <p>
                  {revealed
                    ? "Weights decrypted with your key. Reasons served to your allocation."
                    : "Before you buy, only the market-wide histogram is public."}
                </p>
              </div>
              <WalletActionButton requiresWallet={!demo}
                className={`button ${revealed ? "outline" : ""}`}
                disabled={!!action.busy || (!demo && !finalView)}
                onClick={() =>
                  revealed
                    ? setRevealed(false)
                    : action.run("Decrypting your allocated view", decrypt)
                }
              >
                {revealed
                  ? "Seal again"
                  : finalView || demo
                    ? "Decrypt my view"
                    : hasAllocation
                      ? "After allocation"
                      : "After purchase"}
              </WalletActionButton>
            </div>
            {!revealed && (
              <Note title="Market-wide preview">
                {market.preview
                  ? `${market.preview.backed} options are backed. Near the top means at least half the stake of the leading option, middle 20 to 50 percent of it, trailing under 20 percent. Which team holds which share stays sealed.`
                  : "Available after submissions close and MPC finishes the preview."}
                {market.preview && (
                  <StrengthBars
                    strong={market.preview.strong}
                    medium={market.preview.medium}
                    weak={market.preview.weak}
                  />
                )}
              </Note>
            )}
            {(revealed ? signals?.options : market.options)?.map((o: any) => {
              const value = weights?.[o.index];
              return (
                <article className="signal-row" key={o.index}>
                  <div className="row between">
                    <h3>
                      {revealed
                        ? o.teamRef
                        : `Option ${o.index + 1}, ${category(o.category)}`}
                    </h3>
                    {revealed ? (
                      <Pill state="blue">
                        {value !== undefined
                          ? `${amount(value)} weighted USDC`
                          : `Synthetic weight ${o.score}`}
                      </Pill>
                    ) : (
                      <Pill state="sealed">Team sealed</Pill>
                    )}
                  </div>
                  {revealed ? (
                    <div className="revealed-content stack">
                      <div className="row">
                        <Pill state="yours">Yours</Pill>
                        <Pill>
                          {o.nScouts === 1
                            ? "1 staked position"
                            : `${o.nScouts} staked positions`}
                        </Pill>
                        <Pill>
                          {
                            o.claims.filter((c: any) => c.kind === "verifiable")
                              .length
                          }{" "}
                          checkable facts
                        </Pill>
                        {marked.includes(o.index) ? (
                          <Pill state="blue">Marked as valuable</Pill>
                        ) : null}
                      </div>
                      <SignalDetails option={o} showScore demo={demo} />
                      {o.summary && (
                        <div>
                          <strong>Reasons to investigate</strong>
                          <ul>
                            {o.summary.pros.map((p: string) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                          <strong>Open questions</strong>
                          <ul>
                            {o.summary.cons.map((p: string) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="row">
                      <Hatch seed={o.index + 3} reason="The scouts’ reasons for this option stay sealed until you win or buy access. Your allocation then lets you decrypt them with your own key." />
                      <Pill state="sealed">Sealed</Pill>
                    </div>
                  )}
                  {canSelect && (
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={selected.includes(o.index)}
                        disabled={
                          !selected.includes(o.index) &&
                          selected.length >= chain.x
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, o.index]
                              : selected.filter((n) => n !== o.index),
                          )
                        }
                      />
                      Hide this option from later buyers
                    </label>
                  )}
                </article>
              );
            })}
            {canSelect && (
              <div className="panel">
                <WalletActionButton requiresWallet={!demo}
                  className="button full"
                  disabled={!!action.busy}
                  onClick={() =>
                    action.run("Selecting exclusive options", async () => {
                      await wallet.program.methods
                        .selectHidden(selected)
                        .accounts({
                          buyer: wallet.publicKey,
                          market: P.market(market.id),
                        })
                        .rpc();
                      setSelected([]);
                      await refresh();
                      return "Selection confirmed. The next buyer may now select.";
                    })
                  }
                >
                  Confirm {selected.length} exclusive options
                </WalletActionButton>
              </div>
            )}
            {revealed && <IndicatorNote />}
            {demo && (
              <p className="fine demo-note">
                Demo data. Team names, weights and reasons are synthetic.
              </p>
            )}
          </Frame>
          <Feedback action={action} />
          {(demo || hasAllocation) && (
            <Frame>
              <div className="stack">
                <h3>Mark the most valuable signal</h3>
                <p>
                  Your payment goes to the scouts behind the options you mark.
                  Mark the team that actually delivered for you, for example
                  one that took your grant or deployed on your chain.
                </p>
                {demo && (
                  <p className="fine">
                    Demo walkthrough. Nothing is recorded and no transaction is
                    sent.
                  </p>
                )}
                <p className="fine">
                  {marked.length
                    ? `Marked so far ${marked.map((i) => teamName(i)).join(", ")}.`
                    : "You have not marked any option yet."}
                </p>
                <ol className="stack" style={{ gap: 14, paddingLeft: 18 }}>
                  <li>
                    <label className="field">
                      <span>Choose the option that was most valuable to you</span>
                      <select
                        value={grantOption}
                        onChange={(e) => setGrantOption(Number(e.target.value))}
                        disabled={!signals}
                      >
                        {!signals && <option>Decrypt your view first</option>}
                        {(signals?.options ?? []).map((o) => (
                          <option value={o.index} key={o.index}>
                            {o.teamRef}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                  <li>
                    <label className="field">
                      <span>Add evidence, such as a grant reference or link</span>
                      <textarea
                        rows={3}
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        placeholder="Grant reference or evidence URL"
                      />
                    </label>
                    <p className="fine" style={{ fontSize: 12 }}>
                      Only a hash of this text goes onchain. Keep the original,
                      since the operator may ask for it.
                    </p>
                  </li>
                  <li className="stack" style={{ gap: 8 }}>
                    <span>
                      Confirm the mark. Bisik records it onchain as a
                      separate outcome kind, "Buyer marked most valuable",
                      so it is never confused with a grant or a deploy.
                    </span>
                    <div className="row">
                      <WalletActionButton requiresWallet={!demo}
                        className="button"
                        disabled={
                          demo ||
                          !!action.busy ||
                          !revealed ||
                          market.status !== "OutcomeWindow" ||
                          !evidence.trim() ||
                          marked.includes(grantOption)
                        }
                        onClick={() =>
                          action.run(
                            "Marking this option as most valuable",
                            async () => {
                              const hash = keccak(utf8(evidence));
                              const ix = await wallet.program.methods
                                // Outcome kind 3 = buyer marked most valuable (N2).
                                .recordOutcome(bi, grantOption, 3, Array.from(hash))
                                .accounts({
                                  signer: wallet.publicKey,
                                  config: P.config(),
                                  market: P.market(market.id),
                                  outcome: P.outcome(
                                    P.market(market.id),
                                    bi,
                                    grantOption,
                                  ),
                                  buyerRecord: P.buyerRecord(wallet.publicKey!),
                                })
                                .instruction();
                              await send(wallet.provider, [ix]);
                              await refresh();
                              return `${teamName(grantOption)} is marked. Its scouts share your payment pool.`;
                            },
                          )
                        }
                      >
                        {marked.includes(grantOption)
                          ? "Already marked"
                          : "Mark as most valuable"}
                      </WalletActionButton>
                      <WalletActionButton requiresWallet={!demo}
                        className="button outline"
                        disabled={
                          demo ||
                          !!action.busy ||
                          !revealed ||
                          market.status !== "OutcomeWindow"
                        }
                        onClick={() =>
                          action.run("Checking a Solana deployment", async () => {
                            const r = await api(
                              "/outcomes/check",
                              {
                                marketId: market.id,
                                optionIndex: grantOption,
                                buyerIndex: bi,
                              },
                              await token(),
                            );
                            await refresh();
                            return r.found
                              ? "Deployment found. The operator marked this option for you."
                              : r.reason || "No matching deployment found.";
                          })
                        }
                      >
                        Check deployment instead
                      </WalletActionButton>
                    </div>
                    <p className="fine" style={{ fontSize: 12 }}>
                      If the team deployed on Solana, the operator can confirm it
                      and mark the option for you. You can mark more than one
                      option. The pool is then shared by stake weight across all
                      marked options. A mark cannot be removed.
                    </p>
                  </li>
                </ol>
                <Note title="If you mark nothing">
                  When the outcome window ends with no mark, the pool goes to
                  the strongest signal you bought, meaning the option in your
                  view with the most stake behind it. Your payment is not
                  refunded in either case.
                </Note>
                <h3>Dispute a verifiable claim</h3>
                <label className="field">
                  <span>Claim</span>
                  <select
                    value={claimId ? `${claimId}~${nullifier}` : ""}
                    onChange={(e) => {
                      const [claim, position] = e.target.value.split("~");
                      setClaimId(claim);
                      setNullifier(position ?? "");
                    }}
                  >
                    <option value="">Choose a claim</option>
                    {signals?.options
                      .flatMap((o) =>
                        o.claims.filter((c) => c.kind === "verifiable"),
                      )
                      .map((c) => (
                        <option
                          key={`${c.id}~${c.nullifier}`}
                          value={`${c.id}~${c.nullifier ?? ""}`}
                        >
                          {c.text}
                        </option>
                      ))}
                  </select>
                </label>
                <p className="fine">
                  The selected claim identifies the backed position. Evidence is
                  sent to the operator for review.
                </p>
                <WalletActionButton requiresWallet={!demo}
                  className="button outline"
                  disabled={
                    demo ||
                    !!action.busy ||
                    market.status !== "OutcomeWindow" ||
                    !claimId ||
                    !evidence.trim() ||
                    !/^0x[0-9a-fA-F]{64}$/.test(nullifier)
                  }
                  onClick={() =>
                    action.run("Submitting dispute evidence", async () => {
                      const r = await api(
                        "/disputes",
                        { marketId: market.id, nullifier, claimId, evidence },
                        await token(),
                      );
                      const n = fromHex(nullifier);
                      const ix = await wallet.program.methods
                        .openDispute(
                          Array.from(fromHex(r.claimHash)),
                          Array.from(fromHex(r.evidenceHash)),
                        )
                        .accounts({
                          buyer: wallet.publicKey,
                          market: P.market(market.id),
                          position: P.position(P.market(market.id), n),
                          dispute: P.dispute(P.market(market.id), n),
                          buyerRecord: P.buyerRecord(wallet.publicKey!),
                        })
                        .instruction();
                      await send(wallet.provider, [ix]);
                      return `Dispute ${r.disputeId} opened. The operator decides proven hoaxes; wrong calls alone are not slashed.`;
                    })
                  }
                >
                  Open hoax dispute
                </WalletActionButton>
              </div>
            </Frame>
          )}
          {!demo && rank >= 0 && hasAllocation && (
            <Frame>
              <div className="stack">
                <h3>Ask for an introduction</h3>
                <p>
                  The scout may choose to share their encrypted contact details
                  with you and ask the team’s consent for an introduction. The
                  team does not need a Bisik account.
                </p>
                <label className="field">
                  <span>Option in your view</span>
                  <select
                    value={grantOption}
                    onChange={(e) => setGrantOption(Number(e.target.value))}
                  >
                    {signals?.options.map((o) => (
                      <option value={o.index} key={o.index}>
                        {o.teamRef}
                      </option>
                    ))}
                  </select>
                </label>
                <WalletActionButton requiresWallet={!demo}
                  className="button outline"
                  disabled={!!action.busy || !revealed}
                  onClick={() =>
                    action.run("Requesting an introduction", async () => {
                      const view = newViewKey(),
                        r = await api(
                          "/intro",
                          {
                            marketId: market.id,
                            optionIndex: grantOption,
                            buyerX25519: toHex(view.publicKey),
                          },
                          await token(),
                        );
                      write(`intro:${r.requestId}`, toHex(view.secretKey));
                      setIntroId(r.requestId);
                      setIntroKey(toHex(view.secretKey));
                      return `Request ${r.requestId} sent. Keep the private key on this device.`;
                    })
                  }
                >
                  Request introduction
                </WalletActionButton>
                <label className="field">
                  <span>Introduction request ID</span>
                  <input
                    value={introId}
                    onChange={(e) => setIntroId(e.target.value)}
                  />
                </label>
                <WalletActionButton requiresWallet={!demo}
                  className="button outline"
                  disabled={!introId || !!action.busy}
                  onClick={() =>
                    action.run("Checking your introduction", async () => {
                      const r = await api(
                        `/intro/${introId}`,
                        undefined,
                        await token(),
                      );
                      setIntroResponse(r);
                      setIntroKey(read(`intro:${introId}`, ""));
                      return `Scout response is ${r.status.toLowerCase()}.`;
                    })
                  }
                >
                  Check scout response
                </WalletActionButton>
                {introResponse && (
                  <Note title={introResponse.status}>
                    {introResponse.contactCiphertext
                      ? "Encrypted contact received. Use your saved key to open it."
                      : "The scout has not shared contact details."}
                  </Note>
                )}
                {introKey && introResponse?.contactCiphertext && (
                  <button
                    className="button"
                    onClick={() =>
                      action.run("Opening encrypted contact", async () => {
                        const { openContact } = await import("../lib/contact");
                        return await openContact(
                          introResponse.contactCiphertext,
                          fromHex(introKey),
                        );
                      })
                    }
                  >
                    Decrypt contact
                  </button>
                )}
              </div>
            </Frame>
          )}
        </div>
        <aside className="side-column">
          <section className="blue-card">
            <h3>Bid for exclusivity</h3>
            <p>
              Winner one hides up to three signals from later buyers. Your bid
              is encrypted before it leaves this device.
            </p>
            <label className="field">
              <span>Ceiling deposit, public</span>
              <input
                value={ceiling}
                onChange={(e) => setCeiling(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="field">
              <span>Your bid, sealed</span>
              <input
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                type="password"
                inputMode="decimal"
              />
            </label>
            <WalletActionButton requiresWallet={!demo}
              className="button bone full"
              disabled={
                demo ||
                !!action.busy ||
                !wallet.publicKey ||
                market.status !== "Auction"
              }
              onClick={() =>
                action.run(
                  "Depositing the ceiling and sealing your bid",
                  async () => {
                    const provider = requireWallet(wallet.provider),
                      value = parseUsdc(bid),
                      cap = parseUsdc(ceiling);
                    if (value > cap)
                      throw Error(
                        "Your bid cannot exceed the ceiling deposit.",
                      );
                    if (value < BigInt(market.reservePrice))
                      throw Error("Your bid is below the reserve price.");
                    const m = P.market(market.id),
                      b = P.bid(m, wallet.publicKey!),
                      instructions: any[] = [];
                    const payerToken = await tokenAccount(
                      provider,
                      wallet.publicKey!,
                      instructions,
                    );
                    const existing: any =
                      await wallet.program.account.bid.fetchNullable(b);
                    if (existing?.placed)
                      throw Error("This wallet already placed a bid.");
                    if (existing && BigInt(existing.ceiling.toString()) !== cap)
                      throw Error(
                        `Use the existing ceiling deposit of ${amount(existing.ceiling)} USDC.`,
                      );
                    if (!existing) {
                      instructions.push(
                        await wallet.program.methods
                          .openBid(new anchor.BN(cap.toString()))
                          .accounts({
                            payer: wallet.publicKey,
                            config: P.config(),
                            buyerProfile: P.buyer(wallet.publicKey!),
                            market: m,
                            bid: b,
                            payerToken,
                            escrow: P.escrow(m),
                            tokenProgram: TOKEN_PROGRAM_ID,
                            buyerRecord: P.buyerRecord(wallet.publicKey!),
                          })
                          .instruction(),
                      );
                      await send(provider, instructions);
                    }
                    const key = await fetchMxeKey(provider),
                      enc = encryptForMxe(key, [value]);
                    await queueAndWait(provider, PROGRAM_ID, (o) =>
                      wallet.program.methods
                        .placeBid(
                          o,
                          Array.from(enc.pubkey),
                          enc.nonceBN,
                          Array.from(enc.ciphertexts[0]),
                        )
                        .accountsPartial({
                          payer: wallet.publicKey,
                          market: m,
                          auction: P.auction(m),
                          bid: b,
                          ...arciumAccounts(
                            PROGRAM_ID,
                            cluster,
                            o,
                            "place_bid",
                          ),
                        }),
                    );
                    await refresh();
                    return "Your sealed bid was accepted by MPC.";
                  },
                )
              }
            >
              Seal and submit bid
            </WalletActionButton>
            <p>
              Second price with a {amount(market.reservePrice)} USDC reserve.
              Anything above your final price comes back to you.
            </p>
          </section>
          <Frame>
            <div className="stack">
              <h3>Or skip the auction</h3>
              <p>
                Buy the remaining signals at a flat {amount(market.flatPrice)}{" "}
                USDC.
              </p>
              <WalletActionButton requiresWallet={!demo}
                className="button"
                disabled={
                  demo ||
                  !!action.busy ||
                  !wallet.publicKey ||
                  chain?.status !== 3 ||
                  chain?.nextRank !== 2 ||
                  hasAllocation
                }
                onClick={() =>
                  action.run("Buying the remaining signals", async () => {
                    const provider = requireWallet(wallet.provider),
                      ixs: any[] = [];
                    const payerToken = await tokenAccount(
                        provider,
                        wallet.publicKey!,
                        ixs,
                      ),
                      m = P.market(market.id);
                    ixs.push(
                      await wallet.program.methods
                        .buyFlat()
                        .accounts({
                          payer: wallet.publicKey,
                          config: P.config(),
                          buyerProfile: P.buyer(wallet.publicKey!),
                          market: m,
                          payerToken,
                          escrow: P.escrow(m),
                          tokenProgram: TOKEN_PROGRAM_ID,
                          bid: P.bid(m, wallet.publicKey!),
                          buyerRecord: P.buyerRecord(wallet.publicKey!),
                        })
                        .instruction(),
                    );
                    await send(provider, ixs);
                    await refresh();
                    return "Your flat-price allocation is confirmed.";
                  })
                }
              >
                {hasAllocation
                  ? "Already allocated"
                  : chain?.nextRank === 2
                    ? "Buy remaining signals"
                    : "After allocation"}
              </WalletActionButton>
            </div>
          </Frame>
          {!demo && wallet.publicKey && (
            <Frame>
              <div className="stack">
                <h3>Your allocation</h3>
                <p>
                  {hasAllocation
                    ? rank >= 0
                      ? `Exclusive buyer ${rank + 1}.`
                      : "Flat-price buyer."
                    : "No purchased allocation for this wallet."}
                </p>
                {rank >= 0 && chain.nextRank !== rank && (
                  <p className="fine">
                    {chain.nextRank < rank
                      ? "Wait for the earlier winner to select."
                      : "Your selection step has finished."}
                  </p>
                )}
                <WalletActionButton requiresWallet={!demo}
                  className="button outline"
                  disabled={
                    !!action.busy ||
                    !chain ||
                    chain.status < 3 ||
                    !bidAccount ||
                    bidAccount.refunded
                  }
                  onClick={() =>
                    action.run(
                      "Returning your unused ceiling deposit",
                      async () => {
                        const current =
                          await wallet.program.account.bid.fetchNullable(
                            P.bid(P.market(market.id), wallet.publicKey!),
                          );
                        if (!current)
                          throw Error("This wallet has no bid deposit.");
                        if (current.refunded) {
                          setBidAccount(current);
                          return "The unused ceiling was already returned by the keeper.";
                        }
                        const ixs: any[] = [],
                          buyerToken = await tokenAccount(
                            wallet.provider,
                            wallet.publicKey!,
                            ixs,
                          ),
                          m = P.market(market.id);
                        ixs.push(
                          await wallet.program.methods
                            .settleBid()
                            .accounts({
                              signer: wallet.publicKey,
                              market: m,
                              bid: P.bid(m, wallet.publicKey!),
                              buyerToken,
                              escrow: P.escrow(m),
                              tokenProgram: TOKEN_PROGRAM_ID,
                            })
                            .instruction(),
                        );
                        try {
                          await send(wallet.provider, ixs);
                        } catch (error) {
                          const current =
                            await wallet.program.account.bid.fetchNullable(
                              P.bid(m, wallet.publicKey!),
                            );
                          if (!current?.refunded) throw error;
                        }
                        await refresh();
                        return "The unused ceiling was returned. Winners can now read their allocation.";
                      },
                    )
                  }
                >
                  {bidAccount?.refunded
                    ? "Bid refund completed"
                    : "Claim bid refund"}
                </WalletActionButton>
              </div>
            </Frame>
          )}
          <Note title="How your view is protected">
            Weights are encrypted to your key by Arcium. The operator serves
            filtered reasons after checking your onchain allocation. Buyer
            verification is performed by the operator.
          </Note>
          <Link className="button outline" to={`/markets/${market.id}`}>
            Open scout view <Icon />
          </Link>
        </aside>
      </div>
    </>
  );
}
