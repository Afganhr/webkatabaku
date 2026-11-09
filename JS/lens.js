/* JS/lens.js : KataBaku Lens - kamera, OCR (Tesseract.js), dan pemeriksaan kata baku.
   Database kata: databaku.json (sama dengan Cek Kata). Tombol "Cek di Cek Kata" ditangani JS/beranda.js. */
(() => {
'use strict';
const URL_DATA = 'databaku.json';   // samakan dengan JS/cek-kata.js
const URL_TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';   // dimuat hanya saat pertama kali memindai
const MAKS_SISI = 1600, MAKS_FILE = 15 * 1024 * 1024;
const KBBI = k => 'https://kbbi.kemendikdasmen.go.id/entri/' + encodeURIComponent(k.toLowerCase());

const sec = document.querySelector('#lens'); if (!sec) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nk = s => String(s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
const icons = () => window.lucide && lucide.createIcons();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const v = $('#ln-video'), foto = $('#ln-foto'), cv = $('#ln-canvas');
const LABEL = { baku: ['Baku', 'ln-baku'], tidak_baku: ['Tidak baku', 'ln-tb'], tidak_dikenali: ['Belum dikenali', 'ln-tk'] };
let stream = null, facing = 'environment', worker = null, indeks = null, hasil = [], jml = 0;

const pesan = t => { const e = $('#ln-pesan'); e.hidden = !t; e.textContent = t || ''; };
const muat = (on, t) => { $('#ln-loading').hidden = !on; if (t) $('#ln-status').textContent = t; if (on) $('#ln-bar').style.width = '0'; };

/* ---------- Database kata ---------- */
fetch(URL_DATA).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(raw => {
  indeks = new Map(); jml = raw.length;
  const bk = raw.map(r => ({ b: String(r.kata_baku).trim(), t: String(r.kata_tidak_baku || '').split(',').map(x => x.trim()).filter(Boolean) }));
  bk.forEach(({ b, t }) => t.forEach(x => { if (nk(x) !== nk(b)) indeks.set(nk(x), { s: 'tidak_baku', b }); }));
  bk.forEach(({ b, t }) => indeks.set(nk(b), { s: 'baku', b, tb: t.filter(x => nk(x) !== nk(b)) }));   // entri baku menimpa bila ada bentrok
  $('#ln-jml').textContent = jml; $('#ln-periksa').disabled = !$('#ln-teks').value.trim();
}).catch(() => pesan('Database kata (databaku.json) belum dapat dimuat. Pastikan file itu satu folder dengan index.html dan buka lewat Live Server atau GitHub Pages.'));

/* ---------- Mode tampilan area pemindaian: idle | kamera | foto ---------- */
function mode(m) {
  v.hidden = m !== 'kamera'; foto.hidden = m !== 'foto'; $('#ln-kosong').hidden = m !== 'idle';
  $('#ln-stage').classList.toggle('kamera', m === 'kamera');
  $('#ln-ambil').disabled = $('#ln-ganti').disabled = m !== 'kamera'; $('#ln-ulang').hidden = m !== 'foto';
  $('#ln-mulai').innerHTML = m === 'kamera' ? '<i data-lucide="video-off"></i> Matikan Kamera' : '<i data-lucide="video"></i> Aktifkan Kamera';
  icons();
}

/* ---------- Kamera ---------- */
function stopKamera() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.srcObject = null; }
async function mulaiKamera() {
  pesan('');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return pesan('Peramban ini belum mendukung akses kamera. Gunakan tombol Unggah Gambar.');
  if (!window.isSecureContext) return pesan('Kamera hanya dapat dipakai lewat HTTPS atau localhost. Buka website lewat Live Server atau GitHub Pages.');
  try {
    stopKamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 } }, audio: false });
    v.srcObject = stream; await v.play(); mode('kamera');
  } catch (e) {
    stopKamera(); mode('idle');
    pesan({ NotAllowedError: 'Izin kamera ditolak. Izinkan kamera pada pengaturan peramban, atau pakai Unggah Gambar.', PermissionDeniedError: 'Izin kamera ditolak. Izinkan kamera pada pengaturan peramban, atau pakai Unggah Gambar.',
      NotFoundError: 'Kamera tidak ditemukan pada perangkat ini. Gunakan Unggah Gambar.', NotReadableError: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.' }[e.name] || 'Kamera tidak dapat dibuka. Coba lagi atau gunakan Unggah Gambar.');
  }
}
$('#ln-mulai').addEventListener('click', () => { if (stream) { stopKamera(); mode('idle'); } else mulaiKamera(); });
$('#ln-ganti').addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; mulaiKamera(); });
$('#ln-ambil').addEventListener('click', () => { if (!stream || !v.videoWidth) return; kePutih(v, v.videoWidth, v.videoHeight); stopKamera(); proses(); });
$('#ln-ulang').addEventListener('click', () => { pesan(''); mode('idle'); $('#ln-hasil').hidden = true; $('#ln-teks').value = ''; $('#ln-periksa').disabled = true; });
new MutationObserver(() => { if (sec.classList.contains('d-none') && stream) { stopKamera(); mode('idle'); } }).observe(sec, { attributes: true, attributeFilter: ['class'] });   // matikan kamera saat pindah halaman

