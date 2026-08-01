"use strict";

/*
  SOUL MUSIC CAMERA ENGINE — ETAPA 1

  Cameră virtuală cinematică pentru scena 1920 × 1080.
  Generează zoom lent, plutire naturală, parallax pe straturi
  și profunzime fără să modifice direct designul existent.

  În Etapa 1 modulul este independent. Conectarea lui la
  Scene Graph, Engine X și CSS se face într-o etapă ulterioară.
*/

const SoulCamera = {
  version: "0.1.0-stage1",

  width: 1920,
  height: 1080,

  mode: "live",
  enabled: true,
  paused: false,
  running: false,
  reducedMotion: false,

  sceneGraph: null,
  animationFrameId: null,
  lastTime: 0,

  presets: {
    calm: {
      zoom: 0.006,
      driftX: 4.5,
      driftY: 2.8,
      roll: 0.035,
      speed: 0.000040,
      parallax: 0.42,
      audioInfluence: 0.10
    },

    live: {
      zoom: 0.012,
      driftX: 8.5,
      driftY: 5.2,
      roll: 0.060,
      speed: 0.000055,
      parallax: 0.66,
      audioInfluence: 0.18
    },

    party: {
      zoom: 0.018,
      driftX: 12.5,
      driftY: 7.8,
      roll: 0.085,
      speed: 0.000075,
      parallax: 0.84,
      audioInfluence: 0.28
    },

    legendary: {
      zoom: 0.024,
      driftX: 17,
      driftY: 10.5,
      roll: 0.115,
      speed: 0.000095,
      parallax: 1,
      audioInfluence: 0.40
    }
  },

  layerDepths: {
    stage: 0,
    backgroundGroup: 0.08,
    ambientCanvas: 0.14,
    visualizerCanvas: 0.28,
    contentGroup: 0.44,
    leftFrame: 0.52,
    logoGroup: 0.72,
    logoAmbientGlow: 0.58,
    logoAfterglow: 0.62,
    logoVoiceGlow: 0.68,
    soulLogo: 0.78,
    tiktokButton: 0.84,
    liveButton: 0.88,
    cameraFrame: 0.64,
    effectsGroup: 0.90,
    effectsCanvas: 1,
    hudGroup: 0.32,
    ticker: 0.36
  },

  frame: {
    time: 0,
    x: 0,
    y: 0,
    zoom: 1,
    roll: 0,
    energy: 0,
    focusX: 960,
    focusY: 540
  },

  init(options = {}) {
    if (options.sceneGraph) {
      this.connect(
        options.sceneGraph
      );
    }

    if (options.mode) {
      this.setMode(
        options.mode,
        false
      );
    }

    if (
      typeof options.reducedMotion ===
      "boolean"
    ) {
      this.reducedMotion =
        options.reducedMotion;
    } else {
      this.detectReducedMotion();
    }

    this.bindEvents();
    this.reset(false);

    if (options.autoStart) {
      this.start();
    }

    this.emit(
      "soulmusic:cameraready",
      this.getState()
    );

    return this.getState();
  },

  connect(sceneGraph) {
    if (
      !sceneGraph ||
      typeof sceneGraph.getRenderList !==
      "function"
    ) {
      return false;
    }

    this.sceneGraph =
      sceneGraph;

    return true;
  },

  disconnect() {
    this.sceneGraph = null;
  },

  detectReducedMotion() {
    const runtime =
      this.getRuntime();

    this.reducedMotion =
      Boolean(
        runtime?.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        ).matches
      );
  },

  bindEvents() {
    const runtime =
      this.getRuntime();

    if (
      !runtime ||
      this.eventsBound
    ) {
      return;
    }

    this.eventsBound = true;

    runtime.addEventListener?.(
      "soulmusic:pause",
      () => this.pause()
    );

    runtime.addEventListener?.(
      "soulmusic:resume",
      () => this.resume()
    );

    runtime.addEventListener?.(
      "soulmusic:reset",
      () => this.reset()
    );

    runtime.addEventListener?.(
      "soulmusic:modechange",
      event => {
        const mode =
          event.detail?.mode;

        if (mode) {
          this.setMode(mode);
        }
      }
    );
  },

  setMode(
    mode,
    notify = true
  ) {
    if (!this.presets[mode]) {
      return false;
    }

    this.mode = mode;

    if (notify) {
      this.emit(
        "soulmusic:cameramodechange",
        {
          mode,
          preset: {
            ...this.presets[mode]
          }
        }
      );
    }

    return true;
  },

  setEnabled(enabled) {
    this.enabled =
      Boolean(enabled);

    if (!this.enabled) {
      this.reset();
    }

    this.emit(
      "soulmusic:camerastatechange",
      this.getState()
    );
  },

  setReducedMotion(enabled) {
    this.reducedMotion =
      Boolean(enabled);

    if (this.reducedMotion) {
      this.reset();
    }
  },

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.paused = false;
    this.lastTime = 0;

    this.scheduleNextFrame();
  },

  stop() {
    const runtime =
      this.getRuntime();

    if (
      this.animationFrameId !== null
    ) {
      runtime?.cancelAnimationFrame?.(
        this.animationFrameId
      );
    }

    this.animationFrameId = null;
    this.running = false;
    this.lastTime = 0;
  },

  pause() {
    this.paused = true;
  },

  resume() {
    this.paused = false;
    this.lastTime = 0;

    if (this.running) {
      this.scheduleNextFrame();
    }
  },

  scheduleNextFrame() {
    const runtime =
      this.getRuntime();

    if (
      !this.running ||
      !runtime?.requestAnimationFrame
    ) {
      return;
    }

    if (
      this.animationFrameId !== null
    ) {
      return;
    }

    this.animationFrameId =
      runtime.requestAnimationFrame(
        time => {
          this.animationFrameId = null;
          this.tick(time);
        }
      );
  },

  tick(time = 0) {
    if (!this.running) {
      return;
    }

    if (!this.paused) {
      const audio =
        this.getAudioState();

      const engine =
        this.getEngineState();

      this.update(
        time,
        audio,
        engine
      );

      this.publishFrame();
    }

    this.scheduleNextFrame();
  },

  update(
    time = 0,
    audio = {},
    engine = {}
  ) {
    if (
      !this.enabled ||
      this.paused ||
      this.reducedMotion
    ) {
      return this.reset(false);
    }

    if (
      engine.mode &&
      this.presets[engine.mode]
    ) {
      this.mode =
        engine.mode;
    }

    const preset =
      this.presets[this.mode] ||
      this.presets.live;

    const energy =
      this.getAudioEnergy(audio);

    const phase =
      time * preset.speed;

    const slowWave =
      Math.sin(phase);

    const secondaryWave =
      Math.sin(
        phase * 0.43 +
        1.72
      );

    const verticalWave =
      Math.sin(
        phase * 0.71 +
        0.84
      );

    const breathing =
      0.5 +
      0.5 *
      Math.sin(
        phase * 0.31 -
        0.55
      );

    const audioMotion =
      energy *
      preset.audioInfluence;

    const x =
      slowWave *
      preset.driftX +
      secondaryWave *
      preset.driftX *
      0.28;

    const y =
      verticalWave *
      preset.driftY +
      Math.sin(
        phase * 0.27 +
        2.1
      ) *
      preset.driftY *
      0.22;

    const zoom =
      1 +
      breathing *
      preset.zoom +
      audioMotion *
      0.006;

    const roll =
      Math.sin(
        phase * 0.53 -
        1.25
      ) *
      preset.roll;

    this.frame = {
      time,
      x,
      y,
      zoom,
      roll,
      energy,
      focusX:
        this.width / 2 +
        x * 1.8,
      focusY:
        this.height / 2 +
        y * 1.8
    };

    return this.getFrame();
  },

  getAudioEnergy(audio = {}) {
    const music =
      audio.music || {};

    const voice =
      audio.voice || {};

    const voiceEnergy =
      voice.detected
        ? Number(
            voice.energy ||
            voice.level ||
            0
          )
        : 0;

    const combined =
      Number(music.level || 0) *
        0.48 +
      Number(music.bass || 0) *
        0.32 +
      Number(music.mids || 0) *
        0.12 +
      Number(music.highs || 0) *
        0.08 +
      voiceEnergy *
        0.18;

    return this.clamp(
      combined,
      0,
      1
    );
  },

  getDepth(nodeOrId) {
    const id =
      typeof nodeOrId ===
      "string"
        ? nodeOrId
        : nodeOrId?.id;

    if (
      id &&
      Number.isFinite(
        this.layerDepths[id]
      )
    ) {
      return this.layerDepths[id];
    }

    const node =
      typeof nodeOrId ===
      "object"
        ? nodeOrId
        : null;

    if (node?.tags?.includes("effects")) {
      return 0.92;
    }

    if (node?.tags?.includes("logo")) {
      return 0.74;
    }

    if (node?.tags?.includes("background")) {
      return 0.12;
    }

    if (node?.tags?.includes("hud")) {
      return 0.30;
    }

    return 0.5;
  },

  setDepth(
    id,
    depth
  ) {
    if (
      !id ||
      !Number.isFinite(depth)
    ) {
      return false;
    }

    this.layerDepths[id] =
      this.clamp(
        depth,
        0,
        1
      );

    return true;
  },

  getLayerTransform(
    nodeOrId,
    frame = this.frame
  ) {
    const preset =
      this.presets[this.mode] ||
      this.presets.live;

    const depth =
      this.getDepth(nodeOrId);

    const influence =
      depth *
      preset.parallax;

    return {
      depth,
      x:
        -frame.x *
        influence,
      y:
        -frame.y *
        influence,
      scale:
        1 +
        (frame.zoom - 1) *
        influence,
      roll:
        -frame.roll *
        influence
    };
  },

  getLayerFrame(
    sceneGraph = this.sceneGraph
  ) {
    if (
      !sceneGraph ||
      typeof sceneGraph.getRenderList !==
      "function"
    ) {
      return [];
    }

    return sceneGraph
      .getRenderList()
      .map(node => ({
        id: node.id,
        ...this.getLayerTransform(node)
      }));
  },

  publishFrame() {
    const detail = {
      camera: this.getFrame(),
      layers: this.getLayerFrame()
    };

    this.emit(
      "soulmusic:cameraframe",
      detail
    );

    return detail;
  },

  reset(notify = true) {
    this.frame = {
      time: 0,
      x: 0,
      y: 0,
      zoom: 1,
      roll: 0,
      energy: 0,
      focusX:
        this.width / 2,
      focusY:
        this.height / 2
    };

    this.lastTime = 0;

    if (notify) {
      this.emit(
        "soulmusic:camerareset",
        this.getFrame()
      );
    }

    return this.getFrame();
  },

  getFrame() {
    return {
      ...this.frame
    };
  },

  getState() {
    return {
      version: this.version,
      mode: this.mode,
      enabled: this.enabled,
      paused: this.paused,
      running: this.running,
      reducedMotion:
        this.reducedMotion,
      connected:
        Boolean(this.sceneGraph),
      frame: this.getFrame()
    };
  },

  getAudioState() {
    const runtime =
      this.getRuntime();

    return runtime?.SoulAudio
      ?.getState?.() || {};
  },

  getEngineState() {
    const runtime =
      this.getRuntime();

    return runtime?.EngineX
      ?.getState?.() || {};
  },

  getRuntime() {
    if (
      typeof window !==
      "undefined"
    ) {
      return window;
    }

    if (
      typeof globalThis !==
      "undefined"
    ) {
      return globalThis;
    }

    return null;
  },

  emit(
    name,
    detail
  ) {
    const runtime =
      this.getRuntime();

    if (
      !runtime?.dispatchEvent ||
      typeof runtime.CustomEvent !==
      "function"
    ) {
      return;
    }

    runtime.dispatchEvent(
      new runtime.CustomEvent(
        name,
        { detail }
      )
    );
  },

  clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        Number(value) || 0
      )
    );
  }
};

if (
  typeof window !==
  "undefined"
) {
  window.SoulCamera =
    SoulCamera;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulCamera;
}
