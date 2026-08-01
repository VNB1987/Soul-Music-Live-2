"use strict";

/*
  SOUL MUSIC SCENE DIRECTOR — DESIGN V2 — PASUL 1

  Regizorul automat al experienței vizuale. El nu desenează și nu schimbă
  layoutul stabil. Decide scena potrivită folosind muzica, bassul, beatul și
  vocea, apoi publică o stare unică pentru modulele vizuale din pașii următori.
*/

const SoulSceneDirector = {
  version: "1.0.0-step1",

  stage: null,
  audio: null,
  performanceEngine: null,
  statusElement: null,

  running: false,
  paused: false,
  eventsBound: false,
  frameRequestId: null,

  currentScene: "idle",
  previousScene: null,
  manualScene: null,
  transitionReason: "startup",

  sceneEnteredAt: 0,
  lastFrameAt: 0,
  lastVoiceAt: -Infinity,
  pendingScene: null,
  pendingSince: 0,
  legendaryCooldownUntil: 0,

  metrics: {
    musicActive: false,
    voiceActive: false,
    music: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    beat: 0,
    voice: 0,
    voiceDetected: false
  },

  smoothed: {
    music: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    beat: 0,
    voice: 0
  },

  thresholds: {
    silence: 0.018,
    voice: 0.045,
    bass: 0.30,
    beat: 0.34,
    legendaryMusic: 0.62,
    legendaryBass: 0.48,
    legendaryBeat: 0.52
  },

  timing: {
    voiceHoldMs: 1150,
    legendaryCooldownMs: 18000
  },

  scenes: {
    idle: {
      id: "idle",
      label: "Repaus elegant",
      minDurationMs: 900,
      confirmationMs: 1050,
      priority: 0
    },
    "soul-flow": {
      id: "soul-flow",
      label: "Soul Flow",
      minDurationMs: 3400,
      confirmationMs: 420,
      priority: 1
    },
    "bass-crown": {
      id: "bass-crown",
      label: "Bass Crown",
      minDurationMs: 2700,
      confirmationMs: 480,
      priority: 2
    },
    "legendary-wings": {
      id: "legendary-wings",
      label: "Legendary Wings",
      minDurationMs: 4400,
      confirmationMs: 680,
      priority: 3
    },
    "red-voice": {
      id: "red-voice",
      label: "Red Voice",
      minDurationMs: 900,
      confirmationMs: 0,
      priority: 4
    }
  },

  stats: {
    frames: 0,
    transitions: 0,
    voiceEntries: 0,
    legendaryEntries: 0,
    manualChanges: 0
  },

  history: [],

  init(options = {}) {
    const runtime = this.getRuntime();

    this.stage =
      options.stage ||
      runtime?.document
        ?.getElementById?.("stage") ||
      null;

    this.audio =
      options.audio ||
      runtime?.SoulAudio ||
      null;

    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance ||
      null;

    this.statusElement =
      options.statusElement ||
      runtime?.document
        ?.getElementById?.(
          "sceneDirectorStatus"
        ) ||
      null;

    this.reset(false);
    this.bindEvents();
    this.applySceneState();

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:scenedirectorready",
      this.getState()
    );

    return this.getState();
  },

  start() {
    if (this.running) {
      return false;
    }

    this.running = true;
    this.paused = false;

    const now = this.now();

    if (!this.sceneEnteredAt) {
      this.sceneEnteredAt = now;
    }

    this.lastFrameAt = now;
    this.scheduleFrame();

    return true;
  },

  stop() {
    const runtime = this.getRuntime();

    this.running = false;
    this.paused = false;

    if (this.frameRequestId !== null) {
      runtime?.cancelAnimationFrame?.(
        this.frameRequestId
      );
      runtime?.clearTimeout?.(
        this.frameRequestId
      );
      this.frameRequestId = null;
    }

    return true;
  },

  pause() {
    this.paused = true;
    return true;
  },

  resume() {
    if (!this.running) {
      return this.start();
    }

    this.paused = false;
    this.lastFrameAt = this.now();
    return true;
  },

  scheduleFrame() {
    if (!this.running) {
      return false;
    }

    const runtime = this.getRuntime();
    const callback = time => {
      this.frameRequestId = null;

      if (this.running) {
        if (!this.paused) {
          this.step(time);
        }

        this.scheduleFrame();
      }
    };

    if (runtime?.requestAnimationFrame) {
      this.frameRequestId =
        runtime.requestAnimationFrame(
          callback
        );
    } else if (runtime?.setTimeout) {
      this.frameRequestId =
        runtime.setTimeout(
          () => callback(this.now()),
          33
        );
    }

    return this.frameRequestId !== null;
  },

  step(time = this.now(), sampleOverride = null) {
    const safeTime =
      Number.isFinite(Number(time))
        ? Number(time)
        : this.now();

    const sample = this.readSample(
      sampleOverride
    );

    this.updateMetrics(sample);

    const automaticDecision =
      this.chooseScene(safeTime);

    const decision =
      automaticDecision.scene ===
        "red-voice"
        ? automaticDecision
        : this.manualScene
          ? {
              scene: this.manualScene,
              reason: "manual",
              immediate: true
            }
          : automaticDecision;

    this.processDecision(
      decision,
      safeTime
    );

    this.lastFrameAt = safeTime;
    this.stats.frames += 1;

    this.applyMetrics(safeTime);
    this.updateStatus();

    return this.getState();
  },

  readSample(sampleOverride = null) {
    const state =
      sampleOverride ||
      this.audio?.getState?.() ||
      {};

    const music = state.music || {};
    const voice = state.voice || {};

    return {
      musicActive:
        Boolean(music.active),
      voiceActive:
        Boolean(voice.active),
      music:
        this.clamp(
          Math.max(
            Number(music.level) || 0,
            Number(music.rawLevel) || 0
          )
        ),
      bass:
        this.clamp(
          Number(music.bass) || 0
        ),
      mids:
        this.clamp(
          Number(music.mids) || 0
        ),
      highs:
        this.clamp(
          Number(music.highs) || 0
        ),
      beat:
        this.clamp(
          Math.max(
            Number(music.beat) || 0,
            Number(music.peak) || 0
          )
        ),
      voice:
        this.clamp(
          Math.max(
            Number(voice.level) || 0,
            Number(voice.energy) || 0,
            Number(voice.rawLevel) || 0
          )
        ),
      voiceDetected:
        Boolean(voice.detected)
    };
  },

  updateMetrics(sample) {
    this.metrics = {
      ...sample
    };

    const attack = 0.28;
    const release = 0.10;

    for (
      const key of [
        "music",
        "bass",
        "mids",
        "highs",
        "beat",
        "voice"
      ]
    ) {
      const current =
        this.smoothed[key] || 0;
      const target =
        sample[key] || 0;
      const factor =
        target > current
          ? attack
          : release;

      this.smoothed[key] =
        current +
        (target - current) * factor;
    }
  },

  chooseScene(time) {
    const voicePresent =
      this.metrics.voiceActive &&
      (
        this.metrics.voiceDetected ||
        this.metrics.voice >=
          this.thresholds.voice ||
        this.smoothed.voice >=
          this.thresholds.voice
      );

    if (voicePresent) {
      this.lastVoiceAt = time;

      return {
        scene: "red-voice",
        reason: "voice-detected",
        immediate: true
      };
    }

    if (
      this.currentScene ===
        "red-voice" &&
      time - this.lastVoiceAt <
        this.timing.voiceHoldMs
    ) {
      return {
        scene: "red-voice",
        reason: "voice-hold",
        immediate: true
      };
    }

    const musicEnergy =
      Math.max(
        this.metrics.music,
        this.smoothed.music,
        this.smoothed.bass * 0.72 +
          this.smoothed.mids * 0.20 +
          this.smoothed.highs * 0.08
      );

    const musicPresent =
      this.metrics.musicActive &&
      (
        musicEnergy >=
          this.thresholds.silence ||
        this.metrics.beat >= 0.08
      );

    if (!musicPresent) {
      return {
        scene: "idle",
        reason: "silence",
        immediate: false
      };
    }

    const legendaryReady =
      time >=
        this.legendaryCooldownUntil &&
      musicEnergy >=
        this.thresholds
          .legendaryMusic &&
      Math.max(
        this.metrics.bass,
        this.smoothed.bass
      ) >=
        this.thresholds
          .legendaryBass &&
      Math.max(
        this.metrics.beat,
        this.smoothed.beat
      ) >=
        this.thresholds
          .legendaryBeat;

    if (legendaryReady) {
      return {
        scene: "legendary-wings",
        reason: "legendary-energy",
        immediate: false
      };
    }

    const bassReady =
      Math.max(
        this.metrics.bass,
        this.smoothed.bass
      ) >= this.thresholds.bass ||
      Math.max(
        this.metrics.beat,
        this.smoothed.beat
      ) >= this.thresholds.beat;

    if (bassReady) {
      return {
        scene: "bass-crown",
        reason: "bass-or-beat",
        immediate: false
      };
    }

    return {
      scene: "soul-flow",
      reason: "music-flow",
      immediate: false
    };
  },

  processDecision(decision, time) {
    if (!this.scenes[decision.scene]) {
      return false;
    }

    if (decision.scene === this.currentScene) {
      this.pendingScene = null;
      this.pendingSince = 0;
      return false;
    }

    if (decision.immediate) {
      return this.enterScene(
        decision.scene,
        decision.reason,
        time,
        true
      );
    }

    const currentProfile =
      this.scenes[this.currentScene];

    if (
      currentProfile &&
      time - this.sceneEnteredAt <
        currentProfile.minDurationMs
    ) {
      return false;
    }

    if (
      this.pendingScene !==
      decision.scene
    ) {
      this.pendingScene =
        decision.scene;
      this.pendingSince = time;
      return false;
    }

    const targetProfile =
      this.scenes[decision.scene];

    if (
      time - this.pendingSince <
      targetProfile.confirmationMs
    ) {
      return false;
    }

    return this.enterScene(
      decision.scene,
      decision.reason,
      time,
      false
    );
  },

  enterScene(
    scene,
    reason = "automatic",
    time = this.now(),
    force = false
  ) {
    if (!this.scenes[scene]) {
      return false;
    }

    if (
      scene === this.currentScene &&
      !force
    ) {
      return false;
    }

    const previous =
      this.currentScene;

    this.previousScene = previous;
    this.currentScene = scene;
    this.transitionReason = reason;
    this.sceneEnteredAt = time;
    this.pendingScene = null;
    this.pendingSince = 0;

    if (scene === "legendary-wings") {
      this.legendaryCooldownUntil =
        time +
        this.timing
          .legendaryCooldownMs;
      this.stats.legendaryEntries += 1;
    }

    if (scene === "red-voice") {
      this.stats.voiceEntries += 1;
    }

    if (previous !== scene) {
      this.stats.transitions += 1;
    }

    this.history.push({
      from: previous,
      to: scene,
      reason,
      time
    });

    if (this.history.length > 24) {
      this.history.shift();
    }

    this.applySceneState();

    this.emit(
      "soulmusic:scenechange",
      {
        from: previous,
        to: scene,
        reason,
        manual:
          Boolean(this.manualScene),
        profile: {
          ...this.scenes[scene]
        },
        metrics: {
          ...this.metrics
        }
      }
    );

    return true;
  },

  setManualScene(scene) {
    if (!this.scenes[scene]) {
      return false;
    }

    this.manualScene = scene;
    this.stats.manualChanges += 1;

    this.enterScene(
      scene,
      "manual",
      this.now(),
      true
    );

    return true;
  },

  clearManualScene() {
    if (!this.manualScene) {
      return false;
    }

    this.manualScene = null;
    this.pendingScene = null;
    this.pendingSince = 0;

    this.emit(
      "soulmusic:sceneauto",
      this.getState()
    );

    return true;
  },

  setThresholds(values = {}) {
    for (
      const key of Object.keys(
        this.thresholds
      )
    ) {
      if (
        Number.isFinite(
          Number(values[key])
        )
      ) {
        this.thresholds[key] =
          this.clamp(
            Number(values[key])
          );
      }
    }

    return {
      ...this.thresholds
    };
  },

  applySceneState() {
    if (!this.stage) {
      return false;
    }

    this.stage.dataset.soulScene =
      this.currentScene;
    this.stage.dataset.soulSceneMode =
      this.manualScene
        ? "manual"
        : "auto";
    this.stage.dataset.soulSceneReason =
      this.transitionReason;

    this.updateStatus();
    return true;
  },

  applyMetrics(time) {
    if (!this.stage?.style) {
      return false;
    }

    const profile =
      this.scenes[this.currentScene];
    const elapsed =
      Math.max(
        0,
        time - this.sceneEnteredAt
      );
    const progress =
      profile
        ? this.clamp(
            elapsed /
            Math.max(
              1,
              profile.minDurationMs
            )
          )
        : 0;

    const properties = {
      "--soul-director-music":
        this.smoothed.music,
      "--soul-director-bass":
        this.smoothed.bass,
      "--soul-director-mids":
        this.smoothed.mids,
      "--soul-director-highs":
        this.smoothed.highs,
      "--soul-director-beat":
        this.smoothed.beat,
      "--soul-director-voice":
        this.smoothed.voice,
      "--soul-director-progress":
        progress
    };

    for (
      const [name, value] of
      Object.entries(properties)
    ) {
      this.stage.style.setProperty(
        name,
        String(value)
      );
    }

    return true;
  },

  updateStatus() {
    if (!this.statusElement) {
      return false;
    }

    const profile =
      this.scenes[this.currentScene];

    this.statusElement.textContent =
      `Scenă: ${
        profile?.label ||
        this.currentScene
      } • ${
        this.manualScene
          ? "MANUAL"
          : "AUTO"
      }`;

    this.statusElement.dataset.scene =
      this.currentScene;
    this.statusElement.dataset.mode =
      this.manualScene
        ? "manual"
        : "auto";

    return true;
  },

  bindEvents() {
    const runtime = this.getRuntime();

    if (
      !runtime?.addEventListener ||
      this.eventsBound
    ) {
      return false;
    }

    this.eventsBound = true;

    runtime.addEventListener(
      "soulmusic:reset",
      () => this.reset()
    );

    runtime.addEventListener(
      "soulmusic:inputstopped",
      event => {
        if (
          event.detail?.type ===
          "voice"
        ) {
          this.lastVoiceAt =
            -Infinity;
        }
      }
    );

    return true;
  },

  reset(notify = true) {
    const now = this.now();

    this.currentScene = "idle";
    this.previousScene = null;
    this.manualScene = null;
    this.transitionReason = "reset";
    this.sceneEnteredAt = now;
    this.lastFrameAt = now;
    this.lastVoiceAt = -Infinity;
    this.pendingScene = null;
    this.pendingSince = 0;
    this.legendaryCooldownUntil = 0;

    this.stats = {
      frames: 0,
      transitions: 0,
      voiceEntries: 0,
      legendaryEntries: 0,
      manualChanges: 0
    };
    this.history = [];

    for (
      const key of Object.keys(
        this.smoothed
      )
    ) {
      this.smoothed[key] = 0;
    }

    this.metrics = {
      musicActive: false,
      voiceActive: false,
      music: 0,
      bass: 0,
      mids: 0,
      highs: 0,
      beat: 0,
      voice: 0,
      voiceDetected: false
    };

    this.applySceneState();
    this.applyMetrics(now);

    if (notify) {
      this.emit(
        "soulmusic:scenedirectorreset",
        this.getState()
      );
    }

    return this.getState();
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      paused: this.paused,
      currentScene:
        this.currentScene,
      previousScene:
        this.previousScene,
      manualScene:
        this.manualScene,
      mode:
        this.manualScene
          ? "manual"
          : "auto",
      reason:
        this.transitionReason,
      pendingScene:
        this.pendingScene,
      sceneEnteredAt:
        this.sceneEnteredAt,
      legendaryCooldownUntil:
        this.legendaryCooldownUntil,
      metrics: {
        ...this.metrics
      },
      smoothed: {
        ...this.smoothed
      },
      thresholds: {
        ...this.thresholds
      },
      scenes:
        Object.fromEntries(
          Object.entries(
            this.scenes
          ).map(
            ([key, value]) => [
              key,
              { ...value }
            ]
          )
        ),
      stats: {
        ...this.stats
      },
      history:
        this.history.map(
          item => ({ ...item })
        )
    };
  },

  now() {
    const runtime = this.getRuntime();

    return runtime?.performance?.now
      ? runtime.performance.now()
      : Date.now();
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
    const runtime = this.getRuntime();

    if (
      !runtime?.dispatchEvent ||
      typeof runtime.CustomEvent !==
        "function"
    ) {
      return false;
    }

    runtime.dispatchEvent(
      new runtime.CustomEvent(
        name,
        { detail }
      )
    );

    return true;
  },

  clamp(value, minimum = 0, maximum = 1) {
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
  window.SoulSceneDirector =
    SoulSceneDirector;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulSceneDirector;
}
