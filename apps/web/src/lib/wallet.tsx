import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  connect: (wallet: any) => Promise<void>;
  disconnect: () => Promise<void>;
  login: () => Promise<string>;
}
const Context = createContext<WalletContextValue>(null!);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [account, setAccount] = useState<any>(null),
    [token, setToken] = useState<string | null>(null);
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
    void wallet.features["standard:connect"]
      .connect({ silent: true })
      .then((r: any) => {
        const a = r.accounts.find((a: any) =>
          a.chains.includes(`solana:${network}`),
        );
        if (active && a) {
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
        setAccount(accounts[0] ?? null);
        setToken(null);
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
    const r = await wallet.features["standard:connect"].connect();
    const a = r.accounts.find((a: any) =>
      a.chains.includes(`solana:${network}`),
    );
    if (!a) throw Error(`This wallet has no ${network} account.`);
    sessionStorage.setItem("bisik:wallet", wallet.name);
    setSelected(wallet);
    setAccount(a);
    setToken(null);
  }
  async function disconnect() {
    sessionStorage.removeItem("bisik:wallet");
    if (selected?.features["standard:disconnect"])
      await selected.features["standard:disconnect"].disconnect();
    setSelected(null);
    setAccount(null);
    setToken(null);
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
