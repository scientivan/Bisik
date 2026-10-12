import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getWallets } from "@wallet-standard/app";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { anchor, program as makeProgram } from "@bisik/sdk";
import { Buffer } from "buffer";
import { api } from "./api";
import { network } from "./storage";
import { captureSolflareConnectError } from "./wallet-diagnostics";
export const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL ||
    import.meta.env.VITE_RPC_URL ||
    "https://api.devnet.solana.com",
  "confirmed",
);
interface WalletContextValue {
  wallets: any[];
  selected: any;
  account: any;
  publicKey: PublicKey | null;
  provider: any;
  program: any;
  token: string | null;
  pickerOpen: boolean;
  connecting: string;
  connectionError: string;
  requestConnect: () => void;
  closePicker: () => void;
  connect: (wallet: any) => Promise<void>;
  disconnect: () => Promise<void>;
  login: () => Promise<string>;
}
const Context = createContext<WalletContextValue>(null!);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [account, setAccount] = useState<any>(null),
    [token, setToken] = useState<string | null>(null),
    [pickerOpen, setPickerOpen] = useState(false),
    [connecting, setConnecting] = useState(""),
    [connectionError, setConnectionError] = useState("");
  const attempt = useRef(0);
  const pending = useRef(false);
  const stopDiagnostics = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDiagnostics.current?.(), []);
  const activeAddress = useRef<string | null>(null);
  activeAddress.current = account?.address ?? null;
  useEffect(() => {
    const registry = getWallets();
    const update = () =>
      setWallets(
        registry
          .get()
          .filter(
            (w: any) =>
              w.features["standard:connect"] &&
              w.features["solana:signTransaction"],
          ),
      );
    update();
    const off = registry.on("register", update),
      off2 = registry.on("unregister", update);
    return () => {
      off();
      off2();
    };
  }, []);
  useEffect(() => {
    const name = sessionStorage.getItem("bisik:wallet"),
      wallet = wallets.find((w) => w.name === name);
    if (!wallet || selected) return;
    let active = true;
    const restoreAttempt = attempt.current;
    void wallet.features["standard:connect"]
      .connect({ silent: true })
      .then((r: any) => {
        const a = r.accounts.find((a: any) =>
          a.chains.includes(`solana:${network}`),
        );
        if (active && a && restoreAttempt === attempt.current && !pending.current) {
          new PublicKey(a.address);
          activeAddress.current = a.address;
          setSelected(wallet);
          setAccount(a);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [wallets]);
  useEffect(() => {
    if (!selected) return;
    const events = selected.features["standard:events"];
    if (!events) return;
    return events.on("change", ({ accounts }: any) => {
      if (accounts) {
        const next = accounts.find((a: any) => a.chains.includes(`solana:${network}`)) ?? null;
        activeAddress.current = next?.address ?? null;
        setAccount(next);
        setToken(null);
        if (!next) {
          sessionStorage.removeItem("bisik:wallet");
          setSelected(null);
        }
      }
    });
  }, [selected]);
  const publicKey = useMemo(
    () => (account ? new PublicKey(account.address) : null),
    [account],
  );
  const provider = useMemo(() => {
    if (!selected || !account) return null;
    const signTransaction = async <
      T extends Transaction | VersionedTransaction,
    >(
      tx: T,
    ): Promise<T> => {
      const legacy = tx instanceof Transaction;
      const bytes = legacy
        ? tx.serialize({ requireAllSignatures: false, verifySignatures: false })
        : tx.serialize();
      const [r] = await selected.features[
        "solana:signTransaction"
      ].signTransaction({
        account,
        chain: `solana:${network}`,
        transaction: bytes,
      });
      return (
        legacy
          ? Transaction.from(r.signedTransaction)
          : VersionedTransaction.deserialize(r.signedTransaction)
      ) as T;
    };
    return new anchor.AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(account.address),
        signTransaction,
        signAllTransactions: async <
          T extends Transaction | VersionedTransaction,
        >(
          txs: T[],
        ) => {
          const out: T[] = [];
          for (const tx of txs) out.push(await signTransaction(tx));
          return out;
        },
      },
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: true,
      },
    );
  }, [selected, account]);
  const program = useMemo(
    () => (provider ? makeProgram(provider) : null),
    [provider],
  );
  async function connect(wallet: any) {
    if (pending.current) return;
    pending.current = true;
    const currentAttempt = ++attempt.current;
    setConnecting(wallet.name);
    setConnectionError("");
    const diagnostics = wallet.name === "Solflare" ? captureSolflareConnectError() : null;
    stopDiagnostics.current = diagnostics?.stop ?? null;
    try {
      const r = await wallet.features["standard:connect"].connect();
      if (currentAttempt !== attempt.current) return;
      const a = r.accounts.find((a: any) => a.chains.includes(`solana:${network}`));
      if (!a) throw Error(`${wallet.name} did not provide a Solana ${network} account. Enable Solana ${network} in your wallet, then try again.`);
      new PublicKey(a.address);
      sessionStorage.setItem("bisik:wallet", wallet.name);
      activeAddress.current = a.address;
      setSelected(wallet);
      setAccount(a);
      setToken(null);
      setPickerOpen(false);
    } catch (error) {
      // The adapter may reject its Promise between window message listeners.
      // Finish that message dispatch before reading the matching bridge error.
      if (diagnostics) await new Promise(resolve => setTimeout(resolve, 0));
      if (currentAttempt !== attempt.current) return;
      const e = diagnostics?.error() ?? error as { code?: number; message?: string };
      setConnectionError(wallet.name === "Solflare" && e.code === -32603 && /transport error/i.test(e.message ?? "")
        ? `Solflare could not communicate with its extension background service. In Brave, open brave://extensions, switch Solflare off and on, then open Bisik in a new tab and reconnect. Wallet error (code -32603): Transport error.`
        : e.message === "Connection rejected" && e.code !== 4001
        ? `${wallet.name} could not complete the connection. If no approval window appeared, open and unlock the wallet extension, close any old approval windows, then reload this page and try again. Wallet error: Connection rejected.`
        : e.code === 4001 || /reject|declin|cancel/i.test(e.message ?? "")
          ? `Connection was declined in ${wallet.name}. Unlock your wallet and approve the connection request, then try again.`
          : `${wallet.name} connection failed${e.code === undefined ? "" : ` (code ${e.code})`}: ${e.message || "Open your wallet and try again."}`);
    } finally {
      diagnostics?.stop();
      if (stopDiagnostics.current === diagnostics?.stop) stopDiagnostics.current = null;
      if (currentAttempt === attempt.current) {
        pending.current = false;
        setConnecting("");
      }
    }
  }
  function requestConnect() {
    setConnectionError("");
    setPickerOpen(true);
  }
  function closePicker() {
    stopDiagnostics.current?.();
    stopDiagnostics.current = null;
    ++attempt.current;
    pending.current = false;
    setConnecting("");
    setConnectionError("");
    setPickerOpen(false);
  }
  async function disconnect() {
    sessionStorage.removeItem("bisik:wallet");
    const previous = selected;
    closePicker();
    activeAddress.current = null;
    setSelected(null);
    setAccount(null);
    setToken(null);
    if (previous?.features["standard:disconnect"])
      await previous.features["standard:disconnect"].disconnect();
  }
  async function login() {
    if (!selected || !account) throw Error("Connect a wallet first.");
    if (!selected.features["solana:signMessage"])
      throw Error("Use a wallet that supports signing messages.");
    const nonce = await api("/auth/nonce", { pubkey: account.address });
    const [signed] = await selected.features["solana:signMessage"].signMessage({
      account,
      message: new TextEncoder().encode(nonce.message),
    });
    const r = await api("/auth/verify", {
      pubkey: account.address,
      nonce: nonce.nonce,
      signature: Buffer.from(signed.signature).toString("base64"),
    });
    if (activeAddress.current !== account.address) throw Error("Your wallet changed. Sign in again with the current account.");
    setToken(r.token);
    return r.token as string;
  }
  return (
    <Context.Provider
      value={{
        wallets,
        selected,
        account,
        publicKey,
        provider,
        program,
        token,
        pickerOpen,
        connecting,
        connectionError,
        requestConnect,
        closePicker,
        connect,
        disconnect,
        login,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWallet = () => useContext(Context);
