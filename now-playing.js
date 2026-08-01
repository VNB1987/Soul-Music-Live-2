"use strict";

/*
  SOUL MUSIC NOW PLAYING — ETAPA 6

  Punte universală pentru titlul melodiei:
  Player / Live Studio / Suno / YouTube → now-playing.txt → Engine.

  Modulul curăță metadatele, gestionează tranzițiile și expune un
  contract vizual independent. Integrarea DOM finală se face ulterior.
*/

const SoulNowPlaying = {
  version: "0.6.0-stage6",

  bridgeUrl: "now-playing.txt",
  pollInterval: 1500,

  label: "ACUM CÂNTĂ",
  eyebrow: "NOW PLAYING",
  subtitle: "Made by Soul Music 🎶",
  logoUrl: "assets/logo.png",

  position: "top-center",
  allowedPositions: [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ],

  timings: {
    revealDuration: 6500,
    transitionOut: 420,
    minimumVisible: 1200
  },

  running: false,
  paused: false,
  enabled: true,
  state: "hidden",

  overlay: null,
  elements: {},

  current: null,
  pending: null,
  lastRawValue: "",
  lastChangeTime: 0,
  lastActivityTime: 0,

  pollTimerId: null,
  transitionTimerId: null,
  compactTimerId: null,
  animationFrameId: null,

  consecutiveErrors: 0,
  pollInFlight: false,
  eventsBound: false,

  manualCorrections: {},

  reactive: {
    accent:
      "rgba(255, 201, 84, 1)",
    accentSoft:
      "rgba(255, 201, 84, 0.34)",
    musicEnergy: 0,
    voiceEnergy: 0,
    pulse: 0
  },

  sources: {
    bridge: {
      label: "SOUL MUSIC",
      icon: "♪"
    },

    "tiktok-live-studio": {
      label: "TIKTOK LIVE",
      icon: "LIVE"
    },

    suno: {
      label: "SUNO",
      icon: "S"
    },

    youtube: {
      label: "YOUTUBE",
      icon: "▶"
    },

    manual: {
      label: "SOUL MUSIC",
      icon: "♪"
    },

    unknown: {
      label: "SOUL MUSIC",
      icon: "♪"
    }
  },

  stats: {
    polls: 0,
    updates: 0,
    hides: 0,
    errors: 0,
    manualCorrections: 0,
    duplicateReads: 0
  },

  init(options = {}) {
    if (options.bridgeUrl) {
      this.bridgeUrl =
        String(options.bridgeUrl);
    }

    if (
      Number.isFinite(
        options.pollInterval
      )
    ) {
      this.pollInterval =
        this.clamp(
          options.pollInterval,
          500,
          10000
        );
    }

    if (options.position) {
      this.setPosition(
        options.position,
        false
      );
    }

    if (options.logoUrl) {
      this.logoUrl =
        String(options.logoUrl);
    }

    if (options.timings) {
      this.timings = {
        ...this.timings,
        ...options.timings
      };
    }

    this.loadCorrections();

    if (options.element) {
      this.attachOverlay(
        options.element
      );
    } else {
      this.resolveOverlay();
    }

    this.bindEvents();
    this.reset(false);

    if (
      options.autoStart !== false
    ) {
      this.start();
    }

    this.emit(
      "soulmusic:nowplayingready",
      this.getState()
    );

    return this.getState();
  },

  resolveOverlay() {
    const overlay =
      this.getRuntime()
        ?.document
        ?.getElementById?.(
          "nowPlaying"
        );

    if (overlay) {
      this.attachOverlay(overlay);
    }

    return Boolean(overlay);
  },

  attachOverlay(element) {
    if (!element) {
      return false;
    }

    this.overlay = element;

    this.elements = {
      eyebrow:
        element.querySelector?.(
          "[data-now-playing-eyebrow]"
        ) || null,
      label:
        element.querySelector?.(
          "[data-now-playing-label]"
        ) || null,
      title:
        element.querySelector?.(
          "[data-now-playing-title]"
        ) || null,
      artist:
        element.querySelector?.(
          "[data-now-playing-artist]"
        ) || null,
      subtitle:
        element.querySelector?.(
          "[data-now-playing-subtitle]"
        ) || null,
      source:
        element.querySelector?.(
          "[data-now-playing-source]"
        ) || null,
      sourceIcon:
        element.querySelector?.(
          "[data-now-playing-source-icon]"
        ) || null,
      logo:
        element.querySelector?.(
          "[data-now-playing-logo]"
        ) || null
    };

    this.renderStaticContent();
    this.render();

    return true;
  },

  detachOverlay() {
    this.overlay = null;
    this.elements = {};
  },

  start() {
    if (this.running) {
      return false;
    }

    this.running = true;
    this.paused = false;
    this.startPolling();
    this.scheduleReactiveFrame();
    this.poll();

    return true;
  },

  stop() {
    this.running = false;
    this.clearTimer(
      "pollTimerId",
      "interval"
    );
    this.clearTimer(
      "transitionTimerId"
    );
    this.clearTimer(
      "compactTimerId"
    );

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

    return true;
  },

  pause() {
    this.paused = true;
  },

  resume() {
    this.paused = false;

    if (this.running) {
      this.poll();
      this.scheduleReactiveFrame();
    }
  },

  setEnabled(enabled) {
    this.enabled =
      Boolean(enabled);

    if (!this.enabled) {
      this.hideNow("disabled", true);
    }
  },

  startPolling() {
    const runtime =
      this.getRuntime();

    if (
      !runtime?.setInterval ||
      this.pollTimerId !== null
    ) {
      return;
    }

    this.pollTimerId =
      runtime.setInterval(
        () => this.poll(),
        this.pollInterval
      );
  },

  async poll() {
    if (
      !this.running ||
      this.paused ||
      !this.enabled ||
      this.pollInFlight
    ) {
      return null;
    }

    const runtime =
      this.getRuntime();

    if (!runtime?.fetch) {
      return null;
    }

    this.pollInFlight = true;
    this.stats.polls += 1;

    try {
      const separator =
        this.bridgeUrl.includes("?")
          ? "&"
          : "?";

      const response =
        await runtime.fetch(
          `${this.bridgeUrl}${separator}v=${Date.now()}`,
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          `Now Playing bridge ${response.status}`
        );
      }

      const raw =
        await response.text();

      this.consecutiveErrors = 0;

      return this.ingest(
        raw,
        {
          source: "bridge"
        }
      );
    } catch (error) {
      this.consecutiveErrors += 1;
      this.stats.errors += 1;

      this.emit(
        "soulmusic:nowplayingerror",
        {
          message:
            error?.message ||
            String(error),
          consecutiveErrors:
            this.consecutiveErrors
        }
      );

      return null;
    } finally {
      this.pollInFlight = false;
    }
  },

  ingest(input, options = {}) {
    const metadata =
      this.normalizeMetadata(
        input,
        options
      );

    const rawValue =
      typeof input === "string"
        ? input.trim()
        : JSON.stringify(
            input || {}
          );

    this.lastActivityTime =
      this.getNow();

    if (!metadata.title) {
      this.lastRawValue = "";
      this.hideNow(
        "empty-bridge"
      );
      return null;
    }

    const correctedTitle =
      this.getCorrectedTitle(
        metadata.rawTitle
      );

    if (correctedTitle) {
      metadata.title =
        correctedTitle;
      metadata.corrected = true;
    }

    const identity =
      this.getIdentity(metadata);

    if (
      this.current &&
      this.getIdentity(
        this.current
      ) === identity
    ) {
      this.lastRawValue = rawValue;
      this.stats.duplicateReads += 1;
      return this.current;
    }

    this.lastRawValue = rawValue;
    this.queueMetadata(metadata);

    return metadata;
  },

  queueMetadata(metadata) {
    this.clearTimer(
      "transitionTimerId"
    );

    if (
      this.current &&
      this.state !== "hidden"
    ) {
      this.pending = metadata;
      this.state = "exiting";
      this.render();

      this.transitionTimerId =
        this.setTimeout(
          () => {
            this.transitionTimerId =
              null;
            this.commitMetadata(
              this.pending
            );
          },
          this.timings
            .transitionOut
        );

      return;
    }

    this.commitMetadata(metadata);
  },

  commitMetadata(metadata) {
    if (!metadata) {
      return false;
    }

    this.current = {
      ...metadata,
      startedAt:
        this.getNow()
    };

    this.pending = null;
    this.state = "revealed";
    this.lastChangeTime =
      this.current.startedAt;
    this.stats.updates += 1;

    this.renderStaticContent();
    this.render();
    this.scheduleCompact();

    this.emit(
      "soulmusic:nowplayingchange",
      {
        current: {
          ...this.current
        },
        state: this.state,
        position: this.position
      }
    );

    return true;
  },

  scheduleCompact() {
    this.clearTimer(
      "compactTimerId"
    );

    this.compactTimerId =
      this.setTimeout(
        () => {
          this.compactTimerId =
            null;

          if (
            this.current &&
            this.state ===
              "revealed"
          ) {
            this.state = "compact";
            this.render();

            this.emit(
              "soulmusic:nowplayingcompact",
              {
                current: {
                  ...this.current
                }
              }
            );
          }
        },
        this.timings
          .revealDuration
      );
  },

  hideNow(
    reason = "manual",
    immediate = false
  ) {
    this.clearTimer(
      "compactTimerId"
    );

    if (
      this.state === "hidden" &&
      !this.current
    ) {
      return false;
    }

    const visibleFor =
      this.getNow() -
      this.lastChangeTime;

    if (
      !immediate &&
      this.current &&
      visibleFor <
        this.timings.minimumVisible
    ) {
      this.clearTimer(
        "transitionTimerId"
      );

      this.transitionTimerId =
        this.setTimeout(
          () => {
            this.transitionTimerId =
              null;
            this.hideNow(reason);
          },
          this.timings
            .minimumVisible -
          visibleFor
        );

      return true;
    }

    if (immediate) {
      return this.commitHide(reason);
    }

    this.state = "exiting";
    this.pending = null;
    this.render();
    this.clearTimer(
      "transitionTimerId"
    );

    this.transitionTimerId =
      this.setTimeout(
        () => {
          this.transitionTimerId =
            null;
          this.commitHide(reason);
        },
        this.timings
          .transitionOut
      );

    return true;
  },

  commitHide(reason) {
    const previous =
      this.current;

    this.current = null;
    this.pending = null;
    this.state = "hidden";
    this.stats.hides += 1;
    this.renderStaticContent();
    this.render();

    this.emit(
      "soulmusic:nowplayinghide",
      {
        reason,
        previous
      }
    );

    return true;
  },

  normalizeMetadata(
    input,
    options = {}
  ) {
    let value = input;

    if (
      typeof value === "string"
    ) {
      const trimmed = value.trim();

      if (
        trimmed.startsWith("{") &&
        trimmed.endsWith("}")
      ) {
        try {
          value = JSON.parse(trimmed);
        } catch {
          value = trimmed;
        }
      } else {
        value = trimmed;
      }
    }

    let title = "";
    let artist = "";
    let source =
      options.source ||
      "bridge";
    let artwork = "";

    if (
      value &&
      typeof value === "object"
    ) {
      title =
        value.title ||
        value.track ||
        value.name ||
        value.filename ||
        "";
      artist =
        value.artist ||
        value.author ||
        value.channel ||
        "";
      source =
        value.source || source;
      artwork =
        value.artwork ||
        value.thumbnail ||
        "";
    } else {
      const lines =
        String(value || "")
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);

      title = lines[0] || "";
      artist = lines[1] || "";
    }

    const rawTitle =
      String(title || "").trim();

    const cleaned =
      this.cleanTitle(rawTitle);

    const parsed =
      this.parseArtistTitle(
        cleaned,
        artist
      );

    return {
      title: parsed.title,
      rawTitle,
      artist:
        this.cleanArtist(
          parsed.artist
        ),
      source:
        this.normalizeSource(
          source
        ),
      artwork:
        String(artwork || ""),
      corrected: false
    };
  },

  cleanTitle(value) {
    let title =
      String(value || "").trim();

    if (!title) {
      return "";
    }

    try {
      title = decodeURIComponent(
        title
      );
    } catch {
      // Păstrează textul original.
    }

    title = title
      .replace(/^.*[\\/]/, "")
      .replace(/[?#].*$/, "")
      .replace(
        /\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|mp4|mkv|webm)$/i,
        ""
      )
      .replace(/^\s*\d{1,3}[.)_\-\s]+/, "")
      .replace(/[_]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return title;
  },

  parseArtistTitle(
    title,
    suppliedArtist = ""
  ) {
    if (suppliedArtist) {
      return {
        title,
        artist: suppliedArtist
      };
    }

    const parts =
      title.split(/\s+[|–—]\s+/);

    if (parts.length === 2) {
      return {
        artist: parts[0],
        title: parts[1]
      };
    }

    const dashParts =
      title.split(/\s+-\s+/);

    if (dashParts.length === 2) {
      return {
        artist: dashParts[0],
        title: dashParts[1]
      };
    }

    return {
      title,
      artist: ""
    };
  },

  cleanArtist(value) {
    return String(value || "")
      .replace(/[_]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  },

  normalizeSource(value) {
    const source =
      String(value || "unknown")
        .toLowerCase()
        .trim();

    const aliases = {
      tiktok:
        "tiktok-live-studio",
      "live-studio":
        "tiktok-live-studio",
      tiktoklivestudio:
        "tiktok-live-studio",
      yt: "youtube",
      "youtube-music":
        "youtube"
    };

    const normalized =
      aliases[source] || source;

    return this.sources[normalized]
      ? normalized
      : "unknown";
  },

  setManualTitle(
    title,
    rawTitle =
      this.current?.rawTitle ||
      this.lastRawValue
  ) {
    const corrected =
      this.cleanTitle(title);

    const key =
      this.getCorrectionKey(
        rawTitle
      );

    if (!corrected || !key) {
      return false;
    }

    this.manualCorrections[key] =
      corrected;
    this.saveCorrections();
    this.stats.manualCorrections += 1;

    if (
      this.current &&
      this.getCorrectionKey(
        this.current.rawTitle
      ) === key
    ) {
      this.current.title =
        corrected;
      this.current.corrected = true;
      this.renderStaticContent();
      this.render();
    }

    this.emit(
      "soulmusic:nowplayingcorrection",
      {
        rawTitle,
        title: corrected
      }
    );

    return true;
  },

  clearManualTitle(
    rawTitle =
      this.current?.rawTitle ||
      this.lastRawValue
  ) {
    const key =
      this.getCorrectionKey(
        rawTitle
      );

    if (
      !key ||
      !this.manualCorrections[key]
    ) {
      return false;
    }

    delete this.manualCorrections[key];
    this.saveCorrections();

    return true;
  },

  getCorrectedTitle(rawTitle) {
    return this.manualCorrections[
      this.getCorrectionKey(
        rawTitle
      )
    ] || "";
  },

  getCorrectionKey(value) {
    return this.cleanTitle(value)
      .toLocaleLowerCase("ro-RO");
  },

  loadCorrections() {
    const storage =
      this.getRuntime()
        ?.localStorage;

    if (!storage) {
      return;
    }

    try {
      const stored =
        storage.getItem(
          "soulmusic.nowPlayingCorrections"
        );

      this.manualCorrections =
        stored
          ? JSON.parse(stored)
          : {};
    } catch {
      this.manualCorrections = {};
    }
  },

  saveCorrections() {
    const storage =
      this.getRuntime()
        ?.localStorage;

    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        "soulmusic.nowPlayingCorrections",
        JSON.stringify(
          this.manualCorrections
        )
      );
    } catch {
      // Modulul continuă fără persistență.
    }
  },

  setPosition(
    position,
    notify = true
  ) {
    if (
      !this.allowedPositions
        .includes(position)
    ) {
      return false;
    }

    this.position = position;
    this.render();

    if (notify) {
      this.emit(
        "soulmusic:nowplayingposition",
        { position }
      );
    }

    return true;
  },

  renderStaticContent() {
    this.setText(
      this.elements.eyebrow,
      this.eyebrow
    );

    this.setText(
      this.elements.label,
      this.label
    );

    this.setText(
      this.elements.subtitle,
      this.subtitle
    );

    this.setText(
      this.elements.title,
      this.current?.title || ""
    );

    this.setText(
      this.elements.artist,
      this.current?.artist || ""
    );

    const source =
      this.sources[
        this.current?.source ||
        "unknown"
      ];

    this.setText(
      this.elements.source,
      source.label
    );

    this.setText(
      this.elements.sourceIcon,
      source.icon
    );

    if (this.elements.logo) {
      this.elements.logo.src =
        this.current?.artwork ||
        this.logoUrl;
      this.elements.logo.alt =
        "Soul Music";
    }
  },

  render() {
    if (!this.overlay) {
      return false;
    }

    if (this.overlay.dataset) {
      this.overlay.dataset.state =
        this.state;
      this.overlay.dataset.position =
        this.position;
      this.overlay.dataset.source =
        this.current?.source ||
        "none";
    }

    this.overlay.hidden =
      this.state === "hidden";

    this.applyReactiveStyle();

    return true;
  },

  scheduleReactiveFrame() {
    const runtime =
      this.getRuntime();

    if (
      !this.running ||
      this.paused ||
      !runtime?.requestAnimationFrame ||
      this.animationFrameId !== null
    ) {
      return;
    }

    this.animationFrameId =
      runtime.requestAnimationFrame(
        time => {
          this.animationFrameId = null;
          this.updateReactiveStyle(time);
          this.scheduleReactiveFrame();
        }
      );
  },

  updateReactiveStyle(time = 0) {
    const audio =
      this.getRuntime()?.SoulAudio
        ?.getState?.() || {};

    const signature =
      this.getRuntime()
        ?.SoulSignature
        ?.getFrameState?.() || {};

    const music =
      audio.music || {};

    const voice =
      audio.voice || {};

    const musicEnergy =
      this.clamp(
        music.level ||
        music.bass || 0,
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

    this.reactive.musicEnergy +=
      (
        musicEnergy -
        this.reactive.musicEnergy
      ) *
      (
        musicEnergy >
        this.reactive.musicEnergy
          ? 0.18
          : 0.07
      );

    this.reactive.voiceEnergy +=
      (
        voiceEnergy -
        this.reactive.voiceEnergy
      ) *
      (
        voiceEnergy >
        this.reactive.voiceEnergy
          ? 0.24
          : 0.09
      );

    this.reactive.pulse =
      0.5 +
      Math.sin(
        time * 0.0024
      ) * 0.5;

    if (voiceEnergy > 0.04) {
      this.reactive.accent =
        "rgba(255, 42, 72, 1)";
      this.reactive.accentSoft =
        "rgba(255, 42, 72, 0.34)";
    } else {
      this.reactive.accent =
        signature.accent ||
        "rgba(255, 201, 84, 1)";
      this.reactive.accentSoft =
        signature.accentSoft ||
        "rgba(255, 201, 84, 0.34)";
    }

    this.applyReactiveStyle();

    return {
      ...this.reactive
    };
  },

  applyReactiveStyle() {
    if (!this.overlay?.style) {
      return false;
    }

    const properties = {
      "--now-playing-accent":
        this.reactive.accent,
      "--now-playing-accent-soft":
        this.reactive.accentSoft,
      "--now-playing-music":
        this.reactive.musicEnergy,
      "--now-playing-voice":
        this.reactive.voiceEnergy,
      "--now-playing-pulse":
        this.reactive.pulse
    };

    const entries =
      Object.entries(properties);

    for (
      let index = 0;
      index < entries.length;
      index += 1
    ) {
      this.overlay.style.setProperty(
        entries[index][0],
        String(entries[index][1])
      );
    }

    return true;
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
      "soulmusic:nowplayingset",
      event => {
        this.ingest(
          event.detail || {},
          {
            source:
              event.detail?.source ||
              "manual"
          }
        );
      }
    );

    runtime.addEventListener(
      "soulmusic:nowplayinghide",
      event => {
        if (!event.detail?.previous) {
          this.hideNow(
            "event"
          );
        }
      }
    );
  },

  reset(notify = true) {
    this.clearTimer(
      "transitionTimerId"
    );
    this.clearTimer(
      "compactTimerId"
    );
    this.current = null;
    this.pending = null;
    this.lastRawValue = "";
    this.lastChangeTime = 0;
    this.lastActivityTime = 0;
    this.state = "hidden";
    this.consecutiveErrors = 0;
    this.pollInFlight = false;
    this.reactive = {
      accent:
        "rgba(255, 201, 84, 1)",
      accentSoft:
        "rgba(255, 201, 84, 0.34)",
      musicEnergy: 0,
      voiceEnergy: 0,
      pulse: 0
    };
    this.stats = {
      polls: 0,
      updates: 0,
      hides: 0,
      errors: 0,
      manualCorrections: 0,
      duplicateReads: 0
    };
    this.renderStaticContent();
    this.render();

    if (notify) {
      this.emit(
        "soulmusic:nowplayingreset",
        this.getState()
      );
    }

    return this.getState();
  },

  getIdentity(metadata) {
    return [
      metadata.title,
      metadata.artist,
      metadata.source
    ]
      .join("|")
      .toLocaleLowerCase(
        "ro-RO"
      );
  },

  getState() {
    return {
      version: this.version,
      running: this.running,
      paused: this.paused,
      enabled: this.enabled,
      overlayReady:
        Boolean(this.overlay),
      bridgeUrl:
        this.bridgeUrl,
      pollInterval:
        this.pollInterval,
      position:
        this.position,
      state: this.state,
      current:
        this.current
          ? { ...this.current }
          : null,
      pending:
        this.pending
          ? { ...this.pending }
          : null,
      consecutiveErrors:
        this.consecutiveErrors,
      reactive: {
        ...this.reactive
      },
      stats: {
        ...this.stats
      }
    };
  },

  setText(element, value) {
    if (element) {
      element.textContent =
        String(value || "");
    }
  },

  setTimeout(callback, delay) {
    const runtime =
      this.getRuntime();

    return runtime?.setTimeout
      ? runtime.setTimeout(
          callback,
          Math.max(0, delay)
        )
      : null;
  },

  clearTimer(
    property,
    type = "timeout"
  ) {
    const id = this[property];

    if (id === null) {
      return;
    }

    const runtime =
      this.getRuntime();

    if (type === "interval") {
      runtime?.clearInterval?.(id);
    } else {
      runtime?.clearTimeout?.(id);
    }

    this[property] = null;
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
  window.SoulNowPlaying =
    SoulNowPlaying;
}

if (
  typeof module !==
  "undefined" &&
  module.exports
) {
  module.exports =
    SoulNowPlaying;
}
