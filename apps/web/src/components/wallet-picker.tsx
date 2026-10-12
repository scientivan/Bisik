import { useEffect, useRef } from "react";
import { useWallet } from "../lib/wallet";
import { network } from "../lib/storage";
import { Icon } from "./ui";

export function WalletPicker() {
  const wallet = useWallet();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wallet.pickerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") wallet.closePicker();
      if (event.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, [wallet.pickerOpen]);
  if (!wallet.pickerOpen) return null;
  return (
    <div className="wallet-overlay" onClick={event => { if (event.target === event.currentTarget) wallet.closePicker(); }}>
      <div ref={panel} className="wallet-dialog" role="dialog" aria-modal="true" aria-labelledby="wallet-title" aria-describedby="wallet-description" tabIndex={-1}>
        <div className="row between"><h2 id="wallet-title">Connect Wallet</h2><button className="theme-toggle" onClick={wallet.closePicker} aria-label="Close wallet options"><Icon name="close" /></button></div>
        <p id="wallet-description">Choose your Solana wallet. Unlock it and approve the connection request in its popup.</p>
        <span className="pill public">Solana {network}</span>
        <div className="wallet-options">
          {wallet.wallets.map(w => <button className="wallet-option" key={w.name} disabled={!!wallet.connecting} onClick={() => void wallet.connect(w)}>
            {w.icon && <img src={w.icon} width="32" height="32" alt="" />}<span>{w.name}</span>{wallet.connecting === w.name ? <span className="spinner" /> : <Icon />}
          </button>)}
        </div>
        {wallet.connecting && <p className="fine" role="status">Waiting for {wallet.connecting}. Check your wallet popup to approve or decline.</p>}
        {wallet.connectionError && <div className="note wallet-error" role="alert">{wallet.connectionError}</div>}
        {!wallet.wallets.length && <p>No compatible wallet detected. Install <a href="https://phantom.com/" target="_blank" rel="noreferrer">Phantom</a> or <a href="https://solflare.com/" target="_blank" rel="noreferrer">Solflare</a>, then refresh this page.</p>}
        <p className="fine">Connecting shares your public address. Transactions and sign-in messages require a separate approval.</p>
      </div>
    </div>
  );
}
