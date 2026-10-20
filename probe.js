// Usage: node probe.js <dosbox|dosboxX> "<autoexec command>" [seconds] [tag]
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

const [backend = 'dosbox', cmd = 'OMF.EXE', secs = '10', tag = 'probe'] = process.argv.slice(2);
const DIR = process.env.DIR || 'installed_game';
const FLOOD = 'Illegal Unhandled Interrupt Called';

async function main() {
    const files = fs.readdirSync(DIR)
        .filter(f => fs.statSync(path.join(DIR, f)).isFile())
        .map(f => ({ path: f, contents: new Uint8Array(fs.readFileSync(path.join(DIR, f))) }));
    const config = {
        dosboxConf: `
[dosbox]
memsize=32

[cpu]
core=normal
cycles=fixed 20000

[autoexec]
mount c .
c:
${cmd}
`,
        jsdosConf: { version: '8' },
    };
    // EXCLUDE="NAME,..." drops exact host names; OVERRIDE="NAME=path,..." swaps contents.
    const excl = (process.env.EXCLUDE || '').split(',').filter(Boolean);
    for (const n of excl) { const i = files.findIndex(x => x.path === n); if (i >= 0) files.splice(i, 1); }
    for (const o of (process.env.OVERRIDE || '').split(',').filter(Boolean)) {
        const [n, src] = o.split('=');
        files.find(x => x.path === n).contents = new Uint8Array(fs.readFileSync(src));
    }
    // PATCH="<file>@<fileOffsetHex>:<hexbytes>[,...]" patches bundle copies in memory only.
    for (const p of (process.env.PATCH || '').split(',').filter(Boolean)) {
        const [, name, off, hex] = p.match(/^(.+)@([0-9a-fx]+):([0-9a-f]+)$/i);
        const f = files.find(x => x.path.toUpperCase() === name.toUpperCase());
        const buf = Buffer.from(f.contents);
        Buffer.from(hex, 'hex').copy(buf, Number(off));
        f.contents = buf;
    }
    // BUNDLE=<file.jsdos> runs that bundle as shipped (its own dosbox.conf and autoexec).
    const bundle = process.env.BUNDLE ? new Uint8Array(fs.readFileSync(process.env.BUNDLE)) : [config, ...files];
    const ci = backend === 'dosboxX'
        ? await globalThis.emulators.dosboxXNode(bundle)
        : await globalThis.emulators.dosboxNode(bundle);

    let lastRgb = null, frames = 0, flood = 0;
    const floodKinds = {};
    const log = [];
    let fw = 0, fh = 0;
    ci.events().onFrame(rgb => { frames++; if (rgb) { lastRgb = Buffer.from(rgb); fw = ci.width(); fh = ci.height(); } });
    const out = [];
    ci.events().onStdout(m => out.push(String(m)));
    ci.events().onMessage((type, ...args) => {
        const m = String(args[0] || '');
        if (m.includes(FLOOD)) { flood++; floodKinds[m] = (floodKinds[m] || 0) + 1; return; }
        if (/LOG_EXEC|LOG_CPU|LOG_DOSMISC|LOG_MISC|E_Exit|exit/i.test(m) && log.length < 60) log.push(`${type} ${m}`);
    });

    // KEYS="<second>:<keycode>[,...]" presses a key at that second (257 = Enter).
    const keys = (process.env.KEYS || '').split(',').filter(Boolean).map(k => k.split(':').map(Number));
    const seen = new Set();
    const stepMs = Number(process.env.STEP_MS || 1000);
    for (let t = stepMs; t <= Number(secs) * 1000; t += stepMs) {
        await new Promise(r => setTimeout(r, stepMs));
        const i = t / 1000;
        for (const [at, code] of keys) {
            if (Math.abs(at - i) > 1e-9) continue;
            ci.sendKeyEvent(code, true);
            await new Promise(r => setTimeout(r, 80));
            ci.sendKeyEvent(code, false);
        }
        if (!lastRgb || lastRgb.length !== fw * fh * 3) continue;
        const hash = crypto.createHash('md5').update(lastRgb).digest('hex').slice(0, 8);
        if (seen.has(hash)) continue;
        seen.add(hash);
        const ppm = `screenshots/${tag}_s${i}_${hash}.ppm`;
        fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${fw} ${fh}\n255\n`), lastRgb]));
        try { require('child_process').execSync(`ffmpeg -y -i ${ppm} ${ppm.replace('.ppm', '.png')} 2>/dev/null`); fs.unlinkSync(ppm); } catch (e) {}
        console.log(`[s${i}] new frame ${fw}x${fh} -> ${tag}_s${i}_${hash}.png (flood=${flood})`);
    }
    console.log(`RESULT backend=${backend} cmd="${cmd}" frames=${frames} distinct=${seen.size} flood=${flood}`);
    console.log('floodKinds:', JSON.stringify(floodKinds));
    console.log('log:\n  ' + log.join('\n  '));
    const text = out.join('').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    const idx = text.lastIndexOf('C:\\>' + cmd.split(' ')[0]);
    console.log('stdout after command:\n' + text.slice(idx < 0 ? -1500 : idx).split('\n').map(l => '  | ' + l.replace(/\s+$/, '')).filter(l => l.length > 4).join('\n'));
    await ci.exit();
}
main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e); process.exit(1); });
