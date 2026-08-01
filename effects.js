"use strict";

const SoulEffects = {
  canvas: null,
  context: null,

  width: 1920,
  height: 1080,

  paused: false,

  musicEnergy: 0,
  voiceEnergy: 0,
  afterglow: 0,

  previousBass: 0,
  bassImpact: 0,

  borderPosition: 0,
  tiktokRotation: 0,

  ambientParticles: [],
  burstParticles: [],
  lightTrails: [],

  elements: {},

  init() {
    this.canvas =
      document.getElementById(
        "effectsCanvas"
      );

    if (!this.canvas) {
      console.error(
        "effectsCanvas nu a fost găsit."
      );

      return;
    }

    this.context =
      this.canvas.getContext("2d");

    this.canvas.width =
      this.width;

    this.canvas.height =
      this.height;

    this.cacheElements();
    this.createAmbientParticles();
    this.bindEvents();

    window.requestAnimationFrame(
      time => this.animate(time)
    );
  },

  cacheElements() {
    this.elements.leftFrame =
      document.getElementById(
        "leftFrame"
      );

    this.elements.leftNeon =
      this.elements.leftFrame
        ?.querySelector(
          ".frame-neon"
        );

    this.elements.leftRunner =
      this.elements.leftFrame
        ?.querySelector(
          ".frame-runner"
        );

    this.elements.cameraFrame =
      document.getElementById(
        "cameraFrame"
      );

    this.elements.cameraNeon =
      this.elements.cameraFrame
        ?.querySelector(
          ".frame-neon"
        );

    this.elements.cameraRunner =
      this.elements.cameraFrame
        ?.querySelector(
          ".frame-runner"
        );

    this.elements.tiktok =
      document.getElementById(
        "tiktokButton"
      );

    this.elements.tiktokOuter =
      this.elements.tiktok
        ?.querySelector(
          ".button-ring-outer"
        );

    this.elements.tiktokInner =
      this.elements.tiktok
        ?.querySelector(
          ".button-ring-inner"
        );

    this.elements.live =
      document.getElementById(
        "liveButton"
      );

    this.elements.liveOuter =
      this.elements.live
        ?.querySelector(
          ".button-ring-outer"
        );

    this.elements.liveInner =
      this.elements.live
        ?.querySelector(
          ".button-ring-inner"
        );

    this.elements.logo =
      document.getElementById(
        "soulLogo"
      );

    this.elements.stage =
      document.getElementById(
        "stage"
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
    this.musicEnergy = 0;
    this.voiceEnergy = 0;
    this.afterglow = 0;
    this.previousBass = 0;
    this.bassImpact = 0;
    this.borderPosition = 0;
    this.tiktokRotation = 0;
    this.burstParticles = [];
    this.lightTrails = [];
  },

  createAmbientParticles() {
    this.ambientParticles = [];

    for (
      let index = 0;
      index < 120;
      index += 1
    ) {
      this.ambientParticles.push(
        this.createAmbientParticle(
          true
        )
      );
    }
  },

  createAmbientParticle(
    initial = false
  ) {
    return {
      x:
        520 +
        Math.random() * 940,

      y:
        initial
          ? Math.random() * 930
          : 760 +
            Math.random() * 220,

      velocityX:
        -0.22 +
        Math.random() * 0.44,

      velocityY:
        -0.40 -
        Math.random() * 0.80,

      size:
        0.6 +
        Math.random() * 2.8,

      opacity:
        initial
          ? Math.random() * 0.35
          : 0,

      life:
        Math.random(),

      hue:
        Math.random() * 360,

      phase:
        Math.random() *
        Math.PI *
        2
    };
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

    const audio =
      SoulAudio.getState();

    const engine =
      window.EngineX
        ?.getState?.() || {
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

    const targetMusicEnergy =
      music.active
        ? Math.min(
            1,
            music.level * 0.72 +
            music.bass * 0.56 +
            music.highs * 0.14
          )
        : 0;

    const targetVoiceEnergy =
      voice.active &&
      voice.detected
        ? voice.energy
        : 0;

    this.musicEnergy +=
      (
        targetMusicEnergy -
        this.musicEnergy
      ) * 0.20;

    this.voiceEnergy +=
      (
        targetVoiceEnergy -
        this.voiceEnergy
      ) *
      (
        targetVoiceEnergy >
        this.voiceEnergy
          ? 0.40
          : 0.10
      );

    this.afterglow =
      Math.max(
        this.musicEnergy,
        this.voiceEnergy,
        this.afterglow * 0.94
      );

    this.detectBassImpact(
      music,
      engine
    );

    this.borderPosition +=
      (
        0.9 +
        music.highs * 5 +
        music.bass * 1.8
      ) *
      engine.preset
        .speedMultiplier;

    this.tiktokRotation +=
      (
        0.28 +
        music.highs * 3.2 +
        music.bass * 1.4
      ) *
      engine.preset
        .speedMultiplier;

    this.context.clearRect(
      0,
      0,
      this.width,
      this.height
    );

    this.drawStageAmbient(
      time,
      music,
      audio,
      engine
    );

    this.drawLeftFrame(
      time,
      music,
      audio,
      engine
    );

    this.drawCameraFrame(
      time,
      music,
      audio,
      engine
    );

    this.drawTikTokEnergy(
      time,
      music,
      audio,
      engine
    );

    this.drawLiveEnergy(
      time,
      audio,
      engine
    );

    this.drawEnergyConnections(
      time,
      music,
      audio,
      engine
    );

    this.drawAmbientParticles(
      time,
      music,
      audio,
      engine
    );

    this.drawBurstParticles(
      time,
      audio,
      engine
    );

    this.drawCinematicTrails(
      time,
      music,
      audio,
      engine
    );

    this.drawVoiceShockwave(
      time,
      audio,
      engine
    );

    this.animateDomElements(
      time,
      music,
      audio,
      engine
    );

    this.bassImpact *= 0.86;
  },

  detectBassImpact(
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
      engine.mode || "live";

    const threshold =
      mode === "legendary"
        ? 0.018
        : mode === "party"
          ? 0.025
          : mode === "calm"
            ? 0.055
            : 0.034;

    if (
      music.active &&
      bass > 0.15 &&
      difference > threshold
    ) {
      this.bassImpact = 1;

      this.createBassBurst(
        bass,
        engine
      );

      this.createLightTrail(
        bass,
        engine
      );
    }

    this.previousBass =
      bass;
  },

  getRainbowColor(
    index,
    time,
    opacity = 1
  ) {
    const hue =
      (
        time * 0.05 +
        index * 29
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
        32,
        72,
        ${opacity}
      )`,

      `rgba(
        150,
        0,
        40,
        ${opacity}
      )`,

      `rgba(
        206,
        72,
        35,
        ${opacity}
      )`,

      `rgba(
        92,
        8,
        25,
        ${opacity}
      )`
    ];

    return colors[
      index %
      colors.length
    ];
  },

  roundedRectangle(
    context,
    x,
    y,
    width,
    height,
    radius
  ) {
    context.beginPath();

    context.moveTo(
      x + radius,
      y
    );

    context.arcTo(
      x + width,
      y,
      x + width,
      y + height,
      radius
    );

    context.arcTo(
      x + width,
      y + height,
      x,
      y + height,
      radius
    );

    context.arcTo(
      x,
      y + height,
      x,
      y,
      radius
    );

    context.arcTo(
      x,
      y,
      x + width,
      y,
      radius
    );

    context.closePath();
  },

  drawStageAmbient(
    time,
    music,
    audio,
    engine
  ) {
    const context =
      this.context;

    const centerX = 960;
    const centerY = 390;

    const mode =
      engine.mode || "live";

    const glowCount =
      mode === "legendary"
        ? 5
        : mode === "party"
          ? 4
          : mode === "calm"
            ? 2
            : 3;

    for (
      let layer = 0;
      layer < glowCount;
      layer += 1
    ) {
      const pulse =
        0.5 +
        0.5 *
        Math.sin(
          time * 0.0018 +
          layer
        );

      const radius =
        230 +
        layer * 95 +
        this.afterglow * 90 +
        pulse * 20;

      const color =
        this.voiceEnergy > 0.02
          ? this.getVoiceColor(
              layer,
              0.015 +
              this.voiceEnergy *
              0.035
            )
          : this.getRainbowColor(
              layer * 8,
              time,
              0.012 +
              this.afterglow *
              0.028
            );

      const gradient =
        context.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          radius
        );

      gradient.addColorStop(
        0,
        color
      );

      gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
      );

      context.save();

      context.fillStyle =
        gradient;

      context.beginPath();

      context.arc(
        centerX,
        centerY,
        radius,
        0,
        Math.PI * 2
      );

      context.fill();

      context.restore();
    }
  },

  drawReactiveFrame({
    time,
    x,
    y,
    width,
    height,
    radius,
    music,
    audio,
    engine,
    gold = false
  }) {
    const context =
      this.context;

    const activeEnergy =
      Math.max(
        this.musicEnergy,
        this.voiceEnergy,
        this.afterglow * 0.55
      );

    const layerCount =
      engine.mode ===
      "legendary"
        ? 6
        : engine.mode ===
          "party"
          ? 5
          : 4;

    for (
      let layer = 0;
      layer < layerCount;
      layer += 1
    ) {
      const expansion =
        layer * 3;

      this.roundedRectangle(
        context,
        x - expansion,
        y - expansion,
        width + expansion * 2,
        height + expansion * 2,
        radius + expansion
      );

      let color;

      if (
        this.voiceEnergy >
        0.015
      ) {
        color =
          this.getVoiceColor(
            layer,
            0.25 +
            this.voiceEnergy *
            0.68
          );
      } else if (gold) {
        const goldColors = [
          `rgba(
            255,
            220,
            110,
            ${
              0.22 +
              this.musicEnergy *
              0.62
            }
          )`,

          `rgba(
            255,
            170,
            35,
            ${
              0.18 +
              this.musicEnergy *
              0.53
            }
          )`,

          `rgba(
            255,
            245,
            190,
            ${
              0.15 +
              this.musicEnergy *
              0.45
            }
          )`,

          `rgba(
            192,
            106,
            16,
            ${
              0.14 +
              this.musicEnergy *
              0.42
            }
          )`
        ];

        color =
          goldColors[
            layer %
            goldColors.length
          ];
      } else {
        color =
          this.getRainbowColor(
            layer,
            time,
            0.20 +
            this.musicEnergy *
            0.66
          );
      }

      context.save();

      context.lineWidth =
        3 +
        layer * 1.8 +
        activeEnergy * 3;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          13 +
          activeEnergy * 46 +
          layer * 9 +
          this.bassImpact * 18
        ) *
        audio.neonIntensity *
        engine.preset
          .effectMultiplier;

      context.stroke();

      context.restore();
    }

    this.drawMovingRunner({
      x,
      y,
      width,
      height,
      music,
      gold
    });

    this.drawFramePulse({
      time,
      x,
      y,
      width,
      height,
      radius,
      gold
    });
  },

  drawMovingRunner({
    x,
    y,
    width,
    height,
    music,
    gold
  }) {
    const context =
      this.context;

    const perimeter =
      width * 2 +
      height * 2;

    const position =
      this.borderPosition %
      perimeter;

    const runnerLength =
      Math.max(
        100,
        width * 0.22
      ) *
      (
        1 +
        music.highs * 0.75
      );

    const segment =
      this.getPerimeterSegment(
        x,
        y,
        width,
        height,
        position,
        runnerLength
      );

    const color =
      this.voiceEnergy > 0.015
        ? "#ff2952"
        : gold
          ? "#fff2ad"
          : "#ffffff";

    context.save();

    context.beginPath();

    context.moveTo(
      segment.startX,
      segment.startY
    );

    context.lineTo(
      segment.endX,
      segment.endY
    );

    context.lineWidth =
      7 +
      music.highs * 6;

    context.lineCap =
      "round";

    context.strokeStyle =
      color;

    context.shadowColor =
      color;

    context.shadowBlur =
      24 +
      music.highs * 30 +
      this.bassImpact * 20;

    context.stroke();

    context.restore();
  },

  getPerimeterSegment(
    x,
    y,
    width,
    height,
    position,
    length
  ) {
    if (position < width) {
      return {
        startX:
          x + position,

        startY:
          y,

        endX:
          Math.min(
            x + width,
            x +
            position +
            length
          ),

        endY:
          y
      };
    }

    if (
      position <
      width + height
    ) {
      const local =
        position -
        width;

      return {
        startX:
          x + width,

        startY:
          y + local,

        endX:
          x + width,

        endY:
          Math.min(
            y + height,
            y +
            local +
            length
          )
      };
    }

    if (
      position <
      width * 2 +
      height
    ) {
      const local =
        position -
        width -
        height;

      return {
        startX:
          x +
          width -
          local,

        startY:
          y + height,

        endX:
          Math.max(
            x,
            x +
            width -
            local -
            length
          ),

        endY:
          y + height
      };
    }

    const local =
      position -
      width * 2 -
      height;

    return {
      startX:
        x,

      startY:
        y +
        height -
        local,

      endX:
        x,

      endY:
        Math.max(
          y,
          y +
          height -
          local -
          length
        )
    };
  },

  drawFramePulse({
    time,
    x,
    y,
    width,
    height,
    radius,
    gold
  }) {
    const energy =
      Math.max(
        this.bassImpact,
        this.voiceEnergy
      );

    if (energy < 0.04) {
      return;
    }

    const context =
      this.context;

    for (
      let layer = 0;
      layer < 3;
      layer += 1
    ) {
      const expansion =
        energy *
        (
          12 +
          layer * 11
        );

      this.roundedRectangle(
        context,
        x - expansion,
        y - expansion,
        width + expansion * 2,
        height + expansion * 2,
        radius + expansion
      );

      const color =
        this.voiceEnergy > 0.03
          ? this.getVoiceColor(
              layer,
              energy * 0.34
            )
          : gold
            ? `rgba(
                255,
                220,
                110,
                ${energy * 0.25}
              )`
            : this.getRainbowColor(
                layer * 9,
                time,
                energy * 0.28
              );

      context.save();

      context.lineWidth =
        1.5 +
        energy * 2;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        18 +
        energy * 32;

      context.stroke();

      context.restore();
    }
  },

  drawLeftFrame(
    time,
    music,
    audio,
    engine
  ) {
    this.drawReactiveFrame({
      time,
      x: 22,
      y: 18,
      width: 520,
      height: 1044,
      radius: 30,
      music,
      audio,
      engine,
      gold: false
    });
  },

  drawCameraFrame(
    time,
    music,
    audio,
    engine
  ) {
    this.drawReactiveFrame({
      time,
      x: 1368,
      y: 470,
      width: 515,
      height: 410,
      radius: 30,
      music,
      audio,
      engine,
      gold: true
    });
  },

  drawTikTokEnergy(
    time,
    music,
    audio,
    engine
  ) {
    const context =
      this.context;

    const centerX =
      1672.5;

    const centerY =
      177.5;

    const baseRadius =
      108;

    const mode =
      engine.mode ||
      "live";

    const rayCount =
      mode === "legendary"
        ? 130
        : mode === "party"
          ? 102
          : mode === "calm"
            ? 62
            : 82;

    const data =
      music.frequencyData;

    for (
      let index = 0;
      index < rayCount;
      index += 1
    ) {
      const angle =
        index /
        rayCount *
        Math.PI *
        2 +
        this.tiktokRotation *
        0.012;

      const frequencyIndex =
        data
          ? Math.floor(
              index /
              rayCount *
              data.length *
              0.58
            )
          : 0;

      const frequency =
        data
          ? data[
              frequencyIndex
            ] / 255
          : 0;

      const pulse =
        8 +
        frequency * 44 +
        this.musicEnergy * 30 +
        music.bass * 25 +
        this.voiceEnergy * 28 +
        this.bassImpact * 28;

      const startRadius =
        baseRadius + 7;

      const endRadius =
        startRadius + pulse;

      const startX =
        centerX +
        Math.cos(angle) *
        startRadius;

      const startY =
        centerY +
        Math.sin(angle) *
        startRadius;

      const endX =
        centerX +
        Math.cos(angle) *
        endRadius;

      const endY =
        centerY +
        Math.sin(angle) *
        endRadius;

      const color =
        this.voiceEnergy > 0.015
          ? this.getVoiceColor(
              index,
              0.28 +
              this.voiceEnergy *
              0.70
            )
          : this.getRainbowColor(
              index,
              time,
              0.22 +
              this.musicEnergy *
              0.72
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
        frequency * 4 +
        this.musicEnergy *
        2.5;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          12 +
          this.musicEnergy * 34 +
          this.voiceEnergy * 34
        ) *
        audio.neonIntensity *
        engine.preset
          .effectMultiplier;

      context.stroke();

      context.restore();
    }

    this.drawCircularHalo(
      centerX,
      centerY,
      baseRadius,
      time,
      audio,
      engine,
      false
    );
  },

  drawLiveEnergy(
    time,
    audio,
    engine
  ) {
    const centerX =
      1673;

    const centerY =
      370;

    const idlePulse =
      0.5 +
      0.5 *
      Math.sin(
        time * 0.0038
      );

    const radius =
      75 +
      idlePulse * 3 +
      this.voiceEnergy * 22;

    this.drawCircularHalo(
      centerX,
      centerY,
      radius,
      time,
      audio,
      engine,
      true
    );
  },

  drawCircularHalo(
    centerX,
    centerY,
    radius,
    time,
    audio,
    engine,
    liveMode
  ) {
    const context =
      this.context;

    const energy =
      liveMode
        ? Math.max(
            0.18,
            this.voiceEnergy
          )
        : Math.max(
            this.musicEnergy,
            this.voiceEnergy
          );

    const layers =
      engine.mode ===
      "legendary"
        ? 6
        : 4;

    for (
      let layer = 0;
      layer < layers;
      layer += 1
    ) {
      let color;

      if (
        liveMode ||
        this.voiceEnergy > 0.015
      ) {
        color =
          this.getVoiceColor(
            layer,
            0.16 +
            energy * 0.66
          );
      } else {
        color =
          this.getRainbowColor(
            layer * 12,
            time,
            0.16 +
            energy * 0.58
          );
      }

      context.save();

      context.beginPath();

      context.arc(
        centerX,
        centerY,
        radius +
        layer * 6 +
        this.bassImpact *
        (
          liveMode
            ? 3
            : 10
        ),
        0,
        Math.PI * 2
      );

      context.lineWidth =
        3 +
        layer * 1.2 +
        energy * 2;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          15 +
          energy * 38 +
          this.bassImpact * 18
        ) *
        audio.neonIntensity *
        engine.preset
          .effectMultiplier;

      context.stroke();

      context.restore();
    }
  },

  createBassBurst(
    bass,
    engine
  ) {
    const centerX =
      960;

    const centerY =
      375;

    const count =
      Math.round(
        (
          14 +
          bass * 38
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

      this.burstParticles.push({
        x:
          centerX,

        y:
          centerY,

        velocityX:
          Math.cos(angle) *
          speed,

        velocityY:
          Math.sin(angle) *
          speed *
          0.66,

        size:
          0.8 +
          Math.random() * 4,

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
      this.burstParticles.length >
      450
    ) {
      this.burstParticles.splice(
        0,
        this.burstParticles.length -
        450
      );
    }
  },

  drawBurstParticles(
    time,
    audio,
    engine
  ) {
    const context =
      this.context;

    for (
      let index =
        this.burstParticles.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const particle =
        this.burstParticles[index];

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
        this.burstParticles.splice(
          index,
          1
        );

        continue;
      }

      const color =
        this.voiceEnergy > 0.02
          ? `rgba(
              255,
              35,
              72,
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
        (
          10 +
          particle.life * 24
        ) *
        audio.neonIntensity;

      context.fill();

      context.restore();
    }
  },

  drawAmbientParticles(
    time,
    music,
    audio,
    engine
  ) {
    const context =
      this.context;

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
        this.ambientParticles
          .length,
        Math.round(
          45 +
          particleMultiplier * 30
        )
      );

    for (
      let index = 0;
      index < desiredCount;
      index += 1
    ) {
      const particle =
        this.ambientParticles[
          index
        ];

      particle.x +=
        particle.velocityX *
        engine.preset
          .speedMultiplier;

      particle.y +=
        particle.velocityY *
        (
          0.55 +
          music.highs * 3.4
        ) *
        engine.preset
          .speedMultiplier;

      particle.life +=
        0.0025 *
        engine.preset
          .speedMultiplier;

      if (
        particle.y < 25 ||
        particle.x < 500 ||
        particle.x > 1460 ||
        particle.life > 1
      ) {
        Object.assign(
          particle,
          this.createAmbientParticle()
        );
      }

      const flicker =
        0.52 +
        0.48 *
        Math.sin(
          time * 0.004 +
          particle.phase
        );

      const opacity =
        (
          0.04 +
          music.highs * 0.55 +
          this.bassImpact * 0.16
        ) *
        flicker;

      const color =
        this.voiceEnergy > 0.02
          ? `rgba(
              255,
              36,
              72,
              ${opacity}
            )`
          : `hsla(
              ${
                (
                  particle.hue +
                  time * 0.022
                ) %
                360
              },
              100%,
              70%,
              ${opacity}
            )`;

      context.save();

      context.beginPath();

      context.arc(
        particle.x,
        particle.y,
        particle.size +
        music.highs * 2,
        0,
        Math.PI * 2
      );

      context.fillStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          8 +
          music.highs * 18
        ) *
        audio.neonIntensity;

      context.fill();

      context.restore();
    }
  },

  createLightTrail(
    bass,
    engine
  ) {
    const count =
      engine.mode ===
      "legendary"
        ? 4
        : engine.mode ===
          "party"
          ? 3
          : 1;

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      this.lightTrails.push({
        angle:
          Math.random() *
          Math.PI *
          2,

        radius:
          180 +
          Math.random() *
          90,

        speed:
          0.016 +
          Math.random() *
          0.025,

        length:
          0.55 +
          Math.random() *
          0.75,

        life:
          1,

        decay:
          0.012 +
          Math.random() *
          0.014,

        hue:
          Math.random() *
          360
      });
    }

    if (
      this.lightTrails.length >
      40
    ) {
      this.lightTrails.splice(
        0,
        this.lightTrails.length -
        40
      );
    }
  },

  drawCinematicTrails(
    time,
    music,
    audio,
    engine
  ) {
    if (
      engine.mode === "calm"
    ) {
      return;
    }

    const context =
      this.context;

    const centerX =
      960;

    const centerY =
      375;

    for (
      let index =
        this.lightTrails.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const trail =
        this.lightTrails[index];

      trail.angle +=
        trail.speed *
        engine.preset
          .speedMultiplier;

      trail.life -=
        trail.decay;

      if (trail.life <= 0) {
        this.lightTrails.splice(
          index,
          1
        );

        continue;
      }

      const color =
        this.voiceEnergy > 0.02
          ? this.getVoiceColor(
              index,
              trail.life * 0.28
            )
          : `hsla(
              ${
                (
                  trail.hue +
                  time * 0.03
                ) %
                360
              },
              100%,
              66%,
              ${
                trail.life *
                0.25
              }
            )`;

      context.save();

      context.beginPath();

      context.ellipse(
        centerX,
        centerY,
        trail.radius +
        music.bass * 45,
        (
          trail.radius +
          music.mids * 30
        ) * 0.56,
        0,
        trail.angle,
        trail.angle +
        trail.length
      );

      context.lineWidth =
        1.2 +
        music.highs * 2.2;

      context.lineCap =
        "round";

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          12 +
          this.musicEnergy * 22
        ) *
        audio.neonIntensity;

      context.stroke();

      context.restore();
    }
  },

  drawEnergyConnections(
    time,
    music,
    audio,
    engine
  ) {
    const intensity =
      Math.max(
        this.musicEnergy,
        this.voiceEnergy
      );

    if (
      intensity < 0.14 ||
      engine.mode === "calm"
    ) {
      return;
    }

    const context =
      this.context;

    const logoCenter = {
      x: 960,
      y: 375
    };

    const targets = [
      {
        x: 542,
        y: 210
      },

      {
        x: 1368,
        y: 620
      },

      {
        x: 1565,
        y: 178
      }
    ];

    targets.forEach(
      (target, index) => {
        const color =
          this.voiceEnergy > 0.02
            ? this.getVoiceColor(
                index,
                0.04 +
                this.voiceEnergy *
                0.15
              )
            : this.getRainbowColor(
                index * 18,
                time,
                0.03 +
                this.musicEnergy *
                0.12
              );

        context.save();

        context.beginPath();

        context.moveTo(
          logoCenter.x,
          logoCenter.y
        );

        const controlX =
          (
            logoCenter.x +
            target.x
          ) / 2;

        const controlY =
          (
            logoCenter.y +
            target.y
          ) / 2 -
          85;

        context.quadraticCurveTo(
          controlX,
          controlY,
          target.x,
          target.y
        );

        context.lineWidth =
          1 +
          intensity * 2;

        context.strokeStyle =
          color;

        context.shadowColor =
          color;

        context.shadowBlur =
          (
            10 +
            intensity * 20
          ) *
          audio.neonIntensity;

        context.stroke();

        context.restore();
      }
    );
  },

  drawVoiceShockwave(
    time,
    audio,
    engine
  ) {
    if (
      this.voiceEnergy < 0.02
    ) {
      return;
    }

    const context =
      this.context;

    const centerX =
      960;

    const centerY =
      375;

    const pulse =
      0.5 +
      0.5 *
      Math.sin(
        time * 0.011
      );

    const waveCount =
      engine.mode ===
      "legendary"
        ? 5
        : 3;

    for (
      let layer = 0;
      layer < waveCount;
      layer += 1
    ) {
      const radiusX =
        330 +
        layer * 28 +
        this.voiceEnergy * 82 +
        pulse * 12;

      const radiusY =
        180 +
        layer * 16 +
        this.voiceEnergy * 48 +
        pulse * 8;

      const color =
        this.getVoiceColor(
          layer,
          0.10 +
          this.voiceEnergy * 0.36
        );

      context.save();

      context.beginPath();

      context.ellipse(
        centerX,
        centerY,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2
      );

      context.lineWidth =
        1.5 +
        this.voiceEnergy * 2.8;

      context.strokeStyle =
        color;

      context.shadowColor =
        color;

      context.shadowBlur =
        (
          16 +
          this.voiceEnergy * 42
        ) *
        audio.neonIntensity *
        engine.preset
          .effectMultiplier;

      context.stroke();

      context.restore();
    }
  },

  animateDomElements(
    time,
    music,
    audio,
    engine
  ) {
    const musicPulse =
      this.musicEnergy;

    const voicePulse =
      this.voiceEnergy;

    if (
      this.elements.leftFrame
    ) {
      const scale =
        1 +
        musicPulse * 0.004 +
        this.bassImpact *
        0.004;

      this.elements.leftFrame
        .style.transform =
        `scale(${scale})`;
    }

    if (
      this.elements.cameraFrame
    ) {
      const scale =
        1 +
        musicPulse * 0.007 +
        voicePulse * 0.023 +
        this.bassImpact *
        0.005;

      this.elements.cameraFrame
        .style.transform =
        `scale(${scale})`;
    }

    if (
      this.elements.tiktok
    ) {
      const scale =
        1 +
        musicPulse * 0.035 +
        voicePulse * 0.025 +
        this.bassImpact *
        0.020;

      const rotation =
        Math.sin(
          time * 0.0012
        ) *
        music.highs *
        1.8;

      this.elements.tiktok
        .style.transform = `
          scale(${scale})
          rotate(${rotation}deg)
        `;
    }

    if (
      this.elements.live
    ) {
      const breathing =
        0.006 *
        (
          0.5 +
          0.5 *
          Math.sin(
            time * 0.004
          )
        );

      const scale =
        1 +
        breathing +
        voicePulse * 0.075;

      this.elements.live
        .style.transform =
        `scale(${scale})`;

      this.elements.live
        .style.filter =
        voicePulse > 0.01
          ? `
            drop-shadow(
              0 0 ${
                12 +
                voicePulse * 44
              }px
              rgba(
                255,
                28,
                67,
                0.96
              )
            )
          `
          : `
            drop-shadow(
              0 0 10px
              rgba(
                119,
                0,
                32,
                0.42
              )
            )
          `;
    }

    this.updateCssNeon(
      time,
      engine
    );

    this.animateCssRunners(
      time,
      music
    );
  },

  updateCssNeon(
    time,
    engine
  ) {
    const hue =
      (
        time * 0.045
      ) % 360;

    if (
      this.elements.leftNeon
    ) {
      this.elements.leftNeon
        .style.opacity =
        String(
          Math.min(
            1,
            0.44 +
            this.musicEnergy * 0.48 +
            this.voiceEnergy * 0.42
          )
        );

      this.elements.leftNeon
        .style.borderColor =
        this.voiceEnergy > 0.015
          ? "#ff2952"
          : `hsl(
              ${hue},
              100%,
              62%
            )`;
    }

    if (
      this.elements.cameraNeon
    ) {
      this.elements.cameraNeon
        .style.opacity =
        String(
          Math.min(
            1,
            0.56 +
            this.musicEnergy * 0.32 +
            this.voiceEnergy * 0.45
          )
        );

      this.elements.cameraNeon
        .style.borderColor =
        this.voiceEnergy > 0.015
          ? "#ff2952"
          : "#ffd96a";
    }

    if (
      this.elements.tiktokOuter
    ) {
      this.elements.tiktokOuter
        .style.opacity =
        String(
          Math.min(
            1,
            0.46 +
            this.musicEnergy * 0.46 +
            this.voiceEnergy * 0.42
          )
        );

      this.elements.tiktokOuter
        .style.borderColor =
        this.voiceEnergy > 0.015
          ? "#ff2952"
          : `hsl(
              ${hue},
              100%,
              62%
            )`;
    }

    if (
      this.elements.tiktokInner
    ) {
      this.elements.tiktokInner
        .style.transform =
        `rotate(${
          -this.tiktokRotation *
          0.5
        }deg)`;
    }

    if (
      this.elements.liveOuter
    ) {
      this.elements.liveOuter
        .style.opacity =
        String(
          Math.min(
            1,
            0.48 +
            this.voiceEnergy * 0.52
          )
        );
    }
  },

  animateCssRunners(
    time,
    music
  ) {
    const position =
      (
        time * 0.06 +
        music.highs * 120
      ) % 340;

    if (
      this.elements.leftRunner
    ) {
      this.elements.leftRunner
        .style.transform =
        `translateX(${position}px)`;
    }

    if (
      this.elements.cameraRunner
    ) {
      const cameraPosition =
        (
          time * 0.052 +
          music.highs * 100
        ) % 325;

      this.elements.cameraRunner
        .style.transform =
        `translateX(${cameraPosition}px)`;
    }
  }
};

window.SoulEffects =
  SoulEffects;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    SoulEffects.init();
  }
);
