"use strict";

/*
  DJ SOUL — ENGINE X CONTROL
  Browser client pentru bridge-ul local de pe 127.0.0.1:8767.

  Ce face:
  - afișează status ONLINE / OFFLINE / READY;
  - afișează chat TikTok, follow, gifts, praguri și răspunsurile Soul;
  - permite comenzi private direct către DJ Soul, fără cuvântul SOUL;
  - permite restartarea procesului DJ Soul;
  - nu modifică logica existentă din index.js.
*/

const SoulDjPanel = {
  version: "1.0.0",
  baseUrl: "http://127.0.0.1:8767",
  eventSource: null,
  statusTimer: null,
  rows: [],
  maxRows: 120,
  elements: {},

  init() {
    if (document.getElementById("djSoulControl")) {
      return;
    }

    this.injectStyles();
    this.mount();
    this.bind();
    this.connectEvents();
    this.refreshStatus();

    this.statusTimer = window.setInterval(
      () => this.refreshStatus(),
      3000
    );
  },

  injectStyles() {
    const style = document.createElement("style");
    style.id = "djSoulControlStyles";
    style.textContent = `
      #djSoulControl {
        margin-top: 14px;
        padding: 12px;
        border: 1px solid rgba(40, 232, 255, 0.24);
        border-radius: 14px;
        background: rgba(2, 4, 12, 0.92);
        box-shadow: inset 0 0 18px rgba(40, 232, 255, 0.05);
      }

      #djSoulControl .dj-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 9px;
      }

      #djSoulControl .dj-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
      }

      #djSoulControl .dj-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #777;
        box-shadow: 0 0 10px rgba(255,255,255,0.18);
      }

      #djSoulControl[data-state="ready"] .dj-dot {
        background: #4cff8f;
        box-shadow: 0 0 13px rgba(76,255,143,0.8);
      }

      #djSoulControl[data-state="online"] .dj-dot {
        background: #ffd96a;
        box-shadow: 0 0 13px rgba(255,217,106,0.72);
      }

      #djSoulControl[data-state="offline"] .dj-dot {
        background: #ff294f;
        box-shadow: 0 0 13px rgba(255,41,79,0.72);
      }

      #djSoulStatus {
        font-size: 10px;
        color: rgba(255,255,255,0.72);
        white-space: nowrap;
      }

      #djSoulLog {
        height: 190px;
        overflow-y: auto;
        padding: 8px;
        border-radius: 10px;
        background: rgba(0,0,0,0.42);
        border: 1px solid rgba(255,255,255,0.06);
        font-family: Consolas, "Courier New", monospace;
        font-size: 10px;
        line-height: 1.38;
        scrollbar-width: thin;
      }

      #djSoulLog .dj-row {
        padding: 3px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.035);
        overflow-wrap: anywhere;
      }

      #djSoulLog .dj-chat { color: #fff; }
      #djSoulLog .dj-follow { color: #4cff8f; }
      #djSoulLog .dj-gift,
      #djSoulLog .dj-coins,
      #djSoulLog .dj-threshold { color: #ffd96a; }
      #djSoulLog .dj-wake { color: #28e8ff; }
      #djSoulLog .dj-soul { color: #ff8ee6; font-weight: 700; }
      #djSoulLog .dj-special { color: #c8a1ff; }
      #djSoulLog .dj-error,
      #djSoulLog .dj-offline { color: #ff6b82; }
      #djSoulLog .dj-operator { color: #8bc7ff; }
      #djSoulLog .dj-ready { color: #4cff8f; font-weight: 700; }
      #djSoulLog .dj-log { color: rgba(255,255,255,0.55); }

      #djSoulForm {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 7px;
        margin-top: 9px;
      }

      #djSoulInput {
        min-width: 0;
        border: 1px solid rgba(40,232,255,0.25);
        border-radius: 9px;
        padding: 9px 10px;
        color: #fff;
        outline: none;
        background: rgba(5,7,18,0.95);
      }

      #djSoulInput:focus {
        border-color: rgba(40,232,255,0.7);
        box-shadow: 0 0 0 2px rgba(40,232,255,0.08);
      }

      #djSoulSend,
      #djSoulRestart {
        border-radius: 9px;
        padding: 8px 10px;
        color: #fff;
        background: linear-gradient(180deg, rgba(43,143,255,0.72), rgba(44,58,110,0.86));
        border: 1px solid rgba(40,232,255,0.22);
      }

      #djSoulRestart {
        padding: 6px 8px;
        font-size: 10px;
        background: rgba(255,255,255,0.07);
      }

      #djSoulHint {
        margin-top: 7px;
        color: rgba(255,255,255,0.5);
        font-size: 9px;
      }
    `;
    document.head.appendChild(style);
  },

  mount() {
    const panel = document.getElementById("controlPanel") || document.body;
    const root = document.createElement("section");
    root.id = "djSoulControl";
    root.dataset.state = "offline";
    root.innerHTML = `
      <div class="dj-head">
        <div class="dj-title">
          <span class="dj-dot" aria-hidden="true"></span>
          <span>DJ SOUL</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px;">
          <span id="djSoulStatus">OFFLINE</span>
          <button id="djSoulRestart" type="button">Restart</button>
        </div>
      </div>

      <div id="djSoulLog" aria-live="polite"></div>

      <form id="djSoulForm">
        <input
          id="djSoulInput"
          type="text"
          autocomplete="off"
          placeholder="Scrie direct către DJ Soul..."
          aria-label="Comandă privată DJ Soul"
        >
        <button id="djSoulSend" type="submit">Trimite</button>
      </form>

      <div id="djSoulHint">
        CMD privat: scrii normal • TikTok: spectatorii folosesc SOUL • Follow/Gift: automat
      </div>
    `;

    const statusArea = document.getElementById("statusArea");
    if (statusArea?.parentNode === panel) {
      panel.insertBefore(root, statusArea);
    } else {
      panel.appendChild(root);
    }

    this.elements.root = root;
    this.elements.status = document.getElementById("djSoulStatus");
    this.elements.log = document.getElementById("djSoulLog");
    this.elements.form = document.getElementById("djSoulForm");
    this.elements.input = document.getElementById("djSoulInput");
    this.elements.restart = document.getElementById("djSoulRestart");
  },

  bind() {
    this.elements.form?.addEventListener("submit", event => {
      event.preventDefault();
      this.sendCurrentCommand();
    });

    this.elements.input?.addEventListener("keydown", event => {
      event.stopPropagation();
    });

    this.elements.input?.addEventListener("keyup", event => {
      event.stopPropagation();
    });

    this.elements.restart?.addEventListener("click", event => {
      event.stopPropagation();
      this.restart();
    });
  },

  async refreshStatus() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dj-soul/status`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("bridge offline");
      const state = await response.json();
      this.applyStatus(state);
    } catch {
      this.applyStatus({ online: false, ready: false, bridge: false });
    }
  },

  applyStatus(state = {}) {
    const root = this.elements.root;
    if (!root) return;

    const visualState = state.ready
      ? "ready"
      : state.online
        ? "online"
        : "offline";

    root.dataset.state = visualState;

    if (this.elements.status) {
      this.elements.status.textContent = state.ready
        ? "READY"
        : state.online
          ? "PORNIT"
          : "OFFLINE";

      if (state.pid) {
        this.elements.status.title = `PID ${state.pid}\n${state.indexPath || ""}`;
      }
    }
  },

  connectEvents() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const source = new EventSource(
      `${this.baseUrl}/api/dj-soul/events`
    );
    this.eventSource = source;

    source.addEventListener("status", event => {
      try {
        this.applyStatus(JSON.parse(event.data));
      } catch {
      }
    });

    source.onmessage = event => {
      try {
        const item = JSON.parse(event.data);
        this.addEvent(item);
        if (["ready", "offline", "process"].includes(item.type)) {
          this.refreshStatus();
        }
      } catch {
      }
    };

    source.onerror = () => {
      this.applyStatus({ online: false, ready: false, bridge: false });
    };
  },

  formatEvent(item) {
    switch (item.type) {
      case "chat":
        return `CHAT • ${item.name}: ${item.message}`;
      case "follow":
        return `FOLLOW • ${item.name}`;
      case "gift":
        return `GIFT • ${item.name} • ${item.gift} • ${item.details || ""}`;
      case "coins":
        return `MONEDE • ${item.name}: ${item.coins}`;
      case "threshold":
        return `PRAG ATINS • ${item.threshold}`;
      case "wake":
        return `SOUL TREZIT • ${item.name}`;
      case "soul":
        return `DJ SOUL: ${item.message}`;
      case "special":
        return `SPECIAL • ${item.name}`;
      case "operator":
        return item.line || `TU: ${item.message || ""}`;
      default:
        return item.line || item.type || "event";
    }
  },

  addEvent(item = {}) {
    if (!item || !this.elements.log) return;

    const important = new Set([
      "chat",
      "follow",
      "gift",
      "coins",
      "threshold",
      "wake",
      "soul",
      "special",
      "operator",
      "ready",
      "offline",
      "error",
      "process"
    ]);

    if (!important.has(item.type)) return;

    const row = document.createElement("div");
    row.className = `dj-row dj-${item.type || "log"}`;
    row.textContent = this.formatEvent(item);
    this.elements.log.appendChild(row);
    this.rows.push(row);

    while (this.rows.length > this.maxRows) {
      const first = this.rows.shift();
      first?.remove();
    }

    this.elements.log.scrollTop = this.elements.log.scrollHeight;
  },

  async sendCurrentCommand() {
    const command = String(this.elements.input?.value || "").trim();
    if (!command) return;

    if (this.elements.input) {
      this.elements.input.value = "";
      this.elements.input.focus();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/dj-soul/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command })
        }
      );

      if (!response.ok) {
        throw new Error("DJ Soul nu este pornit");
      }
    } catch (error) {
      this.addEvent({
        type: "error",
        line: `Comanda nu a fost trimisă: ${error.message}`
      });
    }
  },

  async restart() {
    this.addEvent({ type: "log", line: "Restart DJ Soul..." });
    try {
      await fetch(
        `${this.baseUrl}/api/dj-soul/restart`,
        { method: "POST" }
      );
      window.setTimeout(() => this.refreshStatus(), 1200);
    } catch {
      this.addEvent({ type: "error", line: "Bridge DJ Soul nu răspunde." });
    }
  }
};

window.SoulDjPanel = SoulDjPanel;

window.addEventListener("DOMContentLoaded", () => {
  SoulDjPanel.init();
});
