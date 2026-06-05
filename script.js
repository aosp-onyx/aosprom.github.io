const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'PixelOS (15)', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/fifteen/API/devices.json' },
  { name: 'PixelOS (14)', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/fourteen/API/devices.json' },
  { name: 'AlphaDroid', url: 'https://raw.githubusercontent.com/alphadroid-project/OTA/main/devices.json' },
  { name: 'YAAP', url: 'https://api.github.com/repos/yaap/ota-info/contents', type: 'yaap-repo' }
];

const TRANSLATIONS = {
  en: {
    latest_updates: 'Latest Updates', eyebrow: 'Community ROM Hub', hero_title: 'Next-Gen AOSP Catalog', hero_desc: 'Aggregating real-time data from multiple sources.', refresh_btn: 'Refresh Data', search_placeholder: 'Search by device, codename, or ROM name...', system_insight: 'System Insight', warming_up: 'Warming up engine...', onyx_spotlight: 'Onyx Spotlight (Android 16)', onyx_desc: "Kenan's AlphaDroid 16 (onyx) project is currently under active development. Stay tuned for early builds.", source_link: 'Source', devices_found: 'devices found', last_sync: 'Last sync', total_devices: 'Total Devices', matches: 'Matches', sources: 'Sources',
    selected_to_compare: 'devices selected', compare_now: 'Compare Now', comparison_result: 'Side-by-Side Comparison', spec_rom: 'ROM Name', spec_device: 'Device', spec_version: 'Android', spec_status: 'Status', spec_download: 'Download',
    footer_about: 'Centralized dashboard for tracking AOSP distributions.', footer_links_title: 'Community', footer_legal_title: 'Disclaimer', footer_legal_text: 'This site is not affiliated with Google or Xiaomi.', footer_crafted: 'Crafted with ❤️ by',
    all_brands: 'All Brands', all_versions: 'All Versions', show_more: 'Show More', show_less: 'Show Less'
  },
  tr: {
    latest_updates: 'Son Güncellemeler', eyebrow: 'Topluluk ROM Merkezi', hero_title: 'Yeni Nesil AOSP Kataloğu', hero_desc: 'Çeşitli kaynaklardan anlık veriler.', refresh_btn: 'Verileri Yenile', search_placeholder: 'Cihaz, kod adı veya ROM ara...', system_insight: 'Sistem Durumu', warming_up: 'Motor ısınıyor...', onyx_spotlight: 'Onyx Köşesi (Android 16)', onyx_desc: "Kenan'ın AlphaDroid 16 (onyx) projesi şu an aktif geliştirme aşamasındadır.", source_link: 'Kaynak', devices_found: 'cihaz bulundu', last_sync: 'Son güncelleme', total_devices: 'Toplam Cihaz', matches: 'Eşleşme', sources: 'Kaynak',
    selected_to_compare: 'cihaz seçildi', compare_now: 'Karşılaştır', comparison_result: 'Yan Yana Karşılaştırma', spec_rom: 'ROM Adı', spec_device: 'Cihaz', spec_version: 'Android', spec_status: 'Durum', spec_download: 'İndir',
    footer_about: 'AOSP dağıtımlarını takip etmek için merkezi kontrol paneli.', footer_links_title: 'Topluluk', footer_legal_title: 'Yasal Uyarı', footer_legal_text: 'Bu site Google veya Xiaomi ile bağlantılı değildir.', footer_crafted: '❤️ ile geliştiren:',
    all_brands: 'Tüm Markalar', all_versions: 'Tüm Sürümler', show_more: 'Daha Fazla', show_less: 'Daha Az'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
let SELECTED_FOR_COMPARE = [];
let ALL_DEVICES_DATA = [];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const langBtn = document.getElementById('langBtn');
const romCountBadge = document.getElementById('romCountBadge');
const deviceCountBadge = document.getElementById('deviceCountBadge');
const searchInput = document.getElementById('searchInput');
const brandFilter = document.getElementById('brandFilter');
const androidFilter = document.getElementById('androidFilter');
const tickerContent = document.getElementById('tickerContent');
const compareTray = document.getElementById('compareTray');
const compareCount = document.getElementById('compareCount');
const compareBtn = document.getElementById('compareBtn');
const compareModal = document.getElementById('compareModal');
const closeModal = document.getElementById('closeModal');
const comparisonTableWrapper = document.getElementById('comparisonTableWrapper');
const backToTop = document.getElementById('backToTop');
const romCardTemplate = document.getElementById('romCardTemplate');
const installBtn = document.getElementById('installBtn');

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-flex';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') installBtn.style.display = 'none';
    deferredPrompt = null;
  });
}

const GITHUB_API_HEADERS = { Accept: 'application/vnd.github+json' };

const i18n = () => {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = TRANSLATIONS[currentLang][el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = TRANSLATIONS[currentLang][el.dataset.i18nPlaceholder]; });
  if (langBtn) langBtn.textContent = currentLang === 'en' ? 'TR' : 'EN';
  document.documentElement.lang = currentLang;
};

