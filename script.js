/* =========================================================
   KNOW YOUR AREA · Application script
   Vanilla JS · No frameworks · Production-ready MVP
   =========================================================
   Sections:
     1. Mock data (Pune)
     2. API abstraction layer (swap for real govt APIs later)
     3. DOM helpers + toast + loader
     4. Theme toggle (localStorage)
     5. Navigation (scroll state + mobile menu + smooth scroll)
     6. Animated counters (IntersectionObserver)
     7. Reveal-on-scroll
     8. Renderers: location, reps, projects, schemes, complaints
     9. Projects: search + filter + modal
    10. Leaflet spending map
    11. Transparency score (ring + bars)
    12. Boot
========================================================= */

(() => {
'use strict';

/* =========================================================
   1. MOCK DATA · Pune
   Replace with real API responses when government endpoints are wired.
========================================================= */
const MOCK = {
  location: {
    coords: { lat: 18.5074, lng: 73.8077 }, // Kothrud, Pune
    address: 'Kothrud, Pune',
    ward: 'Ward 12 · Kothrud',
    assembly: 'Kothrud Vidhan Sabha',
    loksabha: 'Pune Lok Sabha',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
  },

  representatives: [
    {
      role: 'Member of Parliament',
      name: 'Murlidhar Mohol',
      party: 'Bharatiya Janata Party',
      constituency: 'Pune Lok Sabha',
      term: '2024 – 2029',
      contact: 'mp.pune@sansad.in',
      phone: '+91 20 2612 0000',
      attendance: '94%',
      type: 'MP',
    },
    {
      role: 'Member of Legislative Assembly',
      name: 'Chandrakant Patil',
      party: 'Bharatiya Janata Party',
      constituency: 'Kothrud Vidhan Sabha',
      term: '2024 – 2029',
      contact: 'mla.kothrud@maharashtra.gov.in',
      phone: '+91 20 2543 0000',
      attendance: '88%',
      type: 'MLA',
    },
  ],

  funds: {
    spending: 84,        // ₹ crore
    ongoing: 12,
    completed: 4,
    utilization: 78,     // %
  },

  projects: [
    {
      id: 'p1', name: 'Karve Road Resurfacing Phase II',
      department: 'PWD Maharashtra', category: 'Roads',
      budget: 12.4, status: 'In Progress', progress: 62,
      completion: 'Dec 2026', contractor: 'Sahyadri Infra Pvt Ltd',
      distance: 0.8, lat: 18.504, lng: 73.815,
    },
    {
      id: 'p2', name: 'Kothrud STP Capacity Expansion',
      department: 'PMC Water Supply', category: 'Water',
      budget: 28.6, status: 'In Progress', progress: 41,
      completion: 'Aug 2027', contractor: 'JalNirmiti Engineers',
      distance: 1.4, lat: 18.512, lng: 73.802,
    },
    {
      id: 'p3', name: 'Mahatma Society Smart Classroom Upgrade',
      department: 'Education Dept · Maharashtra', category: 'Schools',
      budget: 3.2, status: 'Completed', progress: 100,
      completion: 'Mar 2026', contractor: 'EduTech Solutions',
      distance: 1.1, lat: 18.514, lng: 73.811,
    },
    {
      id: 'p4', name: 'Karve Nagar Primary Health Centre',
      department: 'PMC Health Department', category: 'Healthcare',
      budget: 9.8, status: 'In Progress', progress: 78,
      completion: 'Oct 2026', contractor: 'MediBuild Constructions',
      distance: 1.9, lat: 18.499, lng: 73.821,
    },
    {
      id: 'p5', name: 'Paud Road Flyover Pier Works',
      department: 'PMRDA', category: 'Infrastructure',
      budget: 18.0, status: 'Delayed', progress: 34,
      completion: 'Mar 2026 (revised)', contractor: 'Konark Infraprojects',
      distance: 2.4, lat: 18.520, lng: 73.795,
    },
    {
      id: 'p6', name: 'Erandwane Storm Water Drains',
      department: 'PMC Drainage', category: 'Water',
      budget: 5.6, status: 'Completed', progress: 100,
      completion: 'Jan 2026', contractor: 'Pune CivilCorp',
      distance: 2.8, lat: 18.508, lng: 73.829,
    },
    {
      id: 'p7', name: 'Bhugaon Junction Signalisation',
      department: 'Traffic Police · PMC', category: 'Roads',
      budget: 1.4, status: 'Completed', progress: 100,
      completion: 'Feb 2026', contractor: 'SignalTech India',
      distance: 3.1, lat: 18.494, lng: 73.785,
    },
    {
      id: 'p8', name: 'Kothrud Sports Complex Renovation',
      department: 'PMC Sports Dept', category: 'Infrastructure',
      budget: 7.2, status: 'Planned', progress: 0,
      completion: 'Jun 2027', contractor: 'TBD (Tender stage)',
      distance: 1.6, lat: 18.516, lng: 73.806,
    },
    {
      id: 'p9', name: 'Rajaram Bridge Strengthening',
      department: 'PWD Maharashtra', category: 'Infrastructure',
      budget: 4.5, status: 'In Progress', progress: 55,
      completion: 'Nov 2026', contractor: 'Maratha Constructions',
      distance: 3.6, lat: 18.493, lng: 73.832,
    },
    {
      id: 'p10', name: 'Kothrud Zilla Parishad School Extension',
      department: 'Zilla Parishad Pune', category: 'Schools',
      budget: 2.7, status: 'Delayed', progress: 48,
      completion: 'Dec 2025 (revised)', contractor: 'Pune Builders Co.',
      distance: 2.0, lat: 18.517, lng: 73.815,
    },
  ],

  schemes: [
    {
      code: 'PMAY', name: 'Pradhan Mantri Awas Yojana',
      description: 'Affordable housing subsidy for urban and rural beneficiaries — interest subvention up to ₹2.67 lakh.',
      eligibility: 'Annual household income up to ₹18 lakh · No pucca house owned in India.',
      apply: 'https://pmaymis.gov.in/',
      learn: 'https://pmay-urban.gov.in/about',
    },
    {
      code: 'AB', name: 'Ayushman Bharat (PM-JAY)',
      description: 'Free cashless secondary and tertiary healthcare cover of ₹5 lakh per family per year at empanelled hospitals.',
      eligibility: 'Listed under SECC 2011 deprivation criteria or 70+ senior citizens.',
      apply: 'https://pmjay.gov.in/',
      learn: 'https://pmjay.gov.in/about-pmjay',
    },
    {
      code: 'PMK', name: 'PM Kisan Samman Nidhi',
      description: 'Direct income support of ₹6,000 per year credited in three equal installments to small and marginal farmers.',
      eligibility: 'Landholding farmers (excluding institutional landholders & income-tax payees).',
      apply: 'https://pmkisan.gov.in/',
      learn: 'https://pmkisan.gov.in/Documents/AboutPM-KISAN.pdf',
    },
    {
      code: 'JJM', name: 'Jal Jeevan Mission',
      description: 'Functional household tap connection (FHTC) providing 55 LPCD of potable water to every rural household.',
      eligibility: 'All rural households across India.',
      apply: 'https://jaljeevanmission.gov.in/',
      learn: 'https://jaljeevanmission.gov.in/about-jjm',
    },
    {
      code: 'SI', name: 'Skill India Mission (PMKVY 4.0)',
      description: 'Free short-term industry-aligned skilling and certification across 400+ job roles with placement support.',
      eligibility: 'Indian citizens aged 15–45 years, with a valid Aadhaar.',
      apply: 'https://www.pmkvyofficial.org/',
      learn: 'https://www.msde.gov.in/',
    },
  ],

  complaints: [
    { name: 'PMC Municipal Complaints', desc: 'Garbage, drains, encroachments and ward-level municipal issues in Pune.', url: 'https://www.pmc.gov.in/en/online-complaint', icon: 'building' },
    { name: 'Road & Pothole Complaints', desc: 'Report potholes, broken footpaths and damaged road furniture across Maharashtra.', url: 'https://pgportal.gov.in/', icon: 'road' },
    { name: 'Water Supply Complaints', desc: 'No water, leakages, contamination or billing issues with PMC Water Supply.', url: 'https://www.pmc.gov.in/en/water-supply', icon: 'drop' },
    { name: 'MSEDCL Electricity Complaints', desc: 'Power cuts, voltage fluctuation, faulty meters and new connection issues.', url: 'https://www.mahadiscom.in/consumer/', icon: 'bolt' },
    { name: 'Aaple Sarkar — State Grievance', desc: 'Single window grievance redressal for any Government of Maharashtra service.', url: 'https://grievances.maharashtra.gov.in/', icon: 'shield' },
  ],
};

/* =========================================================
   2. API ABSTRACTION LAYER
   Real data sources used today:
     • OpenStreetMap Nominatim     — reverse geocoding
     • OpenStreetMap Overpass API  — real public infrastructure near you
     • Wikipedia REST API          — constituency / area info
   Mock fallbacks remain for:
     • Representatives  (no public MP/MLA API in India)
     • Project budgets  (sources are PDFs, not APIs)
     • Schemes & complaint portals (already real URLs to gov sites)
========================================================= */

// --- Geolocation helpers ---
const getBrowserCoords = () => new Promise((resolve, reject) => {
  if (!('geolocation' in navigator)) {
    reject(new Error('Geolocation is not supported by this browser.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    (err) => reject(err),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
});

// Reverse geocode via OpenStreetMap Nominatim (no API key required).
const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const a = data.address || {};
  const ward = a.suburb || a.neighbourhood || a.village || a.hamlet || a.quarter || a.city_district || 'Unknown ward';
  const cityOrTown = a.city || a.town || a.municipality || a.village || a.county || 'Local area';
  const district = a.state_district || a.county || cityOrTown;
  const state = a.state || 'India';
  const pincode = a.postcode || '—';
  const shortAddr = [a.suburb || a.neighbourhood, cityOrTown].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Your location';
  return {
    coords: { lat, lng },
    address: shortAddr,
    ward: `Ward · ${ward}`,
    assembly: `${cityOrTown} Assembly Constituency`,    // best-effort — exact mapping needs ECI shapefiles
    loksabha: `${district} Lok Sabha Constituency`,     // best-effort — exact mapping needs ECI shapefiles
    district,
    state,
    pincode,
    raw: a,
  };
};

// ---- OpenStreetMap Overpass API ----
// Returns real public infrastructure (schools, hospitals, govt offices,
// police stations, water works, etc.) within `radiusM` metres of (lat, lng).
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const fetchOverpass = async (query) => {
  let lastErr;
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All Overpass endpoints failed');
};

// Tag → human-readable category, department, badge style.
const ASSET_TAXONOMY = {
  // Education
  school:          { category: 'Schools',      department: 'Education Department',          accent: 'primary' },
  college:         { category: 'Schools',      department: 'Higher Education Department',   accent: 'primary' },
  university:      { category: 'Schools',      department: 'Higher Education Department',   accent: 'primary' },
  kindergarten:    { category: 'Schools',      department: 'Women & Child Development',     accent: 'primary' },
  library:         { category: 'Schools',      department: 'Public Libraries Directorate',  accent: 'primary' },
  // Health
  hospital:        { category: 'Healthcare',   department: 'Health & Family Welfare',       accent: 'success' },
  clinic:          { category: 'Healthcare',   department: 'Health & Family Welfare',       accent: 'success' },
  doctors:         { category: 'Healthcare',   department: 'Health & Family Welfare',       accent: 'success' },
  pharmacy:        { category: 'Healthcare',   department: 'Health Department',             accent: 'success' },
  // Safety
  police:          { category: 'Infrastructure', department: 'State Police',                accent: 'primary' },
  fire_station:    { category: 'Infrastructure', department: 'Fire & Emergency Services',   accent: 'danger' },
  // Civic
  townhall:        { category: 'Infrastructure', department: 'Municipal Corporation',       accent: 'primary' },
  courthouse:      { category: 'Infrastructure', department: 'Department of Justice',       accent: 'primary' },
  post_office:     { category: 'Infrastructure', department: 'India Post',                  accent: 'primary' },
  community_centre:{ category: 'Infrastructure', department: 'Municipal Corporation',       accent: 'primary' },
  social_facility: { category: 'Healthcare',   department: 'Social Justice Department',     accent: 'success' },
  // Water
  water_tower:     { category: 'Water',        department: 'Water Supply Department',       accent: 'primary' },
  water_works:     { category: 'Water',        department: 'Water Supply Department',       accent: 'primary' },
  wastewater_plant:{ category: 'Water',        department: 'Sewerage Department',           accent: 'primary' },
  drinking_water:  { category: 'Water',        department: 'Water Supply Department',       accent: 'primary' },
  // Government generic
  government:      { category: 'Infrastructure', department: 'Government Office',           accent: 'primary' },
};

const classifyAsset = (tags = {}) => {
  if (tags.amenity && ASSET_TAXONOMY[tags.amenity]) return ASSET_TAXONOMY[tags.amenity];
  if (tags.office === 'government')                 return ASSET_TAXONOMY.government;
  if (tags.man_made && ASSET_TAXONOMY[tags.man_made]) return ASSET_TAXONOMY[tags.man_made];
  return { category: 'Infrastructure', department: 'Government Asset', accent: 'primary' };
};

const fetchPublicAssets = async ({ lat, lng, radiusM = 3000 }) => {
  const q = `
    [out:json][timeout:25];
    (
      node["amenity"~"^(school|college|university|kindergarten|library|hospital|clinic|doctors|pharmacy|police|fire_station|townhall|courthouse|post_office|community_centre|social_facility|drinking_water)$"](around:${radiusM},${lat},${lng});
      way["amenity"~"^(school|college|university|kindergarten|library|hospital|clinic|doctors|pharmacy|police|fire_station|townhall|courthouse|post_office|community_centre|social_facility)$"](around:${radiusM},${lat},${lng});
      node["office"="government"](around:${radiusM},${lat},${lng});
      way["office"="government"](around:${radiusM},${lat},${lng});
      node["man_made"~"^(water_tower|water_works|wastewater_plant)$"](around:${radiusM},${lat},${lng});
      way["man_made"~"^(water_tower|water_works|wastewater_plant)$"](around:${radiusM},${lat},${lng});
    );
    out center 80;
  `;
  const data = await fetchOverpass(q);
  const userCoords = { lat, lng };
  const seenNames = new Set();
  return (data.elements || [])
    .map(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (elLat == null || elLng == null) return null;
      const tags = el.tags || {};
      const klass = classifyAsset(tags);
      const name = tags.name || tags['name:en'] || tags.operator || `${klass.category} facility`;
      return {
        id: `osm-${el.type}-${el.id}`,
        name,
        department: tags.operator || klass.department,
        category: klass.category,
        budget: null,                          // OSM doesn't carry budget data
        status: 'Operational',                 // existing public asset
        progress: 100,
        completion: tags.start_date || 'In service',
        contractor: tags.operator || 'Government of India',
        distance: haversineKm(userCoords, { lat: elLat, lng: elLng }),
        lat: elLat, lng: elLng,
        source: 'OpenStreetMap',
        osmType: el.type,
        osmId: el.id,
        tags,
      };
    })
    .filter(Boolean)
    .filter(a => {
      // De-duplicate same-name assets within ~50 m.
      const key = `${a.name}|${a.lat.toFixed(3)}|${a.lng.toFixed(3)}`;
      if (seenNames.has(key)) return false;
      seenNames.add(key); return true;
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30);
};

// Compute live KPI tiles from real assets.
const computeFunds = (assets) => {
  const count = (cat) => assets.filter(a => a.category === cat).length;
  return {
    assetsNearby:  assets.length,
    schools:       count('Schools'),
    healthcare:    count('Healthcare'),
    waterInfra:    count('Water'),
    infrastructure:count('Infrastructure'),
    coverage:      Math.min(100, Math.round((assets.length / 25) * 100)), // 25 assets = 100% coverage proxy
  };
};

// Wikipedia REST API — fetches a short summary for an area / constituency.
const fetchWikipediaSummary = async (title) => {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation') return null;
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page,
    thumbnail: data.thumbnail?.source,
  };
};

const API = {
  // Get the user's civic location.
  async getLocation({ useGPS = false } = {}) {
    if (!useGPS) { await delay(300); return MOCK.location; }
    const { lat, lng } = await getBrowserCoords();
    try { return await reverseGeocode(lat, lng); }
    catch (e) {
      return {
        coords: { lat, lng },
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        ward: 'Ward · unavailable',
        assembly: 'Assembly · unavailable',
        loksabha: 'Lok Sabha · unavailable',
        district: 'Unavailable', state: 'Unavailable', pincode: '—',
      };
    }
  },

  // NOTE: India has no open API for current MP/MLA data. We show real
  // constituency-level context from Wikipedia + official-portal links so
  // users can verify the current representative on sansad.in / their
  // state assembly site. Demo cards remain as illustrative defaults.
  async getRepresentatives({ loc } = {}) {
    await delay(60);
    if (!loc || loc === MOCK.location) return MOCK.representatives;
    return [
      {
        role: 'Member of Parliament',
        name: 'Verify on sansad.in',
        party: 'Live MP directory',
        constituency: loc.loksabha,
        term: 'Current Lok Sabha',
        contact: 'feedback@sansad.in',
        phone: '+91 11 2303 5040',
        attendance: '—',
        type: 'MP',
        verifyUrl: `https://sansad.in/ls/members`,
      },
      {
        role: 'Member of Legislative Assembly',
        name: 'Verify on state portal',
        party: 'Live MLA directory',
        constituency: loc.assembly,
        term: `${loc.state} Assembly`,
        contact: 'cs@maharashtra.gov.in',
        phone: '—',
        attendance: '—',
        type: 'MLA',
        verifyUrl: `https://www.google.com/search?q=${encodeURIComponent(loc.state + ' legislative assembly MLA ' + (loc.raw?.suburb || loc.district || ''))}`,
      },
    ];
  },

  // REAL DATA via OpenStreetMap Overpass — public infrastructure within ~3 km.
  async getPublicAssets({ coords, radiusM = 3000 } = {}) {
    if (!coords) return [];
    return fetchPublicAssets({ lat: coords.lat, lng: coords.lng, radiusM });
  },

  // Demo project list (with budgets & contractors). Used as fallback only.
  async getProjects() { await delay(120); return MOCK.projects.map(p => ({ ...p })); },

  // Real Indian welfare schemes with real apply / learn URLs.
  async getSchemes() { await delay(80); return MOCK.schemes; },

  // Computed live from real assets when available.
  async getFunds() { await delay(80); return MOCK.funds; },

  // Real complaint portal URLs (PMC, MSEDCL, Aaple Sarkar, CPGRAMS).
  async getComplaintPortals() { await delay(60); return MOCK.complaints; },

  // Wikipedia summary for a constituency / locality.
  async getAreaInfo(title) { return fetchWikipediaSummary(title); },
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Haversine distance in km.
const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Translate demo project pins around the user (used only when fallback to demo).
const relocateProjects = (projects, userCoords) => {
  const origin = MOCK.location.coords;
  const dLat = userCoords.lat - origin.lat;
  const dLng = userCoords.lng - origin.lng;
  return projects.map(p => {
    const lat = p.lat + dLat;
    const lng = p.lng + dLng;
    const distance = haversineKm(userCoords, { lat, lng });
    return { ...p, lat, lng, distance };
  });
};

/* =========================================================
   3. DOM HELPERS · TOAST · LOADER
========================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const formatINR = (cr) => {
  if (cr >= 1) return `₹${cr.toFixed(cr % 1 === 0 ? 0 : 1)} Cr`;
  return `₹${(cr * 100).toFixed(0)} L`;
};

const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const initials = (name) => name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const ICONS = {
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 21V11a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10M9 7h2M9 11h2M9 15h2"/></svg>',
  road:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21l4-18M20 21l-4-18M12 4v2M12 10v2M12 16v2"/></svg>',
  drop:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"/></svg>',
  bolt:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  shield:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  phone:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
  pin:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z"/><circle cx="12" cy="9" r="2.6"/></svg>',
  ward:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>',
  assembly: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V11l7-5 7 5v10M9 21v-6h6v6"/></svg>',
  parliament: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18M4 22V10M20 22V10M8 22V10M12 22V10M16 22V10M2 10h20L12 3z"/></svg>',
  district: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></svg>',
  state:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
  check:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  info:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warn:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>',
};

/* ---- Toast ---- */
const Toast = (() => {
  const stack = $('#toasts');
  return {
    show({ title, message = '', type = 'info', duration = 3800 } = {}) {
      if (!stack) return;
      const el = document.createElement('div');
      el.className = `toast toast--${type}`;
      el.innerHTML = `
        <div class="toast__icon">${type === 'success' ? ICONS.check : type === 'warning' ? ICONS.warn : type === 'danger' ? ICONS.warn : ICONS.info}</div>
        <div class="toast__body">
          <div class="toast__title">${escapeHTML(title)}</div>
          ${message ? `<div class="toast__msg">${escapeHTML(message)}</div>` : ''}
        </div>
      `;
      stack.appendChild(el);
      setTimeout(() => {
        el.classList.add('is-leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }, duration);
    },
  };
})();

/* ---- Loader ---- */
const Loader = (() => {
  const el = $('#loader');
  const text = $('#loaderText');
  return {
    show(msg = 'Loading…') { if (!el) return; text.textContent = msg; el.hidden = false; },
    hide() { if (!el) return; el.hidden = true; },
  };
})();

/* =========================================================
   4. THEME TOGGLE (localStorage persistent)
========================================================= */
const Theme = (() => {
  const KEY = 'kma-theme';
  const root = document.documentElement;

  const apply = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked */ }
  };
  const init = () => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    apply(saved || sys);
    const btn = $('#themeToggle');
    btn?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      Toast.show({ title: next === 'dark' ? 'Dark mode on' : 'Light mode on', type: 'info', duration: 1800 });
    });
  };
  return { init };
})();

/* =========================================================
   5. NAVIGATION · scroll state + mobile menu + smooth scroll
========================================================= */
const Nav = (() => {
  const init = () => {
    const nav = $('#nav');
    const links = $('.nav__links');
    const toggle = $('#menuToggle');

    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    toggle?.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
    });

    $$('.nav__links a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
      });
    });
  };
  return { init };
})();

