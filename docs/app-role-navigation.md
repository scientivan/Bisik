# Role navigation · 12 October 2026

Dien requested a clear role switch and separate action menus, using three supplied screenshots as the structural reference. Keep the current Butter palette, typography and wallet behavior.

The header retains the Bisik wordmark, theme control and wallet button. Its navigation row has contextual action links on the left and a grouped “Use Bisik as” selector on the right. Each role has an icon, name and plain action subtitle: Buyer / Buy signals, Scout / Sell insights, Operator / Manage Bisik. Active role and active page have separate visual treatments. A short selected-role description explains purpose; it is part of the navigation, not the previously removed full-width role bar.

Buyer pages: Browse signals, Open a market, Try demo. Scout pages: Browse markets, Get verified, Stakes & rewards. Operator pages: Verify buyers, Review disputes, Market tools, Deploy wallets, linking to actual console sections. Role selection changes routes only; operator permissions still require the configured wallet. Unknown routes retain the current fallback. Market detail and buyer detail routes activate their parent menus.

On mobile, role choices come first and action links follow, with wrapping and touch targets at least 44px. Native links support keyboard navigation and active page/role announcements. Verify all role transitions, direct URLs, operator anchor menus, light/dark themes and horizontal overflow at mobile sizes. No automatic wallet connection or transaction is introduced.

Validation: web build and workspace typecheck pass; three existing frontend tests pass. Chrome review verifies Buyer/Scout/Operator switching, context menu activation, direct operator section anchors, operator wallet requirement, no horizontal overflow at 1440/390/320px, 44px role targets and dark theme. Screenshots: `screenshots/role-navigation/` (Buyer, Scout, Operator desktop/mobile and dark theme).

The same header was verified on the running `localhost:5173/markets` app using the real market API, without submitting a transaction.
