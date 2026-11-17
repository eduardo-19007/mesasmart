import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const files = [];
async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = join(path, entry.name);
    if (entry.isDirectory()) await scan(name);
    else if (entry.isFile()) files.push(name);
  }
}
for (const dir of ['src', 'database', 'scripts']) await scan(dir);
files.push('package.json', 'pnpm-lock.yaml', 'Dockerfile', 'ml/train.py', 'ml/requirements.txt');
for (const entry of await readdir('ml', { withFileTypes: true })) {
  if (entry.isFile() && /\.(mjs|mts)$/.test(entry.name)) files.push(join('ml', entry.name));
}
const entries = [];
for (const path of files.sort()) entries.push({ path: path.replaceAll('\\','/'), sha256:createHash('sha256').update(await readFile(path)).digest('hex') });
const revision = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
await mkdir('qa/releases', { recursive: true });
await writeFile(`qa/releases/${revision}.json`, JSON.stringify({ generatedAt:new Date().toISOString(),revision,scope:'Source files only; no environment or credentials',files:entries },null,2), { flag:'wx' }).catch(error=>{ if(error.code!=='EEXIST') throw error; });
console.log(JSON.stringify({ revision, files:entries.length }));
