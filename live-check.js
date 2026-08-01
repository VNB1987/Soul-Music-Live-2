"use strict";

/*
  SOUL MUSIC LIVE READINESS — ETAPA 8

  Verificare și calibrare finală înainte de TikTok LIVE Studio:
  - runtime, Scene Graph și toate motoarele;
  - canvas-uri Full HD și ținta de 60 FPS;
  - rutarea CABLE Output + microfon real;
  - bridge-ul now-playing.txt;
  - presetul Live recomandat și starea generală de transmisie.
*/

const SoulLiveCheck = {
  version: "0.8.0-stage8",

  integration: null,
  engine: null,
  audio: null,
  performanceEngine: null,
  nowPlaying: null,

  running: false,
  completed: false,
  ready: false,
  score: 0,
  grade: "NEVERIFICAT",

  checks: [],
  lastRunTime: 0,
  autoRunTimerId: null,
  eventsBound: false,

  statusElement: null,

  calibration: {
    mode: "live",
    targetFps: 60,
    stageWidth: 1920,
    stageHeight: 1080,
    musicSensitivity: 4.5,
    voiceSensitivity: 6,
    bassSensitivity: 2,
    highSensitivity: 1.7,
    neonIntensity: 1.6,
    particleIntensity: 1.3
  },

  init(options = {}) {
    const runtime =
      this.getRuntime();

    this.integration =
      options.integration ||
      runtime?.SoulIntegration;

    this.engine =
      options.engine ||
      runtime?.EngineX;

    this.audio =
      options.audio ||
      runtime?.SoulAudio;

    this.performanceEngine =
      options.performanceEngine ||
      runtime?.SoulPerformance;

    this.nowPlaying =
      options.nowPlaying ||
      runtime?.SoulNowPlaying;

    this.statusElement =
      options.statusElement ||
      runtime?.document
        ?.getElementById?.(
          "liveReadinessStatus"
        ) || null;

    this.bindEvents();

    if (
      options.applyCalibration !==
      false
    ) {
      this.applyLiveCalibration();
    }

    this.updateUi(
      "LIVE: se verifică sistemul...",
      "checking"
    );

    if (options.autoRun !== false) {
      this.scheduleAutoRun(
        options.autoRunDelay ||
        2800
      );
    }

    this.emit(
      "soulmusic:livecheckready",
      this.getState()
    );

    return this.getState();
  },

  scheduleAutoRun(delay = 2800) {
    const runtime =
      this.getRuntime();

    if (!runtime?.setTimeout) {
      return false;
    }

    if (
      this.autoRunTimerId !== null
    ) {
      runtime.clearTimeout?.(
        this.autoRunTimerId
      );
    }

    this.autoRunTimerId =
      runtime.setTimeout(
        () => {
          this.autoRunTimerId = null;
          this.run();
        },
        Math.max(0, delay)
      );

    return true;
  },

  async run(options = {}) {
    if (this.running) {
      return this.getState();
    }

    this.running = true;
    this.completed = false;
    this.ready = false;
    this.checks = [];
    this.lastRunTime =
      this.getNow();

    this.updateUi(
      "LIVE: verificare în desfășurare...",
      "checking"
    );

    this.checkIntegration();
    this.checkSceneGraph();
    this.checkCanvases();
    this.checkModules();
    this.checkViewport();
    this.checkAudioApi();
    await this.checkAudioDevices();
    await this.checkBridge();

    const requestedDuration = Number(options.durationMs);
    const duration =
      this.clamp(
        Number.isFinite(requestedDuration) ? requestedDuration : 3000,
        0,
        15000
      );

    if (duration > 0) {
      await this.wait(duration);
    }

    this.checkPerformance();
    this.checkCalibration();
    this.finish();

    return this.getState();
  },

  runQuick() {
    this.running = true;
    this.completed = false;
    this.ready = false;
    this.checks = [];
    this.lastRunTime =
      this.getNow();

    this.checkIntegration();
    this.checkSceneGraph();
    this.checkCanvases();
    this.checkModules();
    this.checkViewport();
    this.checkAudioApi();
    this.checkPerformance();
    this.checkCalibration();
    this.finish();

    return this.getState();
  },

  checkIntegration() {
    const state =
      this.integration
        ?.getState?.();

    this.addCheck({
      id: "integration",
      label: "Integrare motoare",
      status:
        state?.ready
          ? "pass"
          : "fail",
      critical: true,
      detail:
        state?.ready
          ? "Toate motoarele sunt conectate"
          : "Integrarea nu este pregătită"
    });
  },

  checkSceneGraph() {
    const state =
      this.getRuntime()
        ?.SoulSceneGraph
        ?.getState?.();

    const valid =
      state?.ready &&
      state.nodeCount >= 19 &&
      state.errors?.length === 0;

    this.addCheck({
      id: "scene-graph",
      label: "Scene Graph",
      status:
        valid
          ? "pass"
          : "fail",
      critical: true,
      detail:
        valid
          ? `${state.nodeCount} noduri valide`
          : "Structura scenei este incompletă"
    });
  },

  checkCanvases() {
    const document =
      this.getRuntime()?.document;

    const ids = [
      "ambientCanvas",
      "visualizerCanvas",
      "logoScenesCanvas",
      "effectsCanvas"
    ];

    const invalid = [];

    for (
      let index = 0;
      index < ids.length;
      index += 1
    ) {
      const canvas =
        document?.getElementById?.(
          ids[index]
        );

      if (
        !canvas ||
        canvas.width !==
          this.calibration
            .stageWidth ||
        canvas.height !==
          this.calibration
            .stageHeight
      ) {
        invalid.push(ids[index]);
      }
    }

    this.addCheck({
      id: "full-hd-canvases",
      label: "Canvas Full HD",
      status:
        invalid.length === 0
          ? "pass"
          : "fail",
      critical: true,
      detail:
        invalid.length === 0
          ? "4 canvas-uri la 1920 × 1080"
          : `Canvas invalid: ${invalid.join(", ")}`
    });
  },

  checkModules() {
    const runtime =
      this.getRuntime();

    const modules = [
      ["Camera", runtime?.SoulCamera],
      ["Particles", runtime?.SoulParticles],
      ["Performance", runtime?.SoulPerformance],
      ["Signature", runtime?.SoulSignature],
      ["Scene Director", runtime?.SoulSceneDirector],
      ["Logo Scenes", runtime?.SoulLogoScenes],
      ["Frame Neon", runtime?.SoulFrameNeon],
      ["Smart Banner", runtime?.SoulSmartBanner],
      ["Now Playing", runtime?.SoulNowPlaying],
      ["Momente Soul", runtime?.SoulMoments],
      ["Memorie", runtime?.SoulMemory]
    ];

    const stopped = [];

    for (
      let index = 0;
      index < modules.length;
      index += 1
    ) {
      const [name, module] =
        modules[index];

      if (!module?.getState?.().running) {
        stopped.push(name);
      }
    }

    this.addCheck({
      id: "runtime-modules",
      label: "Motoare runtime",
      status:
        stopped.length === 0
          ? "pass"
          : "fail",
      critical: true,
      detail:
        stopped.length === 0
          ? "11 motoare adaptive active"
          : `Motoare oprite: ${stopped.join(", ")}`
    });
  },

  checkViewport() {
    const runtime =
      this.getRuntime();

    const stage =
      runtime?.document
        ?.getElementById?.("stage");

    const width =
      Number.parseFloat(
        runtime?.getComputedStyle?.(
          stage
        )?.width ||
        stage?.style?.width || 0
      );

    const height =
      Number.parseFloat(
        runtime?.getComputedStyle?.(
          stage
        )?.height ||
        stage?.style?.height || 0
      );

    const valid =
      width === 1920 &&
      height === 1080;

    this.addCheck({
      id: "stage-resolution",
      label: "Scenă nativă",
      status:
        valid
          ? "pass"
          : "fail",
      critical: true,
      detail:
        valid
          ? "1920 × 1080 Full HD"
          : `${width || 0} × ${height || 0}`
    });
  },

  checkAudioApi() {
    const mediaDevices =
      this.getRuntime()
        ?.navigator?.mediaDevices;

    const available =
      Boolean(
        mediaDevices
          ?.getUserMedia &&
        mediaDevices
          ?.enumerateDevices
      );

    this.addCheck({
      id: "audio-api",
      label: "Acces audio browser",
      status:
        available
          ? "pass"
          : "fail",
      critical: true,
      detail:
        available
          ? "Dispozitivele audio pot fi accesate"
          : "Browserul nu oferă MediaDevices"
    });
  },

  async checkAudioDevices() {
    const runtime =
      this.getRuntime();

    const musicSelect =
      runtime?.document
        ?.getElementById?.(
          "musicDevice"
        );

    const voiceSelect =
      runtime?.document
        ?.getElementById?.(
          "voiceDevice"
        );

    const musicLabel =
      this.getSelectedLabel(
        musicSelect
      );

    const voiceLabel =
      this.getSelectedLabel(
        voiceSelect
      );

    const musicUnknown =
      !musicLabel ||
      /Dispozitiv audio|Încarc/i
        .test(musicLabel);

    const musicCorrect =
      /CABLE Output|VB-Audio|CABLE/i
        .test(musicLabel);

    this.addCheck({
      id: "music-route",
      label: "Rutare muzică",
      status:
        musicCorrect
          ? "pass"
          : "warn",
      critical: false,
      detail:
        musicCorrect
          ? musicLabel
          : musicUnknown
            ? "Selectează CABLE Output după acordarea permisiunii"
            : `Verifică selecția: ${musicLabel}`
    });

    const voiceUnknown =
      !voiceLabel ||
      /Dispozitiv audio|Încarc/i
        .test(voiceLabel);

    const voiceCorrect =
      Boolean(voiceLabel) &&
      !/CABLE|Virtual|Steam/i
        .test(voiceLabel);

    this.addCheck({
      id: "voice-route",
      label: "Rutare microfon",
      status:
        voiceCorrect
          ? "pass"
          : "warn",
      critical: false,
      detail:
        voiceCorrect
          ? voiceLabel
          : voiceUnknown
            ? "Selectează microfonul real"
            : `Nu folosi cablul virtual pentru voce: ${voiceLabel}`
    });

    const audioState =
      this.audio?.getState?.();

    this.addCheck({
      id: "audio-active",
      label: "Canale audio active",
      status:
        audioState?.music?.active
          ? "pass"
          : "warn",
      critical: false,
      detail:
        audioState?.music?.active
          ? audioState.voice?.active
            ? "Muzică și microfon active"
            : "Muzică activă; microfonul poate fi activat separat"
          : "Activează muzica înainte de transmisie"
    });
  },

  async checkBridge() {
    const runtime =
      this.getRuntime();

    if (!runtime?.fetch) {
      this.addCheck({
        id: "now-playing-bridge",
        label: "Now Playing bridge",
        status: "warn",
        critical: false,
        detail:
          "Fetch nu este disponibil"
      });
      return;
    }

    try {
      const response =
        await runtime.fetch(
          `now-playing.txt?check=${Date.now()}`,
          { cache: "no-store" }
        );

      this.addCheck({
        id: "now-playing-bridge",
        label: "Now Playing bridge",
        status:
          response.ok
            ? "pass"
            : "warn",
        critical: false,
        detail:
          response.ok
            ? "now-playing.txt este accesibil"
            : `Răspuns HTTP ${response.status}`
      });
    } catch (error) {
      this.addCheck({
        id: "now-playing-bridge",
        label: "Now Playing bridge",
        status: "warn",
        critical: false,
        detail:
          error?.message ||
          "Bridge indisponibil"
      });
    }
  },

  checkPerformance() {
    const state =
      this.performanceEngine
        ?.getState?.();

    const fps =
      Number(
        state?.metrics?.fps || 0
      );

    const frames =
      Number(
        state?.stats?.frames || 0
      );

    let status = "pass";
    let detail =
      `${fps.toFixed(1)} FPS • ${state?.profile || "necunoscut"}`;

    if (frames < 30) {
      status = "warn";
      detail =
        "Monitorul FPS este încă în încălzire";
    } else if (fps < 42) {
      status = "fail";
    } else if (fps < 55) {
      status = "warn";
    }

    this.addCheck({
      id: "performance-60fps",
      label: "Performanță live",
      status,
      critical: true,
      detail
    });
  },

  checkCalibration() {
    const preset =
      this.engine?.presets?.live;

    const valid =
      preset &&
      preset.musicSensitivity ===
        this.calibration
          .musicSensitivity &&
      preset.voiceSensitivity ===
        this.calibration
          .voiceSensitivity &&
      preset.bassSensitivity ===
        this.calibration
          .bassSensitivity &&
      preset.highSensitivity ===
        this.calibration
          .highSensitivity &&
      preset.neonIntensity ===
        this.calibration
          .neonIntensity &&
      preset.particleIntensity ===
        this.calibration
          .particleIntensity;

    this.addCheck({
      id: "live-calibration",
      label: "Calibrare Live",
      status:
        valid
          ? "pass"
          : "warn",
      critical: false,
      detail:
        valid
          ? "Preset Soul Music Live aplicat"
          : "Presetul Live a fost modificat"
    });
  },

  applyLiveCalibration() {
    const preset =
      this.engine?.presets?.live;

    if (!preset) {
      return false;
    }

    Object.assign(
      preset,
      {
        musicSensitivity:
          this.calibration
            .musicSensitivity,
        voiceSensitivity:
          this.calibration
            .voiceSensitivity,
        bassSensitivity:
          this.calibration
            .bassSensitivity,
        highSensitivity:
          this.calibration
            .highSensitivity,
        neonIntensity:
          this.calibration
            .neonIntensity,
        particleIntensity:
          this.calibration
            .particleIntensity
      }
    );

    if (this.engine.mode === "live") {
      this.engine.setMode?.(
        "live",
        false
      );
    }

    this.performanceEngine
      ?.setTargetFps?.(
        this.calibration.targetFps
      );

    this.emit(
      "soulmusic:livecalibration",
      {
        ...this.calibration
      }
    );

    return true;
  },

  addCheck(check) {
    const normalized = {
      id: check.id,
      label: check.label,
      status:
        ["pass", "warn", "fail"]
          .includes(check.status)
          ? check.status
          : "warn",
      critical:
        Boolean(check.critical),
      detail:
        String(check.detail || "")
    };

    const existingIndex =
      this.checks.findIndex(
        item =>
          item.id === normalized.id
      );

    if (existingIndex >= 0) {
      this.checks[existingIndex] =
        normalized;
    } else {
      this.checks.push(normalized);
    }

    return normalized;
  },

  finish() {
    const failures =
      this.checks.filter(
        check =>
          check.status === "fail"
      );

    const criticalFailures =
      failures.filter(
        check => check.critical
      );

    const warnings =
      this.checks.filter(
        check =>
          check.status === "warn"
      );

    const penalty =
      criticalFailures.length * 24 +
      (
        failures.length -
        criticalFailures.length
      ) * 12 +
      warnings.length * 4;

    this.score =
      Math.max(
        0,
        100 - penalty
      );

    this.ready =
      criticalFailures.length === 0;

    this.grade =
      !this.ready
        ? "NEPREGĂTIT"
        : warnings.length > 0
          ? "READY CU ATENȚIONĂRI"
          : "LIVE READY";

    this.running = false;
    this.completed = true;

    this.updateUi(
      this.ready
        ? `LIVE: READY • ${this.score}/100`
        : `LIVE: VERIFICĂ SISTEMUL • ${this.score}/100`,
      this.ready
        ? warnings.length > 0
          ? "warning"
          : "ready"
        : "not-ready"
    );

    this.emit(
      "soulmusic:livecheckcomplete",
      this.getState()
    );

    return this.getState();
  },

  updateUi(message, state) {
    if (this.statusElement) {
      this.statusElement.textContent =
        message;
      this.statusElement.dataset.state =
        state;
    }

    const body =
      this.getRuntime()
        ?.document?.body;

    if (body) {
      body.dataset.liveReady = state;
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
      "soulmusic:inputactivated",
      () => {
        this.scheduleAutoRun(900);
      }
    );

    runtime.addEventListener(
      "soulmusic:inputstopped",
      () => {
        this.scheduleAutoRun(900);
      }
    );

    runtime.addEventListener(
      "soulmusic:performanceprofilechange",
      event => {
        if (
          event.detail?.profile ===
          "emergency"
        ) {
          this.updateUi(
            "LIVE: protecție de performanță activă",
            "warning"
          );
        }
      }
    );
  },

  getSelectedLabel(select) {
    return select
      ?.selectedOptions?.[0]
      ?.textContent?.trim() ||
      "";
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      completed: this.completed,
      ready: this.ready,
      score: this.score,
      grade: this.grade,
      lastRunTime:
        this.lastRunTime,
      calibration: {
        ...this.calibration
      },
      checks:
        this.checks.map(
          check => ({ ...check })
        )
    };
  },

  wait(duration) {
    const runtime =
      this.getRuntime();

    return new Promise(resolve => {
      runtime?.setTimeout
        ? runtime.setTimeout(
            resolve,
            duration
          )
        : resolve();
    });
  },

  getNow() {
    const runtime =
      this.getRuntime();

    return runtime
      ?.performance?.now
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

  clamp(value, minimum, maximum) {
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
  window.SoulLiveCheck =
    SoulLiveCheck;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulLiveCheck;
}
