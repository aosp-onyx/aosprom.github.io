const BACKUP_DEVICES = [
  { codename: 'onyx', name: 'OnePlus X', brand: 'OnePlus', romName: 'AlphaDroid', version: '15.0', status: 'Active' },
  { codename: 'sweet', name: 'Redmi Note 10 Pro', brand: 'Xiaomi', romName: 'AlphaDroid', version: '15.0', status: 'Active' },
  { codename: 'fuxi', name: 'Xiaomi 13', brand: 'Xiaomi', romName: 'Evolution X', version: '15.0', status: 'Active' },
  { codename: 'marble', name: 'POCO F5', brand: 'Xiaomi', romName: 'AlphaDroid', version: '15.0', status: 'Active' },
  { codename: 'mondrian', name: 'POCO F5 Pro', brand: 'Xiaomi', romName: 'AlphaDroid', version: '15.0', status: 'Active' },
  { codename: 'citrus', name: 'POCO M3', brand: 'Xiaomi', romName: 'LineageOS', version: '14.0', status: 'Active' }
];

const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'PixelOS (15)', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/fifteen/API/devices.json' },
  { name: 'AlphaDroid', url: 'https://api.github.com/repos/AlphaDroid-devices/OTA/contents' },
  { name: 'Evolution X', url: 'https://api.github.com/repos/Evolution-X/OTA/contents' }
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
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

const comparisonTableWrapper = document.getElementById('comparisonTableWrapper');
const compareModal = document.getElementById('compareModal');
const closeModal = document.getElementById('closeModal');
const compareTray = document.getElementById('compareTray');
const compareCount = document.getElementById('compareCount');
const compareBtn = document.getElementById('compareBtn');

let SELECTED_FOR_COMPARE = [];
let STARRED_DEVICES = JSON.parse(localStorage.getItem('starred_devices') || '[]');
let lastResults = [];

// Theme Management
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  const isLight = theme === 'light';
  themeIcon.innerHTML = isLight 
    ? '<path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>' // Moon
    : '<path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>'; // Sun
};

let currentTheme = localStorage.getItem('theme') || 'dark';
applyTheme(currentTheme);

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme(currentTheme);
});

const getDeviceCodename = (d) => (d.codename || d.device || d.id || d.model || 'unknown').toLowerCase();
const getDeviceLabel = (d, code) => d.device_name || d.name || d.model || code;

const buildDownloadUrl = (romName, codename, device) => {
  if (device && device.url) return device.url;
  if (device && device.download) return device.download;
  
  const code = codename.toLowerCase();
  if (romName === 'LineageOS') return `https://download.lineageos.org/devices/${code}/builds`;
  if (romName.includes('PixelOS')) return `https://pixelos.net/download/${code}`;
  if (romName.includes('Evolution X')) return `https://evolution-x.org/download/${code}`;
  if (romName.includes('AlphaDroid')) return `https://sourceforge.net/projects/alphadroid/files/${code}/`;
  
  return `https://www.google.com/search?q=${romName}+${codename}+official+download`;
};

const toggleCompare = (device, el) => {
  const idx = SELECTED_FOR_COMPARE.findIndex(d => d.codename === device.codename && d.romName === device.romName);
  if (idx > -1) {
    SELECTED_FOR_COMPARE.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    if (SELECTED_FOR_COMPARE.length >= 4) {
      alert(currentLang === 'en' ? 'Max 4 devices for comparison.' : 'En fazla 4 cihaz karşılaştırılabilir.');
      return;
    }
    SELECTED_FOR_COMPARE.push(device);
    el.classList.add('selected');
  }
  compareCount.textContent = SELECTED_FOR_COMPARE.length;
  compareTray.classList.toggle('hidden', SELECTED_FOR_COMPARE.length === 0);
};

const toggleStar = (device) => {
  const key = `${device.romName}-${device.codename}`;
  const idx = STARRED_DEVICES.indexOf(key);
  if (idx > -1) STARRED_DEVICES.splice(idx, 1);
  else STARRED_DEVICES.push(key);
  localStorage.setItem('starred_devices', JSON.stringify(STARRED_DEVICES));
  render(lastResults); 
};

