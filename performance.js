"use strict";

/*
  SOUL MUSIC PERFORMANCE ENGINE — ETAPA 4

  Gardianul de stabilitate pentru experiența live:
  - urmărește FPS, frame time, cadre lente și blocaje;
  - aplică histerezis pentru a evita schimbările bruște de calitate;
  - recomandă bugete comune pentru efecte, particule și cameră;
  - recuperează treptat nivelul Ultra după o perioadă stabilă;
  - funcționează independent până la etapa de integrare finală.
*/

const SoulPerformance = {
  version: "0.4.0-stage4",

  targetFps: 60,
  targetFrameMs: 1000 / 60,

  engine: null,
  running: false,
  paused: false,
  hidden: false,
  adaptive: true,

  profile: "ultra",
  manualProfile: null,
  profileReason: "startup",

  animationFrameId: null,
  heartbeatId: null,
  lastFrameTime: 0,
  lastEvaluationTime: 0,
  lastHeartbeatTime: 0,
  lastProfileChangeTime: 0,

  frameCursor: 0,
  frameSampleCount: 0,
  frameSamples: new Float32Array(240),

  smoothedFrameMs: 1000 / 60,
  smoothedFps: 60,
  minimumFps: 60,
  maximumFrameMs: 1000 / 60,
  p95FrameMs: 1000 / 60,
  longFrameRatio: 0,
  eventLoopLag: 0,
  memoryPressure: 0,

  stableEvaluations: 0,
  pressureEvaluations: 0,

  eventsBound: false,
  listeners: [],

  stats: {
    frames: 0,
    longFrames: 0,
    criticalFrames: 0,
    stalls: 0,
    degradations: 0,
    recoveries: 0,
    resets: 0
  },

  profiles: {
    ultra: {
      label: "Ultra",
      qualityMultiplier: 1,
      particleMultiplier: 1,
      effectsMultiplier: 1,
      cameraMultiplier: 1,
      shadowMultiplier: 1,
      blurMultiplier: 1,
      sampleStride: 1
    },

    balanced: {
      label: "Balanced",
      qualityMultiplier: 0.82,
      particleMultiplier: 0.82,
      effectsMultiplier: 0.84,
      cameraMultiplier: 0.90,
      shadowMultiplier: 0.72,
      blurMultiplier: 0.75,
      sampleStride: 1
    },

    performance: {
      label: "Performance",
      qualityMultiplier: 0.62,
      particleMultiplier: 0.64,
      effectsMultiplier: 0.66,
      cameraMultiplier: 0.78,
      shadowMultiplier: 0.46,
      blurMultiplier: 0.50,
      sampleStride: 2
    },

    emergency: {
      label: "Live Safe",
      qualityMultiplier: 0.44,
      particleMultiplier: 0.46,
      effectsMultiplier: 0.48,
      cameraMultiplier: 0.65,
      shadowMultiplier: 0.28,
      blurMultiplier: 0.30,
      sampleStride: 2
    }
  },

  profileOrder: [
    "ultra",
    "balanced",
    "performance",
    "emergency"
  ],

  thresholds: {
    evaluationInterval: 1200,
    profileCooldown: 1800,
    recoveryEvaluations: 5,
    longFrameMs: 24,
    criticalFrameMs: 48,
    stallMs: 130
  },

  init(options = {}) {
    if (options.engine) {
      this.connect(
        options.engine
      );
    }

    if (
      Number.isFinite(
        options.targetFps
      )
    ) {
      this.setTargetFps(
        options.targetFps
      );
    }

    if (
      typeof options.adaptive ===
      "boolean"
    ) {
      this.adaptive =
        options.adaptive;
    }

    this.bindEvents();
    this.reset(false);

    if (
      options.profile &&
      this.profiles[
        options.profile
      ]
    ) {
      this.setProfile(
        options.profile,
        "initial-profile",
        false
      );
    }

    if (
      options.autoStart !== false
    ) {
      this.start();
    }

    this.emit(
      "soulmusic:performanceready",
      this.getState()
    );

    return this.getState();
  },

  connect(engine) {
    if (
      !engine ||
      typeof engine.getState !==
      "function"
    ) {
      return false;
    }

    this.engine = engine;
    this.applyProfile();

    return true;
  },

  disconnect() {
    this.engine = null;
  },

  setTargetFps(fps) {
    this.targetFps =
      this.clamp(
        fps,
        30,
        120
      );

    this.targetFrameMs =
      1000 /
      this.targetFps;

    return this.targetFps;
  },

  start() {
    if (this.running) {
      return false;
    }

    this.running = true;
    this.paused = false;
    this.lastFrameTime = 0;
    this.lastEvaluationTime = 0;
    this.startHeartbeat();
    this.scheduleNextFrame();

    return true;
  },

  stop() {
    const runtime =
      this.getRuntime();

    if (
      this.animationFrameId !== null
    ) {
      runtime
        ?.cancelAnimationFrame
        ?.(this.animationFrameId);
    }

    if (
      this.heartbeatId !== null
    ) {
      runtime
        ?.clearInterval
        ?.(this.heartbeatId);
    }

    this.animationFrameId = null;
    this.heartbeatId = null;
    this.running = false;
    this.lastFrameTime = 0;

    return true;
  },

  pause() {
    this.paused = true;
    this.lastFrameTime = 0;
  },

  resume() {
    this.paused = false;
    this.lastFrameTime = 0;

    if (this.running) {
      this.scheduleNextFrame();
    }
  },

  scheduleNextFrame() {
    const runtime =
      this.getRuntime();

    if (
      !this.running ||
      !runtime?.requestAnimationFrame ||
      this.animationFrameId !== null
    ) {
      return;
    }

    this.animationFrameId =
      runtime.requestAnimationFrame(
        now => {
          this.animationFrameId = null;
          this.onAnimationFrame(now);
        }
      );
  },

  onAnimationFrame(now) {
    if (!this.running) {
      return;
    }

    if (
      !this.paused &&
      !this.hidden
    ) {
      this.sample(now);
    } else {
      this.lastFrameTime = 0;
    }

    this.scheduleNextFrame();
  },

  sample(now = this.getNow()) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = now;
      return this.getFrameState();
    }

    const frameMs =
      this.clamp(
        now -
        this.lastFrameTime,
        1,
        250
      );

    this.lastFrameTime = now;
    this.recordFrame(frameMs);

    if (
      !this.lastEvaluationTime
    ) {
      this.lastEvaluationTime = now;
    }

    if (
      now -
      this.lastEvaluationTime >=
      this.thresholds
        .evaluationInterval
    ) {
      this.evaluate(now);
      this.lastEvaluationTime = now;
    }

    return this.getFrameState();
  },

  recordFrame(frameMs) {
    this.frameSamples[
      this.frameCursor
    ] = frameMs;

    this.frameCursor =
      (
        this.frameCursor + 1
      ) %
      this.frameSamples.length;

    this.frameSampleCount =
      Math.min(
        this.frameSampleCount + 1,
        this.frameSamples.length
      );

    const fps =
      1000 / frameMs;

    this.smoothedFrameMs +=
      (
        frameMs -
        this.smoothedFrameMs
      ) * 0.075;

    this.smoothedFps +=
      (
        fps -
        this.smoothedFps
      ) * 0.075;

    this.minimumFps =
      Math.min(
        this.minimumFps,
        fps
      );

    this.maximumFrameMs =
      Math.max(
        this.maximumFrameMs,
        frameMs
      );

    this.stats.frames += 1;

    if (
      frameMs >=
      this.thresholds.longFrameMs
    ) {
      this.stats.longFrames += 1;
    }

    if (
      frameMs >=
      this.thresholds
        .criticalFrameMs
    ) {
      this.stats.criticalFrames += 1;
    }
  },

  evaluate(now = this.getNow()) {
    this.calculateWindowMetrics();
    this.measureMemoryPressure();

    const recommended =
      this.recommendProfile();

    if (
      !this.adaptive ||
      this.manualProfile
    ) {
      this.emitMetrics();
      return this.profile;
    }

    const currentRank =
      this.profileOrder.indexOf(
        this.profile
      );

    const recommendedRank =
      this.profileOrder.indexOf(
        recommended.profile
      );

    if (
      recommendedRank >
      currentRank
    ) {
      this.pressureEvaluations += 1;
      this.stableEvaluations = 0;

      const targetRank =
        recommendedRank >= 3
          ? 3
          : Math.min(
              currentRank + 1,
              recommendedRank
            );

      this.setProfile(
        this.profileOrder[
          targetRank
        ],
        recommended.reason,
        true,
        now
      );
    } else if (
      recommendedRank <
      currentRank
    ) {
      this.stableEvaluations += 1;
      this.pressureEvaluations = 0;

      if (
        this.stableEvaluations >=
        this.thresholds
          .recoveryEvaluations
      ) {
        this.setProfile(
          this.profileOrder[
            currentRank - 1
          ],
          "stable-recovery",
          true,
          now
        );

        this.stableEvaluations = 0;
      }
    } else {
      this.stableEvaluations =
        recommendedRank === 0
          ? Math.min(
              this.stableEvaluations + 1,
              this.thresholds
                .recoveryEvaluations
            )
          : 0;

      this.pressureEvaluations = 0;
    }

    this.emitMetrics();

    return this.profile;
  },

  calculateWindowMetrics() {
    const count =
      this.frameSampleCount;

    if (!count) {
      return;
    }

    const ordered =
      new Float32Array(count);

    let longFrames = 0;

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const value =
        this.frameSamples[index];

      ordered[index] = value;

      if (
        value >=
        this.thresholds.longFrameMs
      ) {
        longFrames += 1;
      }
    }

    ordered.sort();

    const percentileIndex =
      Math.min(
        count - 1,
        Math.floor(
          count * 0.95
        )
      );

    this.p95FrameMs =
      ordered[
        percentileIndex
      ];

    this.longFrameRatio =
      longFrames /
      count;
  },

  recommendProfile() {
    const fps =
      this.smoothedFps;

    const p95 =
      this.p95FrameMs;

    const longRatio =
      this.longFrameRatio;

    if (
      fps < 30 ||
      p95 > 48 ||
      this.eventLoopLag > 180 ||
      this.memoryPressure > 0.92
    ) {
      return {
        profile: "emergency",
        reason: "critical-live-pressure"
      };
    }

    if (
      fps < 44 ||
      p95 > 31 ||
      longRatio > 0.24 ||
      this.eventLoopLag > 100 ||
      this.memoryPressure > 0.84
    ) {
      return {
        profile: "performance",
        reason: "high-frame-pressure"
      };
    }

    if (
      fps < 55 ||
      p95 > 20.5 ||
      longRatio > 0.08 ||
      this.eventLoopLag > 52 ||
      this.memoryPressure > 0.72
    ) {
      return {
        profile: "balanced",
        reason: "moderate-frame-pressure"
      };
    }

    return {
      profile: "ultra",
      reason: "stable-60fps"
    };
  },

  setProfile(
    profile,
    reason = "manual",
    notify = true,
    now = this.getNow()
  ) {
    if (!this.profiles[profile]) {
      return false;
    }

    const previous =
      this.profile;

    if (
      notify &&
      previous !== profile &&
      reason !== "manual-lock" &&
      now -
      this.lastProfileChangeTime <
      this.thresholds
        .profileCooldown
    ) {
      return false;
    }

    this.profile = profile;
    this.profileReason = reason;

    if (previous === profile) {
      this.applyProfile();
      return true;
    }

    this.lastProfileChangeTime = now;

    const previousRank =
      this.profileOrder.indexOf(
        previous
      );

    const nextRank =
      this.profileOrder.indexOf(
        profile
      );

    if (nextRank > previousRank) {
      this.stats.degradations += 1;
    } else {
      this.stats.recoveries += 1;
    }

    this.applyProfile();

    if (notify) {
      this.emit(
        "soulmusic:performanceprofilechange",
        {
          previous,
          profile,
          reason,
          budget:
            this.getBudget(),
          metrics:
            this.getMetrics()
        }
      );

      this.emit(
        "soulmusic:qualitychange",
        {
          quality:
            this.getCompatibleQuality(),
          profile,
          reason,
          fps:
            Math.round(
              this.smoothedFps
            ),
          qualityMultiplier:
            this.getQualityMultiplier()
        }
      );
    }

    return true;
  },

  setManualProfile(profile = null) {
    if (profile === null) {
      this.manualProfile = null;
      this.adaptive = true;
      return true;
    }

    if (!this.profiles[profile]) {
      return false;
    }

    this.manualProfile = profile;
    this.adaptive = false;

    return this.setProfile(
      profile,
      "manual-lock"
    );
  },

  applyProfile() {
    const runtime =
      this.getRuntime();

    const quality =
      this.getCompatibleQuality();

    if (runtime?.document?.body) {
      runtime.document.body
        .dataset.performance =
        this.profile;

      runtime.document.body
        .dataset.quality =
        quality;
    }

    if (this.engine) {
      this.engine.quality = quality;

      this.engine
        .updatePerformanceStatus
        ?.(
          `Engine: ${Math.round(
            this.smoothedFps
          )} FPS • ${this.profile}`
        );
    }
  },

  getCompatibleQuality() {
    if (
      this.profile ===
      "emergency"
    ) {
      return "performance";
    }

    return this.profile;
  },

  getQualityMultiplier() {
    return this.profiles[
      this.profile
    ].qualityMultiplier;
  },

  getBudget() {
    const profile =
      this.profiles[
        this.profile
      ];

    return {
      profile:
        this.profile,
      targetFps:
        this.targetFps,
      qualityMultiplier:
        profile
          .qualityMultiplier,
      particleMultiplier:
        profile
          .particleMultiplier,
      effectsMultiplier:
        profile
          .effectsMultiplier,
      cameraMultiplier:
        profile
          .cameraMultiplier,
      shadowMultiplier:
        profile
          .shadowMultiplier,
      blurMultiplier:
        profile
          .blurMultiplier,
      sampleStride:
        profile
          .sampleStride
    };
  },

  getMetrics() {
    return {
      fps:
        this.smoothedFps,
      frameMs:
        this.smoothedFrameMs,
      p95FrameMs:
        this.p95FrameMs,
      minimumFps:
        this.minimumFps,
      maximumFrameMs:
        this.maximumFrameMs,
      longFrameRatio:
        this.longFrameRatio,
      eventLoopLag:
        this.eventLoopLag,
      memoryPressure:
        this.memoryPressure
    };
  },

  getFrameState() {
    return {
      profile:
        this.profile,
      fps:
        this.smoothedFps,
      frameMs:
        this.smoothedFrameMs,
      qualityMultiplier:
        this.getQualityMultiplier()
    };
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      paused: this.paused,
      hidden: this.hidden,
      adaptive: this.adaptive,
      connected:
        Boolean(this.engine),
      profile:
        this.profile,
      manualProfile:
        this.manualProfile,
      profileReason:
        this.profileReason,
      budget:
        this.getBudget(),
      metrics:
        this.getMetrics(),
      stats: {
        ...this.stats
      }
    };
  },

  startHeartbeat() {
    const runtime =
      this.getRuntime();

    if (
      !runtime?.setInterval ||
      this.heartbeatId !== null
    ) {
      return;
    }

    this.lastHeartbeatTime =
      this.getNow();

    this.heartbeatId =
      runtime.setInterval(
        () => {
          const now =
            this.getNow();

          const elapsed =
            now -
            this.lastHeartbeatTime;

          this.lastHeartbeatTime = now;

          const lag =
            Math.max(
              0,
              elapsed - 1000
            );

          this.eventLoopLag +=
            (
              lag -
              this.eventLoopLag
            ) * 0.25;

          if (
            lag >=
            this.thresholds.stallMs
          ) {
            this.stats.stalls += 1;
          }
        },
        1000
      );
  },

  measureMemoryPressure() {
    const memory =
      this.getRuntime()
        ?.performance?.memory;

    if (
      !memory ||
      !memory.jsHeapSizeLimit
    ) {
      this.memoryPressure = 0;
      return 0;
    }

    this.memoryPressure =
      this.clamp(
        memory.usedJSHeapSize /
        memory.jsHeapSizeLimit,
        0,
        1
      );

    return this.memoryPressure;
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

    this.listen(
      runtime,
      "soulmusic:pause",
      () => this.pause()
    );

    this.listen(
      runtime,
      "soulmusic:resume",
      () => this.resume()
    );

    this.listen(
      runtime,
      "soulmusic:reset",
      () => this.reset()
    );

    const document =
      runtime.document;

    if (document?.addEventListener) {
      this.listen(
        document,
        "visibilitychange",
        () => {
          this.hidden =
            document.hidden;

          this.lastFrameTime = 0;

          this.emit(
            "soulmusic:performancevisibility",
            {
              hidden:
                this.hidden
            }
          );
        }
      );
    }
  },

  listen(target, name, handler) {
    target.addEventListener(
      name,
      handler
    );

    this.listeners.push({
      target,
      name,
      handler
    });
  },

  unbindEvents() {
    for (
      let index = 0;
      index < this.listeners.length;
      index += 1
    ) {
      const listener =
        this.listeners[index];

      listener.target
        .removeEventListener?.(
          listener.name,
          listener.handler
        );
    }

    this.listeners = [];
    this.eventsBound = false;
  },

  emitMetrics() {
    this.emit(
      "soulmusic:performancemetrics",
      {
        profile:
          this.profile,
        metrics:
          this.getMetrics(),
        budget:
          this.getBudget()
      }
    );
  },

  reset(notify = true) {
    this.frameSamples.fill(0);
    this.frameCursor = 0;
    this.frameSampleCount = 0;
    this.lastFrameTime = 0;
    this.lastEvaluationTime = 0;
    this.smoothedFrameMs =
      this.targetFrameMs;
    this.smoothedFps =
      this.targetFps;
    this.minimumFps =
      this.targetFps;
    this.maximumFrameMs =
      this.targetFrameMs;
    this.p95FrameMs =
      this.targetFrameMs;
    this.longFrameRatio = 0;
    this.eventLoopLag = 0;
    this.memoryPressure = 0;
    this.stableEvaluations = 0;
    this.pressureEvaluations = 0;
    this.stats = {
      frames: 0,
      longFrames: 0,
      criticalFrames: 0,
      stalls: 0,
      degradations: 0,
      recoveries: 0,
      resets:
        this.stats.resets + 1
    };

    if (!this.manualProfile) {
      this.profile = "ultra";
      this.profileReason = "reset";
      this.lastProfileChangeTime = 0;
      this.applyProfile();
    }

    if (notify) {
      this.emit(
        "soulmusic:performancereset",
        this.getState()
      );
    }

    return this.getState();
  },

  destroy() {
    this.stop();
    this.unbindEvents();
    this.disconnect();
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
  window.SoulPerformance =
    SoulPerformance;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulPerformance;
}
