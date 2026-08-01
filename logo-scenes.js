"use strict";

/*
  SOUL MUSIC LOGO SCENES — DESIGN V2 — PASUL 2

  Renderer exclusiv pentru orga logo-ului. Primește scena și energia de la
  Scene Director, desenează într-un canvas separat și lasă vizualizatorul
  vechi să gestioneze numai reacția DOM a logo-ului.
*/

const SoulLogoScenes = {
  version: "1.0.0-step2",

  width: 1920,
  height: 1080,
  canvas: null,
  context: null,
  logoElement: null,
  director: null,
  audio: null,
  performanceEngine: null,
  legacyVisualizer: null,

  running: false,
  paused: false,
  eventsBound: false,
  frameRequestId: null,
  currentScene: "idle",
  previousScene: null,
  transitionStartedAt: 0,
  transitionDurationMs: 720,

  smooth: {
    music: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    beat: 0,
    voice: 0
  },

  stats: {
    frames: 0,
    transitions: 0,
    soulFlowFrames: 0,
    bassCrownFrames: 0,
    legendaryFrames: 0,
    redVoiceFrames: 0
  },

  lastFrame: {
    scene: "idle",
    previousScene: null,
    transition: 1,
    primitiveCount: 0,
    quality: 1,
    bounds: null
  },

  init(options = {}) {
    const runtime = this.getRuntime();

    this.canvas =
      options.canvas ||
      runtime?.document?.getElementById?.(
        "logoScenesCanvas"
      ) || null;
    this.logoElement =
      options.logoElement ||
      runtime?.document?.getElementById?.(
        "logoArea"
      ) || null;
    this.director =
      options.director ||
      runtime?.SoulSceneDirector || null;
    this.audio =
      options.audio ||
      runtime?.SoulAudio || null;
    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance || null;
    this.legacyVisualizer =
      options.legacyVisualizer ||
      runtime?.SoulVisualizer || null;

    if (!this.canvas) {
      throw new Error(
        "logoScenesCanvas nu a fost găsit."
      );
    }

    this.context =
      this.canvas.getContext?.("2d") || null;

    if (!this.context) {
      throw new Error(
        "Contextul 2D pentru scenele logo-ului nu este disponibil."
      );
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.currentScene =
      this.director?.getState?.()
        ?.currentScene || "idle";
    this.previousScene = null;
    this.transitionStartedAt = this.now();

    this.bindEvents();
    this.legacyVisualizer
      ?.setSceneRendererExclusive?.(true);

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:logoscenesready",
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

    this.clear();

    if (options.restoreLegacy !== false) {
      this.legacyVisualizer
        ?.setSceneRendererExclusive?.(false);
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

  setScene(scene, options = {}) {
    const allowed = [
      "idle",
      "soul-flow",
      "bass-crown",
      "legendary-wings",
      "red-voice"
    ];

    if (!allowed.includes(scene)) {
      return false;
    }

    if (
      scene === this.currentScene &&
      options.force !== true
    ) {
      return false;
    }

    this.previousScene = this.currentScene;
    this.currentScene = scene;
    this.transitionStartedAt =
      Number.isFinite(options.time)
        ? options.time
        : this.now();
    this.stats.transitions += 1;
    return true;
  },

  renderFrame(time = this.now(), sampleOverride = null) {
    if (!this.context) {
      return false;
    }

    const safeTime =
      Number.isFinite(Number(time))
        ? Number(time)
        : this.now();
    const directorState =
      sampleOverride ||
      this.director?.getState?.() || {};
    const scene =
      directorState.currentScene ||
      this.currentScene || "idle";

    if (scene !== this.currentScene) {
      this.setScene(scene, {
        time: safeTime
      });
    }

    this.updateEnergy(directorState);

    const bounds = this.getLogoBounds();
    const quality = this.getQuality();
    const transition = this.clamp(
      (safeTime - this.transitionStartedAt) /
      this.transitionDurationMs
    );

    this.clear();

    let primitiveCount = 0;

    if (
      this.previousScene &&
      transition < 1
    ) {
      primitiveCount += this.drawScene(
        this.previousScene,
        safeTime,
        bounds,
        quality,
        1 - transition
      );
    }

    primitiveCount += this.drawScene(
      this.currentScene,
      safeTime,
      bounds,
      quality,
      transition
    );

    if (transition >= 1) {
      this.previousScene = null;
    }

    this.stats.frames += 1;
    this.countSceneFrame(this.currentScene);
    this.lastFrame = {
      scene: this.currentScene,
      previousScene: this.previousScene,
      transition,
      primitiveCount,
      quality,
      bounds: { ...bounds }
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
      "mids",
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
          ? 0.42
          : 0.12;

      this.smooth[key] +=
        (target - this.smooth[key]) *
        speed;
    }
  },

  drawScene(
    scene,
    time,
    bounds,
    quality,
    alpha
  ) {
    if (alpha <= 0.001) {
      return 0;
    }

    const draw = {
      idle: this.drawIdle,
      "soul-flow": this.drawSoulFlow,
      "bass-crown": this.drawBassCrown,
      "legendary-wings":
        this.drawLegendaryWings,
      "red-voice": this.drawRedVoice
    }[scene] || this.drawIdle;

    this.context.save();
    this.context.globalAlpha = alpha;
    const count = draw.call(
      this,
      time,
      bounds,
      quality
    );
    this.context.restore();

    return count;
  },

  drawIdle(time, box) {
    const context = this.context;
    const center = this.getCenter(box);
    const breath =
      0.5 +
      Math.sin(time * 0.0012) * 0.5;

    context.save();
    context.strokeStyle =
      `rgba(255, 216, 104, ${0.12 + breath * 0.08})`;
    context.lineWidth = 1.4;
    context.shadowColor =
      "rgba(255, 202, 64, 0.45)";
    context.shadowBlur = 12;
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      box.width * (0.50 + breath * 0.015),
      box.height * (0.39 + breath * 0.012),
      0,
      0,
      Math.PI * 2
    );
    context.stroke();
    context.restore();
    return 1;
  },

  drawSoulFlow(time, box, quality) {
    const context = this.context;
    const center = this.getCenter(box);
    const count = Math.max(
      24,
      Math.round(48 * quality)
    );
    const spread = box.width * 0.62;
    const energy =
      0.18 +
      this.smooth.music * 0.58 +
      this.smooth.highs * 0.24;

    context.save();
    context.lineCap = "round";
    context.lineWidth = 2;
    context.shadowBlur =
      10 * quality;

    for (let index = 0; index < count; index += 1) {
      const ratio =
        count === 1
          ? 0
          : index / (count - 1);
      const x =
        center.x - spread / 2 +
        ratio * spread;
      const symmetry =
        Math.abs(ratio - 0.5) * 2;
      const wave =
        0.5 +
        Math.sin(
          time * 0.0032 +
          symmetry * 10.5
        ) * 0.5;
      const length =
        box.height *
        (0.10 + energy * 0.32) *
        (0.55 + wave * 0.45) *
        (0.72 + (1 - symmetry) * 0.28);
      const cyan = index % 3 !== 0;

      context.strokeStyle = cyan
        ? "rgba(50, 230, 255, 0.68)"
        : "rgba(255, 213, 92, 0.72)";
      context.shadowColor = cyan
        ? "rgba(0, 213, 255, 0.65)"
        : "rgba(255, 190, 46, 0.62)";
      context.beginPath();
      context.moveTo(
        x,
        center.y - length * 0.56
      );
      context.lineTo(
        x,
        center.y - length
      );
      context.moveTo(
        x,
        center.y + length * 0.56
      );
      context.lineTo(
        x,
        center.y + length
      );
      context.stroke();
    }

    context.restore();
    return count * 2;
  },

  drawBassCrown(time, box, quality) {
    const context = this.context;
    const center = this.getCenter(box);
    const count = Math.max(
      17,
      Math.round(33 * quality)
    );
    const bass =
      0.25 +
      this.smooth.bass * 0.55 +
      this.smooth.beat * 0.35;

    context.save();
    context.lineCap = "round";
    context.lineWidth = 3;
    context.shadowColor =
      "rgba(255, 190, 44, 0.82)";
    context.shadowBlur =
      16 * quality;

    for (let index = 0; index < count; index += 1) {
      const ratio = index / (count - 1);
      const offset = (ratio - 0.5) * 2;
      const crown =
        1 - Math.pow(Math.abs(offset), 1.35);
      const pulse =
        0.78 +
        Math.sin(
          time * 0.0045 +
          Math.abs(offset) * 7
        ) * 0.22;
      const length =
        box.height *
        (0.10 + crown * 0.34) *
        bass * pulse;
      const x =
        center.x +
        offset * box.width * 0.37;
      const baseY =
        center.y - box.height * 0.16;

      context.strokeStyle =
        index % 4 === 0
          ? "rgba(55, 232, 255, 0.70)"
          : "rgba(255, 214, 88, 0.82)";
      context.beginPath();
      context.moveTo(x, baseY);
      context.lineTo(
        x + offset * length * 0.13,
        baseY - length
      );
      context.stroke();
    }

    context.strokeStyle =
      "rgba(255, 221, 116, 0.58)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(
      center.x,
      center.y - box.height * 0.12,
      box.width * 0.34,
      Math.PI * 1.12,
      Math.PI * 1.88
    );
    context.stroke();
    context.restore();
    return count + 1;
  },

  drawLegendaryWings(time, box, quality) {
    const context = this.context;
    const center = this.getCenter(box);
    const perSide = Math.max(
      14,
      Math.round(27 * quality)
    );
    const energy =
      0.48 +
      this.smooth.music * 0.30 +
      this.smooth.beat * 0.28;

    context.save();
    context.lineCap = "round";
    context.lineWidth = 2.4;
    context.shadowBlur =
      18 * quality;

    for (const side of [-1, 1]) {
      for (
        let index = 0;
        index < perSide;
        index += 1
      ) {
        const ratio =
          index / Math.max(1, perSide - 1);
        const angle =
          -0.82 + ratio * 1.64;
        const flutter =
          0.88 +
          Math.sin(
            time * 0.0035 +
            index * 0.7
          ) * 0.12;
        const startX =
          center.x +
          side * box.width * 0.18;
        const startY =
          center.y +
          Math.sin(angle) * box.height * 0.08;
        const length =
          box.width *
          (0.18 + ratio * 0.18) *
          energy * flutter;
        const endX =
          startX +
          side *
          Math.cos(angle * 0.72) *
          length;
        const endY =
          startY +
          Math.sin(angle) *
          length * 0.72;
        const gold = index % 5 !== 0;

        context.strokeStyle = gold
          ? `rgba(255, 216, 94, ${0.42 + ratio * 0.42})`
          : `rgba(56, 229, 255, ${0.38 + ratio * 0.34})`;
        context.shadowColor = gold
          ? "rgba(255, 186, 38, 0.76)"
          : "rgba(0, 220, 255, 0.68)";
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
      }
    }

    context.restore();
    return perSide * 2;
  },

  drawRedVoice(time, box, quality) {
    const context = this.context;
    const center = this.getCenter(box);
    const points = Math.max(
      40,
      Math.round(84 * quality)
    );
    const voice =
      0.20 +
      this.smooth.voice * 0.80;
    const pulse =
      0.82 +
      Math.sin(time * 0.009) * 0.18;

    context.save();
    context.lineCap = "round";
    context.shadowColor =
      "rgba(255, 22, 55, 0.90)";
    context.shadowBlur =
      22 * quality;
    context.strokeStyle =
      `rgba(255, 38, 67, ${0.55 + voice * 0.35})`;
    context.lineWidth = 3.2;
    context.beginPath();

    for (let index = 0; index < points; index += 1) {
      const ratio = index / (points - 1);
      const x =
        center.x - box.width * 0.44 +
        ratio * box.width * 0.88;
      const envelope =
        Math.sin(ratio * Math.PI);
      const wave =
        Math.sin(
          ratio * Math.PI * 12 +
          time * 0.012
        );
      const y =
        center.y +
        wave * envelope *
        box.height * 0.16 *
        voice * pulse;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();

    for (let ring = 0; ring < 3; ring += 1) {
      context.strokeStyle =
        `rgba(255, ${34 + ring * 12}, ${58 + ring * 16}, ${0.34 - ring * 0.07})`;
      context.lineWidth = 1.7;
      context.beginPath();
      context.ellipse(
        center.x,
        center.y,
        box.width *
          (0.38 + ring * 0.055) *
          (0.94 + voice * 0.07),
        box.height *
          (0.27 + ring * 0.05) *
          pulse,
        0,
        0,
        Math.PI * 2
      );
      context.stroke();
    }

    context.restore();
    return points + 3;
  },

  getLogoBounds() {
    const element = this.logoElement;
    const x = Number(element?.offsetLeft);
    const y = Number(element?.offsetTop);
    const width = Number(element?.offsetWidth);
    const height = Number(element?.offsetHeight);

    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      width > 0 &&
      height > 0
    ) {
      return {
        x,
        y,
        width,
        height
      };
    }

    return {
      x: 575,
      y: 105,
      width: 770,
      height: 525
    };
  },

  getCenter(box) {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  },

  getQuality() {
    const budget =
      this.performanceEngine
        ?.getBudget?.() || {};

    return this.clamp(
      Number(
        budget.effectsMultiplier ??
        budget.qualityMultiplier ??
        1
      ),
      0.4,
      1
    );
  },

  countSceneFrame(scene) {
    const key = {
      "soul-flow": "soulFlowFrames",
      "bass-crown": "bassCrownFrames",
      "legendary-wings":
        "legendaryFrames",
      "red-voice": "redVoiceFrames"
    }[scene];

    if (key) {
      this.stats[key] += 1;
    }
  },

  clear() {
    this.context?.clearRect?.(
      0,
      0,
      this.width,
      this.height
    );
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
      "soulmusic:scenechange",
      event => {
        if (event.detail?.to) {
          this.setScene(event.detail.to);
        }
      }
    );
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
      () => {
        this.setScene("idle", {
          force: true
        });
      }
    );

    return true;
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      paused: this.paused,
      currentScene: this.currentScene,
      previousScene: this.previousScene,
      transitionDurationMs:
        this.transitionDurationMs,
      smooth: { ...this.smooth },
      stats: { ...this.stats },
      lastFrame: {
        ...this.lastFrame,
        bounds: this.lastFrame.bounds
          ? { ...this.lastFrame.bounds }
          : null
      },
      legacyExclusive:
        Boolean(
          this.legacyVisualizer
            ?.sceneRendererExclusive
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
  window.SoulLogoScenes =
    SoulLogoScenes;
}

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = SoulLogoScenes;
}
