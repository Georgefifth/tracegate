// Real-browser QA runner for TraceGate (based on playwright-qa skill template.mjs)
// Run:
//   BASE_URL=https://georgefifth.github.io/tracegate/ node qa/run.mjs
//   BASE_URL=http://127.0.0.1:4389/ node qa/run.mjs

import { chromium, firefox } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4389/";
const OUT = process.env.QA_OUT ?? "evidence/stage-3-qa";
const BROWSER = process.env.BROWSER === "chromium" ? "chromium" : "firefox";
const HEADED = process.env.HEADED === "1";

const SHOTS = path.join(OUT, "screens");
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
];

const scenarios = [
  {
    id: "S1-first-visit-and-empty",
    title: "First visit, clinical disclaimer, responsive overflow check, and actionable empty state recovery",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });
      await ctx.expectVisible("body");
      ctx.assert((await page.title()).includes("TraceGate"), "Title does not include TraceGate");
      await ctx.expectText(/Not a cleared medical device/i);
      await ctx.expectText(/GATE PASSED/i);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      ctx.assert(overflow <= 1, `horizontal overflow: ${overflow}px`);
      await ctx.shot("landing");

      // Trigger Empty State and recover via primary CTA
      await page.getByRole("button", { name: "Empty State" }).click();
      await ctx.expectText(/No Paper ECG Strip Loaded in Registration Viewport/i);
      await ctx.shot("empty-state");

      await page.getByRole("button", { name: /Load Default PTB-XL #00184 Strip/i }).click();
      await ctx.expectText(/Sub-Millimeter Paper-to-Waveform Registration Viewport/i);
      await ctx.expectText(/72\.3 BPM/);
    },
  },
  {
    id: "S2-core-digitization-e2e",
    title: "Core task end-to-end: Select skewed strip, compare algorithms, run calibrated digitization, and export CSV",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      // Step 1: Select Tier 2 Rotated & Perspective Skew (+4.2°) strip
      await page.getByRole("button", { name: /PTB-XL #01492/i }).click();
      await ctx.expectText(/\+4\.2°/);
      await ctx.expectText(/11\.4 px\/mm/);

      // Step 2: Switch extraction pipeline to Naive Column-Argmax and verify telemetry changes
      const select = page.getByLabel(/Extraction Pipeline/i);
      await select.selectOption("column_argmax");
      await ctx.expectVisible('.caliper-readout-strip:has-text("8.75 dB")');

      // Switch back to Viterbi DP Tracker
      await select.selectOption("viterbi_dp");
      await ctx.expectVisible('.caliper-readout-strip:has-text("27.7 dB")');

      // Toggle overlay buttons
      await page.getByRole("button", { name: /Deskew: ON/i }).click();
      await ctx.expectText(/Raw Skew/i);
      await page.getByRole("button", { name: /Deskew: OFF/i }).click();
      await ctx.expectText(/Auto-Deskew ON/i);

      // Step 3: Run Calibrated Digitization
      await page.getByRole("button", { name: /Run Calibrated Digitization/i }).click();
      await ctx.expectText(/GATE PASSED/i);
      await ctx.shot("digitized-tier2");

      // Step 4: Export Calibrated CSV
      await page.getByRole("button", { name: /Export Calibrated CSV/i }).click();
      await ctx.expectText(/Export Complete: Exported 625 calibrated samples/i);
      await ctx.shot("csv-exported");
    },
  },
  {
    id: "S3-safety-gate-withheld",
    title: "Clinical safety gate: Severe lead collision & crease (Tier 5) withholds QRS/QT/QTc intervals",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      await page.getByRole("button", { name: /PTB-XL #09204/i }).click();
      await ctx.expectText(/INTERVALS WITHHELD/i);
      await ctx.expectText(/41 \/ 100/);
      await ctx.expectText(/Severe adjacent-lead QRS collision/i);

      const withheldCount = await page.getByText("WITHHELD", { exact: true }).count();
      ctx.assert(withheldCount >= 6, `Expected 6 WITHHELD interval readouts, found ${withheldCount}`);
      await ctx.shot("withheld-gate");
    },
  },
  {
    id: "S4-invalid-input-and-recovery",
    title: "Invalid calibration scale validation & one-click recovery",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      const speedInput = page.getByLabel(/Paper Speed \(mm\/s\)/i);
      await speedInput.fill("-15");
      await page.getByRole("button", { name: /Run Calibrated Digitization/i }).click();

      await ctx.expectText(/Calibration Input Validation Error/i);
      await ctx.expectText(/Paper speed must be between 5 and 100 mm\/s/i);
      await ctx.shot("invalid-input");

      // Recover via Reset button
      await page.getByRole("button", { name: /Reset to Standard Scale/i }).click();
      ctx.assert((await speedInput.inputValue()) === "25", "Paper speed was not reset to 25");
      await ctx.expectText(/GATE PASSED/i);
    },
  },
  {
    id: "S5-custom-image-upload",
    title: "Custom paper ECG image upload (PNG) & real 2D pixel matrix digitization",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      // Generate a real paper ECG PNG from canvas in the browser and upload it via setInputFiles
      const base64Png = await page.evaluate(() => {
        const c = document.querySelector("canvas");
        return c ? c.toDataURL("image/png").split(",")[1] : "";
      });
      ctx.assert(base64Png.length > 100, "Failed to extract test PNG from canvas");

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "referral_strip_scan.png",
        mimeType: "image/png",
        buffer: Buffer.from(base64Png, "base64"),
      });

      await ctx.expectText(/USER-SCAN-01/i);
      await ctx.expectText(/Uploaded Scan \(referral_strip_scan\.png\)/i);
      await ctx.shot("custom-upload");
    },
  },
  {
    id: "S6-benchmark-and-methodology-nav",
    title: "Navigation across Held-Out Benchmark (120 strips) & Methodology views + reload check",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      // Switch to Held-Out Benchmark view
      await page.getByRole("button", { name: /2\. Held-Out Benchmark/i }).click();
      await ctx.expectText(/PhysioNet PTB-XL & MIT-BIH Held-Out Paper-ECG Benchmark/i);
      await ctx.expectText(/18\.16 dB/);
      await ctx.expectText(/37\.1 µV/);
      await ctx.shot("benchmark-view");

      // Switch to Methodology & Safety view and run self-check
      await page.getByRole("button", { name: /3\. Methodology & Safety/i }).click();
      await ctx.expectText(/Who Benefits, and Who Could Be Harmed/i);
      await page.getByRole("button", { name: /Run Deterministic Pipeline Self-Check/i }).click();
      await ctx.expectText(/Self-Check PASSED: Deterministic Viterbi DP reconstruction verified/i);
      await ctx.shot("methodology-view");

      // Reload page and confirm clean recovery
      await page.reload({ waitUntil: "networkidle" });
      await ctx.expectText(/Sub-Millimeter Paper-to-Waveform Registration Viewport/i);
    },
  },
  {
    id: "S7-keyboard-and-a11y",
    title: "Keyboard navigation, focus visibility, labeled controls, and canvas accessibility",
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: "networkidle" });

      // Press Tab multiple times and verify focus moves to interactive elements
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      ctx.assert(
        ["BUTTON", "INPUT", "SELECT", "A"].includes(activeTag ?? ""),
        `Expected focus on interactive element, got ${activeTag}`,
      );

      // Verify all images have non-empty alt attributes and canvases have aria-labels
      const a11yAudit = await page.evaluate(() => {
        const imgsMissingAlt = Array.from(document.querySelectorAll("img")).filter(
          (img) => !img.getAttribute("alt")?.trim(),
        ).length;
        const canvasesMissingLabel = Array.from(document.querySelectorAll("canvas")).filter(
          (c) => !c.getAttribute("aria-label")?.trim(),
        ).length;
        return { imgsMissingAlt, canvasesMissingLabel };
      });
      ctx.assert(a11yAudit.imgsMissingAlt === 0, "Found img without alt attribute");
      ctx.assert(a11yAudit.canvasesMissingLabel === 0, "Found canvas without aria-label");
      await ctx.shot("a11y-focus");
    },
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectVisible(page, selector, timeout = 10000) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

