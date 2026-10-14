# omf2097

Tooling per impacchettare ed eseguire *One Must Fall 2097* (1994, Epic MegaGames / Diversions Entertainment) tramite [js-dos](https://js-dos.com/) / DOSBox-X, sia headless (Node) che in un vero browser.

**Questo repo non contiene i file del gioco.** Servono i tuoi file originali, posseduti legalmente, estratti e installati dentro `installed_game/` (ignorata da git).

## Setup

```bash
npm install
```

Metti una copia installata/configurata del gioco (file `.EXE`, `.BK`, `.DAT`, ... oltre a `OMF.CFG`/`SETUP.CFG`/`SETUP.INI`/`SOUNDCRD.INF` generati da `SETUP.EXE`) in `installed_game/`.

## Script

- `probe_fs.js` — verifica che i file passati all'emulatore arrivino integri al filesystem DOS. Da lanciare *prima* di fidarsi di qualunque test: `fs.readFileSync` restituisce buffer su un pool condiviso che l'emulatore scrive per intero, corrompendo i file piccoli se non copiati in un `Uint8Array` proprio.
  ```bash
  node probe_fs.js installed_game
  ```
- `probe.js` — avvia una sessione DOSBox headless e cattura screenshot ad ogni frame nuovo.
  ```bash
  node probe.js dosbox "OMF.EXE" 30 nome_tag
  # variabili: DIR=, BUNDLE=<file.jsdos>, KEYS="secondo:keycode,...", STEP_MS=, OVERRIDE="FILE=path", EXCLUDE="FILE,...", PATCH="FILE@offset:hexbytes"
  ```
- `test_clean_run.js`, `test_archive_run.js`, `test_bundle.js`, `run_setup_gen.js` — script di installazione/setup originali del progetto.
- `browser_test.html` + `cdp_shot.js` — harness per testare il bundle `.jsdos` in Chrome vero (via Chrome DevTools Protocol, non solo l'emulatore Node):
  ```bash
  python3 -m http.server 8734
  node cdp_shot.js "http://127.0.0.1:8734/browser_test.html" 20000 out.png [x,y] [waitAfterClickMs]
  ```

## Opzioni display (`browser_test.html`)

Il player js-dos v8 accetta, tra le altre, `autoStart`, `fullScreen`, `kiosk`, `renderAspect` (`"AsIs"`, `"4/3"`, `"16/9"`, `"16/10"`, `"5/4"`, `"1/1"`, `"Fit"`). `"Fit"` riempie sempre il contenitore senza barre nere, qualunque sia la proporzione reale della finestra; i valori fissi (es. `"16/9"`) lasciano barre a meno che la finestra non abbia *esattamente* quel rapporto.