/* ---------- Gambar -> kanvas (diperkecil agar OCR cepat) ---------- */
function kePutih(src, w, h) {
  const k = Math.min(1, MAKS_SISI / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
}
$('#ln-file').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return; pesan('');
  if (!f.type.startsWith('image/')) return pesan('File harus berupa gambar (JPG, PNG, atau WebP).');
  if (f.size > MAKS_FILE) return pesan('Ukuran gambar terlalu besar (maksimal 15 MB).');
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => { stopKamera(); kePutih(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); proses(); };
  img.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak dapat dibaca. Coba file lain.'); };
  img.src = url;
});

/* ---------- OCR (Tesseract.js, bahasa Indonesia) ---------- */
const muatLib = () => window.Tesseract ? Promise.resolve() : new Promise((ok, gagal) => { const s = document.createElement('script'); s.src = URL_TESS; s.onload = ok; s.onerror = () => gagal(new Error('lib')); document.head.appendChild(s); });
const TAHAP = { 'loading tesseract core': 'Memuat mesin OCR…', 'initializing tesseract': 'Menyiapkan OCR…', 'loading language traineddata': 'Mengunduh model bahasa Indonesia…', 'initializing api': 'Menyiapkan OCR…', 'recognizing text': 'Membaca tulisan…' };
async function proses() {
  mode('foto'); foto.src = cv.toDataURL('image/jpeg', .85); $('#ln-hasil').hidden = true; $('#ln-teks').value = ''; $('#ln-periksa').disabled = true;
  muat(true, 'Menyiapkan OCR…');
  try {
    await muatLib();
    if (!worker) worker = await Tesseract.createWorker('ind', 1, { logger: m => { if (TAHAP[m.status]) $('#ln-status').textContent = TAHAP[m.status]; $('#ln-bar').style.width = Math.round((m.progress || 0) * 100) + '%'; } });
    const { data } = await worker.recognize(cv), teks = (data.text || '').trim();
    if (!teks) return pesan('OCR tidak menemukan tulisan pada gambar. Coba foto yang lebih terang, lebih dekat, dan tidak buram.');
    $('#ln-teks').value = teks; periksa();
  } catch (e) {
    worker = null;
    pesan('OCR gagal memproses gambar. Pastikan koneksi internet aktif (model bahasa diunduh saat pertama kali), lalu coba lagi.');
  } finally { muat(false); }
}

