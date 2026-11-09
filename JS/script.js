/* script.js : navigasi antarhalaman KataBaku.id.
   Isi Beranda dan Pengantar kini langsung ada di index.html (interaksinya di JS/beranda.js),
   sedangkan Materi Inti, Cek Kata, dan Latihan memakai file JS masing-masing. */
(() => {
const HALAMAN = ['beranda', 'pengantar', 'cek_kata', 'materi', 'latihan', 'game'];
const $$ = s => [...document.querySelectorAll(s)];

function tampil(hal) {
  $$('.halaman').forEach(s => s.classList.toggle('d-none', s.id !== hal));
  $$('.navbar .nav-link').forEach(b => b.classList.toggle('aktif', b.dataset.hal === hal));
  const m = document.querySelector('#menu');
  if (m && m.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(m).hide();
  history.replaceState(null, '', '#' + hal);
  window.scrollTo({ top: 0 });
}
window.tampil = tampil;   // dipakai juga oleh JS/beranda.js

$$('[data-hal]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); tampil(b.dataset.hal); }));
const awal = location.hash.slice(1);
tampil(HALAMAN.includes(awal) && document.getElementById(awal) ? awal : 'beranda');
})();
