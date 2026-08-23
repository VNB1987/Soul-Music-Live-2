# Soul Music Engine X + DJ Soul — UNIFICAT

Aceasta este baza unică. Nu mai există doi DJ Soul separați.

## Arhitectură

- Engine X rulează pe `http://127.0.0.1:8988/` și păstrează îngerii/dansatorii, scena celestială, bannerul și audio-reactivitatea.
- `youtube-bridge.ps1` este singura sursă de catalog Soul Music. Cheia YouTube rămâne locală în `dj-soul.local.json` și nu se urcă în Git.
- `dj-soul-core/index.js` este singurul motor DJ Soul: TikTok chat, wake word SOUL, FOLLOW, special guests, gift-uri/praguri, AI, TTS și comenzi private.
- DJ Soul Core citește catalogul de la Engine X prin `/api/dj-soul/playlist`; nu mai există un al doilea catalog obligatoriu.
- `src/dj-soul-live.js` leagă meniul Engine X de DJ Soul Core pe portul local `8990`.
- `media-bridge.ps1` alimentează automat titlul din ferestrele YouTube/Suno/TikTok către banner. Titlul manual rămâne fallback.

## Audio

Panoul are trei rute separate: MUZICĂ RGB = `CABLE Output`, IEȘIRE/PLACĂ = `Speakers (S6)`, MICROFON = `Microphone (S6)`.

## Pornire

1. Configurează YouTube cu `configure-dj-soul.bat`.
2. Asigură-te că `OPENAI_API_KEY`, Node.js și ffplay sunt disponibile.
3. Dublu-click pe `PORNESTE-DJ-SOUL.bat`.
4. La prima pornire se instalează dependențele Node.

## Reguli DJ Soul păstrate

TikTok normal este doar afișat; AI se trezește numai cu `SOUL`. Comanda privată din Engine X este liberă. FOLLOW automat, special guests, gift-uri/praguri 50/100/150/200/250/350/500, simulator `test gift N`, TTS și coada de răspunsuri rămân în același motor.

## Asset-uri

Asset-urile `assets/poses/` și `assets/celestial/` provin din baseline-ul local `engine-x-baseline-2026-08-22` și trebuie păstrate împreună cu acest folder. Nu sunt regenerate de cod.
