import "./lib/symbol-dispose-polyfill";
import React from "react";
import ReactDOM from "react-dom/client";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import "maplibre-gl-3d-tiles/style.css";
import "maplibre-gl-basemap-control/style.css";
import "maplibre-gl-components/style.css";
import "maplibre-gl-duckdb/style.css";
import "maplibre-gl-enviroatlas/style.css";
import "maplibre-gl-esri-wayback/style.css";
import "maplibre-gl-earth-engine/style.css";
import "maplibre-gl-fema-wms/style.css";
import "maplibre-gl-geo-editor/style.css";
import "maplibre-gl-geoagent/style.css";
import "maplibre-gl-nasa-earthdata/style.css";
import "maplibre-gl-national-map/style.css";
import "maplibre-gl-overture-maps/style.css";
import "maplibre-gl-planetary-computer/style.css";
import "maplibre-gl-raster/style.css";
import "maplibre-gl-streetview/style.css";
import "maplibre-gl-swipe/style.css";
import "maplibre-gl-time-slider/style.css";
import "maplibre-gl-vector/style.css";
import "mapillary-js/dist/mapillary.css";
import "./index.css";
import "./lib/basemap-style";
import "./lib/geoagent-style";
import "./lib/lidar-style";
import "./lib/swipe-style";
import { installDiagnosticsCapture } from "./lib/diagnostics";
import { installStaleChunkReload } from "./lib/stale-chunk-reload";
import { handleOAuthCallbackIfNeeded } from "./lib/arcgis-oauth";

installDiagnosticsCapture();
// Recover from chunks orphaned by a web redeploy (stale lazy import → 404). A
// no-op in the desktop build, whose chunks are bundled locally.
installStaleChunkReload();

// If this page is the OAuth redirect target inside the popup, post the code
// back to the opener and close — don't render the full app.
if (handleOAuthCallbackIfNeeded()) {
  // Nothing more to do; the popup closes itself after postMessage.
} else {
  void import("./App")
    .then(({ default: App }) => {
      ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    })
    .catch((error: unknown) => {
      console.error("Failed to start GeoLibre", error);
    });
}
