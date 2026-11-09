// Google Apps Script — backend KataBaku.id (revisi 4: profil, badge, WIB)
const SPREADSHEET_ID = '1aJwPMmUjrsH7v6Q2dK8tENLL0QIEL-mDQzdCbQd429g';   // ID Google Sheet Anda (antara /d/ dan /edit pada URL)
const NAMA_APP = 'KataBaku.id';
const COLS = ['id','email','tanggal','kategori','paket','judul','nilai','benar','salah','kosong','durasi','nama','sekolah','kelas'];
const NUM = ['nilai','benar','salah','kosong','durasi'];
const KAT = ['pilihan_ganda','tebak_kata','isian_singkat','perbaikan_kalimat'];
const UUID = /^[0-9a-f-]{36}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HARI_TOKEN = 30;
const JUMLAH_BADGE = 10;
const TZ = 'Asia/Jakarta';   // Waktu Indonesia Barat
const wib_ = d => Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm');
const bersih_ = (v, max) => String(v || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').replace(/^[=+\-@]+/, '').trim().slice(0, max);

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function num_(v, max) { v = Number(v); return isFinite(v) && v >= 0 && v <= max; }
function salt_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SALT'); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SALT', s); }
  return s;
}
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s + '|' + salt_())); }
function sheet_(name, cols) {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan. Isi SPREADSHEET_ID.');
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(cols); sh.setFrozenRows(1); }
  const hdr = sh.getRange(1, 1, 1, cols.length).getValues()[0];           // samakan header (juga migrasi uid -> email)
  if (hdr.join('|') !== cols.join('|')) sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  sh.getRange(1, 1, sh.getMaxRows(), 4).setNumberFormat('@');
  return sh;
}
const hasil_ = () => sheet_('Hasil', COLS);
const pengguna_ = () => sheet_('Pengguna', ['email','nama','sekolah','kelas','diperbarui']);
const badge_ = () => sheet_('Badge', ['email','badge','diperoleh']);
function profilOf_(email) {
  const sh = pengguna_(); if (sh.getLastRow() < 2) return null;
  const r = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < r.length; i++) if (String(r[i][0]).toLowerCase() === email) return { nama: String(r[i][1]), sekolah: String(r[i][2]), kelas: String(r[i][3]) };
  return null;
}
// Hitung & catat badge yang sudah diraih (hari dihitung dengan WIB). Panggil di dalam lock.
function hitungBadge_(email) {
  const sh = hasil_(), n = sh.getLastRow() - 1; if (n < 1) return;
  const rows = sh.getRange(2, 1, n, 11).getValues().filter(function (r) { return String(r[1]).toLowerCase() === email; })
    .map(function (r) { return { t: Date.parse(r[2]) || 0, tgl: r[2], kat: r[3], paket: r[4], nilai: Number(r[6]), durasi: Number(r[10]) }; })
    .sort(function (a, b) { return a.t - b.t; });
  if (!rows.length) return;
  const hari = {}, jenis = {}, byP = {}; let sempurna = 0, wm = false, cepat = false;
  rows.forEach(function (r) {
    hari[Utilities.formatDate(new Date(r.t), TZ, 'yyyy-MM-dd')] = 1; jenis[r.kat] = 1;
    (byP[r.paket] = byP[r.paket] || []).push(r.nilai);
    if (r.nilai === 100) sempurna++;
    if (r.kat === 'tebak_kata' && r.nilai >= 80) wm = true;
    if (r.nilai >= 80 && r.durasi <= 60) cepat = true;
  });
  const hr = Object.keys(hari).length;
  const bangkit = Object.keys(byP).some(function (k) { const a = byP[k]; return a.some(function (x, i) { return a.slice(0, i).some(function (y) { return x - y >= 10; }); }); });
  const layak = ['First Step'];    // aturan HARUS sama dengan stats() di latihan.js
  if (sempurna >= 1) layak.push('Perfect Score');
  if (hr >= 3) layak.push('Consistent Learner');
  if (wm) layak.push('Word Master');
  if (cepat) layak.push('Speedster');
  if (['pilihan_ganda', 'tebak_kata', 'isian_singkat', 'perbaikan_kalimat'].every(function (k) { return jenis[k]; })) layak.push('All-Rounder');
  if (rows.length >= 10) layak.push('Practice Pro');
  if (hr >= 7) layak.push('Dedicated Learner');
  if (bangkit) layak.push('Never Give Up');
  if (sempurna >= 3) layak.push('Triple Perfect');
  const bs = badge_(), ada = {};
  if (bs.getLastRow() > 1) bs.getRange(2, 1, bs.getLastRow() - 1, 2).getValues().forEach(function (r) { if (String(r[0]).toLowerCase() === email) ada[r[1]] = 1; });
  const now = wib_(new Date());
  layak.forEach(function (nm) { if (!ada[nm]) bs.appendRow([email, nm, now]); });
}
const sesi_ = () => sheet_('Sesi', ['email','token_hash','dibuat','kedaluwarsa']);

