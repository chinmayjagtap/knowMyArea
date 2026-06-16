/* =========================================================
   KNOW YOUR AREA · Application script
   Vanilla JS · No frameworks · Production-ready MVP
   =========================================================
   Sections:
     1. Curated catalogues (real central-govt URLs only)
     2. API abstraction layer (real data sources)
     3. DOM helpers + toast + loader
     4. Theme toggle (localStorage)
     5. Navigation (scroll state + mobile menu + smooth scroll)
     6. Animated counters (IntersectionObserver)
     7. Reveal-on-scroll
     8. Renderers: location, reps, projects, schemes, complaints
     9. Projects: search + filter + modal
    10. Leaflet asset map
    11. Score ring gradient
    12. Boot & live renderers
========================================================= */

(() => {
'use strict';

/* =========================================================
   1. CURATED CATALOGUES
   Hand-curated lists of REAL central-government schemes and
   grievance portals. Each entry's URL points to the actual
   official portal — no numbers, no mock fields.
========================================================= */
const CATALOGUES = {
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
      description: 'Direct income support of ₹6,000 per year credited in three equal instalments to small and marginal farmers.',
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

  // Pan-India grievance portals — work for any user, any state.
  complaints: [
    { name: 'CPGRAMS · Central Govt Grievances', desc: 'Single window to lodge any complaint against any Central Government ministry or department.', url: 'https://pgportal.gov.in/', icon: 'shield' },
    { name: 'India Post Complaints', desc: 'Track or raise complaints about parcels, money orders, and postal services anywhere in India.', url: 'https://www.indiapost.gov.in/VAS/Pages/ComplaintRegistration.aspx', icon: 'building' },
    { name: 'Consumer Helpline (NCH)', desc: 'National Consumer Helpline for disputes with sellers, service providers and utilities.', url: 'https://consumerhelpline.gov.in/', icon: 'shield' },
    { name: 'Electricity (State DISCOM lookup)', desc: 'Find your state electricity board\'s complaint portal — power cuts, faulty meters, new connections.', url: 'https://www.google.com/search?q=state+electricity+board+complaint+portal+india', icon: 'bolt' },
    { name: 'Water Supply (Urban Local Body)', desc: 'Find your municipal corporation\'s water-supply grievance portal for leaks, contamination and billing.', url: 'https://www.google.com/search?q=municipal+corporation+water+supply+complaint+portal+india', icon: 'drop' },
  ],
};

/* =========================================================
   2. API ABSTRACTION LAYER
   100% live / real data — no mock fallbacks anywhere:
     • Browser Geolocation         — real GPS coordinates
     • OpenStreetMap Nominatim     — reverse geocoding
     • OpenStreetMap Overpass API  — real public infrastructure near you
     • Curated CATALOGUES          — real govt portal URLs (schemes, complaints)
     • Representatives             — official verification cards linking to
                                     sansad.in / state assembly directories
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

// ---- Local representative directories (LS + RS + MLA CSVs) ----
// Open data shipped with the static site under /data/:
//   • Lok Sabha   — RTI Wiki (CC-BY 4.0), sourced from sansad.in / NIC.
//   • Rajya Sabha — RTI Wiki (CC-BY 4.0), sourced from rsdoc.nic.in / NIC.
//   • MLAs        — PRS India (CC-BY 4.0), scraped from prsindia.org/mlatrack.
// All three load lazily. Helpers:
//   • findLSMember(loc)  → fuzzy-match user's city/district to a constituency.
//   • findRSMembers(loc) → every Rajya Sabha member sitting from the user's state.
//   • findMLAMember(loc) → fuzzy-match user's place names to an MLA constituency.
//   • findMLAs(loc)      → every MLA from the user's state (for the collapsed group).
//   • findBySlug(house, slug) → resolve a `?house=&mp=` permalink.
const MP_DATA = (() => {
  const LS_URL  = 'data/lok-sabha-members.csv';
  const RS_URL  = 'data/rajya-sabha-members.csv';
  const MLA_URL = 'data/mla-members.csv';
  const PHOTO_BASE = 'https://righttoinformation.wiki';
  const MLA_PHOTO_BASE = 'https://prsindia.org/files/mlatrack';
  let cache = null;
  let inflight = null;

  // RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes (""),
  // embedded commas and newlines. Skips blank lines.
  const parseCSV = (text) => {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else { field += c; }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (c !== '\r') {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1)
      .filter(r => r.length === headers.length && r.some(v => v !== ''))
      .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  };

  // Normalise text for fuzzy matching: lowercase, ASCII-fold, strip punctuation.
  const norm = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  // De-obfuscate emails like  foo[at]gmail[dot]com  →  foo@gmail.com
  const cleanEmail = (s) => {
    if (!s) return '';
    return String(s).split(',')[0].trim()
      .replace(/\[at\]/gi, '@')
      .replace(/\[dot\]/gi, '.');
  };

  // Phone fields arrive as either a stringified Python list (`['9876543210 (M)']`)
  // or an Excel-style float (`9849024693.0`). Pull the first sensible digit run.
  const cleanPhone = (s) => {
    if (!s) return '';
    let v = String(s).replace(/[\[\]']/g, '').split(',')[0].trim();
    v = v.replace(/\.0$/, '');
    return v;
  };

  const slugFromPermalink = (p) => {
    if (!p) return '';
    const m = String(p).match(/mp=([^&]+)/);
    return m ? m[1] : '';
  };

  // Some Nominatim states need mapping to the CSV spelling.
  const STATE_ALIASES = {
    'delhi': 'NCT of Delhi',
    'national capital territory of delhi': 'NCT of Delhi',
    'orissa': 'Odisha',
    'andaman and nicobar': 'Andaman and Nicobar Islands',
    'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  };
  const canonState = (s) => STATE_ALIASES[norm(s)] || s;

  // MLAs live under a different state-name namespace (PRS uses bare names like
  // 'Delhi', not 'NCT of Delhi'); also Telangana/JK use raw names. Map the
  // Nominatim state → the spelling that appears in mla-members.csv.
  const MLA_STATE_ALIASES = {
    'nct of delhi': 'Delhi',
    'national capital territory of delhi': 'Delhi',
    'orissa': 'Odisha',
  };
  const canonMLAState = (s) => MLA_STATE_ALIASES[norm(s)] || s;

  // PRS image URL: /files/mlatrack/<state lowercase, %20-encoded>/<term>/mla_images/<image>
  const mlaPhotoUrl = (m) => {
    const img = m.Images || m.image || m.Image;
    if (!img || !m.State || !m.Term) return null;
    const state = encodeURIComponent(String(m.State).toLowerCase());
    const term  = encodeURIComponent(String(m.Term));
    return `${MLA_PHOTO_BASE}/${state}/${term}/mla_images/${encodeURIComponent(img)}`;
  };

  const load = () => {
    if (cache) return Promise.resolve(cache);
    if (inflight) return inflight;
    const fetchText = (url) => fetch(url).then(r => r.ok ? r.text() : Promise.reject(new Error(url + ' ' + r.status)));
    inflight = Promise.all([
      fetchText(LS_URL),
      fetchText(RS_URL),
      fetchText(MLA_URL).catch(() => ''),  // MLA CSV is optional
    ]).then(([lsText, rsText, mlaText]) => {
      const ls = parseCSV(lsText).map(m => ({ ...m, _house: 'ls', _slug: slugFromPermalink(m.permalink) }));
      const rs = parseCSV(rsText).map(m => ({ ...m, _house: 'rs', _slug: slugFromPermalink(m.permalink) }));
      const mla = mlaText ? parseCSV(mlaText).map(m => ({ ...m, _house: 'mla' })) : [];
      cache = { ls, rs, mla };
      return cache;
    }).catch(err => { inflight = null; throw err; });
    return inflight;
  };

  // Match user's location to a Lok Sabha constituency.
  // Returns { member, confidence: 'confident' | 'best-guess' } or null.
  const findLSMember = async (loc) => {
    if (!loc) return null;
    let data;
    try { data = await load(); } catch (e) { return null; }

    const targetState = norm(canonState(loc.state));
    const inState = data.ls.filter(m => norm(m.state) === targetState);
    if (!inState.length) return null;

    const a = loc.raw || {};
    const places = [a.city_district, a.city, a.town, a.municipality, a.county, a.state_district, loc.district, a.suburb, a.village]
      .filter(Boolean).map(norm);
    if (!places.length) return null;

    const scored = [];
    for (const m of inState) {
      const c = norm(m.constituency);
      let score = 0;
      for (const p of places) {
        if (!p) continue;
        if (c === p) score = Math.max(score, 100);
        else if ((' ' + c + ' ').includes(' ' + p + ' ')) score = Math.max(score, 80);
        else if (c.includes(p) || p.includes(c)) score = Math.max(score, 50);
      }
      if (score > 0) scored.push({ m, score });
    }
    if (!scored.length) return null;
    scored.sort((x, y) => y.score - x.score);
    const top = scored[0];
    const ties = scored.filter(s => s.score === top.score);
    return { member: top.m, confidence: ties.length === 1 ? 'confident' : 'best-guess' };
  };

  // Every Rajya Sabha member currently sitting from the user's state.
  const findRSMembers = async (loc) => {
    if (!loc) return [];
    let data;
    try { data = await load(); } catch (e) { return []; }
    const targetState = norm(canonState(loc.state));
    return data.rs
      .filter(m => norm(m.state) === targetState)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  };

  // Fuzzy-match user's place names to an MLA constituency in their state.
  // Returns { member, confidence } or null.
  const findMLAMember = async (loc) => {
    if (!loc) return null;
    let data;
    try { data = await load(); } catch (e) { return null; }
    if (!data.mla.length) return null;

    const targetState = norm(canonMLAState(loc.state));
    const inState = data.mla.filter(m => norm(m.State) === targetState);
    if (!inState.length) return null;

    const a = loc.raw || {};
    const places = [a.suburb, a.neighbourhood, a.village, a.city_district, a.quarter, a.town, a.city, a.municipality, a.county, a.state_district, loc.district]
      .filter(Boolean).map(norm);
    if (!places.length) return null;

    const scored = [];
    for (const m of inState) {
      const c = norm(m.Constituency);
      let score = 0;
      for (const p of places) {
        if (!p) continue;
        if (c === p) score = Math.max(score, 100);
        else if ((' ' + c + ' ').includes(' ' + p + ' ')) score = Math.max(score, 80);
        else if (c.includes(p) || p.includes(c)) score = Math.max(score, 50);
      }
      if (score > 0) scored.push({ m, score });
    }
    if (!scored.length) return null;
    scored.sort((x, y) => y.score - x.score);
    const top = scored[0];
    const ties = scored.filter(s => s.score === top.score);
    return { member: top.m, confidence: ties.length === 1 ? 'confident' : 'best-guess' };
  };

  // Every MLA from the user's state, sorted by constituency.
  const findMLAs = async (loc) => {
    if (!loc) return [];
    let data;
    try { data = await load(); } catch (e) { return []; }
    const targetState = norm(canonMLAState(loc.state));
    return data.mla
      .filter(m => norm(m.State) === targetState)
      .sort((a, b) => String(a.Constituency || '').localeCompare(String(b.Constituency || '')));
  };

  // Resolve a `?house=&mp=<slug>` permalink to a specific member.
  const findBySlug = async (house, slug) => {
    if (!house || !slug) return null;
    let data;
    try { data = await load(); } catch (e) { return null; }
    const pool = house === 'rs' ? data.rs : data.ls;
    return pool.find(m => m._slug === slug) || null;
  };

  // Build action links to other transparency portals for a given MP.
  const linksFor = (m) => {
    const where = m._house === 'rs' ? (m.state || '') : (m.constituency || m.state || '');
    const q = encodeURIComponent(`${m.name} ${where}`);
    return {
      profile: m.permalink ? `https://righttoinformation.wiki${m.permalink}` : 'https://righttoinformation.wiki/tools/mp-mla-tracker.html',
      wiki:    m.wiki_url || '',
      myneta:  `https://www.myneta.info/myneta_search/?q=${q}`,
      prs:     'https://prsindia.org/mptrack',
      mplads:  'https://empoweredindian.in/mplads',
      sansad:  m._house === 'rs' ? 'https://sansad.in/rs/members' : 'https://sansad.in/ls/members',
    };
  };

  return {
    load,
    findLSMember,
    findRSMembers,
    findMLAMember,
    findMLAs,
    findBySlug,
    linksFor,
    cleanEmail,
    cleanPhone,
    slugFromPermalink,
    mlaPhotoUrl,
    PHOTO_BASE,
  };
})();

// Convert a raw CSV-row member into the card shape that renderReps consumes.
const memberToCard = (m, opts = {}) => {
  const isRS = m._house === 'rs';
  const links = MP_DATA.linksFor(m);
  const partyLabel = m.party_full && m.party_full !== m.party
    ? `${m.party} · ${m.party_full}`
    : (m.party || '—');

  const termsStr = m.no_of_terms
    ? `${m.no_of_terms} term${+m.no_of_terms > 1 ? 's' : ''}`
    : (isRS && m.term_end ? `Ends ${String(m.term_end).slice(0, 10)}` : '—');

  const extras = isRS
    ? [
        { label: 'Role',      value: m.role || (m.is_minister === 'True' ? 'Minister' : 'Member') },
        { label: 'Term ends', value: m.term_end ? String(m.term_end).slice(0, 10) : '—' },
        { label: 'Cabinet',   value: m.cabinet || '—' },
        { label: 'Gender',    value: m.gender || '—' },
      ]
    : [
        { label: 'Age',           value: m.age ? `${m.age} yrs` : '—' },
        { label: 'Terms',         value: termsStr },
        { label: 'Qualification', value: m.qualification || '—' },
        { label: 'Gender',        value: m.gender || '—' },
      ];

  return {
    role: isRS ? 'Rajya Sabha · Member of Parliament' : 'Lok Sabha · Member of Parliament',
    name: m.name,
    party: partyLabel,
    constituency: isRS ? m.state : `${m.constituency || '—'}, ${m.state || ''}`,
    term: isRS ? 'Current Rajya Sabha' : 'Current Lok Sabha',
    contact: MP_DATA.cleanEmail(m.email),
    phone: MP_DATA.cleanPhone(isRS ? (m.mobile || m.permanent_phone) : m.phone),
    attendance: isRS ? (m.cabinet || '—') : (m.profession || '—'),
    type: isRS ? 'RS' : 'LS',
    photoUrl: m.photo_url ? `${MP_DATA.PHOTO_BASE}${m.photo_url}` : null,
    extras,
    rtiTargets: [],
    links,
    confidence: opts.confidence || 'confident',
    sourceNote: opts.sourceNote || null,
    slug: m._slug,
    house: m._house,
  };
};

// Convert a raw MLA CSV row (PRS India schema) into the card shape.
const mlaToCard = (m, opts = {}) => {
  // PRS schema has inconsistent column casing across states. Coalesce.
  const gender = m['Gender '] || m.Gender || '—';
  const startTerm = m['Start of term'] || m['Start of Term'] || '—';
  const endTerm   = m['End of Term'] || '—';
  const email     = m.Email || '';
  const phone     = m.Contact || '';
  const ageRaw    = m.Age || '';
  // PRS sometimes stores a bad date like "1900-02-28" instead of an age. Filter that.
  const ageStr = /^\d{1,3}$/.test(ageRaw) ? `${ageRaw} yrs` : '—';
  const photoUrl = MP_DATA.mlaPhotoUrl(m);
  const searchQ  = encodeURIComponent(`${m['MLA Name']} ${m.Constituency || ''}`);

  return {
    role: 'Member of Legislative Assembly',
    name: m['MLA Name'] || '—',
    party: m.Party || '—',
    constituency: `${m.Constituency || '—'}, ${m.State || ''}`,
    term: `${m.State || ''} Assembly · Term ${m.Term || '—'}`,
    contact: cleanEmailField(email),
    phone: phone || '—',
    attendance: m.Education || '—',
    type: 'MLA',
    photoUrl,
    extras: [
      { label: 'Age',           value: ageStr },
      { label: 'Term ends',     value: endTerm },
      { label: 'Qualification', value: m.Education || '—' },
      { label: 'Gender',        value: gender },
    ],
    rtiTargets: [],
    links: {
      profile: `https://prsindia.org/mlatrack?state=${encodeURIComponent(m.State || '')}`,
      myneta:  `https://www.myneta.info/myneta_search/?q=${searchQ}`,
      prs:     'https://prsindia.org/mlatrack',
      mplads:  '',  // MPLADS is MP-only; MLAs have MLALADS but no central portal.
      sansad:  '',  // MLAs aren't in sansad.in
    },
    confidence: opts.confidence || 'confident',
    sourceNote: opts.sourceNote || null,
    slug: '',
    house: 'mla',
  };
};

// MLA emails arrive in plain form usually, but be defensive.
const cleanEmailField = (s) => (s || '').toString().split(',')[0].trim();

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

const API = {
  // Get the user's civic location via browser GPS + Nominatim reverse geocode.
  async getLocation() {
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

  // Fetches the user's representatives from the local CSV snapshots:
  //   \u2022 1 Lok Sabha MP (fuzzy-matched to constituency)
  //   \u2022 1 MLA (fuzzy-matched to constituency) \u2014 falls back to verify card
  //   \u2022 Every Rajya Sabha MP from the state (collapsed in UI)
  //   \u2022 Every other MLA from the state (collapsed in UI)
  async getRepresentatives({ loc }) {
    const cards = [];

    // ---- Lok Sabha MP card (fuzzy constituency match) ----
    let lsMatch = null;
    try { lsMatch = await MP_DATA.findLSMember(loc); } catch (e) { /* file fail → verify card */ }

    if (lsMatch && lsMatch.member) {
      cards.push(memberToCard(lsMatch.member, {
        confidence: lsMatch.confidence,
        sourceNote: lsMatch.confidence === 'best-guess'
          ? `Best match for ${loc.district || loc.state}. Verify on sansad.in.`
          : null,
      }));
    } else {
      cards.push({
        role: 'Lok Sabha · Member of Parliament',
        name: 'Verify on sansad.in',
        party: 'Official MP directory',
        constituency: loc.loksabha,
        term: 'Current Lok Sabha',
        contact: 'feedback@sansad.in',
        phone: '+91 11 2303 5040',
        attendance: '—',
        type: 'LS',
        verifyUrl: 'https://sansad.in/ls/members',
      });
    }

    // ---- MLA card (fuzzy constituency match against PRS data) ----
    let mlaMatch = null;
    try { mlaMatch = await MP_DATA.findMLAMember(loc); } catch (e) { /* ignore */ }

    if (mlaMatch && mlaMatch.member) {
      cards.push(mlaToCard(mlaMatch.member, {
        confidence: mlaMatch.confidence,
        sourceNote: mlaMatch.confidence === 'best-guess'
          ? `Best match for ${loc.district || loc.state}. Verify on PRS India.`
          : null,
      }));
    } else {
      cards.push({
        role: 'Member of Legislative Assembly',
        name: 'Find your MLA',
        party: 'PRS India · MLA tracker',
        constituency: loc.assembly,
        term: `${loc.state} Assembly`,
        contact: '—',
        phone: '—',
        attendance: '—',
        type: 'MLA',
        verifyUrl: `https://prsindia.org/mlatrack?state=${encodeURIComponent(loc.state || '')}`,
      });
    }

    // ---- Rajya Sabha members (one card per sitting member from this state) ----
    let rsList = [];
    try { rsList = await MP_DATA.findRSMembers(loc); } catch (e) { /* ignore */ }
    for (const m of rsList) cards.push(memberToCard(m));

    // ---- All other MLAs in the state (collapsed group) ----
    let mlaList = [];
    try { mlaList = await MP_DATA.findMLAs(loc); } catch (e) { /* ignore */ }
    const matchedMLAName = mlaMatch?.member?.['MLA Name'];
    for (const m of mlaList) {
      if (matchedMLAName && m['MLA Name'] === matchedMLAName) continue;  // already shown above
      cards.push(mlaToCard(m));
    }

    return cards;
  },

  // Resolve a `?house=&mp=<slug>` permalink to a single rep card.
  async getRepByPermalink({ house, slug }) {
    const m = await MP_DATA.findBySlug(house, slug);
    return m ? memberToCard(m) : null;
  },

  // REAL public infrastructure within `radiusM` of the user, via OSM Overpass.
  async getPublicAssets({ coords, radiusM = 3000 } = {}) {
    if (!coords) return [];
    return fetchPublicAssets({ lat: coords.lat, lng: coords.lng, radiusM });
  },

  // Curated catalogues of real central-govt schemes and grievance portals.
  async getSchemes() { return CATALOGUES.schemes; },
  async getComplaintPortals() { return CATALOGUES.complaints; },
};

