// Download links always point at the newest GitHub release ("releases/latest/download/<asset>"),
// so the page never needs a rebuild to serve a new version. version.json is written by CI.
const REPO = 'Nikzz3/wildlinge';
const GH = `https://github.com/${REPO}`;
const assetUrl = (asset) => `${GH}/releases/latest/download/${asset}`;

const OS = {
  windows: { label: 'Für Windows herunterladen', asset: 'Wildlinge-windows-x64.zip' },
  mac: { label: 'Für macOS herunterladen', asset: 'Wildlinge-macos-arm64.zip' },
  linux: { label: 'Für Linux herunterladen', asset: 'Wildlinge-linux-x64.tar.gz' },
};

function detectOs() {
  const ua = `${navigator.userAgentData?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();
  if (/android|iphone|ipad|ipod/.test(ua)) return null; // no desktop build to offer
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return null;
}

for (const a of document.querySelectorAll('[data-asset]')) a.href = assetUrl(a.dataset.asset);
for (const a of document.querySelectorAll('[data-releases]')) a.href = `${GH}/releases`;
for (const a of document.querySelectorAll('[data-repo]')) a.href = GH;

const os = detectOs();
if (os) {
  const primary = document.getElementById('primary-download');
  primary.href = assetUrl(OS[os].asset);
  document.getElementById('primary-label').textContent = OS[os].label;
  document.getElementById('primary-meta').innerHTML = 'Andere Systeme? <a href="#download">Alle Downloads</a>';
  document.querySelector(`.platform[data-os="${os}"]`)?.classList.add('is-yours');
}

fetch('version.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then(({ version }) => {
    for (const el of document.querySelectorAll('[data-version]')) el.textContent = `Version ${version}`;
  })
  .catch(() => {}); // local preview: keep the generic label

// Starter picker: a tiny nod to the lab scene, with a typewriter dialog box.
const dialog = document.getElementById('dialog-text');
let typing;
function say(text) {
  clearInterval(typing);
  let i = 0;
  dialog.textContent = '';
  typing = setInterval(() => {
    dialog.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typing);
  }, 28);
}
for (const btn of document.querySelectorAll('.starter')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.starter').forEach((b) => b.classList.toggle('is-picked', b === btn));
    say(`${btn.dataset.line} Lade das Spiel herunter und hol dir ${btn.dataset.name} im Labor in Moosbach!`);
  });
}