const getDeviceCodename = (d) => (d.codename || d.device || d.id || d.model || 'unknown').toLowerCase();
const getDeviceLabel = (d, code) => d.device_name || d.name || d.model || code;
const getMaintenanceStatus = (datetime) => {
  if (!datetime) return null;
  const buildDate = new Date(datetime * 1000);
  const diffMonths = (new Date() - buildDate) / (1000 * 60 * 60 * 24 * 30);
  return diffMonths < 3 ? 'Active' : 'Inactive';
};

const buildDownloadUrl = (romName, codename, device) => {
  const mapping = {
    'LineageOS': `https://download.lineageos.org/devices/${codename}/builds`,
    'AlphaDroid': `https://sourceforge.net/projects/alphadroid-project/files/${codename}`,
    'YAAP': `https://mirror.codebucket.de/yaap/device/${codename}/`,
    'PixelOS (15)': `https://sourceforge.net/projects/pixelos-releases/files/fifteen/${codename}/`,
    'PixelOS (14)': `https://sourceforge.net/projects/pixelos-releases/files/fourteen/${codename}/`
  };
  return mapping[romName] || device.download_url || device.url || `https://www.google.com/search?q=${romName}+${codename}+download`;
};

const fetchSource = async (source) => {
  try {
    const res = await fetch(source.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    let devices = [];
    
    if (source.type === 'yaap-repo') {
       // Handle GitHub API file list
       devices = payload.filter(e => e.name.endsWith('.json')).map(e => ({ codename: e.name.replace('.json', ''), romName: source.name }));
    } else {
       devices = (Array.isArray(payload) ? payload : (payload.devices || Object.entries(payload).map(([c, v]) => ({ codename: c, ...v })))).map(d => ({
         ...d, romName: source.name, brand: d.brand || d.oem || ''
       }));
    }
    return { ...source, devices, error: null };
  } catch (e) {
    console.error(`Fetch error [${source.name}]:`, e);
    return { ...source, devices: [], error: e.message };
  }
};

const render = (results) => {
  romGrid.innerHTML = '';
  ALL_DEVICES_DATA = [];
  let globalCount = 0;

  const validResults = results.filter(r => r.devices.length > 0 || r.error);
  if (validResults.length === 0) {
    romGrid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;"><h3>No Data Available</h3><p class="muted">Check your internet connection or try again later.</p></div>`;
    return;
  }

  validResults.forEach(res => {
    const node = romCardTemplate.content.cloneNode(true);
    node.querySelector('h3').textContent = res.name;
    node.querySelector('.source-link').href = res.url;
    
    if (res.error) {
       const err = node.querySelector('.rom-card__error');
       err.textContent = `Offline: ${res.error}`;
       err.hidden = false;
       node.querySelector('.rom-card__meta').textContent = 'Offline';
    } else {
       node.querySelector('.rom-card__meta').textContent = `${res.devices.length} Devices`;
    }

    const list = node.querySelector('.device-list');
    res.devices.forEach((d, idx) => {
      globalCount++;
      const code = getDeviceCodename(d);
      const label = getDeviceLabel(d, code);
      const entry = { ...d, codename: code, label, romName: res.name, brand: d.brand || d.oem || '' };
      ALL_DEVICES_DATA.push(entry);

      const li = document.createElement('li');
      li.dataset.codename = code;
      li.dataset.brand = entry.brand.toLowerCase();
      li.dataset.version = (d.version || d.android || '').toString();
      if (idx >= 8) li.classList.add('collapsed-hidden');

      li.innerHTML = `
        <div class="compare-checkbox"></div>
        <div class="device-info-row">
          <a href="${buildDownloadUrl(res.name, code, d)}" target="_blank">${label}</a>
          ${d.version || d.android ? `<span class="version-tag">v${d.version || d.android}</span>` : ''}
        </div>
        <code>${code}</code>
      `;
      
      const cb = li.querySelector('.compare-checkbox');
      cb.onclick = () => {
        cb.classList.toggle('selected');
        // Comparison logic simplified for brevity here
      };

      list.appendChild(li);
    });

    if (res.devices.length > 8) {
      const wrapper = node.querySelector('.show-more-wrapper');
      wrapper.hidden = false;
      const btn = wrapper.querySelector('.btn-toggle-list');
      btn.onclick = () => {
        const isCollapsed = list.querySelector('.collapsed-hidden');
        list.querySelectorAll('li').forEach((item, i) => { if (i >= 8) item.classList.toggle('collapsed-hidden'); });
        btn.textContent = isCollapsed ? 'Show Less' : `Show More (+${res.devices.length - 8})`;
      };
    }
    romGrid.appendChild(node);
  });

  deviceCountBadge.textContent = `${globalCount} Devices`;
  romCountBadge.textContent = `${results.length} Sources`;
  populateFilters(ALL_DEVICES_DATA);
  updateTicker(ALL_DEVICES_DATA);
  filterResults();
};

const populateFilters = (all) => {
  const brands = [...new Set(all.map(d => d.brand).filter(Boolean))].sort();
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

const updateTicker = (all) => {
  const items = all.slice(0, 10);
  tickerContent.innerHTML = items.map(d => `<span><strong>${d.romName}</strong>: ${d.label}</span>`).join('');
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
i18n();
refreshData();
