import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "../lib/wallet";
import { api } from "../lib/api";
import { P, TOKEN_PROGRAM_ID, send, tokenAccount } from "../lib/chain";
import { fromHex } from "@bisik/shared";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Note, PageTitle, Pill, WalletActionButton } from "../components/ui";
import { OutcomeOracle } from "../components/outcome-oracle";
export default function Admin() {
  const wallet = useWallet(),
    action = useAction();
  const [cfg, setCfg] = useState<any>(null),
    [buyer, setBuyer] = useState(""),
    [label, setLabel] = useState(""),
    [marketId, setMarketId] = useState(""),
    [disputes, setDisputes] = useState<any[]>([]),
    [option, setOption] = useState("0"),
    [deploy, setDeploy] = useState("");
  useEffect(() => {
    if (wallet.program)
      void wallet.program.account.config
        .fetch(P.config())
        .then(setCfg)
        .catch(() => {});
  }, [wallet.program]);
  const allowed =
    !!wallet.publicKey && !!cfg && wallet.publicKey.equals(cfg.operator);
  const auth = async () => wallet.token ?? wallet.login();
  return (
    <>
      <PageTitle title="Keep the market accountable.">
        Verify buyers, inspect dispute evidence and maintain the market.
        Operator actions require the operator wallet.
      </PageTitle>
      {!allowed && (
        <Note title="Connect the operator wallet">
          Read-only context is available here. Operator controls unlock only for
          the configured operator address.
        </Note>
      )}
      <div className="admin-layout">
        <div className="stack">
          <Frame>
            <div className="stack">
              <h3>Buyer verification</h3>
              <label className="field">
                <span>Buyer wallet</span>
                <input
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Buyer label</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <WalletActionButton
                className="button"
                disabled={!allowed || !!action.busy || !buyer.trim()}
                onClick={() =>
                  action.run("Verifying buyer eligibility", async () => {
                    new PublicKey(buyer);
                    const r = await api(
                      "/admin/buyers/verify",
                      { pubkey: buyer, label },
                      await auth(),
                    );
                    return `Buyer verified. Transaction ${r.sig}`;
                  })
                }
              >
                Verify buyer
              </WalletActionButton>
            </div>
          </Frame>
          <Frame>
            <div className="stack">
              <h3 id="disputes">Dispute evidence</h3>
              <WalletActionButton
                className="button outline"
                disabled={!allowed || !!action.busy}
                onClick={() =>
                  action.run("Loading operator evidence", async () => {
                    const rows = await api(
                      "/admin/disputes",
                      undefined,
                      await auth(),
                    );
                    setDisputes(
                      await Promise.all(
                        rows.map(async (d: any) => {
                          const chain =
                            await wallet.program.account.dispute.fetchNullable(
                              P.dispute(
                                P.market(d.market_id),
                                fromHex(d.nullifier),
                              ),
                            );
                          return {
                            ...d,
                            status: !chain
                              ? "AWAITING ONCHAIN"
                              : chain.status === 0
                                ? "OPEN"
                                : chain.status === 1
                                  ? "UPHELD"
                                  : "REJECTED",
                          };
                        }),
                      ),
                    );
                    return "Disputes loaded.";
                  })
                }
              >
                Load disputes
              </WalletActionButton>
              {disputes.length === 0 && <p>No disputes loaded.</p>}
              {disputes.map((d) => (
                <div className="note" key={d.id}>
                  <div className="row between">
                    <strong>Market {d.market_id}</strong>
                    <Pill>{d.status}</Pill>
                  </div>
                  <p className="details">{d.evidence}</p>
                  <p className="details">
                    Scout response {d.response || "Not submitted"}
                  </p>
                  <div className="row">
                    {[false, true].map((upheld) => (
                      <WalletActionButton
                        className={`button ${upheld ? "ink" : "outline"} small`}
                        key={String(upheld)}
                        disabled={
                          !allowed || !!action.busy || d.status !== "OPEN"
                        }
                        onClick={() =>
                          action.run(
                            upheld
                              ? "Upholding the proven hoax"
                              : "Rejecting the hoax dispute",
                            async () => {
                              const n = fromHex(d.nullifier),
                                m = P.market(d.market_id),
                                // N1: the dispute's buyer gets the upheld/rejected count.
                                disputeAcct: any = await wallet.program.account.dispute.fetch(P.dispute(m, n)),
                                ixs: any[] = [],
                                charityToken = await tokenAccount(
                                  wallet.provider,
                                  cfg.charity,
                                  ixs,
                                );
                              ixs.push(
                                await wallet.program.methods
                                  .resolveDispute(upheld)
                                  .accounts({
                                    operator: wallet.publicKey,
                                    config: P.config(),
                                    market: m,
                                    position: P.position(m, n),
                                    dispute: P.dispute(m, n),
                                    escrow: P.escrow(m),
                                    charityToken,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    buyerRecord: P.buyerRecord(disputeAcct.buyer),
                                  })
                                  .instruction(),
                              );
                              const sig = await send(wallet.provider, ixs);
                              setDisputes((rows) =>
                                rows.map((row) =>
                                  row.id === d.id
                                    ? {
                                        ...row,
                                        status: upheld ? "UPHELD" : "REJECTED",
                                      }
                                    : row,
                                ),
                              );
                              return `Onchain decision confirmed. Transaction ${sig}`;
                            },
                          )
                        }
                      >
                        {upheld ? "Uphold proven hoax" : "Reject dispute"}
                      </WalletActionButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Frame>
          <Feedback action={action} />
        </div>
        <aside className="stack">
          <Frame>
            <div className="stack">
              <h3 id="maintenance">Market maintenance</h3>
              <label className="field">
                <span>Market ID</span>
                <input
                  inputMode="numeric"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                />
              </label>
              <WalletActionButton
                className="button outline"
                disabled={!allowed || !!action.busy || !/^\d+$/.test(marketId)}
                onClick={() =>
                  action.run("Closing the submission window", async () => {
                    const ix = await wallet.program.methods
                      .closeSubmit()
                      .accounts({
                        signer: wallet.publicKey,
                        market: P.market(Number(marketId)),
                      })
                      .instruction();
                    await send(wallet.provider, [ix]);
                    return "Submissions closed. The keeper will continue aggregation.";
                  })
                }
              >
                Close expired submissions
              </WalletActionButton>
              <WalletActionButton
                className="button outline"
                disabled={!allowed || !!action.busy || !/^\d+$/.test(marketId)}
                onClick={() =>
                  action.run("Building market summaries", async () => {
                    const r = await api(
                      `/admin/markets/${marketId}/summarize`,
                      {},
                      await auth(),
                    );
                    return `${r.summarized} options summarized.`;
                  })
                }
              >
                Generate summaries
              </WalletActionButton>
              <WalletActionButton
                className="button outline"
                disabled={!allowed || !!action.busy}
                onClick={() =>
                  action.run("Rotating the group epoch", async () => {
                    const ix = await wallet.program.methods
                      .rotateEpoch()
                      .accounts({
                        operator: wallet.publicKey,
                        config: P.config(),
                      })
                      .instruction();
                    await send(wallet.provider, [ix]);
                    return "Epoch rotated onchain.";
                  })
                }
              >
                Rotate eligible epoch
              </WalletActionButton>
              <Note title="Keeper runs as a service">
                Lifecycle transitions are driven by the keeper. There is no API
                to start or stop its process from this console.
              </Note>
            </div>
          </Frame>
        </aside>
        <aside className="stack">
          <Frame>
            <div className="stack">
              <h3 id="deploy-wallet">Register a deploy wallet for outcome verification</h3>
              <p>
                Request the team’s consent and confirm wallet ownership when a
                buyer needs deployment evidence. Registration gives the team no
                share of buyer payments. Scouts can propose teams without registration.
              </p>
              <label className="field">
                <span>Option index</span>
                <input
                  inputMode="numeric"
                  value={option}
                  onChange={(e) => setOption(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Team wallet</span>
                <input
                  value={deploy}
                  onChange={(e) => setDeploy(e.target.value)}
                />
              </label>
              <WalletActionButton
                className="button"
                disabled={
                  !allowed ||
                  !!action.busy ||
                  !/^\d+$/.test(marketId) ||
                  !/^\d+$/.test(option) ||
                  !deploy.trim()
                }
                onClick={() =>
                  action.run("Registering a wallet for outcome verification", async () => {
                    const m = P.market(Number(marketId)),
                      ix = await wallet.program.methods
                        .registerDeployWallet(new PublicKey(deploy))
                        .accounts({
                          operator: wallet.publicKey,
                          config: P.config(),
                          market: m,
                          option: P.option(m, Number(option)),
                        })
                        .instruction();
                    await send(wallet.provider, [ix]);
                    return "Team deploy wallet registered onchain.";
                  })
                }
              >
                Register deploy wallet
              </WalletActionButton>
            </div>
          </Frame>
          <Note dark title="Operator trust in v1">
            The operator verifies source proofs, reads reasons, attests Solana
            deploys and decides hoax disputes. AI scores alone never justify
            slashing.
          </Note>
        </aside>
      </div>
      <OutcomeOracle operator={cfg?.operator?.toBase58?.() ?? null} allowed={allowed} />
    </>
  );
}
