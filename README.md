# Soul Music Live 2

Motor vizual audio-reactiv Full HD pentru TikTok LIVE Studio.

## Design V2 — Pasul 1: Scene Director

`scene-director.js` este regizorul automat care pregătește noul design fără
să modifice layoutul stabil. El alege controlat între:

- `idle` — repaus elegant;
- `soul-flow` — muzică fluidă;
- `bass-crown` — bass și beat dominante;
- `legendary-wings` — moment energetic cu cooldown;
- `red-voice` — scenă prioritară pentru microfon.

Directorul folosește timpi minimi, confirmări și hysteresis pentru a evita
schimbările haotice. Starea curentă este publicată prin `data-soul-scene`,
variabile CSS și evenimentul `soulmusic:scenechange`. API-ul oferă și control
manual prin `SoulSceneDirector.setManualScene(...)` și revenire automată prin
`SoulSceneDirector.clearManualScene()`.

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
