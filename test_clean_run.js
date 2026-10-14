const path = require('path');
const fs = require('fs');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

async function testCleanRun() {
    console.log('Testing clean OMF21.EXE install and run...');
    const exe = fs.readFileSync('extracted/OMF/OMF21.EXE');
    const config = {
        dosboxConf: `
[dosbox]
memsize=32

[cpu]
core=dynamic
cycles=max

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
OMF21.EXE
`,
        jsdosConf: { version: "8" }
    };
    
    let lastRgb = null;
    let frames = 0;
    const ci = await globalThis.emulators.dosboxNode([config, { path: "OMF21.EXE", contents: exe }]);
    ci.events().onFrame((rgb) => { frames++; if (rgb) lastRgb = Buffer.from(rgb); });
    ci.events().onStdout(msg => console.log('[DOS]', msg));

    function saveSnap(name) {
        if (!lastRgb) return;
        const w = ci.width();
        const h = ci.height();
        const header = Buffer.from(`P6\n${w} ${h}\n255\n`);
        const ppmPath = `screenshots/${name}.ppm`;
        const pngPath = `screenshots/${name}.png`;
        fs.writeFileSync(ppmPath, Buffer.concat([header, lastRgb]));
        require('child_process').execSync(`ffmpeg -y -i ${ppmPath} ${pngPath} 2>/dev/null`);
        console.log(`Saved screenshot ${pngPath} (${w}x${h})`);
    }

    async function sendKey(code, delay = 100) {
        ci.sendKeyEvent(code, true);
        await new Promise(r => setTimeout(r, delay));
        ci.sendKeyEvent(code, false);
    }

    async function typeString(str) {
        for (const ch of str) {
            const code = ch === '\n' ? 257 : ch.toUpperCase().charCodeAt(0);
            await sendKey(code, 60);
            await new Promise(r => setTimeout(r, 60));
        }
    }

    // 1. Welcome screen: Enter
    await new Promise(r => setTimeout(r, 2000));
    console.log('1. Welcome -> Enter');
    await sendKey(257);

    // 2. Drive C: -> Enter
    await new Promise(r => setTimeout(r, 1000));
    console.log('2. Drive C: -> Enter');
    await sendKey(257);

    // 3. Dir \OMF -> Enter
    await new Promise(r => setTimeout(r, 1000));
    console.log('3. Dir OMF -> Enter');
    await sendKey(257);

    // 4. Confirm -> Y + Enter
    await new Promise(r => setTimeout(r, 1000));
    console.log('4. Confirm -> Y');
    await sendKey(89);
    await new Promise(r => setTimeout(r, 200));
    await sendKey(257);

    // 5. Wait for extraction to complete (takes ~6-8s)
    console.log('5. Extracting files...');
    await new Promise(r => setTimeout(r, 8000));

    // 6. "Do you wish to read the documentation now? [Y/N]" -> N
    console.log('6. Documentation? -> N');
    await sendKey(78);
    await new Promise(r => setTimeout(r, 500));
    await sendKey(257);

    // 7. "Press any key to exit..." -> Enter
    await new Promise(r => setTimeout(r, 2000));
    console.log('7. Press any key to exit -> Enter');
    await sendKey(257);
    await new Promise(r => setTimeout(r, 2000));
    saveSnap('clean_after_installer');

    // 8. We are at C:\> prompt! Now type CD \OMF and OMF
    console.log('8. Typing CD \\OMF...');
    await typeString("cd \\omf\n");
    await new Promise(r => setTimeout(r, 1000));
    saveSnap('clean_after_cd');

    console.log('9. Typing OMF...');
    await typeString("omf\n");
    
    // Wait and watch frames for 15 seconds!
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[sec ${i+1}] frames: ${frames}, prog: ${await ci.getRunningProgram()}, w: ${ci.width()}, h: ${ci.height()}`);
        if (i === 5 || i === 10 || i === 14) {
            saveSnap(`clean_omf_live_sec${i+1}`);
        }
    }

    // Also let's extract the freshly generated files from C:\OMF so our package has the exact working files!
    const tree = await ci.fsTree();
    const omfDir = (tree.nodes || []).find(n => n.name.toUpperCase() === 'OMF');
    if (omfDir && omfDir.nodes) {
        console.log(`Found ${omfDir.nodes.length} files in C:\\OMF!`);
        for (const file of omfDir.nodes) {
            const data = await ci.fsReadFile(`OMF/${file.name}`);
            fs.writeFileSync(path.join('installed_game', file.name), data);
        }
        console.log('Updated installed_game with all working game files directly from DOSBox!');
    }

    await ci.exit();
    console.log('Clean test complete.');
}

testCleanRun().catch(console.error);