/* ---------- Pemeriksaan kata ---------- */
function periksaTeks(teks) {
  const tok = teks.normalize('NFKC').replace(/[’‘`´]/g, "'").match(/\p{L}+(?:['-]\p{L}+)*/gu) || [], out = new Map();
  for (let i = 0; i < tok.length;) {
    let hit = null, len = 1;
    for (let n = Math.min(3, tok.length - i); n >= 1; n--) { const fr = tok.slice(i, i + n).join(' '), e = indeks.get(nk(fr)); if (e) { hit = { fr, e }; len = n; break; } }   // frasa 3, 2, lalu 1 kata
    const kata = hit ? hit.fr : tok[i], k = nk(kata);
    if (!out.has(k)) out.set(k, { kata, n: 0, s: hit ? hit.e.s : 'tidak_dikenali', baku: hit && hit.e.s === 'tidak_baku' ? hit.e.b : null });
    out.get(k).n++; i += len;
  }
  return [...out.values()].filter(x => x.s !== 'tidak_dikenali' || x.kata.length > 1);   // abaikan huruf tunggal yang tak dikenal (noise OCR)
}
function periksa() {
  const t = $('#ln-teks').value; pesan('');
  if (!t.trim()) return pesan('Belum ada teks untuk diperiksa.');
  if (!indeks) return pesan('Database kata belum termuat. Tunggu sebentar lalu coba lagi.');
  hasil = periksaTeks(t);
  if (!hasil.length) return pesan('Tidak ada kata yang dapat diperiksa dari teks ini.');
  render(); if (!reduce) $('#ln-hasil').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function render() {
  const c = { baku: 0, tidak_baku: 0, tidak_dikenali: 0 }; hasil.forEach(h => c[h.s]++);
  const tot = hasil.length, kenal = c.baku + c.tidak_baku, pct = kenal ? Math.round(c.baku / kenal * 100) : null;
  $('#ln-stats').innerHTML = [['Kata diperiksa', tot, ''], ['Kata baku', c.baku, 'ln-baku'], ['Tidak baku', c.tidak_baku, 'ln-tb'], ['Belum dikenali', c.tidak_dikenali, 'ln-tk'], ['Baku dari kata yang dikenali', pct == null ? '–' : pct + '%', '']]
    .map(([l, n, k]) => `<div class="ln-stat ${k}"><b>${n}</b><small>${l}</small></div>`).join('');
  $('#ln-tumpuk').innerHTML = [['baku', '#22c55e'], ['tidak_baku', '#ef4444'], ['tidak_dikenali', '#facc15']].map(([k, w]) => `<i style="width:${c[k] / tot * 100}%;background:${w}" title="${LABEL[k][0]}: ${c[k]}"></i>`).join('');
  $('#ln-baris').innerHTML = hasil.map((h, i) => `<tr data-i="${i}" tabindex="0"><td><b>${esc(h.kata)}</b>${h.n > 1 ? ` <small class="text-secondary">×${h.n}</small>` : ''}</td><td><span class="ln-b ${LABEL[h.s][1]}">${LABEL[h.s][0]}</span></td><td>${h.baku ? `<b class="text-success">${esc(h.baku)}</b>` : '–'}</td></tr>`).join('');
  $('#ln-terapkan').hidden = !c.tidak_baku; $('#ln-hasil').hidden = false;
  detail(Math.max(0, hasil.findIndex(h => h.s === 'tidak_baku')));
}
function detail(i) {
  const h = hasil[i]; if (!h) return;
  $$('#ln-baris tr').forEach((r, k) => r.classList.toggle('pilih', k === i));
  const [lb, kls] = LABEL[h.s], e = indeks.get(nk(h.kata)); let isi;
  if (h.s === 'tidak_baku') isi = `<p>Bentuk baku: <b class="text-success fs-5">${esc(h.baku)}</b></p><p class="text-secondary">Bentuk baku adalah ${esc(h.baku)}.</p>`;
  else if (h.s === 'baku') isi = `<p class="text-secondary">Kata ini tercatat sebagai bentuk baku di database.${e && e.tb && e.tb.length ? ` Bentuk keliru yang sering muncul: <b>${esc(e.tb.join(', '))}</b>.` : ''}</p>`;
  else isi = `<p class="text-secondary">Kata ini belum ada di database (${jml} pasang kata), jadi statusnya belum dapat dipastikan. Ini <b>tidak</b> berarti kata tersebut tidak baku. Periksa langsung di KBBI.</p>`;
  $('#ln-detail').innerHTML = `<span class="ln-b ${kls}">${lb}</span><h3 class="mt-2 mb-1">${esc(h.kata)}</h3><p class="small text-secondary">Terdeteksi ${h.n} kali dalam teks.</p>${isi}
    <div class="d-flex flex-wrap gap-2"><a class="btn btn-sm bn-btn" href="${KBBI(h.baku || h.kata)}" target="_blank" rel="noopener">Lihat di KBBI ↗</a>
    <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" data-cek="${esc(h.kata)}">Cek di Cek Kata</button>
    ${h.baku ? `<button class="btn btn-sm btn-outline-success rounded-pill" type="button" data-salin="${esc(h.baku)}">Salin kata baku</button>` : ''}</div>`;
}
function terapkan() {
  let t = $('#ln-teks').value;
  hasil.filter(h => h.s === 'tidak_baku').forEach(h => {
    const re = new RegExp('(?<![\\p{L}])' + h.kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'giu'), b = h.baku.toLowerCase();
    t = t.replace(re, m => m[0] !== m[0].toLowerCase() ? b[0].toUpperCase() + b.slice(1) : b);
  });
  $('#ln-teks').value = t; periksa();
}

/* ---------- Pemasangan acara ---------- */
$('#ln-periksa').addEventListener('click', periksa);
$('#ln-terapkan').addEventListener('click', terapkan);
$('#ln-teks').addEventListener('input', e => { $('#ln-periksa').disabled = !indeks || !e.target.value.trim(); });
$('#ln-baris').addEventListener('click', e => { const r = e.target.closest('tr'); if (r) detail(+r.dataset.i); });
$('#ln-baris').addEventListener('keydown', e => { const r = e.target.closest('tr'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); detail(+r.dataset.i); } });
$('#ln-detail').addEventListener('click', async e => {
  const b = e.target.closest('[data-salin]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.salin); b.textContent = 'Tersalin ✓'; } catch (err) { b.textContent = 'Gagal menyalin'; }
  setTimeout(() => { b.textContent = 'Salin kata baku'; }, 1500);
});
mode('idle');
})();
