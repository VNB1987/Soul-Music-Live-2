"use strict";

/*
  SOUL MUSIC LIVE — INTEGRARE DESIGN V2 — PASUL 1

  Coordonator unic pentru toate motoarele construite în Etapele 0–6.
  Păstrează modulele independente, stabilește ordinea de pornire și
  conectează Camera, Performance, Particles, Signature și Now Playing.
*/

const SoulIntegration = {
  version: "1.2.0-design-v2-step3",

  ready: false,
  starting: false,
  modules: {},
  errors: [],
  warnings: [],
  eventsBound: false,

  cameraLayerIds: [
    "ambientCanvas",
    "visualizerCanvas",
    "logoScenesCanvas",
    "leftFrame",
    "logoGroup",
    "tiktokButton",
    "liveButton",
    "cameraFrame",
    "effectsCanvas",
    "ticker",
    "nowPlaying"
  ],

  init(options = {}) {
    if (this.ready || this.starting) {
      return this.getState();
    }

    this.starting = true;
    this.errors = [];
    this.warnings = [];

    try {
      this.resolveModules(
        options.modules
      );
      this.validateFoundation();
      this.bindEvents();
      this.disableLegacyQualityTimer();
      this.initializePerformance();
      this.initializeCamera();
      this.initializeParticles();
      this.initializeSignature();
      this.initializeSceneDirector();
      this.initializeLogoScenes();
      this.initializeFrameNeon();
      this.initializeNowPlaying();
      this.initializeLiveCheck();
      this.syncPerformanceBudget();
      this.applyInitialCameraFrame();

      this.ready =
        this.errors.length === 0;
    } catch (error) {
      this.captureError(
        "integration",
        error,
        true
      );
      this.ready = false;
    }

    this.starting = false;
    this.publishStatus();

    return this.getState();
  },

  resolveModules(overrides = {}) {
    const runtime =
      this.getRuntime();

    this.modules = {
      sceneGraph:
        overrides.sceneGraph ||
        runtime?.SoulSceneGraph,
      audio:
        overrides.audio ||
        runtime?.SoulAudio,
      visualizer:
        overrides.visualizer ||
        runtime?.SoulVisualizer,
      effects:
        overrides.effects ||
        runtime?.SoulEffects,
      banner:
        overrides.banner ||
        runtime?.SoulBanner,
      engine:
        overrides.engine ||
        runtime?.EngineX,
      camera:
        overrides.camera ||
        runtime?.SoulCamera,
      particles:
        overrides.particles ||
        runtime?.SoulParticles,
      performance:
        overrides.performance ||
        runtime?.SoulPerformance,
      signature:
        overrides.signature ||
        runtime?.SoulSignature,
      sceneDirector:
        overrides.sceneDirector ||
        runtime?.SoulSceneDirector,
      logoScenes:
        overrides.logoScenes ||
        runtime?.SoulLogoScenes,
      frameNeon:
        overrides.frameNeon ||
        runtime?.SoulFrameNeon,
      nowPlaying:
        overrides.nowPlaying ||
        runtime?.SoulNowPlaying,
      liveCheck:
        overrides.liveCheck ||
        runtime?.SoulLiveCheck
    };

    return this.modules;
  },

  validateFoundation() {
    const required = [
      "sceneGraph",
      "audio",
      "visualizer",
      "effects",
      "banner",
      "engine",
      "camera",
      "particles",
      "performance",
      "signature",
      "sceneDirector",
      "logoScenes",
      "frameNeon",
      "nowPlaying",
      "liveCheck"
    ];

    for (
      let index = 0;
      index < required.length;
      index += 1
    ) {
      const name = required[index];

      if (!this.modules[name]) {
        this.errors.push(
          `Modul lipsă: ${name}`
        );
      }
    }

    const sceneState =
      this.modules.sceneGraph
        ?.getState?.();

    if (sceneState && !sceneState.ready) {
      this.errors.push(
        "Scene Graph nu este pregătit"
      );
    }

    return this.errors.length === 0;
  },

  initializePerformance() {
    const module =
      this.modules.performance;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "performance",
      () => module.init({
        engine:
          this.modules.engine,
        targetFps: 60,
        adaptive: true,
        autoStart: true
      })
    );
  },

  initializeCamera() {
    const module =
      this.modules.camera;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "camera",
      () => module.init({
        sceneGraph:
          this.modules.sceneGraph,
        mode:
          this.modules.engine
            ?.mode || "live",
        autoStart: true
      })
    );
  },

  initializeParticles() {
    const module =
      this.modules.particles;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "particles",
      () => module.init({
        sceneGraph:
          this.modules.sceneGraph,
        mode:
          this.modules.engine
            ?.mode || "live",
        autoStart: true
      })
    );
  },

  initializeSignature() {
    const module =
      this.modules.signature;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "signature",
      () => module.init({
        sceneGraph:
          this.modules.sceneGraph,
        performanceEngine:
          this.modules.performance,
        mode:
          this.modules.engine
            ?.mode || "live",
        autoStart: true
      })
    );
  },

  initializeSceneDirector() {
    const module =
      this.modules.sceneDirector;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "sceneDirector",
      () => module.init({
        stage:
          this.modules.sceneGraph
            ?.getNode?.("stage")
            ?.element,
        audio:
          this.modules.audio,
        performanceEngine:
          this.modules.performance,
        autoStart: true
      })
    );
  },

  initializeLogoScenes() {
    const module =
      this.modules.logoScenes;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "logoScenes",
      () => module.init({
        canvas:
          this.getRuntime()
            ?.document
            ?.getElementById?.(
              "logoScenesCanvas"
            ),
        logoElement:
          this.modules.sceneGraph
            ?.getNode?.("logoGroup")
            ?.element,
        director:
          this.modules.sceneDirector,
        audio:
          this.modules.audio,
        performanceEngine:
          this.modules.performance,
        legacyVisualizer:
          this.modules.visualizer,
        autoStart: true
      })
    );
  },

  initializeFrameNeon() {
    const module =
      this.modules.frameNeon;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "frameNeon",
      () => module.init({
        stage:
          this.modules.sceneGraph
            ?.getNode?.("stage")
            ?.element,
        leftFrame:
          this.modules.sceneGraph
            ?.getNode?.("leftFrame")
            ?.element,
        cameraFrame:
          this.modules.sceneGraph
            ?.getNode?.("cameraFrame")
            ?.element,
        director:
          this.modules.sceneDirector,
        performanceEngine:
          this.modules.performance,
        legacyEffects:
          this.modules.effects,
        autoStart: true
      })
    );
  },

  initializeNowPlaying() {
    const module =
      this.modules.nowPlaying;

    if (!module?.init) {
      return false;
    }

    const element =
      this.modules.sceneGraph
        ?.getNode?.(
          "nowPlaying"
        )?.element ||
      this.getRuntime()
        ?.document
        ?.getElementById?.(
          "nowPlaying"
        );

    return this.safeInit(
      "nowPlaying",
      () => module.init({
        element,
        bridgeUrl:
          "now-playing.txt",
        position:
          "top-center",
        autoStart: true
      })
    );
  },

  initializeLiveCheck() {
    const module =
      this.modules.liveCheck;

    if (!module?.init) {
      return false;
    }

    return this.safeInit(
      "liveCheck",
      () => module.init({
        integration: this,
        engine:
          this.modules.engine,
        audio:
          this.modules.audio,
        performanceEngine:
          this.modules.performance,
        nowPlaying:
          this.modules.nowPlaying,
        autoRun: true,
        applyCalibration: true
      })
    );
  },

  safeInit(name, initializer) {
    try {
      const state = initializer();

      if (state === false) {
        throw new Error(
          "Inițializare refuzată"
        );
      }

      return state;
    } catch (error) {
      this.captureError(
        name,
        error,
        true
      );

      return false;
    }
  },

  disableLegacyQualityTimer() {
    const runtime =
      this.getRuntime();

    const engine =
      this.modules.engine;

    if (
      engine?.qualityTimer !== null &&
      engine?.qualityTimer !==
        undefined
    ) {
      runtime?.clearInterval?.(
        engine.qualityTimer
      );
      engine.qualityTimer = null;
    }
  },

  bindEvents() {
    const runtime =
      this.getRuntime();

    if (
      !runtime?.addEventListener ||
      this.eventsBound
    ) {
      return;
    }

    this.eventsBound = true;

    runtime.addEventListener(
      "soulmusic:cameraframe",
      event => {
        this.applyCameraFrame(
          event.detail
        );
      }
    );

    runtime.addEventListener(
      "soulmusic:camerareset",
      () => {
        this.clearCameraFrame();
      }
    );

    runtime.addEventListener(
      "soulmusic:performanceprofilechange",
      event => {
        this.syncPerformanceBudget(
          event.detail?.budget
        );
      }
    );

    runtime.addEventListener(
      "soulmusic:reset",
      () => {
        this.syncPerformanceBudget();
        this.publishStatus();
      }
    );
  },

  applyInitialCameraFrame() {
    const camera =
      this.modules.camera;

    if (
      !camera?.getFrame ||
      !camera?.getLayerFrame
    ) {
      return false;
    }

    return this.applyCameraFrame({
      camera: camera.getFrame(),
      layers:
        camera.getLayerFrame()
    });
  },

  applyCameraFrame(detail = {}) {
    const layers =
      Array.isArray(detail.layers)
        ? detail.layers
        : [];

    const budget =
      this.modules.performance
        ?.getState?.()
        ?.budget || {};

    const cameraMultiplier =
      Number(
        budget.cameraMultiplier ||
        1
      );

    let applied = 0;

    for (
      let index = 0;
      index < layers.length;
      index += 1
    ) {
      const layer = layers[index];

      if (
        !this.cameraLayerIds
          .includes(layer.id)
      ) {
        continue;
      }

      const element =
        this.modules.sceneGraph
          ?.getNode?.(
            layer.id
          )?.element;

      if (!element?.style) {
        continue;
      }

      element.classList?.add(
        "soul-camera-layer"
      );

      element.style.setProperty(
        "--soul-camera-x",
        `${Number(layer.x || 0) *
          cameraMultiplier}px`
      );

      element.style.setProperty(
        "--soul-camera-y",
        `${Number(layer.y || 0) *
          cameraMultiplier}px`
      );

      element.style.setProperty(
        "--soul-camera-scale",
        String(
          1 +
          (
            Number(layer.scale || 1) -
            1
          ) *
          cameraMultiplier
        )
      );

      element.style.setProperty(
        "--soul-camera-roll",
        `${Number(layer.roll || 0) *
          cameraMultiplier}deg`
      );

      applied += 1;
    }

    return applied > 0;
  },

  clearCameraFrame() {
    const graph =
      this.modules.sceneGraph;

    for (
      let index = 0;
      index <
      this.cameraLayerIds.length;
      index += 1
    ) {
      const element =
        graph?.getNode?.(
          this.cameraLayerIds[index]
        )?.element;

      if (!element?.style) {
        continue;
      }

      element.style.setProperty(
        "--soul-camera-x",
        "0px"
      );
      element.style.setProperty(
        "--soul-camera-y",
        "0px"
      );
      element.style.setProperty(
        "--soul-camera-scale",
        "1"
      );
      element.style.setProperty(
        "--soul-camera-roll",
        "0deg"
      );
    }
  },

  syncPerformanceBudget(budget) {
    const stage =
      this.modules.sceneGraph
        ?.getNode?.("stage")
        ?.element;

    const activeBudget =
      budget ||
      this.modules.performance
        ?.getState?.()
        ?.budget;

    if (
      !stage?.style ||
      !activeBudget
    ) {
      return false;
    }

    const properties = {
      "--soul-quality":
        activeBudget
          .qualityMultiplier,
      "--soul-particle-budget":
        activeBudget
          .particleMultiplier,
      "--soul-effects-budget":
        activeBudget
          .effectsMultiplier,
      "--soul-camera-budget":
        activeBudget
          .cameraMultiplier,
      "--soul-shadow-budget":
        activeBudget
          .shadowMultiplier,
      "--soul-blur-budget":
        activeBudget
          .blurMultiplier
    };

    const entries =
      Object.entries(properties);

    for (
      let index = 0;
      index < entries.length;
      index += 1
    ) {
      stage.style.setProperty(
        entries[index][0],
        String(entries[index][1])
      );
    }

    return true;
  },

  captureError(
    module,
    error,
    critical = false
  ) {
    const entry = {
      module,
      critical,
      message:
        error?.message ||
        String(error)
    };

    if (critical) {
      this.errors.push(entry);
    } else {
      this.warnings.push(entry);
    }

    return entry;
  },

  publishStatus() {
    const runtime =
      this.getRuntime();

    if (runtime?.document?.body) {
      runtime.document.body
        .dataset.integration =
        this.ready
          ? "ready"
          : "degraded";
    }

    const state =
      this.getState();

    this.modules.engine
      ?.updatePerformanceStatus?.(
        this.ready
          ? "Engine: toate motoarele active • 60 FPS"
          : `Engine: integrare degradată • ${this.errors.length} erori`
      );

    this.emit(
      "soulmusic:integrationready",
      state
    );

    return state;
  },

  getModuleStates() {
    const states = {};
    const entries =
      Object.entries(this.modules);

    for (
      let index = 0;
      index < entries.length;
      index += 1
    ) {
      const [name, module] =
        entries[index];

      try {
        states[name] =
          module?.getState?.() ||
          {
            available:
              Boolean(module)
          };
      } catch (error) {
        states[name] = {
          available:
            Boolean(module),
          error:
            error?.message ||
            String(error)
        };
      }
    }

    return states;
  },

  getState() {
    return {
      version: this.version,
      ready: this.ready,
      starting: this.starting,
      errors: [...this.errors],
      warnings: [...this.warnings],
      modules:
        this.getModuleStates()
    };
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

  emit(name, detail) {
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
  }
};

if (
  typeof window !==
  "undefined"
) {
  window.SoulIntegration =
    SoulIntegration;

  window.addEventListener(
    "DOMContentLoaded",
    () => {
      SoulIntegration.init();
    }
  );
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulIntegration;
}
