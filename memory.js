"use strict";

/*
  SOUL MUSIC MEMORY — DESIGN V2 — PASUL 7

  Memorează numai preferințele stabile ale operatorului. Autostartul audio
  este permis doar când dispozitivul salvat poate fi identificat sigur.
*/

const SoulMemory = {
  version: "1.0.0-step7",
  schemaVersion: 1,
  storageKey:
    "soul-music-live-2.preferences.v1",

  engine: null,
  audio: null,
  elements: {},

  running: false,
  eventsBound: false,
  restoring: false,
  awaitingInitialRestore: true,
  restored: false,
  storageAvailable: false,
  saveTimerId: null,
  restorePromise: null,
  lastSavedAt: 0,
  lastError: null,

  controlIds: [
    "musicSensitivity",
    "voiceSensitivity",
    "bassSensitivity",
    "highSensitivity",
    "neonIntensity",
    "particleIntensity"
  ],

  defaults: {
    schemaVersion: 1,
    mode: "live",
    controls: {
      musicSensitivity: 4.5,
      voiceSensitivity: 6,
      bassSensitivity: 2,
      highSensitivity: 1.7,
      neonIntensity: 1.6,
      particleIntensity: 1.3
    },
    devices: {
      music: null,
      voice: null
    },
    autostart: {
      enabled: true,
      music: false,
      voice: false
    },
    savedAt: 0
  },

  preferences: null,

  stats: {
    loads: 0,
    saves: 0,
    clears: 0,
    restores: 0,
    autostartAttempts: 0,
    autostartSuccesses: 0,
    missingDevices: 0,
    invalidSnapshots: 0
  },

  restoreResults: {
    music: "idle",
    voice: "idle"
  },

  init(options = {}) {
    const runtime = this.getRuntime();

    this.engine =
      options.engine ||
      runtime?.EngineX || null;
    this.audio =
      options.audio ||
      runtime?.SoulAudio || null;

    this.cacheElements();
    this.storageAvailable =
      this.checkStorage();
    this.preferences = this.load();
    this.bindEvents();
    this.applyToggleState();
    this.updateStatus(
      this.storageAvailable
        ? "Memorie: pregătită"
        : "Memorie: indisponibilă",
      this.storageAvailable
        ? "ready"
        : "warning"
    );

    if (options.autoStart !== false) {
      this.start();
    }

    this.emit(
      "soulmusic:memoryready",
      this.getState()
    );

    return this.getState();
  },

  cacheElements() {
    const document =
      this.getRuntime()?.document;

    this.elements = {
      musicDevice:
        document?.getElementById?.(
          "musicDevice"
        ) || null,
      voiceDevice:
        document?.getElementById?.(
          "voiceDevice"
        ) || null,
      autoStart:
        document?.getElementById?.(
          "autoStartMemory"
        ) || null,
      clear:
        document?.getElementById?.(
          "clearEngineMemory"
        ) || null,
      status:
        document?.getElementById?.(
          "memoryStatus"
        ) || null,
      controls: Object.fromEntries(
        this.controlIds.map(id => [
          id,
          document?.getElementById?.(id) ||
          null
        ])
      )
    };
  },

  start() {
    this.running = true;
    return true;
  },

  stop() {
    this.running = false;
    this.clearSaveTimer();
    return true;
  },

  checkStorage() {
    const storage =
      this.getStorage();

    if (!storage) {
      return false;
    }

    try {
      const testKey =
        `${this.storageKey}.test`;
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      this.lastError =
        error?.message || String(error);
      return false;
    }
  },

  load() {
    const fallback =
      this.createDefaults();

    if (!this.storageAvailable) {
      return fallback;
    }

    try {
      const raw = this.getStorage()
        ?.getItem(this.storageKey);

      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      const validated =
        this.validateSnapshot(parsed);

      if (!validated) {
        this.stats.invalidSnapshots += 1;
        this.getStorage()
          ?.removeItem(this.storageKey);
        return fallback;
      }

      this.stats.loads += 1;
      return validated;
    } catch (error) {
      this.lastError =
        error?.message || String(error);
      this.stats.invalidSnapshots += 1;
      return fallback;
    }
  },

  validateSnapshot(snapshot) {
    if (
      !snapshot ||
      snapshot.schemaVersion !==
        this.schemaVersion
    ) {
      return null;
    }

    const result =
      this.createDefaults();
    const modes = [
      "calm",
      "live",
      "party",
      "legendary"
    ];

    if (modes.includes(snapshot.mode)) {
      result.mode = snapshot.mode;
    }

    for (const id of this.controlIds) {
      const element =
        this.elements.controls[id];
      const value = Number(
        snapshot.controls?.[id]
      );
      const minimum = Number(
        element?.min
      );
      const maximum = Number(
        element?.max
      );

      if (!Number.isFinite(value)) {
        continue;
      }

      result.controls[id] =
        this.clamp(
          value,
          Number.isFinite(minimum)
            ? minimum
            : -Infinity,
          Number.isFinite(maximum)
            ? maximum
            : Infinity
        );
    }

    result.devices.music =
      this.validateDevice(
        snapshot.devices?.music
      );
    result.devices.voice =
      this.validateDevice(
        snapshot.devices?.voice
      );
    result.autostart.enabled =
      snapshot.autostart?.enabled !==
        false;
    result.autostart.music =
      Boolean(
        snapshot.autostart?.music
      );
    result.autostart.voice =
      Boolean(
        snapshot.autostart?.voice
      );
    result.savedAt =
      Number(snapshot.savedAt) || 0;

    return result;
  },

  validateDevice(device) {
    if (!device) {
      return null;
    }

    const deviceId = String(
      device.deviceId || ""
    ).slice(0, 512);
    const label = String(
      device.label || ""
    ).trim().slice(0, 256);

    if (!deviceId && !label) {
      return null;
    }

    return { deviceId, label };
  },

  createDefaults() {
    return {
      schemaVersion:
        this.schemaVersion,
      mode: this.defaults.mode,
      controls: {
        ...this.defaults.controls
      },
      devices: {
        music: null,
        voice: null
      },
      autostart: {
        ...this.defaults.autostart
      },
      savedAt: 0
    };
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
      "soulmusic:audioready",
      () => this.restore()
    );

    runtime.addEventListener(
      "soulmusic:audiodevicesloaded",
      () => {
        if (this.restored) {
          this.restoreDeviceSelections(
            false
          );
        }
      }
    );

    runtime.addEventListener(
      "soulmusic:modechange",
      event => {
        if (this.canCapture()) {
          this.preferences.mode =
            event.detail?.mode ||
            this.engine?.mode ||
            "live";
          this.scheduleSave();
        }
      }
    );

    runtime.addEventListener(
      "soulmusic:inputactivated",
      event => {
        const type = event.detail?.type;

        if (
          this.canCapture() &&
          (
            type === "music" ||
            type === "voice"
          )
        ) {
          this.preferences.devices[type] =
            this.readSelectedDevice(type);
          this.preferences.autostart[type] =
            true;
          this.scheduleSave(0);
        }
      }
    );

    runtime.addEventListener(
      "soulmusic:inputstopped",
      event => {
        const type = event.detail?.type;

        if (
          this.canCapture() &&
          (
            type === "music" ||
            type === "voice"
          )
        ) {
          this.preferences.autostart[type] =
            false;
          this.scheduleSave(0);
        }
      }
    );

    runtime.addEventListener(
      "soulmusic:reset",
      () => {
        runtime.setTimeout?.(
          () => {
            if (this.canCapture()) {
              this.captureControls();
              this.scheduleSave(0);
            }
          },
          0
        );
      }
    );

    for (const element of
      Object.values(
        this.elements.controls
      )) {
      element?.addEventListener?.(
        "input",
        () => {
          if (this.canCapture()) {
            this.captureControls();
            this.scheduleSave();
          }
        }
      );
    }

    for (const type of [
      "music",
      "voice"
    ]) {
      const select =
        this.getDeviceSelect(type);

      select?.addEventListener?.(
        "change",
        () => {
          if (!this.canCapture()) {
            return;
          }

          this.preferences.devices[type] =
            this.readSelectedDevice(type);
          this.scheduleSave();
        }
      );
    }

    this.elements.autoStart
      ?.addEventListener?.(
        "change",
        () => {
          this.preferences
            .autostart.enabled =
            Boolean(
              this.elements.autoStart
                .checked
            );
          this.scheduleSave(0);
          this.updateStatus(
            this.preferences
              .autostart.enabled
              ? "Memorie: autostart activ"
              : "Memorie: autostart oprit",
            "ready"
          );
        }
      );

    this.elements.clear
      ?.addEventListener?.(
        "click",
        () => this.clear()
      );

    return true;
  },

  async restore() {
    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.restorePromise =
      this.performRestore();

    try {
      return await this.restorePromise;
    } finally {
      this.restorePromise = null;
    }
  },

  async performRestore() {
    if (!this.running) {
      return false;
    }

    this.restoring = true;
    this.updateStatus(
      "Memorie: restaurez setările...",
      "loading"
    );

    try {
      this.restoreControls();
      await this.restoreDeviceSelections(
        true
      );
      this.restored = true;
      this.stats.restores += 1;
      this.updateRestoreStatus();

      this.emit(
        "soulmusic:memoryrestored",
        this.getState()
      );
      return true;
    } catch (error) {
      this.lastError =
        error?.message || String(error);
      this.updateStatus(
        "Memorie: restaurare parțială",
        "warning"
      );
      return false;
    } finally {
      this.restoring = false;
      this.awaitingInitialRestore =
        false;
    }
  },

  restoreControls() {
    this.engine?.setMode?.(
      this.preferences.mode,
      false
    );

    for (const id of this.controlIds) {
      const element =
        this.elements.controls[id];

      if (!element) {
        continue;
      }

      element.value = String(
        this.preferences.controls[id]
      );
      element.dispatchEvent(
        new (this.getRuntime().Event)(
          "input",
          { bubbles: true }
        )
      );
    }
  },

  async restoreDeviceSelections(
    allowAutostart
  ) {
    for (const type of [
      "music",
      "voice"
    ]) {
      const select =
        this.getDeviceSelect(type);
      const saved =
        this.preferences.devices[type];
      const match =
        this.findDeviceOption(
          select,
          saved
        );

      if (match) {
        select.value = match.value;
        this.restoreResults[type] =
          "selected";
      } else if (saved) {
        this.restoreResults[type] =
          "missing";
        this.stats.missingDevices += 1;
      } else {
        this.restoreResults[type] =
          "recommended";
      }

      const shouldStart =
        allowAutostart &&
        this.preferences.autostart
          .enabled &&
        this.preferences.autostart[type];

      if (!shouldStart) {
        continue;
      }

      if (!match) {
        this.restoreResults[type] =
          "autostart-blocked";
        continue;
      }

      if (this.audio?.[type]?.active) {
        this.restoreResults[type] =
          "active";
        continue;
      }

      this.stats.autostartAttempts += 1;
      await this.audio
        ?.activateInput?.(type);

      if (this.audio?.[type]?.active) {
        this.restoreResults[type] =
          "started";
        this.stats
          .autostartSuccesses += 1;
      } else {
        this.restoreResults[type] =
          "start-failed";
      }
    }

    return { ...this.restoreResults };
  },

  findDeviceOption(select, saved) {
    if (!select || !saved) {
      return null;
    }

    const options = [
      ...select.options
    ];
    const byId = options.find(
      option =>
        saved.deviceId &&
        option.value ===
          saved.deviceId
    );

    if (byId) {
      return byId;
    }

    const savedLabel =
      this.normalizeLabel(saved.label);

    if (!savedLabel) {
      return null;
    }

    return options.find(
      option =>
        this.normalizeLabel(
          option.textContent
        ) === savedLabel
    ) || null;
  },

  normalizeLabel(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("ro-RO")
      .replace(/\s+/g, " ");
  },

  captureControls() {
    this.preferences.mode =
      this.engine?.mode || "live";

    for (const id of this.controlIds) {
      const value = Number(
        this.elements.controls[id]
          ?.value
      );

      if (Number.isFinite(value)) {
        this.preferences.controls[id] =
          value;
      }
    }
  },

  canCapture() {
    return (
      !this.restoring &&
      !this.awaitingInitialRestore
    );
  },

  readSelectedDevice(type) {
    const select =
      this.getDeviceSelect(type);
    const option =
      select?.selectedOptions?.[0];

    if (!select?.value || !option) {
      return null;
    }

    return {
      deviceId:
        String(select.value),
      label:
        String(
          option.textContent || ""
        ).trim()
    };
  },

  getDeviceSelect(type) {
    return type === "music"
      ? this.elements.musicDevice
      : this.elements.voiceDevice;
  },

  scheduleSave(delay = 180) {
    if (
      this.restoring ||
      !this.storageAvailable
    ) {
      return false;
    }

    this.clearSaveTimer();
    const runtime = this.getRuntime();

    this.saveTimerId =
      runtime?.setTimeout?.(
        () => {
          this.saveTimerId = null;
          this.save();
        },
        Math.max(0, delay)
      ) || null;

    return true;
  },

  save() {
    if (!this.storageAvailable) {
      return false;
    }

    try {
      this.captureControls();
      this.preferences.savedAt =
        Date.now();
      this.getStorage()?.setItem(
        this.storageKey,
        JSON.stringify(
          this.preferences
        )
      );
      this.lastSavedAt =
        this.preferences.savedAt;
      this.stats.saves += 1;
      this.updateStatus(
        "Memorie: setări salvate",
        "saved"
      );
      return true;
    } catch (error) {
      this.lastError =
        error?.message || String(error);
      this.updateStatus(
        "Memorie: salvare eșuată",
        "warning"
      );
      return false;
    }
  },

  clear() {
    this.clearSaveTimer();

    try {
      this.getStorage()
        ?.removeItem(this.storageKey);
    } catch (error) {
      this.lastError =
        error?.message || String(error);
    }

    this.preferences =
      this.createDefaults();
    this.restored = false;
    this.restoreResults = {
      music: "idle",
      voice: "idle"
    };
    this.stats.clears += 1;
    this.applyToggleState();
    this.updateStatus(
      "Memorie: ștearsă",
      "cleared"
    );
    this.getRuntime()?.EngineX
      ?.showNotice?.(
        "Memoria engine-ului a fost ștearsă"
      );

    this.emit(
      "soulmusic:memorycleared",
      this.getState()
    );
    return true;
  },

  clearSaveTimer() {
    if (this.saveTimerId !== null) {
      this.getRuntime()
        ?.clearTimeout?.(
          this.saveTimerId
        );
    }

    this.saveTimerId = null;
  },

  applyToggleState() {
    if (this.elements.autoStart) {
      this.elements.autoStart.checked =
        this.preferences
          ?.autostart?.enabled !==
        false;
    }
  },

  updateRestoreStatus() {
    const results =
      Object.values(
        this.restoreResults
      );
    const blocked =
      results.includes(
        "autostart-blocked"
      );
    const failed =
      results.includes(
        "start-failed"
      );
    const started =
      results.filter(
        value => value === "started"
      ).length;

    if (blocked || failed) {
      this.updateStatus(
        "Memorie: verifică dispozitivele audio",
        "warning"
      );
    } else if (started > 0) {
      this.updateStatus(
        `Memorie: ${started} canale pornite`,
        "active"
      );
    } else {
      this.updateStatus(
        "Memorie: setări restaurate",
        "ready"
      );
    }
  },

  updateStatus(message, state) {
    if (!this.elements.status) {
      return false;
    }

    this.elements.status.textContent =
      message;
    this.elements.status.dataset.state =
      state;
    return true;
  },

  getState() {
    return {
      version: this.version,
      schemaVersion:
        this.schemaVersion,
      running: this.running,
      restored: this.restored,
      awaitingInitialRestore:
        this.awaitingInitialRestore,
      storageAvailable:
        this.storageAvailable,
      lastSavedAt:
        this.lastSavedAt,
      lastError:
        this.lastError,
      restoreResults: {
        ...this.restoreResults
      },
      preferences:
        this.preferences
          ? JSON.parse(
              JSON.stringify(
                this.preferences
              )
            )
          : null,
      stats: { ...this.stats }
    };
  },

  getStorage() {
    try {
      return this.getRuntime()
        ?.localStorage || null;
    } catch (error) {
      return null;
    }
  },

  clamp(value, minimum, maximum) {
    return Math.min(
      maximum,
      Math.max(minimum, value)
    );
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
  window.SoulMemory = SoulMemory;
}

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = SoulMemory;
}
