"use strict";

const SoulBanner = {
  track: null,
  ticker: null,
  tickerNeon: null,
  tickerPulse: null,

  position: 0,
  contentWidth: 0,
  lastTime: 0,
  paused: false,

  messages: [
    {
      text: "BINE AI VENIT ÎN FAMILIA SOUL MUSIC 🎶",
      color: "#ffffff"
    },
    {
      text: "MULȚUMESC CĂ EȘTI AICI ❤️",
      color: "#ff405c"
    },
    {
      text: "ASCULTĂ • SIMTE • TRĂIEȘTE MUZICA",
      color: "#36baff"
    },
    {
      text: "RESPECT • ENERGIE • VIBRAȚIE • FAMILIE",
      color: "#ffd55e"
    },
    {
      text: "DĂ FOLLOW ȘI RĂMÂI ALĂTURI DE NOI",
      color: "#ff5cdb"
    },
    {
      text: "SOUL MUSIC 🎶 — STARE, NU DOAR MUZICĂ",
      color: "#ffe89a"
    },
    {
      text: "MUZICA ÎNCEPE ACOLO UNDE CUVINTELE SE OPRESC",
      color: "#62f5ff"
    },
    {
      text: "ÎMPREUNĂ CREĂM CEA MAI FRUMOASĂ ENERGIE",
      color: "#ffffff"
    },
    {
      text: "FIECARE MELODIE ASCUNDE O POVESTE",
      color: "#ff8b38"
    },
    {
      text: "LASĂ MUZICA SĂ-ȚI VORBEASCĂ SUFLETULUI",
      color: "#9a7dff"
    }
  ],

  init() {
    this.track =
      document.getElementById(
        "tickerTrack"
      );

    this.ticker =
      document.getElementById(
        "ticker"
      );

    this.tickerNeon =
      document.getElementById(
        "tickerNeon"
      );

    this.tickerPulse =
      document.getElementById(
        "tickerPulse"
      );

    if (!this.track) {
      console.error(
        "tickerTrack nu a fost găsit."
      );

      return;
    }

    this.buildMessages();

    window.requestAnimationFrame(
      () => {
        this.measure();
        this.position = 1328;

        window.requestAnimationFrame(
          time => this.animate(time)
        );
      }
    );

    this.bindEvents();
  },

  bindEvents() {
    window.addEventListener(
      "resize",
      () => this.measure()
    );

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
        this.lastTime = 0;
      }
    );

    window.addEventListener(
      "soulmusic:reset",
      () => {
        this.position = 1328;
        this.lastTime = 0;
      }
    );

    window.addEventListener(
      "soulmusic:modechange",
      () => {
        this.updateMessageStyle();
      }
    );
  },

  buildMessages() {
    this.track.innerHTML = "";

    const completeSet = [
      ...this.messages,
      ...this.messages
    ];

    completeSet.forEach(
      (message, index) => {
        const item =
          document.createElement(
            "span"
          );

        item.className =
          "ticker-message";

        item.textContent =
          message.text;

        item.dataset.color =
          message.color;

        item.dataset.index =
          String(index);

        item.style.display =
          "inline-block";

        item.style.marginRight =
          "105px";

        item.style.color =
          message.color;

        item.style.textShadow = `
          0 0 10px ${message.color},
          0 0 22px ${message.color}
        `;

        item.style.opacity =
          "0.98";

        this.track.appendChild(
          item
        );
      }
    );
  },

  measure() {
    if (!this.track) {
      return;
    }

    const fullWidth =
      this.track.scrollWidth;

    this.contentWidth =
      Math.max(
        1,
        fullWidth / 2
      );
  },

  animate(time = 0) {
    window.requestAnimationFrame(
      nextTime =>
        this.animate(nextTime)
    );

    if (
      this.paused ||
      !this.track
    ) {
      return;
    }

    if (!this.lastTime) {
      this.lastTime = time;
    }

    const delta =
      Math.min(
        0.05,
        (
          time -
          this.lastTime
        ) / 1000
      );

    this.lastTime = time;

    const audio =
      window.SoulAudio
        ? SoulAudio.getState()
        : null;

    const engine =
      window.EngineX
        ?.getState?.() || {
          mode: "live",

          preset: {
            speedMultiplier: 1,
            effectMultiplier: 1
          }
        };

    const music =
      audio?.music || {
        level: 0,
        bass: 0,
        mids: 0,
        highs: 0
      };

    const voice =
      audio?.voice || {
        energy: 0,
        detected: false
      };

    const musicEnergy =
      Math.min(
        1,
        music.level * 0.75 +
        music.bass * 0.45 +
        music.highs * 0.12
      );

    const voiceEnergy =
      voice.detected
        ? voice.energy
        : 0;

    const baseSpeed =
      engine.mode === "calm"
        ? 72
        : engine.mode === "party"
          ? 132
          : engine.mode === "legendary"
            ? 158
            : 105;

    const reactiveSpeed =
      1 +
      musicEnergy * 0.28 +
      music.highs * 0.18 +
      voiceEnergy * 0.08;

    const finalSpeed =
      baseSpeed *
      engine.preset
        .speedMultiplier *
      reactiveSpeed;

    this.position -=
      finalSpeed *
      delta;

    if (
      this.position <=
      -this.contentWidth
    ) {
      this.position +=
        this.contentWidth;
    }

    this.track.style.transform =
      `translate3d(${this.position}px, 0, 0)`;

    this.animateMessages(
      time,
      musicEnergy,
      voiceEnergy,
      engine
    );

    this.animateNeon(
      time,
      musicEnergy,
      voiceEnergy,
      music,
      engine
    );
  },

  animateMessages(
    time,
    musicEnergy,
    voiceEnergy,
    engine
  ) {
    const messages =
      this.track.querySelectorAll(
        ".ticker-message"
      );

    messages.forEach(
      (message, index) => {
        const originalColor =
          message.dataset.color ||
          "#ffffff";

        const pulse =
          0.5 +
          0.5 *
          Math.sin(
            time * 0.003 +
            index * 0.75
          );

        const scale =
          1 +
          musicEnergy * 0.018 +
          pulse * 0.006;

        message.style.transform =
          `scale(${scale})`;

        if (voiceEnergy > 0.02) {
          const voiceColors = [
            "#ff405c",
            "#a80032",
            "#d15a32",
            "#6d001d"
          ];

          const voiceColor =
            voiceColors[
              index %
              voiceColors.length
            ];

          message.style.color =
            voiceColor;

          message.style.textShadow = `
            0 0 ${
              11 +
              voiceEnergy * 12
            }px ${voiceColor},
            0 0 ${
              24 +
              voiceEnergy * 18
            }px ${voiceColor}
          `;
        } else {
          message.style.color =
            originalColor;

          message.style.textShadow = `
            0 0 ${
              9 +
              musicEnergy * 8
            }px ${originalColor},
            0 0 ${
              19 +
              musicEnergy * 15
            }px ${originalColor}
          `;
        }

        message.style.opacity =
          String(
            Math.min(
              1,
              0.84 +
              pulse * 0.10 +
              musicEnergy * 0.10
            )
          );
      }
    );
  },

  animateNeon(
    time,
    musicEnergy,
    voiceEnergy,
    music,
    engine
  ) {
    if (
      !this.ticker ||
      !this.tickerNeon
    ) {
      return;
    }

    const hue =
      (
        time * 0.045
      ) % 360;

    if (voiceEnergy > 0.02) {
      this.tickerNeon.style.background = `
        linear-gradient(
          90deg,
          #500014,
          #ff294f,
          #8b0026,
          #c95732,
          #ff294f,
          #500014
        )
      `;

      this.tickerNeon.style.backgroundSize =
        "300% 100%";

      this.ticker.style.boxShadow = `
        0 0 ${
          24 +
          voiceEnergy * 38
        }px rgba(
          255,
          41,
          79,
          0.48
        ),
        0 0 ${
          42 +
          voiceEnergy * 30
        }px rgba(
          119,
          0,
          32,
          0.25
        ),
        inset 0 0 ${
          18 +
          voiceEnergy * 26
        }px rgba(
          119,
          0,
          32,
          0.28
        )
      `;
    } else {
      this.tickerNeon.style.background = `
        linear-gradient(
          90deg,
          hsl(
            ${hue},
            100%,
            62%
          ),
          hsl(
            ${(hue + 65) % 360},
            100%,
            62%
          ),
          hsl(
            ${(hue + 135) % 360},
            100%,
            62%
          ),
          hsl(
            ${(hue + 210) % 360},
            100%,
            62%
          ),
          hsl(
            ${(hue + 285) % 360},
            100%,
            62%
          )
        )
      `;

      this.tickerNeon.style.backgroundSize =
        "300% 100%";

      this.ticker.style.boxShadow = `
        0 0 ${
          18 +
          musicEnergy * 34
        }px hsla(
          ${hue},
          100%,
          62%,
          ${
            0.16 +
            musicEnergy * 0.26
          }
        ),
        0 0 ${
          32 +
          music.bass * 28
        }px hsla(
          ${(hue + 120) % 360},
          100%,
          62%,
          ${
            0.08 +
            musicEnergy * 0.16
          }
        ),
        inset 0 0 ${
          14 +
          musicEnergy * 20
        }px rgba(
          40,
          232,
          255,
          0.10
        )
      `;
    }

    this.tickerNeon.style.opacity =
      String(
        Math.min(
          1,
          0.68 +
          musicEnergy * 0.22 +
          voiceEnergy * 0.20
        )
      );

    this.tickerNeon.style.backgroundPosition =
      `${
        (
          time *
          0.08 *
          engine.preset
            .speedMultiplier
        ) %
        300
      }% 0`;

    if (this.tickerPulse) {
      const pulseScale =
        1 +
        music.bass * 0.12 +
        voiceEnergy * 0.15;

      this.tickerPulse.style.transform =
        `scaleX(${pulseScale})`;

      this.tickerPulse.style.opacity =
        String(
          Math.min(
            1,
            0.24 +
            music.highs * 0.45 +
            voiceEnergy * 0.34
          )
        );

      this.tickerPulse.style.background =
        voiceEnergy > 0.02
          ? `
            linear-gradient(
              90deg,
              transparent,
              #ff294f,
              #8b0026,
              #ff294f,
              transparent
            )
          `
          : `
            linear-gradient(
              90deg,
              transparent,
              hsl(
                ${hue},
                100%,
                65%
              ),
              hsl(
                ${(hue + 120) % 360},
                100%,
                65%
              ),
              hsl(
                ${(hue + 240) % 360},
                100%,
                65%
              ),
              transparent
            )
          `;

      this.tickerPulse.style.boxShadow =
        voiceEnergy > 0.02
          ? `
            0 0 ${
              12 +
              voiceEnergy * 22
            }px rgba(
              255,
              41,
              79,
              0.72
            )
          `
          : `
            0 0 ${
              10 +
              musicEnergy * 18
            }px hsla(
              ${hue},
              100%,
              65%,
              0.62
            )
          `;
    }
  },

  updateMessageStyle() {
    const engine =
      window.EngineX
        ?.getState?.();

    if (!engine) {
      return;
    }

    const messages =
      this.track.querySelectorAll(
        ".ticker-message"
      );

    messages.forEach(
      message => {
        if (
          engine.mode ===
          "legendary"
        ) {
          message.style.fontWeight =
            "900";

          message.style.letterSpacing =
            "1.4px";
        } else if (
          engine.mode ===
          "calm"
        ) {
          message.style.fontWeight =
            "800";

          message.style.letterSpacing =
            "0.7px";
        } else {
          message.style.fontWeight =
            "900";

          message.style.letterSpacing =
            "1px";
        }
      }
    );
  }
};

window.SoulBanner =
  SoulBanner;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    SoulBanner.init();
  }
);
