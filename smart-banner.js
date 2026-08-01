"use strict";

/*
  SOUL MUSIC SMART BANNER — DESIGN V2 — PASUL 4

  Afișează câte un mesaj complet, suficient timp pentru a fi citit pe telefon.
  Fiecare propoziție are propria paletă și mișcare, fără aglomerare vizuală.
*/

const SoulSmartBanner = {
  version: "1.0.0-step4",

  ticker: null,
  track: null,
  neon: null,
  pulse: null,
  leftFrame: null,
  director: null,
  performanceEngine: null,
  legacyBanner: null,

  running: false,
  paused: false,
  eventsBound: false,
  frameRequestId: null,
  lastFrameAt: 0,
  elapsedMs: 0,
  activeIndex: 0,
  voiceMix: 0,

  timing: {
    enterMs: 680,
    holdMs: 4300,
    exitMs: 680
  },

  messages: [
    {
      text: "BINE AI VENIT ÎN FAMILIA SOUL MUSIC 🎶",
      primary: "#ffe495",
      secondary: "#ffb52f",
      effect: "gold-reveal"
    },
    {
      text: "SOUL MUSIC 🎶 — STARE, NU DOAR MUZICĂ",
      primary: "#5df3ff",
      secondary: "#ffd96a",
      effect: "soul-glide"
    },
    {
      text: "MULȚUMESC CĂ EȘTI AICI ❤️",
      primary: "#ff5c78",
      secondary: "#ffb2c0",
      effect: "heart-pulse"
    },
    {
      text: "ASCULTĂ • SIMTE • TRĂIEȘTE MUZICA",
      primary: "#45d9ff",
      secondary: "#587dff",
      effect: "cyan-wave"
    },
    {
      text: "DĂ FOLLOW ȘI RĂMÂI ALĂTURI DE NOI",
      primary: "#ff64de",
      secondary: "#bb70ff",
      effect: "magenta-rise"
    },
    {
      text: "MUZICA ÎNCEPE ACOLO UNDE CUVINTELE SE OPRESC",
      primary: "#c7a4ff",
      secondary: "#6fe5ff",
      effect: "violet-breathe"
    },
    {
      text: "FIECARE MELODIE ASCUNDE O POVESTE",
      primary: "#ff9b45",
      secondary: "#ffe28a",
      effect: "amber-focus"
    },
    {
      text: "LASĂ MUZICA SĂ-ȚI VORBEASCĂ SUFLETULUI",
      primary: "#bba6ff",
      secondary: "#ff91d8",
      effect: "soft-orbit"
    },
    {
      text: "RESPECT • ENERGIE • VIBRAȚIE • FAMILIE",
      primary: "#ffdd73",
      secondary: "#47f2d0",
      effect: "energy-step"
    },
    {
      text: "ÎMPREUNĂ CREĂM CEA MAI FRUMOASĂ ENERGIE",
      primary: "#66f2ae",
      secondary: "#55cfff",
      effect: "emerald-flow"
    },
    {
      text: "AICI, FIECARE SUFLET ARE UN LOC",
      primary: "#77b9ff",
      secondary: "#d8efff",
      effect: "blue-calm"
    },
    {
      text: "ORIGINAL MUSIC • ORIGINAL ENERGY • SOUL MUSIC",
      primary: "#ffffff",
      secondary: "#ffd96a",
      effect: "signature-shine"
    }
  ],

  elements: [],

  stats: {
    frames: 0,
    changes: 0,
    completedCycles: 0,
    manualChanges: 0,
    redAccentFrames: 0
  },

  lastFrame: {
    index: 0,
    phase: "enter",
    progress: 0,
    scene: "idle",
    profile: "ultra",
    voiceMix: 0,
    fontSize: 46,
    geometry: null
  },

  init(options = {}) {
    const runtime = this.getRuntime();

    this.ticker =
      options.ticker ||
      runtime?.document?.getElementById?.(
        "ticker"
      ) || null;
    this.leftFrame =
      options.leftFrame ||
      runtime?.document?.getElementById?.(
        "leftFrame"
      ) || null;
    this.director =
      options.director ||
      runtime?.SoulSceneDirector || null;
    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance || null;
    this.legacyBanner =
      options.legacyBanner ||
      runtime?.SoulBanner || null;

    this.track =
      this.ticker?.querySelector?.(
        "#tickerTrack"
      ) || null;
    this.neon =
      this.ticker?.querySelector?.(
        "#tickerNeon"
      ) || null;
    this.pulse =
      this.ticker?.querySelector?.(
        "#tickerPulse"
      ) || null;

    if (
      !this.ticker ||
      !this.track ||
      !this.neon ||
      !this.pulse
    ) {
      throw new Error(
        "Structura bannerului inteligent este incompletă."
      );
    }

    this.legacyBanner
      ?.setSmartExclusive?.(true);
    this.ticker.dataset.smartBanner =
      "active";
    this.buildMessages();
    this.enforceGeometry();
    this.bindEvents();
    this.reset(false);

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:smartbannerready",
      this.getState()
    );

    return this.getState();
  },

  buildMessages() {
    const document =
      this.getRuntime()?.document;

    this.track.innerHTML = "";
    this.elements = [];

    for (
      let index = 0;
      index < this.messages.length;
      index += 1
    ) {
      const message =
        this.messages[index];
      const element =
        document.createElement("span");

      element.className =
        "smart-banner-message";
      element.textContent =
        message.text;
      element.dataset.index =
        String(index);
      element.dataset.effect =
        message.effect;
      element.style.color =
        message.primary;
      element.style.fontSize =
        `${this.getFontSize(
          message.text
        )}px`;
      element.setAttribute(
        "aria-hidden",
        index === 0
          ? "false"
          : "true"
      );

      this.track.appendChild(element);
      this.elements.push(element);
    }

    return this.elements.length;
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

    if (options.restoreLegacy !== false) {
      this.legacyBanner
        ?.setSmartExclusive?.(false);
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
    const deltaMs = this.clamp(
      safeTime - this.lastFrameAt,
      0,
      100
    );
    const state =
      stateOverride ||
      this.director?.getState?.() || {};
    const scene =
      state.currentScene || "idle";
    const source =
      state.smoothed ||
      state.metrics || {};
    const voiceTarget =
      scene === "red-voice"
        ? 1
        : this.clamp(source.voice);

    this.voiceMix +=
      (voiceTarget - this.voiceMix) *
      (
        voiceTarget > this.voiceMix
          ? 0.50
          : 0.12
      );

    const budget = this.getBudget();
    const sceneSpeed = {
      idle: 0.88,
      "soul-flow": 1,
      "bass-crown": 1.06,
      "legendary-wings": 1.12,
      "red-voice": 0.72
    }[scene] || 1;

    this.elapsedMs +=
      deltaMs * sceneSpeed;

    const total = this.getTotalDuration();

    while (this.elapsedMs >= total) {
      this.elapsedMs -= total;
      const remainder =
        this.elapsedMs;
      this.advance(1, false);
      this.elapsedMs = remainder;
    }

    const phase = this.getPhase(
      this.elapsedMs
    );
    const message =
      this.messages[this.activeIndex];
    const fontSize = this.getFontSize(
      message.text
    );

    this.renderMessage(
      message,
      phase,
      safeTime,
      budget,
      fontSize
    );
    this.renderLightScene(
      message,
      scene,
      phase,
      safeTime,
      budget,
      source
    );

    const geometry =
      this.enforceGeometry();

    this.lastFrameAt = safeTime;
    this.stats.frames += 1;

    if (this.voiceMix > 0.5) {
      this.stats.redAccentFrames += 1;
    }

    this.lastFrame = {
      index: this.activeIndex,
      phase: phase.name,
      progress: phase.progress,
      scene,
      profile: budget.profile,
      voiceMix: this.voiceMix,
      fontSize,
      geometry
    };

    return {
      ...this.lastFrame,
      geometry: { ...geometry }
    };
  },

  renderMessage(
    message,
    phase,
    time,
    budget,
    fontSize
  ) {
    for (
      let index = 0;
      index < this.elements.length;
      index += 1
    ) {
      const element =
        this.elements[index];
      const active =
        index === this.activeIndex;

      element.setAttribute(
        "aria-hidden",
        active ? "false" : "true"
      );

      if (!active) {
        element.style.opacity = "0";
        element.style.pointerEvents =
          "none";
      }
    }

    const element =
      this.elements[this.activeIndex];
    const motion = this.getMotion(
      message.effect,
      phase,
      time,
      budget
    );
    const glow =
      10 +
      budget.blurMultiplier * 12;
    const secondaryGlow =
      22 +
      budget.blurMultiplier * 18;

    element.style.fontSize =
      `${fontSize}px`;
    element.style.color =
      message.primary;
    element.style.opacity =
      String(motion.opacity);
    element.style.transform =
      motion.transform;
    element.style.filter =
      motion.filter;
    element.style.textShadow = `
      0 0 ${glow}px ${message.primary},
      0 0 ${secondaryGlow}px ${message.secondary},
      0 3px 9px rgba(0, 0, 0, 0.92)
    `;
  },

  getMotion(
    effect,
    phase,
    time,
    budget
  ) {
    let x = 0;
    let y = 0;
    let scale = 1;
    let opacity = 1;
    let filter = "none";

    if (phase.name === "enter") {
      const eased = this.easeOutCubic(
        phase.progress
      );

      x = (1 - eased) * 72;
      scale = 0.94 + eased * 0.06;
      opacity = eased;
    } else if (phase.name === "exit") {
      const eased = this.easeInCubic(
        phase.progress
      );

      x = -eased * 72;
      scale = 1 - eased * 0.025;
      opacity = 1 - eased;
    } else {
      const wave =
        Math.sin(time * 0.0025);

      if (
        effect === "soul-glide" ||
        effect === "emerald-flow"
      ) {
        x = wave * 5;
      } else if (
        effect === "magenta-rise" ||
        effect === "blue-calm"
      ) {
        y = wave * 3;
      } else if (
        effect === "heart-pulse" ||
        effect === "energy-step"
      ) {
        scale = 1 +
          Math.max(0, wave) * 0.012;
      } else if (
        effect === "violet-breathe" ||
        effect === "soft-orbit"
      ) {
        scale = 1 + wave * 0.006;
        y = Math.cos(
          time * 0.0018
        ) * 2;
      } else if (
        effect === "cyan-wave"
      ) {
        x = wave * 3;
        y = Math.cos(
          time * 0.003
        ) * 2;
      } else if (
        effect === "signature-shine" &&
        budget.profile !== "emergency"
      ) {
        filter = `brightness(${
          1.03 +
          Math.max(0, wave) * 0.12
        })`;
      }
    }

    return {
      opacity: this.clamp(opacity),
      transform:
        `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
      filter
    };
  },

  renderLightScene(
    message,
    scene,
    phase,
    time,
    budget,
    energy
  ) {
    const voiceAccent = this.mixHex(
      message.secondary,
      "#ff284f",
      this.voiceMix * 0.74
    );
    const primary = this.mixHex(
      message.primary,
      "#ff4969",
      this.voiceMix * 0.32
    );
    const flowSpeed = {
      idle: 0.020,
      "soul-flow": 0.035,
      "bass-crown": 0.050,
      "legendary-wings": 0.070,
      "red-voice": 0.030
    }[scene] || 0.035;
    const bass = this.clamp(
      energy.bass
    );
    const beat = this.clamp(
      energy.beat
    );
    const pulsePosition =
      4 +
      (
        (
          time * flowSpeed +
          this.activeIndex * 17
        ) % 58
      );

    this.neon.style.background = `
      linear-gradient(
        90deg,
        ${primary},
        ${voiceAccent},
        ${message.primary},
        ${message.secondary},
        ${primary}
      )
    `;
    this.neon.style.backgroundSize =
      "300% 100%";
    this.neon.style.backgroundPosition =
      `${(time * flowSpeed) % 300}% 0`;
    this.neon.style.opacity = String(
      this.clamp(
        0.70 +
        bass * 0.10 +
        beat * 0.10 +
        this.voiceMix * 0.08
      )
    );
    this.ticker.style.boxShadow = `
      0 0 ${18 + bass * 16}px
        ${this.hexToRgba(primary, 0.27)},
      0 0 ${34 + beat * 18}px
        ${this.hexToRgba(voiceAccent, 0.18)},
      inset 0 0 ${18 + budget.blurMultiplier * 12}px
        rgba(255, 255, 255, 0.045)
    `;

    this.pulse.style.left =
      `${pulsePosition}%`;
    this.pulse.style.width =
      budget.profile === "emergency"
        ? "24%"
        : "38%";
    this.pulse.style.opacity = String(
      this.clamp(
        0.28 +
        phase.progress * 0.18 +
        beat * 0.22
      )
    );
    this.pulse.style.background = `
      linear-gradient(
        90deg,
        transparent,
        ${primary},
        ${voiceAccent},
        transparent
      )
    `;
    this.pulse.style.boxShadow = `
      0 0 ${10 + budget.blurMultiplier * 12}px
        ${this.hexToRgba(voiceAccent, 0.68)}
    `;

    this.ticker.dataset.smartScene =
      scene;
    this.ticker.dataset.smartEffect =
      message.effect;
    this.ticker.dataset.smartProfile =
      budget.profile;
  },

  getPhase(elapsed) {
    const enterEnd =
      this.timing.enterMs;
    const holdEnd =
      enterEnd + this.timing.holdMs;

    if (elapsed < enterEnd) {
      return {
        name: "enter",
        progress: this.clamp(
          elapsed / enterEnd
        )
      };
    }

    if (elapsed < holdEnd) {
      return {
        name: "hold",
        progress: this.clamp(
          (elapsed - enterEnd) /
          this.timing.holdMs
        )
      };
    }

    return {
      name: "exit",
      progress: this.clamp(
        (elapsed - holdEnd) /
        this.timing.exitMs
      )
    };
  },

  getTotalDuration() {
    return (
      this.timing.enterMs +
      this.timing.holdMs +
      this.timing.exitMs
    );
  },

  advance(direction = 1, manual = true) {
    const count = this.messages.length;

    this.activeIndex =
      (
        this.activeIndex +
        direction +
        count
      ) % count;
    this.elapsedMs = 0;
    this.stats.changes += 1;

    if (manual) {
      this.stats.manualChanges += 1;
    }

    if (
      direction > 0 &&
      this.activeIndex === 0
    ) {
      this.stats.completedCycles += 1;
    }

    this.emit(
      "soulmusic:smartbannerchange",
      {
        index: this.activeIndex,
        message: {
          ...this.messages[
            this.activeIndex
          ]
        },
        manual
      }
    );

    return this.activeIndex;
  },

  next() {
    return this.advance(1, true);
  },

  previous() {
    return this.advance(-1, true);
  },

  setMessage(index) {
    const safeIndex = Number(index);

    if (
      !Number.isInteger(safeIndex) ||
      safeIndex < 0 ||
      safeIndex >= this.messages.length
    ) {
      return false;
    }

    this.activeIndex = safeIndex;
    this.elapsedMs = 0;
    this.stats.changes += 1;
    this.stats.manualChanges += 1;
    return true;
  },

  enforceGeometry() {
    const frameLeft = Number(
      this.leftFrame?.offsetLeft
    );
    const frameWidth = Number(
      this.leftFrame?.offsetWidth
    );
    const left = Math.max(
      560,
      (
        Number.isFinite(frameLeft)
          ? frameLeft
          : 22
      ) +
      (
        frameWidth > 0
          ? frameWidth
          : 520
      ) +
      18
    );
    const rightMargin = 37;
    const width = Math.max(
      900,
      1920 - left - rightMargin
    );

    this.ticker.style.left =
      `${left}px`;
    this.ticker.style.width =
      `${width}px`;
    this.ticker.style.height =
      "148px";
    this.ticker.style.bottom =
      "22px";

    return {
      left,
      width,
      right: left + width,
      height: 148,
      gapAfterLeftFrame:
        left -
        (
          (Number.isFinite(frameLeft)
            ? frameLeft
            : 22) +
          (frameWidth > 0
            ? frameWidth
            : 520)
        )
    };
  },

  getFontSize(text) {
    const length =
      String(text || "").length;

    if (length <= 31) {
      return 52;
    }

    if (length <= 40) {
      return 48;
    }

    if (length <= 49) {
      return 43;
    }

    return 38;
  },

  getBudget() {
    const source =
      this.performanceEngine
        ?.getBudget?.() || {};

    return {
      profile:
        source.profile || "ultra",
      blurMultiplier: this.clamp(
        Number(
          source.blurMultiplier ?? 1
        ),
        0.28,
        1
      )
    };
  },

  mixHex(from, to, mix) {
    const first = this.hexToRgb(from);
    const second = this.hexToRgb(to);
    const amount = this.clamp(mix);
    const color = first.map(
      (value, index) =>
        Math.round(
          value +
          (second[index] - value) *
            amount
        )
    );

    return `#${color.map(
      value => value
        .toString(16)
        .padStart(2, "0")
    ).join("")}`;
  },

  hexToRgb(hex) {
    const value = String(hex)
      .replace("#", "")
      .padEnd(6, "0")
      .slice(0, 6);

    return [
      Number.parseInt(
        value.slice(0, 2),
        16
      ),
      Number.parseInt(
        value.slice(2, 4),
        16
      ),
      Number.parseInt(
        value.slice(4, 6),
        16
      )
    ];
  },

  hexToRgba(hex, alpha) {
    const color = this.hexToRgb(hex);

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${this.clamp(alpha)})`;
  },

  easeOutCubic(value) {
    return 1 -
      Math.pow(1 - this.clamp(value), 3);
  },

  easeInCubic(value) {
    return Math.pow(
      this.clamp(value),
      3
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
      "resize",
      () => this.enforceGeometry()
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
      () => this.reset()
    );
    return true;
  },

  reset(notify = true) {
    this.activeIndex = 0;
    this.elapsedMs = 0;
    this.voiceMix = 0;
    this.lastFrameAt = this.now();

    if (notify) {
      this.emit(
        "soulmusic:smartbannerreset",
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
      activeIndex: this.activeIndex,
      messageCount:
        this.messages.length,
      elapsedMs: this.elapsedMs,
      voiceMix: this.voiceMix,
      messages: this.messages.map(
        message => ({ ...message })
      ),
      stats: { ...this.stats },
      lastFrame: {
        ...this.lastFrame,
        geometry:
          this.lastFrame.geometry
            ? {
                ...this.lastFrame
                  .geometry
              }
            : null
      },
      legacyExclusive:
        Boolean(
          this.legacyBanner
            ?.smartExclusive
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
  window.SoulSmartBanner =
    SoulSmartBanner;
}

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = SoulSmartBanner;
}
