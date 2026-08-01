# Soul Music Live 2

Motor vizual audio-reactiv Full HD pentru TikTok LIVE Studio.

## Design V2 — Pasul 5: Now Playing generos

Now Playing este fixat sus, între cadrul vertical și zona TikTok, într-o bandă
de 900 × 132 px care rămâne stabilă și nu mai urmează mișcarea camerei.

- titlu adaptiv între 27 și 42 px, cu maximum două rânduri;
- artist, sursă, logo/artwork și marcaj `ORIGINAL MUSIC`;
- neon auriu permanent și accent roșu numai în `Red Voice`;
- fără micșorarea automată care făcea titlul greu de citit;
- tranziții line la schimbarea melodiei și ascundere pentru bridge gol;
- zonă sigură: 23 px după cadrul stâng și minimum 105 px înainte de TikTok;
- efectele costisitoare se reduc automat pe profilurile Performance/Emergency.

## Design V2 — Pasul 6: momente Soul Music

`moments.js` adaugă șase momente editoriale care pot fi lansate din panou sau
de la tastatură, fără a opri automatizarea Scene Director:

- `Shift+1` — Bun venit;
- `Shift+2` — Follow;
- `Shift+3` — Mulțumesc;
- `Shift+4` — Original Music;
- `Shift+5` — Bass Drop;
- `Shift+6` — Legendary.

Fiecare moment combină o scenă a orgii cu propoziția potrivită din banner, are
o durată controlată și revine automat la regia audio. Un moment nou îl
înlocuiește sigur pe cel activ, iar apăsările repetate sunt filtrate. Microfonul
real rămâne prioritar: scena roșie întrerupe temporar momentul, după care acesta
continuă până la expirare. Reset oprește imediat orice moment manual.

## Design V2 — Pasul 4: banner inteligent

`smart-banner.js` înlocuiește rularea continuă greu de citit cu mesaje
focalizate: intrare, timp generos de lectură și ieșire lină.

- 12 propoziții Soul Music, fiecare cu paletă și mișcare proprie;
- text dimensionat automat între 38 și 52 px pentru a rămâne complet vizibil;
- bannerul începe la 560 px, după cadrul stâng, fără nicio suprapunere;
- scena microfonului adaugă accent roșu fără să elimine culoarea mesajului;
- Soul Flow, Bass Crown și Legendary schimbă controlat viteza luminii;
- profilurile de performanță reduc blurul, dar păstrează textul lizibil;
- API manual pentru mesajul următor, anterior sau alegerea directă.

Bannerul vechi rămâne disponibil ca rezervă, dar nu mai poate suprascrie
noul motor cât timp acesta este activ.

## Design V2 — Pasul 3: neon inteligent pentru cadre

`frame-neon.js` preia exclusiv cele două rame principale:

- cadrul stâng păstrează neon auriu permanent și două impulsuri luminoase care
  călătoresc în sens opus pe întregul perimetru;
- cadrul camerei păstrează un neon auriu stabil, cu respirație lentă;
- scena `Red Voice` transformă controlat ambele rame în roșu și le pulsează
  după energia microfonului;
- viteza și intensitatea răspund diferit la Soul Flow, Bass Crown și Legendary;
- profilurile de performanță reduc automat blurul și al doilea runner.

Motorul vechi de efecte continuă să funcționeze, dar nu mai poate suprascrie
culorile sau mișcarea neonului noilor cadre.

## Design V2 — Pasul 2: patru scene pentru orga logo-ului

`logo-scenes.js` desenează noua orgă pe un strat Full HD dedicat, controlat
direct de Scene Director:

- `Soul Flow` — coloane fine aurii și cyan, fluide și simetrice;
- `Bass Crown` — o coroană de bass ridicată deasupra aripilor;
- `Legendary Wings` — raze ample, simetrice, rezervate momentelor puternice;
- `Red Voice` — undă roșie distinctă pentru microfon.

Scena `idle` păstrează doar o respirație aurie discretă. Trecerea dintre scene
este graduală, densitatea se adaptează automat la bugetul de performanță, iar
desenul vechii orgi este dezactivat exclusiv cât timp noul renderer funcționează,
fără a opri analiza audio sau reacția logo-ului.

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
