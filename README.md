# Soul Music Live 2

Motor vizual audio-reactiv Full HD pentru TikTok LIVE Studio.

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
