/* ============================ SETTINGS ============================ */
const CONFIG = {
  cityHall: { name: "Tabaco City Hall", lat: 13.3592, lng: 123.7298 },
  port: { name: "Tabaco Port", lat: 13.36240, lng: 123.73731 },   // approximate
  osrm: "https://router.project-osrm.org/route/v1/driving",
  tryRealBoundaries: true      // set false to always use the approximate Voronoi areas
};
// Kiosk: open as index.html?mode=kiosk  → starts fixed at City Hall
const MODE = new URLSearchParams(location.search).get("mode") === "kiosk" ? "kiosk" : "web";

/* ============ ALL 47 BARANGAYS: [name, lat, lng, population 2020, type] ============
   type: m = mainland, p = poblacion, i = San Miguel Island (boat only)            */
const DATA = [
  ["Agnas", 13.3847, 123.7844, 1455, "i"], ["Bacolod", 13.3625, 123.7332, 1949, "m"], ["Bangkilingan", 13.3585, 123.7175, 4829, "m"],
  ["Bantayan", 13.3372, 123.6577, 1632, "m"], ["Baranghawon", 13.3524, 123.7240, 4787, "m"], ["Basagan", 13.3353, 123.6724, 1301, "m"],
  ["Basud", 13.3550, 123.7283, 2688, "p"], ["Bogñabong", 13.3418, 123.7162, 3208, "m"], ["Bombon", 13.3619, 123.7263, 1539, "p"],
  ["Bonot", 13.3228, 123.6655, 1304, "m"], ["Buang", 13.3043, 123.6391, 3442, "m"], ["Buhian", 13.3248, 123.6562, 1546, "m"],
  ["Cabagñan", 13.3387, 123.7227, 2568, "m"], ["Cobo", 13.3509, 123.7283, 3439, "m"], ["Comon", 13.3168, 123.7008, 2730, "m"],
  ["Cormidal", 13.3611, 123.7348, 1878, "m"], ["Divino Rostro", 13.3568, 123.7316, 1223, "p"], ["Fatima", 13.3498, 123.7354, 4350, "m"],
  ["Guinobat", 13.3516, 123.7150, 2143, "m"], ["Hacienda", 13.3761, 123.7960, 6074, "i"], ["Magapo", 13.3056, 123.6724, 1055, "m"],
  ["Mariroc", 13.3425, 123.7087, 5792, "m"], ["Matagbac", 13.3534, 123.7067, 5409, "m"], ["Oras", 13.3232, 123.6346, 1127, "m"],
  ["Oson", 13.3227, 123.6834, 1262, "m"], ["Panal", 13.3549, 123.7204, 3505, "m"], ["Pawa", 13.3653, 123.7219, 4505, "m"],
  ["Pinagbobong", 13.3403, 123.6996, 3300, "m"], ["Quinale Cabasan", 13.3591, 123.7325, 1397, "p"], ["Quinastillojan", 13.3462, 123.6679, 1909, "m"],
  ["Rawis", 13.4001, 123.7671, 1609, "i"], ["Sagurong", 13.3962, 123.7798, 3252, "i"], ["Salvacion", 13.3471, 123.7355, 3842, "m"],
  ["San Antonio", 13.3474, 123.6774, 4891, "m"], ["San Carlos", 13.3757, 123.7195, 4212, "m"], ["San Isidro", 13.3264, 123.6782, 1266, "m"],
  ["San Juan", 13.3592, 123.7287, 1325, "p"], ["San Lorenzo", 13.3368, 123.7354, 8117, "m"], ["San Ramon", 13.3477, 123.7306, 3214, "m"],
  ["San Roque", 13.3551, 123.7366, 5344, "m"], ["San Vicente", 13.3568, 123.6988, 4670, "m"], ["Santo Cristo", 13.3575, 123.7357, 5544, "p"],
  ["Sua-Igot", 13.3440, 123.6304, 1415, "m"], ["Tabiguian", 13.3240, 123.6452, 1620, "m"], ["Tagas", 13.3518, 123.7315, 2233, "m"],
  ["Tayhi", 13.3623, 123.7299, 3482, "p"], ["Visita", 13.3941, 123.7741, 1579, "i"]
].map(([name, lat, lng, pop, type]) => ({ name, lat, lng, pop, type }));

