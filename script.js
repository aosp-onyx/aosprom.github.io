const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'AlphaDroid', url: 'https://raw.githubusercontent.com/alphadroid-project/OTA/main/devices.json', fallbackUrl: 'https://api.github.com/repos/AlphaDroid-devices/OTA/contents' },
  { name: 'AxionOS', url: 'https://raw.githubusercontent.com/AxionAOSP/official_devices/main/devices.json' },
  { name: 'Project Infinity', url: 'https://raw.githubusercontent.com/ProjectInfinity-X/official_devices/main/devices.json' },
  { name: 'YAAP', url: 'https://api.github.com/repos/yaap/ota-info/contents', type: 'yaap-repo' },
  { name: 'PixelOS', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/sixteen/API/devices.json' },
];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const romCountBadge = document.getElementById('romCountBadge');
const deviceCountBadge = document.getElementById('deviceCountBadge');
const searchInput = document.getElementById('searchInput');
const romCardTemplate = document.getElementById('romCardTemplate');

const GITHUB_API_HEADERS = { Accept: 'application/vnd.github+json' };

const getDeviceCodename = (d) => d.codename || d.device || d.id || d.model || 'unknown';
const getDeviceLabel = (d, code) => d.device_name || d.name || d.model || code;

const getMaintenanceStatus = (datetime) => {
  if (!datetime) return null;
  const buildDate = new Date(datetime * 1000);
  const diffMonths = (new Date() - buildDate) / (1000 * 60 * 60 * 24 * 30);
  return diffMonths < 3 ? 'Active' : 'Inactive';
};

const buildDownloadUrl = ({ romName, codename, device }) => {
  const mapping = {
    'LineageOS': `https://download.lineageos.org/devices/${codename}/builds`,
    'AlphaDroid': `https://sourceforge.net/projects/alphadroid-project/files/${codename}`,
    'YAAP': `https://mirror.codebucket.de/yaap/device/${codename}/`,
    'PixelOS': `https://sourceforge.net/projects/pixelos-releases/files/sixteen/${codename}/`
  };
  return mapping[romName] || device.download_url || device.url || `https://www.google.com/search?q=${romName}+${codename}+download`;
};

const fetchGithubContents = async (url) => {
  const res = await fetch(url, { cache: 'no-store', headers: GITHUB_API_HEADERS });
  if (!res.ok) throw new Error(`Rate limit or API error (${res.status})`);
  return await res.json();
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
      return devList.map(d => ({ ...d, codename: d.codename || codename, datetime: d.datetime || d.date || null }));
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
    if (source.type === 'alphadroid-repo' || source.type === 'yaap-repo') {
      result = await loadRepoStyle(source);
    } else {
      const res = await fetch(source.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const devices = (Array.isArray(payload) ? payload : payload.devices || Object.entries(payload).map(([c, v]) => ({ codename: c, ...v }))).map(d => ({
        ...d, datetime: d.datetime || d.date || null
      }));
      result = { name: source.name, url: source.url, devices };
    }
    localStorage.setItem(cacheKey, JSON.stringify({ devices: result.devices, timestamp: Date.now() }));
    return result;
  } catch (e) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { devices, timestamp } = JSON.parse(cached);
      return { name: source.name, url: source.url, devices, isCached: true, cachedTime: new Date(timestamp).toLocaleTimeString() };
    }
    return { name: source.name, url: source.url, devices: [], error: e.message };
  }
};

const render = (results) => {
  romGrid.innerHTML = '';
  let globalCount = 0;
  results.forEach(res => {
    const node = romCardTemplate.content.cloneNode(true);
    const card = node.querySelector('.rom-card');
    node.querySelector('h3').textContent = res.name;
    node.querySelector('.source-link').href = res.url;
    node.querySelector('.rom-card__meta').textContent = `${res.devices.length} Devices`;
    
    if (res.isCached) {
      const badge = document.createElement('span');
      badge.className = 'status-badge status-inactive';
      badge.style.fontSize = '0.6rem';
      badge.textContent = `Offline (Saved ${res.cachedTime})`;
      node.querySelector('.rom-card__title-group').appendChild(badge);
    }

    if (res.error) {
      node.querySelector('.rom-card__error').hidden = false;
      node.querySelector('.rom-card__error').textContent = res.error;
    }
    const list = node.querySelector('.device-list');
    res.devices.forEach(d => {
      globalCount++;
      const li = document.createElement('li');
      const code = getDeviceCodename(d).toLowerCase();
      li.dataset.codename = code;
      
      const infoWrapper = document.createElement('div');
      infoWrapper.className = 'device-info-row';

      const a = document.createElement('a');
      a.href = buildDownloadUrl({ romName: res.name, codename: code, device: d });
      a.target = '_blank';
      a.textContent = getDeviceLabel(d, code);
      
      const status = getMaintenanceStatus(d.datetime);
      if (status) {
        const span = document.createElement('span');
        span.className = `status-badge status-${status.toLowerCase()}`;
        span.textContent = status;
        a.appendChild(span);
      }

      const version = d.version || d.android || '';
      if (version) {
        const vTag = document.createElement('span');
        vTag.className = 'version-tag';
        vTag.textContent = `v${version}`;
        infoWrapper.appendChild(vTag);
      }

      const cTag = document.createElement('code');
      cTag.textContent = code;
      
      infoWrapper.prepend(a);
      li.append(infoWrapper, cTag);
      list.appendChild(li);
    });
    romGrid.appendChild(node);
  });
  deviceCountBadge.textContent = `${globalCount} Total Devices`;
  romCountBadge.textContent = `${results.length} Sources`;
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
  deviceCountBadge.textContent = `${matches} Matches`;
};

const refreshData = async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Syncing...';
  const results = await Promise.all(ROM_SOURCES.map(loadSource));
  render(results);
  lastUpdated.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  refreshBtn.textContent = 'Refresh Data';
  refreshBtn.disabled = false;
};

searchInput.addEventListener('input', filterResults);
refreshBtn.addEventListener('click', refreshData);
refreshData();
