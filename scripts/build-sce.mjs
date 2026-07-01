// Build the GeoLibre web app for the SCE nginx deployment served under the
// `/geolibre/` URL subpath.
//
// The SCE server publishes apps/geolibre-desktop/dist/ via a docker volume
// mount at https://gisapps.sce.com/geolibre/. Because the app lives under a
// subpath (not the site root), the build MUST set `GEOLIBRE_APP_BASE=/geolibre/`
// so index.html references /geolibre/assets/... and /geolibre/manifest.webmanifest
// instead of /assets/... — otherwise every asset 404s and the page is blank.
//
// This wrapper bakes that base in so a plain `npm run build` (base "/") is never
// deployed by mistake after an upstream merge. Run it with `npm run build:sce`.
//
// ArcGIS Online sign-in: VITE_ARCGIS_CLIENT_ID is passed through from the
// environment (or a .env.local file, which Vite reads automatically) so the
// deployed build keeps the ArcGIS OAuth client id.
//
// Output: apps/geolibre-desktop/dist/ — ready to serve at /geolibre/.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_BASE = "/geolibre/";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "apps/geolibre-desktop/dist");

const result = spawnSync("npm", ["run", "build", "-w", "geolibre-desktop"], {
  cwd: repoRoot,
  shell: process.platform === "win32",
  stdio: "inherit",
  env: {
    ...process.env,
    GEOLIBRE_APP_BASE: APP_BASE,
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Guard the one thing that silently breaks the deployment: if the base path was
// not applied, index.html references /assets/... and the /geolibre/ page 404s.
// A correctly-based build only emits absolute URLs under /geolibre/, so any
// src/href that starts with "/" but not "/geolibre/" means the base was lost.
const indexHtml = readFileSync(resolve(distDir, "index.html"), "utf8");
const badRefs = [...indexHtml.matchAll(/\b(?:src|href)="(\/(?!\/)[^"]*)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith(APP_BASE));
if (badRefs.length > 0) {
  console.error(
    `[build-sce] dist/index.html has asset paths outside ${APP_BASE}: ` +
      `${badRefs.join(", ")}. GEOLIBRE_APP_BASE=${APP_BASE} was not applied; ` +
      "the deployed app would 404.",
  );
  process.exit(1);
}

console.log(
  `[build-sce] Built apps/geolibre-desktop/dist/ with base ${APP_BASE} — ` +
    "ready to serve at /geolibre/.",
);
