import { Link } from "react-router-dom";
import { Frame, Note, PageTitle, Pill } from "../components/ui";
export default function Team() {
  return (
    <>
      <PageTitle title="A team can choose to participate.">
        An opted-in team can receive its share of a successful buyer payment.
      </PageTitle>
      <div className="columns">
        <div className="main-column">
          <Frame>
            <div className="stack">
              <h3>Register a deploy wallet</h3>
              <div className="list-row">
                <span>Share of successful buyer payments</span>
                <Pill state="blue">5%</Pill>
              </div>
              <p>
                In v1, the operator registers a team’s deploy wallet after
                confirming its claim. Ask the market operator to register your
                wallet against the correct market and option.
              </p>
              <Link className="button outline" to="/admin">
                Open operator registration
              </Link>
              <Note title="Self-service opt-in is not available">
                The current program requires the operator signature. Connecting
                a team wallet does not grant permission to register it directly.
              </Note>
            </div>
          </Frame>
        </div>
        <aside className="side-column">
          <Note dark title="Opt-out is not implemented onchain">
            The product policy allows teams to request removal, but the current
            program has no opt-out instruction. Contact the operator before a
            round is created. This app does not present an unsupported opt-out
            transaction.
          </Note>
        </aside>
      </div>
    </>
  );
}