/* =========================================================
   6. ANIMATED COUNTERS
========================================================= */
const Counters = (() => {
  const animate = (el) => {
    if (el.dataset.done === '1') return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const value = target * easeOut(p);
      el.textContent = prefix + (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const init = () => {
    const els = $$('[data-counter]');
    if (!('IntersectionObserver' in window)) { els.forEach(animate); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  };
  return { init };
})();

/* =========================================================
   7. REVEAL ON SCROLL
========================================================= */
const Reveal = (() => {
  const init = () => {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  };
  return { init };
})();

/* =========================================================
   8. RENDERERS
========================================================= */

/* ---- Location cards ---- */
const renderLocation = (loc) => {
  const grid = $('#locationGrid');
  if (!grid) return;
  const items = [
    { label: 'Current Location', value: `${loc.address} · ${loc.pincode}`, icon: ICONS.pin, hero: true },
    { label: 'Ward', value: loc.ward, icon: ICONS.ward },
    { label: 'Assembly Constituency', value: loc.assembly, icon: ICONS.assembly },
    { label: 'Lok Sabha Constituency', value: loc.loksabha, icon: ICONS.parliament },
    { label: 'District', value: loc.district, icon: ICONS.district },
    { label: 'State', value: loc.state, icon: ICONS.state },
  ];
  grid.innerHTML = items.map(i => `
    <article class="loc-card ${i.hero ? 'loc-card--hero' : ''} reveal">
      <div class="loc-card__icon">${i.icon}</div>
      <div class="loc-card__label">${escapeHTML(i.label)}</div>
      <div class="loc-card__value">${escapeHTML(i.value)}</div>
    </article>
  `).join('');
  Reveal.init();
};

/* ---- Representatives ---- */
const renderReps = (reps) => {
  const grid = $('#repGrid');
  if (!grid) return;
  grid.innerHTML = reps.map(r => `
    <article class="rep-card reveal">
      <div class="rep-card__head">
        <div class="rep-card__avatar" aria-hidden="true">${initials(r.name)}</div>
        <div>
          <div class="rep-card__role">${escapeHTML(r.role)}</div>
          <div class="rep-card__name">${escapeHTML(r.name)}</div>
          <div class="rep-card__party">${escapeHTML(r.party)}</div>
        </div>
      </div>
      <div class="rep-card__meta">
        <div><span>Constituency</span><b>${escapeHTML(r.constituency)}</b></div>
        <div><span>Term</span><b>${escapeHTML(r.term)}</b></div>
        <div><span>Attendance</span><b>${escapeHTML(r.attendance)}</b></div>
        <div><span>Phone</span><b>${escapeHTML(r.phone)}</b></div>
      </div>
      <div class="rep-card__actions">
        ${r.verifyUrl
          ? `<a class="btn btn--primary btn--sm" href="${r.verifyUrl}" target="_blank" rel="noopener">${ICONS.external} Verify current rep</a>`
          : `<a class="btn btn--ghost btn--sm" href="mailto:${encodeURIComponent(r.contact)}">${ICONS.mail} Email</a>
             <a class="btn btn--ghost btn--sm" href="tel:${r.phone.replace(/\s+/g,'')}">${ICONS.phone} Call</a>`}
      </div>
    </article>
  `).join('');
  Reveal.init();
};

/* ---- Schemes ---- */
const renderSchemes = (schemes) => {
  const grid = $('#schemeGrid');
  if (!grid) return;
  grid.innerHTML = schemes.map(s => `
    <article class="scheme reveal">
      <div class="scheme__badge">${escapeHTML(s.code)}</div>
      <div class="scheme__name">${escapeHTML(s.name)}</div>
      <p class="scheme__desc">${escapeHTML(s.description)}</p>
      <div class="scheme__eligibility"><b>Eligibility</b>${escapeHTML(s.eligibility)}</div>
      <div class="scheme__actions">
        <a class="btn btn--primary btn--sm" href="${s.apply}" target="_blank" rel="noopener">Apply ${ICONS.external}</a>
        <a class="btn btn--ghost btn--sm" href="${s.learn}" target="_blank" rel="noopener">Learn More</a>
      </div>
    </article>
  `).join('');
  Reveal.init();
};

/* ---- Complaint portals ---- */
const renderComplaints = (items) => {
  const grid = $('#complaintGrid');
  if (!grid) return;
  grid.innerHTML = items.map(c => `
    <article class="complaint reveal">
      <div class="complaint__icon">${ICONS[c.icon] || ICONS.shield}</div>
      <div class="complaint__name">${escapeHTML(c.name)}</div>
      <p class="complaint__desc">${escapeHTML(c.desc)}</p>
      <a class="btn btn--primary btn--sm btn--block" href="${c.url}" target="_blank" rel="noopener">Visit Portal ${ICONS.external}</a>
    </article>
  `).join('');
  Reveal.init();
};

/* =========================================================
   9. PROJECTS · render + search + filter + modal
========================================================= */
const Projects = (() => {
  let all = [];
  let activeFilter = 'All';
  let query = '';

  const statusBadge = (s) => {
    const map = {
      'Completed': 'badge--success',
      'In Progress': 'badge--primary',
      'Delayed': 'badge--danger',
      'Planned': 'badge--muted',
      'Operational': 'badge--success',
    };
    return `<span class="badge ${map[s] || 'badge--muted'}">${escapeHTML(s)}</span>`;
  };

  const budgetCell = (p) =>
    p.budget != null
      ? `<div><span>Budget</span><b>${formatINR(p.budget)}</b></div>`
      : `<div><span>Type</span><b>Public Asset</b></div>`;

  const sourceBadge = (p) =>
    p.source ? `<span class="badge badge--muted" title="Data from ${escapeHTML(p.source)}">${escapeHTML(p.source)}</span>` : '';

  const cardHTML = (p) => `
    <article class="project reveal" data-id="${escapeHTML(p.id)}" data-status="${escapeHTML(p.status)}" tabindex="0" role="button" aria-label="View ${escapeHTML(p.name)}">
      <div class="project__head">
        <div>
          <div class="project__cat">${escapeHTML(p.category)}</div>
          <div class="project__title">${escapeHTML(p.name)}</div>
          <div class="project__dept">${escapeHTML(p.department)}</div>
        </div>
        ${statusBadge(p.status)}
      </div>
      <div class="project__meta">
        ${budgetCell(p)}
        <div><span>Status</span><b>${escapeHTML(p.completion)}</b></div>
        <div><span>Operator</span><b>${escapeHTML(p.contractor)}</b></div>
        <div><span>Distance</span><b>${p.distance.toFixed(1)} km</b></div>
      </div>
      <div class="project__progress" aria-label="Progress ${p.progress}%"><div style="width:${p.progress}%"></div></div>
      <div class="project__foot">
        <span>${ICONS.pin} ${p.distance.toFixed(1)} km away</span>
        ${sourceBadge(p)}
      </div>
    </article>
  `;

  const render = () => {
    const grid = $('#projectGrid');
    const empty = $('#projectEmpty');
    const q = query.trim().toLowerCase();
    const filtered = all.filter(p => {
      const matchFilter = activeFilter === 'All' || p.category === activeFilter;
      const matchQuery = !q || [p.name, p.department, p.contractor, p.category, p.status].some(v => v.toLowerCase().includes(q));
      return matchFilter && matchQuery;
    });

    grid.innerHTML = filtered.map(cardHTML).join('');
    empty.hidden = filtered.length > 0;

    // animate progress bars after they enter DOM
    requestAnimationFrame(() => {
      $$('.project__progress div', grid).forEach(d => {
        const w = d.style.width;
        d.style.width = '0%';
        requestAnimationFrame(() => { d.style.width = w; });
      });
    });

    Reveal.init();
  };

  const openModal = (id) => {
    const p = all.find(x => x.id === id);
    if (!p) return;
    const body = $('#modalBody');
    const osmLink = p.osmType && p.osmId
      ? `<a class="btn btn--ghost btn--sm" href="https://www.openstreetmap.org/${p.osmType}/${p.osmId}" target="_blank" rel="noopener">${ICONS.external} View on OpenStreetMap</a>`
      : '';
    body.innerHTML = `
      <span class="pill"><span class="pill__dot"></span>${escapeHTML(p.category)}</span>
      <h3 style="margin: 14px 0 6px; font-size: 1.5rem;">${escapeHTML(p.name)}</h3>
      <p style="color: var(--muted); margin-bottom: 18px;">${escapeHTML(p.department)}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 18px;">
        ${statusBadge(p.status)}
        ${p.source ? `<span class="badge badge--muted">Source · ${escapeHTML(p.source)}</span>` : `<span class="badge badge--muted">${p.progress}% complete</span>`}
      </div>
      ${p.budget != null ? `<div class="modal-row"><span>Budget</span><b>${formatINR(p.budget)}</b></div>` : ''}
      <div class="modal-row"><span>Status</span><b>${escapeHTML(p.status)}</b></div>
      <div class="modal-row"><span>${p.budget != null ? 'Expected completion' : 'In service since'}</span><b>${escapeHTML(p.completion)}</b></div>
      <div class="modal-row"><span>${p.budget != null ? 'Contractor' : 'Operator'}</span><b>${escapeHTML(p.contractor)}</b></div>
      <div class="modal-row"><span>Distance from you</span><b>${p.distance.toFixed(1)} km</b></div>
      <div class="modal-row"><span>Coordinates</span><b>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</b></div>
      ${p.budget != null ? `<div class="project__progress" style="margin: 20px 0 0;"><div style="width:${p.progress}%"></div></div>` : ''}
      <div style="margin-top: 24px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn--primary btn--sm" id="modalReport">${ICONS.warn} Report an issue</button>
        <button class="btn btn--ghost btn--sm" id="modalShare">${ICONS.external} Share</button>
        ${osmLink}
      </div>
    `;
    const modal = $('#projectModal');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    $('#modalReport')?.addEventListener('click', () => {
      Toast.show({ title: 'Complaint logged', message: 'Issue reported to the relevant department.', type: 'success' });
    });
    $('#modalShare')?.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}#projects`;
      try {
        if (navigator.share) {
          await navigator.share({ title: p.name, text: `${p.name} · ${p.category}`, url });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Toast.show({ title: 'Link copied', type: 'success' });
        }
      } catch (e) { /* user cancelled */ }
    });
  };

  const closeModal = () => {
    const modal = $('#projectModal');
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  const init = (projects) => {
    all = projects;
    if (init._wired) { render(); return; }
    init._wired = true;
    render();

    // Search
    $('#projectSearch')?.addEventListener('input', (e) => {
      query = e.target.value;
      render();
    });

    // Filters
    $$('#projectFilters .chip').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#projectFilters .chip').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    // Card click (event delegation)
    $('#projectGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.project');
      if (card) openModal(card.dataset.id);
    });
    $('#projectGrid')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.project');
        if (card) { e.preventDefault(); openModal(card.dataset.id); }
      }
    });

    // Modal close
    $$('#projectModal [data-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#projectModal').hidden) closeModal();
    });
  };

  return { init };
})();

