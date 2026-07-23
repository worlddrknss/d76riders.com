#!/usr/bin/env node
/**
 * `npm audit`, minus advisories we have consciously accepted.
 *
 * Plain `npm audit --audit-level=high` had been failing on every single build,
 * which makes the gate worthless — a check that is always red gets ignored, so
 * a genuinely new advisory would have sailed through unnoticed. Everything with
 * a real fix is patched; what is left is listed here with a reason, so the job
 * goes green now and turns red the moment something new appears.
 *
 * Accepting an advisory is a decision, not a mute button: each entry needs a
 * reason, and `review` is the date to re-check whether the upstream fix landed.
 */
import { execSync } from "node:child_process";

const FAIL_ON = new Set(["high", "critical"]);

const ACCEPTED = [
  {
    id: 1124066,
    advisory: "GHSA-f88m-g3jw-g9cj",
    package: "sharp",
    reason:
      "libvips CVEs in sharp <0.35.0. Our own sharp is 0.35.3 (patched) — this is the copy Next " +
      "bundles for its Image Optimization API. There is no fix available: npm's only suggested " +
      "remedy is next@9.3.3. Exposure is /_next/image, whose remote sources are restricted by " +
      "images.remotePatterns in next.config.ts. Clears when Next ships a bundled sharp bump.",
    review: "2026-09-01",
  },
  {
    id: 1117015,
    advisory: "GHSA-qx2v-qp2m-jg93",
    package: "postcss",
    reason:
      "XSS via unescaped </style> in postcss <8.5.10, again the copy bundled inside Next. Moderate, " +
      "so it does not fail this gate today; listed so it is tracked rather than rediscovered.",
    review: "2026-09-01",
  },
];

const accepted = new Map(ACCEPTED.map((a) => [a.id, a]));

let report;
try {
  // npm audit exits non-zero when it finds anything, so the output is read from
  // the thrown result rather than treating a non-zero exit as a failure to run.
  report = JSON.parse(execSync("npm audit --json", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
} catch (error) {
  if (!error.stdout) {
    console.error("Could not run npm audit:", error.message);
    process.exit(2);
  }
  report = JSON.parse(error.stdout);
}

const unaccepted = [];
// Every advisory still reported, at any severity — staleness of an ACCEPTED
// entry is about whether it is reported at all, not whether it would fail.
const reported = new Set();
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== "object") continue;
    reported.add(via.source);
    if (!FAIL_ON.has(via.severity)) continue;
    if (accepted.has(via.source)) continue;
    unaccepted.push({ name, severity: via.severity, title: via.title, url: via.url, id: via.source });
  }
}

for (const entry of ACCEPTED) {
  const stale = !reported.has(entry.id);
  console.log(
    `${stale ? "· " : "✓ "}accepted ${entry.advisory} (${entry.package})${
      stale ? " — no longer reported, safe to drop from ACCEPTED" : ""
    }`,
  );
}

if (unaccepted.length === 0) {
  console.log("\nNo unaccepted high or critical advisories.");
  process.exit(0);
}

console.error(`\n${unaccepted.length} unaccepted advisory(ies):\n`);
for (const v of unaccepted) {
  console.error(`  [${v.severity}] ${v.name} — ${v.title}`);
  console.error(`      ${v.url}  (id ${v.id})`);
}
console.error("\nFix them, or add an entry to ACCEPTED in scripts/audit-check.mjs with a reason.");
process.exit(1);
