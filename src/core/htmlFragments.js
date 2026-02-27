/**
 * Shared HTML/CSS/Leaflet fragments for static heatmap and server-rendered pages.
 * Centralizes Leaflet CDN URLs, viewport, and common styles.
 */

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_HEAT_JS = "https://unpkg.com/leaflet.heat/dist/leaflet-heat.js";
const OSM_TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const BASE_STYLES = `
  body{margin:0;font-family:Arial}
  #map{height:100vh;width:100vw}
  .info{position:absolute;top:10px;left:10px;background:#fff;padding:10px;border-radius:8px;z-index:999;box-shadow:0 2px 10px rgba(0,0,0,.15)}
  .info b{display:block;margin-bottom:6px}
  .info small{color:#666}
`.trim();

/**
 * @param {object} opts
 * @param {string} [opts.title] - Page title
 * @param {string} [opts.extraStyles] - Additional CSS (e.g. mapa-specific: #bar, .truck)
 */
function leafletHead(opts = {}) {
  const { title = "", extraStyles = "" } = opts;
  return `<meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="${LEAFLET_CSS}"/>
  <style>
    ${BASE_STYLES}
    ${extraStyles}
  </style>`;
}

/**
 * Returns the map container div.
 */
function mapContainer() {
  return '<div id="map"></div>';
}

/**
 * @param {boolean} [withHeat=false] - Include leaflet-heat.js
 */
function leafletScripts(withHeat = false) {
  let out = `<script src="${LEAFLET_JS}"></script>`;
  if (withHeat) {
    out += `\n  <script src="${LEAFLET_HEAT_JS}"></script>`;
  }
  return out;
}

module.exports = {
  leafletHead,
  mapContainer,
  leafletScripts,
  LEAFLET_CSS,
  LEAFLET_JS,
  LEAFLET_HEAT_JS,
  OSM_TILE,
  BASE_STYLES,
};