// Jalankan SEKALI dari editor (Run) untuk memberi izin Sheet + kirim email.
function tes() {
  Logger.log('Sheet OK, baris Hasil: ' + hasil_().getLastRow() + ' | sisa kuota email hari ini: ' + MailApp.getRemainingDailyQuota());
}

function doGet() { return out_({ ok: true, pesan: 'API aktif' }); }

function authEmail_(token) {
  if (!token || typeof token !== 'string' || token.length < 40) return null;
  const sh = sesi_(); if (sh.getLastRow() < 2) return null;
  const h = hash_(token), now = Date.now(), rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < rows.length; i++)
    if (rows[i][1] === h) return Date.parse(rows[i][3]) > now ? String(rows[i][0]) : null;
  return null;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents), c = CacheService.getScriptCache();

    if (d.action === 'kirimKode') {
      const em = String(d.email || '').trim().toLowerCase();
      if (!EMAIL.test(em) || em.length > 100) return out_({ ok: false, error: 'Email tidak valid' });
      if (c.get('rl:' + em)) return out_({ ok: false, error: 'Tunggu 60 detik sebelum meminta kode lagi' });
      const kode = String(parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000 + 100000);
      c.put('otp:' + em, hash_(em + kode), 600); c.put('try:' + em, '0', 600); c.put('rl:' + em, '1', 60);
      MailApp.sendEmail(em, 'Kode masuk ' + NAMA_APP, 'Kode masuk Anda: ' + kode + '\n\nBerlaku 10 menit. Abaikan email ini jika Anda tidak memintanya.');
      return out_({ ok: true });
    }

    if (d.action === 'masuk') {
      const em = String(d.email || '').trim().toLowerCase(), kode = String(d.kode || '');
      const tries = Number(c.get('try:' + em) || 0), otp = c.get('otp:' + em);
      if (!otp) return out_({ ok: false, error: 'Kode kedaluwarsa. Minta kode baru.' });
      if (tries >= 5) { c.remove('otp:' + em); return out_({ ok: false, error: 'Terlalu banyak percobaan. Minta kode baru.' }); }
      if (!/^\d{6}$/.test(kode) || hash_(em + kode) !== otp) { c.put('try:' + em, String(tries + 1), 600); return out_({ ok: false, error: 'Kode salah' }); }
      c.remove('otp:' + em);
      const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try { sesi_().appendRow([em, hash_(token), new Date().toISOString(), new Date(Date.now() + HARI_TOKEN * 864e5).toISOString()]); }
      finally { lock.releaseLock(); }
      return out_({ ok: true, token: token, email: em });
    }

    const email = authEmail_(d.token);
    if (!email) return out_({ ok: false, auth: true, error: 'Sesi berakhir, silakan masuk lagi' });

    if (d.action === 'keluar') {
      const sh = sesi_(), h = hash_(d.token), lock = LockService.getScriptLock(); lock.waitLock(20000);
      try { const r = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues() : [];
        for (let i = 0; i < r.length; i++) if (r[i][0] === h) { sh.deleteRow(i + 2); break; } }
      finally { lock.releaseLock(); }
      return out_({ ok: true });
    }

    if (d.action === 'profil') {
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try { hitungBadge_(email); } finally { lock.releaseLock(); }
      const bs = badge_(), badges = [];
      if (bs.getLastRow() > 1) bs.getRange(2, 1, bs.getLastRow() - 1, 3).getValues().forEach(function (r) { if (String(r[0]).toLowerCase() === email) badges.push({ badge: String(r[1]), diperoleh: String(r[2]) }); });
      return out_({ ok: true, profil: profilOf_(email), badges: badges });
    }

    if (d.action === 'profilSimpan') {
      const nama = bersih_(d.nama, 60), sekolah = bersih_(d.sekolah, 80), kelas = bersih_(d.kelas, 20);
      if (nama.length < 3 || sekolah.length < 3 || kelas.length < 1) return out_({ ok: false, error: 'Nama (min. 3 huruf), sekolah, dan kelas wajib diisi' });
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        const sh = pengguna_(), baris = [email, nama, sekolah, kelas, wib_(new Date())];
        let idx = -1;
        if (sh.getLastRow() > 1) { const r = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(); for (let i = 0; i < r.length; i++) if (String(r[i][0]).toLowerCase() === email) { idx = i + 2; break; } }
        if (idx > 0) sh.getRange(idx, 1, 1, 5).setValues([baris]); else sh.appendRow(baris);
        SpreadsheetApp.flush();
      } finally { lock.releaseLock(); }
      return out_({ ok: true, profil: { nama: nama, sekolah: sekolah, kelas: kelas } });
    }

    if (d.action === 'riwayat') {
      const sh = hasil_(), n = sh.getLastRow() - 1; if (n < 1) return out_({ ok: true, data: [] });
      const data = sh.getRange(2, 1, n, COLS.length).getValues().filter(function (r) { return String(r[1]).toLowerCase() === email; })
        .map(function (r) { const o = {}; COLS.forEach(function (c2, i) { let v = r[i]; if (v instanceof Date) v = v.toISOString(); o[c2] = NUM.indexOf(c2) >= 0 ? Number(v) : String(v); }); return o; });
      return out_({ ok: true, data: data });
    }

    if (d.action === 'simpan') {
      const total = Number(d.benar) + Number(d.salah) + Number(d.kosong);
      if (!UUID.test(d.id) || KAT.indexOf(d.kategori) < 0 || !num_(d.nilai, 100) || !num_(d.benar, 500) || !num_(d.salah, 500) ||
          !num_(d.kosong, 500) || total < 1 || !num_(d.durasi, 86400) || isNaN(Date.parse(d.tanggal))) return out_({ ok: false, error: 'Data tidak valid' });
      const lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        const sh = hasil_();
        if (sh.getLastRow() > 1) { const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
          for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === d.id) return out_({ ok: true, duplikat: true }); }
        d.email = email;
        const pf = profilOf_(email) || {}; d.nama = pf.nama || ''; d.sekolah = pf.sekolah || ''; d.kelas = pf.kelas || '';
        sh.appendRow(COLS.map(function (c2) { return NUM.indexOf(c2) >= 0 ? Number(d[c2]) : String(d[c2] || '').slice(0, 120); }));
        hitungBadge_(email);
        SpreadsheetApp.flush();
      } finally { lock.releaseLock(); }
      return out_({ ok: true });
    }
    return out_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) { return out_({ ok: false, error: String(err.message || err) }); }
}

