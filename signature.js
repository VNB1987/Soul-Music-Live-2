"use strict";

/*
  SOUL MUSIC SIGNATURE ENGINE — ETAPA 5

  Identitatea vie a scenei Soul Music:
  - respirație organică, elegantă și sincronizată cu energia muzicii;
  - paletă proprie: auriu, albastru, mov, roz-roșu și alb;
  - răspuns separat pentru muzică și voce;
  - momente signature rare, clare și fără aglomerare vizuală;
  - contract comun de variabile și evenimente pentru integrarea finală.
*/

const SoulSignature = {
  version: "0.5.0-stage5",

  sceneGraph: null,
  performanceEngine: null,
  elements: {},

  running: false,
  paused: false,
  enabled: true,
  eventsBound: false,

  mode: "live",
  animationFrameId: null,
  lastTime: 0,
  deltaSeconds: 1 / 60,
  lastFrameEventTime: 0,

  breathPhase: 0,
  breath: 0.5,
  musicEnergy: 0,
  voiceEnergy: 0,
  bassEnergy: 0,
  midsEnergy: 0,
  highsEnergy: 0,
  presence: 0,

  previousLevel: 0,
  bloomEnergy: 0,
  lastBloomTime: 0,
  silenceSeconds: 0,
  resting: true,

  currentAccent: {
    red: 255,
    green: 201,
    blue: 84
  },

  targetAccent: {
    red: 255,
    green: 201,
    blue: 84
  },

  palette: {
    gold: {
      red: 255,
      green: 201,
      blue: 84
    },

    blue: {
      red: 75,
      green: 188,
      blue: 255
    },

    purple: {
      red: 158,
      green: 92,
      blue: 255
    },

    rose: {
      red: 255,
      green: 62,
      blue: 118
    },

    white: {
      red: 246,
      green: 249,
      blue: 255
    },

    voice: {
      red: 255,
      green: 42,
      blue: 72
    }
  },

  profiles: {
    calm: {
      breathSpeed: 0.42,
      breathDepth: 0.18,
      musicReaction: 0.46,
      voiceReaction: 0.62,
      bloomThreshold: 0.24,
      bloomStrength: 0.50,
      bloomCooldown: 980,
      maximumIntensity: 0.58,
      frameEventRate: 20
    },

    live: {
      breathSpeed: 0.58,
      breathDepth: 0.24,
      musicReaction: 0.68,
      voiceReaction: 0.84,
      bloomThreshold: 0.19,
      bloomStrength: 0.68,
      bloomCooldown: 760,
      maximumIntensity: 0.76,
      frameEventRate: 30
    },

    party: {
      breathSpeed: 0.78,
      breathDepth: 0.30,
      musicReaction: 0.86,
      voiceReaction: 0.94,
      bloomThreshold: 0.15,
      bloomStrength: 0.82,
      bloomCooldown: 590,
      maximumIntensity: 0.90,
      frameEventRate: 30
    },

    legendary: {
      breathSpeed: 0.94,
      breathDepth: 0.34,
      musicReaction: 1,
      voiceReaction: 1,
      bloomThreshold: 0.12,
      bloomStrength: 1,
      bloomCooldown: 460,
      maximumIntensity: 1,
      frameEventRate: 60
    }
  },

  stats: {
    frames: 0,
    blooms: 0,
    drops: 0,
    voiceMoments: 0,
    rests: 0
  },

  init(options = {}) {
    if (options.sceneGraph) {
      this.connect(
        options.sceneGraph
      );
    }

    if (
      options.performanceEngine
    ) {
      this.connectPerformance(
        options.performanceEngine
      );
    }

    if (!this.elements.stage) {
      this.resolveElements();
    }

    if (options.mode) {
      this.setMode(
        options.mode,
        false
      );
    }

    this.bindEvents();
    this.reset(false);

    if (
      options.autoStart !== false
    ) {
      this.start();
    }

    this.emit(
      "soulmusic:signatureready",
      this.getState()
    );

    return this.getState();
  },

  connect(sceneGraph) {
    if (
      !sceneGraph ||
      typeof sceneGraph.getNode !==
      "function"
    ) {
      return false;
    }

    this.sceneGraph = sceneGraph;
    this.resolveElements();

    return true;
  },

  disconnect() {
    this.sceneGraph = null;
    this.elements = {};
  },

  connectPerformance(engine) {
    if (
      !engine ||
      typeof engine.getState !==
      "function"
    ) {
      return false;
    }

    this.performanceEngine = engine;

    return true;
  },

  resolveElements() {
    const runtime =
      this.getRuntime();

    const ids = [
      "stage",
      "logoGroup",
      "logoAmbientGlow",
      "logoAfterglow",
      "logoVoiceGlow",
      "soulLogo",
      "tiktokButton",
      "liveButton",
      "leftFrame",
      "cameraFrame"
    ];

    const domIds = {
      stage: "stage",
      logoGroup: "logoArea",
      logoAmbientGlow:
        "logoAmbientGlow",
      logoAfterglow:
        "logoAfterglow",
      logoVoiceGlow:
        "logoVoiceGlow",
      soulLogo: "soulLogo",
      tiktokButton:
        "tiktokButton",
      liveButton: "liveButton",
      leftFrame: "leftFrame",
      cameraFrame: "cameraFrame"
    };

    for (
      let index = 0;
      index < ids.length;
      index += 1
    ) {
      const id = ids[index];

      this.elements[id] =
        this.sceneGraph
          ?.getNode?.(id)
          ?.element ||
        runtime?.document
          ?.getElementById?.(
            domIds[id]
          ) ||
        null;
    }

    return this.elements;
  },

  setMode(
    mode,
    notify = true
  ) {
    if (!this.profiles[mode]) {
      return false;
    }

    this.mode = mode;

    if (notify) {
      this.emit(
        "soulmusic:signaturemodechange",
        {
          mode,
          profile: {
            ...this.profiles[mode]
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
      this.clearSignatureProperties();
    }
  },

  start() {
    if (this.running) {
      return false;
    }

    this.running = true;
    this.paused = false;
    this.lastTime = 0;
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

    this.animationFrameId = null;
    this.running = false;
    this.lastTime = 0;

    return true;
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

      const performance =
        this.getPerformanceState();

      const frame =
        this.update(
          time,
          audio,
          engine,
          performance
        );

      this.apply(frame);
      this.emitFrame(time, frame);
    }

    this.scheduleNextFrame();
  },

  update(
    time = 0,
    audio = {},
    engine = {},
    performance = {}
  ) {
    this.updateTiming(time);

    if (
      engine.mode &&
      this.profiles[engine.mode]
    ) {
      this.mode = engine.mode;
    }

    const profile =
      this.profiles[this.mode] ||
      this.profiles.live;

    const energies =
      this.getEnergies(audio);

    const previousVoice =
      this.voiceEnergy;

    this.musicEnergy =
      this.smooth(
        this.musicEnergy,
        energies.music,
        0.15,
        0.06
      );

    this.voiceEnergy =
      this.smooth(
        this.voiceEnergy,
        energies.voice,
        0.22,
        0.08
      );

    this.bassEnergy =
      this.smooth(
        this.bassEnergy,
        energies.bass,
        0.18,
        0.07
      );

    this.midsEnergy =
      this.smooth(
        this.midsEnergy,
        energies.mids,
        0.16,
        0.06
      );

    this.highsEnergy =
      this.smooth(
        this.highsEnergy,
        energies.highs,
        0.18,
        0.07
      );

    this.presence =
      this.clamp(
        this.musicEnergy * 0.78 +
        this.voiceEnergy * 0.54,
        0,
        1
      );

    const breathSpeed =
      profile.breathSpeed *
      (
        0.72 +
        this.musicEnergy * 0.58
      );

    this.breathPhase +=
      this.deltaSeconds *
      breathSpeed *
      Math.PI * 2;

    if (
      this.breathPhase >
      Math.PI * 2
    ) {
      this.breathPhase %=
        Math.PI * 2;
    }

    const primaryBreath =
      0.5 +
      Math.sin(
        this.breathPhase
      ) * 0.36;

    const organicBreath =
      Math.sin(
        this.breathPhase * 2 -
        0.72
      ) * 0.10;

    this.breath =
      this.clamp(
        primaryBreath +
        organicBreath,
        0,
        1
      );

    this.updateAccent();
    this.detectSignatureMoment(
      time,
      energies,
      profile
    );

    if (
      previousVoice < 0.18 &&
      this.voiceEnergy >= 0.18
    ) {
      this.stats.voiceMoments += 1;
    }

    this.updateRestingState(
      energies
    );

    this.bloomEnergy *=
      Math.pow(
        0.90,
        this.deltaSeconds * 60
      );

    this.previousLevel =
      energies.music;

    this.stats.frames += 1;

    return this.composeFrame(
      profile,
      performance
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
  },

  updateAccent() {
    const total =
      this.bassEnergy +
      this.midsEnergy +
      this.highsEnergy;

    if (this.voiceEnergy > 0.12) {
      this.targetAccent =
        this.mixRgb(
          this.palette.rose,
          this.palette.voice,
          this.voiceEnergy
        );
    } else if (total < 0.04) {
      this.targetAccent = {
        ...this.palette.gold
      };
    } else {
      const bassWeight =
        this.bassEnergy /
        total;

      const midsWeight =
        this.midsEnergy /
        total;

      const highsWeight =
        this.highsEnergy /
        total;

      this.targetAccent = {
        red:
          this.palette.gold.red *
          bassWeight +
          this.palette.purple.red *
          midsWeight +
          this.palette.blue.red *
          highsWeight,
        green:
          this.palette.gold.green *
          bassWeight +
          this.palette.purple.green *
          midsWeight +
          this.palette.blue.green *
          highsWeight,
        blue:
          this.palette.gold.blue *
          bassWeight +
          this.palette.purple.blue *
          midsWeight +
          this.palette.blue.blue *
          highsWeight
      };
    }

    this.currentAccent.red =
      this.lerp(
        this.currentAccent.red,
        this.targetAccent.red,
        0.055
      );

    this.currentAccent.green =
      this.lerp(
        this.currentAccent.green,
        this.targetAccent.green,
        0.055
      );

    this.currentAccent.blue =
      this.lerp(
        this.currentAccent.blue,
        this.targetAccent.blue,
        0.055
      );
  },

  detectSignatureMoment(
    time,
    energies,
    profile
  ) {
    const rise =
      energies.music -
      this.previousLevel;

    const weightedRise =
      rise +
      energies.bass * 0.08;

    if (
      weightedRise <
        profile.bloomThreshold ||
      (
        this.lastBloomTime > 0 &&
        time -
          this.lastBloomTime <
          profile.bloomCooldown
      )
    ) {
      return false;
    }

    this.triggerBloom(
      this.clamp(
        weightedRise *
        profile.bloomStrength *
        2.4,
        0.28,
        1
      ),
      "music-rise",
      time
    );

    return true;
  },

  triggerBloom(
    strength = 0.6,
    reason = "manual",
    time = this.getNow()
  ) {
    const profile =
      this.profiles[this.mode] ||
      this.profiles.live;

    if (
      this.lastBloomTime > 0 &&
      time -
      this.lastBloomTime <
      profile.bloomCooldown
    ) {
      return false;
    }

    this.bloomEnergy =
      Math.max(
        this.bloomEnergy,
        this.clamp(
          strength,
          0.20,
          1
        )
      );

    this.lastBloomTime = time;
    this.stats.blooms += 1;

    this.emit(
      "soulmusic:signaturebloom",
      {
        strength:
          this.bloomEnergy,
        reason,
        accent:
          this.toRgba(
            this.currentAccent,
            1
          )
      }
    );

    return true;
  },

  onDrop(strength = 0.7) {
    this.stats.drops += 1;

    return this.triggerBloom(
      this.clamp(
        strength,
        0.35,
        1
      ),
      "drop",
      this.getNow()
    );
  },

  updateRestingState(energies) {
    if (
      energies.music < 0.035 &&
      energies.voice < 0.035
    ) {
      this.silenceSeconds +=
        this.deltaSeconds;

      if (
        !this.resting &&
        this.silenceSeconds >= 1.8
      ) {
        this.resting = true;
        this.stats.rests += 1;
      }
    } else {
      this.silenceSeconds = 0;
      this.resting = false;
    }
  },

  composeFrame(
    profile,
    performance
  ) {
    const qualityMultiplier =
      this.clamp(
        performance?.budget
          ?.qualityMultiplier ||
        performance
          ?.qualityMultiplier ||
        1,
        0.40,
        1
      );

    const breathAmount =
      this.breath *
      profile.breathDepth;

    const musicGlow =
      this.clamp(
        (
          0.12 +
          breathAmount +
          this.musicEnergy *
          profile.musicReaction *
          0.68 +
          this.bloomEnergy * 0.52
        ) *
        qualityMultiplier,
        0.08,
        profile.maximumIntensity
      );

    const voiceGlow =
      this.clamp(
        this.voiceEnergy *
        profile.voiceReaction *
        qualityMultiplier,
        0,
        profile.maximumIntensity
      );

    const scale =
      1 +
      breathAmount * 0.018 +
      this.musicEnergy * 0.010 +
      this.bloomEnergy * 0.026;

    const accent =
      this.toRgba(
        this.currentAccent,
        1
      );

    return {
      mode: this.mode,
      resting: this.resting,
      breath: this.breath,
      scale,
      musicGlow,
      voiceGlow,
      bloom:
        this.bloomEnergy,
      presence:
        this.presence,
      accent,
      accentSoft:
        this.toRgba(
          this.currentAccent,
          0.34
        ),
      gold:
        this.toRgba(
          this.palette.gold,
          1
        ),
      voice:
        this.toRgba(
          this.palette.voice,
          1
        ),
      qualityMultiplier
    };
  },

  apply(frame) {
    const stage =
      this.elements.stage;

    if (!stage?.style) {
      return false;
    }

    const properties = {
      "--soul-signature-breath":
        frame.breath,
      "--soul-signature-scale":
        frame.scale,
      "--soul-signature-music":
        frame.musicGlow,
      "--soul-signature-voice":
        frame.voiceGlow,
      "--soul-signature-bloom":
        frame.bloom,
      "--soul-signature-presence":
        frame.presence,
      "--soul-signature-accent":
        frame.accent,
      "--soul-signature-accent-soft":
        frame.accentSoft,
      "--soul-signature-gold":
        frame.gold,
      "--soul-signature-voice-color":
        frame.voice,
      "--soul-signature-quality":
        frame.qualityMultiplier
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

    if (stage.dataset) {
      stage.dataset.signatureMode =
        this.mode;

      stage.dataset.signatureState =
        frame.resting
          ? "resting"
          : frame.voiceGlow > 0.08
            ? "voice"
            : "music";
    }

    return true;
  },

  emitFrame(time, frame) {
    const profile =
      this.profiles[this.mode] ||
      this.profiles.live;

    const performance =
      this.getPerformanceState();

    const sampleStride =
      performance?.budget
        ?.sampleStride || 1;

    const interval =
      1000 /
      Math.max(
        10,
        profile.frameEventRate /
        sampleStride
      );

    if (
      time -
      this.lastFrameEventTime <
      interval
    ) {
      return;
    }

    this.lastFrameEventTime = time;

    this.emit(
      "soulmusic:signatureframe",
      frame
    );
  },

  clearSignatureProperties() {
    const stage =
      this.elements.stage;

    if (!stage?.style) {
      return;
    }

    const properties = [
      "--soul-signature-breath",
      "--soul-signature-scale",
      "--soul-signature-music",
      "--soul-signature-voice",
      "--soul-signature-bloom",
      "--soul-signature-presence",
      "--soul-signature-accent",
      "--soul-signature-accent-soft",
      "--soul-signature-gold",
      "--soul-signature-voice-color",
      "--soul-signature-quality"
    ];

    for (
      let index = 0;
      index < properties.length;
      index += 1
    ) {
      stage.style.removeProperty(
        properties[index]
      );
    }

    if (stage.dataset) {
      delete stage.dataset
        .signatureMode;
      delete stage.dataset
        .signatureState;
    }
  },

  getEnergies(audio = {}) {
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
        music.level ||
        bass * 0.46 +
        mids * 0.34 +
        highs * 0.20,
        0,
        1
      );

    const voiceEnergy =
      voice.active &&
      voice.detected
        ? this.clamp(
            voice.energy ||
            voice.level || 0,
            0,
            1
          )
        : 0;

    return {
      music: level,
      voice: voiceEnergy,
      bass,
      mids,
      highs
    };
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
          0.7
        );
      }
    );
  },

  reset(notify = true) {
    this.lastTime = 0;
    this.deltaSeconds = 1 / 60;
    this.lastFrameEventTime = 0;
    this.breathPhase = 0;
    this.breath = 0.5;
    this.musicEnergy = 0;
    this.voiceEnergy = 0;
    this.bassEnergy = 0;
    this.midsEnergy = 0;
    this.highsEnergy = 0;
    this.presence = 0;
    this.previousLevel = 0;
    this.bloomEnergy = 0;
    this.lastBloomTime = 0;
    this.silenceSeconds = 0;
    this.resting = true;
    this.currentAccent = {
      ...this.palette.gold
    };
    this.targetAccent = {
      ...this.palette.gold
    };
    this.stats = {
      frames: 0,
      blooms: 0,
      drops: 0,
      voiceMoments: 0,
      rests: 0
    };

    const frame =
      this.composeFrame(
        this.profiles[this.mode] ||
        this.profiles.live,
        this.getPerformanceState()
      );

    this.apply(frame);

    if (notify) {
      this.emit(
        "soulmusic:signaturereset",
        this.getState()
      );
    }

    return this.getState();
  },

  getFrameState() {
    return this.composeFrame(
      this.profiles[this.mode] ||
      this.profiles.live,
      this.getPerformanceState()
    );
  },

  getState() {
    return {
      version: this.version,
      mode: this.mode,
      running: this.running,
      paused: this.paused,
      enabled: this.enabled,
      connected:
        Boolean(this.sceneGraph),
      performanceConnected:
        Boolean(
          this.performanceEngine
        ),
      elementCount:
        Object.values(
          this.elements
        ).filter(Boolean).length,
      resting: this.resting,
      breath: this.breath,
      presence: this.presence,
      bloomEnergy:
        this.bloomEnergy,
      accent:
        this.toRgba(
          this.currentAccent,
          1
        ),
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

  getPerformanceState() {
    if (this.performanceEngine) {
      return this.performanceEngine
        .getState();
    }

    const runtime =
      this.getRuntime();

    return runtime?.SoulPerformance
      ?.getState?.() || {};
  },

  smooth(
    current,
    target,
    attack,
    release
  ) {
    return current +
      (
        target - current
      ) *
      (
        target > current
          ? attack
          : release
      );
  },

  mixRgb(first, second, amount) {
    const ratio =
      this.clamp(
        amount,
        0,
        1
      );

    return {
      red:
        this.lerp(
          first.red,
          second.red,
          ratio
        ),
      green:
        this.lerp(
          first.green,
          second.green,
          ratio
        ),
      blue:
        this.lerp(
          first.blue,
          second.blue,
          ratio
        )
    };
  },

  toRgba(color, alpha = 1) {
    return `rgba(${Math.round(
      color.red
    )}, ${Math.round(
      color.green
    )}, ${Math.round(
      color.blue
    )}, ${this.clamp(
      alpha,
      0,
      1
    )})`;
  },

  lerp(start, end, amount) {
    return start +
      (
        end - start
      ) * amount;
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
  window.SoulSignature =
    SoulSignature;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulSignature;
}
