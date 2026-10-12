import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { anchor, queueAndWait, arciumAccounts, PROGRAM_ID } from "@bisik/sdk";
import { keccak, utf8 } from "@bisik/shared";
import { useWallet } from "../lib/wallet";
import { api } from "../lib/api";
import {
  P,
  TOKEN_PROGRAM_ID,
  tokenAccount,
  send,
  requireWallet,
} from "../lib/chain";
import { category as categoryName, parseUsdc } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Note, PageTitle, Pill, WalletActionButton } from "../components/ui";
// Durations are entered in human units and sent to the program in seconds.
const UNITS = [
  { label: "minutes", seconds: 60 },
  { label: "hours", seconds: 3600 },
  { label: "days", seconds: 86400 },
] as const;
type Window = { value: string; unit: number };
type WindowKey = "submit" | "auction" | "selection" | "outcome" | "dispute";
const WINDOWS: { key: WindowKey; label: string; help: string }[] = [
  { key: "submit", label: "Scouting window", help: "How long scouts can back teams. At least 1 day outside demo mode." },
  { key: "auction", label: "Bidding window", help: "How long buyers can place sealed bids after scouting closes." },
  { key: "selection", label: "Selection window", help: "After the auction, winner #1 and then winner #2 each get this long to pick the signals they keep hidden." },
  { key: "outcome", label: "Outcome window", help: "How long a team has to deploy or win a grant after allocation. At least 1 day outside demo mode." },
  { key: "dispute", label: "Dispute window", help: "When a buyer flags a hoax, the scout has this long to respond before the operator decides. Buyers can flag during the whole outcome window." },
];
const DEFAULT_WINDOWS: Record<WindowKey, Window> = {
  submit: { value: "7", unit: 86400 },
  auction: { value: "1", unit: 3600 },
  selection: { value: "1", unit: 3600 },
  outcome: { value: "90", unit: 86400 },
  dispute: { value: "7", unit: 86400 },
};
const DEMO_WINDOWS: Record<WindowKey, Window> = {
  submit: { value: "5", unit: 60 },
  auction: { value: "3", unit: 60 },
  selection: { value: "2", unit: 60 },
  outcome: { value: "3", unit: 60 },
  dispute: { value: "1", unit: 60 },
};
const MAX_WINDOW_SECONDS = 10 * 365 * 86400;
const CATEGORIES = [0, 1, 2, 3, 4];
export default function Create() {
  const wallet = useWallet(),
    action = useAction(),
    navigate = useNavigate();
  const [cfg, setCfg] = useState<any>(null),
    [question, setQuestion] = useState(
      "Which uncommitted teams will ship next?",
    ),
    [kind, setKind] = useState(0),
    [pool, setPool] = useState("500"),
    [reserve, setReserve] = useState("100"),
    [flat, setFlat] = useState("90"),
    [demo, setDemo] = useState(false),
    [marketCategory, setMarketCategory] = useState(0),
    [minStake, setMinStake] = useState("10"),
    [maxStake, setMaxStake] = useState("500"),
    [minReason, setMinReason] = useState("200"),
    [signalsPerSlot, setSignalsPerSlot] = useState(3),
    [earlyBonus, setEarlyBonus] = useState("1.5"),
    [durations, setDurations] = useState(DEFAULT_WINDOWS);
  // Auction rounds are opened by verified buyers (13 Oct upgrade, replaces operator-only).
  const [buyerVerified, setBuyerVerified] = useState(false);
  useEffect(() => {
    if (wallet.program)
      void wallet.program.account.config
        .fetch(P.config())
        .then(setCfg)
        .catch(() => {});
  }, [wallet.program]);
  useEffect(() => {
    setBuyerVerified(false);
    if (!wallet.program || !wallet.publicKey) return;
    let live = true;
    void wallet.program.account.buyerProfile
      .fetchNullable(P.buyer(wallet.publicKey))
      .then((p: any) => live && setBuyerVerified(!!p?.verified && p.authority.equals(wallet.publicKey)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [wallet.program, wallet.publicKey]);
  useEffect(() => {
    if (kind === 1 && !buyerVerified) setKind(0);
  }, [kind, buyerVerified]);
  return (
    <>
      <PageTitle title="Open a market for private calls.">
        Ask one question about teams. In an exclusive market you are the only
        buyer, so you put the reward pool in escrow now and read every signal.
        In an auction round, opened by any verified buyer, rival buyers bid for
        access and the creator bids like everyone else.
      </PageTitle>
      <div className="columns">
        <div className="main-column">
          <Frame>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!wallet.publicKey) { wallet.requestConnect(); return; }
                void action.run("Creating the market and escrow", async () => {
                  const provider = requireWallet(wallet.provider),
                    config: any = await wallet.program.account.config.fetch(
                      P.config(),
                    );
                  if (demo && !config.demoMode)
                    throw Error(
                      "Short demo windows are disabled in this program configuration.",
                    );
                  if (kind === 1 && !buyerVerified)
                    throw Error("Only a verified buyer can open an auction round.");
                  const id = Number(config.marketCount),
                    m = P.market(id),
                    ixs: any[] = [],
                    creatorToken = await tokenAccount(
                      provider,
                      wallet.publicKey!,
                      ixs,
                    );
                  const bn = (s: string) => new anchor.BN(s);
                  // Mirror the program's create_market checks so a bad value fails before signing.
                  const seconds = {} as Record<WindowKey, string>;
                  for (const w of WINDOWS) {
                    const { value, unit } = durations[w.key];
                    if (!/^\d+$/.test(value) || Number(value) === 0)
                      throw Error(`${w.label} must be a positive whole number.`);
                    const total = Number(value) * unit;
                    if (total > MAX_WINDOW_SECONDS)
                      throw Error(`${w.label} can be at most 10 years.`);
                    seconds[w.key] = String(total);
                  }
                  if (
                    !config.demoMode &&
                    (Number(seconds.submit) < 86400 || Number(seconds.outcome) < 86400)
                  )
                    throw Error(
                      "The scouting and outcome windows must each be at least 1 day.",
                    );
                  const min = parseUsdc(minStake),
                    max = parseUsdc(maxStake);
                  if (min > max)
                    throw Error("The minimum stake cannot be higher than the maximum stake.");
                  if (!/^\d+$/.test(minReason) || Number(minReason) < 1 || Number(minReason) > 5000)
                    throw Error("Reason minimum must be a whole number from 1 to 5,000 characters.");
                  if (!/^\d+(\.\d{1,2})?$/.test(earlyBonus.trim()))
                    throw Error("Early bonus must be a number from 1 to 2, such as 1.5.");
                  const bonusBps = Math.round(Number(earlyBonus) * 10_000);
                  if (bonusBps < 10_000 || bonusBps > 20_000)
                    throw Error("Early bonus must be between 1 and 2.");
                  const args = {
                    kind,
                    category: marketCategory,
                    questionHash: Array.from(keccak(utf8(question))),
                    submitLen: bn(seconds.submit),
                    auctionLen: bn(seconds.auction),
                    selectionLen: bn(seconds.selection),
                    outcomeLen: bn(seconds.outcome),
                    disputeLen: bn(seconds.dispute),
                    minStake: bn(min.toString()),
                    maxStake: bn(max.toString()),
                    minReasonLen: Number(minReason),
                    b: 2,
                    x: signalsPerSlot,
                    reservePrice: bn(parseUsdc(reserve).toString()),
                    flatPrice: bn(parseUsdc(flat).toString()),
                    earlyBonusBps: bonusBps,
                    initialPool: bn(
                      kind === 0 ? parseUsdc(pool).toString() : "0",
                    ),
                  };
                  ixs.push(
                    await wallet.program.methods
                      .createMarket(args)
                      .accounts({
                        creator: wallet.publicKey,
                        config: P.config(),
                        market: m,
                        agg: P.agg(m),
                        auction: P.auction(m),
                        escrow: P.escrow(m),
                        usdcMint: config.usdcMint,
                        creatorToken,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        // Required for an auction round; the program checks it is verified.
                        buyerProfile: kind === 1 ? P.buyer(wallet.publicKey!) : null,
                        buyerRecord: P.buyerRecord(wallet.publicKey!),
                      })
                      .instruction(),
                  );
                  await send(provider, ixs);
                  // Publish the question text; the server checks it against the onchain hash.
                  await api(`/markets/${id}/question`, { question }).catch(() => undefined);
                  const cluster = Number(
                    import.meta.env.VITE_ARCIUM_CLUSTER_OFFSET || 456,
                  );
                  await queueAndWait(provider, PROGRAM_ID, (o) =>
                    wallet.program.methods
                      .initMarketState(o)
                      .accountsPartial({
                        payer: wallet.publicKey,
                        market: m,
                        agg: P.agg(m),
                        ...arciumAccounts(
                          PROGRAM_ID,
                          cluster,
                          o,
                          "init_market_agg",
                        ),
                      }),
                  );
                  if (kind === 1)
                    await queueAndWait(provider, PROGRAM_ID, (o) =>
                      wallet.program.methods
                        .initAuctionState(o)
                        .accountsPartial({
                          payer: wallet.publicKey,
                          market: m,
                          auction: P.auction(m),
                          ...arciumAccounts(
                            PROGRAM_ID,
                            cluster,
                            o,
                            "init_auction",
                          ),
                        }),
                    );
                  navigate(`/markets/${id}`);
                  return "Market created and its MPC state initialized.";
                });
              }}
            >
<div className="form-grid two">
              <label className="field">
                <span>Market question</span>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
                <small>
                  Only its hash is stored onchain. Save this question in your
                  own records.
                </small>
              </label>
              <label className="field">
                <span>Market type</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(Number(e.target.value))}
                >
                  <option value={0}>Exclusive buyer</option>
                  <option value={1} disabled={!buyerVerified}>
                    {buyerVerified ? "Auction round" : "Auction round · verified buyers only"}
                  </option>
                </select>
                <small>Exclusive means you are the only buyer and fund the pool now. Auction means rival buyers bid with sealed bids or join at the shared flat price. Any verified buyer can open one and then bids like everyone else.</small>
              </label>
              <label className="field">
                <span>Team category</span>
                <select
                  value={marketCategory}
                  onChange={(e) => setMarketCategory(Number(e.target.value))}
                >
                  {CATEGORIES.map((n) => (
                    <option value={n} key={n}>
                      {categoryName(n)}
                    </option>
                  ))}
                </select>
                <small>Shown to buyers in the preview so they know what kind of teams to expect.</small>
              </label>
              </div>
              <div className="form-grid three">
              {kind === 0 && (
                <label className="field">
                  <span>Initial reward pool in USDC</span>
                  <input
                    inputMode="decimal"
                    value={pool}
                    onChange={(e) => setPool(e.target.value)}
                  />
                  <small>Paid into escrow now and shared with scouts after settlement.</small>
                </label>
              )}
                <label className="field">
                  <span>Reserve price in USDC</span>
                  <input
                    inputMode="decimal"
                    value={reserve}
                    onChange={(e) => setReserve(e.target.value)}
                  />
                  <small>The lowest bid accepted for an exclusive slot.</small>
                </label>
                <label className="field">
                  <span>Flat price in USDC</span>
                  <input
                    inputMode="decimal"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                  />
                  <small>What a buyer outside the exclusive slots pays for the remaining signals.</small>
                </label>
              </div>
              <fieldset>
              <legend>Scout rules</legend>
              <div className="form-grid three">
                <label className="field">
                  <span>Minimum stake per call in USDC</span>
                  <input
                    inputMode="decimal"
                    value={minStake}
                    onChange={(e) => setMinStake(e.target.value)}
                  />
                  <small>The smallest deposit a scout can put behind one team.</small>
                </label>
                <label className="field">
                  <span>Maximum stake per call in USDC</span>
                  <input
                    inputMode="decimal"
                    value={maxStake}
                    onChange={(e) => setMaxStake(e.target.value)}
                  />
                  <small>The largest deposit per call, so one scout cannot dominate.</small>
                </label>
                <label className="field">
                  <span>Reason minimum in characters</span>
                  <input
                    inputMode="numeric"
                    value={minReason}
                    onChange={(e) => setMinReason(e.target.value)}
                  />
                  <small>Every call needs a written reason at least this long, from 1 to 5,000.</small>
                </label>
                <label className="field">
                  <span>Exclusive slots</span>
                  <input value="2" readOnly aria-readonly="true" />
                  <small>Every auction round has two exclusive winners. The program fixes this number.</small>
                </label>
                <label className="field">
                  <span>Hidden signals per slot</span>
                  <select
                    value={signalsPerSlot}
                    onChange={(e) => setSignalsPerSlot(Number(e.target.value))}
                  >
                    {[1, 2, 3].map((n) => (
                      <option value={n} key={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <small>How many signals each exclusive winner can keep from later buyers, from 1 to 3.</small>
                </label>
                <label className="field">
                  <span>Early bonus at opening</span>
                  <input
                    inputMode="decimal"
                    value={earlyBonus}
                    onChange={(e) => setEarlyBonus(e.target.value)}
                  />
                  <small>Rewards scouts who call it early. With 1.5, a call made at opening counts 1.5 times as much, falling evenly to 1 at close. Allowed from 1 to 2.</small>
                </label>
              </div>
              </fieldset>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={demo}
                  disabled={!cfg?.demoMode}
                  onChange={(e) => {
                    setDemo(e.target.checked);
                    setDurations(e.target.checked ? DEMO_WINDOWS : DEFAULT_WINDOWS);
                  }}
                />
                Use short demo windows
              </label>
              {demo && (
                <Note title="DEMO DATA">
                  Short windows are for the hackathon walkthrough. Use synthetic
                  team data and label it in the demo.
                </Note>
              )}
              <fieldset>
              <legend>Timeline</legend>
              <div className="form-grid three">
                {WINDOWS.map((w) => (
                  <div className="field" key={w.key}>
                    <label htmlFor={`window-${w.key}`}>{w.label}</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        id={`window-${w.key}`}
                        inputMode="numeric"
                        value={durations[w.key].value}
                        onChange={(e) =>
                          setDurations({
                            ...durations,
                            [w.key]: { ...durations[w.key], value: e.target.value },
                          })
                        }
                      />
                      <select
                        aria-label={`${w.label} unit`}
                        value={durations[w.key].unit}
                        onChange={(e) =>
                          setDurations({
                            ...durations,
                            [w.key]: { ...durations[w.key], unit: Number(e.target.value) },
                          })
                        }
                      >
                        {UNITS.map((u) => (
                          <option value={u.seconds} key={u.label}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <small>{w.help}</small>
                  </div>
                ))}
              </div>
              </fieldset>
              <WalletActionButton
                className="button"
                type="submit"
                disabled={
                  !!action.busy || !wallet.publicKey || !question.trim()
                }
              >
                Create market
              </WalletActionButton>
              <Feedback action={action} />
            </form>
          </Frame>
        </div>
        <aside className="side-column">
          <Note dark title="The defaults are part of the mechanism">
            Defaults follow the spec. Stake 10–500 USDC per call, up to three
            calls per scout, two exclusive winners with up to three hidden
            signals each, and a 7 day dispute window. Buyer payments fund the
            rewards.
          </Note>
          <Frame>
            <div className="stack">
              <h3>Who can create?</h3>
              <div className="who-row">
                <Pill state="public">Exclusive market</Pill>
                <p>Any wallet. You fund the pool and you are the only buyer.</p>
              </div>
              <div className="who-row">
                <Pill state="sealed">Auction round</Pill>
                <p>Any verified buyer opens it. Others join with a sealed bid or at the shared flat price. The creator gets no special allocation and bids like everyone else.</p>
              </div>
              <p className="fine">Windows shorter than a day work only while the onchain configuration is in demo mode.</p>
            </div>
          </Frame>
        </aside>
      </div>
    </>
  );
}