const showComparisonModal = () => {
  const t = TRANSLATIONS[currentLang];
  let html = `<table class="comparison-table">
    <thead>
      <tr>
        <th></th>
        ${SELECTED_FOR_COMPARE.map(d => `<th>${d.romName}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="row-title">${t.spec_device || (currentLang === 'en' ? 'Device' : 'Cihaz')}</td>
        ${SELECTED_FOR_COMPARE.map(d => `<td>${d.label}<br><code>${d.codename}</code></td>`).join('')}
      </tr>
      <tr>
        <td class="row-title">${t.spec_version || (currentLang === 'en' ? 'Android' : 'Sürüm')}</td>
        ${SELECTED_FOR_COMPARE.map(d => `<td>v${d.version || 'N/A'}</td>`).join('')}
      </tr>
      <tr>
        <td class="row-title">${t.spec_download || (currentLang === 'en' ? 'Download' : 'İndir')}</td>
        ${SELECTED_FOR_COMPARE.map(d => `<td><a href="${buildDownloadUrl(d.romName, d.codename, d)}" target="_blank" class="badge">Link</a></td>`).join('')}
      </tr>
    </tbody>
  </table>`;
  comparisonTableWrapper.innerHTML = html;
  compareModal.classList.remove('hidden');
};

compareBtn.addEventListener('click', showComparisonModal);
closeModal.addEventListener('click', () => compareModal.classList.add('hidden'));

const fetchSource = async (source) => {
  try {
    const res = await fetch(source.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    let devices = [];
    
    if (source.name === 'AlphaDroid' || source.name === 'Evolution X') {
       devices = payload.filter(e => e.name.endsWith('.json')).map(e => ({ 
         codename: e.name.replace('.json', ''), 
         romName: source.name 
       }));
    } else {
       devices = (Array.isArray(payload) ? payload : (payload.devices || Object.entries(payload).map(([c, v]) => ({ codename: c, ...v })))).map(d => ({
         ...d, romName: source.name, brand: d.brand || d.oem || 'Unknown'
       }));
    }
    return { ...source, devices, error: null };
  } catch (e) {
    return { ...source, devices: [], error: e.message };
  }
};

const render = (results) => {
  lastResults = results;
  romGrid.innerHTML = '';
  ALL_DEVICES_DATA = [...BACKUP_DEVICES];
  
  results.forEach(res => {
    res.devices.forEach(d => {
      const code = getDeviceCodename(d);
      ALL_DEVICES_DATA.push({ ...d, codename: code, label: getDeviceLabel(d, code), romName: res.name, brand: d.brand || d.oem || 'Unknown' });
    });
  });

  const groups = {};
  ALL_DEVICES_DATA.forEach(d => {
    if (!groups[d.romName]) groups[d.romName] = [];
    groups[d.romName].push(d);
  });

  Object.entries(groups).forEach(([romName, devices]) => {
    devices.sort((a, b) => {
      const aStarred = STARRED_DEVICES.includes(`${romName}-${a.codename}`);
      const bStarred = STARRED_DEVICES.includes(`${romName}-${b.codename}`);
      return bStarred - aStarred;
    });

    const node = romCardTemplate.content.cloneNode(true);
    node.querySelector('h3').textContent = romName;
    node.querySelector('.rom-card__meta').textContent = `${devices.length} Devices`;
    
    const list = node.querySelector('.device-list');
    devices.forEach((d) => {
      const li = document.createElement('li');
      const isStarred = STARRED_DEVICES.includes(`${romName}-${d.codename}`);
      li.dataset.codename = d.codename;
      li.dataset.brand = (d.brand || 'Unknown').toLowerCase();
      li.dataset.version = (d.version || d.android || '').toString();

      const isOfficial = d.status === 'Active' || romName.includes('LineageOS') || romName.includes('PixelOS');

      li.innerHTML = `
        <div class="device-actions-left">
          <div class="compare-checkbox"></div>
          <div class="star-btn ${isStarred ? 'starred' : ''}" title="Star Device">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          </div>
        </div>
        <div class="device-info-row">
          <a href="${buildDownloadUrl(romName, d.codename, d)}" target="_blank">${d.label || d.name}</a>
          <div class="device-tags">
            ${d.version || d.android ? `<span class="version-tag">v${d.version || d.android}</span>` : ''}
            ${isOfficial ? '<span class="status-badge status-active">Official</span>' : ''}
          </div>
        </div>
        <code>${d.codename}</code>
      `;
      
      const cb = li.querySelector('.compare-checkbox');
      const isSelected = SELECTED_FOR_COMPARE.some(s => s.codename === d.codename && s.romName === romName);
      if (isSelected) cb.classList.add('selected');

      cb.onclick = () => {
        toggleCompare({ codename: d.codename, label: d.label || d.name, romName: romName, version: d.version || d.android }, cb);
      };

      const sb = li.querySelector('.star-btn');
      sb.onclick = () => toggleStar({ codename: d.codename, romName: romName });
      
      list.appendChild(li);
    });

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

  const url = new URL(window.location);
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  if (b) url.searchParams.set('brand', b); else url.searchParams.delete('brand');
  if (v) url.searchParams.set('v', v); else url.searchParams.delete('v');
  window.history.replaceState({}, '', url);

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
  
  const params = new URLSearchParams(window.location.search);
  if (params.has('q')) searchInput.value = params.get('q');
  if (params.has('brand')) brandFilter.value = params.get('brand').toLowerCase();
  if (params.has('v')) androidFilter.value = params.get('v');

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
