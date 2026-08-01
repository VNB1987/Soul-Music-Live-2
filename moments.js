"use strict";

/*
  SOUL MUSIC MOMENTS — DESIGN V2 — PASUL 6

  Șase momente editoriale declanșate manual. Fiecare combină o scenă,
  un mesaj și o durată, apoi redă controlul Scene Director-ului. Vocea reală
  rămâne prioritară în Scene Director chiar în timpul unui moment.
*/

const SoulMoments = {
  version: "1.0.0-step6",

  stage: null,
  sceneDirector: null,
  smartBanner: null,
  nowPlaying: null,
  performanceEngine: null,
  statusElement: null,

  running: false,
  eventsBound: false,
  activeMoment: null,
  previousManualScene: null,
  timeoutId: null,
  statusTimerId: null,
  endsAt: 0,
  lastTriggerAt: -Infinity,
  cooldownMs: 900,

  moments: {
    welcome: {
      id: "welcome",
      label: "Bun venit",
      scene: "soul-flow",
      bannerIndex: 0,
      durationMs: 8000,
      shortcut: "Shift+1"
    },
    follow: {
      id: "follow",
      label: "Follow",
      scene: "soul-flow",
      bannerIndex: 4,
      durationMs: 7000,
      shortcut: "Shift+2"
    },
    "thank-you": {
      id: "thank-you",
      label: "Mulțumesc",
      scene: "soul-flow",
      bannerIndex: 2,
      durationMs: 7000,
      shortcut: "Shift+3"
    },
    original: {
      id: "original",
      label: "Original Music",
      scene: "legendary-wings",
      bannerIndex: 11,
      durationMs: 8000,
      shortcut: "Shift+4"
    },
    "bass-drop": {
      id: "bass-drop",
      label: "Bass Drop",
      scene: "bass-crown",
      bannerIndex: 8,
      durationMs: 6500,
      shortcut: "Shift+5"
    },
    legendary: {
      id: "legendary",
      label: "Legendary",
      scene: "legendary-wings",
      bannerIndex: 1,
      durationMs: 6500,
      shortcut: "Shift+6"
    }
  },

  stats: {
    triggers: 0,
    completed: 0,
    replaced: 0,
    cancelled: 0,
    cooldownBlocks: 0
  },

  init(options = {}) {
    const runtime = this.getRuntime();

    this.stage =
      options.stage ||
      runtime?.document
        ?.getElementById?.("stage") ||
      null;
    this.sceneDirector =
      options.sceneDirector ||
      runtime?.SoulSceneDirector ||
      null;
    this.smartBanner =
      options.smartBanner ||
      runtime?.SoulSmartBanner ||
      null;
    this.nowPlaying =
      options.nowPlaying ||
      runtime?.SoulNowPlaying ||
      null;
    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance ||
      null;
    this.statusElement =
      options.statusElement ||
      runtime?.document
        ?.getElementById?.("momentStatus") ||
      null;

    this.bindEvents();
    this.applyState();

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:momentsready",
      this.getState()
    );

    return this.getState();
  },

  start() {
    this.running = true;
    return true;
  },

  stop() {
    this.cancel("stopped", false);
    this.running = false;
    return true;
  },

  trigger(id, options = {}) {
    if (!this.running) {
      return false;
    }

    const moment = this.moments[id];

    if (!moment) {
      return false;
    }

    if (
      this.getRuntime()?.EngineX
        ?.locked &&
      !options.ignoreLock
    ) {
      return false;
    }

    const now = this.now();

    if (
      !options.ignoreCooldown &&
      this.activeMoment?.id === id &&
      now - this.lastTriggerAt <
        this.cooldownMs
    ) {
      this.stats.cooldownBlocks += 1;
      return false;
    }

    if (this.activeMoment) {
      this.clearTimers();
      this.stats.replaced += 1;
    } else {
      this.previousManualScene =
        this.sceneDirector
          ?.getState?.()
          ?.manualScene || null;
    }

    this.activeMoment = moment;
    this.lastTriggerAt = now;
    this.endsAt =
      now + moment.durationMs;
    this.stats.triggers += 1;

    this.sceneDirector
      ?.setManualScene?.(
        moment.scene
      );
    this.smartBanner
      ?.setMessage?.(
        moment.bannerIndex
      );

    this.applyState();
    this.startStatusTimer();

    const runtime = this.getRuntime();
    this.timeoutId =
      runtime?.setTimeout?.(
        () => this.finish(),
        moment.durationMs
      ) || null;

    this.emit(
      "soulmusic:momentstart",
      this.getState()
    );

    return true;
  },

  finish() {
    if (!this.activeMoment) {
      return false;
    }

    const completed =
      this.activeMoment;

    this.clearTimers();
    this.activeMoment = null;
    this.endsAt = 0;
    this.restoreDirector();
    this.stats.completed += 1;
    this.applyState();

    this.emit(
      "soulmusic:momentend",
      {
        reason: "completed",
        moment: { ...completed },
        state: this.getState()
      }
    );

    return true;
  },

  cancel(
    reason = "cancelled",
    count = true
  ) {
    if (!this.activeMoment) {
      this.clearTimers();
      this.applyState();
      return false;
    }

    const cancelled =
      this.activeMoment;

    this.clearTimers();
    this.activeMoment = null;
    this.endsAt = 0;
    if (
      reason === "reset" ||
      reason === "stopped"
    ) {
      this.previousManualScene = null;
      this.sceneDirector
        ?.clearManualScene?.();
    } else {
      this.restoreDirector();
    }

    if (count) {
      this.stats.cancelled += 1;
    }

    this.applyState();
    this.emit(
      "soulmusic:momentend",
      {
        reason,
        moment: { ...cancelled },
        state: this.getState()
      }
    );

    return true;
  },

  restoreDirector() {
    if (this.previousManualScene) {
      this.sceneDirector
        ?.setManualScene?.(
          this.previousManualScene
        );
    } else {
      this.sceneDirector
        ?.clearManualScene?.();
    }

    this.previousManualScene = null;
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
      "keydown",
      event => {
        if (
          !event.shiftKey ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          event.repeat
        ) {
          return;
        }

        const ids = [
          "welcome",
          "follow",
          "thank-you",
          "original",
          "bass-drop",
          "legendary"
        ];
        const index =
          Number(event.key) - 1;

        if (
          index >= 0 &&
          index < ids.length
        ) {
          event.preventDefault?.();
          this.trigger(ids[index]);
        }
      }
    );

    const buttons =
      runtime.document
        ?.querySelectorAll?.(
          ".moment-grid [data-soul-moment]"
        ) || [];

    for (const button of buttons) {
      button.addEventListener(
        "click",
        () => this.trigger(
          button.dataset.soulMoment
        )
      );
    }

    runtime.addEventListener(
      "soulmusic:reset",
      () => this.cancel("reset")
    );

    return true;
  },

  startStatusTimer() {
    const runtime = this.getRuntime();

    this.statusTimerId =
      runtime?.setInterval?.(
        () => this.updateStatus(),
        250
      ) || null;
  },

  clearTimers() {
    const runtime = this.getRuntime();

    if (this.timeoutId !== null) {
      runtime?.clearTimeout?.(
        this.timeoutId
      );
    }

    if (this.statusTimerId !== null) {
      runtime?.clearInterval?.(
        this.statusTimerId
      );
    }

    this.timeoutId = null;
    this.statusTimerId = null;
  },

  applyState() {
    const id =
      this.activeMoment?.id || "auto";

    if (this.stage?.dataset) {
      this.stage.dataset.soulMoment = id;
      this.stage.dataset.soulMomentState =
        this.activeMoment
          ? "active"
          : "auto";
    }

    const runtime = this.getRuntime();
    const buttons =
      runtime?.document
        ?.querySelectorAll?.(
          ".moment-grid [data-soul-moment]"
        ) || [];

    for (const button of buttons) {
      const active =
        button.dataset.soulMoment === id;
      button.classList.toggle(
        "active",
        active
      );
      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    }

    this.updateStatus();
    return true;
  },

  updateStatus() {
    if (!this.statusElement) {
      return false;
    }

    if (!this.activeMoment) {
      this.statusElement.textContent =
        "Moment: AUTO";
      this.statusElement.dataset.state =
        "auto";
      return true;
    }

    const seconds = Math.max(
      0,
      Math.ceil(
        (this.endsAt - this.now()) /
        1000
      )
    );

    this.statusElement.textContent =
      `Moment: ${this.activeMoment.label} • ${seconds}s`;
    this.statusElement.dataset.state =
      "active";
    return true;
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      active:
        Boolean(this.activeMoment),
      activeMoment:
        this.activeMoment
          ? { ...this.activeMoment }
          : null,
      remainingMs:
        this.activeMoment
          ? Math.max(
              0,
              this.endsAt - this.now()
            )
          : 0,
      previousManualScene:
        this.previousManualScene,
      definitions:
        Object.values(
          this.moments
        ).map(item => ({ ...item })),
      stats: { ...this.stats }
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
      typeof window !== "undefined"
    ) {
      return window;
    }

    if (
      typeof globalThis !== "undefined"
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
  }
};

if (
  typeof window !== "undefined"
) {
  window.SoulMoments = SoulMoments;
}

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = SoulMoments;
}
