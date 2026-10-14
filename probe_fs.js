// Usage: node probe_fs.js [dir]  -> compares host files with what the emulator FS serves back.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

const dir = process.argv[2] || 'installed_game';
const sha = b => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex').slice(0, 12);

async function main() {
    const names = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
    const files = names.map(f => ({ path: f, contents: new Uint8Array(fs.readFileSync(path.join(dir, f))) }));
    const config = { dosboxConf: '[autoexec]\nmount c .\nc:\n', jsdosConf: { version: '8' } };
    const ci = await globalThis.emulators.dosboxNode([config, ...files]);
    await new Promise(r => setTimeout(r, 2500));

    const tree = await ci.fsTree();
    const nodes = (tree.nodes || []).filter(n => !n.nodes);
    console.log(`host files: ${files.length}, emulator root entries: ${(tree.nodes || []).length}`);
    const hostByHash = new Map(files.map(f => [sha(f.contents), f.path]));
    let bad = 0;
    for (const f of files) {
        let got;
        try { got = Buffer.from(await ci.fsReadFile(f.path)); } catch (e) { console.log(`MISSING  ${f.path}: ${e.message || e}`); bad++; continue; }
        const h = sha(got), want = sha(f.contents);
        if (h !== want) {
            bad++;
            console.log(`MISMATCH ${f.path}: host ${f.contents.length}b ${want} -> emu ${got.length}b ${h}` + (hostByHash.has(h) ? `  (== host ${hostByHash.get(h)})` : ''));
        }
    }
    console.log(`mismatched/missing: ${bad} of ${files.length}`);
    const upper = {};
    for (const n of names) (upper[n.toUpperCase()] = upper[n.toUpperCase()] || []).push(n);
    console.log('case-colliding host names:', JSON.stringify(Object.values(upper).filter(v => v.length > 1)));
    await ci.exit();
}
main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e); process.exit(1); });
