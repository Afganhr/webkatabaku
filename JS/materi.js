/* ===== JS/materi.js : halaman Materi Inti KataBaku.id =====
   Struktur: (1) utilitas, (2) komponen reusable, (3) data materi, (4) render, (5) interaksi.
   Mengubah isi materi: edit bagian "DATA MATERI". */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Mo = window.Motion, anim = !!Mo && !reduce;
const sec = $('#materi');
if (anim) sec.classList.add('anim');
const icons = () => window.lucide && lucide.createIcons();
const ico = (n, c = '') => `<i data-lucide="${n}" class="${c}"></i>`;
const fm = s => s.replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>').replace(/(https:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

/* ---------- Komponen reusable ---------- */
const acc = (id, items, open = -1) => `<div class="accordion" id="${id}">${items.map(([ic, t, body], i) =>
  `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button ${i === open ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${id}-${i}">${ico(ic)}${t}</button></h3>` +
  `<div id="${id}-${i}" class="accordion-collapse collapse ${i === open ? 'show' : ''}" data-bs-parent="#${id}"><div class="accordion-body">${body}</div></div></div>`).join('')}</div>`;
const card = (ic, t, p) => `<div class="ck stg"><div class="ic">${ico(ic)}</div><h3>${t}</h3><p>${p}</p></div>`;
const tbl = (c3, rows) => `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Kata baku</th><th>Kata tidak baku</th>${c3 ? `<th>${c3}</th>` : ''}</tr></thead><tbody>${rows.map(r =>
  `<tr><td class="ok">${r[0]}</td><td class="no">${r[1]}</td>${c3 ? `<td>${r[2]}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;

/* ---------- DATA MATERI ---------- */
const K4 = [
 ['circle-plus', 'Kata baku menjadi tidak baku akibat penambahan huruf', 'Penambahan huruf', [['Film','Filem','E'],['Istri','Isteri','E'],['Putri','Puteri','E'],['Sastra','Sastera','E'],['Klasik','Kelasik','E']]],
 ['circle-minus', 'Kata baku menjadi tidak baku akibat pengurangan huruf', 'Pengurangan huruf', [['Ikhlas','Ihlas','K'],['Saraf','Syaraf','—'],['Akhlak','Ahlak','K'],['Telepon','Telfon','O'],['Ambulans','Ambulan','S']]],
 ['repeat', 'Kata baku menjadi tidak baku akibat perubahan huruf', 'Perubahan huruf', [['Izin','Ijin','Z → J'],['Sabtu','Saptu','B → P'],['Lazim','Lajim','Z → J'],['Lembap','Lembab','P → B'],['Kualitas','Kwalitas','U → W']]],
 ['scissors', 'Kata baku dan tidak baku akibat pemisahan penulisan', 0, [['Matahari','Mata hari'],['Kosakata','Kosa kata'],['Kacamata','Kaca mata'],['Daripada','Dari pada'],['Serbaguna','Serba guna'],['Apabila','Apa bila']]],
 ['link', 'Kata baku menjadi tidak baku akibat penyatuan tulisan', 0, [['Luar biasa','Luarbiasa'],['Orang tua','Orangtua'],['Kereta api','Keretaapi'],['Rumah sakit','Rumahsakit']]],
 ['unlink', 'Kata bentukan baku menjadi tidak baku akibat pemisahan penulisan', 0, [['Disalahgunakan','Disalah gunakan'],['Pertanggungjawaban','Pertanggung jawaban'],['Memperjualbelikan','Memperjual belikan']]]
];
const BANDING = [['izin','ijin'],['mengikuti','ngikutin'],['tidak','enggak'],['mengucapkan','ngucapin'],['terima kasih','makasih'],['praktik','praktek'],['nasihat','nasehat'],['aktivitas','aktifitas'],['risiko','resiko']];
const SURAT1 = 'Yth. Bapak/Ibu Wali Kelas VIII-B\ndi tempat\n\nDengan hormat,\n\nSaya selaku orang tua/wali dari siswa kelas VIII-B memohon izin bahwa anak saya tidak dapat mengikuti kegiatan pembelajaran pada hari Jumat karena sakit. Sebagai bukti, saya melampirkan surat keterangan dari dokter.\n\nDemikian surat izin ini saya sampaikan. Atas perhatian dan izin Bapak/Ibu, saya mengucapkan terima kasih.\n\nHormat saya,\nOrang tua/wali siswa';
const SURAT2 = 'Yth. Bapak/Ibu Wali Kelas VIII-B\ndi tempat\n\nDengan hormat,\n\nSaya mau minta <mark class="tb">ijin</mark> kalau anak saya <mark class="tb">nggak</mark> bisa <mark class="tb">ngikutin</mark> pelajaran hari Jumat karena sakit. Saya juga <mark class="tb">ngelampirin</mark> surat keterangan dari dokter.\n\nSekian surat dari saya. <mark class="tb">Makasih</mark> atas perhatian Bapak/Ibu.\n\nHormat saya,\nOrang tua/wali siswa';
const RINGKAS = [
 ['book-open', 'Pengertian', 'Kata baku mengikuti kaidah pengucapan dan ejaan menurut KBBI, sedangkan kata tidak baku menyimpang dari kaidah itu.'],
 ['target', 'Fungsi', 'Dipakai dalam komunikasi resmi, wacana teknis, berbicara di depan umum, dan percakapan dengan orang terhormat; juga menjadi kerangka acuan, pemersatu, dan pemberi kekhasan.'],
 ['list-checks', 'Ciri-ciri', 'Kata baku dipakai dalam situasi resmi, sesuai ejaan, dan berkalimat lengkap. Kata tidak baku dipengaruhi bahasa daerah atau asing, kebiasaan penutur, perkembangan zaman, dan suasana santai.'],
 ['spell-check', 'Karakteristik', 'Kata tidak baku dapat muncul karena penambahan, pengurangan, atau perubahan huruf, serta pemisahan atau penyatuan penulisan.'],
 ['calendar-check', 'Kapan memakai kata baku', 'Pakailah saat situasi resmi, dan biasakan memeriksa kamus karena bentuk baku bisa berganti, misalnya merk menjadi merek.']
];
const PUSTAKA = [
 'Idawati, & Fatimatuzzahra. (2023). PENGARUH AKTIVITAS GENERASI MUDA TERHADAP PENGGUNAAN KATA BAKU DAN TIDAK BAKU PADA PELAJARAN BAHASA INDONESIA. _Didaktik: Jurnal Ilmiah PGSD STKIP Subang_, _9_(1), 393–403. https://doi.org/10.36989/didaktik.v9i1.710',
 'Moeliono, A. M. & Indonesia (Ed.). (2017). _Tata bahasa baku bahasa Indonesia_ (Edisi keempat). Badan Pengembangan dan Pembinaan Bahasa, Kementerian Pendidikan dan Kebudayaan.',
 'Ningrum, V. (2019). PENGGUNAAN KATA BAKU DAN TIDAK BAKU DI KALANGAN MAHASISWA UNIVERSITAS PEMBANGUNAN NASIONAL “VETERAN” YOGYAKARTA. _Jurnal Skripta_, _5_(2). https://doi.org/10.31316/skripta.v5i2.398',
 'Oentari, B. S. (2023). INKONSISTENSI EJAAN BAKU AKIBAT PENAMBAHAN BUNYI VOKAL /ə/ DALAM KAMUS BESAR BAHASA INDONESIA. _Epigram_, _20_(1), 96–106. https://doi.org/10.32722/epi.v20i1.5569'
];

const S = [
 { id: 'm1', no: 'Materi 1', t: 'Pengertian Kata Baku dan Kata Tidak Baku', s: 'Pengertian', ic: 'book-open', track: 1, h: () =>
   `<p class="lead-p">Istilah baku adalah istilah pengucapan dan ejaannya mengikuti kaidah yang telah dicatat, menurut Kamus Besar Bahasa Indonesia (KBBI). Sedangkan ragam bahasa menyimpang dari pengucapan dan penulisan kata normal dianggap bahasa baku dan tidak baku.</p>
    <div class="duo"><div class="mini ok stg">${ico('check')}<b>izin</b><small>kata baku</small></div><div class="mini no stg">${ico('x')}<s>ijin</s><small>kata tidak baku</small></div></div>` },
 { id: 'm2', no: 'Materi 2', t: 'Fungsi Kata Baku', s: 'Fungsi kata baku', ic: 'target', track: 1, h: () => acc('a2', [
   ['mail', 'Komunikasi resmi', 'Komunikasi resmi, termasuk surat resmi, pengumuman yang dibuat oleh lembaga resmi, undang-undang, dan sebagainya.'],
   ['file-text', 'Wacana teknis', 'Wacana teknis yang ditemukan dalam dokumen seperti laporan resmi, tulisan akademis, dan sebagainya.'],
   ['mic', 'Berbicara di depan umum', 'Berbicara di depan umum, termasuk pada sekolah dan acara lainnya.'],
   ['user-check', 'Percakapan dengan orang terhormat', 'Percakapan dengan orang-orang terhormat, dan sebagainya.'],
   ['ruler', 'Kerangka acuan', 'Kata baku menjadi patokan untuk menilai benar atau salahnya pemakaian bahasa. Inilah fungsi yang bersifat objektif.'],
   ['users', 'Pemersatu', 'Siswa di Medan dan siswa di Makassar bisa bertukar surat tanpa menebak-nebak kata dialek masing-masing.'],
   ['sparkles', 'Pemberi kekhasan', 'Pembakuan membuat bahasa Indonesia punya wajah sendiri, berbeda dari bahasa lain, termasuk yang serumpun.']], 0) },
 { id: 'm3', no: 'Materi 3', t: 'Ciri-Ciri Kata Baku dan Tidak Baku', s: 'Ciri-ciri', ic: 'list-checks', track: 1, h: () =>
   `<h3 class="sub">${ico('badge-check')} Ciri-ciri kata baku</h3><ul class="cl">${[
    '*Digunakan dalam situasi resmi*, baik secara lisan maupun tulisan, seperti surat dinas, undang-undang, karya ilmiah, dan laporan penelitian.',
    '*Mengikuti aturan ejaan bahasa Indonesia yang berlaku*, yaitu menggunakan penulisan kata, tanda baca, dan ejaan sesuai dengan pedoman bahasa Indonesia.',
    '*Memiliki susunan kalimat yang jelas dan lengkap*, yaitu memiliki unsur-unsur kalimat seperti subjek, predikat, dan objek sesuai dengan kebutuhan kalimat.'
   ].map(x => `<li class="stg">${ico('circle-check')}<span>${fm(x)}</span></li>`).join('')}</ul>
   <h3 class="sub">${ico('message-circle')} Ciri-ciri kata tidak baku</h3>` + acc('a3', [
   ['languages', 'Terpengaruh oleh bahasa daerah atau bahasa asing', 'Kata tidak baku dapat muncul karena kebiasaan menggunakan bahasa daerah atau bahasa asing dalam kehidupan sehari-hari. Contohnya, kata enggak sering digunakan dalam percakapan sehari-hari, sedangkan bentuk bakunya adalah tidak.'],
   ['pencil', 'Bentuk katanya dapat digunakan sesuai kebiasaan atau keinginan penutur', 'Kata tidak baku sering digunakan tanpa mengikuti aturan bahasa Indonesia yang berlaku. Akibatnya, seseorang dapat mengucapkan atau menuliskan kata dengan bentuk yang berbeda-beda. Contohnya, ijin merupakan bentuk tidak baku dari izin.'],
   ['clock', 'Dipengaruhi oleh perkembangan zaman', 'Perkembangan zaman, terutama penggunaan media sosial dan teknologi, dapat memunculkan kata-kata baru atau mengubah cara orang menggunakan bahasa. Contohnya, kata gabut sering digunakan dalam percakapan sehari-hari untuk menggambarkan keadaan ketika seseorang tidak memiliki kegiatan.'],
   ['message-circle', 'Cenderung santai jika digunakan dalam percakapan sehari-hari', 'Kata tidak baku biasanya digunakan dalam situasi informal, seperti saat berbicara dengan teman atau keluarga. Contohnya, kata gimana sering digunakan dalam percakapan santai, sedangkan bentuk bakunya adalah bagaimana.']], 0) },
 { id: 'm4', no: 'Materi 4', t: 'Karakteristik Bahasa Baku dan Tidak Baku', s: 'Karakteristik', ic: 'spell-check', track: 1, h: () =>
   acc('a4', K4.map(([ic, t, c3, rows], i) => [ic, `${i + 1}. ${t}`, tbl(c3, rows)]), 0) +
   `<div class="callout v"><b>Ringkasan karakteristik bahasa tidak baku:</b><ul class="mb-0 mt-2"><li>Dapat dipengaruhi oleh bahasa daerah atau bahasa asing.</li><li>Bentuknya dapat muncul karena perubahan huruf atau penulisan dibandingkan bentuk baku.</li><li>Cenderung digunakan secara santai dalam percakapan sehari-hari.</li></ul></div>` },
 { id: 'm5', no: 'Materi 5', t: 'Kapan Kita Memakai Kata Baku?', s: 'Kapan memakai kata baku', ic: 'calendar-check', track: 1, h: () =>
   `<p class="lead-p">Kata baku digunakan dalam situasi tertentu yang membutuhkan bahasa resmi dan sesuai dengan kaidah bahasa Indonesia.</p><div class="cg">` +
   card('mail', 'Komunikasi resmi', 'Dalam komunikasi resmi, seperti menulis surat dinas atau surat undangan resmi, contohnya penggunaan kata izin, bukan ijin.') +
   card('file-text', 'Wacana teknis', 'Dalam wacana teknis, seperti laporan penelitian, buku pelajaran, dan karya ilmiah, contohnya penggunaan kata analisis, bukan analisa.') +
   card('mic', 'Pembicaraan di depan umum', 'Dalam pembicaraan di depan umum, seperti pidato, presentasi di kelas, atau seminar, kita perlu menggunakan kata baku agar penyampaian informasi terdengar jelas dan sesuai dengan situasi.') +
   card('user-check', 'Orang yang dihormati', 'Dalam pembicaraan dengan orang yang dihormati, seperti guru, kepala sekolah, atau orang yang lebih tua, penggunaan kata baku menunjukkan sikap sopan dan menghargai lawan bicara.') +
   `</div><p class="mt-3">Dengan demikian, kata baku sebaiknya digunakan ketika berkomunikasi dalam situasi resmi agar pesan tersampaikan dengan jelas, baik, dan benar.</p>
   <div class="callout">${ico('lightbulb')} <b>Ingat!</b> Kebiasaan juga bukan jaminan. Kita cenderung mengira sebuah kata baku hanya karena sering mereka ucapkan. Bentuk baku di kamus pun berganti dari waktu ke waktu, misalnya merk menjadi merek dan Perancis menjadi Prancis. Jadi, biasakan untuk selalu memeriksa dan memperbarui informasi tentang kata baku melalui kamus atau sumber resmi terbaru sebelum menggunakannya.</div>
   <h3 class="sub">Contoh kata baku dan tidak baku dalam surat resmi</h3>
   <div class="kuis"><div class="letters"><div class="letter"><h4>Surat 1</h4>${SURAT1}</div><div class="letter"><h4>Surat 2</h4>${SURAT2}</div></div>
   <p class="q mt-3 mb-2">Dari kedua contoh surat tersebut, manakah surat yang menggunakan kata baku?</p>
   <div class="d-flex gap-2"><button class="pilih" type="button" data-ok="1">Surat 1</button><button class="pilih" type="button" data-ok="0">Surat 2</button></div><div class="fb" role="status"></div></div>
   <div class="mt-3">${acc('a5', [['table', 'Tabel perbandingan kata baku dan kata tidak baku dalam surat', tbl(0, BANDING)]])}</div>` },
 { id: 'rk', no: 'Ringkasan', t: 'Ringkasan Materi', s: 'Ringkasan', ic: 'sparkles', h: () =>
   `<p class="text-secondary">Ketuk kartu untuk melihat ringkasannya.</p><div class="cg">${RINGKAS.map(([ic, t, p]) =>
    `<button class="rk stg" type="button" aria-expanded="false"><b>${ico(ic)}${t}</b><small>Ketuk untuk membuka</small><div class="bk"><div><p>${p}</p></div></div></button>`).join('')}</div>` },
 { id: 'dp', no: 'Referensi', t: 'Daftar Pustaka', s: 'Daftar pustaka', ic: 'library', h: () => `<ol class="pus">${PUSTAKA.map(x => `<li>${fm(x)}</li>`).join('')}</ol>` }
];

/* ---------- Render ---------- */
$('#isi').innerHTML = S.map(s => `<section class="mt-bab glass reveal" id="${s.id}"><header class="mh"><span class="no">${ico(s.ic)}${s.no}</span><h2>${s.t}</h2></header><div>${s.h()}</div>${s.track ? `<button class="btn btn-selesai" type="button" data-id="${s.id}"></button>` : ''}</section>`).join('');
$('#toc').innerHTML = `<div class="prog"><div class="d-flex justify-content-between align-items-end"><span class="small fw-semibold">Progres belajar</span><b id="pn">0%</b></div><div class="progress my-2" role="progressbar" aria-label="Progres belajar"><div id="pb" class="progress-bar"></div></div><div class="d-flex justify-content-between small"><span id="pt"></span><a href="#" id="reset" class="text-decoration-none">Atur ulang</a></div></div>` +
  S.map(s => `<a class="toc-i" href="#" data-go="${s.id}"><span class="dot">${s.track ? '✓' : ''}</span>${s.s}</a>`).join('');
$$('#materi .mt-bab').forEach(el => el.dataset.t = el.textContent.toLowerCase());
icons();

/* ---------- Progres belajar (localStorage) ---------- */
const done = new Set(store('katabaku.selesai') || []);
const tracked = S.filter(s => s.track);
let shown = 0;
function updateUI() {
  tracked.forEach(s => {
    const on = done.has(s.id), b = $(`.btn-selesai[data-id="${s.id}"]`);
    b.classList.toggle('on', on); b.innerHTML = on ? 'Selesai ✓' : 'Tandai selesai';
    $(`.toc-i[data-go="${s.id}"]`).classList.toggle('done', on);
  });
  const n = done.size, pct = Math.round(n / tracked.length * 100);
  $('#pt').textContent = `${n} dari ${tracked.length} materi selesai`;
  const set = v => { $('#pn').textContent = Math.round(v) + '%'; $('#pb').style.width = v + '%'; };
  anim ? Mo.animate(shown, pct, { duration: .7, ease: 'easeOut', onUpdate: set }) : set(pct);
  shown = pct;
}
updateUI();
document.addEventListener('click', e => {
  const g = e.target.closest('#materi [data-go]');
  if (g) { e.preventDefault(); $('#' + g.dataset.go).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  const b = e.target.closest('.btn-selesai');
  if (b) { done.has(b.dataset.id) ? done.delete(b.dataset.id) : done.add(b.dataset.id); store('katabaku.selesai', [...done]); updateUI(); }
  if (e.target.closest('#reset')) { e.preventDefault(); done.clear(); store('katabaku.selesai', []); updateUI(); }
  const q = e.target.closest('.pilih');
  if (q) {
    const w = q.closest('.kuis'), ok = q.dataset.ok === '1', f = $('.fb', w);
    f.className = 'fb ' + (ok ? 'ok' : 'no');
    f.innerHTML = ico(ok ? 'circle-check' : 'circle-x') + ' ' + (ok ? 'Tepat! Surat 1 memakai kata baku, sedangkan Surat 2 memakai kata tidak baku (ditandai merah).' : 'Belum tepat. Perhatikan kata izin dan ijin, lalu coba lagi.');
    w.classList.toggle('answered', ok); icons();
  }
  const r = e.target.closest('.rk');
  if (r) r.setAttribute('aria-expanded', r.classList.toggle('open'));
});
/* micro-interaction saat tombol ditekan */
document.addEventListener('pointerdown', e => { const b = e.target.closest('#materi .btn:not(#tema), #materi .pilih'); if (b && anim) Mo.animate(b, { scale: [1, .94, 1] }, { duration: .28 }); });

/* ---------- Pencarian materi ---------- */
$('#cari').addEventListener('input', e => {
  const v = e.target.value.trim(), q = v.toLowerCase(); let n = 0;
  $$('#materi .mt-bab').forEach(el => { const m = !q || el.dataset.t.includes(q); el.hidden = !m; $(`.toc-i[data-go="${el.id}"]`).hidden = !m; n += m; });
  $('#kosong').hidden = n > 0; $('#kq').textContent = v;
});

/* ---------- Tema terang / gelap ---------- */
const root = sec;   // tema gelap hanya berlaku di halaman Materi Inti
const setTema = t => { root.setAttribute('data-bs-theme', t); store('katabaku.materi.tema', t); };
setTema(store('katabaku.materi.tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#tema').addEventListener('click', () => setTema(root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'));

/* ---------- Scroll: progress bar, tombol atas, parallax ringan ---------- */
const bar = $('#bar'), up = $('#atas'), blobs = $$('.blob'); let tick = 0;
const onScroll = () => {
  tick = 0; if (sec.classList.contains('d-none')) return;
  const r = sec.getBoundingClientRect(), y = Math.max(0, -r.top), h = r.height - innerHeight;
  bar.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
  up.classList.toggle('show', y > 600);
  if (!reduce) blobs.forEach((b, i) => b.style.translate = `0 ${y * (.08 + i * .06)}px`);
};
addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(onScroll); }, { passive: true });
up.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
onScroll(); addEventListener('resize', onScroll);
new MutationObserver(onScroll).observe(sec, { attributes: true, attributeFilter: ['class'] });

/* ---------- Scroll reveal + stagger (Motion) ---------- */
const reveal = el => {
  if (!anim) return;
  Mo.animate(el, { opacity: [0, 1], transform: ['translateY(28px)', 'translateY(0px)'] }, { duration: .55, ease: 'easeOut' });
  const k = $$('.stg', el);
  if (k.length) Mo.animate(k, { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: .45, delay: Mo.stagger(.07, { startDelay: .2 }), ease: 'easeOut' });
};
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); reveal(e.target); } }), { threshold: .1 });
$$('#materi .reveal').forEach(el => io.observe(el));

/* ---------- Penanda bagian aktif pada daftar isi ---------- */
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) $$('.toc-i').forEach(a => a.classList.toggle('on', a.dataset.go === e.target.id));
}), { rootMargin: '-35% 0px -60% 0px' });
$$('#materi .mt-bab').forEach(el => spy.observe(el));
})();
