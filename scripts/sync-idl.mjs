// Copy the Anchor IDL into @bisik/sdk after `arcium build`.
import { copyFileSync } from "node:fs";
copyFileSync(new URL("../contracts/target/idl/bisik.json", import.meta.url), new URL("../packages/sdk/src/idl/bisik.json", import.meta.url));
console.log("synced IDL -> packages/sdk/src/idl/bisik.json");