/* =========================================================
   10. LEAFLET SPENDING MAP
========================================================= */
const SpendingMap = (() => {
  let map = null;

  const statusClass = (s) => ({
    'Completed':   's-completed',
    'Operational': 's-completed',
    'In Progress': 's-progress',
    'Delayed':     's-delayed',
    'Planned':     's-planned',
  })[s] || 's-planned';

  const popupHTML = (p) => `
    <div>
      <div class="popup-title">${escapeHTML(p.name)}</div>
      <div class="popup-dept">${escapeHTML(p.department)}</div>
      <div class="popup-row"><span>Status</span><b>${escapeHTML(p.status)}</b></div>
      ${p.budget != null ? `<div class="popup-row"><span>Budget</span><b>${formatINR(p.budget)}</b></div>` : ''}
      <div class="popup-row"><span>${p.budget != null ? 'Contractor' : 'Operator'}</span><b>${escapeHTML(p.contractor)}</b></div>
      <div class="popup-row"><span>Distance</span><b>${p.distance.toFixed(1)} km</b></div>
      ${p.source ? `<div class="popup-row"><span>Source</span><b>${escapeHTML(p.source)}</b></div>` : ''}
    </div>
  `;

  const init = (loc, projects) => {
    if (typeof L === 'undefined') return; // Leaflet not loaded
    const el = $('#leafletMap');
    if (!el) return;

    // Tear down any previous instance so we can re-render with new coords.
    if (map) { map.remove(); map = null; el.innerHTML = ''; }

    map = L.map(el, {
      center: [loc.coords.lat, loc.coords.lng],
      zoom: 14,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(map);

    // "You are here" marker
    const youIcon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:4px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([loc.coords.lat, loc.coords.lng], { icon: youIcon })
      .addTo(map)
      .bindPopup('<b>You are here</b><br>' + escapeHTML(loc.address));

    // Project markers
    projects.forEach(p => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="kma-marker ${statusClass(p.status)}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(popupHTML(p));
    });

    // Re-enable wheel zoom only after click (better UX while scrolling page)
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
  };

  return { init };
})();

/* =========================================================
   11. TRANSPARENCY SCORE · ring + bars
========================================================= */
const Score = (() => {
  const injectGradient = () => {
    const svg = $('.ring');
    if (!svg || $('#ringGrad')) return;
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const g = document.createElementNS(ns, 'linearGradient');
    g.id = 'ringGrad';
    g.setAttribute('x1', '0%'); g.setAttribute('y1', '0%');
    g.setAttribute('x2', '100%'); g.setAttribute('y2', '100%');
    const s1 = document.createElementNS(ns, 'stop');
    s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#2563EB');
    const s2 = document.createElementNS(ns, 'stop');
    s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#0EA5E9');
    g.appendChild(s1); g.appendChild(s2); defs.appendChild(g);
    svg.insertBefore(defs, svg.firstChild);
  };

  const animateRing = () => {
    const ring = $('#ringFg');
    if (!ring) return;
    const score = 82;
    const circumference = 2 * Math.PI * 68; // r=68 → ~427
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = circumference * (1 - score / 100);
    });
  };

  const animateBars = () => {
    $$('.bar').forEach(bar => {
      const target = parseFloat(bar.dataset.target) || 0;
      const fill = $('.bar__fill', bar);
      requestAnimationFrame(() => { fill.style.width = target + '%'; });
    });
  };

  const init = () => {
    injectGradient();
    const section = $('#score');
    if (!section || !('IntersectionObserver' in window)) {
      animateRing(); animateBars(); return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateRing();
          animateBars();
          io.disconnect();
        }
      });
    }, { threshold: 0.3 });
    io.observe(section);
  };
  return { init };
})();

