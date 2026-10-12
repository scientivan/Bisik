import { Component, Suspense, lazy, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Link,
} from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { WalletProvider } from "./lib/wallet";
import { Header, Note } from "./components/ui";
import { WalletPicker } from "./components/wallet-picker";
import { usePageMotion } from "./lib/motion";
import Landing from "./pages/Landing";
const Markets = lazy(() => import("./pages/Markets")),
  Onboard = lazy(() => import("./pages/Onboard")),
  Stake = lazy(() => import("./pages/Stake")),
  Buyer = lazy(() => import("./pages/Buyer")),
  Positions = lazy(() => import("./pages/Positions")),
  Create = lazy(() => import("./pages/Create")),
  Admin = lazy(() => import("./pages/Admin")),
  Guide = lazy(() => import("./pages/Guide")),
  Profile = lazy(() => import("./pages/Profile")),
  MyBids = lazy(() => import("./pages/MyBids"));
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <div className="container error-page">
        <Note title="The page could not open">
          {this.state.error}
          <button className="button" onClick={() => location.reload()}>
            Reload page
          </button>
        </Note>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Content() {
  const location = useLocation(),
    landing = location.pathname === "/";
  usePageMotion(location.pathname);
  useEffect(() => {
    document.title = landing ? "Bisik · Insiders whisper" : "Bisik · Private signal market";
    if (location.hash) {
      const target = location.hash.slice(1);
      const scroll = () => {
        const element = document.getElementById(target);
        if (!element) return false;
        element.scrollIntoView({ block: "start" });
        return true;
      };
      const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
      observer.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
      const frame = requestAnimationFrame(() => { if (scroll()) observer.disconnect(); });
      return () => { cancelAnimationFrame(frame); observer.disconnect(); };
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return (
    <Boundary>
      {!landing && <Header />}
      <div
        className={landing ? "" : "container page"}
        id={landing ? undefined : "main"}
      >
        <Suspense
          fallback={
            <Note title="Opening page">Loading the tools for this flow.</Note>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/scout" element={<Markets role="scout" />} />
            <Route path="/markets/:id" element={<Stake />} />
            <Route path="/scout/onboard" element={<Onboard />} />
            <Route path="/scout/positions" element={<Positions />} />
            <Route path="/buyer/markets/:id" element={<Buyer />} />
            <Route path="/create" element={<Create />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/demo" element={<Buyer demo />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/buyer/bids" element={<MyBids />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/buyer/:address" element={<Profile />} />
            <Route
              path="*"
              element={
                <Note title="Page not found">
                  <Link to="/markets">Open markets</Link>
                </Note>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </Boundary>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <BrowserRouter>
          <Content />
          <WalletPicker />
        </BrowserRouter>
      </WalletProvider>
    </ThemeProvider>
  );
}
