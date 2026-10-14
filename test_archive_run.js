const path = require('path');
const fs = require('fs');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

async function testArchiveGame() {
    console.log('Testing Archive.org OMF bundle...');
    const zipData = fs.readFileSync('archive_omf.zip');
    
    // Create bundle with dosboxConf
    const config = {
        dosboxConf: `
[dosbox]
memsize=32

[cpu]
core=normal
cycles=15000

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
sbmixer=true
oplmode=auto

[autoexec]
mount c .
c:
cd OneMustF\\OMF
OMF.EXE
`,
        jsdosConf: { version: "8" }
    };
    
    let lastRgb = null;
    let frames = 0;
    const ci = await globalThis.emulators.dosboxNode([config, { path: "game.zip", contents: zipData }]);
    ci.events().onFrame((rgb) => { frames++; if (rgb) lastRgb = Buffer.from(rgb); });
    ci.events().onStdout(msg => console.log('[DOS]', msg));
    ci.events().onMessage((type, ...args) => {
        if (type === 'error' || type === 'warn') {
            console.log('[DOS MSG]', type, ...args);
        }
    });

    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[sec ${i+1}] frames: ${frames}, prog: ${await ci.getRunningProgram()}, w: ${ci.width()}, h: ${ci.height()}`);
        if (frames > 20 && lastRgb) {
            const w = ci.width();
            const h = ci.height();
            if (w > 0 && h > 0) {
                const header = Buffer.from(`P6\n${w} ${h}\n255\n`);
                fs.writeFileSync(`screenshots/archive_omf_sec${i+1}.ppm`, Buffer.concat([header, lastRgb]));
                require('child_process').execSync(`ffmpeg -y -i screenshots/archive_omf_sec${i+1}.ppm screenshots/archive_omf_sec${i+1}.png 2>/dev/null`);
                console.log(`Saved screenshot screenshots/archive_omf_sec${i+1}.png!`);
                break;
            }
        }
    }
    await ci.exit();
    console.log('Test finished.');
}

testArchiveGame().catch(console.error);