const TYPE_LABEL = { p: "Poblacion", m: "Mainland barangay", i: "San Miguel Island (by boat)" };

/* ============================ HELPERS ============================ */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ñ/g, "n").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
const fmtDist = m => m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m";
const fmtTime = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + " min" : Math.floor(m / 60) + " hr " + (m % 60) + " min"; };
function toast(msg, ms = 4000) { const t = $("toast"); t.textContent = msg; t.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = "none", ms); }
const pin = cls => L.divIcon({ className: "", html: `<div class="pin ${cls}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

/* ============================ MAP ============================ */
const map = L.map("map").fitBounds([[13.29, 123.62], [13.415, 123.815]]);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const routeLayer = L.layerGroup().addTo(map);
const COLORS = { p: "#f59e0b", m: "#3b82f6", i: "#14b8a6" };
const styleNormal = b => EDIT_SHAPES
  ? { color: "#34465d", weight: 1.5, fillColor: COLORS[b.type], fillOpacity: 0.08 }   // shape editor: borders must be visible
  : { color: "#34465d", weight: 0, fillColor: COLORS[b.type], fillOpacity: 0.0 };       // normal map: invisible until clicked
const styleSelected = { color: "#c99a00", weight: 3, fillColor: "#f5c518", fillOpacity: 0.10 };   // yellow like Wikimapia

let origin = null, originMarker = null, destMarker = null, selected = null;

/* ======= Approximate territories (fallback): Voronoi cells around each center ======= */
const X0 = 123.7, K = Math.cos(13.35 * Math.PI / 180);
const toXY = ([la, ln]) => [(ln - X0) * K, la];
const toLL = ([x, y]) => [y, x / K + X0];
function clip(poly, f) {
  const out = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], fp = f(p), fq = f(q);
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  });
  return out;
}
function voronoi(group, boundary) {
  const pts = group.map(b => toXY([b.lat, b.lng]));
  return group.map((b, i) => {
    let poly = boundary.map(toXY);
    pts.forEach((o, j) => {
      if (j === i) return;
      const a = pts[i], dx = o[0] - a[0], dy = o[1] - a[1], c = (o[0] ** 2 + o[1] ** 2 - a[0] ** 2 - a[1] ** 2) / 2;
      poly = clip(poly, p => dx * p[0] + dy * p[1] - c);
    });
    return poly.map(toLL);
  });
}
const MAINLAND = [[13.395, 123.615], [13.395, 123.722], [13.375, 123.735], [13.362, 123.742], [13.34, 123.744], [13.29, 123.748], [13.29, 123.615]];
const ISLAND = [[13.36240, 123.73731], [13.36240, 123.73731], [13.36240, 123.73731], [13.36240, 123.73731]];

/* ======= Real boundaries from OpenStreetMap (if they exist) ======= */
async function fetchRealBoundaries() {
  const key = "tabaco-brgy-v1";
  try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch (e) { }
  const q = `[out:json][timeout:60];
    area["name"="Tabaco"]["boundary"="administrative"]["admin_level"="6"]->.t;
    rel(area.t)["boundary"="administrative"]["admin_level"="10"]; out geom;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) });
  if (!r.ok) throw new Error("Overpass " + r.status);
  const gj = osmtogeojson(await r.json());
  const byName = {};
  gj.features.filter(f => /Polygon/.test(f.geometry.type) && f.properties.name)
    .forEach(f => { byName[norm(f.properties.name)] = f; });
  try { localStorage.setItem(key, JSON.stringify(byName)); } catch (e) { }
  return byName;
}

/* ======= Draw all 47 ======= */
/* ======= Shape editor (open the page as index.html?edit=shapes) ======= */
const EDIT_SHAPES = new URLSearchParams(location.search).get("edit") === "shapes";
const DRAFT_KEY = "tabaco-shapes-draft";
let editing = null;

