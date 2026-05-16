const ROM_SOURCES = [
  { name: 'LineageOS', url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json' },
  { name: 'AlphaDroid', url: 'https://api.github.com/repos/AlphaDroid-devices/OTA/contents', type: 'alphadroid-repo' },
  { name: 'AxionOS', url: 'https://raw.githubusercontent.com/AxionAOSP/official_devices/main/devices.json' },
  { name: 'Project Infinity', url: 'https://raw.githubusercontent.com/ProjectInfinity-X/official_devices/main/devices.json' },
  { name: 'YAAP', url: 'https://api.github.com/repos/yaap/ota-info/contents', type: 'yaap-repo' },
  { name: 'PixelOS', url: 'https://raw.githubusercontent.com/PixelOS-AOSP/official_devices/sixteen/API/devices.json' },
];

let CACHED_RESULTS = [];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const romCountBadge = document.getElementById('romCountBadge');
const deviceCountBadge = document.getElementById('deviceCountBadge');
const searchInput = document.getElementById('searchInput');
const romCardTemplate = document.getElementById('romCardTemplate');

const GITHUB_API_HEADERS = { Accept: 'application/vnd.github+json' };
const ALPHADROID_FALLBACK_URL = 'https://raw.githubusercontent.com/alphadroid-project/OTA/main/devices.json';

const normalizeDevices = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.devices)) return payload.devices;
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([codename, value]) => {
      if (typeof value === 'string') return { codename, name: value };
      return { codename, name: value.device_name || value.name || value.model || codename, ...value };
    });
  }
  return [];
};

const getDeviceCodename = (device) => 
  device.codename || device.device || device.id || device.model || device.slug || device.filename || 'unknown';

const getDeviceLabel = (device, codename) => {
  const brand = device.brand || device.manufacturer || device.oem || device.vendor || '';
  const name = device.device_name || device.name || device.model || '';
  if (brand && name && name.toLowerCase() !== codename.toLowerCase()) return `${brand} ${name}`;
  return name || brand || codename;
};

const buildDownloadUrl = ({ romName, codename, device }) => {
  const mapping = {
    'LineageOS': `https://download.lineageos.org/devices/${encodeURIComponent(codename)}/builds`,
    'AlphaDroid': `https://sourceforge.net/projects/alphadroid-project/files/${encodeURIComponent(codename)}`,
    'YAAP': `https://mirror.codebucket.de/yaap/device/${encodeURIComponent(codename)}/`,
    'PixelOS': `https://sourceforge.net/projects/pixelos-releases/files/sixteen/${encodeURIComponent(codename)}/`
  };
  if (mapping[romName] && codename !== 'unknown') return mapping[romName];
  return device.download_url || device.url || `https://www.google.com/search?q=${encodeURIComponent(romName + ' ' + codename + ' download')}`;
};

const fetchGithubContents = async (url) => {
  const res = await fetch(url, { cache: 'no-store', headers: GITHUB_API_HEADERS });
  return res.ok ? await res.json() : [];
};

const loadRepoStyle = async (source) => {
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
    // Handle both single device and array payloads
    let devList = [];
    if (Array.isArray(payload)) devList = payload;
    else if (payload.response) devList = [{ ...payload, codename }];
    else devList = [payload];
    return devList.map(d => ({ ...d, codename: d.codename || codename }));
  }));
  const devices = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  return { name: source.name, url: source.url, devices };
};

const loadSource = async (source) => {
  try {
    if (source.type === 'alphadroid-repo' || source.type === 'yaap-repo') return await loadRepoStyle(source);
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { name: source.name, url: source.url, devices: normalizeDevices(await res.json()) };
  } catch (e) {
    return { name: source.name, url: source.url, devices: [], error: e.message };
  }
};

const filterResults = () => {
  const term = searchInput.value.toLowerCase();
  let totalDevices = 0;

  document.querySelectorAll('.rom-card').forEach((card, idx) => {
    let hasMatch = false;
    const romName = card.querySelector('h3').textContent.toLowerCase();
    const items = card.querySelectorAll('.device-list li');
    
    items.forEach(li => {
      const text = li.textContent.toLowerCase();
      const codename = li.dataset.codename;
      const match = text.includes(term) || romName.includes(term) || codename.includes(term);
      li.classList.toggle('hidden', !match);
      if (match) {
        hasMatch = true;
        totalDevices++;
      }
    });
    
    card.classList.toggle('hidden', !hasMatch);
  });
  
  deviceCountBadge.textContent = `${totalDevices} Matches`;
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
    
    if (res.error) {
      node.querySelector('.rom-card__error').hidden = false;
      node.querySelector('.rom-card__error').textContent = res.error;
    }

    const list = node.querySelector('.device-list');
    res.devices.forEach(d => {
      globalCount++;
      const li = document.createElement('li');
      const codename = getDeviceCodename(d);
      li.dataset.codename = codename.toLowerCase();
      
      const a = document.createElement('a');
      a.href = buildDownloadUrl({ romName: res.name, codename, device: d });
      a.target = '_blank';
      a.textContent = getDeviceLabel(d, codename);
      
      const code = document.createElement('code');
      code.textContent = codename;
      
      li.append(a, code);
      list.append(li);
    });
    romGrid.append(node);
  });
  
  deviceCountBadge.textContent = `${globalCount} Total Devices`;
  romCountBadge.textContent = `${results.length} Sources`;
  CACHED_RESULTS = results;
  filterResults();
};

const refreshData = async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Fetching...';
  const results = await Promise.all(ROM_SOURCES.map(loadSource));
  render(results);
  lastUpdated.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  refreshBtn.textContent = 'Refresh Data';
  refreshBtn.disabled = false;
};

searchInput.addEventListener('input', filterResults);
refreshBtn.addEventListener('click', refreshData);
refreshData();
