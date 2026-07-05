import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

const VISUAL_QA_CASES = [
  { id: "marketing-light", surface: "marketing", theme: "light", path: "/zh", expectedText: "把复杂任务" },
  { id: "marketing-dark", surface: "marketing", theme: "dark", path: "/zh", expectedText: "把复杂任务" },
  { id: "auth-light", surface: "auth", theme: "light", path: "/login", expectedText: "登录" },
  { id: "auth-dark", surface: "auth", theme: "dark", path: "/login", expectedText: "登录" },
  { id: "workbench-light", surface: "workbench", theme: "light", path: "/app", expectedText: "开始工作" },
  { id: "workbench-dark", surface: "workbench", theme: "dark", path: "/app", expectedText: "开始工作" },
];

const VISUAL_QA_ASSET_CHECKS = [
  { label: "browser icon", path: "/icon.svg", contentType: "image/svg+xml" },
  { label: "web manifest", path: "/manifest.webmanifest", contentType: "application/manifest+json" },
  { label: "app icon", path: "/ash-icon.svg", contentType: "image/svg+xml" },
  { label: "maskable app icon", path: "/ash-maskable-icon.svg", contentType: "image/svg+xml" },
];

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/google-chrome",
  "/opt/google/chrome/chrome",
].filter(Boolean);

function findChrome() {
  const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error("Could not find Chrome. Set CHROME_BIN to run visual QA.");
  }
  return chrome;
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForUrl(url, timeoutMs = 30000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

async function startMockPraxis() {
  const port = await freePort();
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    response.setHeader("content-type", "application/json");

    if (request.method === "GET" && url.pathname === "/v1/tasks") {
      response.end(JSON.stringify({ items: [], next_cursor: null }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/skills") {
      response.end(JSON.stringify({ items: [], next_cursor: null }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ code: "not_found", message: "visual QA mock endpoint not found" }));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function startNextIfNeeded({ praxisBaseUrl } = {}) {
  if (process.env.VISUAL_QA_BASE_URL) {
    return { baseUrl: process.env.VISUAL_QA_BASE_URL, stop: async () => {} };
  }

  if (!existsSync(path.join(appRoot, ".next/BUILD_ID"))) {
    throw new Error("Missing apps/web/.next/BUILD_ID. Run pnpm --filter @ash/web build before visual QA.");
  }

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const nodeDir = path.dirname(process.execPath);
  const child = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: appRoot,
    env: { ...process.env, PATH: `${nodeDir}:${process.env.PATH}`, PRAXIS_BASE_URL: praxisBaseUrl ?? process.env.PRAXIS_BASE_URL },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.once("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      logs.push(`next start exited with ${code}`);
    }
    if (signal) logs.push(`next start killed by ${signal}`);
  });

  try {
    await waitForUrl(`${baseUrl}/zh`);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error.message}\n${logs.join("")}`);
  }

  return {
    baseUrl,
    stop: async () => {
      if (!child.killed) child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
}

async function launchChrome() {
  const port = await freePort();
  const userDataDir = path.join("/tmp", `ash-visual-qa-${process.pid}-${Date.now()}`);
  await mkdir(userDataDir, { recursive: true });

  const child = spawn(findChrome(), [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  const logs = [];
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  try {
    await waitForUrl(`http://127.0.0.1:${port}/json/version`);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error.message}\n${logs.join("")}`);
  }

  return {
    port,
    stop: async () => {
      if (!child.killed) child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
      await rm(userDataDir, { recursive: true, force: true });
    },
  };
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
        } else {
          resolve(message.result ?? {});
        }
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function openPage(chromePort) {
  const response = await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Chrome target creation failed: ${response.status} ${await response.text()}`);
  }
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  return { client, targetId: target.id };
}

async function closePage(chromePort, page) {
  page.client.close();
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${page.targetId}`).catch(() => {});
}

function authShim(theme) {
  return `
    localStorage.setItem("ash-theme", ${JSON.stringify(theme)});
    document.cookie = "ash_locale=zh; path=/";
    document.cookie = "ash_refresh_token=visual-qa; path=/";
    document.cookie = "ash_access_token=visual-qa; path=/";
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input && "url" in input ? input.url : String(input);
      if (url.includes("/api/auth/me")) {
        return new Response(JSON.stringify({ user: { id: "visual-qa", email: "visual@example.com", display_name: "Visual QA", role: "user" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/auth/refresh")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/praxis/v1/skills")) {
        return new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };
  `;
}

