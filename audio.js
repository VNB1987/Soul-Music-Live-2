"use strict";

const SoulAudio = {
  music: {
    stream: null,
    context: null,
    source: null,
    analyser: null,
    frequencyData: null,
    timeData: null,

    active: false,

    rawLevel: 0,
    level: 0,
    bass: 0,
    mids: 0,
    highs: 0,

    peak: 0,
    beat: 0
  },

  voice: {
    stream: null,
    context: null,
    source: null,
    analyser: null,
    frequencyData: null,
    timeData: null,

    active: false,

    rawLevel: 0,
    level: 0,
    bass: 0,
    mids: 0,
    highs: 0,

    peak: 0,
    detected: false,
    energy: 0,

    noiseFloor: 0.018
  },

  elements: {},

  initialized: false,

  async init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.cacheElements();
    this.bindControls();
    this.bindDeviceEvents();

    await this.loadDevices();

    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:audioready"
      )
    );
  },

  cacheElements() {
    this.elements.musicDevice =
      document.getElementById(
        "musicDevice"
      );

    this.elements.voiceDevice =
      document.getElementById(
        "voiceDevice"
      );

    this.elements.activateMusic =
      document.getElementById(
        "activateMusic"
      );

    this.elements.activateVoice =
      document.getElementById(
        "activateVoice"
      );

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

    this.elements.statusText =
      document.getElementById(
        "statusText"
      );

    this.elements.musicStatus =
      document.getElementById(
        "musicStatus"
      );

    this.elements.voiceStatus =
      document.getElementById(
        "voiceStatus"
      );
  },

  bindControls() {
    this.elements.activateMusic
      ?.addEventListener(
        "click",
        async () => {
          await this.toggleInput(
            "music"
          );
        }
      );

    this.elements.activateVoice
      ?.addEventListener(
        "click",
        async () => {
          await this.toggleInput(
            "voice"
          );
        }
      );

    window.addEventListener(
      "soulmusic:reset",
      () => {
        this.resetAnalysisValues();
      }
    );
  },

  bindDeviceEvents() {
    if (
      navigator.mediaDevices &&
      typeof navigator.mediaDevices
        .addEventListener ===
        "function"
    ) {
      navigator.mediaDevices
        .addEventListener(
          "devicechange",
          async () => {
            await this.loadDevices();
          }
        );
    }
  },

  async loadDevices() {
    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw new Error(
          "Browserul nu permite accesul la dispozitive audio."
        );
      }

      const permissionStream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true
          });

      permissionStream
        .getTracks()
        .forEach(
          track => track.stop()
        );

      const devices =
        await navigator.mediaDevices
          .enumerateDevices();

      const audioInputs =
        devices.filter(
          device =>
            device.kind ===
            "audioinput"
        );

      this.fillDeviceSelect(
        this.elements.musicDevice,
        audioInputs
      );

      this.fillDeviceSelect(
        this.elements.voiceDevice,
        audioInputs
      );

      this.selectRecommendedDevices();

      this.setStatus(
        "Dispozitive încărcate. Selectează CABLE Output pentru muzică și microfonul real pentru voce."
      );
    } catch (error) {
      console.error(
        "Audio device error:",
        error
      );

      this.setStatus(
        `Eroare audio: ${
          error.name ||
          error.message
        }`
      );
    }
  },

  fillDeviceSelect(
    select,
    devices
  ) {
    if (!select) {
      return;
    }

    const previousValue =
      select.value;

    select.innerHTML = "";

    devices.forEach(
      (device, index) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          device.deviceId;

        option.textContent =
          device.label ||
          `Dispozitiv audio ${
            index + 1
          }`;

        select.appendChild(
          option
        );
      }
    );

    const previousExists = [
      ...select.options
    ].some(
      option =>
        option.value ===
        previousValue
    );

    if (previousExists) {
      select.value =
        previousValue;
    }
  },

  selectRecommendedDevices() {
    const musicSelect =
      this.elements.musicDevice;

    const voiceSelect =
      this.elements.voiceDevice;

    if (musicSelect) {
      const options = [
        ...musicSelect.options
      ];

      const preferred =
        options.find(option =>
          /CABLE Output/i.test(
            option.textContent
          )
        ) ||
        options.find(option =>
          /VB-Audio/i.test(
            option.textContent
          )
        ) ||
        options.find(option =>
          /CABLE/i.test(
            option.textContent
          )
        );

      if (preferred) {
        musicSelect.value =
          preferred.value;
      }
    }

    if (voiceSelect) {
      const options = [
        ...voiceSelect.options
      ];

      const preferred =
        options.find(option =>
          /Microphone|Microfon|Webcam|S6|USB Mic/i.test(
            option.textContent
          ) &&
          !/CABLE|Steam|Virtual/i.test(
            option.textContent
          )
        );

      if (preferred) {
        voiceSelect.value =
          preferred.value;
      }
    }
  },

  async toggleInput(type) {
    const target =
      this[type];

    if (target.active) {
      await this.stopInput(type);
      return;
    }

    await this.activateInput(type);
  },

  async activateInput(type) {
    const select =
      type === "music"
        ? this.elements.musicDevice
        : this.elements.voiceDevice;

    try {
      if (
        !select ||
        !select.value
      ) {
        throw new Error(
          "Nu este selectat niciun dispozitiv."
        );
      }

      await this.stopInput(
        type,
        false
      );

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: {
              deviceId: {
                exact: select.value
              },

              echoCancellation:
                false,

              noiseSuppression:
                false,

              autoGainControl:
                false,

              channelCount:
                2
            }
          });

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(
          "AudioContext nu este disponibil."
        );
      }

      const context =
        new AudioContextClass();

      if (
        context.state ===
        "suspended"
      ) {
        await context.resume();
      }

      const source =
        context.createMediaStreamSource(
          stream
        );

      const analyser =
        context.createAnalyser();

      analyser.fftSize =
        2048;

      analyser.smoothingTimeConstant =
        type === "music"
          ? 0.78
          : 0.68;

      analyser.minDecibels =
        -95;

      analyser.maxDecibels =
        -8;

      source.connect(
        analyser
      );

      const target =
        this[type];

      target.stream =
        stream;

      target.context =
        context;

      target.source =
        source;

      target.analyser =
        analyser;

      target.frequencyData =
        new Uint8Array(
          analyser.frequencyBinCount
        );

      target.timeData =
        new Uint8Array(
          analyser.fftSize
        );

      target.active =
        true;

      target.level = 0;
      target.rawLevel = 0;
      target.bass = 0;
      target.mids = 0;
      target.highs = 0;
      target.peak = 0;

      if (type === "voice") {
        target.energy = 0;
        target.detected = false;
      }

      stream
        .getAudioTracks()
        .forEach(track => {
          track.addEventListener(
            "ended",
            () => {
              this.stopInput(
                type
              );
            }
          );
        });

      this.updateButtonState(
        type,
        true
      );

      this.updateStatusState(
        type,
        true
      );

      this.setStatus(
        type === "music"
          ? "Muzica este activă și este analizată separat."
          : "Microfonul este activ. Vocea va adăuga efecte roșii fără să oprească muzica."
      );

      window.dispatchEvent(
        new CustomEvent(
          "soulmusic:inputactivated",
          {
            detail: {
              type
            }
          }
        )
      );
    } catch (error) {
      console.error(
        `${type} activation error:`,
        error
      );

      this.updateButtonState(
        type,
        false
      );

      this.updateStatusState(
        type,
        false
      );

      this.setStatus(
        `Eroare ${
          type === "music"
            ? "muzică"
            : "microfon"
        }: ${
          error.name ||
          error.message
        }`
      );
    }
  },

  async stopInput(
    type,
    notify = true
  ) {
    const target =
      this[type];

    if (target.stream) {
      target.stream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );
    }

    if (
      target.context &&
      target.context.state !==
        "closed"
    ) {
      try {
        await target.context
          .close();
      } catch (error) {
        console.warn(
          "Audio context close:",
          error
        );
      }
    }

    target.stream = null;
    target.context = null;
    target.source = null;
    target.analyser = null;
    target.frequencyData = null;
    target.timeData = null;

    target.active = false;

    target.rawLevel = 0;
    target.level = 0;
    target.bass = 0;
    target.mids = 0;
    target.highs = 0;
    target.peak = 0;

    if (type === "voice") {
      target.energy = 0;
      target.detected = false;
    }

    this.updateButtonState(
      type,
      false
    );

    this.updateStatusState(
      type,
      false
    );

    if (notify) {
      this.setStatus(
        type === "music"
          ? "Muzica a fost dezactivată."
          : "Microfonul a fost dezactivat."
      );

      window.dispatchEvent(
        new CustomEvent(
          "soulmusic:inputstopped",
          {
            detail: {
              type
            }
          }
        )
      );
    }
  },

  updateButtonState(
    type,
    active
  ) {
    const button =
      type === "music"
        ? this.elements
            .activateMusic
        : this.elements
            .activateVoice;

    if (!button) {
      return;
    }

    button.textContent =
      active
        ? (
            type === "music"
              ? "Oprește muzica"
              : "Oprește microfonul"
          )
        : (
            type === "music"
              ? "Activează muzica"
              : "Activează microfonul"
          );

    button.dataset.active =
      String(active);
  },

  updateStatusState(
    type,
    active
  ) {
    const element =
      type === "music"
        ? this.elements.musicStatus
        : this.elements.voiceStatus;

    if (!element) {
      return;
    }

    element.textContent =
      type === "music"
        ? (
            active
              ? "Muzică: activă"
              : "Muzică: inactivă"
          )
        : (
            active
              ? "Microfon: activ"
              : "Microfon: inactiv"
          );

    element.dataset.active =
      String(active);
  },

  update() {
    this.updateMusic();
    this.updateVoice();
  },

  updateMusic() {
    const target =
      this.music;

    if (
      !target.active ||
      !target.analyser ||
      !target.frequencyData
    ) {
      this.fadeTarget(
        target,
        0.88
      );

      return;
    }

    target.analyser
      .getByteFrequencyData(
        target.frequencyData
      );

    target.analyser
      .getByteTimeDomainData(
        target.timeData
      );

    const data =
      target.frequencyData;

    const length =
      data.length;

    const bassEnd =
      Math.max(
        5,
        Math.floor(
          length * 0.085
        )
      );

    const midsEnd =
      Math.floor(
        length * 0.34
      );

    const highsEnd =
      Math.floor(
        length * 0.78
      );

    const bassRaw =
      this.averageRange(
        data,
        1,
        bassEnd
      ) / 255;

    const midsRaw =
      this.averageRange(
        data,
        bassEnd,
        midsEnd
      ) / 255;

    const highsRaw =
      this.averageRange(
        data,
        midsEnd,
        highsEnd
      ) / 255;

    const rms =
      this.calculateRms(
        target.timeData
      );

    const musicSensitivity =
      this.getControlValue(
        this.elements
          .musicSensitivity,
        4.5
      );

    const bassSensitivity =
      this.getControlValue(
        this.elements
          .bassSensitivity,
        2
      );

    const highSensitivity =
      this.getControlValue(
        this.elements
          .highSensitivity,
        1.7
      );

    const rawLevel =
      bassRaw * 0.42 +
      midsRaw * 0.35 +
      highsRaw * 0.13 +
      rms * 0.10;

    const targetLevel =
      this.compress(
        rawLevel *
        musicSensitivity,
        1.35
      );

    const targetBass =
      this.compress(
        bassRaw *
        musicSensitivity *
        bassSensitivity,
        1.05
      );

    const targetMids =
      this.compress(
        midsRaw *
        musicSensitivity,
        1.25
      );

    const targetHighs =
      this.compress(
        highsRaw *
        musicSensitivity *
        highSensitivity,
        1.15
      );

    target.rawLevel =
      rawLevel;

    target.level =
      this.smoothValue(
        target.level,
        targetLevel,
        0.26,
        0.12
      );

    target.bass =
      this.smoothValue(
        target.bass,
        targetBass,
        0.34,
        0.15
      );

    target.mids =
      this.smoothValue(
        target.mids,
        targetMids,
        0.25,
        0.13
      );

    target.highs =
      this.smoothValue(
        target.highs,
        targetHighs,
        0.38,
        0.18
      );

    target.peak =
      Math.max(
        target.level,
        target.peak * 0.94
      );

    const beatTarget =
      target.bass > 0.22
        ? target.bass
        : 0;

    target.beat =
      this.smoothValue(
        target.beat,
        beatTarget,
        0.52,
        0.20
      );
  },

  updateVoice() {
    const target =
      this.voice;

    if (
      !target.active ||
      !target.analyser ||
      !target.frequencyData
    ) {
      this.fadeTarget(
        target,
        0.84
      );

      target.energy *=
        0.84;

      target.detected =
        false;

      return;
    }

    target.analyser
      .getByteFrequencyData(
        target.frequencyData
      );

    target.analyser
      .getByteTimeDomainData(
        target.timeData
      );

    const data =
      target.frequencyData;

    const length =
      data.length;

    const bassEnd =
      Math.max(
        5,
        Math.floor(
          length * 0.10
        )
      );

    const midsEnd =
      Math.floor(
        length * 0.42
      );

    const highsEnd =
      Math.floor(
        length * 0.82
      );

    const bassRaw =
      this.averageRange(
        data,
        1,
        bassEnd
      ) / 255;

    const midsRaw =
      this.averageRange(
        data,
        bassEnd,
        midsEnd
      ) / 255;

    const highsRaw =
      this.averageRange(
        data,
        midsEnd,
        highsEnd
      ) / 255;

    const rms =
      this.calculateRms(
        target.timeData
      );

    const voiceSensitivity =
      this.getControlValue(
        this.elements
          .voiceSensitivity,
        6
      );

    const rawLevel =
      bassRaw * 0.22 +
      midsRaw * 0.48 +
      highsRaw * 0.12 +
      rms * 0.18;

    target.noiseFloor =
      this.updateNoiseFloor(
        target.noiseFloor,
        rawLevel
      );

    const dynamicThreshold =
      Math.max(
        0.026,
        target.noiseFloor *
        1.95
      );

    const adjustedLevel =
      Math.max(
        0,
        rawLevel -
        dynamicThreshold
      );

    const targetLevel =
      this.compress(
        adjustedLevel *
        voiceSensitivity *
        2.4,
        1.05
      );

    const targetBass =
      this.compress(
        bassRaw *
        voiceSensitivity *
        0.72,
        1.1
      );

    const targetMids =
      this.compress(
        midsRaw *
        voiceSensitivity *
        1.25,
        1.0
      );

    const targetHighs =
      this.compress(
        highsRaw *
        voiceSensitivity *
        0.85,
        1.1
      );

    target.rawLevel =
      rawLevel;

    target.level =
      this.smoothValue(
        target.level,
        targetLevel,
        0.40,
        0.13
      );

    target.bass =
      this.smoothValue(
        target.bass,
        targetBass,
        0.32,
        0.15
      );

    target.mids =
      this.smoothValue(
        target.mids,
        targetMids,
        0.40,
        0.14
      );

    target.highs =
      this.smoothValue(
        target.highs,
        targetHighs,
        0.38,
        0.17
      );

    target.peak =
      Math.max(
        target.level,
        target.peak * 0.91
      );

    const voiceDetected =
      target.level > 0.055 ||
      target.mids > 0.12;

    target.detected =
      voiceDetected;

    const targetEnergy =
      voiceDetected
        ? Math.min(
            1,
            target.level * 1.15 +
            target.mids * 0.25
          )
        : 0;

    target.energy =
      this.smoothValue(
        target.energy,
        targetEnergy,
        0.44,
        0.10
      );
  },

  fadeTarget(
    target,
    factor
  ) {
    target.rawLevel *=
      factor;

    target.level *=
      factor;

    target.bass *=
      factor;

    target.mids *=
      factor;

    target.highs *=
      factor;

    target.peak *=
      factor;

    if (
      typeof target.beat ===
      "number"
    ) {
      target.beat *=
        factor;
    }
  },

  updateNoiseFloor(
    current,
    value
  ) {
    if (value < current) {
      return (
        current * 0.92 +
        value * 0.08
      );
    }

    if (
      value <
      current * 1.35
    ) {
      return (
        current * 0.995 +
        value * 0.005
      );
    }

    return current;
  },

  calculateRms(timeData) {
    if (!timeData) {
      return 0;
    }

    let sum = 0;

    for (
      let index = 0;
      index < timeData.length;
      index += 1
    ) {
      const normalized =
        (
          timeData[index] -
          128
        ) / 128;

      sum +=
        normalized *
        normalized;
    }

    return Math.sqrt(
      sum /
      timeData.length
    );
  },

  averageRange(
    data,
    start,
    end
  ) {
    let total = 0;
    let count = 0;

    const safeStart =
      Math.max(
        0,
        Math.floor(start)
      );

    const safeEnd =
      Math.min(
        data.length,
        Math.floor(end)
      );

    for (
      let index = safeStart;
      index < safeEnd;
      index += 1
    ) {
      total +=
        data[index];

      count += 1;
    }

    return count > 0
      ? total / count
      : 0;
  },

  smoothValue(
    current,
    target,
    attack,
    release
  ) {
    const speed =
      target > current
        ? attack
        : release;

    return (
      current +
      (
        target -
        current
      ) *
      speed
    );
  },

  compress(
    value,
    curve = 1
  ) {
    const safeValue =
      Math.max(
        0,
        value
      );

    return Math.min(
      1,
      1 -
      Math.exp(
        -safeValue *
        curve
      )
    );
  },

  getControlValue(
    element,
    fallback
  ) {
    const value =
      Number(
        element?.value
      );

    return Number.isFinite(
      value
    )
      ? value
      : fallback;
  },

  getState() {
    return {
      music: {
        active:
          this.music.active,

        rawLevel:
          this.music.rawLevel,

        level:
          this.music.level,

        bass:
          this.music.bass,

        mids:
          this.music.mids,

        highs:
          this.music.highs,

        peak:
          this.music.peak,

        beat:
          this.music.beat,

        frequencyData:
          this.music.frequencyData
      },

      voice: {
        active:
          this.voice.active,

        rawLevel:
          this.voice.rawLevel,

        level:
          this.voice.level,

        bass:
          this.voice.bass,

        mids:
          this.voice.mids,

        highs:
          this.voice.highs,

        peak:
          this.voice.peak,

        detected:
          this.voice.detected,

        energy:
          this.voice.energy,

        noiseFloor:
          this.voice.noiseFloor,

        frequencyData:
          this.voice.frequencyData
      },

      neonIntensity:
        this.getControlValue(
          this.elements
            .neonIntensity,
          1.6
        ),

      particleIntensity:
        this.getControlValue(
          this.elements
            .particleIntensity,
          1.3
        )
    };
  },

  resetAnalysisValues() {
    for (
      const target of [
        this.music,
        this.voice
      ]
    ) {
      target.rawLevel = 0;
      target.level = 0;
      target.bass = 0;
      target.mids = 0;
      target.highs = 0;
      target.peak = 0;
    }

    this.music.beat = 0;

    this.voice.energy = 0;
    this.voice.detected = false;
  },

  setStatus(message) {
    if (
      this.elements.statusText
    ) {
      this.elements.statusText
        .textContent =
        message;
    }
  }
};

window.SoulAudio =
  SoulAudio;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    SoulAudio.init();
  }
);
