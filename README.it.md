<div align="center">

# ONE MUST FALL 2097

### Il classico picchiaduro di robot del 1994, che si avvia nel tuo browser

[English](README.md) · **Italiano**

![js-dos 8.5](https://img.shields.io/badge/js--dos-8.5-1f6feb?style=for-the-badge)
![DOSBox-X WebAssembly](https://img.shields.io/badge/DOSBox--X-WebAssembly-6e40c9?style=for-the-badge)
![Uscito nel 1994](https://img.shields.io/badge/uscito_nel-1994-c62828?style=for-the-badge)

<img src="screenshots/OK_hero_16-9.png" alt="Intro di One Must Fall 2097 a tutta finestra in Chrome" width="820">

*Parte da solo, riempie qualsiasi finestra senza barre nere, nessuna interfaccia del player in mezzo.*

</div>

---

## Avvio rapido

```bash
git clone https://github.com/mich-de/omf2097.git
cd omf2097
npm install
python3 -m http.server 8734
```

Apri **http://127.0.0.1:8734/browser_test.html**. Il gioco si avvia da solo e riempie la finestra. Premi `F11` per lo schermo intero vero: i browser lo permettono solo dopo un'azione dell'utente.

## In evidenza

- **Zero clic.** `autoStart` di js-dos v8 salta la schermata con il tasto play, `kiosk` nasconde l'interfaccia del player.
- **Qualsiasi formato di schermo.** `renderAspect: "Fit"` riempie la finestra da bordo a bordo, che sia 16:9, 16:10 o altro.
- **Verificato in un browser vero.** Non solo nell'emulatore di Node: testato in Chrome, pilotato tramite il DevTools Protocol.
- **Kit di test headless.** Avvia programmi DOS da Node, invia tasti, cattura ogni frame nuovo, modifica i file in memoria.

## Come è tornato in vita

1. **Lo schermo nero che non era colpa del gioco.** Nei test headless si vedeva uno schermo nero e milioni di errori CPU di divisione per zero. Il vero colpevole: `fs.readFileSync` di Node restituisce i file piccoli come viste su un pool di memoria condiviso, e l'emulatore copiava l'intero pool sul disco DOS. 40 file su 98 arrivavano come lo stesso blocco da 65.600 byte, quindi `OMF.EXE` eseguiva in realtà i byte di altri file. La soluzione: dare all'emulatore una copia `Uint8Array` propria di ogni file. `probe_fs.js` ora lo controlla prima di ogni test.
2. **"Please run SETUP.EXE".** Con i file integri il gioco partiva e si chiudeva subito. Il driver SoundBlaster `MDRV004R.MUS` preso dall'installer non conteneva le impostazioni della scheda. Sostituirlo con una copia già configurata (porta 220, IRQ 7, DMA 1) ha risolto.
3. **Dentro il launcher.** [REA](https://github.com/morluto/rea) con Ghidra 12.1.4 ha decompilato `OMF.EXE`, un launcher Turbo Pascal a 16 bit. Non contiene istruzioni di divisione che possano fallire in quel punto, e questo ha spostato l'indagine dal codice ai byte effettivamente caricati.
4. **Da Node a un browser vero.** `cdp_shot.js` pilota Chrome headless tramite il DevTools Protocol con il `WebSocket` integrato in Node, senza Puppeteer: carica la pagina, clicca, aspetta, fa lo screenshot.
5. **16:9 fatto bene.** `4/3` mantiene le proporzioni originali con bande nere ai lati. `16/9` riempie la finestra solo se è esattamente 16:9. `Fit` riempie sempre. Gli sfondi delle arene sono immagini fisse renderizzate nel 1994, quindi ai lati non c'è altro campo visivo da scoprire; per lo stesso motivo un remake del motore come OpenOMF non mostrerebbe più arena.

## Screenshot

| | |
|:---:|:---:|
| <img src="screenshots/OK_title_2097.png" width="400"><br>Schermata del titolo, avvio headless in Node | <img src="screenshots/OK_browser_boot.png" width="400"><br>Player js-dos in Chrome |
| <img src="screenshots/OK_pillarbox_16-9.png" width="400"><br>`renderAspect: "4/3"`: bande laterali, nessuna distorsione | <img src="screenshots/CONFRONTO_stretch_16-9.png" width="400"><br>`renderAspect: "16/9"`: immagine stirata |
| <img src="screenshots/OK_fit_no_bars.png" width="400"><br>`renderAspect: "Fit"`: riempie sempre | |

## Cosa c'è nel repo

| Percorso | Cos'è |
|---|---|
| `browser_test.html` | Pagina del player a tutta finestra (js-dos v8, backend DOSBox-X) |
| `omf2097.jsdos` | Bundle pronto da avviare: file del gioco più configurazione DOSBox |
| `installed_game/` | Gioco installato e configurato |
| `extracted/` | Contenuto originale del CD: installer e manuali |
| `omf_clean_test/`, `*.zip`, `*.iso` | Archivi di origine e una copia preinstallata di riferimento |
| `probe.js` | Esecuzione DOSBox headless: cattura dei frame, invio tasti, modifiche ai file in memoria |
| `probe_fs.js` | Controlla che l'emulatore veda i file identici byte per byte |
| `cdp_shot.js` | Pilota Chrome via CDP: carica, aspetta, clicca, fa lo screenshot |
| `test_*.js`, `run_setup_gen.js` | Esperimenti precedenti di installazione e setup |

## Strumenti

```bash
# L'emulatore vede i file integri?
node probe_fs.js installed_game

# Avvia qualcosa in headless e salva ogni frame nuovo in screenshots/
node probe.js dosbox "OMF.EXE" 30 mytag
# variabili: DIR=  BUNDLE=<file.jsdos>  KEYS="sec:keycode,..."  STEP_MS=
#            OVERRIDE="FILE=path"  EXCLUDE="FILE,..."  PATCH="FILE@offset:hexbytes"

# Screenshot della pagina in Chrome vero
google-chrome-stable --headless=new --remote-debugging-port=9333 --remote-allow-origins='*' --window-size=1280,720 about:blank &
node cdp_shot.js "http://127.0.0.1:8734/browser_test.html" 20000 out.png [x,y] [waitAfterClickMs]
```

## Opzioni di visualizzazione

`browser_test.html` passa queste opzioni a `Dos()` di js-dos v8:

| Opzione | Valore | Effetto |
|---|---|---|
| `autoStart` | `true` | Si avvia senza il tasto play |
| `kiosk` | `true` | Nasconde la barra laterale del player |
| `fullScreen` | `true` | Chiede lo schermo intero; il browser lo concede solo dopo un'azione dell'utente |
| `renderAspect` | `"Fit"` | Riempie la finestra. Altri valori: `"AsIs"`, `"4/3"`, `"16/9"`, `"16/10"`, `"5/4"`, `"1/1"` |
