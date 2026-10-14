<div align="center">

# ONE MUST FALL 2097

### The 1994 robot fighting classic, booting in your browser

**English** · [Italiano](README.it.md)

![js-dos 8.5](https://img.shields.io/badge/js--dos-8.5-1f6feb?style=for-the-badge)
![DOSBox-X WebAssembly](https://img.shields.io/badge/DOSBox--X-WebAssembly-6e40c9?style=for-the-badge)
![Released 1994](https://img.shields.io/badge/released-1994-c62828?style=for-the-badge)

[![▶ PLAY ONLINE](https://img.shields.io/badge/%E2%96%B6_PLAY_ONLINE-mich--de.github.io%2Fomf2097-ff6d2e?style=for-the-badge)](https://mich-de.github.io/omf2097/)

**▶ [Play it now in your browser → mich-de.github.io/omf2097](https://mich-de.github.io/omf2097/)**

<img src="screenshots/OK_hero_16-9.png" alt="One Must Fall 2097 intro running full-window in Chrome" width="820">

*Desktop and mobile, one page: it starts on its own and fills the screen.*

</div>

---

## Play online

No install needed: open **https://mich-de.github.io/omf2097/**, pick **Regular Game** and wait for the ~15 MB download.

- **Desktop:** the game fills the window. Arrow keys to move, `Enter` to punch, `Right Shift` to kick, `Esc` for the menu. Move the mouse to show the full screen button (top left), or press `F11`.
- **Phone and tablet:** an on-screen pad appears with **PUNCH**, **KICK**, **ESC** and a full screen button. Starting the game asks for landscape full screen where the browser allows it (Android does, iPhone doesn't).
- **Nova:** on the robot selection screen of a one-player game, a **+ NOVA** tile (desktop, or press `N`) or a **PLAY WITH NOVA** button above KICK (phone) appears. The page performs the original cheat for you and picks Nova, with any pilot. In a two-player game player 2 still has to do the cheat by hand.
- **Leaving:** pick **QUIT** in the game's main menu (`Esc` jumps to it) and the page goes back to the start screen.

One Must Fall 2097 has been freeware since 1999. This repo is also the site: GitHub Pages serves it straight from the root.

## Quick start

```bash
git clone https://github.com/mich-de/omf2097.git
cd omf2097
python3 -m http.server 8734
```

Open **http://127.0.0.1:8734/** and pick **Regular Game**. Add `?touch=1` to the address to try the mobile controls on a computer. `npm install` is only needed for the Node tools below.

## Highlights

- **One page for desktop and mobile.** Touch screens get an on-screen pad and buttons; keyboards just work.
- **A launcher made of the game's own art.** Background, lettering and panels come from the 1994 NetArena screens shipped with the game.
- **Tuned settings.** 50% game speed, Gravis Ultrasound stereo sound, full emulated CPU.
- **Headless test kit.** Boot DOS programs from Node, inject keys, capture every new frame, patch files in memory, drive real Chrome over the DevTools Protocol.

## How it was brought back to life

1. **The black screen that wasn't the game.** Headless runs showed a black screen and millions of CPU divide-by-zero faults. The real culprit: Node's `fs.readFileSync` returns small files as views on a shared memory pool, and the emulator copied the whole pool onto the DOS disk. 40 of 98 files arrived as the same 65,600-byte blob, so `OMF.EXE` was running other files' bytes. The fix: give the emulator its own `Uint8Array` copy of each file. `probe_fs.js` now checks this before any test.
2. **"Please run SETUP.EXE".** With intact files the game started, then quit straight away. The SoundBlaster driver `MDRV004R.MUS` from the installer had no card settings in it. Swapping in a configured copy (port 220, IRQ 7, DMA 1) fixed it.
3. **Reading the launcher.** [REA](https://github.com/morluto/rea) with Ghidra 12.1.4 decompiled `OMF.EXE`, a 16-bit Turbo Pascal launcher. It contains no divide instruction that could fault at that point, which moved the investigation from the code to the bytes actually being loaded.
4. **From Node to a real browser.** `cdp_shot.js` drives headless Chrome through the DevTools Protocol with Node's built-in `WebSocket`, no Puppeteer needed: load the page, click, wait, screenshot.
5. **16:9 done right.** `4/3` keeps the original proportions with black side bars. `16/9` fills the window only when it is exactly 16:9. `Fit` always fills. The arena backgrounds are fixed 1994 renders, so there is no hidden field of view to reveal at the sides; that is also why an engine remake such as OpenOMF would not show more of the arena.
6. **A launcher in the game's own style.** The page uses `NETMEGA.PCX` as its background, draws its lettering pixel by pixel with the `NETFONT1.PCX` bitmap font and the original colours, and builds its info panels on the `NETSET.PCX` blue grid. It stays up through the DOS boot text and hands over when the game switches to graphics.
7. **Touch controls that speak the game's language.** The pad and buttons send exactly the keys player 1 is bound to in `SETUP.CFG`: arrows plus the keypad diagonals, `Enter` to punch, `Right Shift` to kick. On touch screens the game keeps 4:3 so the controls sit in the side bands.
8. **Settings at their best.** Game speed now defaults to 50% (`SETUP.CFG` byte 0; 100% was far too fast). Sound moved from a mono Sound Blaster setup that clipped to Gravis Ultrasound stereo, configured with the game's own `SETUP.EXE`. The emulator runs at `cycles=max`.
9. **Nova without the cheat.** The robot grid has ten fixed slots and Nova has none: the only way in is the original cheat (visit all ten slots, press Down 11+ times on Katana, pick Flail). The page recognises the robot screen (one portrait in colour, nine in grey), and the NOVA tile replays the cheat, reading the cursor from the screen after every key so it works from any starting position.

## Screenshots

| | |
|:---:|:---:|
| <img src="screenshots/OK_launcher_desktop.png" width="400"><br>Launcher on desktop | <img src="screenshots/OK_mobile_touch.png" width="400"><br>Phone: pad and buttons while fighting |
| <img src="screenshots/OK_title_2097.png" width="400"><br>Title screen, headless Node run | <img src="screenshots/OK_browser_boot.png" width="400"><br>js-dos player in Chrome |
| <img src="screenshots/OK_pillarbox_16-9.png" width="400"><br>`renderAspect: "4/3"`: side bars, no distortion | <img src="screenshots/CONFRONTO_stretch_16-9.png" width="400"><br>`renderAspect: "16/9"`: stretched |
| <img src="screenshots/OK_fit_no_bars.png" width="400"><br>`renderAspect: "Fit"`: always fills | |

## Game settings

| Setting | Value | Where |
|---|---|---|
| Game speed | 50% | `SETUP.CFG` byte 0 (`game_speed`, 0-10) |
| Sound | Gravis Ultrasound, stereo (240 / IRQ 5 / DMA 3) | `SOUNDCRD.INF`, `MDRV003R.MUS`, `gus=true` in `dosbox.conf` |
| Emulated CPU | `cycles=max` | `dosbox.conf` and `jsdos.json` in the bundle |
| Video | Shadows high, animations, palette animation and screen shakes on | Game defaults, already the maximum |

## What's in the repo

| Path | What it is |
|---|---|
| `index.html` | The game page: launcher, js-dos player, touch controls |
| `js-dos/` | js-dos 8.5 player and the DOSBox-X WebAssembly build served with the page |
| `assets/` | Launcher art taken from the game (`NETMEGA.PCX` background, logo) |
| `omf2097.jsdos` | Ready-to-run bundle: game files plus DOSBox config |
| `installed_game/` | Installed, configured game |
| `extracted/` | Original CD contents: installer and manuals |
| `omf_clean_test/`, `*.zip`, `*.iso` | Source archives and a pre-installed reference copy |
| `browser_test.html` | Minimal test page used during development (needs `npm install`) |
| `probe.js` | Headless DOSBox runner: frame capture, key injection, in-memory file patches |
| `probe_fs.js` | Checks that the emulator sees byte-identical files |
| `cdp_shot.js` | Drives Chrome over CDP: load, wait, click, screenshot, evaluate |
| `test_*.js`, `run_setup_gen.js` | Earlier install and setup experiments |

## Tools

```bash
npm install

# Does the emulator see your files intact?
node probe_fs.js installed_game

# Boot something headless and save every new frame to screenshots/
node probe.js dosbox "OMF.EXE" 30 mytag
# env: DIR=  BUNDLE=<file.jsdos>  KEYS="sec:keycode,..."  STEP_MS=
#      OVERRIDE="FILE=path"  EXCLUDE="FILE,..."  PATCH="FILE@offset:hexbytes"

# Screenshot the page in real Chrome
google-chrome-stable --headless=new --remote-debugging-port=9333 --remote-allow-origins='*' --window-size=1280,720 about:blank &
node cdp_shot.js "http://127.0.0.1:8734/" 20000 out.png [x,y] [waitAfterClickMs]
```

## Display options

`index.html` passes these to js-dos v8's `Dos()`:

| Option | Value | Effect |
|---|---|---|
| `autoStart` | `true` | Boots as soon as **Regular Game** is picked, no play button |
| `kiosk` | `true` | Hides the js-dos sidebar |
| `renderAspect` | `"Fit"` on desktop, `"4/3"` on touch | Desktop fills the window; on touch screens 4:3 leaves side bands for the controls |
| touch mode | `(pointer: coarse)` | Detected automatically; `?touch=1` forces it on, `?touch=0` off |

Other `renderAspect` values: `"AsIs"`, `"16/9"`, `"16/10"`, `"5/4"`, `"1/1"`.
