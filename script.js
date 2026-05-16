const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'AlphaDroid', url: 'https://raw.githubusercontent.com/alphadroid-project/OTA/main/devices.json', fallbackUrl: 'https://api.github.com/repos/AlphaDroid-devices/OTA/contents' },
  { name: 'AxionOS', url: 'https://raw.githubusercontent.com/AxionAOSP/official_devices/main/devices.json' },
  { name: 'Project Infinity', url: 'https://raw.githubusercontent.com/ProjectInfinity-X/official_devices/main/devices.json' },
  { name: 'YAAP', url: 'https://api.github.com/repos/yaap/ota-info/contents', type: 'yaap-repo' },
  { name: 'PixelOS', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/sixteen/API/devices.json' },
];

const TRANSLATIONS = {
  en: {
    latest_updates: 'Latest Updates',
    eyebrow: 'Community ROM Hub',
    hero_title: 'Next-Gen AOSP Catalog',
    hero_desc: 'Aggregating real-time data from LineageOS, AlphaDroid, AxionOS, YAAP, and PixelOS.',
    refresh_btn: 'Refresh Data',
    search_placeholder: 'Search by device, codename, or ROM name...',
    system_insight: 'System Insight',
    warming_up: 'Warming up engine...',
    onyx_spotlight: 'Onyx Spotlight (Android 16)',
    onyx_desc: "Kenan's AlphaDroid 16 (onyx) project is currently under active development. Stay tuned for early builds.",
    source_link: 'Source',
    devices_found: 'devices found',
    last_sync: 'Last sync',
    total_devices: 'Total Devices',
    matches: 'Matches',
    sources: 'Sources'
  },
  tr: {
    latest_updates: 'Son Güncellemeler',
    eyebrow: 'Topluluk ROM Merkezi',
    hero_title: 'Yeni Nesil AOSP Kataloğu',
    hero_desc: 'LineageOS, AlphaDroid, AxionOS, YAAP ve PixelOS kaynaklarından anlık veriler.',
    refresh_btn: 'Verileri Yenile',
    search_placeholder: 'Cihaz, kod adı veya ROM ara...',
    system_insight: 'Sistem Durumu',
    warming_up: 'Motor ısınıyor...',
    onyx_spotlight: 'Onyx Köşesi (Android 16)',
    onyx_desc: "Kenan'ın AlphaDroid 16 (onyx) projesi şu an aktif geliştirme aşamasındadır. Takipte kalın.",
    source_link: 'Kaynak',
    devices_found: 'cihaz bulundu',
    last_sync: 'Son güncelleme',
    total_devices: 'Toplam Cihaz',
    matches: 'Eşleşme',
    sources: 'Kaynak'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
let CACHED_ALL_DEVICES = [];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const langBtn = document.getElementById('langBtn');
const romCountBadge = document.getElementById('romCountBadge');
const deviceCountBadge = document.getElementById('deviceCountBadge');
const searchInput = document.getElementById('searchInput');
const tickerContent = document.getElementById('tickerContent');
const romCardTemplate = document.getElementById('romCardTemplate');

const GITHUB_API_HEADERS = { Accept: 'application/vnd.github+json' };

const i18n = () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = TRANSLATIONS[currentLang][el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = TRANSLATIONS[currentLang][el.dataset.i18nPlaceholder];
  });
  langBtn.textContent = currentLang === 'en' ? 'TR' : 'EN';
  document.documentElement.lang = currentLang;
};

const getDeviceCodename = (d) => d.codename || d.device || d.id || d.model || 'unknown';
const getDeviceLabel = (d, code) => d.device_name || d.name || d.model || code;

const getMaintenanceStatus = (datetime) => {
  if (!datetime) return null;
  const buildDate = new Date(datetime * 1000);
  const diffMonths = (new Date() - buildDate) / (1000 * 60 * 60 * 24 * 30);
  return diffMonths < 3 ? 'Active' : 'Inactive';
};

const fetchGithubContents = async (url) => {
  const res = await fetch(url, { cache: 'no-store', headers: GITHUB_API_HEADERS });
  return res.ok ? await res.json() : [];
};

const loadRepoStyle = async (source) => {
  try {
    const pending = [source.url], files = [];
    while (pending.length > 0) {
      const next = pending.pop(), entries = await fetchGithubContents(next);
      entries.forEach(e => {
        if (e.type === 'dir') pending.push(e.url);
        else if (e.type === 'file' && /\.json$/i.test(e.name)) files.push(e);
      });
    }
    const settled = await Promise.allSettled(files.map(async (e) => {
      const res = await fetch(e.download_url);
      const payload = await res.json();
      const codename = e.name.replace(/\.json$/i, '');
      let devList = Array.isArray(payload) ? payload : (payload.response ? (Array.isArray(payload.response) ? payload.response : [payload]) : [payload]);
      return devList.map(d => ({ ...d, codename: d.codename || codename, datetime: d.datetime || d.date || null, romName: source.name }));
    }));
    return { name: source.name, url: source.url, devices: settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value) };
  } catch (e) {
    if (source.fallbackUrl) return await loadSource({ ...source, url: source.fallbackUrl, type: null });
    throw e;
  }
};

