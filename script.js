const ROM_SOURCES = [
  {
    name: 'LineageOS',
    url: 'https://raw.githubusercontent.com/LineageOS/hudson/main/updater/devices.json',
  },
  {
    name: 'AlphaDroid',
    url: 'https://api.github.com/repos/AlphaDroid-devices/OTA/contents',
    type: 'alphadroid-repo',
  },
  {
    name: 'AxionOS',
    url: 'https://raw.githubusercontent.com/AxionAOSP/official_devices/main/devices.json',
  },
  {
    name: 'Project Infinity',
    url: 'https://raw.githubusercontent.com/ProjectInfinity-X/official_devices/main/devices.json',
  },
  {
    name: 'YAAP',
    url: 'https://raw.githubusercontent.com/yaap/official_devices/master/devices.json',
  },
];

const romGrid = document.getElementById('romGrid');
const lastUpdated = document.getElementById('lastUpdated');
const refreshBtn = document.getElementById('refreshBtn');
const romCardTemplate = document.getElementById('romCardTemplate');

const parseAlphaDroidFile = (payload, fallbackCodename) => {
  if (!payload || typeof payload !== 'object') {
    return { codename: fallbackCodename, name: fallbackCodename };
  }

  const codename = payload.codename || payload.device || payload.id || fallbackCodename;
  const name = payload.device_name || payload.name || payload.model || codename;

  return { codename, name, ...payload };
};

const loadAlphaDroidDevices = async (source) => {
  const response = await fetch(source.url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const entries = await response.json();
  const jsonFiles = entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'));

  const devices = await Promise.all(
    jsonFiles.map(async (entry) => {
      const fileResponse = await fetch(entry.download_url, { cache: 'no-store' });
      if (!fileResponse.ok) {
        throw new Error(`HTTP ${fileResponse.status}`);
      }

      const payload = await fileResponse.json();
      const fallbackCodename = entry.name.replace(/\.json$/i, '');
      const parsed = parseAlphaDroidFile(payload, fallbackCodename);

      return {
        ...parsed,
        github_file_url: entry.html_url,
      };
    })
  );

  return { name: source.name, url: source.url, devices };
};

const normalizeDevices = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (payload && Array.isArray(payload.devices)) return payload.devices;

  if (payload && typeof payload === 'object') {
    const entries = Object.entries(payload);
    return entries.map(([codename, value]) => {
      if (typeof value === 'string') {
        return { codename, name: value };
      }

      if (value && typeof value === 'object') {
        return {
          codename,
          name: value.device_name || value.name || value.model || codename,
          ...value,
        };
      }

      return { codename, name: codename };
    });
  }

  return [];
};

const buildDownloadUrl = ({ romName, codename, device }) => {
  if (romName === 'LineageOS') {
    if (codename && codename !== 'unknown') {
      return `https://download.lineageos.org/devices/${encodeURIComponent(codename)}`;
    }

    return 'https://download.lineageos.org/devices';
  }

  const directUrl =
    device.download_url ||
    device.downloadUrl ||
    device.url ||
    device.rom_url ||
    device.website ||
    device.link ||
    (romName === 'AlphaDroid' ? device.github_file_url : null);

  if (directUrl) {
    return directUrl;
  }

  const query = encodeURIComponent(`${romName} ${codename} download`);
  return `https://www.google.com/search?q=${query}`;
};

const renderRomCard = ({ name, url, devices, error }) => {
  const node = romCardTemplate.content.cloneNode(true);
  const card = node.querySelector('.rom-card');
  const title = node.querySelector('h3');
  const sourceLink = node.querySelector('a');
  const meta = node.querySelector('.rom-card__meta');
  const errorText = node.querySelector('.rom-card__error');
  const list = node.querySelector('.device-list');

  title.textContent = name;
  sourceLink.href = url;
  sourceLink.textContent = 'Kaynak';

  if (error) {
    meta.textContent = 'Cihaz listesi alınamadı';
    errorText.hidden = false;
    errorText.textContent = error;
    card.dataset.state = 'error';
    return node;
  }

  meta.textContent = `${devices.length} cihaz bulundu`;

  devices
    .sort((a, b) => String(a.name || a.codename).localeCompare(String(b.name || b.codename)))
    .forEach((device) => {
      const li = document.createElement('li');
      const codename = device.codename || device.device || device.id || 'unknown';
      const label = device.name || device.device_name || codename;

      const downloadLink = document.createElement('a');
      downloadLink.href = buildDownloadUrl({ romName: name, codename, device });
      downloadLink.target = '_blank';
      downloadLink.rel = 'noreferrer';
      downloadLink.textContent = label;

      const code = document.createElement('code');
      code.textContent = `(${codename})`;

      li.append(downloadLink, ' ', code);
      list.append(li);
    });

  if (devices.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Bu kaynakta listelenecek cihaz bulunamadı.';
    list.append(li);
  }

  return node;
};

const loadSource = async (source) => {
  const { name, url, type } = source;

  try {
    if (type === 'alphadroid-repo') {
      return await loadAlphaDroidDevices(source);
    }

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    return { name, url, devices: normalizeDevices(payload) };
  } catch (error) {
    return {
      name,
      url,
      devices: [],
      error:
        'Veri çekme hatası. Kaynak URL yanlış olabilir ya da CORS/erişim kısıtı olabilir.',
    };
  }
};

const refreshData = async () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Yenileniyor...';
  romGrid.innerHTML = '';

  const results = await Promise.all(ROM_SOURCES.map(loadSource));
  results.forEach((result) => {
    romGrid.append(renderRomCard(result));
  });

  lastUpdated.textContent = `Son güncelleme: ${new Date().toLocaleString('tr-TR')}`;
  refreshBtn.textContent = 'Verileri Yenile';
  refreshBtn.disabled = false;
};

refreshBtn.addEventListener('click', refreshData);
refreshData();
