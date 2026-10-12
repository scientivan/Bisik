import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const version='4.13.0';
const pins={'semaphore-20.wasm':'6f71e55586929e520e76027ebe067daac8b41e2f4b8057313a5fd0304e1e44ee','semaphore-20.zkey':'33f9a067a80c7daf90e085449073613a9559a1904dd40aeb6d603afb7988c2cc'};
const out=resolve(import.meta.dirname,'../public/artifacts/semaphore',version);mkdirSync(out,{recursive:true});
for(const [name,pin] of Object.entries(pins)){
 const target=join(out,name),cached=join(tmpdir(),'snark-artifacts','semaphore',version,name);
 let bytes=existsSync(target)?readFileSync(target):existsSync(cached)?readFileSync(cached):null;
 if(!bytes){const r=await fetch(`https://snark-artifacts.pse.dev/semaphore/${version}/${name}`);if(!r.ok)throw Error(`Artifact fetch failed ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());}
 if(createHash('sha256').update(bytes).digest('hex')!==pin)throw Error(`Artifact hash mismatch for ${name}`);
 writeFileSync(target,bytes);console.log(`Verified ${name}`);
}
