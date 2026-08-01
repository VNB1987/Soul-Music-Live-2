"use strict";

/*
  SOUL MUSIC FRAME NEON — DESIGN V2 — PASUL 3

  Controler unic pentru neonul cadrului vertical și al camerei. Auriul rămâne
  aprins permanent; scena Red Voice introduce roșul fără flash-uri agresive.
*/

const SoulFrameNeon = {
  version: "1.0.0-step3",

  stage: null,
  leftFrame: null,
  cameraFrame: null,
  leftNeon: null,
  cameraNeon: null,
  leftRunners: [],
  cameraRunners: [],
  director: null,
  performanceEngine: null,
  legacyEffects: null,

  running: false,
  paused: false,
  eventsBound: false,
  frameRequestId: null,
  lastFrameAt: 0,
  currentScene: "idle",
  voiceMix: 0,
  runnerDistance: 0,

  smooth: {
    music: 0,
    bass: 0,
    highs: 0,
    beat: 0,
    voice: 0
  },

  sceneProfiles: {
    idle: {
      intensity: 0.72,
      runnerSpeed: 72,
      breathSpeed: 0.00135
    },
    "soul-flow": {
      intensity: 0.82,
      runnerSpeed: 126,
      breathSpeed: 0.0018
    },
    "bass-crown": {
      intensity: 0.90,
      runnerSpeed: 172,
      breathSpeed: 0.0028
    },
    "legendary-wings": {
      intensity: 1,
      runnerSpeed: 224,
      breathSpeed: 0.0034
    },
    "red-voice": {
      intensity: 0.96,
      runnerSpeed: 148,
      breathSpeed: 0.0065
    }
  },

  stats: {
    frames: 0,
    sceneChanges: 0,
    redFrames: 0,
    performanceFrames: 0
  },

  lastFrame: {
    scene: "idle",
    mode: "gold",
    voiceMix: 0,
    leftIntensity: 0.72,
    cameraIntensity: 0.76,
    runnerSpeed: 72,
    profile: "ultra",
    secondaryRunner: true
  },

  init(options = {}) {
    const runtime = this.getRuntime();

    this.stage =
      options.stage ||
      runtime?.document?.getElementById?.(
        "stage"
      ) || null;
    this.leftFrame =
      options.leftFrame ||
      runtime?.document?.getElementById?.(
        "leftFrame"
      ) || null;
    this.cameraFrame =
      options.cameraFrame ||
      runtime?.document?.getElementById?.(
        "cameraFrame"
      ) || null;
    this.director =
      options.director ||
      runtime?.SoulSceneDirector || null;
    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance || null;
    this.legacyEffects =
      options.legacyEffects ||
      runtime?.SoulEffects || null;

    if (
      !this.stage ||
      !this.leftFrame ||
      !this.cameraFrame
    ) {
      throw new Error(
        "Cadrele necesare neonului inteligent lipsesc."
      );
    }

    this.cacheElements();

    if (
      !this.leftNeon ||
      !this.cameraNeon ||
      this.leftRunners.length === 0
    ) {
      throw new Error(
        "Straturile DOM ale neonului sunt incomplete."
      );
    }

    this.currentScene =
      this.director?.getState?.()
        ?.currentScene || "idle";
    this.lastFrameAt = this.now();
    this.bindEvents();
    this.legacyEffects
      ?.setFrameNeonExclusive?.(true);
    this.stage.dataset.frameNeon =
      "active";

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:frameneonready",
      this.getState()
    );

    return this.getState();
  },

  cacheElements() {
    this.leftNeon =
      this.leftFrame.querySelector?.(
        ".frame-neon"
      ) || null;
    this.cameraNeon =
      this.cameraFrame.querySelector?.(
        ".frame-neon"
      ) || null;
    this.leftRunners = Array.from(
      this.leftFrame.querySelectorAll?.(
        ".frame-runner"
      ) || []
    );
    this.cameraRunners = Array.from(
      this.cameraFrame.querySelectorAll?.(
        ".frame-runner"
      ) || []
    );
  },

  start() {
    if (this.running) {
      return false;
    }

    this.running = true;
    this.paused = false;
    this.lastFrameAt = this.now();
    this.scheduleFrame();
    return true;
  },

  stop(options = {}) {
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

    if (this.stage?.dataset) {
      delete this.stage.dataset.frameNeon;
      delete this.stage.dataset.frameNeonMode;
      delete this.stage.dataset.frameNeonProfile;
    }

    if (options.restoreLegacy !== false) {
      this.legacyEffects
        ?.setFrameNeonExclusive?.(false);
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
          this.renderFrame(time);
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

  renderFrame(
    time = this.now(),
    stateOverride = null
  ) {
    const safeTime =
      Number.isFinite(Number(time))
        ? Number(time)
        : this.now();
    const deltaSeconds = this.clamp(
      (safeTime - this.lastFrameAt) /
        1000,
      0,
      0.1
    );
    const state =
      stateOverride ||
      this.director?.getState?.() || {};
    const scene =
      this.sceneProfiles[
        state.currentScene
      ]
        ? state.currentScene
        : "idle";

    if (scene !== this.currentScene) {
      this.currentScene = scene;
      this.stats.sceneChanges += 1;
    }

    this.updateEnergy(state);

    const profile =
      this.sceneProfiles[scene];
    const budget = this.getBudget();
    const voiceTarget =
      scene === "red-voice"
        ? 1
        : this.smooth.voice > 0.055
          ? this.clamp(
              this.smooth.voice * 1.35
            )
          : 0;
    const voiceSpeed =
      voiceTarget > this.voiceMix
        ? 0.54
        : 0.13;

    this.voiceMix +=
      (voiceTarget - this.voiceMix) *
      voiceSpeed;

    const beatLift =
      this.smooth.beat * 0.10 +
      this.smooth.bass * 0.06;
    const voicePulse =
      this.voiceMix *
      (
        0.5 +
        Math.sin(safeTime * 0.008) *
          0.5
      );
    const goldBreath =
      0.5 +
      Math.sin(
        safeTime * profile.breathSpeed
      ) * 0.5;
    const leftIntensity = this.clamp(
      profile.intensity +
      beatLift +
      voicePulse * 0.10,
      0.70,
      1
    );
    const cameraIntensity = this.clamp(
      0.76 +
      goldBreath * 0.10 +
      this.smooth.music * 0.05 +
      voicePulse * 0.12,
      0.74,
      1
    );
    const runnerSpeed =
      profile.runnerSpeed *
      (
        0.86 +
        this.smooth.highs * 0.34 +
        this.smooth.beat * 0.24
      );

    this.runnerDistance +=
      runnerSpeed * deltaSeconds;
    this.applyNeon(
      this.leftNeon,
      leftIntensity,
      voicePulse,
      budget,
      false
    );
    this.applyNeon(
      this.cameraNeon,
      cameraIntensity,
      voicePulse,
      budget,
      true
    );
    this.applyRunners(
      this.leftFrame,
      this.leftRunners,
      this.runnerDistance,
      leftIntensity,
      budget,
      voicePulse
    );
    this.applyCameraRunner(
      cameraIntensity,
      budget,
      voicePulse
    );
    this.applyStageState(
      scene,
      budget,
      leftIntensity,
      cameraIntensity
    );

    this.lastFrameAt = safeTime;
    this.stats.frames += 1;

    if (this.voiceMix > 0.5) {
      this.stats.redFrames += 1;
    }

    if (
      budget.profile === "performance" ||
      budget.profile === "emergency"
    ) {
      this.stats.performanceFrames += 1;
    }

    this.lastFrame = {
      scene,
      mode:
        this.voiceMix > 0.5
          ? "red"
          : "gold",
      voiceMix: this.voiceMix,
      leftIntensity,
      cameraIntensity,
      runnerSpeed,
      profile: budget.profile,
      secondaryRunner:
        budget.secondaryRunner
    };

    return { ...this.lastFrame };
  },

  updateEnergy(state = {}) {
    const source =
      state.smoothed ||
      state.metrics ||
      state;
    const keys = [
      "music",
      "bass",
      "highs",
      "beat",
      "voice"
    ];

    for (const key of keys) {
      const target = this.clamp(
        source[key]
      );
      const speed =
        target > this.smooth[key]
          ? 0.38
          : 0.11;

      this.smooth[key] +=
        (target - this.smooth[key]) *
        speed;
    }
  },

  applyNeon(
    neon,
    intensity,
    voicePulse,
    budget,
    camera
  ) {
    if (!neon?.style) {
      return false;
    }

    const color = this.mixColor(
      [255, 216, 104],
      [255, 34, 65],
      this.voiceMix
    );
    const redBoost =
      this.voiceMix *
      (0.08 + voicePulse * 0.16);
    const blur =
      budget.blurMultiplier;
    const outer =
      (camera ? 60 : 68) *
      blur *
      (0.76 + intensity * 0.24);

    neon.style.opacity = String(
      this.clamp(
        0.74 +
        intensity * 0.20 +
        redBoost,
        0.72,
        1
      )
    );
    neon.style.borderColor =
      this.rgba(color, 0.90);
    neon.style.boxShadow = `
      0 0 ${10 + intensity * 5}px
        ${this.rgba(color, 0.88)},
      0 0 ${22 + intensity * 14}px
        ${this.rgba(color, 0.54)},
      0 0 ${outer}px
        ${this.rgba(color, 0.28)},
      inset 0 0 ${16 + intensity * 9}px
        ${this.rgba(color, 0.12)}
    `;

    return true;
  },

  applyRunners(
    frame,
    runners,
    distance,
    intensity,
    budget,
    voicePulse
  ) {
    const size = this.getFrameSize(
      frame,
      520,
      1044
    );
    const perimeter =
      2 * (size.width + size.height);

    for (
      let index = 0;
      index < runners.length;
      index += 1
    ) {
      const runner = runners[index];
      const secondary = index > 0;

      if (
        secondary &&
        !budget.secondaryRunner
      ) {
        runner.style.display = "none";
        continue;
      }

      runner.style.display = "block";

      const direction =
        secondary ? -1 : 1;
      const offset =
        secondary
          ? perimeter * 0.46
          : 0;
      const runnerPosition =
        direction * distance + offset;
      const placement =
        this.positionRunner(
          runner,
          runnerPosition,
          size.width,
          size.height,
          secondary ? 128 : 178,
          secondary ? 5 : 7
        );
      const color = this.mixColor(
        [255, 231, 150],
        [255, 48, 74],
        this.voiceMix
      );
      const opacity =
        secondary
          ? 0.30 + intensity * 0.24
          : 0.55 + intensity * 0.35;
      const gradientAngle =
        placement.vertical
          ? "180deg"
          : "90deg";

      runner.style.opacity = String(
        this.clamp(
          opacity +
          voicePulse * 0.15
        )
      );
      runner.style.background = `
        linear-gradient(
          ${gradientAngle},
          transparent,
          ${this.rgba(color, 0.98)},
          transparent
        )
      `;
      runner.style.boxShadow = `
        0 0 ${12 * budget.blurMultiplier}px
          ${this.rgba(color, 0.92)},
        0 0 ${28 * budget.blurMultiplier}px
          ${this.rgba(color, 0.58)}
      `;
    }
  },

  applyCameraRunner(
    intensity,
    budget,
    voicePulse
  ) {
    if (this.cameraRunners.length === 0) {
      return false;
    }

    const runner = this.cameraRunners[0];
    const color = this.mixColor(
      [255, 232, 154],
      [255, 45, 72],
      this.voiceMix
    );

    runner.style.left = "18%";
    runner.style.top = "-2px";
    runner.style.right = "auto";
    runner.style.bottom = "auto";
    runner.style.width = "64%";
    runner.style.height = "6px";
    runner.style.transform = "none";
    runner.style.opacity = String(
      this.clamp(
        0.32 +
        intensity * 0.28 +
        voicePulse * 0.18
      )
    );
    runner.style.background = `
      linear-gradient(
        90deg,
        transparent,
        ${this.rgba(color, 0.98)},
        transparent
      )
    `;
    runner.style.boxShadow = `
      0 0 ${12 * budget.blurMultiplier}px
        ${this.rgba(color, 0.84)},
      0 0 ${24 * budget.blurMultiplier}px
        ${this.rgba(color, 0.50)}
    `;

    return true;
  },

  positionRunner(
    runner,
    distance,
    width,
    height,
    length,
    thickness
  ) {
    const perimeter =
      2 * (width + height);
    let position =
      ((distance % perimeter) +
        perimeter) % perimeter;
    let vertical = false;
    let left = 0;
    let top = 0;
    let runnerWidth = length;
    let runnerHeight = thickness;

    if (position < width) {
      left = Math.min(
        position,
        Math.max(0, width - length)
      );
      top = -thickness / 2;
    } else if (
      position < width + height
    ) {
      position -= width;
      vertical = true;
      left = width - thickness / 2;
      top = Math.min(
        position,
        Math.max(0, height - length)
      );
      runnerWidth = thickness;
      runnerHeight = length;
    } else if (
      position < width * 2 + height
    ) {
      position -= width + height;
      left = Math.max(
        0,
        width - position - length
      );
      top = height - thickness / 2;
    } else {
      position -= width * 2 + height;
      vertical = true;
      left = -thickness / 2;
      top = Math.max(
        0,
        height - position - length
      );
      runnerWidth = thickness;
      runnerHeight = length;
    }

    runner.style.left = `${left}px`;
    runner.style.top = `${top}px`;
    runner.style.right = "auto";
    runner.style.bottom = "auto";
    runner.style.width =
      `${runnerWidth}px`;
    runner.style.height =
      `${runnerHeight}px`;
    runner.style.transform = "none";

    return {
      left,
      top,
      width: runnerWidth,
      height: runnerHeight,
      vertical
    };
  },

  applyStageState(
    scene,
    budget,
    leftIntensity,
    cameraIntensity
  ) {
    const mode =
      this.voiceMix > 0.5
        ? "red"
        : "gold";

    this.stage.dataset.frameNeonMode =
      mode;
    this.stage.dataset.frameNeonProfile =
      budget.profile;
    this.stage.style.setProperty(
      "--soul-frame-voice",
      String(this.voiceMix)
    );
    this.stage.style.setProperty(
      "--soul-frame-left-intensity",
      String(leftIntensity)
    );
    this.stage.style.setProperty(
      "--soul-frame-camera-intensity",
      String(cameraIntensity)
    );
    this.stage.style.setProperty(
      "--soul-frame-scene",
      `"${scene}"`
    );
  },

  getBudget() {
    const budget =
      this.performanceEngine
        ?.getBudget?.() || {};
    const profile =
      budget.profile || "ultra";
    const blurMultiplier = this.clamp(
      Number(
        budget.blurMultiplier ?? 1
      ),
      0.28,
      1
    );

    return {
      profile,
      blurMultiplier,
      secondaryRunner:
        profile !== "performance" &&
        profile !== "emergency"
    };
  },

  getFrameSize(
    frame,
    fallbackWidth,
    fallbackHeight
  ) {
    const width = Number(
      frame?.offsetWidth
    );
    const height = Number(
      frame?.offsetHeight
    );

    return {
      width:
        width > 0
          ? width
          : fallbackWidth,
      height:
        height > 0
          ? height
          : fallbackHeight
    };
  },

  mixColor(from, to, mix) {
    const safeMix = this.clamp(mix);

    return from.map(
      (value, index) =>
        Math.round(
          value +
          (to[index] - value) *
            safeMix
        )
    );
  },

  rgba(color, alpha) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.clamp(alpha)})`;
  },

  bindEvents() {
    const runtime = this.getRuntime();

    if (
      this.eventsBound ||
      !runtime?.addEventListener
    ) {
      return false;
    }

    this.eventsBound = true;
    runtime.addEventListener(
      "soulmusic:pause",
      () => this.pause()
    );
    runtime.addEventListener(
      "soulmusic:resume",
      () => this.resume()
    );
    runtime.addEventListener(
      "soulmusic:reset",
      () => this.reset()
    );
    return true;
  },

  reset() {
    this.voiceMix = 0;
    this.runnerDistance = 0;
    this.lastFrameAt = this.now();

    for (const key of Object.keys(
      this.smooth
    )) {
      this.smooth[key] = 0;
    }

    return this.getState();
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      paused: this.paused,
      currentScene: this.currentScene,
      voiceMix: this.voiceMix,
      runnerDistance:
        this.runnerDistance,
      smooth: { ...this.smooth },
      stats: { ...this.stats },
      lastFrame: { ...this.lastFrame },
      legacyExclusive:
        Boolean(
          this.legacyEffects
            ?.frameNeonExclusive
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
    if (typeof window !== "undefined") {
      return window;
    }

    if (typeof globalThis !== "undefined") {
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

if (typeof window !== "undefined") {
  window.SoulFrameNeon =
    SoulFrameNeon;
}

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = SoulFrameNeon;
}
