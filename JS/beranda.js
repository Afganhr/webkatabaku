/* JS/beranda.js : interaksi Beranda, Pengantar, dan footer.
   Memakai tampil() dari script.js dan data kata dari databaku.json.
   Semua penentuan "hari" memakai waktu Indonesia Barat (WIB, UTC+7), bukan jam perangkat. */
(() => {
'use strict';
const URL_DATA = 'databaku.json';   // samakan dengan URL_DATA di JS/cek-kata.js

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = () => window.lucide && lucide.createIcons();
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const simpan = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ---------- Waktu Indonesia (WIB = UTC+7; tanpa waktu musim panas) ---------- */
const wib = () => new Date(Date.now() + 7 * 3600e3);                 // kolom UTC pada objek ini = jam dinding WIB
const tglWib = d => d.toISOString().slice(0, 10);                     // "YYYY-MM-DD" menurut WIB
const noHari = () => Math.floor(wib().getTime() / 864e5);             // nomor hari; berganti pukul 00.00 WIB
const kemarin = () => tglWib(new Date(wib().getTime() - 864e5));
const sisaDetik = () => { const d = wib(); return 86400 - (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()); };
const hms = s => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
const benih = n => () => { n |= 0; n = n + 0x6D2B79F5 | 0; let t = Math.imul(n ^ n >>> 15, 1 | n); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------- Angka yang menghitung naik ---------- */
function hitung(el) {
  const n = +el.dataset.n; if (reduce) { el.textContent = n; return; }
  const t0 = performance.now(), f = t => { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
$$('#beranda [data-n]').forEach(hitung);

/* ---------- Navigasi antar halaman ---------- */
function bukaBab(id) {
  window.tampil('materi');
  setTimeout(() => { const e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 120);
}
function cekKata(kata) {
  window.tampil('cek_kata');
  const i = $('#ck-input'), f = $('#ck-form');
  if (i && f) { i.value = kata; f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
}

/* ---------- Kata hari ini ---------- */
let DATA = [], geser = 0, hariTampil = tglWib(wib());
const idxKH = () => noHari() % DATA.length;
function kataHariIni() {
  const d = DATA[(idxKH() + geser) % DATA.length];
  $('#bn-kh').className = '';
  $('#bn-kh').innerHTML = `<div class="bn-pair"><span class="bn-tb">${esc(d.tb[0])}</span><i data-lucide="arrow-right"></i><span class="bn-bk">${esc(d.baku)}</span></div>
    <p class="text-secondary small mb-3">“${esc(d.tb[0])}” belum baku. Bentuk bakunya adalah “${esc(d.baku)}”.</p>
    <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm bn-btn" data-cek="${esc(d.tb[0])}">Lihat di Cek Kata</button><button type="button" class="btn btn-sm btn-outline-primary rounded-pill" data-kh>Kata lain</button></div>`;
  icons();
}

/* ---------- Tebak cepat: satu soal per hari (WIB) ---------- */
const K_JAWAB = 'katabaku.tebak.harian', K_STAT = 'katabaku.tebak.stat';
let stat = ls(K_STAT, { benar: 0, runtun: 0, terbaik: 0, terakhir: '' }), soal = null;
const tampilSkor = () => { $('#bn-benar').textContent = stat.benar; $('#bn-runtun').textContent = stat.runtun; $('#bn-terbaik').textContent = stat.terbaik; };
function soalHarian() {
  const rnd = benih(noHari()); let i = Math.floor(rnd() * DATA.length);
  if (DATA.length > 1 && i === idxKH()) i = (i + 1) % DATA.length;   // jangan sama dengan "kata hari ini"
  const d = DATA[i], w = d.tb[Math.floor(rnd() * d.tb.length)], urut = rnd() < .5;
  const o = [{ t: d.baku, ok: true }, { t: w, ok: false }]; if (urut) o.reverse();
  return { tgl: tglWib(wib()), baku: d.baku, w, o };
}
function tampilTebak() {
  soal = soalHarian();
  const j = ls(K_JAWAB, null), sudah = !!j && j.tgl === soal.tgl;
  const opsi = soal.o.map((x, i) => `<button type="button" class="bn-opt ${sudah && x.ok ? 'ok' : ''} ${sudah && !x.ok && j.pilih === x.t ? 'no' : ''}" data-opt="${i}" ${sudah ? 'disabled' : ''}>${esc(x.t)}</button>`).join('');
  const umpan = sudah
    ? `<span>${j.ok ? '<b class="text-success">Benar!</b>' : '<b class="text-danger">Belum tepat.</b>'} “${esc(soal.baku)}” adalah bentuk baku, bukan “${esc(soal.w)}”.</span>
       <span class="bn-hitung"><i data-lucide="clock"></i> Soal berikutnya dalam <span id="bn-hitung">${hms(sisaDetik())}</span></span>` : '<span class="text-secondary">Pilih salah satu. Kamu hanya punya satu kesempatan hari ini.</span>';
  $('#bn-tebak').className = '';
  $('#bn-tebak').innerHTML = `<div class="bn-opts">${opsi}</div><div class="bn-umpan" role="status">${umpan}</div>`;
  icons();
}
function jawab(i) {
  if (!soal || ls(K_JAWAB, {}).tgl === soal.tgl) return;               // sudah menjawab hari ini
  const x = soal.o[i], hari = soal.tgl;
  simpan(K_JAWAB, { tgl: hari, pilih: x.t, ok: x.ok });
  if (x.ok) { stat.benar++; stat.runtun = stat.terakhir === kemarin() ? stat.runtun + 1 : 1; stat.terakhir = hari; stat.terbaik = Math.max(stat.terbaik, stat.runtun); }
  else stat.runtun = 0;
  simpan(K_STAT, stat); tampilSkor(); tampilTebak();
}
if (stat.runtun && stat.terakhir !== tglWib(wib()) && stat.terakhir !== kemarin()) { stat.runtun = 0; simpan(K_STAT, stat); }   // melewatkan sehari = beruntun kembali 0
tampilSkor();

/* Setiap detik: perbarui hitung mundur; saat pukul 00.00 WIB soal dan kata hari ini berganti */
setInterval(() => {
  const h = tglWib(wib());
  if (h !== hariTampil && DATA.length) { hariTampil = h; geser = 0; if (stat.terakhir !== kemarin()) { stat.runtun = 0; simpan(K_STAT, stat); tampilSkor(); } kataHariIni(); tampilTebak(); return; }
  const c = $('#bn-hitung'); if (c) c.textContent = hms(sisaDetik());
}, 1000);

fetch(URL_DATA).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(raw => {
  DATA = raw.map(r => { const b = String(r.kata_baku).trim();
    return { baku: b, tb: String(r.kata_tidak_baku || '').split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== b.toLowerCase()) }; }).filter(d => d.tb.length);
  const j = $('#bn-jml'); j.dataset.n = raw.length; hitung(j);
  kataHariIni(); tampilTebak();
}).catch(() => {
  ['#bn-kh', '#bn-tebak'].forEach(s => { $(s).className = ''; $(s).innerHTML = '<p class="text-secondary small mb-0">Data kata belum dapat dimuat. Pastikan <code>databaku.json</code> satu folder dengan index.html, dan buka lewat Live Server atau GitHub Pages.</p>'; });
  $('#bn-jml').textContent = '–';
});

/* ---------- Pengantar: perbaiki kalimat dengan mengetuk kata ---------- */
function ketukKata(w) {
  const fix = w.classList.toggle('fix'); w.textContent = fix ? w.dataset.b : w.dataset.tb; w.setAttribute('aria-pressed', fix);
  const n = $$('.pg-w.fix').length, tot = $$('.pg-w').length;
  $('#pg-n').textContent = n; $('#pg-kiri').classList.toggle('pg-selesai', n === tot); $('#pg-ok').hidden = n !== tot;
}

/* ---------- Satu pendengar klik untuk semua tombol interaktif ---------- */
document.addEventListener('click', e => {
  const t = e.target; let b;
  if ((b = t.closest('[data-bab]'))) return bukaBab(b.dataset.bab);
  if ((b = t.closest('[data-cek]'))) return cekKata(b.dataset.cek);
  if ((b = t.closest('[data-opt]'))) return jawab(+b.dataset.opt);
  if (t.closest('[data-kh]')) { geser++; return kataHariIni(); }
  if ((b = t.closest('.pg-w'))) return ketukKata(b);
  if (t.closest('#kb-atas')) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
});

/* ---------- Footer & ikon ---------- */
$('#kb-tahun').textContent = new Date().getFullYear();
icons();
})();