async function captureCase({ baseUrl, chromePort, outDir, item }) {
  const page = await openPage(chromePort);
  const url = new URL(item.path, baseUrl).toString();
  const screenshotPath = path.join(outDir, `${item.id}.png`);

  try {
    await page.client.send("Page.enable");
    await page.client.send("Runtime.enable");
    await page.client.send("Network.enable");
    await page.client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.client.send("Network.setCookie", {
      name: "ash_refresh_token",
      value: "visual-qa",
      url: baseUrl,
      path: "/",
    });
    await page.client.send("Network.setCookie", {
      name: "ash_locale",
      value: "zh",
      url: baseUrl,
      path: "/",
    });
    await page.client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: authShim(item.theme),
    });

    await page.client.send("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await page.client.send("Runtime.evaluate", {
      expression: "document.fonts && document.fonts.ready",
      awaitPromise: true,
    }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 300));

    const state = await page.client.send("Runtime.evaluate", {
      expression: `({
        title: document.title,
        url: location.href,
        dark: document.documentElement.classList.contains("dark"),
        bodyText: document.body.innerText.slice(0, 500),
        width: innerWidth,
        height: innerHeight
      })`,
      returnByValue: true,
    });

    const pageState = state.result.value;
    if (pageState.bodyText.includes("This page couldn") || pageState.bodyText.includes("server error")) {
      throw new Error(`${item.id} rendered an error page: ${pageState.bodyText}`);
    }
    if (item.expectedText && !pageState.bodyText.includes(item.expectedText)) {
      throw new Error(`${item.id} did not render expected text ${JSON.stringify(item.expectedText)}.`);
    }
    if (item.theme === "dark" && !pageState.dark) {
      throw new Error(`${item.id} did not apply the dark theme.`);
    }
    if (item.theme === "light" && pageState.dark) {
      throw new Error(`${item.id} unexpectedly applied the dark theme.`);
    }

    const screenshot = await page.client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

    return {
      ...item,
      url,
      screenshot: path.relative(repoRoot, screenshotPath),
      bytes: Buffer.byteLength(screenshot.data, "base64"),
      page: pageState,
    };
  } finally {
    await closePage(chromePort, page);
  }
}

async function checkAssets(baseUrl) {
  const results = [];
  for (const asset of VISUAL_QA_ASSET_CHECKS) {
    const response = await fetch(new URL(asset.path, baseUrl));
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    results.push({
      ...asset,
      status: response.status,
      ok: response.ok && contentType.includes(asset.contentType),
      contentType,
      bytes: Buffer.byteLength(body),
    });
  }
  return results;
}

async function runVisualQa() {
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(repoRoot, "docs/visual-qa/artifacts", date);
  await mkdir(outDir, { recursive: true });

  const mockPraxis = process.env.VISUAL_QA_BASE_URL ? { stop: async () => {} } : await startMockPraxis();
  const next = await startNextIfNeeded({ praxisBaseUrl: mockPraxis.baseUrl });
  const chrome = await launchChrome();
  try {
    const screenshots = [];
    for (const item of VISUAL_QA_CASES) {
      screenshots.push(await captureCase({
        baseUrl: next.baseUrl,
        chromePort: chrome.port,
        outDir,
        item,
      }));
    }
    const assets = await checkAssets(next.baseUrl);
    const result = {
      generatedAt: new Date().toISOString(),
      baseUrl: next.baseUrl,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      screenshots,
      assets,
    };
    const resultPath = path.join(outDir, "visual-qa-results.json");
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

    for (const shot of screenshots) {
      console.log(`screenshot ${shot.id} -> ${shot.screenshot} (${shot.bytes} bytes)`);
    }
    for (const asset of assets) {
      console.log(`${asset.ok ? "PASS" : "FAIL"} ${asset.label} ${asset.path} ${asset.status} ${asset.contentType}`);
    }
    console.log(`results ${path.relative(repoRoot, resultPath)}`);

    if (assets.some((asset) => !asset.ok)) {
      throw new Error("One or more asset checks failed.");
    }
    return result;
  } finally {
    await chrome.stop();
    await next.stop();
    await mockPraxis.stop();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runVisualQa();
}

export { VISUAL_QA_ASSET_CHECKS, VISUAL_QA_CASES, runVisualQa };
