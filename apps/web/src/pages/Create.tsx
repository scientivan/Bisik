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
import { parseUsdc } from "../lib/amounts";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Note, PageTitle, Pill } from "../components/ui";
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
    [durations, setDurations] = useState({
      submit: "86400",
      auction: "3600",
      selection: "3600",
      outcome: "7776000",
      dispute: "86400",
    });
  useEffect(() => {
    if (wallet.program)
      void wallet.program.account.config
        .fetch(P.config())
        .then(setCfg)
        .catch(() => {});
  }, [wallet.program]);
  const operator =
    wallet.publicKey?.equals(cfg?.operator ?? wallet.publicKey) && !!cfg;
  return (
    <>
      <PageTitle title="Open a market for private calls.">
        An exclusive market funds one buyer’s pool. An auction round lets
        verified buyers compete for access.
      </PageTitle>
      <div className="columns">
        <div className="main-column">
          <Frame>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void action.run("Creating the market and escrow", async () => {
                  const provider = requireWallet(wallet.provider),
                    config: any = await wallet.program.account.config.fetch(
                      P.config(),
                    );
                  if (demo && !config.demoMode)
                    throw Error(
                      "Short demo windows are disabled in this program configuration.",
                    );
                  const id = Number(config.marketCount),
                    m = P.market(id),
                    ixs: any[] = [],
                    creatorToken = await tokenAccount(
                      provider,
                      wallet.publicKey!,
                      ixs,
                    );
                  const bn = (s: string) => new anchor.BN(s);
                  for (const d of Object.values(durations))
                    if (!/^\d+$/.test(d) || BigInt(d) === 0n)
                      throw Error(
                        "Every window must be a positive whole number of seconds.",
                      );
                  const args = {
                    kind,
                    category: 0,
                    questionHash: Array.from(keccak(utf8(question))),
                    submitLen: bn(durations.submit),
                    auctionLen: bn(durations.auction),
                    selectionLen: bn(durations.selection),
                    outcomeLen: bn(durations.outcome),
                    disputeLen: bn(durations.dispute),
                    minStake: bn("10000000"),
                    maxStake: bn("500000000"),
                    minReasonLen: 200,
                    b: 2,
                    x: 3,
                    reservePrice: bn(parseUsdc(reserve).toString()),
                    flatPrice: bn(parseUsdc(flat).toString()),
                    earlyBonusBps: 15000,
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
                  <option value={1} disabled={!operator}>
                    Auction round · operator only
                  </option>
                </select>
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
                </label>
              )}
                <label className="field">
                  <span>Reserve price in USDC</span>
                  <input
                    inputMode="decimal"
                    value={reserve}
                    onChange={(e) => setReserve(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Flat price in USDC</span>
                  <input
                    inputMode="decimal"
                    value={flat}
                    onChange={(e) => setFlat(e.target.value)}
                  />
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={demo}
                  disabled={!cfg?.demoMode}
                  onChange={(e) => {
                    setDemo(e.target.checked);
                    setDurations(
                      e.target.checked
                        ? {
                            submit: "300",
                            auction: "180",
                            selection: "120",
                            outcome: "180",
                            dispute: "60",
                          }
                        : {
                            submit: "86400",
                            auction: "3600",
                            selection: "3600",
                            outcome: "7776000",
                            dispute: "86400",
                          },
                    );
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
              <div className="form-grid five">
                {Object.entries(durations).map(([k, v]) => (
                  <label className="field" key={k}>
                    <span>{k[0].toUpperCase() + k.slice(1)} window, seconds</span>
                    <input
                      inputMode="numeric"
                      value={v}
                      onChange={(e) =>
                        setDurations({ ...durations, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="button"
                type="submit"
                disabled={
                  !!action.busy || !wallet.publicKey || !question.trim()
                }
              >
                Create market
              </button>
              <Feedback action={action} />
            </form>
          </Frame>
        </div>
        <aside className="side-column">
          <Note dark title="The defaults are part of the mechanism">
            Stake 10–500 USDC, up to three slots, two exclusive winners and up
            to three hidden signals each. Buyer payments fund the rewards.
          </Note>
          <Frame>
            <div className="stack">
              <h3>Who can create?</h3>
              <Pill state="public">Exclusive buyer</Pill>
              <p>
                Any wallet can create and fund an exclusive market. Auction
                rounds are created by the operator.
              </p>
              <Pill state="sealed">Operator</Pill>
              <p>
                Short durations work only when the onchain configuration allows
                demo mode.
              </p>
            </div>
          </Frame>
        </aside>
      </div>
    </>
  );
}
