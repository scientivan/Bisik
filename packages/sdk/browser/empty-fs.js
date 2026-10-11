// @arcium-hq/client imports "fs" only for ArcisModule.loadFromFile, which the web app never calls.
export function readFileSync() {
  throw new Error("fs is not available in the browser");
}
export default { readFileSync };
