const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'PixelOS (15)', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/fifteen/API/devices.json' }
];

const BACKUP_DEVICES = [
  { codename: 'onyx', name: 'OnePlus X', brand: 'OnePlus', romName: 'AlphaDroid', version: '15.0' },
  { codename: 'sweet', name: 'Redmi Note 10 Pro', brand: 'Xiaomi', romName: 'AlphaDroid', version: '15.0' },
  { codename: 'fuxi', name: 'Xiaomi 13', brand: 'Xiaomi', romName: 'Evolution X', version: '15.0' }
];

const TRANSLATIONS = {
  en: {
    latest_updates: 'Latest Updates', eyebrow: 'Community ROM Hub', hero_title: 'Next-Gen AOSP Catalog', hero_desc: 'Aggregating real-time data from multiple sources.', refresh_btn: 'Refresh Data', search_placeholder: 'Search by device, codename, or ROM name...', system_insight: 'System Insight', warming_up: 'Warming up engine...', onyx_spotlight: 'Onyx Spotlight (Android 16)', onyx_desc: "Kenan's AlphaDroid 16 (onyx) project is currently under active development.", source_link: 'Source', devices_found: 'devices found', last_sync: 'Last sync', total_devices: 'Total Devices', matches: 'Matches', sources: 'Sources',
    all_brands: 'All Brands', all_versions: 'All Versions', show_more: 'Show More', show_less: 'Show Less'
  },
  tr: {
    latest_updates: 'Son Güncellemeler', eyebrow: 'Topluluk ROM Merkezi', hero_title: 'Yeni Nesil AOSP Kataloğu', hero_desc: 'Çeşitli kaynaklardan anlık veriler.', refresh_btn: 'Verileri Yenile', search_placeholder: 'Cihaz, kod adı veya ROM ara...', system_insight: 'Sistem Durumu', warming_up: 'Motor ısınıyor...', onyx_spotlight: 'Onyx Köşesi (Android 16)', onyx_desc: "Kenan'ın AlphaDroid 16 (onyx) projesi şu an aktif geliştirme aşamasındadır.", source_link: 'Kaynak', devices_found: 'cihaz bulundu', last_sync: 'Son güncelleme', total_devices: 'Toplam Cihaz', matches: 'Eşleşme', sources: 'Kaynak',
    all_brands: 'Tüm Markalar', all_versions: 'Tüm Sürümler', show_more: 'Daha Fazla', show_less: 'Daha Az'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
let ALL_DEVICES_DATA = [];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const romCountBadge = document.getElementById('romCountBadge');
const deviceCountBadge = document.getElementById('deviceCountBadge');
const searchInput = document.getElementById('searchInput');
const brandFilter = document.getElementById('brandFilter');
const androidFilter = document.getElementById('androidFilter');
const tickerContent = document.getElementById('tickerContent');
const romCardTemplate = document.getElementById('romCardTemplate');

const getDeviceCodename = (d) => (d.codename || d.device || d.id || d.model || 'unknown').toLowerCase();
const getDeviceLabel = (d, code) => d.device_name || d.name || d.model || code;

const buildDownloadUrl = (romName, codename) => {
  if (romName === 'LineageOS') return `https://download.lineageos.org/devices/${codename}/builds`;
  return `https://www.google.com/search?q=${romName}+${codename}+download`;
};

const fetchSource = async (source) => {
  try {
    const res = await fetch(source.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const devices = (Array.isArray(payload) ? payload : (payload.devices || Object.entries(payload).map(([c, v]) => ({ codename: c, ...v })))).map(d => ({
      ...d, romName: source.name, brand: d.brand || d.oem || 'Unknown'
    }));
    return { ...source, devices, error: null };
  } catch (e) {
    return { ...source, devices: [], error: e.message };
  }
};

const render = (results) => {
  romGrid.innerHTML = '';
  ALL_DEVICES_DATA = [...BACKUP_DEVICES]; // Start with backup data
  
  results.forEach(res => {
    res.devices.forEach(d => {
      const code = getDeviceCodename(d);
      ALL_DEVICES_DATA.push({ ...d, codename: code, label: getDeviceLabel(d, code), romName: res.name, brand: d.brand || d.oem || 'Unknown' });
    });
  });

  // Group by ROM
  const groups = {};
  ALL_DEVICES_DATA.forEach(d => {
    if (!groups[d.romName]) groups[d.romName] = [];
    groups[d.romName].push(d);
  });

  Object.entries(groups).forEach(([romName, devices]) => {
    const node = romCardTemplate.content.cloneNode(true);
    node.querySelector('h3').textContent = romName;
    node.querySelector('.rom-card__meta').textContent = `${devices.length} Devices`;
    
    const list = node.querySelector('.device-list');
    devices.forEach((d, idx) => {
      const li = document.createElement('li');
      li.dataset.codename = d.codename;
      li.dataset.brand = (d.brand || 'Unknown').toLowerCase();
      li.dataset.version = (d.version || d.android || '').toString();
      if (idx >= 8) li.classList.add('collapsed-hidden');

      li.innerHTML = `
        <div class="compare-checkbox"></div>
        <div class="device-info-row">
          <a href="${buildDownloadUrl(romName, d.codename)}" target="_blank">${d.label || d.name}</a>
          ${d.version ? `<span class="version-tag">v${d.version}</span>` : ''}
        </div>
        <code>${d.codename}</code>
      `;
      list.appendChild(li);
    });

    if (devices.length > 8) {
      const wrapper = node.querySelector('.show-more-wrapper');
      wrapper.hidden = false;
      const btn = wrapper.querySelector('.btn-toggle-list');
      btn.onclick = () => {
        const isCollapsed = list.querySelector('.collapsed-hidden');
        list.querySelectorAll('li').forEach((item, i) => { if (i >= 8) item.classList.toggle('collapsed-hidden'); });
        btn.textContent = isCollapsed ? 'Show Less' : `Show More (+${devices.length - 8})`;
      };
    }
    romGrid.appendChild(node);
  });

  deviceCountBadge.textContent = `${ALL_DEVICES_DATA.length} Devices`;
  romCountBadge.textContent = `${Object.keys(groups).length} Sources`;
  populateFilters(ALL_DEVICES_DATA);
  filterResults();
};

const populateFilters = (all) => {
  const brands = [...new Set(all.map(d => d.brand).filter(b => b && b !== 'Unknown'))].sort();
  const versions = [...new Set(all.map(d => d.version || d.android).filter(Boolean))].sort((a,b) => b-a);
  brandFilter.innerHTML = `<option value="">All Brands</option>` + brands.map(b => `<option value="${b.toLowerCase()}">${b}</option>`).join('');
  androidFilter.innerHTML = `<option value="">All Versions</option>` + versions.map(v => `<option value="${v}">${v}</option>`).join('');
};

const filterResults = () => {
  const q = searchInput.value.toLowerCase();
  const b = brandFilter.value.toLowerCase();
  const v = androidFilter.value;
  let matches = 0;

  document.querySelectorAll('.rom-card').forEach(card => {
    let cardMatch = false;
    card.querySelectorAll('.device-list li').forEach(li => {
      const mText = li.textContent.toLowerCase().includes(q) || li.dataset.codename.includes(q);
      const mBrand = !b || li.dataset.brand === b;
      const mVersion = !v || li.dataset.version === v;
      const visible = mText && mBrand && mVersion;
      li.classList.toggle('hidden', !visible);
      if (visible) { cardMatch = true; matches++; }
    });
    card.classList.toggle('hidden', !cardMatch);
  });
  deviceCountBadge.textContent = `${matches} Matches`;
};

const refreshData = async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Syncing...';
  const results = await Promise.all(ROM_SOURCES.map(fetchSource));
  render(results);
  lastUpdated.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  refreshBtn.disabled = false;
  refreshBtn.textContent = 'Refresh Data';
};

searchInput.addEventListener('input', filterResults);
brandFilter.addEventListener('change', filterResults);
androidFilter.addEventListener('change', filterResults);
refreshBtn.addEventListener('click', refreshData);
refreshData();
