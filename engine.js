"use strict";

const EngineX = {
  stageWidth: 1920,
  stageHeight: 1080,

  mode: "live",
  quality: "ultra",
  locked: false,

  fps: 60,
  smoothedFps: 60,
  lastFrameTime: performance.now(),

  noticeTimer: null,
  qualityTimer: null,

  elements: {},

  presets: {
    calm: {
      name: "Calm",
      musicSensitivity: 3.2,
      voiceSensitivity: 4.8,
      bassSensitivity: 1.3,
      highSensitivity: 1.1,
      neonIntensity: 1.1,
      particleIntensity: 0.65,
      effectMultiplier: 0.7,
      speedMultiplier: 0.72
    },

    live: {
      name: "Live",
      musicSensitivity: 4.5,
      voiceSensitivity: 6,
      bassSensitivity: 2,
      highSensitivity: 1.7,
      neonIntensity: 1.6,
      particleIntensity: 1.3,
      effectMultiplier: 1,
      speedMultiplier: 1
    },

    party: {
      name: "Party",
      musicSensitivity: 5.5,
      voiceSensitivity: 6.4,
      bassSensitivity: 2.7,
      highSensitivity: 2.3,
      neonIntensity: 2.1,
      particleIntensity: 1.9,
      effectMultiplier: 1.3,
      speedMultiplier: 1.24
    },

    legendary: {
      name: "Legendary",
      musicSensitivity: 6.4,
      voiceSensitivity: 7,
      bassSensitivity: 3.3,
      highSensitivity: 2.9,
      neonIntensity: 2.65,
      particleIntensity: 2.6,
      effectMultiplier: 1.7,
      speedMultiplier: 1.46
    }
  },

  init() {
    this.cacheElements();
    this.initializeCanvases();
    this.fitStage();
    this.bindWindowEvents();
    this.bindKeyboardShortcuts();
    this.bindPanelButtons();
    this.setMode("live", false);
    this.startPerformanceMonitor();

    this.showNotice(
      "Soul Music Engine X a pornit"
    );

    this.updatePerformanceStatus(
      "Engine: pregătit"
    );
  },

  cacheElements() {
    this.elements.viewport =
      document.getElementById("viewport");

    this.elements.stage =
      document.getElementById("stage");

    this.elements.controlPanel =
      document.getElementById("controlPanel");

    this.elements.shortcutNotice =
      document.getElementById("shortcutNotice");

    this.elements.lockIndicator =
      document.getElementById("lockIndicator");

    this.elements.hidePanel =
      document.getElementById("hidePanel");

    this.elements.toggleFullscreen =
      document.getElementById("toggleFullscreen");

    this.elements.resetControls =
      document.getElementById("resetControls");

    this.elements.calmMode =
      document.getElementById("calmMode");

    this.elements.liveMode =
      document.getElementById("liveMode");

    this.elements.partyMode =
      document.getElementById("partyMode");

    this.elements.legendaryMode =
      document.getElementById("legendaryMode");

    this.elements.musicSensitivity =
      document.getElementById(
        "musicSensitivity"
      );

    this.elements.voiceSensitivity =
      document.getElementById(
        "voiceSensitivity"
      );

    this.elements.bassSensitivity =
      document.getElementById(
        "bassSensitivity"
      );

    this.elements.highSensitivity =
      document.getElementById(
        "highSensitivity"
      );

    this.elements.neonIntensity =
      document.getElementById(
        "neonIntensity"
      );

    this.elements.particleIntensity =
      document.getElementById(
        "particleIntensity"
      );

    this.elements.musicStatus =
      document.getElementById(
        "musicStatus"
      );

    this.elements.voiceStatus =
      document.getElementById(
        "voiceStatus"
      );

    this.elements.performanceStatus =
      document.getElementById(
        "performanceStatus"
      );

    this.elements.ambientCanvas =
      document.getElementById(
        "ambientCanvas"
      );

    this.elements.visualizerCanvas =
      document.getElementById(
        "visualizerCanvas"
      );

    this.elements.effectsCanvas =
      document.getElementById(
        "effectsCanvas"
      );
  },

  initializeCanvases() {
    const canvases = [
      this.elements.ambientCanvas,
      this.elements.visualizerCanvas,
      this.elements.effectsCanvas
    ];

    canvases.forEach(canvas => {
      if (!canvas) {
        return;
      }

      canvas.width =
        this.stageWidth;

      canvas.height =
        this.stageHeight;
    });
  },

  bindWindowEvents() {
    window.addEventListener(
      "resize",
      () => this.fitStage()
    );

    document.addEventListener(
      "fullscreenchange",
      () => {
        window.setTimeout(
          () => this.fitStage(),
          80
        );
      }
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          window.dispatchEvent(
            new CustomEvent(
              "soulmusic:pause"
            )
          );
        } else {
          this.lastFrameTime =
            performance.now();

          this.fitStage();

          window.dispatchEvent(
            new CustomEvent(
              "soulmusic:resume"
            )
          );
        }
      }
    );

    window.addEventListener(
      "soulmusic:inputactivated",
      event => {
        const type =
          event.detail?.type;

        if (type === "music") {
          this.updateMusicStatus(
            "Muzică: activă"
          );
        }

        if (type === "voice") {
          this.updateVoiceStatus(
            "Microfon: activ"
          );
        }
      }
    );

    window.addEventListener(
      "soulmusic:inputstopped",
      event => {
        const type =
          event.detail?.type;

        if (type === "music") {
          this.updateMusicStatus(
            "Muzică: inactivă"
          );
        }

        if (type === "voice") {
          this.updateVoiceStatus(
            "Microfon: inactiv"
          );
        }
      }
    );
  },

  fitStage() {
    const viewportWidth =
      window.innerWidth;

    const viewportHeight =
      window.innerHeight;

    const scaleX =
      viewportWidth /
      this.stageWidth;

    const scaleY =
      viewportHeight /
      this.stageHeight;

    const scale =
      Math.min(
        scaleX,
        scaleY
      );

    if (!this.elements.stage) {
      return;
    }

    this.elements.stage.style.transform = `
      translate(-50%, -50%)
      scale(${scale})
    `;
  },

  bindKeyboardShortcuts() {
    window.addEventListener(
      "keydown",
      async event => {
        const key =
          event.key.toLowerCase();

        if (key === "l") {
          this.toggleLock();
          return;
        }

        if (this.locked) {
          return;
        }

        if (key === "c") {
          this.toggleControlPanel();
        }

        if (key === "f") {
          await this.toggleFullscreen();
        }

        if (key === "r") {
          this.resetControls();
        }

        if (key === "1") {
          this.setMode("calm");
        }

        if (key === "2") {
          this.setMode("live");
        }

        if (key === "3") {
          this.setMode("party");
        }

        if (key === "4") {
          this.setMode("legendary");
        }
      }
    );
  },

  bindPanelButtons() {
    this.elements.hidePanel
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.hideControlPanel();
          }
        }
      );

    this.elements.toggleFullscreen
      ?.addEventListener(
        "click",
        async () => {
          if (!this.locked) {
            await this.toggleFullscreen();
          }
        }
      );

    this.elements.resetControls
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.resetControls();
          }
        }
      );

    this.elements.calmMode
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.setMode("calm");
          }
        }
      );

    this.elements.liveMode
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.setMode("live");
          }
        }
      );

    this.elements.partyMode
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.setMode("party");
          }
        }
      );

    this.elements.legendaryMode
      ?.addEventListener(
        "click",
        () => {
          if (!this.locked) {
            this.setMode("legendary");
          }
        }
      );
  },

  toggleControlPanel() {
    this.elements.controlPanel
      ?.classList.toggle("hidden");
  },

  hideControlPanel() {
    this.elements.controlPanel
      ?.classList.add("hidden");
  },

  showControlPanel() {
    this.elements.controlPanel
      ?.classList.remove("hidden");
  },

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement
          .requestFullscreen();

        this.showNotice(
          "Fullscreen activat"
        );
      } else {
        await document.exitFullscreen();

        this.showNotice(
          "Fullscreen dezactivat"
        );
      }
    } catch (error) {
      console.error(
        "Fullscreen error:",
        error
      );

      this.showNotice(
        "Fullscreen nu este permis"
      );
    }
  },

  toggleLock() {
    this.locked =
      !this.locked;

    document.body.dataset.locked =
      String(this.locked);

    this.showNotice(
      this.locked
        ? "Comenzile au fost blocate"
        : "Comenzile au fost deblocate"
    );

    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:lockchange",
        {
          detail: {
            locked:
              this.locked
          }
        }
      )
    );
  },

  setMode(
    mode,
    notify = true
  ) {
    const preset =
      this.presets[mode];

    if (!preset) {
      return;
    }

    this.mode =
      mode;

    document.body.dataset.engineMode =
      mode;

    this.applyPreset(
      preset
    );

    this.updateModeButtons(
      mode
    );

    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:modechange",
        {
          detail: {
            mode,
            preset: {
              ...preset
            }
          }
        }
      )
    );

    if (notify) {
      this.showNotice(
        `Mod ${preset.name} activat`
      );
    }
  },

  updateModeButtons(mode) {
    const buttons = [
      this.elements.calmMode,
      this.elements.liveMode,
      this.elements.partyMode,
      this.elements.legendaryMode
    ];

    buttons.forEach(button => {
      if (!button) {
        return;
      }

      const isActive =
        button.dataset.mode ===
        mode;

      button.classList.toggle(
        "active",
        isActive
      );
    });
  },

  applyPreset(preset) {
    this.setInputValue(
      this.elements.musicSensitivity,
      preset.musicSensitivity
    );

    this.setInputValue(
      this.elements.voiceSensitivity,
      preset.voiceSensitivity
    );

    this.setInputValue(
      this.elements.bassSensitivity,
      preset.bassSensitivity
    );

    this.setInputValue(
      this.elements.highSensitivity,
      preset.highSensitivity
    );

    this.setInputValue(
      this.elements.neonIntensity,
      preset.neonIntensity
    );

    this.setInputValue(
      this.elements.particleIntensity,
      preset.particleIntensity
    );
  },

  setInputValue(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.value =
      String(value);

    element.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );
  },

  resetControls() {
    this.setMode(
      "live",
      false
    );

    this.showNotice(
      "Setările au fost resetate"
    );

    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:reset"
      )
    );
  },

  getPreset() {
    return (
      this.presets[
        this.mode
      ] ||
      this.presets.live
    );
  },

  getState() {
    return {
      mode:
        this.mode,

      quality:
        this.quality,

      locked:
        this.locked,

      fps:
        this.smoothedFps,

      qualityMultiplier:
        this.getQualityMultiplier(),

      preset: {
        ...this.getPreset()
      }
    };
  },

  getQualityMultiplier() {
    if (
      this.quality ===
      "performance"
    ) {
      return 0.58;
    }

    if (
      this.quality ===
      "balanced"
    ) {
      return 0.8;
    }

    return 1;
  },

  startPerformanceMonitor() {
    const measureFrame =
      now => {
        const delta =
          Math.max(
            1,
            now -
            this.lastFrameTime
          );

        this.lastFrameTime =
          now;

        this.fps =
          1000 / delta;

        this.smoothedFps +=
          (
            this.fps -
            this.smoothedFps
          ) * 0.08;

        window.requestAnimationFrame(
          measureFrame
        );
      };

    window.requestAnimationFrame(
      measureFrame
    );

    this.qualityTimer =
      window.setInterval(
        () => {
          this.adjustQuality();
        },
        2500
      );
  },

  adjustQuality() {
    const previousQuality =
      this.quality;

    if (
      this.smoothedFps <
      34
    ) {
      this.quality =
        "performance";
    } else if (
      this.smoothedFps <
      49
    ) {
      this.quality =
        "balanced";
    } else {
      this.quality =
        "ultra";
    }

    document.body.dataset.quality =
      this.quality;

    const roundedFps =
      Math.round(
        this.smoothedFps
      );

    this.updatePerformanceStatus(
      `Engine: ${roundedFps} FPS • ${this.quality}`
    );

    if (
      previousQuality !==
      this.quality
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "soulmusic:qualitychange",
          {
            detail: {
              quality:
                this.quality,

              fps:
                roundedFps
            }
          }
        )
      );

      if (
        this.quality ===
        "performance"
      ) {
        this.showNotice(
          "Optimizare automată activată"
        );
      }
    }
  },

  updateMusicStatus(message) {
    if (
      this.elements.musicStatus
    ) {
      this.elements.musicStatus
        .textContent =
        message;
    }
  },

  updateVoiceStatus(message) {
    if (
      this.elements.voiceStatus
    ) {
      this.elements.voiceStatus
        .textContent =
        message;
    }
  },

  updatePerformanceStatus(message) {
    if (
      this.elements.performanceStatus
    ) {
      this.elements.performanceStatus
        .textContent =
        message;
    }
  },

  showNotice(message) {
    const notice =
      this.elements.shortcutNotice;

    if (!notice) {
      return;
    }

    notice.textContent =
      message;

    notice.classList.add(
      "visible"
    );

    window.clearTimeout(
      this.noticeTimer
    );

    this.noticeTimer =
      window.setTimeout(
        () => {
          notice.classList.remove(
            "visible"
          );
        },
        1600
      );
  }
};

window.EngineX =
  EngineX;

window.EngineV8 =
  EngineX;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    EngineX.init();
  }
);
