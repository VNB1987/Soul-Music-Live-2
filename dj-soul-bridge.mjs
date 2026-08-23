import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = "127.0.0.1";
const PORT = Number(process.env.DJ_SOUL_BRIDGE_PORT || 8767);
const MAX_EVENTS = 300;

let child = null;
let currentIndexPath = null;
let startedAt = null;
let ready = false;
let lastLine = "";
let seq = 0;
const clients = new Set();
const backlog = [];

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function looksLikeDjSoulIndex(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const text = safeRead(filePath);
  return (
    text.includes("tiktok-live-connector") &&
    text.includes("TIKTOK_USERNAME") &&
    text.includes("readline.createInterface")
  );
}

function normalizeConfiguredPath(value) {
  const raw = String(value || "").trim().replace(/^"|"$/g, "");
  if (!raw) return null;
  const resolved = path.resolve(raw);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, "index.js");
  }
  return resolved;
}

function scanForDjSoul(root, maxDepth = 4) {
  if (!root || !fs.existsSync(root)) return null;
  const skip = new Set(["node_modules", ".git", ".next", "dist", "build", "AppData"]);

  function walk(dir, depth) {
    if (depth > maxDepth) return null;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    const directIndex = path.join(dir, "index.js");
    if (looksLikeDjSoulIndex(directIndex)) return directIndex;

    for (const entry of entries) {
      if (!entry.isDirectory() || skip.has(entry.name)) continue;
      const lower = entry.name.toLowerCase();
      if (depth === 0 && !lower.includes("soul") && !lower.includes("dj")) {
        continue;
      }
      const found = walk(path.join(dir, entry.name), depth + 1);
      if (found) return found;
    }
    return null;
  }

  return walk(root, 0);
}

function discoverDjSoulIndex() {
  const configured = normalizeConfiguredPath(process.env.DJ_SOUL_INDEX);
  if (configured && looksLikeDjSoulIndex(configured)) return configured;

  const configFile = path.join(__dirname, "dj-soul-path.txt");
  if (fs.existsSync(configFile)) {
    const fromFile = normalizeConfiguredPath(safeRead(configFile));
    if (fromFile && looksLikeDjSoulIndex(fromFile)) return fromFile;
  }

  const candidates = [
    path.resolve(__dirname, "..", "dj-soul-live", "index.js"),
    path.resolve(__dirname, "..", "dj-soul", "index.js"),
    path.resolve(__dirname, "..", "DJ Soul", "index.js"),
    path.resolve(__dirname, "..", "Soul DJ", "index.js")
  ];

  for (const candidate of candidates) {
    if (looksLikeDjSoulIndex(candidate)) return candidate;
  }

  const roots = [
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "..", ".."),
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents")
  ];

  for (const root of roots) {
    const found = scanForDjSoul(root, 4);
    if (found) return found;
  }

  return null;
}

function classifyLine(line, stream = "stdout") {
  const value = String(line || "").trimEnd();
  const event = {
    id: ++seq,
    time: new Date().toISOString(),
    type: stream === "stderr" ? "error" : "log",
    line: value
  };

  let match = value.match(/^📥 CHAT \| ([^:]+):\s*(.*)$/u);
  if (match) return { ...event, type: "chat", name: match[1].trim(), message: match[2].trim() };

  match = value.match(/^➕ FOLLOW DETECTAT \|\s*(.+)$/u);
  if (match) return { ...event, type: "follow", name: match[1].trim() };

  match = value.match(/^🎁 CADOU \|\s*([^|]+)\|\s*([^|]+)\|\s*(.*)$/u);
  if (match) {
    return {
      ...event,
      type: "gift",
      name: match[1].trim(),
      gift: match[2].trim(),
      details: match[3].trim()
    };
  }

  match = value.match(/^🪙 TOTAL\s+([^:]+):\s*(\d+)/u);
  if (match) return { ...event, type: "coins", name: match[1].trim(), coins: Number(match[2]) };

  match = value.match(/^🎯 PRAG(?: MONEDE)? ATINS:\s*(\d+)/u);
  if (match) return { ...event, type: "threshold", threshold: Number(match[1]) };

  match = value.match(/^🟢 SOUL TREZIT DIN TIKTOK DE\s+(.+)$/u);
  if (match) return { ...event, type: "wake", name: match[1].trim() };

  match = value.match(/^🎧 DJ SOUL:\s*(.*)$/u);
  if (match) return { ...event, type: "soul", message: match[1].trim() };

  match = value.match(/^⭐ PERSOANĂ SPECIALĂ:\s*(.*)$/u);
  if (match) return { ...event, type: "special", name: match[1].trim() };

  if (value.includes("✅ GATA.")) {
    ready = true;
    event.type = "ready";
  }

  return event;
}

