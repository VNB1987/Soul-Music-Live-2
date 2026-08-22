"use strict";

/*
  DJ SOUL — FAZA 1 — YOUTUBE PLAYLIST BRIDGE

  Citește catalogul Soul Music prin serverul local. Cheia YouTube API
  nu ajunge niciodată în browser și nu este stocată în repository.
*/

const DJSoulYouTube = {
  version: "1.0.0-phase1",
  ready: false,
  configured: false,
  loading: false,
  playlistId: null,
  items: [],
  error: null,
  refreshTimer: null,

  async init(options = {}) {
    if (this.loading) {
      return this.getState();
    }

    this.loading = true;
    this.error = null;

    try {
      const status = await this.request(
        "/api/dj-soul/status"
      );

      this.configured =
        Boolean(status.configured);
      this.playlistId =
        status.playlistId || null;

      if (!this.configured) {
        this.ready = false;
        this.publishStatus(
          "DJ Soul: rulează configure-dj-soul.bat",
          "waiting"
        );
        return this.getState();
      }

      await this.refresh();

      const interval =
        Number(options.refreshInterval) ||
        300000;

      this.startAutoRefresh(interval);
    } catch (error) {
      this.captureError(error);
    } finally {
      this.loading = false;
    }

    return this.getState();
  },

  async refresh() {
    const catalog = await this.request(
      "/api/dj-soul/playlist"
    );

    this.items = Array.isArray(catalog.items)
      ? catalog.items
      : [];
    this.playlistId =
      catalog.playlistId ||
      this.playlistId;
    this.ready = true;
    this.error = null;

    this.publishStatus(
      `DJ Soul: YouTube conectat • ${this.items.length} melodii`,
      "ready"
    );

    this.emit(
      "djsoul:youtubeplaylistready",
      this.getState()
    );

    return this.getState();
  },

  startAutoRefresh(interval = 300000) {
    this.stopAutoRefresh();

    this.refreshTimer = window.setInterval(
      () => {
        this.refresh().catch(
          (error) => this.captureError(error)
        );
      },
      Math.max(60000, interval)
    );
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      window.clearInterval(
        this.refreshTimer
      );
      this.refreshTimer = null;
    }
  },

  findByVideoId(videoId) {
    return this.items.find(
      (item) => item.videoId === videoId
    ) || null;
  },

  findByTitle(query) {
    const needle = String(query || "")
      .trim()
      .toLocaleLowerCase("ro-RO");

    if (!needle) {
      return [];
    }

    return this.items.filter(
      (item) => String(item.title || "")
        .toLocaleLowerCase("ro-RO")
        .includes(needle)
    );
  },

  getState() {
    return {
      version: this.version,
      ready: this.ready,
      configured: this.configured,
      loading: this.loading,
      playlistId: this.playlistId,
      count: this.items.length,
      items: [...this.items],
      error: this.error
    };
  },

  async request(path) {
    const response = await window.fetch(
      `${path}?t=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(
        "Răspuns invalid de la serverul DJ Soul"
      );
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ||
        `Eroare YouTube ${response.status}`
      );
    }

    return payload;
  },

  captureError(error) {
    this.ready = false;
    this.error =
      error?.message ||
      String(error);

    this.publishStatus(
      `DJ Soul: ${this.error}`,
      "error"
    );

    this.emit(
      "djsoul:youtubeerror",
      this.getState()
    );
  },

  publishStatus(message, state) {
    const element =
      document.getElementById(
        "djSoulYouTubeStatus"
      );

    if (element) {
      element.textContent = message;
      element.dataset.state = state;
    }

    document.body.dataset.djSoulYoutube =
      state;
  },

  emit(name, detail) {
    window.dispatchEvent(
      new window.CustomEvent(
        name,
        { detail }
      )
    );
  }
};

window.DJSoulYouTube =
  DJSoulYouTube;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    DJSoulYouTube.init();
  }
);

if (
  typeof module !== "undefined" &&
  module.exports
) {
  module.exports = DJSoulYouTube;
}

