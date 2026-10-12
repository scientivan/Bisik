# Wallet connection · 11 October 2026

Wallet-required actions show **Connect Wallet** while disconnected and open the shared Wallet Standard picker. After approval, their original labels and validation/permission checks return. Connecting does not submit a form, sign a message, or send a transaction. Local actions and the synthetic walkthrough remain available without a wallet.

The picker lists installed Solana wallets with transaction signing support. It explains extension approval, displays retryable rejection errors and rejects accounts without devnet support. Closing a pending request ignores its eventual result. Account changes clear the API login token; disconnect immediately clears the application state. A login response for an account that changed during signing is ignored.

To connect a real wallet: unlock its extension, choose it in the picker, then approve the extension popup. The application cannot approve this request on the user's behalf.

Validation: production build, TypeScript and three existing frontend tests pass. Chrome tests on localhost:5173 used a simulated Wallet Standard wallet: connection prompts on create/operator/positions/stake/buyer pages, rejection/retry, incompatible network, approval without automatic signing, account switch, disconnect, canceled pending request, synthetic demo and keyboard/mobile dialog behavior. No runtime errors; 1440px and 390px layouts fit. Results and screenshots: `apps/web/.review/wallet-flow/`. This is not a new real-wallet transaction test.

## Brave / Solflare diagnosis · 12 October 2026

Dien reports an immediate connection error without an approval popup in Brave. Installed Solflare 2.40.1 extension code was inspected (public extension assets only): its connect handler catches approval-window request failures and replaces them with the generic `Connection rejected` message. This message therefore does not prove the user declined a request. Bisik now treats that generic message separately from explicit rejection code 4001 and gives extension recovery guidance.

The exact browser/extension failure remains unverified without its runtime error. Open and unlock Solflare from Brave's extension icon, close old approval windows, reload Bisik and retry. If it still fails before showing a popup, restart the extension/browser to clear its pending popup state. Do not reset or recreate the wallet. Brave's built-in wallet conflict is a hypothesis, not an established cause.

Connection shares a public account with the application; it does not write a transaction by itself. Stake transactions expose their payer and token transfers onchain. ZK membership and encrypted option/reason data protect other links; they do not conceal the transaction sender.

### Recover the actual error · 12 October 2026

Solflare's installed inpage adapter swallows the underlying JSON-RPC error and returns a boolean; its Wallet Standard wrapper then throws a generic Connection rejected. `src/lib/wallet-diagnostics.ts` listens temporarily to the public Solflare page bridge during explicit connection, correlates the request ID and reads only its error code/message. Silent requests and successful account responses are ignored; the listener is removed after completion or failure. Because the adapter can settle Promises between message listeners, the catch waits until that message dispatch finishes before reading the error.

A Chrome test injected the installed public Solflare 2.40.1 inpage asset and a simulated content-script error response: code -32603 / Approval window unavailable survived the adapter and appeared in the UI. This proves diagnostics, not the cause of Dien's actual browser failure. Dien confirms Brave and that Solflare itself opens normally; the real error remains pending a new attempt. Production build, three existing web tests and simulated wallet regression checks verify the change.

### Actual runtime result from Dien

A new attempt in Brave returned **code -32603: Transport error**. Solflare's installed content.js emits exactly that error when its `runtime.sendMessage` request to the background service rejects. This locates the failure at the extension content/background boundary before wallet approval; it does not establish why the underlying runtime messaging failed. This is not an RPC, balance, transaction, or privacy rejection in Bisik.

The UI now gives this specific recovery instruction: toggle Solflare off and on in `brave://extensions` (do not Remove), open Bisik in a fresh tab, reconnect. The extension restart must be performed in Brave; website JavaScript cannot restart a browser extension. Dien was asked to report whether the popup appears after this step. The installed public inpage adapter with a simulated -32603 Transport error response verifies this branch and preserves the diagnostic code.