const loadSource = async (source) => {
  const cacheKey = `rom_cache_${source.name}`;
  try {
    let result;
    if (source.type === 'alphadroid-repo' || source.type === 'yaap-repo') result = await loadRepoStyle(source);
    else {
      const res = await fetch(source.url);
      const payload = await res.json();
      const devices = (Array.isArray(payload) ? payload : payload.devices || Object.entries(payload).map(([c, v]) => ({ codename: c, ...v }))).map(d => ({
        ...d, datetime: d.datetime || d.date || null, romName: source.name
      }));
      result = { name: source.name, url: source.url, devices };
    }
    localStorage.setItem(cacheKey, JSON.stringify({ devices: result.devices, timestamp: Date.now() }));
    return result;
  } catch (e) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return { name: source.name, url: source.url, devices: JSON.parse(cached).devices, isCached: true };
    return { name: source.name, url: source.url, devices: [], error: e.message };
  }
};

const updateTicker = (allDevices) => {
  const sorted = allDevices.filter(d => d.datetime).sort((a, b) => b.datetime - a.datetime).slice(0, 10);
  tickerContent.innerHTML = sorted.map(d => `<span><strong>${d.romName}</strong>: ${getDeviceLabel(d, d.codename)} (${d.codename})</span>`).join('');
};

const render = (results) => {
  romGrid.innerHTML = '';
  let globalCount = 0;
  let allDevices = [];
  
  results.forEach(res => {
    const node = romCardTemplate.content.cloneNode(true);
    node.querySelector('h3').textContent = res.name;
    node.querySelector('.source-link').href = res.url;
    node.querySelector('.rom-card__meta').textContent = `${res.devices.length} ${TRANSLATIONS[currentLang].devices_found}`;
    
    const list = node.querySelector('.device-list');
    res.devices.forEach(d => {
      globalCount++;
      allDevices.push(d);
      const li = document.createElement('li');
      const code = getDeviceCodename(d).toLowerCase();
      li.dataset.codename = code;
      
      const infoWrapper = document.createElement('div');
      infoWrapper.className = 'device-info-row';
      const a = document.createElement('a');
      a.href = d.url || d.download_url || '#';
      a.target = '_blank';
      a.textContent = getDeviceLabel(d, code);
      
      const status = getMaintenanceStatus(d.datetime);
      if (status) {
        const s = document.createElement('span');
        s.className = `status-badge status-${status.toLowerCase()}`;
        s.textContent = status;
        a.appendChild(s);
      }
      
      if (d.version || d.android) {
        const v = document.createElement('span');
        v.className = 'version-tag';
        v.textContent = `v${d.version || d.android}`;
        infoWrapper.appendChild(v);
      }
      
      const c = document.createElement('code');
      c.textContent = code;
      infoWrapper.prepend(a);
      li.append(infoWrapper, c);
      list.appendChild(li);
    });
    romGrid.appendChild(node);
  });
  
  deviceCountBadge.textContent = `${globalCount} ${TRANSLATIONS[currentLang].total_devices}`;
  romCountBadge.textContent = `${results.length} ${TRANSLATIONS[currentLang].sources}`;
  updateTicker(allDevices);
  document.getElementById('onyxHighlight').hidden = !allDevices.some(d => d.codename.toLowerCase() === 'onyx');
  filterResults();
};

const filterResults = () => {
  const term = searchInput.value.toLowerCase();
  let matches = 0;
  document.querySelectorAll('.rom-card').forEach(card => {
    let cardMatch = false;
    card.querySelectorAll('.device-list li').forEach(li => {
      const match = li.textContent.toLowerCase().includes(term) || li.dataset.codename.includes(term) || card.querySelector('h3').textContent.toLowerCase().includes(term);
      li.classList.toggle('hidden', !match);
      if (match) { cardMatch = true; matches++; }
    });
    card.classList.toggle('hidden', !cardMatch);
  });
  deviceCountBadge.textContent = `${matches} ${TRANSLATIONS[currentLang].matches}`;
};

langBtn.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'tr' : 'en';
  localStorage.setItem('lang', currentLang);
  i18n();
  refreshData();
});

const refreshData = async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = currentLang === 'en' ? 'Syncing...' : 'Eşitleniyor...';
  const results = await Promise.all(ROM_SOURCES.map(loadSource));
  render(results);
  lastUpdated.textContent = `${TRANSLATIONS[currentLang].last_sync}: ${new Date().toLocaleTimeString()}`;
  refreshBtn.textContent = TRANSLATIONS[currentLang].refresh_btn;
  refreshBtn.disabled = false;
};

searchInput.addEventListener('input', filterResults);
refreshBtn.addEventListener('click', refreshData);
i18n();
refreshData();
