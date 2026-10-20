const path = require('path');
const fs = require('fs');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

async function runSetup() {
    console.log('Running SETUP.EXE to generate configuration...');
    function getFiles(dir) {
        let res = [];
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            res.push({ path: item, contents: fs.readFileSync(full) });
        }
        return res;
    }
    const gameFiles = getFiles('installed_game');
    const config = {
        dosboxConf: `
[dosbox]
memsize=32

[cpu]
core=auto
cycles=fixed 20000

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
SETUP.EXE
`,
        jsdosConf: { version: "8" }
    };
    
    const ci = await globalThis.emulators.dosboxNode([config, ...gameFiles]);
    ci.events().onStdout(msg => console.log('[DOS]', msg));
    
    // Wait for setup to appear
    await new Promise(r => setTimeout(r, 3000));
    console.log('Sending ENTER to save configuration...');
    ci.simulateKeyPress(257); // Enter in SDL
    ci.simulateKeyPress(13);  // Enter in ASCII
    
    await new Promise(r => setTimeout(r, 2000));
    // Let's see what files changed
    const tree = await ci.fsTree();
    console.log('Tree root:', tree.name);
    for (const node of tree.nodes || []) {
        if (node.name.includes('CFG') || node.name.includes('INF') || node.name.includes('INI')) {
            console.log('Config file in DOS fs:', node.name, node.size);
            const content = await ci.fsReadFile(node.name);
            fs.writeFileSync(path.join('installed_game', node.name), content);
            console.log(`Saved ${node.name} (${content.length} bytes) to installed_game!`);
        }
    }
    await ci.exit();
    console.log('Setup finished.');
}

runSetup().catch(console.error);