/* =========================================================
   12. BOOT
========================================================= */

// Update the KPI tiles. Accepts either demo funds OR computed-live funds.
function renderKPIs(funds, { live = false } = {}) {
  const tiles = $$('.kpi');
  if (!tiles.length) return;

  const update = (idx, value, suffix = '', prefix = '', label, trend) => {
    const tile = tiles[idx];
    if (!tile) return;
    const span = $('[data-counter]', tile);
    if (span) {
      span.dataset.target = value;
      span.dataset.prefix = prefix;
      span.dataset.suffix = suffix;
      span.dataset.done = '';
      span.textContent = `${prefix}0${suffix}`;
    }
    if (label) $('.kpi__label', tile).textContent = label;
    if (trend) $('.kpi__trend', tile).textContent = trend;
  };

  if (live) {
    update(0, funds.assetsNearby, '', '', 'Public Assets Nearby', 'Live · OpenStreetMap');
    update(1, funds.schools,      '', '', 'Schools & Libraries',  'Within 3 km radius');
    update(2, funds.healthcare,   '', '', 'Healthcare Facilities','Hospitals · clinics · pharmacies');
    update(3, funds.waterInfra + funds.infrastructure, '', '', 'Govt Offices & Utilities', 'Police · municipal · water');
  } else {
    update(0, funds.spending,    ' Cr', '₹', 'Public Spending Nearby', '▲ 12% vs last year');
    update(1, funds.ongoing,     '',    '',  'Ongoing Projects',       'In active execution');
    update(2, funds.completed,   '',    '',  'Completed Projects',     '▲ Delivered this FY');
    update(3, funds.utilization, '%',   '',  'Fund Utilization',       'Sanctioned vs spent');
  }
  // Re-trigger counter animation for the new values.
  $$('.kpi [data-counter]').forEach(el => {
    el.dataset.done = '';
  });
  // Section eyebrow + title + sub
  const head = $('#money .section__head');
  if (head) {
    head.querySelector('.eyebrow').textContent = live ? 'Live · within 3 km' : 'The numbers';
    head.querySelector('.section__title').textContent = live ? 'Civic infrastructure around you' : 'Money around me';
    head.querySelector('.section__sub').textContent = live
      ? 'Real public assets tagged in OpenStreetMap within a 3 km radius of your detected location.'
      : 'Aggregated public spending within a 5 km radius of your detected location.';
  }
  // Kick counters again now that targets changed.
  Counters.init();
}