/* Saved shapes: your unsaved draft (editor only), then barangays.geojson next to index.html */
async function loadSavedShapes() {
  const toMap = gj => {
    const o = {};
    (gj.features || []).forEach(f => {
      const n = f.properties && f.properties.name;
      if (n && f.geometry && /Polygon/.test(f.geometry.type)) o[norm(n)] = f;
    });
    return o;
  };
  if (EDIT_SHAPES) {
    try { const d = localStorage.getItem(DRAFT_KEY); if (d) return { map: toMap(JSON.parse(d)), source: "your unsaved draft" }; } catch (e) { }
  }
  try {
    const r = await fetch("barangays.geojson");
    if (r.ok) return { map: toMap(await r.json()), source: "barangays.geojson" };
  } catch (e) { }
  return null;
}

let geomanOk = false;

async function drawBarangays() {
  if (EDIT_SHAPES) {
    try { await loadGeoman(); geomanOk = true; } catch (err) { toast(err.message, 10000); }
  }
  let real = {}, source = "";
  const saved = await loadSavedShapes();
  if (saved && Object.keys(saved.map).length) { real = saved.map; source = saved.source; }
  else if (CONFIG.tryRealBoundaries) {
    try { real = await fetchRealBoundaries(); source = "OpenStreetMap"; } catch (e) { console.warn(e); }
  }

  const land = DATA.filter(b => b.type !== "i"), isl = DATA.filter(b => b.type === "i");
  const cellMap = new Map();
  [...voronoi(land, MAINLAND).map((p, i) => [land[i], p]), ...voronoi(isl, ISLAND).map((p, i) => [isl[i], p])]
    .forEach(([b, p]) => cellMap.set(b.name, p));

  let realCount = 0;
  DATA.forEach(b => {
    const f = real[norm(b.name)];
    let layer;
    if (f) { layer = L.geoJSON(f).getLayers()[0]; layer.setStyle(styleNormal(b)); realCount++; }
    else { layer = L.polygon(cellMap.get(b.name), styleNormal(b)); }
    layer.addTo(map);
    layer.bindTooltip(b.name, { sticky: true, className: "brgy-tip" });
    layer.on("click", () => EDIT_SHAPES ? editShape(b) : select(b));
    b.layer = layer;
  });




  if (EDIT_SHAPES) {
    await startShapeEditor(source);

    // Ensure Geoman is initialized on every barangay polygon.
    DATA.forEach(b => {
      if (L.PM && L.PM.reInitLayer) {
        L.PM.reInitLayer(b.layer);
      }
    });

    console.log("Geoman loaded:", !!L.PM);
    console.log("Barangay layers:", DATA.length);
    console.log(
      "Editable layers:",
      DATA.filter(b => !!b.layer.pm).length
    );

    return;
  }






  if (!realCount) toast("Showing approximate barangay areas (official outlines were not found online).", 6000);
}

/* ---- the editor itself (uses the Leaflet-Geoman plugin, loaded only in edit mode) ---- */

function loadGeoman() {
  if (window.L?.PM) {
    return Promise.resolve();
  }

  return Promise.reject(
    new Error("Geoman did not load. Check index.html.")
  );
}


function collectShapes() {
  return {
    type: "FeatureCollection", features: DATA.map(b => {
      const f = b.layer.toGeoJSON(6); f.properties = { name: b.name }; return f;
    })
  };
}
function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectShapes())); } catch (e) { } }