async function expectText(page, text, timeout = 10000) {
  const locator = page.getByText(text).first();
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

function collectIssues(page) {
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push({ kind: "console", text: msg.text() });
  });
  page.on("pageerror", (err) => {
    issues.push({ kind: "pageerror", text: err.message });
  });
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "request failed";
    if (!reason.includes("ERR_ABORTED") && !reason.includes("NS_BINDING_ABORTED")) {
      issues.push({ kind: "requestfailed", text: `${reason} ${req.url()}` });
    }
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500) issues.push({ kind: "http", text: `${status} ${res.url()}` });
    else if (status >= 400) {
      issues.push({ kind: "http", level: "warn", text: `${status} ${res.url()}` });
    }
  });
  return issues;
}

async function main() {
  const browserType = BROWSER === "chromium" ? chromium : firefox;
  const browser = await browserType.launch({ headless: !HEADED });
  const startedAt = new Date().toISOString();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: vp.viewport,
      deviceScaleFactor: vp.deviceScaleFactor,
    });

    for (const scenario of scenarios) {
      const page = await context.newPage();
      const issues = collectIssues(page);
      const screenshots = [];
      const started = Date.now();
      let status = "pass";
      let error = null;

      const ctx = {
        assert,
        expectVisible: (selector, timeout) => expectVisible(page, selector, timeout),
        expectText: (text, timeout) => expectText(page, text, timeout),
        shot: async (name, opts = {}) => {
          const file = path.join(SHOTS, `${scenario.id}-${name}-${vp.name}.png`);
          await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
          screenshots.push(file);
          return file;
        },
      };

      try {
        await scenario.run(page, ctx);
      } catch (err) {
        status = "fail";
        error = err.message;
      } finally {
        await page.close().catch(() => {});
      }

      const errors = issues.filter((i) => (i.level ?? "error") === "error");
      const warnings = issues.filter((i) => i.level === "warn");
      if (status === "pass" && errors.length > 0) {
        status = "fail";
        error = errors.map((i) => `${i.kind}: ${i.text}`).join(" | ");
      }

      results.push({
        viewport: vp.name,
        id: scenario.id,
        title: scenario.title,
        status,
        ms: Date.now() - started,
        error,
        errors,
        warnings,
        screenshots,
      });

      console.log(
        `${status === "pass" ? "✓" : "✗"} [${vp.name}] ${scenario.id}` +
          (error ? ` — ${error}` : ""),
      );
    }

    await context.close();
  }

  await browser.close();

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
  };
  const finishedAt = new Date().toISOString();
  const report = {
    base: BASE,
    browser: BROWSER,
    headed: HEADED,
    startedAt,
    finishedAt,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(report, null, 2));

  const warnings = results.flatMap((r) =>
    r.warnings.map((w) => `- [${r.viewport}] ${r.id}: ${w.kind} — ${w.text}`),
  );
  const md = [
    `# QA run — ${finishedAt}`,
    "",
    `- Base URL: ${BASE}`,
    `- Browser: ${BROWSER} (${HEADED ? "headed" : "headless"})`,
    `- Scenarios: ${summary.total} — ${summary.pass} pass, ${summary.fail} fail`,
    "",
    "| Viewport | Scenario | Status | ms | Detail |",
    "|---|---|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.viewport} | ${r.id} | ${r.status} | ${r.ms} | ${(r.error ?? "").replace(/\|/g, "\\|")} |`,
    ),
    "",
    ...(warnings.length ? ["## Warnings", "", ...warnings, ""] : []),
    "## Screenshots",
    "",
    ...results.flatMap((r) => r.screenshots.map((s) => `- ${s}`)),
    "",
  ];
  fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));

  console.log(`\n${summary.pass}/${summary.total} passed — see ${OUT}/`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