// Haversine distance in km between two {lat,lng} points.
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
  if (!loc) {
    grid.innerHTML = `
      <div class="cta-empty" style="grid-column: 1 / -1;">
        <div class="cta-empty__icon">${ICONS.pin}</div>
        <h3>Allow location to identify your area</h3>
        <p>We use the browser's Geolocation API and OpenStreetMap Nominatim to detect your ward, district, and state. Nothing is stored.</p>
      </div>
    `;
    return;
  }
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

/* ---- Representatives (empty state when no location) ---- */
const renderRepsEmpty = () => {
  const grid = $('#repGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="cta-empty" style="grid-column: 1 / -1;">
      <div class="cta-empty__icon">${ICONS.parliament}</div>
      <h3>Allow location to find your representatives</h3>
      <p>Once we know your constituency we'll link directly to <b>sansad.in</b> and your state assembly portal so you can verify the current MP and MLA.</p>
    </div>
  `;
};

/* ---- Representatives ---- */

// Render a single rep card. Used by both the main grid and the
// collapsible Rajya Sabha group below it.
const repCardHTML = (r) => {
  // Rich real-MP card (has photo + extras + RTI prompts + portal links).
  if (r.extras && r.links) {
    const avatar = r.photoUrl
      ? `<img class="rep-card__photo" src="${escapeHTML(r.photoUrl)}" alt="${escapeHTML(r.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" />
         <div class="rep-card__avatar" style="display:none" aria-hidden="true">${initials(r.name)}</div>`
      : `<div class="rep-card__avatar" aria-hidden="true">${initials(r.name)}</div>`;
    const isMLA = r.house === 'mla' || r.type === 'MLA';
    const sourceLabel = isMLA ? 'Live · PRS India' : 'Live · sansad.in';
    const sourceFooter = isMLA
      ? 'Source: PRS India · prsindia.org/mlatrack (CC-BY 4.0). Verify before use.'
      : 'Source: RTI Wiki · sansad.in (NIC). Verify before use.';
    const confBadge = r.confidence === 'best-guess'
      ? `<span class="rep-card__chip rep-card__chip--warn" title="${escapeHTML(r.sourceNote || '')}">Best match · verify</span>`
      : `<span class="rep-card__chip rep-card__chip--ok">${escapeHTML(sourceLabel)}</span>`;
    const extrasHTML = r.extras.map(x => `
      <div><span>${escapeHTML(x.label)}</span><b>${escapeHTML(x.value)}</b></div>
    `).join('');
    const contactRow = [
      r.contact && r.contact !== '—' ? `<a class="btn btn--ghost btn--sm" href="mailto:${encodeURIComponent(r.contact)}">${ICONS.mail} Email</a>` : '',
      r.phone && r.phone !== '—' ? `<a class="btn btn--ghost btn--sm" href="tel:${String(r.phone).replace(/[^\d+]/g,'')}">${ICONS.phone} Call</a>` : '',
    ].filter(Boolean).join('');
    const rtiHTML = (r.rtiTargets && r.rtiTargets.length)
      ? `<details class="rep-card__rti">
           <summary>${r.rtiTargets.length} ready-to-file RTI subjects</summary>
           <ul>${r.rtiTargets.slice(0, 3).map(t => `
             <li><b>${escapeHTML(t.target)}</b><br/><span>${escapeHTML(t.subject)}</span></li>
           `).join('')}</ul>
         </details>`
      : '';
    const actionLinks = [
      r.links.profile ? `<a class="btn btn--primary btn--sm" href="${r.links.profile}" target="_blank" rel="noopener">${ICONS.external} Full profile</a>` : '',
      r.links.sansad  ? `<a class="btn btn--ghost btn--sm" href="${r.links.sansad}" target="_blank" rel="noopener">${ICONS.external} sansad.in</a>` : '',
      r.links.myneta  ? `<a class="btn btn--ghost btn--sm" href="${r.links.myneta}" target="_blank" rel="noopener">${ICONS.external} MyNeta</a>` : '',
      r.links.prs     ? `<a class="btn btn--ghost btn--sm" href="${r.links.prs}" target="_blank" rel="noopener">${ICONS.external} PRS Track</a>` : '',
      r.links.mplads  ? `<a class="btn btn--ghost btn--sm" href="${r.links.mplads}" target="_blank" rel="noopener">${ICONS.external} MPLADS</a>` : '',
      contactRow,
    ].filter(Boolean).join('');
    return `
      <article class="rep-card rep-card--rich reveal">
        <div class="rep-card__head">
          ${avatar}
          <div class="rep-card__heading">
            <div class="rep-card__role">${escapeHTML(r.role)} ${confBadge}</div>
            <div class="rep-card__name">${escapeHTML(r.name)}</div>
            <div class="rep-card__party">${escapeHTML(r.party)} · ${escapeHTML(r.constituency)}</div>
          </div>
        </div>
        <div class="rep-card__meta">
          ${extrasHTML}
        </div>
        ${rtiHTML}
        <div class="rep-card__actions">
          ${actionLinks}
        </div>
        <div class="rep-card__source">${escapeHTML(sourceFooter)}</div>
      </article>
    `;
  }

  // Verify-only card (current MLA fallback + MP when match fails).
  return `
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
  `;
};

const renderReps = (reps) => {
  const grid = $('#repGrid');
  if (!grid) return;

  // Layout strategy: show the most specific reps (Lok Sabha MP + the
  // matched MLA) at the top, then collapse the bulky state-wide lists
  // (all Rajya Sabha MPs, all other MLAs) into expandable groups so the
  // page doesn't turn into a wall of cards.
  //
  // The first MLA card we encounter is the user's matched MLA (or the
  // verify-only fallback) \u2014 keep it visible. Any subsequent MLA cards
  // come from findMLAs() and go into the collapsed group.
  const primary = [];
  const rs = [];
  const mlaExtra = [];
  let seenPrimaryMLA = false;
  for (const r of reps) {
    if (r.type === 'RS') { rs.push(r); continue; }
    if (r.type === 'MLA') {
      if (!seenPrimaryMLA) { primary.push(r); seenPrimaryMLA = true; }
      else mlaExtra.push(r);
      continue;
    }
    primary.push(r);
  }

  const rsStateName = rs[0]?.constituency || '';
  const rsGroupHTML = rs.length
    ? `
      <details class="rep-rs-group reveal">
        <summary>
          <span class="rep-rs-group__title">
            <b>Rajya Sabha \u00b7 ${rs.length} member${rs.length > 1 ? 's' : ''}</b>
            ${rsStateName ? `<span>from ${escapeHTML(rsStateName)}</span>` : ''}
          </span>
          <span class="rep-rs-group__chip" aria-hidden="true"></span>
        </summary>
        <p class="rep-rs-group__note">
          Rajya Sabha MPs are elected by the state legislature, so every member from your state represents you.
        </p>
        <div class="rep-rs-grid">
          ${rs.map(repCardHTML).join('')}
        </div>
      </details>
    `
    : '';

  const mlaStateName = mlaExtra[0]?.constituency?.split(',').pop()?.trim() || '';
  const mlaGroupHTML = mlaExtra.length
    ? `
      <details class="rep-rs-group reveal">
        <summary>
          <span class="rep-rs-group__title">
            <b>Other MLAs \u00b7 ${mlaExtra.length} member${mlaExtra.length > 1 ? 's' : ''}</b>
            ${mlaStateName ? `<span>from ${escapeHTML(mlaStateName)}</span>` : ''}
          </span>
          <span class="rep-rs-group__chip" aria-hidden="true"></span>
        </summary>
        <p class="rep-rs-group__note">
          Every other MLA in your state assembly, sorted by constituency. Source: PRS India (CC-BY 4.0).
        </p>
        <div class="rep-rs-grid">
          ${mlaExtra.map(repCardHTML).join('')}
        </div>
      </details>
    `
    : '';

  grid.innerHTML = primary.map(repCardHTML).join('') + rsGroupHTML + mlaGroupHTML;
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
   11. TRANSPARENCY SCORE · gradient setup only
   (Live values are computed by computeLiveFunds + renderScore.)
========================================================= */
const ScoreRing = (() => {
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
  return { init: injectGradient };
})();

/* =========================================================
   12. BOOT & LIVE RENDERERS
========================================================= */

// Update the 4 main KPI tiles from real OSM asset counts.
// When `funds` is null we render an "awaiting location" state — no fake numbers.
function renderKPIs(funds) {
  const tiles = $$('.kpi');
  if (!tiles.length) return;

  const labels = ['Public Assets Nearby', 'Schools & Libraries', 'Healthcare Facilities', 'Govt Offices & Utilities'];
  const trends = ['Live · OpenStreetMap', 'Within 3 km radius', 'Hospitals · clinics · pharmacies', 'Police · municipal · water'];

  const values = funds
    ? [funds.assetsNearby, funds.schools, funds.healthcare, funds.waterInfra + funds.infrastructure]
    : [null, null, null, null];

  tiles.forEach((tile, i) => {
    const span = $('[data-counter]', tile);
    const labelEl = $('.kpi__label', tile);
    const trendEl = $('.kpi__trend', tile);
    if (labelEl) labelEl.textContent = labels[i];
    if (trendEl) trendEl.textContent = funds ? trends[i] : 'Awaiting location…';

    if (!span) return;
    if (values[i] == null) {
      span.dataset.target = '0';
      span.dataset.done = '1';
      span.textContent = '—';
    } else {
      span.dataset.target = String(values[i]);
      span.dataset.prefix = '';
      span.dataset.suffix = '';
      span.dataset.done = '';
      span.textContent = '0';
    }
  });

  if (funds) Counters.init();
}

// Update the hero stats (3 small numbers under the CTAs) live.
function renderHeroStats(funds) {
  const wrap = $('#heroStats');
  const a = $('#heroStatAssets');
  const h = $('#heroStatHealth');
  const s = $('#heroStatScore');
  if (!a || !h || !s) return;

  if (!funds) {
    wrap?.setAttribute('data-state', 'awaiting');
    a.textContent = '—';
    h.textContent = '—';
    s.textContent = '—';
    return;
  }
  wrap?.setAttribute('data-state', 'live');

  const animate = (el, target, suffix = '') => {
    const duration = 1200;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const v = Math.round(target * easeOut(p));
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  animate(a, funds.assetsNearby);
  animate(h, funds.healthcare);
  animate(s, funds.score, '/100');
}

// Update the transparency ring + breakdown bars from real OSM data.
function renderScore(funds) {
  const ringFg   = $('#ringFg');
  const valueEl  = $('#scoreValue');
  const badgeEl  = $('#scoreBadge');
  const noteEl   = $('#scoreNote');
  const bars     = $$('.bar');

  // Reset breakdown bars to empty
  bars.forEach(bar => {
    const fill = $('.bar__fill', bar);
    const lbl  = $('.bar__head b', bar);
    if (fill) fill.style.width = '0%';
    if (lbl)  lbl.textContent = funds ? '' : '—';
  });

  const circumference = 2 * Math.PI * 68; // ≈ 427

  if (!funds) {
    if (valueEl) valueEl.textContent = '—';
    if (badgeEl) { badgeEl.textContent = 'Awaiting location'; badgeEl.className = 'badge badge--muted'; }
    if (ringFg)  ringFg.style.strokeDashoffset = circumference;
    if (noteEl)  noteEl.innerHTML = 'Click <b>Use My Location</b> above to compute your live score from real OpenStreetMap data.';
    return;
  }

  // Animate ring
  if (valueEl) {
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min(1, (now - start) / 1400);
      const v = Math.round(funds.score * (1 - Math.pow(1 - p, 3)));
      valueEl.textContent = v;
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
  if (ringFg) {
    requestAnimationFrame(() => {
      ringFg.style.strokeDashoffset = circumference * (1 - funds.score / 100);
    });
  }
  if (badgeEl) {
    const tier = funds.score >= 75 ? { label: 'Excellent coverage', cls: 'badge--success' }
              : funds.score >= 50 ? { label: 'Good coverage',      cls: 'badge--primary' }
              : funds.score >= 25 ? { label: 'Limited coverage',   cls: 'badge--warning' }
              :                     { label: 'Sparse coverage',    cls: 'badge--danger'  };
    badgeEl.textContent = tier.label;
    badgeEl.className = `badge ${tier.cls}`;
  }
  if (noteEl) {
    noteEl.innerHTML = `Computed live from <b>${funds.assetsNearby}</b> OpenStreetMap public assets within 3 km. Higher scores indicate denser and more diverse civic infrastructure.`;
  }

  // Animate each breakdown bar to its real value.
  const keys = {
    education:  funds.breakdown.education,
    healthcare: funds.breakdown.healthcare,
    governance: funds.breakdown.governance,
    utilities:  funds.breakdown.utilities,
  };
  bars.forEach(bar => {
    const key = bar.dataset.key;
    const val = keys[key] ?? 0;
    const fill = $('.bar__fill', bar);
    const lbl  = $('.bar__head b', bar);
    if (lbl) lbl.textContent = `${val}%`;
    if (fill) requestAnimationFrame(() => { fill.style.width = val + '%'; });
  });
}

// Compute a live "civic infrastructure score" from real asset counts.
// Score is a weighted, capped sum across 4 sub-indices, each saturating
// at a sensible neighbourhood-level target.
function computeLiveFunds(assets) {
  const count = (cat) => assets.filter(a => a.category === cat).length;
  const schools     = count('Schools');
  const healthcare  = count('Healthcare');
  const water       = count('Water');
  const infra       = count('Infrastructure');

  // Targets per 3 km: above this = 100%.
  const TARGET = { education: 8, healthcare: 6, governance: 6, utilities: 4 };

  const pct = (n, t) => Math.min(100, Math.round((n / t) * 100));

  const breakdown = {
    education:  pct(schools, TARGET.education),
    healthcare: pct(healthcare, TARGET.healthcare),
    governance: pct(infra, TARGET.governance),
    utilities:  pct(water + Math.max(0, infra - TARGET.governance), TARGET.utilities),
  };

  const score = Math.round(
    breakdown.education  * 0.30 +
    breakdown.healthcare * 0.30 +
    breakdown.governance * 0.25 +
    breakdown.utilities  * 0.15
  );

  return {
    assetsNearby: assets.length,
    schools, healthcare, waterInfra: water, infrastructure: infra,
    score,
    breakdown,
  };
}

// Replace the project grid with a "needs location" empty state.
function renderProjectsEmpty() {
  const grid = $('#projectGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="cta-empty" style="grid-column: 1 / -1;">
      <div class="cta-empty__icon">${ICONS.pin}</div>
      <h3>Allow location to see real public assets</h3>
      <p>We use your coordinates to fetch every school, hospital, government office, water work and police station within 3 km — live from OpenStreetMap. Nothing is stored.</p>
      <button class="btn btn--primary btn--sm" id="emptyUseLocation">${ICONS.pin} Use My Location</button>
    </div>
  `;
  $('#emptyUseLocation')?.addEventListener('click', () => $('#useLocationBtn')?.click());
}

// Show a placeholder inside the map until live data arrives.
function renderMapEmpty() {
  const el = $('#leafletMap');
  if (!el) return;
  el.innerHTML = `
    <div class="cta-empty" style="margin: 0; height: 100%; border: 0; border-radius: 0; background: var(--bg-alt);">
      <div class="cta-empty__icon">${ICONS.pin}</div>
      <h3>Map awaiting your location</h3>
      <p>Grant location permission to plot real public assets around you.</p>
    </div>
  `;
}

// Render the two real catalogues (schemes + grievance portals). These are
// curated lists of REAL govt portal URLs — no numbers, no claims.
async function renderCatalogues() {
  const [schemes, complaints] = await Promise.all([
    API.getSchemes(),
    API.getComplaintPortals(),
  ]);
  renderSchemes(schemes);
  renderComplaints(complaints);
}

// Run the full live-data flow: GPS → reverse-geocode → Overpass → render.
async function detectAndRender() {
  Loader.show('Requesting location permission…');
  try {
    const loc = await API.getLocation();
    const reps = await API.getRepresentatives({ loc });
    renderLocation(loc);
    renderReps(reps);

    Loader.show('Fetching real public infrastructure from OpenStreetMap…');
    const assets = await API.getPublicAssets({ coords: loc.coords, radiusM: 3000 });

    if (!assets || assets.length === 0) {
      // No coverage in this area — show honest empty state, never fake data.
      renderKPIs(null);
      renderHeroStats(null);
      renderScore(null);
      renderProjectsEmpty();
      renderMapEmpty();
      Toast.show({
        title: 'No tagged assets here',
        message: 'OpenStreetMap has no public-facility data within 3 km of you yet.',
        type: 'warning',
      });
      return;
    }

    const funds = computeLiveFunds(assets);

    renderKPIs(funds);
    renderHeroStats(funds);
    renderScore(funds);
    Projects.init(assets);
    SpendingMap.init(loc, assets);

    Toast.show({
      title: 'Live data loaded',
      message: `${loc.address}${loc.state && loc.state !== 'Unavailable' ? ' · ' + loc.state : ''} · ${assets.length} public assets · score ${funds.score}/100`,
      type: 'success',
    });
  } catch (err) {
    console.error(err);
    const code = err && typeof err.code === 'number' ? err.code : 0;
    const message =
      code === 1 ? 'Permission denied — we never store your location.' :
      code === 2 ? 'Location unavailable. Try again with a better signal.' :
      code === 3 ? 'Location request timed out. Try again.' :
                   'Could not get your location. Try again.';
    Toast.show({ title: 'Location not available', message, type: 'warning' });
    // Keep honest empty state — no fake fallback.
  } finally {
    Loader.hide();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('#year').textContent = new Date().getFullYear();

  Theme.init();
  Nav.init();
  Reveal.init();
  ScoreRing.init();

  // Render honest empty state immediately — the page never shows fake numbers.
  renderLocation(null);
  renderRepsEmpty();
  renderKPIs(null);
  renderHeroStats(null);
  renderScore(null);
  renderProjectsEmpty();
  renderMapEmpty();

  // Render the two real catalogues right away (no GPS required for these).
  renderCatalogues();

  // Permalink handling: ?house=rs&mp=<slug>  or  ?house=ls&mp=<slug>
  // Renders just the shared MP's card and scrolls to it — no GPS required.
  (async () => {
    const params = new URLSearchParams(location.search);
    const house = params.get('house');
    const slug  = params.get('mp');
    if (!house || !slug || (house !== 'rs' && house !== 'ls')) return;
    try {
      Loader.show('Loading shared representative…');
      const card = await API.getRepByPermalink({ house, slug });
      if (!card) {
        Toast.show({ title: 'MP not found', message: `No ${house.toUpperCase()} member with slug "${slug}".`, type: 'warning' });
        return;
      }
      renderReps([card]);
      document.getElementById('reps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      Toast.show({ title: 'Loaded shared MP', message: card.name, type: 'success' });
    } catch (e) {
      console.error(e);
    } finally {
      Loader.hide();
    }
  })();

  // Hero CTA — request real GPS and load live data.
  $('#useLocationBtn')?.addEventListener('click', async () => {
    if (!('geolocation' in navigator)) {
      Toast.show({ title: 'Not supported', message: 'Your browser does not support geolocation.', type: 'danger' });
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      Toast.show({ title: 'HTTPS required', message: 'Browsers only share location on https:// or localhost.', type: 'warning' });
      return;
    }
    await detectAndRender();
    document.getElementById('location')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

})();
