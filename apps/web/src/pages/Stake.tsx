import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchMxeKey,
  encryptStakeSecrets,
  computeBudget,
  anchor,
} from "@bisik/sdk";
import { keccak, fromHex, toHex } from "@bisik/shared";
import { useWallet } from "../lib/wallet";
import {
  P,
  TOKEN_PROGRAM_ID,
  tokenAccount,
  send,
  requireWallet,
} from "../lib/chain";
import { api } from "../lib/api";
import { amount, category, parseUsdc } from "../lib/amounts";
import { read, rememberPosition, type Scout } from "../lib/storage";
import { useMarket, useAction } from "../lib/hooks";
import {
  WalletActionButton,
  Icon,
  Feedback,
  Frame,
  Note,
  PageTitle,
  Pill,
  StatusStrip,
} from "../components/ui";
import { Steps } from "../components/roles";
let artifacts: Promise<any> | undefined;
export async function proving() {
  const zk = await import("@bisik/zk");
  artifacts ??= zk
    .fetchPinnedArtifacts("/artifacts/semaphore/4.13.0")
    .catch((e) => {
      artifacts = undefined;
      throw e;
    });
  zk.setDefaultArtifacts(await artifacts);
  return zk;
}
export default function Stake() {
  const { id } = useParams(),
    { market, error, loading, refresh } = useMarket(id),
    wallet = useWallet(),
    action = useAction();
  const scout = read<Scout | null>("scout", null);
  const verified = !!scout && scout.tier !== undefined && scout.epoch !== undefined;
  const navigate = useNavigate();
  // Unverified scouts are sent to verification at the moment they try a scout-only action.
  const toVerify = () => navigate(`/scout/onboard?next=${encodeURIComponent(`/markets/${id}`)}`);
  const [option, setOption] = useState(0),
    [slot, setSlot] = useState(1),
    [stake, setStake] = useState("100"),
    [reason, setReason] = useState(""),
    [analysis, setAnalysis] = useState<any>(null),
    [analysisKey, setAnalysisKey] = useState(""),
    [teamRef, setTeamRef] = useState(""),
    [teamCategory, setTeamCategory] = useState(0);
  const currentKey = `${id}|${option}|${reason}`,
    eligible = market?.status === "Open";
  async function analyze() {
    if (!market || reason.trim().length < market.minReasonLen)
      throw Error(`Write at least ${market?.minReasonLen ?? 200} characters.`);
    const captured = currentKey;
    const r = await api("/reasons", {
      marketId: market.id,
      optionIndex: option,
      text: reason,
    });
    setAnalysis(r);
    setAnalysisKey(captured);
    return r;
  }
  async function sealStake() {
    const provider = requireWallet(wallet.provider);
    if (
      !market ||
      !scout ||
      scout.tier === undefined ||
      scout.epoch === undefined
    )
      throw Error("Verify or restore your scout identity first.");
    const value = parseUsdc(stake);
    if (value < BigInt(market.minStake) || value > BigInt(market.maxStake))
      throw Error(
        `Stake must be between ${amount(market.minStake)} and ${amount(market.maxStake)} USDC.`,
      );
    const r =
      analysis && analysisKey === currentKey ? analysis : await analyze();
    const zk = await proving(),
      identity = zk.importIdentity(scout.secret),
      groupData = await api(`/groups/${scout.tier}/${scout.epoch}`);
    const cfg: any = await wallet.program.account.config.fetch(P.config());
    if (groupData.size < cfg.kMin && !cfg.demoMode)
      throw Error("Your tier group is still waiting for enough members.");
    const group = zk.buildGroup(groupData.leaves);
    if (!groupData.leaves.includes(scout.commitment))
      throw Error("This identity is not in the tier group.");
    const key = await fetchMxeKey(provider),
      sec = encryptStakeSecrets(key, option, identity.commitment);
    const payload = {
      marketId: BigInt(market.id),
      slot,
      amount: value,
      encOptionHash: keccak(
        sec.pubkey,
        sec.optionNonce,
        Uint8Array.from(sec.optionCt),
      ),
      reasonHash: fromHex(r.reasonHash),
      creditHash: keccak(Uint8Array.from(sec.creditCt), sec.creditNonce),
    };
    const { solana } = await zk.proveStake({ identity, group, payload });
    const record = {
      marketId: market.id,
      slot,
      tier: scout.tier,
      epoch: scout.epoch,
      nullifier: toHex(solana.nullifier),
      root: toHex(solana.root),
      optionIndex: option,
      leaves: groupData.leaves,
    };
    rememberPosition(record);
    const instructions = [computeBudget()],
      payerToken = await tokenAccount(
        provider,
        provider.wallet.publicKey,
        instructions,
      );
    const ix = await wallet.program.methods
      .stake({
        slot,
        amount: new anchor.BN(value.toString()),
        tier: scout.tier,
        epoch: scout.epoch,
        proof: Array.from(solana.proof),
        root: Array.from(solana.root),
        nullifier: Array.from(solana.nullifier),
        encPubkey: Array.from(sec.pubkey),
        encNonce: sec.optionNonceBN,
        encOption: Array.from(sec.optionCt),
        reasonHash: Array.from(payload.reasonHash),
        creditCt: Array.from(sec.creditCt),
        creditNonce: sec.creditNonceBN,
      })
      .accounts({
        payer: provider.wallet.publicKey,
        config: P.config(),
        market: P.market(market.id),
        group: P.group(scout.tier, scout.epoch),
        position: P.position(P.market(market.id), solana.nullifier),
        payerToken,
        escrow: P.escrow(P.market(market.id)),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    instructions.push(ix);
    const signature = await send(provider, instructions);
    rememberPosition({ ...record, signature });
    await refresh();
    return `Stake confirmed. Transaction ${signature}`;
  }
  if (loading)
    return (
      <Note title="Loading market">
        Reading stake limits and sealed options.
      </Note>
    );
  if (error || !market)
    return (
      <Note title="Market unavailable">
        {error || "Choose a market from the market list."}
        <Link to="/markets">Back to markets</Link>
      </Note>
    );
  return (
    <>
      <PageTitle title={`Back an option in market ${market.id}`}>
        Your pick is encrypted on this device. The operator reads your reason to
        score and filter it.
      </PageTitle>

      <Steps role="scout" at={1} />
      <StatusStrip
        status={market.status}
        end={market.status === "Open" ? market.submitEnd : undefined}
      />
      {!verified && (
        <div className="note-card">
          <Icon name="info" />
          <p><strong>Only verified scouts can stake or add a team.</strong> Read the market freely. When you press stake, Bisik takes you to a one-time GitHub proof and brings you back here.</p>
        </div>
      )}
      <div className="columns">
        <div className="main-column stack">
          <Frame>
            <div className="stack">
              <fieldset>
                <legend>Which option?</legend>
                <div className="team-picker">
                  {market.options?.map((o) => (
                    <button
                      type="button"
                      className="team-choice"
                      key={o.index}
                      aria-pressed={option === o.index}
                      onClick={() => {
                        setOption(o.index);
                        setAnalysis(null);
                      }}
                    >
                      <span>Option {o.index + 1}</span>
                      <small>{category(o.category)}</small>
                      <small>Team sealed</small>
                    </button>
                  ))}
                </div>
                {!market.optionCount && (
                  <p>No options have been added. Add a team reference below.</p>
                )}
              </fieldset>
              <label className="field">
                <span>Your slot</span>
                <select
                  value={slot}
                  onChange={(e) => setSlot(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option value={n} key={n}>
                      Slot {n} of 3
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Why this option?</span>
                <small>
                  At least {market.minReasonLen} characters, set by this market.
                  Facts beat adjectives.
                </small>
                <textarea
                  rows={5}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setAnalysis(null);
                  }}
                />
                <small>
                  {reason.trim().length} / {market.minReasonLen}
                </small>
              </label>
              <button
                className="button outline"
                disabled={
                  !!action.busy || reason.trim().length < market.minReasonLen
                }
                onClick={() =>
                  action.run("Checking your reason with Veritas", async () => {
                    await analyze();
                    return "Veritas analysis ready. These scores are flags, never grounds for slashing.";
                  })
                }
              >
                Check reason with Veritas
              </button>
              {analysis && analysisKey === currentKey && (
                <div className="row">
                  <Pill state="yours">Operator reads</Pill>
                  <Pill>DRS {analysis.veritas.drs.toFixed(2)}</Pill>
                  <Pill>
                    {
                      analysis.claims.filter(
                        (c: any) => c.kind === "verifiable",
                      ).length
                    }{" "}
                    verifiable claims
                  </Pill>
                  {analysis.veritas.flags.map((f: string) => (
                    <Pill key={f}>{f.replaceAll("_", " ")}</Pill>
                  ))}
                </div>
              )}
              <label className="field">
                <span>Stake</span>
                <small>
                  From {amount(market.minStake)} to {amount(market.maxStake)}{" "}
                  USDC, returned after settlement unless a hoax is proven.
                </small>
                <input
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </label>
              <WalletActionButton
                className="button full"
                disabled={
                  !!action.busy ||
                  !eligible ||
                  !market.optionCount ||
                  !wallet.publicKey ||
                  (verified && reason.trim().length < market.minReasonLen)
                }
                onClick={() =>
                  verified
                    ? action.run(
                        "Proving membership and sealing your stake",
                        sealStake,
                      )
                    : toVerify()
                }
              >
                {!eligible
                  ? "Submissions are closed"
                  : verified
                    ? `Seal and stake on option ${option + 1}`
                    : "Verify to stake"}
              </WalletActionButton>
            </div>
          </Frame>
          <Feedback action={action} />
          <details className="fold">
            <summary>Team not listed? Add it as a new option</summary>
            <p>The team does not need a Bisik account or a registered wallet.</p>
          <Frame>
            <div className="stack">
              <h3>Add a team option</h3>
              <p>
                The reference is stored by the operator. Public viewers see only
                an option index and category.
              </p>
              <label className="field">
                <span>Team reference</span>
                <input
                  value={teamRef}
                  onChange={(e) => setTeamRef(e.target.value)}
                  placeholder="Repository or public project URL"
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={teamCategory}
                  onChange={(e) => setTeamCategory(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option value={n} key={n}>
                      {category(n)}
                    </option>
                  ))}
                </select>
              </label>
              <WalletActionButton
                className="button outline"
                disabled={
                  !eligible ||
                  !!action.busy ||
                  !wallet.publicKey ||
                  teamRef.trim().length < 3 ||
                  market.optionCount >= 16
                }
                onClick={() =>
                  !verified ? toVerify() : action.run("Adding a sealed team option", async () => {
                    requireWallet(wallet.provider);
                    const ref = await api("/options/team-ref", {
                      marketId: market.id,
                      teamRef,
                      category: teamCategory,
                    });
                    const ix = await wallet.program.methods
                      .addOption(
                        Array.from(fromHex(ref.teamCommitment)),
                        teamCategory,
                      )
                      .accounts({
                        payer: wallet.publicKey,
                        market: P.market(market.id),
                        option: P.option(
                          P.market(market.id),
                          market.optionCount,
                        ),
                      })
                      .instruction();
                    await send(wallet.provider, [ix]);
                    setTeamRef("");
                    await refresh();
                    return "The new option is ready for staking.";
                  })
                }
              >
                Add sealed option
              </WalletActionButton>
            </div>
          </Frame>
          </details>
        </div>
        <aside className="side-column">
          <div className="dark-card">
            <h3>What leaves your device</h3>
            {[
              [
                "Group proof",
                "Shows you belong to a tier group, not who you are",
                "public",
                "Public",
              ],
              [
                "Team you picked",
                "Encrypted for the Arcium MXE only",
                "sealed",
                "Sealed",
              ],
              [
                "Stake amount",
                "A normal mock USDC transfer into escrow",
                "public",
                "Public",
              ],
              [
                "Reason",
                "Read by the operator’s Veritas, then filtered for buyers",
                "yours",
                "Operator reads",
              ],
              [
                "Reputation credit",
                "Encrypted with the same key as your pick",
                "sealed",
                "Sealed",
              ],
            ].map(([item, goes, state, label]) => (
              <div className="list-row" key={item}>
                <span>
                  <strong>{item}</strong>
                  <small>{goes}</small>
                </span>
                <Pill state={state}>{label}</Pill>
              </div>
            ))}

          </div>
          <Note title="Before you stake">
            Option names stay sealed, so pick an index only if you know which
            team it is, or add your own. You need devnet SOL and this market’s
            mock USDC. Later you claim to a fresh address with a new proof.
          </Note>
        </aside>
      </div>
    </>
  );
}