function pushEvent(event) {
  lastLine = event.line || lastLine;
  backlog.push(event);
  if (backlog.length > MAX_EVENTS) backlog.splice(0, backlog.length - MAX_EVENTS);

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const response of clients) {
    try {
      response.write(payload);
    } catch {
      clients.delete(response);
    }
  }
}

function pipeLines(stream, streamName) {
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      console.log(line);
      pushEvent(classifyLine(line, streamName));
    }
  });
  stream.on("end", () => {
    if (buffer) {
      console.log(buffer);
      pushEvent(classifyLine(buffer, streamName));
    }
  });
}

function startDjSoul() {
  if (child && !child.killed) return true;

  ready = false;
  currentIndexPath = discoverDjSoulIndex();

  if (!currentIndexPath) {
    const message = "DJ Soul index.js nu a fost găsit. Setează DJ_SOUL_INDEX sau creează dj-soul-path.txt.";
    console.error(message);
    pushEvent(classifyLine(`❌ ${message}`, "stderr"));
    return false;
  }

  console.log(`🎧 DJ Soul găsit: ${currentIndexPath}`);
  child = spawn(process.execPath, [currentIndexPath], {
    cwd: path.dirname(currentIndexPath),
    env: process.env,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });

  startedAt = new Date().toISOString();
  pushEvent({
    id: ++seq,
    time: startedAt,
    type: "process",
    line: `DJ Soul pornit • PID ${child.pid}`,
    pid: child.pid,
    path: currentIndexPath
  });

  pipeLines(child.stdout, "stdout");
  pipeLines(child.stderr, "stderr");

  child.on("exit", (code, signal) => {
    ready = false;
    const oldPid = child?.pid || null;
    child = null;
    pushEvent({
      id: ++seq,
      time: new Date().toISOString(),
      type: "offline",
      line: `DJ Soul oprit • cod ${code ?? "-"} • semnal ${signal ?? "-"}`,
      pid: oldPid
    });
  });

  child.on("error", error => {
    pushEvent(classifyLine(`DJ Soul process error: ${error.message}`, "stderr"));
  });

  return true;
}

function stopDjSoul() {
  if (!child) return;
  try {
    child.kill();
  } catch {
  }
}

function restartDjSoul() {
  stopDjSoul();
  setTimeout(() => startDjSoul(), 600);
}

function sendCommand(command) {
  const text = String(command || "").trim();
  if (!text || !child?.stdin?.writable) return false;
  child.stdin.write(`${text}\n`);
  pushEvent({
    id: ++seq,
    time: new Date().toISOString(),
    type: "operator",
    line: `🎛️ TU: ${text}`,
    message: text
  });
  return true;
}

function status() {
  return {
    bridge: true,
    online: Boolean(child && !child.killed),
    ready,
    pid: child?.pid || null,
    indexPath: currentIndexPath,
    startedAt,
    lastLine,
    port: PORT
  };
}

function json(response, code, body) {
  const data = Buffer.from(JSON.stringify(body));
  response.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": data.length,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(data);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 65536) reject(new Error("Body prea mare"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dj-soul/status") {
    json(response, 200, status());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dj-soul/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    response.write(`event: status\ndata: ${JSON.stringify(status())}\n\n`);
    for (const event of backlog.slice(-120)) {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dj-soul/command") {
    try {
      const body = JSON.parse((await readBody(request)) || "{}");
      const ok = sendCommand(body.command);
      json(response, ok ? 200 : 409, { ok, status: status() });
    } catch (error) {
      json(response, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dj-soul/restart") {
    restartDjSoul();
    json(response, 202, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dj-soul/start") {
    const ok = startDjSoul();
    json(response, ok ? 200 : 404, { ok, status: status() });
    return;
  }

  json(response, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("===============================================");
  console.log(" DJ SOUL • ENGINE X BRIDGE");
  console.log("===============================================");
  console.log(`Bridge: http://${HOST}:${PORT}`);
  console.log("CMD rămâne vizibil aici pentru chat și diagnostic.");
  console.log("");
  startDjSoul();
});

process.on("SIGINT", () => {
  stopDjSoul();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  stopDjSoul();
  server.close(() => process.exit(0));
});
