# Soul Music Live 2

Motor vizual audio-reactiv Full HD pentru TikTok LIVE Studio.

## Faza 1 — YouTube → DJ Soul

DJ Soul poate citi în regim read-only playlistul public `VNB-SOULMUSIC`
prin YouTube Data API v3. Cheia API rămâne numai pe calculatorul Windows:

1. Descarcă proiectul pe PC.
2. Dă dublu-click pe `configure-dj-soul.bat`.
3. Lipește cheia YouTube API când apare solicitarea.
4. La Playlist ID apasă Enter pentru valoarea implicită
   `PLedJ9SZ73vniuUjEsj5oPpog0bMWxUbQG`.
5. Pornește Engine X cu `start-live.bat`.

Fișierul local `dj-soul.local.json` este ignorat de Git și nu trebuie
publicat. Serverul local păstrează cheia în afara browserului și expune doar
statusul conexiunii și catalogul playlistului:

- `/api/dj-soul/status`
- `/api/dj-soul/playlist`

În această fază DJ Soul doar citește catalogul. Nu poate adăuga, muta sau
șterge videoclipuri și nu vorbește automat în LIVE.

## Etapa 0 — Scene Graph

`scene-graph.js` definește sursa unică de adevăr pentru scena 1920 × 1080:

- înregistrează toate grupurile și elementele vizuale;
- păstrează relațiile părinte–copil și ordinea straturilor;
- validează automat elementele DOM obligatorii;
- sincronizează pozițiile în coordonatele native ale scenei;
- oferă API pentru vizibilitate, activare, traversare și snapshot-uri;
- emite evenimentele `soulmusic:scenegraphready` și
  `soulmusic:scenegraphchange`.

API-ul este disponibil în browser prin `window.SoulSceneGraph`.

Exemple pentru consolă:

```js
SoulSceneGraph.getState();
SoulSceneGraph.getSnapshot();
SoulSceneGraph.getNode("soulLogo");
SoulSceneGraph.getNodesByTag("audio");
SoulSceneGraph.setVisible("ticker", false);
SoulSceneGraph.reset();
```

## Pornire pentru TikTok LIVE Studio

1. Descarcă proiectul pe calculatorul Windows.
2. Deschide folderul și dă dublu-click pe `start-live.bat`.
3. În TikTok LIVE Studio adaugă o sursă **Browser Source**.
4. Folosește URL-ul `http://127.0.0.1:8766`.
5. Setează sursa la **1920 × 1080** și **60 FPS**.
6. În panoul Soul Music selectează **CABLE Output** pentru muzică.
7. Selectează microfonul real pentru voce și activează separat cele două canale.

Serverul local folosește numai Windows PowerShell și nu necesită instalarea
Node.js sau Python. Pentru oprire, închide fereastra „Soul Music Local Server”.

### Now Playing

Playerul poate scrie titlul melodiei în `now-playing.txt`. Modificarea este
preluată automat fără refresh și fără oprirea transmisiei. Fișierul gol ascunde
overlay-ul.

### Verificarea LIVE

`live-check.js` verifică automat:

- integrarea tuturor motoarelor;
- scena și canvas-urile Full HD;
- performanța și ținta de 60 FPS;
- selecția CABLE Output și a microfonului real;
- accesibilitatea bridge-ului Now Playing;
- presetul final Soul Music Live.

Rezultatul apare în panoul de control ca `LIVE: READY` sau ca avertizare clară.