function downloadShapes() {
  const blob = new Blob([JSON.stringify(collectShapes())], { type: "application/geo+json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "barangays.geojson";
  document.body.appendChild(a); a.click(); a.remove();
}




function editShape(b) {
  if (editing && editing !== b) {
    editing.layer.pm.disable();
    editing.layer.setStyle(styleNormal(editing));
  }

  editing = b;
  b.layer.setStyle(styleSelected);
  b.layer.bringToFront();

  // Enable editing on the selected polygon.
  b.layer.pm.enable();

  // Diagnostic: show the polygon's actual corner coordinates.
  const rings = b.layer.getLatLngs();
  console.log("Selected:", b.name);
  console.log("Editing enabled:", b.layer.pm.enabled());
  console.log("Polygon coordinates:", rings);

  // Temporary visible markers independent of Geoman.
  if (window.testVertices) {
    map.removeLayer(window.testVertices);
  }

  window.testVertices = L.layerGroup().addTo(map);

  function addMarkers(ring) {
    if (!Array.isArray(ring)) return;

    if (ring.length && ring[0] &&
      typeof ring[0].lat === "number") {
      ring.forEach(ll => {
        L.circleMarker(ll, {
          radius: 7,
          color: "#ff0000",
          weight: 3,
          fillColor: "#ffffff",
          fillOpacity: 1
        }).addTo(window.testVertices);
      });
    } else {
      ring.forEach(addMarkers);
    }
  }

  addMarkers(rings);

  if ($("editName")) {
    $("editName").textContent = "Editing: Brgy. " + b.name;
  }
}



async function startShapeEditor(source) {
  if (!geomanOk) { $("info").innerHTML = '<p class="error">The editing plugin did not load. Check your internet connection and refresh the page.</p>'; return; }
  DATA.forEach(b => {
    ["pm:edit", "pm:vertexadded", "pm:vertexremoved", "pm:markerdragend"].forEach(ev => b.layer.on(ev, saveDraft));
  });
  $("modeLabel").textContent = "Shape editor" + (source ? " (starting from " + source + ")" : "");
  $("info").innerHTML = `
    <h2>Shape editor</h2>
    <p class="sub" id="editName">Click a barangay to start editing it.</p>
    <ol class="how">
      <li><span>Drag a white corner to move it.</span></li>
      <li><span>Click a small middle dot to add a new corner.</span></li>
      <li><span>Right-click a corner to delete it.</span></li>
      <li><span>Corners snap to neighbors so borders match.</span></li>
    </ol>
    <p class="note">Your work is kept in this browser automatically. When you are done, download the file and put it next to index.html.</p>
    <button class="action-btn" id="btnDownload">Download barangays.geojson</button>
    <button class="action-btn alt" id="btnDiscard">Discard my changes</button>`;
  $("btnDownload").onclick = downloadShapes;
  $("btnDiscard").onclick = () => { if (confirm("Throw away your edits and start over?")) { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { } location.reload(); } };
}

/* ============================ START POINT ============================ */
function setOrigin(lat, lng, text, cls) {
  origin = { lat, lng };
  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.marker([lat, lng], { icon: pin(cls) }).addTo(map).bindTooltip(text);
}
function startKiosk() {
  const h = CONFIG.cityHall;
  setOrigin(h.lat, h.lng, "You are here: " + h.name, "hall");
  $("modeLabel").textContent = "Kiosk. You are at " + h.name + ".";
}
function startWeb() {
  $("modeLabel").textContent = "Finding your location…";
  if (!navigator.geolocation) return fallback("This browser cannot share location.");
  navigator.geolocation.getCurrentPosition(
    p => { setOrigin(p.coords.latitude, p.coords.longitude, "You are here", ""); $("modeLabel").textContent = "Showing your current location."; map.setView([p.coords.latitude, p.coords.longitude], 14); },
    e => fallback(e.code === 1 ? "Location permission denied." : "Could not get your location."),
    { enableHighAccuracy: true, timeout: 12000 });
}
function fallback(reason) {
  const h = CONFIG.cityHall;
  setOrigin(h.lat, h.lng, "Starting point: " + h.name, "hall");
  $("modeLabel").textContent = reason + " Starting from " + h.name + ".";
  toast(reason + " Press “My location” to try again.");
}

/* ============================ ROUTING ============================ */
async function osrm(from, to) {
  const url = `${CONFIG.osrm}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Routing service error (" + r.status + ").");
  const d = await r.json();
  if (d.code !== "Ok" || !d.routes.length) throw new Error("No road route found.");
  return d.routes[0];
}

const titleOf = b => b.isSpot ? esc(b.name) : "Brgy. " + esc(b.name);

async function select(b) {            // a barangay was chosen
  if (!origin) { toast("Still finding your starting point…"); return; }
  if (selected) selected.layer.setStyle(styleNormal(selected));
  selected = b;
  b.layer.setStyle(styleSelected);
  if (b.layer.bringToFront) b.layer.bringToFront();
  $("search").value = b.name; $("results").innerHTML = "";
  await go(b);
}

async function selectSpot(sp) {       // a tourist spot was chosen
  if (!origin) { toast("Still finding your starting point…"); return; }
  if (selected) { selected.layer.setStyle(styleNormal(selected)); selected = null; }
  $("search").value = ""; $("results").innerHTML = "";
  await go(sp);
}

async function go(b) {                // draw the route to a barangay or a spot
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([b.lat, b.lng], { icon: pin("dest") }).addTo(map).bindTooltip(b.name);
  $("info").innerHTML = `<h2>${titleOf(b)}</h2><p class="hint">Finding the route…</p>`;

  const island = b.type === "i";
  const target = island ? CONFIG.port : { lat: b.lat, lng: b.lng };   // island: drive to the port first
  try {
    const route = await osrm(origin, target);
    drawRoute(route, island ? b : null);
    showInfo(b, route, island);
  } catch (err) {
    routeLayer.clearLayers();
    $("info").innerHTML = `<h2>${titleOf(b)}</h2><p class="error">${esc(err.message)} Check your connection and try again.</p>`;
  }
}

function drawRoute(route, islandBrgy) {
  routeLayer.clearLayers();
  const pts = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  L.polyline(pts, { color: "#1f2d8a", weight: 10, opacity: .35, lineCap: "round" }).addTo(routeLayer);
  const line = L.polyline(pts, { color: "#3f51c4", weight: 6, lineCap: "round" }).addTo(routeLayer);
  let bounds = line.getBounds();
  if (islandBrgy) {           // dashed boat leg, like a ferry line
    const leg = L.polyline([[CONFIG.port.lat, CONFIG.port.lng], [islandBrgy.lat, islandBrgy.lng]], { color: "#0f766e", weight: 4, dashArray: "8 8" }).addTo(routeLayer);
    bounds = bounds.extend(leg.getBounds());
  }
  map.fitBounds(bounds, { padding: [50, 50] });
}

/* ============================ INFO PANEL ============================ */
function stepText(s) {
  const m = s.maneuver || {}, road = s.name ? " onto " + s.name : "", mod = (m.modifier || "").replace("slight ", "slightly ");
  switch (m.type) {
    case "depart": return "Head " + (mod ? "" : "out") + (s.name ? " on " + s.name : "");
    case "arrive": return "You have arrived";
    case "turn": return "Turn " + mod + road;
    case "continue": return "Continue " + (mod || "straight") + road;
    case "new name": return "Continue" + road;
    case "merge": return "Merge" + road;
    case "fork": return "Keep " + mod + road;
    case "end of road": return "At the end of the road, turn " + mod + road;
    case "roundabout": case "rotary": return "Enter the roundabout" + (m.exit ? ", exit " + m.exit : "") + road;
    default: return "Continue" + road;
  }
}

function showInfo(b, route, island) {
  const steps = route.legs.flatMap(l => l.steps);
  const roads = [];
  steps.forEach(s => { const n = (s.name || "").trim(); if (n && roads[roads.length - 1] !== n) roads.push(n); });

  const list = steps.filter(s => s.distance > 0 || (s.maneuver && s.maneuver.type === "arrive"))
    .map(s => `<li><span>${esc(stepText(s))}</span><span>${s.distance > 0 ? fmtDist(s.distance) : ""}</span></li>`).join("");

  const boat = island ? `<div class="boat"><b>Then take a boat.</b> ${titleOf(b)} is on San Miguel Island. The road route ends at ${esc(CONFIG.port.name)}. The dashed green line shows the sea crossing, which is not included in the time above.</div>` : "";

  $("info").innerHTML = `
    <h2>${titleOf(b)}</h2>
    <div class="sub">${b.isSpot ? esc(b.desc) + (b.approx ? " <i>(Pin location is approximate.)</i>" : "") : TYPE_LABEL[b.type] + " · Population " + b.pop.toLocaleString() + " (2020)"}</div>
    <div class="big">${fmtDist(route.distance)}, ${fmtTime(route.duration)}${island ? " to the port" : ""}</div>
    ${boat}
    <div class="label">Roads you will pass</div>
    <div class="roads">${roads.length ? roads.map(r => `<span class="chip">${esc(r)}</span>`).join("") : "<span class='note'>Roads on this route have no name on the map.</span>"}</div>
    <div class="label">Directions</div>
    <ol>${list}</ol>
    <p class="note">Time is for a car or tricycle on the road and may vary with traffic.</p>`;
}

/* ============================ TOURIST SPOTS ============================ */
const EDIT = new URLSearchParams(location.search).get("edit") === "1";   // index.html?edit=1 → coordinate helper
const spotsLayer = L.layerGroup();
let spotsOn = false;

function showHint() {
  if (spotsOn) return renderSpotList();
  $("info").innerHTML = `<p class="hint">Click a barangay on the map, or search for one, to see the route and the roads to take.</p>`;
}

function buildSpots() {
  SPOTS.forEach(sp => {
    sp.isSpot = true;
    const icon = L.divIcon({ className: "", html: '<div class="spot-pin">★</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
    const m = L.marker([sp.lat, sp.lng], { icon, title: sp.name, draggable: EDIT }).bindTooltip(sp.name);
    m.on("click", () => selectSpot(sp));
    if (EDIT) m.on("dragend", () => showCoords(sp.name, m.getLatLng()));
    spotsLayer.addLayer(m);
  });
}

/* Coordinate helper (only with ?edit=1): click the map or drag a ★ to read exact coordinates */
function showCoords(label, ll) {
  const text = `lat: ${ll.lat.toFixed(5)}, lng: ${ll.lng.toFixed(5)}`;
  L.popup().setLatLng(ll).setContent(`<b>${esc(label)}</b><br>${text}<br><small>Copied. Paste it into spots.js</small>`).openOn(map);
  try { navigator.clipboard.writeText(text); } catch (e) { }
}

function renderSpotList() {
  $("info").innerHTML = `<h2>Tourist spots</h2><p class="sub">Choose a spot to see the route.</p><div id="spotList"></div>`;
  SPOTS.forEach(sp => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "spot-item";
    b.innerHTML = `<b>★ ${esc(sp.name)}</b><span>${esc(sp.desc)}</span>`;
    b.onclick = () => selectSpot(sp);
    $("spotList").appendChild(b);
  });
}

function toggleSpots() {
  spotsOn = !spotsOn;
  $("btnSpots").classList.toggle("on", spotsOn);
  if (spotsOn) {
    spotsLayer.addTo(map);
    map.fitBounds(L.latLngBounds(SPOTS.map(sp => [sp.lat, sp.lng])), { padding: [60, 60] });
    renderSpotList();
  } else {
    map.removeLayer(spotsLayer);
    showHint();
  }
}

/* ============================ SEARCH + BUTTONS ============================ */
$("search").addEventListener("input", e => {
  const q = norm(e.target.value), ul = $("results"); ul.innerHTML = "";
  if (!q) return;
  DATA.filter(b => norm(b.name).includes(q)).slice(0, 8).forEach(b => {
    const li = document.createElement("li"), bt = document.createElement("button");
    bt.type = "button"; bt.textContent = b.name; bt.onclick = () => select(b);
    li.appendChild(bt); ul.appendChild(li);
  });
});

$("btnSpots").onclick = toggleSpots;
$("btnLocate").onclick = () => MODE === "kiosk" ? startKiosk() : startWeb();
$("btnClear").onclick = () => {
  routeLayer.clearLayers();
  if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
  if (selected) { selected.layer.setStyle(styleNormal(selected)); selected = null; }
  $("search").value = ""; $("results").innerHTML = "";
  showHint();
  map.fitBounds([[13.29, 123.62], [13.415, 123.815]]);
};

/* ============================ START ============================ */
(function init() {
  if (!EDIT_SHAPES) { MODE === "kiosk" ? startKiosk() : startWeb(); }
  drawBarangays();
  buildSpots();
  if (EDIT) {
    map.on("click", e => showCoords("Clicked point", e.latlng));
    toggleSpots();
    toast("Edit mode: drag a ★ or click the map to get exact coordinates.", 8000);
  }
})();
