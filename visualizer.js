"use strict";

const SoulVisualizer = {
  canvas: null,
  context: null,

  width: 1920,
  height: 1080,

  logoBox: {
    x: 575,
    y: 105,
    width: 770,
    height: 525
  },

  particles: [],
  beatParticles: [],

  previousBass: 0,
  beatEnergy: 0,
  afterglowEnergy: 0,
  voiceEnergy: 0,

  paused: false,

  elements: {},

  init() {
    this.canvas =
      document.getElementById(
        "visualizerCanvas"
      );

    if (!this.canvas) {
      console.error(
        "visualizerCanvas nu a fost găsit."
      );

      return;
    }

    this.context =
      this.canvas.getContext(
        "2d"
      );

    this.canvas.width =
      this.width;

    this.canvas.height =
      this.height;

    this.cacheElements();
    this.createParticles();
    this.bindEvents();

    window.requestAnimationFrame(
      time => this.animate(time)
    );
  },

  cacheElements() {
    this.elements.logo =
      document.getElementById(
        "soulLogo"
      );

    this.elements.logoAmbientGlow =
      document.getElementById(
        "logoAmbientGlow"
      );

    this.elements.logoAfterglow =
      document.getElementById(
        "logoAfterglow"
      );

    this.elements.logoVoiceGlow =
      document.getElementById(
        "logoVoiceGlow"
      );
  },

  bindEvents() {
    window.addEventListener(
      "soulmusic:pause",
      () => {
        this.paused = true;
      }
    );

    window.addEventListener(
      "soulmusic:resume",
      () => {
        this.paused = false;
      }
    );

    window.addEventListener(
      "soulmusic:reset",
      () => {
        this.reset();
      }
    );
  },

  reset() {
    this.previousBass = 0;
    this.beatEnergy = 0;
    this.afterglowEnergy = 0;
    this.voiceEnergy = 0;
    this.beatParticles = [];
  },

  createParticles() {
    this.particles = [];

    for (
      let index = 0;
      index < 150;
      index += 1
    ) {
      this.particles.push({
        angle:
          Math.random() *
          Math.PI *
          2,

        distance:
          230 +
          Math.random() *
          250,

        speed:
          0.00015 +
          Math.random() *
          0.00115,

        size:
          0.7 +
          Math.random() *
          3.2,

        phase:
          Math.random() *
          Math.PI *
          2,

        hueOffset:
          Math.random() *
          360
      });
    }
  },

  animate(time = 0) {
    window.requestAnimationFrame(
      nextTime =>
        this.animate(nextTime)
    );

    if (
      this.paused ||
      !window.SoulAudio
    ) {
      return;
    }

    SoulAudio.update();

    const audio =
      SoulAudio.getState();

    const engine =
      window.EngineX?.getState?.() || {
        mode: "live",
        qualityMultiplier: 1,

        preset: {
          effectMultiplier: 1,
          speedMultiplier: 1,
          particleIntensity: 1
        }
      };

    const music =
      audio.music;

    const voice =
      audio.voice;

    const musicEnergy =
      Math.min(
        1,
        music.level * 0.78 +
        music.bass * 0.52 +
        music.highs * 0.12
      );

    const targetVoiceEnergy =
      voice.active &&
      voice.detected
        ? voice.energy
        : 0;

    this.voiceEnergy +=
      (
        targetVoiceEnergy -
        this.voiceEnergy
      ) *
      (
        targetVoiceEnergy >
        this.voiceEnergy
          ? 0.42
          : 0.10
      );

    this.detectBeat(
      music,
      engine
    );

    this.afterglowEnergy =
      Math.max(
        musicEnergy,
        this.afterglowEnergy *
        0.94
      );

    this.context.clearRect(
      0,
      0,
      this.width,
      this.height
    );

    this.drawAmbientHalo(
      time,
      music,
      this.voiceEnergy,
      engine
    );

    this.drawLogoContourVisualizer(
      time,
      music,
      this.voiceEnergy,
      audio,
      engine
    );

    this.drawBassBeams(
      time,
      music,
      this.voiceEnergy,
      audio,
      engine
    );

    this.drawEnergyWaves(
      time,
      music,
      this.voiceEnergy,
      audio,
      engine
    );

    this.drawOrbitingParticles(
      time,
      music,
      this.voiceEnergy,
      audio,
      engine
    );

    this.drawBeatParticles(
      time,
      this.voiceEnergy,
      engine
    );

    this.drawVoiceOverlay(
      time,
      voice,
      this.voiceEnergy,
      audio,
      engine
    );

    this.animateLogo(
      time,
      music,
      this.voiceEnergy,
      engine
    );

    this.beatEnergy *=
      0.86;
  },

  detectBeat(
    music,
    engine
  ) {
    const bass =
      Number(
        music.bass || 0
      );

    const difference =
      bass -
      this.previousBass;

    const mode =
      engine.mode ||
      "live";

    const threshold =
      mode === "legendary"
        ? 0.020
        : mode === "party"
          ? 0.027
          : mode === "calm"
            ? 0.050
            : 0.035;

    if (
      music.active &&
      bass > 0.16 &&
      difference > threshold
    ) {
      this.beatEnergy = 1;

      this.createBeatBurst(
        bass,
        engine
      );
    }

    this.previousBass =
      bass;
  },

  getCenter() {
    return {
      x:
        this.logoBox.x +
        this.logoBox.width /
        2,

      y:
        this.logoBox.y +
        this.logoBox.height /
        2
    };
  },

  getRainbowColor(
    index,
    time,
    opacity = 1
  ) {
    const hue =
      (
        time * 0.045 +
        index * 5.8
      ) % 360;

    return `hsla(
      ${hue},
      100%,
      64%,
      ${opacity}
    )`;
  },

  getVoiceColor(
    index,
    opacity = 1
  ) {
    const colors = [
      `rgba(
        255,
        28,
        67,
        ${opacity}
      )`,

      `rgba(
        145,
        0,
        38,
        ${opacity}
      )`,

      `rgba(
        204,
        72,
        35,
        ${opacity}
      )`,

      `rgba(
        88,
        8,
        23,
        ${opacity}
      )`
    ];

    return colors[
      index %
      colors.length
    ];
  },

  drawAmbientHalo(
    time,
    music,
    voiceEnergy,
    engine
  ) {
    const context =
      this.context;

    const center =
      this.getCenter();

    const energy =
      Math.max(
        music.level,
        voiceEnergy,
        this.afterglowEnergy *
        0.7
      );

    const radius =
      270 +
      energy * 120 +
      this.beatEnergy * 45;

    const hue =
      (
        time * 0.025
      ) % 360;

    const gradient =
      context.createRadialGradient(
        center.x,
        center.y,
        25,
        center.x,
        center.y,
        radius
      );

    gradient.addColorStop(
      0,
      `hsla(
        ${hue},
        100%,
        62%,
        ${
          0.05 +
          music.level * 0.18
        }
      )`
    );

    gradient.addColorStop(
      0.35,
      `rgba(
        255,
        214,
        90,
        ${
          0.03 +
          music.bass * 0.10
        }
      )`
    );

    if (voiceEnergy > 0.01) {
      gradient.addColorStop(
        0.58,
        `rgba(
          160,
          0,
          38,
          ${
            voiceEnergy * 0.18
          }
        )`
      );
    }

    gradient.addColorStop(
      1,
      "rgba(0, 0, 0, 0)"
    );

    context.save();

    context.fillStyle =
      gradient;

    context.beginPath();

    context.arc(
      center.x,
      center.y,
      radius,
      0,
      Math.PI * 2
    );

    context.fill();

    context.restore();
  },

  getLogoAnchors() {
    const box =
      this.logoBox;

    const points = [];

    /*
      Aripa stângă
    */

    for (
      let index = 0;
      index < 48;
      index += 1
    ) {
      const progress =
        index / 47;

      points.push({
        x:
          box.x +
          18 +
          progress * 320,

        y:
          box.y +
          150 -
          Math.sin(
            progress *
            Math.PI
          ) * 118,

        directionX:
          -1 +
          progress * 0.44,

        directionY:
          -0.60 +
          progress * 0.74
      });
    }

    /*
      Aripa dreaptă
    */

    for (
      let index = 0;
      index < 48;
      index += 1
    ) {
      const progress =
        index / 47;

      points.push({
        x:
          box.x +
          box.width -
          18 -
          progress * 320,

        y:
          box.y +
          150 -
          Math.sin(
            progress *
            Math.PI
          ) * 118,

        directionX:
          1 -
          progress * 0.44,

        directionY:
          -0.60 +
          progress * 0.74
      });
    }

    /*
      Zona superioară SOUL
    */

    for (
      let index = 0;
      index < 46;
      index += 1
    ) {
      const progress =
        index / 45;

      points.push({
        x:
          box.x +
          170 +
          progress * 430,

        y:
          box.y +
          248 +
          Math.sin(
            progress *
            Math.PI
          ) * 18,

        directionX:
          (
            progress -
            0.5
          ) * 0.72,

        directionY:
          -0.92
      });
    }

    /*
      Zona inferioară MUSIC
    */

    for (
      let index = 0;
      index < 52;
      index += 1
    ) {
      const progress =
        index / 51;

      points.push({
        x:
          box.x +
          145 +
          progress * 480,

        y:
          box.y +
          398 +
          Math.sin(
            progress *
            Math.PI
          ) * 34,

        directionX:
          (
            progress -
            0.5
          ) * 0.70,

        directionY:
          1
      });
    }

    /*
      Discul central
    */

    const center =
      this.getCenter();

    for (
      let index = 0;
      index < 60;
      index += 1
    ) {
      const angle =
        index /
        60 *
        Math.PI *
        2;

      points.push({
        x:
          center.x +
          Math.cos(angle) *
          112,

        y:
          center.y -
          32 +
          Math.sin(angle) *
          112,

        directionX:
          Math.cos(angle),

        directionY:
          Math.sin(angle)
      });
    }

    return points;
  },

  drawLogoContourVisualizer(
    time,
    music,
    voiceEnergy,
    audio,
    engine
  ) {
    const data =
      music.frequencyData;

    if (
      !music.active ||
      !data
    ) {
      return;
    }

    const context =
      this.context;

    const anchors =
      this.getLogoAnchors();

    const preset =
      engine.preset;

    const qualityMultiplier =
      engine.qualityMultiplier ||
      1;

    const step =
      qualityMultiplier < 0.7
        ? 2
        : 1;

    for (
      let index = 0;
      index < anchors.length;
      index += step
    ) {
      const anchor =
        anchors[index];

      const frequencyIndex =
        Math.floor(
          index /
          anchors.length *
          data.length *
          0.68
        );

      const frequency =
        data[
          frequencyIndex
        ] / 255;

      const shapedFrequency =
        Math.pow(
          frequency,
          1.18
        );

      const rayLength =
        8 +
        shapedFrequency *
        145 *
        preset.effectMultiplier +
        music.bass * 72 +
        this.beatEnergy * 95;

      const startX =
        anchor.x +
        anchor.directionX * 5;

      const startY =
        anchor.y +
        anchor.directionY * 5;

      const endX =
        startX +
        anchor.directionX *
        rayLength;

      const endY =
        startY +
        anchor.directionY *
        rayLength;

      const color =
        this.getRainbowColor(
          index,
          time,
          0.18 +
          music.level * 0.70
        );

      context.save();

      context.beginPath();

      context.moveTo(
        startX,
        startY
      );

      context.lineTo(
        endX,
        endY
      );

      context.lineWidth =
        1.4 +
        shapedFrequency * 5 +
        this.beatEnergy * 2;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          10 +
          shapedFrequency * 38 +
          this.beatEnergy * 25
        ) *
        audio.neonIntensity *
        preset.effectMultiplier;

      context.stroke();

      context.restore();
    }
  },

  drawBassBeams(
    time,
    music,
    voiceEnergy,
    audio,
    engine
  ) {
    const bass =
      Number(
        music.bass || 0
      );

    if (
      !music.active ||
      bass < 0.045
    ) {
      return;
    }

    const context =
      this.context;

    const center =
      this.getCenter();

    const mode =
      engine.mode ||
      "live";

    const beamCount =
      mode === "legendary"
        ? 42
        : mode === "party"
          ? 34
          : mode === "calm"
            ? 16
            : 25;

    for (
      let index = 0;
      index < beamCount;
      index += 1
    ) {
      const angle =
        -Math.PI * 0.94 +
        (
          index /
          Math.max(
            1,
            beamCount - 1
          )
        ) *
        Math.PI *
        1.88;

      const length =
        110 +
        bass *
        390 *
        engine.preset
          .effectMultiplier +
        this.beatEnergy * 190;

      const startRadius =
        190;

      const startX =
        center.x +
        Math.cos(angle) *
        startRadius;

      const startY =
        center.y +
        Math.sin(angle) *
        startRadius *
        0.55;

      const endX =
        startX +
        Math.cos(angle) *
        length;

      const endY =
        startY +
        Math.sin(angle) *
        length *
        0.70;

      const color =
        this.getRainbowColor(
          index * 5,
          time,
          0.04 +
          bass * 0.30
        );

      context.save();

      context.beginPath();

      context.moveTo(
        startX,
        startY
      );

      context.lineTo(
        endX,
        endY
      );

      context.lineWidth =
        1 +
        bass * 3.4;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          10 +
          bass * 28
        ) *
        audio.neonIntensity;

      context.stroke();

      context.restore();
    }
  },

  drawEnergyWaves(
    time,
    music,
    voiceEnergy,
    audio,
    engine
  ) {
    const context =
      this.context;

    const center =
      this.getCenter();

    const mode =
      engine.mode ||
      "live";

    const waveCount =
      mode === "legendary"
        ? 7
        : mode === "party"
          ? 5
          : mode === "calm"
            ? 2
            : 4;

    for (
      let layer = 0;
      layer < waveCount;
      layer += 1
    ) {
      const pulse =
        0.5 +
        0.5 *
        Math.sin(
          time * 0.0025 *
          engine.preset
            .speedMultiplier +
          layer * 0.9
        );

      const radiusX =
        300 +
        layer * 28 +
        music.bass * 55 +
        pulse * 12;

      const radiusY =
        165 +
        layer * 16 +
        music.mids * 32 +
        pulse * 8;

      const color =
        this.getRainbowColor(
          layer * 16,
          time,
          0.06 +
          music.level * 0.20
        );

      context.save();

      context.beginPath();

      context.ellipse(
        center.x,
        center.y,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2
      );

      context.lineWidth =
        1.2 +
        music.highs * 2;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          10 +
          music.level * 22
        ) *
        audio.neonIntensity;

      context.stroke();

      context.restore();
    }
  },

  drawOrbitingParticles(
    time,
    music,
    voiceEnergy,
    audio,
    engine
  ) {
    const context =
      this.context;

    const center =
      this.getCenter();

    const qualityMultiplier =
      engine.qualityMultiplier ||
      1;

    const particleMultiplier =
      audio.particleIntensity *
      engine.preset
        .particleIntensity *
      qualityMultiplier;

    const desiredCount =
      Math.min(
        this.particles.length,
        Math.round(
          60 +
          particleMultiplier * 42
        )
      );

    for (
      let index = 0;
      index < desiredCount;
      index += 1
    ) {
      const particle =
        this.particles[index];

      particle.angle +=
        particle.speed *
        (
          1 +
          music.highs * 8
        ) *
        16 *
        engine.preset
          .speedMultiplier;

      const pulse =
        Math.sin(
          time * 0.002 +
          particle.phase
        );

      const distance =
        particle.distance +
        pulse * 22 +
        music.highs * 110 +
        this.beatEnergy * 28;

      const x =
        center.x +
        Math.cos(
          particle.angle
        ) *
        distance;

      const y =
        center.y +
        Math.sin(
          particle.angle
        ) *
        distance *
        0.58;

      const opacity =
        0.04 +
        music.highs * 0.76 +
        this.beatEnergy * 0.22;

      const hue =
        (
          particle.hueOffset +
          time * 0.025
        ) % 360;

      const color =
        `hsla(
          ${hue},
          100%,
          68%,
          ${opacity}
        )`;

      context.save();

      context.beginPath();

      context.arc(
        x,
        y,
        particle.size +
        music.highs * 3.8,
        0,
        Math.PI * 2
      );

      context.fillStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        8 +
        music.highs * 25;

      context.fill();

      context.restore();
    }
  },

  createBeatBurst(
    bass,
    engine
  ) {
    const center =
      this.getCenter();

    const count =
      Math.round(
        (
          16 +
          bass * 36
        ) *
        engine.preset
          .particleIntensity *
        engine.qualityMultiplier
      );

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        2 +
        Math.random() *
        (
          5 +
          bass * 9
        );

      this.beatParticles.push({
        x:
          center.x,

        y:
          center.y,

        velocityX:
          Math.cos(angle) *
          speed,

        velocityY:
          Math.sin(angle) *
          speed *
          0.66,

        size:
          1 +
          Math.random() *
          4,

        life:
          1,

        decay:
          0.012 +
          Math.random() *
          0.022,

        hue:
          Math.random() *
          360
      });
    }

    if (
      this.beatParticles.length >
      420
    ) {
      this.beatParticles.splice(
        0,
        this.beatParticles.length -
        420
      );
    }
  },

  drawBeatParticles(
    time,
    voiceEnergy,
    engine
  ) {
    const context =
      this.context;

    for (
      let index =
        this.beatParticles.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const particle =
        this.beatParticles[index];

      particle.x +=
        particle.velocityX;

      particle.y +=
        particle.velocityY;

      particle.velocityX *=
        0.985;

      particle.velocityY *=
        0.985;

      particle.life -=
        particle.decay;

      if (
        particle.life <= 0
      ) {
        this.beatParticles.splice(
          index,
          1
        );

        continue;
      }

      const color =
        voiceEnergy > 0.02
          ? `rgba(
              255,
              35,
              70,
              ${particle.life}
            )`
          : `hsla(
              ${
                (
                  particle.hue +
                  time * 0.04
                ) %
                360
              },
              100%,
              66%,
              ${particle.life}
            )`;

      context.save();

      context.beginPath();

      context.arc(
        particle.x,
        particle.y,
        particle.size *
        (
          0.7 +
          particle.life
        ),
        0,
        Math.PI * 2
      );

      context.fillStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        10 +
        particle.life * 24;

      context.fill();

      context.restore();
    }
  },

  drawVoiceOverlay(
    time,
    voice,
    voiceEnergy,
    audio,
    engine
  ) {
    if (
      voiceEnergy < 0.01
    ) {
      return;
    }

    const context =
      this.context;

    const anchors =
      this.getLogoAnchors();

    const step =
      engine.qualityMultiplier <
      0.7
        ? 2
        : 1;

    for (
      let index = 0;
      index < anchors.length;
      index += step
    ) {
      const anchor =
        anchors[index];

      const movement =
        0.5 +
        0.5 *
        Math.sin(
          time * 0.014 +
          index * 0.36
        );

      const length =
        10 +
        voiceEnergy *
        (
          48 +
          movement * 62
        );

      const startX =
        anchor.x +
        anchor.directionX * 7;

      const startY =
        anchor.y +
        anchor.directionY * 7;

      const endX =
        startX +
        anchor.directionX *
        length;

      const endY =
        startY +
        anchor.directionY *
        length;

      const color =
        this.getVoiceColor(
          index,
          0.18 +
          voiceEnergy * 0.78
        );

      context.save();

      context.beginPath();

      context.moveTo(
        startX,
        startY
      );

      context.lineTo(
        endX,
        endY
      );

      context.lineWidth =
        1.8 +
        voiceEnergy * 4.4;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          12 +
          voiceEnergy * 40
        ) *
        audio.neonIntensity;

      context.stroke();

      context.restore();
    }

    const center =
      this.getCenter();

    for (
      let layer = 0;
      layer < 4;
      layer += 1
    ) {
      const pulse =
        0.5 +
        0.5 *
        Math.sin(
          time * 0.011 +
          layer
        );

      const color =
        this.getVoiceColor(
          layer,
          0.10 +
          voiceEnergy * 0.36
        );

      context.save();

      context.beginPath();

      context.ellipse(
        center.x,
        center.y,
        320 +
        layer * 24 +
        voiceEnergy * 72 +
        pulse * 10,
        175 +
        layer * 14 +
        voiceEnergy * 44 +
        pulse * 7,
        0,
        0,
        Math.PI * 2
      );

      context.lineWidth =
        1.5 +
        voiceEnergy * 2.7;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          15 +
          voiceEnergy * 38
        ) *
        engine.preset
          .effectMultiplier;

      context.stroke();

      context.restore();
    }
  },

  animateLogo(
    time,
    music,
    voiceEnergy,
    engine
  ) {
    const logo =
      this.elements.logo;

    const ambientGlow =
      this.elements
        .logoAmbientGlow;

    const afterglow =
      this.elements
        .logoAfterglow;

    const voiceGlow =
      this.elements
        .logoVoiceGlow;

    if (!logo) {
      return;
    }

    const scale =
      1 +
      music.level * 0.025 +
      music.bass * 0.028 +
      voiceEnergy * 0.020 +
      this.beatEnergy * 0.026;

    logo.style.transform =
      `scale(${scale})`;

    const hue =
      (
        time * 0.035
      ) % 360;

    logo.style.filter = `
      drop-shadow(
        0 18px 34px
        rgba(0, 0, 0, 0.96)
      )
      drop-shadow(
        0 0 ${
          14 +
          music.level * 42
        }px
        hsla(
          ${hue},
          100%,
          62%,
          ${
            0.24 +
            music.level * 0.64
          }
        )
      )
      drop-shadow(
        0 0 ${
          voiceEnergy * 44
        }px
        rgba(
          255,
          28,
          67,
          ${
            voiceEnergy * 0.94
          }
        )
      )
    `;

    if (ambientGlow) {
      ambientGlow.style.opacity =
        String(
          0.42 +
          music.level * 0.38
        );

      ambientGlow.style.transform = `
        translate(-50%, -50%)
        scale(
          ${
            1 +
            music.level * 0.10 +
            this.beatEnergy * 0.04
          }
        )
      `;

      ambientGlow.style.background = `
        radial-gradient(
          ellipse at center,
          hsla(
            ${hue},
            100%,
            62%,
            ${
              0.07 +
              music.level * 0.19
            }
          ),
          rgba(
            255,
            214,
            90,
            ${
              0.04 +
              music.bass * 0.12
            }
          ) 44%,
          transparent 72%
        )
      `;
    }

    if (afterglow) {
      afterglow.style.opacity =
        String(
          0.22 +
          this.afterglowEnergy *
          0.42
        );

      afterglow.style.transform = `
        translate(-50%, -50%)
        scale(
          ${
            1 +
            this.afterglowEnergy *
            0.12
          }
        )
      `;
    }

    if (voiceGlow) {
      voiceGlow.style.opacity =
        String(
          voiceEnergy *
          0.88
        );

      voiceGlow.style.transform = `
        translate(-50%, -50%)
        scale(
          ${
            1 +
            voiceEnergy *
            0.14
          }
        )
      `;
    }
  }
};

window.SoulVisualizer =
  SoulVisualizer;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    SoulVisualizer.init();
  }
);
