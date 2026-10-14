<div align="center">

**▶ Gioca online:** https://mich-de.github.io/0mf2097/ (sito pubblicato dal repo pubblico [mich-de/0mf2097](https://github.com/mich-de/0mf2097), generato da `git subtree split --prefix=0mf2097`)


# ONE MUST FALL 2097

### The 1994 robot fighting classic, booting in your browser

**English** · [Italiano](README.it.md)

![js-dos 8.5](https://img.shields.io/badge/js--dos-8.5-1f6feb?style=for-the-badge)
![DOSBox-X WebAssembly](https://img.shields.io/badge/DOSBox--X-WebAssembly-6e40c9?style=for-the-badge)
![Released 1994](https://img.shields.io/badge/released-1994-c62828?style=for-the-badge)

<img src="screenshots/OK_hero_16-9.png" alt="One Must Fall 2097 intro running full-window in Chrome" width="820">

*Starts on its own, fills any window with no black bars, no player UI in the way.*

</div>

---

## Quick start

```bash
git clone https://github.com/mich-de/omf2097.git
cd omf2097
npm install
python3 -m http.server 8734
```

Open **http://127.0.0.1:8734/browser_test.html**. The game boots by itself and fills the window. Press `F11` for true full screen: browsers only allow it after a user action.

## Highlights

- **Zero clicks.** js-dos v8 `autoStart` skips the play screen, `kiosk` hides the player UI.
- **Any screen shape.** `renderAspect: "Fit"` fills the window edge to edge, whether it is 16:9, 16:10 or anything else.
- **Verified in a real browser.** Not just the Node emulator: tested in Chrome, driven over the DevTools Protocol.
- **Headless test kit.** Boot DOS programs from Node, inject keys, capture every new frame, patch files in memory.

## How it was brought back to life

1. **The black screen that wasn't the game.** Headless runs showed a black screen and millions of CPU divide-by-zero faults. The real culprit: Node's `fs.readFileSync` returns small files as views on a shared memory pool, and the emulator copied the whole pool onto the DOS disk. 40 of 98 files arrived as the same 65,600-byte blob, so `OMF.EXE` was running other files' bytes. The fix: give the emulator its own `Uint8Array` copy of each file. `probe_fs.js` now checks this before any test.
2. **"Please run SETUP.EXE".** With intact files the game started, then quit straight away. The SoundBlaster driver `MDRV004R.MUS` from the installer had no card settings in it. Swapping in a configured copy (port 220, IRQ 7, DMA 1) fixed it.
3. **Reading the launcher.** [REA](https://github.com/morluto/rea) with Ghidra 12.1.4 decompiled `OMF.EXE`, a 16-bit Turbo Pascal launcher. It contains no divide instruction that could fault at that point, which moved the investigation from the code to the bytes actually being loaded.
4. **From Node to a real browser.** `cdp_shot.js` drives headless Chrome through the DevTools Protocol with Node's built-in `WebSocket`, no Puppeteer needed: load the page, click, wait, screenshot.
5. **16:9 done right.** `4/3` keeps the original proportions with black side bars. `16/9` fills the window only when it is exactly 16:9. `Fit` always fills. The arena backgrounds are fixed 1994 renders, so there is no hidden field of view to reveal at the sides; that is also why an engine remake such as OpenOMF would not show more of the arena.

## Screenshots

| | |
|:---:|:---:|
| <img src="screenshots/OK_title_2097.png" width="400"><br>Title screen, headless Node run | <img src="screenshots/OK_browser_boot.png" width="400"><br>js-dos player in Chrome |
| <img src="screenshots/OK_pillarbox_16-9.png" width="400"><br>`renderAspect: "4/3"`: side bars, no distortion | <img src="screenshots/CONFRONTO_stretch_16-9.png" width="400"><br>`renderAspect: "16/9"`: stretched |
| <img src="screenshots/OK_fit_no_bars.png" width="400"><br>`renderAspect: "Fit"`: always fills | |

## What's in the repo

| Path | What it is |
|---|---|
| `browser_test.html` | Full-window player page (js-dos v8, DOSBox-X backend) |
| `omf2097.jsdos` | Ready-to-run bundle: game files plus DOSBox config |
| `installed_game/` | Installed, configured game |
| `extracted/` | Original CD contents: installer and manuals |
| `omf_clean_test/`, `*.zip`, `*.iso` | Source archives and a pre-installed reference copy |
| `probe.js` | Headless DOSBox runner: frame capture, key injection, in-memory file patches |
| `probe_fs.js` | Checks that the emulator sees byte-identical files |
| `cdp_shot.js` | Drives Chrome over CDP: load, wait, click, screenshot |
| `test_*.js`, `run_setup_gen.js` | Earlier install and setup experiments |

## Tools

```bash
# Does the emulator see your files intact?
node probe_fs.js installed_game

# Boot something headless and save every new frame to screenshots/
node probe.js dosbox "OMF.EXE" 30 mytag
# env: DIR=  BUNDLE=<file.jsdos>  KEYS="sec:keycode,..."  STEP_MS=
#      OVERRIDE="FILE=path"  EXCLUDE="FILE,..."  PATCH="FILE@offset:hexbytes"

# Screenshot the page in real Chrome
google-chrome-stable --headless=new --remote-debugging-port=9333 --remote-allow-origins='*' --window-size=1280,720 about:blank &
node cdp_shot.js "http://127.0.0.1:8734/browser_test.html" 20000 out.png [x,y] [waitAfterClickMs]
```

## Display options

`browser_test.html` passes these to js-dos v8's `Dos()`:

| Option | Value | Effect |
|---|---|---|
| `autoStart` | `true` | Boots without the play button |
| `kiosk` | `true` | Hides the player sidebar |
| `fullScreen` | `true` | Requests full screen; the browser grants it only after a user action |
| `renderAspect` | `"Fit"` | Fills the window. Other values: `"AsIs"`, `"4/3"`, `"16/9"`, `"16/10"`, `"5/4"`, `"1/1"` |
