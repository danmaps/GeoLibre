import "./lib/symbol-dispose-polyfill";
import { handleOAuthCallbackIfNeeded } from "./lib/arcgis-oauth";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import "maplibre-gl-basemap-control/style.css";
import "maplibre-gl-components/style.css";
import "maplibre-gl-duckdb/style.css";
import "maplibre-gl-esri-wayback/style.css";
import "maplibre-gl-geo-editor/style.css";
import "maplibre-gl-geoagent/style.css";
import "maplibre-gl-geoparquet/style.css";
import "maplibre-gl-streetview/style.css";
import "maplibre-gl-swipe/style.css";
import "mapillary-js/dist/mapillary.css";
import "./index.css";
import "./lib/geoagent-style";
import "./lib/lidar-style";
import "./lib/swipe-style";

// If this page load is an OAuth popup returning from ArcGIS, post the code
// back to the opener and close — skip rendering the full app.
if (!handleOAuthCallbackIfNeeded()) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
