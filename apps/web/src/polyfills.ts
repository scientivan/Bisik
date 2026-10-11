import { Buffer } from "buffer";
import process from "process";
const browser = globalThis as any;
browser.Buffer ??= Buffer;
browser.process ??= process;
browser.global ??= globalThis;
