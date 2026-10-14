# omf2097

Tooling per impacchettare ed eseguire *One Must Fall 2097* (1994, Epic MegaGames / Diversions Entertainment) tramite [js-dos](https://js-dos.com/) / DOSBox-X, sia headless (Node) che in un vero browser.

**Repo privato.** Contiene anche i file originali del gioco (`extracted/`, `installed_game/`, ...) come backup personale — non redistribuirli, restano protetti da copyright nonostante l'età.

## Cosa è stato fatto

Obiettivo: far girare OMF2097 dentro un bundle `omf2097.jsdos` (js-dos/DOSBox-X), verificato sia headless sia in un browser vero.

1. **Bug nascosto nei test headless.** `fs.readFileSync` di Node restituisce i file piccoli come viste su un pool di memoria condiviso; `emulators` (il backend di js-dos per Node) scrive l'intero buffer sottostante nel filesystem DOS emulato, corrompendo circa 40 file su 98 (diventavano tutti lo stesso blob da 65600 byte). Risultato: schermo nero e un flood dell'eccezione CPU "divide by zero" — sembrava un crash del gioco, era un bug del test. Fix: copiare sempre i contenuti in un `Uint8Array` proprio prima di passarli all'emulatore (`probe_fs.js` verifica questo automaticamente).
2. **Bug vero.** Con i file integri, il gioco si avviava ma usciva subito con `Please run SETUP.EXE before running OMF.EXE`: il driver audio `MDRV004R.MUS` preso dall'installer non era configurato (manca l'impostazione scheda sonora). Sostituito con la versione configurata (base 220, IRQ 7, DMA 1) ottenuta facendo girare `SETUP.EXE` fino in fondo.
3. **Reverse engineering (REA + Ghidra).** Per isolare il primo bug è stato usato [REA](https://github.com/morluto/rea) con provider Ghidra 12.1.4 per decompilare il launcher `OMF.EXE` (Turbo Pascal, DOS MZ a 16 bit) — ha confermato che il codice del launcher non aveva alcuna `DIV` raggiungibile in quel punto, il che ha spostato il sospetto dal codice ai dati effettivamente caricati, portando al bug #1.
4. **Boot in un browser vero.** I test headless usano `emulators` (`dosboxNode`) direttamente, non il player js-dos reale. Verificato anche in Chrome vero (headless, pilotato via Chrome DevTools Protocol con `cdp_shot.js`, dato che non c'erano Puppeteer/Playwright installati — usato il `WebSocket` nativo di Node) cliccando il tasto play della UI js-dos.
5. **Avvio automatico e schermo intero.** Aggiunte le opzioni del player js-dos v8 `autoStart` (parte senza click), `fullScreen` (richiede comunque un gesto reale dell'utente per policy browser) e `kiosk` (nasconde i controlli).
6. **16:9 senza distorsioni.** Provati `renderAspect: "4/3"` (pillarbox, barre nere, nessuna distorsione) e `"16/9"` (riempie ma stira l'immagine). Verificato che un rapporto fisso lascia barre a meno che la finestra non sia *esattamente* in quel rapporto — `"Fit"` invece riempie sempre il contenitore, qualunque sia la sua forma reale, ed è l'impostazione finale usata.
7. **Scartato OpenOMF** (motore open source alternativo) per ottenere "vero" 16:9: gli sfondi del gioco sono immagini fisse renderizzate nel 1994, non c'è altro campo visivo da rivelare ai lati. Dalla cronologia issue del progetto stesso, anche lì le uniche due opzioni sono stretch o pillarbox — stesso risultato ottenibile in 5 minuti con js-dos, niente ore di build con Docker/Emscripten.

## Screenshot

| | |
|---|---|
| ![Titolo](screenshots/OK_title_2097.png) Logo del gioco (boot headless) | ![Boot in Chrome](screenshots/OK_browser_boot.png) Boot in Chrome vero (CDP) |
| ![Pillarbox](screenshots/OK_pillarbox_16-9.png) `renderAspect: "4/3"` — pillarbox, nessuna distorsione | ![Stretch](screenshots/CONFRONTO_stretch_16-9.png) `renderAspect: "16/9"` — riempie ma stira |
| ![Fit](screenshots/OK_fit_no_bars.png) `renderAspect: "Fit"` — riempie sempre, nessuna barra | |

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
