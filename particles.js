"use strict";

/*
  SOUL MUSIC PARTICLE ENGINE ULTRA — ETAPA 3

  Particule inteligente 3D pentru ambientCanvas:
  - mișcare fluidă și organică;
  - reacție individuală la bass, medii și înalte;
  - curcubeu pentru muzică, roșu puternic pentru voce;
  - protecție vizuală în jurul logo-ului;
  - bugete adaptive pentru 60 FPS constant.

  Modul independent. Conectarea în index.html și Engine X
  se face numai într-o etapă ulterioară.
*/

const SoulParticles = {
  version: "0.3.0-stage3",

  width: 1920,
  height: 1080,

  canvas: null,
  context: null,
  sceneGraph: null,

  mode: "live",
  enabled: true,
  paused: false,
  running: false,

  particles: [],
  animationFrameId: null,
  eventsBound: false,

  lastTime: 0,
  deltaSeconds: 1 / 60,
  smoothedFps: 60,

  adaptiveGain: 1,
  dropEnergy: 0,

  cameraFrame: {
    x: 0,
    y: 0,
    zoom: 1,
    roll: 0
  },

  logoSafeZone: {
    centerX: 960,
    centerY: 375,
    radiusX: 360,
    radiusY: 225,
    minimumOpacity: 0.16
  },

  presets: {
    calm: {
      particleCount: 88,
      speed: 0.42,
      turbulence: 0.34,
      audioReaction: 0.48,
      brightness: 0.58,
      maxOpacity: 0.42,
      bokehRatio: 0.20
    },

    live: {
      particleCount: 138,
      speed: 0.66,
      turbulence: 0.54,
      audioReaction: 0.72,
      brightness: 0.76,
      maxOpacity: 0.56,
      bokehRatio: 0.24
    },

    party: {
      particleCount: 188,
      speed: 0.88,
      turbulence: 0.74,
      audioReaction: 0.94,
      brightness: 0.92,
      maxOpacity: 0.68,
      bokehRatio: 0.28
    },

    legendary: {
      particleCount: 238,
      speed: 1.08,
      turbulence: 0.92,
      audioReaction: 1.14,
      brightness: 1,
      maxOpacity: 0.78,
      bokehRatio: 0.32
    }
  },

  frequencyBands: [
    "bass",
    "mids",
    "highs"
  ],

  stats: {
    created: 0,
    recycled: 0,
    frames: 0,
    drops: 0
  },

  init(options = {}) {
    if (options.sceneGraph) {
      this.connect(
        options.sceneGraph
      );
    }

    if (options.canvas) {
      this.attachCanvas(
        options.canvas
      );
    }

    if (!this.canvas) {
      const runtime =
        this.getRuntime();

      const canvas =
        runtime?.document
          ?.getElementById?.(
            "ambientCanvas"
          );

      if (canvas) {
        this.attachCanvas(canvas);
      }
    }

    if (options.mode) {
      this.setMode(
        options.mode,
        false
      );
    }

    this.bindEvents();
    this.reset(false);
    this.resizePool(
      this.getDesiredCount()
    );

    if (options.autoStart) {
      this.start();
    }

    this.emit(
      "soulmusic:particlesready",
      this.getState()
    );

    return this.getState();
  },

  attachCanvas(canvas) {
    if (
      !canvas ||
      typeof canvas.getContext !==
      "function"
    ) {
      return false;
    }

    this.canvas = canvas;
    this.context =
      canvas.getContext(
        "2d",
        {
          alpha: true,
          desynchronized: true
        }
      );

    if (!this.context) {
      this.canvas = null;
      return false;
    }

    this.canvas.width =
      this.width;
    this.canvas.height =
      this.height;

    return true;
  },

  connect(sceneGraph) {
    if (
      !sceneGraph ||
      typeof sceneGraph.getNode !==
      "function"
    ) {
      return false;
    }

    this.sceneGraph =
      sceneGraph;

    const canvas =
      sceneGraph.getNode(
        "ambientCanvas"
      )?.element;

    if (canvas) {
      this.attachCanvas(canvas);
    }

    return true;
  },

  disconnect() {
    this.sceneGraph = null;
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

    runtime.addEventListener(
      "soulmusic:modechange",
      event => {
        const mode =
          event.detail?.mode;

        if (mode) {
          this.setMode(mode);
        }
      }
    );

    runtime.addEventListener(
      "soulmusic:drop",
      event => {
        this.onDrop(
          event.detail?.strength ||
          0.5
        );
      }
    );

    runtime.addEventListener(
      "soulmusic:cameraframe",
      event => {
        const camera =
          event.detail?.camera;

        if (camera) {
          this.cameraFrame = {
            ...this.cameraFrame,
            ...camera
          };
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

    this.resizePool(
      this.getDesiredCount()
    );

    if (notify) {
      this.emit(
        "soulmusic:particlesmodechange",
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
      this.clear();
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
    this.lastTime = 0;
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
      !runtime?.requestAnimationFrame ||
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

    if (
      !this.paused &&
      this.enabled
    ) {
      const audio =
        this.getAudioState();

      const engine =
        this.getEngineState();

      this.update(
        time,
        audio,
        engine
      );

      this.render(
        time,
        audio,
        engine
      );
    }

    this.scheduleNextFrame();
  },

  update(
    time = 0,
    audio = {},
    engine = {}
  ) {
    this.updateTiming(time);

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

    this.resizePool(
      this.getDesiredCount(
        engine,
        audio
      )
    );

    const energies =
      this.getFrequencyEnergies(
        audio
      );

    this.updateAdaptiveGain(
      energies.combined
    );

    const voiceEnergy =
      energies.voice;

    for (
      let index = 0;
      index < this.particles.length;
      index += 1
    ) {
      const particle =
        this.particles[index];

      const bandEnergy =
        energies[
          particle.band
        ] || 0;

      const reaction =
        this.clamp(
          bandEnergy *
          this.adaptiveGain *
          particle.sensitivity *
          preset.audioReaction,
          0,
          1.4
        );

      this.updateParticle(
        particle,
        time,
        reaction,
        voiceEnergy,
        preset
      );
    }

    this.dropEnergy *=
      Math.pow(
        0.91,
        this.deltaSeconds * 60
      );

    this.stats.frames += 1;

    return this.getFrameState(
      energies
    );
  },

  updateTiming(time) {
    if (!this.lastTime) {
      this.lastTime = time;
    }

    const elapsed =
      Math.max(
        1,
        time -
        this.lastTime
      );

    this.lastTime = time;

    this.deltaSeconds =
      Math.min(
        0.05,
        elapsed / 1000
      );

    const instantFps =
      1000 / elapsed;

    this.smoothedFps +=
      (
        instantFps -
        this.smoothedFps
      ) * 0.06;
  },

  updateAdaptiveGain(energy) {
    const target =
      this.clamp(
        0.62 /
        Math.max(
          0.16,
          energy
        ),
        0.72,
        2.4
      );

    this.adaptiveGain +=
      (
        target -
        this.adaptiveGain
      ) * 0.025;
  },

  updateParticle(
    particle,
    time,
    reaction,
    voiceEnergy,
    preset
  ) {
    const delta =
      this.deltaSeconds * 60;

    const depthSpeed =
      0.42 +
      particle.z * 0.68;

    const flowX =
      Math.sin(
        particle.y * 0.0042 +
        time * 0.00022 +
        particle.phase
      );

    const flowY =
      Math.cos(
        particle.x * 0.0036 -
        time * 0.00018 +
        particle.phase * 0.73
      );

    const swirl =
      preset.turbulence *
      particle.flowStrength;

    particle.velocityX +=
      flowX *
      swirl *
      0.018 *
      delta;

    particle.velocityY +=
      flowY *
      swirl *
      0.018 *
      delta;

    const angle =
      Math.atan2(
        particle.y -
          this.logoSafeZone
            .centerY,
        particle.x -
          this.logoSafeZone
            .centerX
      );

    const dropPush =
      this.dropEnergy *
      particle.dropResponse *
      depthSpeed;

    particle.velocityX +=
      Math.cos(angle) *
      dropPush *
      0.14 *
      delta;

    particle.velocityY +=
      Math.sin(angle) *
      dropPush *
      0.10 *
      delta;

    particle.velocityZ +=
      (
        reaction *
        0.0018 +
        this.dropEnergy *
        0.0025
      ) *
      particle.depthDirection *
      delta;

    const speed =
      preset.speed *
      depthSpeed *
      (
        1 +
        reaction * 0.44
      );

    particle.x +=
      particle.velocityX *
      speed *
      delta;

    particle.y +=
      particle.velocityY *
      speed *
      delta;

    particle.z +=
      particle.velocityZ *
      delta;

    particle.velocityX *=
      Math.pow(
        0.986,
        delta
      );

    particle.velocityY *=
      Math.pow(
        0.986,
        delta
      );

    particle.velocityZ *=
      Math.pow(
        0.965,
        delta
      );

    particle.life +=
      particle.lifeSpeed *
      delta;

    particle.currentEnergy +=
      (
        reaction -
        particle.currentEnergy
      ) *
      (
        reaction >
        particle.currentEnergy
          ? 0.22
          : 0.07
      );

    particle.voiceMix +=
      (
        voiceEnergy -
        particle.voiceMix
      ) *
      (
        voiceEnergy >
        particle.voiceMix
          ? 0.28
          : 0.08
      );

    if (
      particle.x < -140 ||
      particle.x > this.width + 140 ||
      particle.y < -140 ||
      particle.y > this.height + 140 ||
      particle.z < 0.02 ||
      particle.z > 1.18 ||
      particle.life > 1
    ) {
      this.recycleParticle(
        particle
      );
    }
  },

  render(
    time = 0,
    audio = {},
    engine = {}
  ) {
    if (!this.context) {
      return;
    }

    const context =
      this.context;

    const preset =
      this.presets[this.mode] ||
      this.presets.live;

    const voice =
      audio.voice || {};

    const voiceEnergy =
      voice.active &&
      voice.detected
        ? Number(
            voice.energy || 0
          )
        : 0;

    context.clearRect(
      0,
      0,
      this.width,
      this.height
    );

    context.save();
    context.globalCompositeOperation =
      "lighter";

    for (
      let index = 0;
      index <
      this.particles.length;
      index += 1
    ) {
      this.drawParticle(
        this.particles[index],
        time,
        voiceEnergy,
        preset,
        engine
      );
    }

    context.restore();
  },

  drawParticle(
    particle,
    time,
    voiceEnergy,
    preset,
    engine
  ) {
    const context =
      this.context;

    const perspective =
      0.52 +
      particle.z * 0.94;

    const cameraDepth =
      0.18 +
      particle.z * 0.82;

    const cameraX =
      Number(
        this.cameraFrame.x || 0
      ) *
      cameraDepth;

    const cameraY =
      Number(
        this.cameraFrame.y || 0
      ) *
      cameraDepth;

    const x =
      particle.x -
      cameraX;

    const y =
      particle.y -
      cameraY;

    const safeZoneOpacity =
      this.getSafeZoneOpacity(
        x,
        y
      );

    const pulse =
      0.72 +
      0.28 *
      Math.sin(
        time *
          particle.twinkleSpeed +
        particle.phase
      );

    const opacity =
      this.clamp(
        particle.baseOpacity *
        pulse *
        (
          0.72 +
          particle.currentEnergy *
          0.58
        ) *
        safeZoneOpacity *
        preset.brightness,
        0,
        preset.maxOpacity
      );

    if (opacity < 0.008) {
      return;
    }

    const size =
      particle.size *
      perspective *
      (
        1 +
        particle.currentEnergy *
        particle.sizeReaction *
        0.62 +
        this.dropEnergy *
        0.24
      );

    const hue =
      (
        particle.hue +
        time *
          particle.hueSpeed +
        particle.currentEnergy *
          38
      ) % 360;

    const musicColor =
      `hsla(
        ${hue},
        100%,
        ${
          62 +
          particle.z * 18
        }%,
        ${opacity}
      )`;

    const voiceColor =
      `rgba(
        255,
        ${
          22 +
          particle.z * 34
        },
        ${
          54 +
          particle.z * 28
        },
        ${opacity}
      )`;

    const color =
      particle.voiceMix > 0.025 ||
      voiceEnergy > 0.025
        ? voiceColor
        : musicColor;

    context.save();

    context.beginPath();
    context.arc(
      x,
      y,
      Math.max(
        0.35,
        size
      ),
      0,
      Math.PI * 2
    );

    if (particle.bokeh) {
      const gradient =
        context.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          Math.max(
            1,
            size * 2.8
          )
        );

      gradient.addColorStop(
        0,
        color
      );
      gradient.addColorStop(
        0.42,
        color
      );
      gradient.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
      );

      context.fillStyle =
        gradient;
    } else {
      context.fillStyle =
        color;
    }

    context.shadowColor =
      color;

    context.shadowBlur =
      Math.min(
        26,
        (
          4 +
          size * 2.8 +
          particle.currentEnergy *
            11
        ) *
        (
          engine.qualityMultiplier ||
          1
        )
      );

    context.fill();
    context.restore();
  },

  createParticle(
    initial = false
  ) {
    const preset =
      this.presets[this.mode] ||
      this.presets.live;

    const edge =
      Math.floor(
        Math.random() * 4
      );

    let x;
    let y;

    if (initial) {
      x = Math.random() *
        this.width;
      y = Math.random() *
        this.height;
    } else if (edge === 0) {
      x = -45;
      y = Math.random() *
        this.height;
    } else if (edge === 1) {
      x = this.width + 45;
      y = Math.random() *
        this.height;
    } else if (edge === 2) {
      x = Math.random() *
        this.width;
      y = -45;
    } else {
      x = Math.random() *
        this.width;
      y = this.height + 45;
    }

    const z =
      0.06 +
      Math.random() * 0.98;

    const angle =
      Math.random() *
      Math.PI * 2;

    const speed =
      0.12 +
      Math.random() * 0.52;

    const bokeh =
      Math.random() <
      preset.bokehRatio;

    const particle = {
      x,
      y,
      z,
      velocityX:
        Math.cos(angle) *
        speed,
      velocityY:
        Math.sin(angle) *
        speed,
      velocityZ:
        -0.0008 +
        Math.random() * 0.0016,
      depthDirection:
        Math.random() > 0.5
          ? 1
          : -1,
      size:
        0.7 +
        Math.random() *
        (
          bokeh
            ? 8.2
            : 3.6
        ),
      baseOpacity:
        0.16 +
        Math.random() * 0.48,
      hue:
        Math.random() * 360,
      hueSpeed:
        0.006 +
        Math.random() * 0.026,
      phase:
        Math.random() *
        Math.PI * 2,
      twinkleSpeed:
        0.0012 +
        Math.random() * 0.0038,
      band:
        this.frequencyBands[
          Math.floor(
            Math.random() *
            this.frequencyBands.length
          )
        ],
      sensitivity:
        0.62 +
        Math.random() * 0.82,
      flowStrength:
        0.55 +
        Math.random() * 0.90,
      dropResponse:
        0.48 +
        Math.random() * 0.85,
      sizeReaction:
        0.45 +
        Math.random() * 0.75,
      bokeh:
        bokeh,
      life:
        initial
          ? Math.random() * 0.88
          : 0,
      lifeSpeed:
        0.0007 +
        Math.random() * 0.0013,
      currentEnergy: 0,
      voiceMix: 0
    };

    this.stats.created += 1;

    return particle;
  },

  recycleParticle(particle) {
    const replacement =
      this.createParticle(false);

    Object.assign(
      particle,
      replacement
    );

    this.stats.recycled += 1;
  },

  resizePool(count) {
    const target =
      Math.round(
        this.clamp(
          count,
          24,
          280
        )
      );

    while (
      this.particles.length <
      target
    ) {
      this.particles.push(
        this.createParticle(true)
      );
    }

    if (
      this.particles.length >
      target
    ) {
      this.particles.length =
        target;
    }
  },

  getDesiredCount(
    engine = {},
    audio = {}
  ) {
    const preset =
      this.presets[
        engine.mode ||
        this.mode
      ] ||
      this.presets.live;

    const quality =
      this.clamp(
        engine.qualityMultiplier || 1,
        0.40,
        1
      );

    const intensity =
      this.clamp(
        audio.particleIntensity || 1,
        0.35,
        2
      );

    const fpsProtection =
      this.smoothedFps < 42
        ? 0.64
        : this.smoothedFps < 52
          ? 0.82
          : 1;

    return preset.particleCount *
      quality *
      Math.min(
        1.24,
        0.78 +
        intensity * 0.22
      ) *
      fpsProtection;
  },

  getFrequencyEnergies(audio = {}) {
    const music =
      audio.music || {};

    const voice =
      audio.voice || {};

    const bass =
      this.clamp(
        music.bass || 0,
        0,
        1
      );

    const mids =
      this.clamp(
        music.mids || 0,
        0,
        1
      );

    const highs =
      this.clamp(
        music.highs || 0,
        0,
        1
      );

    const level =
      this.clamp(
        music.level || 0,
        0,
        1
      );

    const voiceEnergy =
      voice.active &&
      voice.detected
        ? this.clamp(
            voice.energy ||
            voice.level ||
            0,
            0,
            1
          )
        : 0;

    return {
      bass,
      mids,
      highs,
      voice: voiceEnergy,
      combined:
        this.clamp(
          level * 0.38 +
          bass * 0.30 +
          mids * 0.20 +
          highs * 0.12 +
          voiceEnergy * 0.12,
          0,
          1
        )
    };
  },

  getSafeZoneOpacity(
    x,
    y
  ) {
    const zone =
      this.logoSafeZone;

    const normalizedX =
      (
        x -
        zone.centerX
      ) /
      zone.radiusX;

    const normalizedY =
      (
        y -
        zone.centerY
      ) /
      zone.radiusY;

    const distance =
      Math.sqrt(
        normalizedX *
          normalizedX +
        normalizedY *
          normalizedY
      );

    if (distance >= 1) {
      return 1;
    }

    return zone.minimumOpacity +
      (
        1 -
        zone.minimumOpacity
      ) *
      distance *
      distance;
  },

  onDrop(strength = 0.5) {
    this.dropEnergy =
      Math.max(
        this.dropEnergy,
        this.clamp(
          strength,
          0.25,
          1
        )
      );

    this.stats.drops += 1;
  },

  reset(notify = true) {
    this.particles = [];
    this.lastTime = 0;
    this.deltaSeconds = 1 / 60;
    this.smoothedFps = 60;
    this.adaptiveGain = 1;
    this.dropEnergy = 0;
    this.cameraFrame = {
      x: 0,
      y: 0,
      zoom: 1,
      roll: 0
    };
    this.stats = {
      created: 0,
      recycled: 0,
      frames: 0,
      drops: 0
    };

    this.resizePool(
      this.getDesiredCount()
    );
    this.clear();

    if (notify) {
      this.emit(
        "soulmusic:particlesreset",
        this.getState()
      );
    }

    return this.getState();
  },

  clear() {
    this.context?.clearRect(
      0,
      0,
      this.width,
      this.height
    );
  },

  getFrameState(energies = {}) {
    return {
      particleCount:
        this.particles.length,
      fps:
        this.smoothedFps,
      adaptiveGain:
        this.adaptiveGain,
      dropEnergy:
        this.dropEnergy,
      energies: {
        ...energies
      }
    };
  },

  getState() {
    return {
      version: this.version,
      mode: this.mode,
      enabled: this.enabled,
      paused: this.paused,
      running: this.running,
      connected:
        Boolean(this.sceneGraph),
      canvasReady:
        Boolean(this.canvas),
      particleCount:
        this.particles.length,
      fps:
        this.smoothedFps,
      adaptiveGain:
        this.adaptiveGain,
      dropEnergy:
        this.dropEnergy,
      stats: {
        ...this.stats
      }
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
  window.SoulParticles =
    SoulParticles;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulParticles;
}
