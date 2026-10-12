import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createIdentity, exportIdentity, importIdentity } from "@bisik/zk";
import { api } from "../lib/api";
import {
  read,
  write,
  download,
  type Scout,
  type PositionRecord,
} from "../lib/storage";
import { useAction } from "../lib/hooks";
import { Feedback, Frame, Icon, Note, PageTitle, Pill } from "../components/ui";
import { Steps } from "../components/roles";
export default function Onboard() {
  const [scout, setScout] = useState<Scout | null>(() => read("scout", null)),
    [status, setStatus] = useState(""),
    [importText, setImportText] = useState("");
  const action = useAction();
  // Set when a scout-only action sent the visitor here; only same-site paths are followed.
  const next = useSearchParams()[0].get("next");
  const back = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  function save(next: Scout) {
    write("scout", next);
    setScout(next);
  }
  // Returns true when polling should stop (verified or rejected).
  async function poll(): Promise<boolean> {
    const current = read<Scout | null>("scout", null);
    if (!current?.sessionId) return true;
    const r = await api(`/identity/reclaim-session/${current.sessionId}`);
    setStatus(r.status === "REJECTED" ? r.error : r.status);
    if (r.result) {
      save({ ...current, tier: r.result.tier, epoch: r.result.epoch });
      return true;
    }
    return r.status === "REJECTED";
  }
  useEffect(() => {
    if (!scout?.sessionId || scout.tier !== undefined) return;
    const timer = setInterval(() => {
      poll()
        .then((done) => done && clearInterval(timer))
        .catch((e) => setStatus(e.message));
    }, 5000);
    return () => clearInterval(timer);
  }, [scout?.sessionId, scout?.tier]);
  return (
    <>
      <PageTitle title="A record, without a name.">
        Create a private identity on this device, prove your GitHub record and
        join a tier group.
      </PageTitle>

      <Steps role="scout" at={0} />
      {back && (
        <div className="note-card">
          <Icon name="info" />
          <p>
            <strong>{scout?.tier !== undefined ? "You are verified." : "Verify once, then continue."}</strong>{" "}
            {scout?.tier !== undefined ? "Go back and finish what you started." : "Only verified scouts can stake or add teams. Bisik returns you to the market after the proof."}
          </p>
          {scout?.tier !== undefined && <Link className="button small" to={back}>Continue</Link>}
        </div>
      )}
      <div className="columns">
        <div className="main-column stack">
          <Frame>
            <div className="stack">
              <h3>Your scout identity</h3>
              {scout ? (
                <>
                  <div className="list-row">
                    <span>Identity commitment</span>
                    <Pill>Public</Pill>
                  </div>
                  <p className="details">{scout.commitment}</p>
                  <div className="row">
                    <button
                      className="button outline"
                      onClick={() =>
                        download("bisik-scout-backup.json", {
                          version: 1,
                          scout,
                          positions: read<PositionRecord[]>("positions", []),
                        })
                      }
                    >
                      Export private backup
                    </button>
                    {scout.tier !== undefined && (
                      <Pill state="blue">
                        {["Bronze", "Silver", "Gold"][scout.tier]} · epoch{" "}
                        {scout.epoch}
                      </Pill>
                    )}
                  </div>
                </>
              ) : (
                <button
                  className="button"
                  onClick={() =>
                    action.run("Creating a private identity", async () => {
                      const identity = createIdentity();
                      save({
                        secret: exportIdentity(identity),
                        commitment: identity.commitment.toString(),
                      });
                      return "Identity created on this device.";
                    })
                  }
                >
                  Create private identity
                </button>
              )}
              <label className="field">
                <span>Restore a private backup</span>
                <textarea
                  rows={3}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your exported backup JSON"
                />
              </label>
              <button
                className="button outline"
                disabled={!!action.busy || !importText.trim()}
                onClick={() =>
                  action.run("Restoring identity", async () => {
                    const backup = JSON.parse(importText);
                    const next = backup.scout ?? backup;
                    const identity = importIdentity(next.secret);
                    if (identity.commitment.toString() !== next.commitment)
                      throw Error(
                        "The backup commitment does not match its identity.",
                      );
                    if (scout && scout.commitment !== next.commitment)
                      throw Error(
                        "Export the current identity first, then clear Bisik site storage before restoring a different identity.",
                      );
                    save(next);
                    if (Array.isArray(backup.positions))
                      write("positions", backup.positions);
                    setImportText("");
                    return "Your private identity was restored.";
                  })
                }
              >
                Restore backup
              </button>
            </div>
          </Frame>
          <Frame>
            <div className="stack">
              <h3>Verify your GitHub record</h3>
              <p>
                Reclaim proves your contributions. The verifier sees your
                username briefly; it never writes that username onchain.
              </p>
              {scout?.tier !== undefined ? (
                <>
                  <Pill state="blue">Record verified</Pill>
                  <Link className="button" to="/markets">
                    Choose a market
                  </Link>
                </>
              ) : (
                <>
                  <button
                    className="button"
                    disabled={!scout || !!action.busy}
                    onClick={() =>
                      action.run("Preparing Reclaim verification", async () => {
                        const s = await api("/identity/reclaim-session", {
                          identityCommitment: scout!.commitment,
                        });
                        save({
                          ...scout!,
                          sessionId: s.sessionId,
                          requestUrl: s.requestUrl,
                        });
                        return "Open the verification link and complete the GitHub steps.";
                      })
                    }
                  >
                    Start verification
                  </button>
                  {scout?.requestUrl && (
                    <>
                      <a
                        className="button outline"
                        href={scout.requestUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Reclaim verification
                      </a>
                      <button
                        className="button outline"
                        onClick={() =>
                          action.run("Checking verification", async () => {
                            await poll();
                          })
                        }
                        disabled={!!action.busy}
                      >
                        Check verification
                      </button>
                    </>
                  )}
                  {status && <Note title="Verification status">{status}</Note>}
                </>
              )}
            </div>
          </Frame>
          <Feedback action={action} />
        </div>
        <aside className="side-column">
          <Note dark title="Keep your identity safe">
            The private identity stays in this browser. Export a backup before
            changing devices or clearing site data. Anyone with the backup can
            claim your positions.
          </Note>
          <Frame>
            <div className="stack">
              <h3>A group, not a profile.</h3>
              <div className="members">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    className="member"
                    style={{ animationDelay: `${i * 0.6}s` }}
                    key={i}
                  >
                    ?
                  </span>
                ))}
              </div>
              <p>
                Groups need at least five members before a normal stake can be
                proven. Tier ranges are 50–299, 300–999 and at least 1,000
                contributions.
              </p>
            </div>
          </Frame>
        </aside>
      </div>
    </>
  );
}
