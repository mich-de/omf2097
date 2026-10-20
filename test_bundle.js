const fs = require('fs');
const path = require('path');
require('./node_modules/emulators/dist/emulators.js');
globalThis.emulators.pathPrefix = path.resolve('./node_modules/emulators/dist') + '/';

async function testBundle() {
    console.log('Testing bundle omf2097.jsdos...');
    const bundleBuffer = fs.readFileSync('/home/michde/Documenti/omf2097/omf2097.jsdos');
    
    const ci = await globalThis.emulators.dosboxNode(bundleBuffer);
    console.log('dosboxNode started successfully!');
    
    ci.events().onStdout(msg => console.log('[DOS STDOUT]', msg));
    ci.events().onMessage((type, ...args) => {
        if (type === 'error' || type === 'warn') {
            console.log('[DOS MSG]', type, ...args);
        }
    });

    // Wait 12 seconds
    await new Promise(r => setTimeout(r, 12000));
    
    const width = ci.width();
    const height = ci.height();
    const rgba = await ci.screenshot();
    
    console.log(`Captured screenshot: ${width}x${height}, rgba len: ${rgba ? (rgba.data ? rgba.data.length : rgba.length) : 0}`);
    
    const data = rgba.data || rgba;
    if (data && width > 0 && height > 0) {
        const ppmHeader = `P6\n${width} ${height}\n255\n`;
        const rgbBuf = Buffer.alloc(width * height * 3);
        for (let i = 0; i < width * height; i++) {
            rgbBuf[i * 3 + 0] = data[i * 4 + 0];
            rgbBuf[i * 3 + 1] = data[i * 4 + 1];
            rgbBuf[i * 3 + 2] = data[i * 4 + 2];
        }
        const ppmFile = '/home/michde/Documenti/omf2097/screenshots/omf_bundle_verified.ppm';
        fs.writeFileSync(ppmFile, Buffer.concat([Buffer.from(ppmHeader), rgbBuf]));
        console.log(`Saved PPM to ${ppmFile}`);
    }
    
    await ci.exit();
    console.log('Emulation finished cleanly.');
}

testBundle().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