async function detectAndRender({ useGPS = false, silent = false } = {}) {
  if (!silent) Loader.show(useGPS ? 'Requesting location permission…' : 'Loading…');
  try {
    const loc = await API.getLocation({ useGPS });

    // Fire all secondary requests in parallel.
    const [reps, schemes, complaints, demoProjects] = await Promise.all([
      API.getRepresentatives({ loc }),
      API.getSchemes(),
      API.getComplaintPortals(),
      API.getProjects(),
    ]);

    // Render the location + reps + static catalogues right away so the user
    // sees something while the (slower) Overpass request resolves.
    renderLocation(loc);
    renderReps(reps);
    renderSchemes(schemes);
    renderComplaints(complaints);

    // Project / map data: try real OSM assets first; fall back to the demo
    // catalogue if Overpass is slow, blocked or returns nothing.
    let projectsForUI = relocateProjects(demoProjects, loc.coords);
    let funds = MOCK.funds;
    let live = false;

    if (useGPS) {
      if (!silent) Loader.show('Fetching real public infrastructure from OpenStreetMap…');
      try {
        const assets = await API.getPublicAssets({ coords: loc.coords, radiusM: 3000 });
        if (assets && assets.length >= 3) {
          projectsForUI = assets;
          funds = computeFunds(assets);
          live = true;
        } else if (!silent) {
          Toast.show({
            title: 'Few tagged assets here',
            message: 'OpenStreetMap has limited coverage at this location — showing illustrative data.',
            type: 'warning',
          });
        }
      } catch (e) {
        console.warn('Overpass failed', e);
        if (!silent) Toast.show({ title: 'Live data unavailable', message: 'OpenStreetMap is busy — showing illustrative data.', type: 'warning' });
      }
    }

    renderKPIs(funds, { live });
    Projects.init(projectsForUI);
    SpendingMap.init(loc, projectsForUI);

    if (!silent) {
      Toast.show({
        title: useGPS ? (live ? 'Live data loaded' : 'Location detected') : 'Demo area loaded',
        message: `${loc.address}${loc.state && loc.state !== 'Unavailable' ? ' · ' + loc.state : ''}${live ? ` · ${projectsForUI.length} public assets` : ''}`,
        type: 'success',
      });
    }
  } catch (err) {
    console.error(err);
    if (useGPS) {
      const code = err && typeof err.code === 'number' ? err.code : 0;
      const message =
        code === 1 ? 'Permission denied. Showing demo area instead.' :
        code === 2 ? 'Location unavailable. Showing demo area instead.' :
        code === 3 ? 'Request timed out. Showing demo area instead.' :
                     'Could not get your location. Showing demo area instead.';
      Toast.show({ title: 'Using demo location', message, type: 'warning' });
      Loader.hide();
      return detectAndRender({ useGPS: false, silent: true });
    }
    Toast.show({ title: 'Something went wrong', message: 'Please try again in a moment.', type: 'danger' });
  } finally {
    Loader.hide();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();

  Theme.init();
  Nav.init();
  Counters.init();
  Reveal.init();
  Score.init();

  // Initial silent render with demo data so the page is never empty.
  detectAndRender({ useGPS: false, silent: true });

  // Hero CTAs
  $('#useLocationBtn')?.addEventListener('click', async () => {
    if (!('geolocation' in navigator)) {
      Toast.show({ title: 'Not supported', message: 'Your browser does not support geolocation.', type: 'danger' });
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      Toast.show({ title: 'HTTPS required', message: 'Browsers only share location on https:// or localhost.', type: 'warning' });
      return;
    }
    await detectAndRender({ useGPS: true, silent: false });
    document.getElementById('location')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#exploreDemoBtn')?.addEventListener('click', async () => {
    await detectAndRender({ useGPS: false, silent: false });
    document.getElementById('money')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

})();
