import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const URL = "https://ai-for-medicine.vercel.app/";
const RAW_DIR = path.resolve("evidence/stage-4-demo/footage/raw");
const OUT_DIR = path.resolve("evidence/stage-4-demo/footage");
const REMOTION_FOOTAGE = "/home/yap/tools/demo-recorder/public/footage";

fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REMOTION_FOOTAGE, { recursive: true });

function toMp4(webmPath, outName) {
  for (const dir of [OUT_DIR, REMOTION_FOOTAGE]) {
    const dst = path.join(dir, outName);
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      webmPath,
      "-vf",
      "scale=1440:900:flags=lanczos",
      "-r",
      "30",
      "-g",
      "15",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      dst,
    ]);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  // Clip 1: Live Workbench Calibration, Algorithm Comparison & CSV Export
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: RAW_DIR, size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    // Sweep caliper across clean strip
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      for (const frac of [0.22, 0.38, 0.54, 0.72]) {
        await page.mouse.move(box.x + box.width * frac, box.y + box.height * 0.5);
        await page.waitForTimeout(450);
      }
    }

    // Select Tier 2 Skewed (+4.2°) strip
    await page.getByRole("button", { name: /PTB-XL #01492/i }).click();
    await page.waitForTimeout(1400);

    // Compare Naive Column-Argmax vs Viterbi DP
    const select = page.getByLabel(/Extraction Pipeline/i);
    await select.selectOption("column_argmax");
    await page.waitForTimeout(1600);
    await select.selectOption("viterbi_dp");
    await page.waitForTimeout(1400);

    // Run Calibrated Digitization & Export CSV
    await page.getByRole("button", { name: /Run Calibrated Digitization/i }).click();
    await page.waitForTimeout(1400);
    await page.getByRole("button", { name: /Export Calibrated CSV/i }).click();
    await page.waitForTimeout(1800);

    const video = page.video();
    await context.close();
    const webmPath = await video.path();
    toMp4(webmPath, "live_workbench_demo.mp4");
    console.log("Recorded Clip 1: live_workbench_demo.mp4");
  }

  // Clip 2: GTQI Safety Gate Withhold (Tier 5) & Held-Out Benchmark Explorer
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: RAW_DIR, size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    // Select Tier 5 Severe Lead Collision & Crease (GTQI 41/100 -> WITHHELD)
    await page.getByRole("button", { name: /PTB-XL #09204/i }).click();
    await page.waitForTimeout(2600);

    // Switch to Held-Out Benchmark View (120 Strips)
    await page.getByRole("button", { name: /2\. Held-Out Benchmark/i }).click();
    await page.waitForTimeout(2400);

    // Switch to Methodology & Safety View and Run Deterministic Self-Check
    await page.getByRole("button", { name: /3\. Methodology & Safety/i }).click();
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: /Run Deterministic Pipeline Self-Check/i }).click();
    await page.waitForTimeout(2000);

    const video = page.video();
    await context.close();
    const webmPath = await video.path();
    toMp4(webmPath, "live_safety_gate_demo.mp4");
    console.log("Recorded Clip 2: live_safety_gate_demo.mp4");
  }
} finally {
  await browser.close();
}
