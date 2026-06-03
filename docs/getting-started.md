# Getting Started

GeoLibre Desktop is an npm workspaces monorepo. The main app lives in `apps/geolibre-desktop` and is built with Tauri, React, TypeScript, and MapLibre GL JS.

## Prerequisites

- Node.js 22 or newer
- Rust toolchain for desktop builds
- Linux desktop build dependencies from the Tauri v2 prerequisites

## Install

```bash
git clone https://github.com/opengeos/GeoLibre.git
cd GeoLibre
npm install
```

Bun users can run `bun install`. The root `trustedDependencies` list allows the known install scripts for `core-js`, `@google/genai`, and `protobufjs`.

## Run the browser UI

```bash
npm run dev
```

Open `http://localhost:5173`. The map and browser vector import support local vector files that DuckDB-WASM Spatial can read, with direct handling for GeoJSON, zipped Shapefiles, and KMZ archives. Use Add Vector Layer or drag files onto the app. The browser UI can also add URL-based services and datasets such as XYZ, WMS, GeoJSON URLs, vector tiles, COG rasters, ArcGIS services, FlatGeobuf, PMTiles, Zarr, LiDAR, and Gaussian splats.

Desktop filesystem dialogs, local MBTiles, local raster file reads, project save/open, and other filesystem operations require Tauri.

## Run the desktop app

```bash
npm run tauri:dev
```

## Build

```bash
npm run build
npm run tauri:build
```

## Windows and corporate network setup

### Corporate proxy (e.g. Netskope)

If your machine uses a corporate security agent that intercepts HTTPS traffic (such as Netskope), both npm and Cargo need to be pointed at the corporate proxy. Without this, all package downloads fail with `ECONNRESET`.

**npm** — run once, persists in `~/.npmrc`:

```
npm config set proxy http://<proxy-host>:<port>
npm config set https-proxy http://<proxy-host>:<port>
```

**Cargo** — create or edit `~/.cargo/config.toml`:

```toml
[http]
proxy = "http://<proxy-host>:<port>"
check-revoke = false
```

### MSVC linker (`link.exe` not found)

Tauri requires the MSVC linker on Windows. Install Visual Studio 2022 Build Tools with the C++ workload:

```
winget install Microsoft.VisualStudio.2022.BuildTools --silent --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows11SDK.22621 --includeRecommended"
```

### Rust / cargo not on PATH

If `cargo` is installed via rustup but not found, add `~\.cargo\bin` to your PATH or open a new terminal after installing rustup.

## Optional imagery credentials

The Street View plugin can use Google Street View and Mapillary imagery. Create `apps/geolibre-desktop/.env.local` and set one or both provider credentials:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_MAPILLARY_ACCESS_TOKEN=your_mapillary_access_token
```

For Google Street View, enable the Maps Embed API for the key in Google Cloud. For Mapillary, create an app in the Mapillary developer dashboard and use its client access token.

Restart `npm run dev` or `npm run tauri:dev` after changing environment variables.

## Optional Python sidecar

The optional FastAPI sidecar is reserved for heavier processing workflows and is not required for the desktop UI.

```bash
cd backend/geolibre_server
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn geolibre_server.app.main:app --host 127.0.0.1 --port 8765
```