/* =====================================================================
   ALAT GURU — rekap nama siswa & perkembangan nilai (menu "📊 Guru")
   Membuat 3 lembar: "Rekap Siswa", "Perkembangan", "Detail Siswa".
   ===================================================================== */
const KAT_LABEL = { pilihan_ganda: 'Pilihan Ganda', tebak_kata: 'Tebak Kata', isian_singkat: 'Isian Singkat', perbaikan_kalimat: 'Perbaikan Kalimat' };

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('📊 Guru')
      .addItem('Perbarui rekap & perkembangan', 'perbaruiRekap')
      .addItem('Pasang pembaruan otomatis (tiap jam)', 'pasangPemicu')
      .addToUi();
  } catch (e) {}
}

function pasangPemicu() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'perbaruiRekap') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('perbaruiRekap').timeBased().everyHours(1).create();
  try { SpreadsheetApp.getActiveSpreadsheet().toast('Rekap akan diperbarui otomatis setiap jam.', 'Guru', 6); } catch (e) {}
}

function lembar_(ss, nama, bersih) {
  const sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
  if (bersih) { const f = sh.getFilter(); if (f) f.remove(); sh.clear(); sh.setConditionalFormatRules([]); }
  return sh;
}

function perbaruiRekap() {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    const hs = hasil_(), ps = pengguna_(), bs = badge_();
    const H = hs.getLastRow() > 1 ? hs.getRange(2, 1, hs.getLastRow() - 1, COLS.length).getValues() : [];
    const P = ps.getLastRow() > 1 ? ps.getRange(2, 1, ps.getLastRow() - 1, 4).getValues() : [];
    const B = bs.getLastRow() > 1 ? bs.getRange(2, 1, bs.getLastRow() - 1, 3).getValues() : [];

    const prof = {}, badgeOf = {}, per = {};
    P.forEach(function (r) { prof[String(r[0]).toLowerCase()] = { nama: String(r[1]), sekolah: String(r[2]), kelas: String(r[3]) }; });
    B.forEach(function (r) { const e = String(r[0]).toLowerCase(); (badgeOf[e] = badgeOf[e] || []).push(r[1]); });
    H.forEach(function (r) {
      const e = String(r[1]).toLowerCase();
      (per[e] = per[e] || []).push({ t: Date.parse(r[2]) || 0, kat: r[3], judul: String(r[5] || r[4]), nilai: Number(r[6]), benar: Number(r[7]), salah: Number(r[8]), kosong: Number(r[9]), durasi: Number(r[10]) });
    });
    const info = function (e) { return prof[e] || { nama: e, sekolah: '', kelas: '' }; };
    const label = function (e) { return String(info(e).nama + ' — ' + info(e).kelas).replace(/'/g, '’'); };
    const emails = Object.keys(Object.assign({}, prof, per));
    emails.sort(function (a, b) { return (info(a).kelas + '|' + info(a).nama).localeCompare(info(b).kelas + '|' + info(b).nama); });
    const avg = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10 : ''; };
    const wibf = function (ms) { return Utilities.formatDate(new Date(ms), TZ, 'yyyy-MM-dd HH:mm'); };

    /* ---- Rekap Siswa ---- */
    const head = ['Nama','Kelas','Sekolah','Email','Jumlah Latihan','Rata-rata','Nilai Terbaik','Nilai Terakhir','Rata PG','Rata Tebak Kata','Rata Isian','Rata Perbaikan','Tren','Grafik Mini','Terakhir Aktif (WIB)','Badge','Label'];
    const spark = [];
    const rows = emails.map(function (e) {
      const L = (per[e] || []).sort(function (a, b) { return a.t - b.t; }), v = L.map(function (x) { return x.nilai; }), pi = info(e);
      const kat = function (k) { return avg(L.filter(function (x) { return x.kat === k; }).map(function (x) { return x.nilai; })); };
      let tren = '-';
      if (v.length >= 2) {
        const baru = v.slice(-3), lama = v.slice(0, v.length - baru.length);
        const d = lama.length ? avg(baru) - avg(lama) : v[v.length - 1] - v[0];
        tren = d >= 5 ? '▲ Naik' : d <= -5 ? '▼ Turun' : '▬ Stabil';
      }
      spark.push([v.length ? '=SPARKLINE({' + v.join(',') + '},{"charttype","line";"ymin",0;"ymax",100})' : '']);
      return [pi.nama, pi.kelas, pi.sekolah, e, L.length, avg(v), v.length ? Math.max.apply(null, v) : '', v.length ? v[v.length - 1] : '',
        kat('pilihan_ganda'), kat('tebak_kata'), kat('isian_singkat'), kat('perbaikan_kalimat'), tren, '',
        L.length ? wibf(L[L.length - 1].t) : '-', (badgeOf[e] || []).length + ' / ' + JUMLAH_BADGE, label(e)];
    });
    const rk = lembar_(ss, 'Rekap Siswa', true);
    rk.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    if (rows.length) {
      rk.getRange(2, 1, rows.length, head.length).setValues(rows);
      rk.getRange(2, 14, rows.length, 1).setFormulas(spark);
      const rg = rk.getRange(2, 6, rows.length, 7), R = SpreadsheetApp.newConditionalFormatRule;
      rk.setConditionalFormatRules([
        R().whenNumberLessThan(60).setBackground('#fecaca').setRanges([rg]).build(),
        R().whenNumberBetween(60, 74.99).setBackground('#fef08a').setRanges([rg]).build(),
        R().whenNumberGreaterThanOrEqualTo(75).setBackground('#bbf7d0').setRanges([rg]).build()
      ]);
    }
    rk.setFrozenRows(1); rk.setFrozenColumns(1);
    rk.getRange(1, 1, Math.max(2, rows.length + 1), head.length).createFilter();
    rk.setColumnWidths(1, 17, 110); rk.setColumnWidth(1, 180); rk.setColumnWidth(3, 200); rk.setColumnWidth(4, 220); rk.setColumnWidth(14, 140); rk.setColumnWidth(17, 220);

    /* ---- Perkembangan (log semua latihan) ---- */
    const head2 = ['Nama','Kelas','Sekolah','Email','Tanggal (WIB)','Jenis Soal','Paket','Nilai','Benar','Salah','Kosong','Durasi (detik)','Label'];
    const log = [];
    emails.forEach(function (e) {
      (per[e] || []).sort(function (a, b) { return a.t - b.t; }).forEach(function (x) {
        const pi = info(e);
        log.push([pi.nama, pi.kelas, pi.sekolah, e, wibf(x.t), KAT_LABEL[x.kat] || x.kat, x.judul, x.nilai, x.benar, x.salah, x.kosong, x.durasi, label(e)]);
      });
    });
    const pg = lembar_(ss, 'Perkembangan', true);
    pg.getRange(1, 1, 1, head2.length).setValues([head2]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    if (log.length) pg.getRange(2, 1, log.length, head2.length).setValues(log);
    pg.setFrozenRows(1); pg.getRange(1, 1, Math.max(2, log.length + 1), head2.length).createFilter();
    pg.setColumnWidths(1, 13, 110); pg.setColumnWidth(1, 180); pg.setColumnWidth(5, 140);

    /* ---- Detail Siswa (pilih nama -> riwayat + grafik) ---- */
    const dt = lembar_(ss, 'Detail Siswa', false);
    const pilihan = dt.getRange('B1'), lama = pilihan.getValue();
    dt.getRange('A1').setValue('Pilih siswa:').setFontWeight('bold');
    if (rows.length) {
      pilihan.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(rk.getRange(2, 17, rows.length, 1), true).build());
      if (!lama || emails.map(label).indexOf(String(lama)) < 0) pilihan.setValue(label(emails[0]));
    }
    dt.getRange('A2').setValue('Data diperbarui: ' + wib_(new Date()) + ' WIB').setFontColor('#64748b');
    dt.getRange('D1').setFormula('=IFERROR("Rata-rata "&ROUND(AVERAGE(D4:D200),1)&"   |   Jumlah latihan: "&COUNT(D4:D200),"")').setFontWeight('bold');
    dt.getRange('A3:H3').setValues([['Tanggal (WIB)','Jenis Soal','Paket','Nilai','Benar','Salah','Kosong','Durasi (detik)']]).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    dt.getRange('A4').setFormula('=IFERROR(QUERY(Perkembangan!A2:M,"select E,F,G,H,I,J,K,L where M=\'"&$B$1&"\' order by E",0),"Belum ada data latihan")');
    dt.getCharts().forEach(function (c) { dt.removeChart(c); });
    dt.insertChart(dt.newChart().setChartType(Charts.ChartType.LINE)
      .addRange(dt.getRange('A3:A60')).addRange(dt.getRange('D3:D60'))
      .setPosition(3, 10, 0, 0).setOption('title', 'Perkembangan Nilai').setOption('legend', { position: 'none' })
      .setOption('vAxis', { minValue: 0, maxValue: 100 }).setOption('width', 520).setOption('height', 300).build());
    dt.setColumnWidths(1, 8, 120); dt.setColumnWidth(1, 150); dt.setColumnWidth(2, 220);

    ss.setActiveSheet(rk);
    try { ss.toast('Rekap diperbarui: ' + rows.length + ' siswa, ' + log.length + ' latihan.', 'Guru', 6); } catch (e) {}
  } finally { lock.releaseLock(); }
}
