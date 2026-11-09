/* Latihan & Kuis — KataBaku.id (login email OTP, puzzle susun kata, tebak kata)
   Soal: data/*.json | Backend: backend/Code.gs (isi API setelah deploy) */
(() => {
'use strict';
const API = 'https://script.google.com/macros/s/AKfycbyI692m9z8kAt7DZe5s9R09SqLQGeuor4AaqqFGyxUd7vAXN81HzJW0Of8gvE5LXJJVQA/exec'; // <- URL Web App Apps Script (berakhiran /exec)
const J = {
  pilihan_ganda:{n:'Pilihan Ganda',e:'✅',c:'#4f46e5',d:'Pilih satu jawaban paling tepat dari beberapa opsi.'},
  tebak_kata:{n:'Tebak Kata Baku',e:'🎯',c:'#8b5cf6',d:'Pilih bentuk kata yang baku dari dua pilihan.'},
  isian_singkat:{n:'Isian Singkat',e:'🧩',c:'#06b6d4',d:'Susun kata-kata acak menjadi jawaban yang benar.'},
  perbaikan_kalimat:{n:'Perbaikan Kalimat',e:'📝',c:'#f59e0b',d:'Susun kata-kata menjadi kalimat yang sudah diperbaiki.'}
};
const PZ = k => k === 'isian_singkat' || k === 'perbaikan_kalimat';
const OPT = k => k === 'pilihan_ganda' || k === 'tebak_kata';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const tok = s => String(s).trim().split(/\s+/);
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ls = { g:(k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, s:(k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const toast = (t, i='info') => window.Swal ? Swal.fire({toast:true,position:'top',timer:2200,showConfirmButton:false,icon:i,title:t}) : alert(t);

let TOKEN = ls.g('lt_token', ''), EMAIL = ls.g('lt_email', ''), DATA = {}, H = [], S = null;
let view = 'home', LAST = null, chart = null, status = '', busy = false, step = 1, lemail = '';
const hk = () => 'lt_hist:' + EMAIL, sk = () => 'lt_sesi:' + EMAIL;
const persist = () => ls.s(sk(), S), saveH = () => ls.s(hk(), H);
const WIB = 'Asia/Jakarta';   // semua perhitungan hari memakai Waktu Indonesia Barat
const hariWIB = d => new Date(d).toLocaleDateString('en-CA', { timeZone:WIB });   // yyyy-mm-dd
const tglWIB = d => new Date(d).toLocaleString('id-ID', { timeZone:WIB, dateStyle:'medium', timeStyle:'short' }) + ' WIB';
const hariIni = () => new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:WIB });
const lengkap = p => !!(p && p.nama && p.sekolah && p.kelas);
let PROFIL = null, BADGE = {};
const pk = () => 'lt_profil:' + EMAIL;
const root = $('#lt-root');

/* ---------- API & auth ---------- */
async function api(b) {
  const r = await fetch(API, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body:JSON.stringify({ ...b, token:TOKEN }) });
  const j = await r.json();
  if (j.auth && TOKEN) { TOKEN = ''; EMAIL = ''; ls.s('lt_token', ''); ls.s('lt_email', ''); toast('Sesi berakhir, silakan masuk lagi', 'warning'); render(); }
  return j;
}
function login() {
  return `<div class="card lt-card mx-auto" style="max-width:460px"><div class="card-body p-4"><h3 class="fw-bold">Masuk</h3>
  <p class="text-secondary">Masuk dengan email agar progres dan nilai tersimpan aman dan bisa dibuka dari perangkat mana pun.</p>
  ${!API ? '<div class="alert alert-danger">URL backend (API) belum diisi di JS/latihan.js.</div>' : ''}
  <label class="form-label" for="lt-em">Email</label><input id="lt-em" type="email" class="form-control mb-3" autocomplete="email" value="${esc(lemail)}" ${step === 2 ? 'readonly' : ''}>
  ${step === 2 ? `<label class="form-label" for="lt-kd">Kode 6 digit dari email</label><input id="lt-kd" class="form-control mb-3" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button class="btn lt-btn w-100" data-a="masuk">Masuk</button><button class="btn btn-link w-100" data-a="ganti">Ganti email</button>` : '<button class="btn lt-btn w-100" data-a="kode">Kirim kode</button>'}</div></div>`;
}
async function keluar() {
  try { await api({ action:'keluar' }); } catch {}
  TOKEN = ''; EMAIL = ''; ls.s('lt_token', ''); ls.s('lt_email', ''); H = []; S = null; PROFIL = null; BADGE = {}; step = 1; view = 'home'; render();
}

/* ---------- data ---------- */
async function load() {
  for (const k in J) {
    try {
      const j = await (await fetch('data/' + k + '.json')).json();
      DATA[k] = (j.paket || [{ judul: j.topik || J[k].n, soal: j.soal }]).map((p, i) => ({ ...p, id: p.id || 'p' + (i + 1) }));
    } catch { DATA[k] = null; }
  }
}
const qs = () => DATA[S.kat][S.pi].soal;
const ans = i => !!(S.jw[i] && S.jw[i].done);
const keyText = q => OPT(S.kat) ? q.kunci_jawaban + '. ' + (q.pilihan.find(o => o.label === q.kunci_jawaban) || {}).teks : q.kunci_jawaban;

/* ---------- statistik ---------- */
function stats() {
  const n = H.length, avg = n ? Math.round(H.reduce((s, h) => s + h.nilai, 0) / n) : 0;
  const xp = H.reduce((s, h) => s + h.benar * 10 + (h.nilai === 100 ? 20 : 0), 0);
  const days = new Set(H.map(h => hariWIB(h.tanggal))).size;
  const sempurna = H.filter(h => h.nilai === 100).length;
  const jenis = Object.keys(J).filter(k => H.some(h => h.kategori === k)).length;
  const byP = {}; [...H].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach(h => (byP[h.paket] = byP[h.paket] || []).push(h.nilai));
  const bangkit = Object.values(byP).some(a => a.some((x, i) => a.slice(0, i).some(y => x - y >= 10)));
  // [nama, ikon, syarat, sudah diraih?, progres]  — aturan HARUS sama dengan hitungBadge_ di Code.gs
  const badges = [
    ['First Step','🥾','Selesaikan latihan pertama', n >= 1, ''],
    ['Perfect Score','🏆','Raih nilai 100', sempurna >= 1, ''],
    ['Consistent Learner','🔥','Belajar di 3 hari berbeda', days >= 3, Math.min(days, 3) + '/3 hari'],
    ['Word Master','🎯','Nilai ≥ 80 pada Tebak Kata Baku', H.some(h => h.kategori === 'tebak_kata' && h.nilai >= 80), ''],
    ['Speedster','⚡','Nilai ≥ 80 dengan durasi ≤ 60 detik', H.some(h => h.nilai >= 80 && h.durasi <= 60), ''],
    ['All-Rounder','🌈','Coba keempat jenis soal', jenis >= 4, jenis + '/4 jenis'],
    ['Practice Pro','📚','Selesaikan 10 latihan', n >= 10, Math.min(n, 10) + '/10 latihan'],
    ['Dedicated Learner','💎','Belajar di 7 hari berbeda', days >= 7, Math.min(days, 7) + '/7 hari'],
    ['Never Give Up','💪','Ulangi paket yang sama dan naikkan nilai ≥ 10 poin', bangkit, ''],
    ['Triple Perfect','✨','Raih nilai 100 sebanyak 3 kali', sempurna >= 3, Math.min(sempurna, 3) + '/3 kali']
  ];
  const per = {}; H.forEach(h => (per[h.kategori] = per[h.kategori] || []).push(h.nilai));
  const low = Object.entries(per).filter(([k]) => J[k]).map(([k, v]) => [k, v.reduce((a, b) => a + b) / v.length]).filter(x => x[1] < 70).sort((a, b) => a[1] - b[1])[0];
  return { n, avg, xp, lv:(xp / 100 | 0) + 1, days, badges, low };
}
function count(el, to) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return el.textContent = to;
  const t0 = performance.now(); (function f(t) { const p = Math.min((t - t0) / 800, 1); el.textContent = Math.round(to * p); if (p < 1) requestAnimationFrame(f); })(t0);
}

/* ---------- render ---------- */
function render() {
  if (!TOKEN) { root.innerHTML = login(); return; }
  if (!lengkap(PROFIL)) { root.innerHTML = `<div class="mx-auto" style="max-width:600px">${formProfil(true)}</div>`; return; }
  const st = stats();
  root.innerHTML = `
  <header class="lt-head"><h2 class="fw-bold mb-1">Latihan &amp; Kuis</h2>
    <p class="mb-1">Asah kemampuanmu, selesaikan tantangan, dan raih skor terbaik!</p>
    <p class="small mb-3 opacity-75">👋 Halo, <b>${esc(PROFIL.nama)}</b> · ${esc(PROFIL.kelas)} · ${esc(PROFIL.sekolah)}<br>📅 ${hariIni()} WIB</p>
    <div class="d-flex align-items-center gap-2 small"><span>Level ${st.lv}</span>
    <div class="progress flex-grow-1" role="progressbar" aria-label="Progres XP" aria-valuenow="${st.xp % 100}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${st.xp % 100}%"></div></div><span>${st.xp % 100}/100 XP</span></div>
    <div class="d-flex flex-wrap gap-2 mt-3 align-items-center">
      <ul class="nav nav-pills lt-nav">${[['home','📚 Latihan'],['riwayat','🕘 Riwayat Nilai'],['profil','👤 Profil']].map(([v,l]) => `<li><button class="nav-link rounded-pill ${view === v ? 'active' : ''}" data-a="nav" data-v="${v}">${l}</button></li>`).join('')}</ul>
      <button class="btn btn-light btn-sm rounded-pill ms-auto" data-a="musik" aria-pressed="${on}">${on ? '🔊 ' + LAGU[trk].n : '🔇 Musik: mati'}</button>
      <span id="lt-status" class="small" role="status">${esc(status)}</span></div></header>
  <div id="lt-body" class="lt-anim"></div>`;
  const b = $('#lt-body');
  if (view === 'home') b.innerHTML = home(st);
  else if (view === 'riwayat') { b.innerHTML = riwayat(); drawChart(); }
  else if (view === 'profil') b.innerHTML = profil(st);
  else if (view === 'play') b.innerHTML = play();
  else if (view === 'hasil') b.innerHTML = hasil();
  b.querySelectorAll('[data-count]').forEach(e => count(e, +e.dataset.count));
  if (view === 'hasil' && LAST.nilai === 100) confetti();
}
const setStatus = t => { status = t; const e = $('#lt-status'); if (e) e.textContent = t; };

function home(st) {
  let h = '';
  if (S) h += `<div class="alert alert-warning lt-resume d-flex flex-wrap align-items-center gap-2">⏳ Ada sesi belum selesai: <b>${esc(S.judul)}</b> (${esc(J[S.kat]?.n)}) <button class="btn btn-warning btn-sm ms-auto" data-a="lanjut">Lanjutkan</button> <button class="btn btn-outline-secondary btn-sm" data-a="buang">Buang</button></div>`;
  h += `<div class="row g-3 mb-4">${[['✅','Latihan diselesaikan',st.n,'#4f46e5'],['📊','Rata-rata nilai',st.avg,'#06b6d4'],['⭐','Total XP',st.xp,'#f59e0b'],['🏅','Badge diraih',st.badges.filter(b => b[3]).length,'#8b5cf6']].map(([i,l,v,c]) => `<div class="col-6 col-lg-3"><div class="card lt-card lt-stat h-100" style="--c:${c}"><div class="card-body"><div class="fs-2">${i}</div><div class="display-6 fw-bold" data-count="${v}">0</div><div class="text-secondary">${l}</div></div></div></div>`).join('')}</div>`;
  if (st.low) h += `<div class="alert alert-info">💡 Rekomendasi: ulangi <b>${J[st.low[0]].n}</b> (rata-rata ${Math.round(st.low[1])}).</div>`;
  let d = 0;
  for (const k in J) {
    const ps = DATA[k];
    h += `<h4 class="lt-sec" style="color:${J[k].c}">${J[k].e} ${J[k].n}<small class="text-secondary">${esc(J[k].d)}</small></h4><div class="row g-3">`;
    if (!ps) h += `<div class="col-12"><div class="alert alert-danger">Gagal memuat data/${k}.json. Jalankan lewat server (bukan file://) dan cek nama file.</div></div>`;
    else ps.forEach((p, i) => {
      const key = k + ':' + p.id, done = H.filter(x => x.paket === key), best = done.length ? Math.max(...done.map(x => x.nilai)) : null;
      const stt = S && S.paket === key ? ['Sedang berlangsung','warning'] : done.length ? ['Selesai · terbaik ' + best,'success'] : ['Belum dimulai','secondary'];
      h += `<div class="col-md-6 col-lg-3"><div class="card lt-card h-100" style="--c:${J[k].c};animation-delay:${d++ * 60}ms"><div class="card-body d-flex flex-column">
        <span class="badge text-bg-${stt[1]} align-self-start mb-2">${stt[0]}</span>
        <h5>${esc(p.judul || p.topik || 'Paket ' + (i + 1))}</h5><p class="text-secondary small mb-3">${p.soal.length} soal</p>
        <button class="btn lt-btn mt-auto" data-a="mulai" data-k="${k}" data-i="${i}">Mulai Latihan</button></div></div></div>`;
    });
    h += '</div>';
  }
  return h;
}

function play() {
  const L = qs(), q = L[S.i], a = S.jw[S.i] || (S.jw[S.i] = {}), n = L.length, k = S.kat;
  const pct = Math.round(L.filter((_, i) => ans(i)).length / n * 100);
  let body = `<p class="lt-q">${esc(q.soal)}</p>`;
  const W = waktuSoal(q);
  if (W && !a.done) {
    S.t1 = S.t1 || {}; if (!S.t1[S.i]) { S.t1[S.i] = Date.now(); persist(); }
    const sisa = Math.max(0, W - (Date.now() - S.t1[S.i]) / 1000);
    body += `<div class="lt-timer" role="timer" aria-label="Sisa waktu"><div class="progress"><div id="lt-tbar" class="progress-bar ${genting(sisa, W) ? 'bg-danger' : ''}" style="width:${sisa / W * 100}%"></div></div><span class="small"><b id="lt-sisa">${fmt(sisa)}</b></span></div>`;
  }
  if (OPT(k)) {
    body += `<div class="${k === 'tebak_kata' ? 'lt-duo' : ''}">` + q.pilihan.map(o => `<button class="lt-opt ${a.v === o.label ? 'sel' : ''} ${a.done && o.label === q.kunci_jawaban ? 'ok' : ''} ${a.done && a.v === o.label && !a.ok ? 'no' : ''}" data-a="opt" data-v="${esc(o.label)}" ${a.done ? 'disabled' : ''}><b>${esc(o.label)}</b> ${esc(o.teks)}</button>`).join('') + '</div>';
  } else {
    if (!S.pz[S.i]) S.pz[S.i] = shuf([...tok(q.susunan), ...(q.pengecoh || [])].map((t, id) => ({ id, t })));
    const T = S.pz[S.i], by = Object.fromEntries(T.map(x => [x.id, x])), ch = a.ch || [];
    const chip = (x, act) => `<button class="lt-chip" data-a="${act}" data-id="${x.id}" ${a.done ? 'disabled' : ''}>${esc(x.t)}</button>`;
    body += `<div class="lt-zone ${a.done ? (a.ok ? 'ok' : 'no') : ''}" aria-label="Susunan jawabanmu">${ch.length ? ch.map(id => chip(by[id], 'pz-')).join('') : '<span class="text-secondary">Ketuk kata di bawah untuk menyusun jawaban…</span>'}</div>
      <div class="lt-bank" aria-label="Kumpulan kata">${T.filter(x => !ch.includes(x.id)).map(x => chip(x, 'pz+')).join('')}</div>`;
    if (!a.done) body += `<div class="d-flex gap-2 mt-3"><button class="btn lt-btn" data-a="cek" ${ch.length ? '' : 'disabled'}>Periksa Jawaban</button><button class="btn btn-outline-secondary" data-a="rst">Ulangi susunan</button></div>`;
  }
  if (a.done) body += `<div class="lt-fb ${a.ok ? 'good' : 'bad'} mt-3"><b>${a.ok ? '✔ Benar!' : a.habis ? '⏰ Waktu habis!' : '✘ Kurang tepat.'}</b> Kunci: ${esc(keyText(q))}<br><span class="small">${esc(q.penjelasan)}</span></div>`;
  return `<div class="card lt-card"><div class="card-body">
    <div class="d-flex justify-content-between small mb-1"><b>${esc(J[k].n)} · ${esc(S.judul)}</b><span>Soal ${S.i + 1}/${n} · ${pct}%</span></div>
    <div class="progress mb-3" role="progressbar" aria-label="Progres" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${pct}%"></div></div>
    <div class="lt-qwrap">${body}</div>
    <div class="lt-actions mt-4">
      <button class="btn btn-outline-primary" data-a="prev" ${S.i === 0 ? 'disabled' : ''}>← Sebelumnya</button>
      <button class="btn btn-outline-primary" data-a="next" ${S.i === n - 1 ? 'disabled' : ''}>Berikutnya →</button>
      <button class="btn ${S.tm[S.i] ? 'btn-warning' : 'btn-outline-warning'}" data-a="tandai">🚩 ${S.tm[S.i] ? 'Ditandai' : 'Tandai'}</button>
      <button class="btn btn-outline-secondary" data-a="simpan">💾 Simpan progres</button>
      <button class="btn btn-danger ms-auto" data-a="akhir">Akhiri latihan</button></div></div></div>`;
}

function hasil() {
  const r = LAST;
  return `<div class="card lt-card text-center mb-3"><div class="card-body py-5"><div class="text-secondary">Skor akhir</div><div class="display-1 fw-bold lt-skor"><span data-count="${r.nilai}">0</span></div>
  <p class="mb-3">${r.nilai === 100 ? '🎉 Sempurna!' : r.nilai >= 70 ? '👍 Bagus!' : '💪 Terus berlatih!'}</p>
  <div class="d-flex flex-wrap justify-content-center gap-3 mb-3"><span class="badge text-bg-success fs-6">Benar ${r.benar}</span><span class="badge text-bg-danger fs-6">Salah ${r.salah}</span><span class="badge text-bg-secondary fs-6">Kosong ${r.kosong}</span><span class="badge text-bg-info fs-6">⏱ ${r.durasi} dtk</span></div>
  <div class="lt-actions lt-center d-flex flex-wrap justify-content-center gap-2"><button class="btn lt-btn" data-a="ulang">Ulangi</button><button class="btn btn-outline-primary" data-a="nav" data-v="home">Kembali ke Latihan</button><button class="btn btn-outline-primary" data-a="nav" data-v="riwayat">Lihat Riwayat</button></div></div></div>
  <h5>Pembahasan</h5>${r.rev.map((x, i) => `<div class="card lt-card mb-2"><div class="card-body"><span class="badge text-bg-${x.k ? 'secondary' : x.s ? 'success' : 'danger'}">${x.k ? 'Tidak dijawab' : x.s ? 'Benar' : 'Salah'}</span> <b>${i + 1}.</b> <span style="white-space:pre-line">${esc(x.q)}</span><div class="small mt-2"><b>Kunci:</b> ${esc(x.key)}</div><div class="small text-secondary">${esc(x.p)}</div></div></div>`).join('')}`;
}

function riwayat() {
  if (!H.length) return '<div class="card lt-card"><div class="card-body text-center py-5">Belum ada riwayat. Selesaikan satu latihan dulu 🙂</div></div>';
  return `<div class="card lt-card mb-3"><div class="card-body"><h5>Perkembangan Nilai</h5><div style="height:260px"><canvas id="lt-chart"></canvas></div></div></div>
  <div class="card lt-card"><div class="card-body table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Paket</th><th>Nilai</th><th>Benar</th></tr></thead><tbody>${[...H].reverse().map(h => `<tr><td>${tglWIB(h.tanggal)}</td><td>${esc(J[h.kategori]?.n || h.kategori)}</td><td>${esc(h.judul)}</td><td><b>${h.nilai}</b></td><td>${h.benar}/${h.benar + h.salah + h.kosong}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function drawChart() {
  if (chart) chart.destroy(); const c = $('#lt-chart'); if (!c || !window.Chart) return;
  chart = new Chart(c, { type:'line', data:{ labels:H.map((h, i) => '#' + (i + 1)), datasets:[{ label:'Nilai', data:H.map(h => h.nilai), borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,.15)', fill:true, tension:.3 }] }, options:{ maintainAspectRatio:false, scales:{ y:{ min:0, max:100 } } } });
}
function formProfil(wajib) {
  const p = PROFIL || {};
  return `<div class="card lt-card"><div class="card-body p-4"><h5 class="mb-1">${wajib ? 'Lengkapi data dirimu' : 'Data diri'}</h5>
  <p class="text-secondary small mb-3">${wajib ? 'Isi sekali saja. Kamu bisa mengubahnya kapan pun di tab Profil.' : 'Kamu bisa mengubah data ini kapan saja.'}</p>
  <div class="row g-3">
    <div class="col-12"><label class="form-label" for="pf-nama">Nama lengkap</label><input id="pf-nama" class="form-control" maxlength="60" autocomplete="name" value="${esc(p.nama || '')}"></div>
    <div class="col-12"><label class="form-label" for="pf-sekolah">Sekolah</label><input id="pf-sekolah" class="form-control" maxlength="80" value="${esc(p.sekolah || '')}"></div>
    <div class="col-12"><label class="form-label" for="pf-kelas">Kelas</label><input id="pf-kelas" class="form-control" maxlength="20" placeholder="contoh: X IPA 1" value="${esc(p.kelas || '')}"></div>
  </div><button class="btn lt-btn w-100 mt-4" data-a="profilSimpan">${wajib ? 'Simpan &amp; mulai' : 'Simpan perubahan'}</button>${wajib ? '<button class="btn btn-link w-100 mt-2" data-a="keluar">Keluar</button>' : ''}</div></div>`;
}
function profil(st) {
  const got = st.badges.filter(b => b[3]).length;
  return `<div class="row g-3"><div class="col-lg-5">${formProfil(false)}
  <div class="card lt-card mt-3"><div class="card-body text-center"><div class="fs-1">🎓</div><h5 class="mb-1">Level ${st.lv}</h5><p class="mb-1">${st.xp} XP · ${st.days} hari aktif</p><p class="small text-secondary text-break mb-3">${esc(EMAIL)}</p><button class="btn btn-outline-danger btn-sm" data-a="keluar">Keluar</button></div></div></div>
  <div class="col-lg-7"><h5 class="mb-3">🏅 Perolehan Badge (${got}/${st.badges.length})</h5><div class="row g-3">${st.badges.map(b => `<div class="col-6 col-md-4"><div class="card lt-card h-100 ${b[3] ? '' : 'lt-lock'}"><div class="card-body"><div class="fs-2">${b[1]}</div><b>${b[0]}</b><div class="small text-secondary mb-2">${b[2]}</div><span class="badge text-bg-${b[3] ? 'success' : 'secondary'}">${b[3] ? 'Diraih' : 'Terkunci'}</span>${!b[3] && b[4] ? `<div class="small text-secondary mt-1">Progres: ${b[4]}</div>` : ''}${b[3] && BADGE[b[0]] ? `<div class="small text-secondary mt-1">${esc(BADGE[b[0]])} WIB</div>` : ''}</div></div></div>`).join('')}</div></div></div>`;
}
async function muatProfil() {
  try {
    const j = await api({ action:'profil' });
    if (j.ok) { PROFIL = j.profil || null; BADGE = Object.fromEntries((j.badges || []).map(b => [b.badge, b.diperoleh])); ls.s(pk(), PROFIL); }
  } catch {}
}

/* ---------- aksi ---------- */
function mulai(k, i) {
  const p = DATA[k][i]; if (!p) return;
  S = { kat:k, pi:i, paket:k + ':' + p.id, judul:p.judul || p.topik || 'Paket ' + (i + 1), i:0, jw:{}, tm:{}, pz:{}, t0:Date.now() };
  persist(); view = 'play'; render();
}
async function selesai() {
  if (busy) return;
  const L = qs(), kosong = L.filter((_, i) => !ans(i)).length;
  if (kosong && window.Swal) { const r = await Swal.fire({ title:'Akhiri latihan?', text:kosong + ' soal belum dijawab.', icon:'question', showCancelButton:true, confirmButtonText:'Akhiri', cancelButtonText:'Lanjut mengerjakan' }); if (!r.isConfirmed) return; }
  busy = true;
  const sc = L.map((_, i) => ans(i) && S.jw[i].ok ? 1 : 0), benar = sc.reduce((a, b) => a + b, 0);
  LAST = { id:crypto.randomUUID(), tanggal:new Date().toISOString(), kategori:S.kat, paket:S.paket, judul:S.judul,
    nilai:Math.round(benar / L.length * 100), benar, salah:L.length - benar - kosong, kosong, durasi:Math.round((Date.now() - S.t0) / 1000), cloud:false,
    rev:L.map((q, i) => ({ q:q.soal, key:keyText(q), p:q.penjelasan, s:sc[i], k:!ans(i) })) };
  const { rev, ...row } = LAST; H.push(row); saveH();
  S = null; ls.s(sk(), null); view = 'hasil'; render(); busy = false;
  sync();
}
async function adaDiCloud(id) { try { const j = await api({ action:'riwayat' }); return j.ok && j.data.some(r => r.id === id); } catch { return false; } }
async function sync() {
  const pend = H.filter(h => !h.cloud);
  if (!pend.length || !TOKEN) return;
  setStatus('Menyimpan...');
  for (const h of pend) {
    let ok = false;
    for (let t = 0; t < 3 && !ok && TOKEN; t++) {
      try { const { cloud, ...row } = h; const j = await api({ action:'simpan', ...row }); ok = j.ok === true; if (!ok) { console.warn('API menolak:', j.error); if (j.auth) return; } }
      catch (err) { console.warn('Gagal membaca respons:', err.message); ok = await adaDiCloud(h.id); }
      if (!ok) await new Promise(r => setTimeout(r, 800 * (t + 1)));
    }
    if (!ok) return setStatus('Gagal menyimpan — akan dicoba lagi saat online');
    h.cloud = true; saveH();
  }
  setStatus('Tersimpan'); await muatProfil(); if (view === 'riwayat' || view === 'home') render();
}
async function tarik() {
  try {
    const j = await api({ action:'riwayat' }); if (!j.ok) return;
    const ids = new Set(H.map(h => h.id));
    j.data.forEach(r => { if (!ids.has(r.id)) H.push({ ...r, cloud:true }); });
    H.sort((a, b) => a.tanggal.localeCompare(b.tanggal)); saveH();
  } catch { setStatus('Offline: memakai data lokal'); }
}

root.addEventListener('click', async e => {
  const t = e.target.closest('[data-a]'); if (!t) return;
  const A = t.dataset.a;
  if (A === 'kode') {
    const em = $('#lt-em').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return toast('Email tidak valid', 'warning');
    if (!API) return toast('API belum dikonfigurasi', 'error');
    t.disabled = true;
    try { const j = await api({ action:'kirimKode', email:em }); if (j.ok) { lemail = em; step = 2; toast('Kode dikirim. Cek inbox/spam.', 'success'); } else toast(j.error || 'Gagal mengirim kode', 'error'); } catch { toast('Tidak bisa terhubung ke server', 'error'); }
    return render();
  }
  if (A === 'ganti') { step = 1; return render(); }
  if (A === 'masuk') {
    const kd = $('#lt-kd').value.trim(); if (!/^\d{6}$/.test(kd)) return toast('Kode harus 6 digit', 'warning');
    t.disabled = true;
    try {
      const j = await api({ action:'masuk', email:lemail, kode:kd });
      if (!j.ok) { toast(j.error || 'Kode salah', 'error'); return render(); }
      TOKEN = j.token; EMAIL = j.email; ls.s('lt_token', TOKEN); ls.s('lt_email', EMAIL);
      H = ls.g(hk(), []); S = ls.g(sk(), null); PROFIL = ls.g(pk(), null); step = 1; view = 'home';
      await muatProfil(); render(); await tarik(); render(); sync();
    } catch { toast('Tidak bisa terhubung ke server', 'error'); render(); }
    return;
  }
  if (!TOKEN) return;
  const q = S && view === 'play' ? qs()[S.i] : null, a = S && view === 'play' ? (S.jw[S.i] = S.jw[S.i] || {}) : null;
  if (A === 'nav') {
    view = t.dataset.v; render();
    if (view === 'profil') muatProfil().then(() => { if (view === 'profil' && !(document.activeElement?.id || '').startsWith('pf-')) render(); });
    return;
  }
  if (A === 'keluar') return keluar();
  if (A === 'profilSimpan') {
    const v = id => $(id).value.replace(/\s+/g, ' ').trim(), d = { nama:v('#pf-nama'), sekolah:v('#pf-sekolah'), kelas:v('#pf-kelas') };
    if (d.nama.length < 3) return toast('Nama lengkap minimal 3 huruf', 'warning');
    if (d.sekolah.length < 3) return toast('Nama sekolah belum diisi', 'warning');
    if (!d.kelas) return toast('Kelas belum diisi', 'warning');
    t.disabled = true;
    try {
      const j = await api({ action:'profilSimpan', ...d });
      if (j.ok) { PROFIL = d; ls.s(pk(), d); toast('Data diri disimpan', 'success'); } else toast(j.error || 'Gagal menyimpan', 'error');
    } catch { toast('Tidak bisa terhubung ke server', 'error'); }
    return render();
  }
  if (A === 'musik') return musik();
  if (A === 'mulai') return mulai(t.dataset.k, +t.dataset.i);
  if (A === 'lanjut') { if (!DATA[S.kat]) return toast('Data paket tidak ditemukan', 'error'); view = 'play'; return render(); }
  if (A === 'buang') { S = null; persist(); return render(); }
  if (A === 'ulang') { const [k, id] = LAST.paket.split(':'); return mulai(k, DATA[k].findIndex(p => p.id === id)); }
  if (!S) return;
  if (A === 'prev') S.i--; else if (A === 'next') S.i++;
  else if (A === 'tandai') S.tm[S.i] = !S.tm[S.i];
  else if (A === 'simpan') { persist(); toast('Progres disimpan di perangkat', 'success'); return; }
  else if (A === 'akhir') return selesai();
  else if (A === 'opt' && !a.done) { a.v = t.dataset.v; a.done = true; a.ok = a.v === q.kunci_jawaban; }
  else if (A === 'pz+' && !a.done) a.ch = [...(a.ch || []), +t.dataset.id];
  else if (A === 'pz-' && !a.done) a.ch = a.ch.filter(x => x !== +t.dataset.id);
  else if (A === 'rst' && !a.done) a.ch = [];
  else if (A === 'cek' && !a.done && a.ch?.length) {
    const T = S.pz[S.i], txt = norm(a.ch.map(id => T.find(x => x.id === id).t).join(' '));
    a.ok = [q.susunan, ...(q.susunan_alternatif || [])].some(x => norm(x) === txt); a.done = true;
  }
  persist(); render();
});

/* ---------- musik latar & konfeti ---------- */
let ac, master, mt, gt, on = false, trk = 0, pos = 2, stp = 0;
// Playlist generatif (tanpa file audio): berganti otomatis tiap DURASI_LAGU ms
const DURASI_LAGU = 40000;
const LAGU = [
  { n:'Pagi Ceria', bpm:104, w:'triangle', v:.06, s:[261.6, 293.7, 329.6, 392, 440, 523.3] },
  { n:'Santai Senja', bpm:76, w:'sine', v:.07, s:[220, 261.6, 293.7, 329.6, 392, 440] },
  { n:'Semangat Belajar', bpm:124, w:'triangle', v:.05, s:[293.7, 329.6, 370, 440, 493.9, 587.3] },
  { n:'Malam Tenang', bpm:62, w:'sine', v:.07, s:[196, 220, 261.6, 293.7, 329.6, 392] }
];
function nada(f, dur, vol, wave) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = wave; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur);
}
function langkah() {
  const L = LAGU[trk]; stp++;
  pos = Math.max(0, Math.min(L.s.length - 1, pos + (Math.random() * 3 | 0) - 1));
  if (Math.random() < .8) nada(L.s[pos], 1, L.v, L.w);
  if (stp % 4 === 1) nada(L.s[0] / 2, 1.4, L.v, 'sine');
}
function labelMusik() {
  const b = $('[data-a="musik"]'); if (!b) return;
  b.textContent = on ? '🔊 ' + LAGU[trk].n : '🔇 Musik: mati'; b.setAttribute('aria-pressed', on);
}
function lagu(i) {
  trk = i; stp = 0; pos = 2; clearInterval(mt); clearTimeout(gt);
  mt = setInterval(langkah, 30000 / LAGU[i].bpm); gt = setTimeout(ganti, DURASI_LAGU); labelMusik();
}
function ganti() {
  if (!on) return;
  master.gain.setTargetAtTime(0, ac.currentTime, .3);          // fade out
  setTimeout(() => { if (!on) return; lagu((trk + 1) % LAGU.length); master.gain.setTargetAtTime(1, ac.currentTime, .4); }, 1200);
}
function musik() {
  if (on) { on = false; clearInterval(mt); clearTimeout(gt); return labelMusik(); }
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (!master) { master = ac.createGain(); master.connect(ac.destination); }
  if (ac.resume) ac.resume();
  master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = 1; on = true; lagu(trk);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  for (let i = 0; i < 40; i++) { const s = document.createElement('span'); s.className = 'lt-conf'; s.textContent = ['🎉', '⭐', '✨'][i % 3]; s.style.cssText = `left:${Math.random() * 100}vw;animation-delay:${Math.random()}s`; document.body.appendChild(s); setTimeout(() => s.remove(), 3500); }
}

/* ---------- anti-curang: peringatan langsung & siswa ditahan di halaman latihan ---------- */
let pergi = false, lastWarn = 0;
const aktif = () => !!S && view === 'play';
function peringatan(cd = 0) {
  if (!aktif() || Date.now() - lastWarn < cd) return;
  lastWarn = Date.now();
  const msg = 'Kamu terdeteksi meninggalkan halaman latihan (membuka tab atau halaman lain). Kerjakan dengan jujur ya.';
  window.Swal ? Swal.fire({ icon:'warning', title:'Jangan coba-coba! 👀', text:msg, confirmButtonText:'Saya mengerti', allowOutsideClick:false }) : alert(msg);
}
// pindah tab / jendela: peringatan dihitung sekali per kepergian, langsung dimunculkan
const tinggalkan = () => { if (aktif() && !pergi) { pergi = true; peringatan(); } };
const kembali = () => { pergi = false; };
document.addEventListener('visibilitychange', () => document.hidden ? tinggalkan() : kembali());
addEventListener('blur', tinggalkan); addEventListener('focus', kembali);
// klik menu ke halaman lain (Materi, Cek Kata, dll.) ditahan: alert muncul, halaman tidak berpindah
addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-hal]');
  if (t && aktif() && t.dataset.hal !== 'latihan') { e.preventDefault(); e.stopImmediatePropagation(); peringatan(800); }
}, true);
// pengaman: jika halaman tetap berpindah lewat cara lain, kembalikan ke Latihan
new MutationObserver(() => {
  if (aktif() && $('#latihan').classList.contains('d-none')) {
    document.querySelectorAll('.halaman').forEach(x => x.classList.toggle('d-none', x.id !== 'latihan'));
    peringatan(800);
  }
}).observe($('#latihan'), { attributes:true, attributeFilter:['class'] });

/* ---------- timer per soal (semua jenis soal) ----------
   Prioritas durasi: "waktu" pada soal > "waktu_per_soal" pada paket > bawaan jenis soal.
   Isi 0 untuk mematikan timer pada soal/paket tertentu. */
const waktuSoal = q => {
  if (!S || !q) return 0;
  const p = DATA[S.kat]?.[S.pi];
  if (q.waktu != null) return +q.waktu;
  if (p?.waktu_per_soal != null) return +p.waktu_per_soal;
  if (PZ(S.kat)) return Math.min(240, Math.max(45, 30 + 4 * tok(q.susunan).length));   // puzzle: menyesuaikan jumlah kata
  return S.kat === 'tebak_kata' ? 15 : 45;
};
const fmt = d => { d = Math.ceil(d); return d >= 60 ? Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : d + ' detik'; };
const genting = (sisa, W) => sisa <= Math.min(10, W * .25);
setInterval(() => {
  if (!aktif()) return;
  const q = qs()[S.i], W = waktuSoal(q); if (!W) return;
  const a = S.jw[S.i], t0 = S.t1 && S.t1[S.i]; if (!a || a.done || !t0) return;
  const sisa = W - (Date.now() - t0) / 1000;
  if (sisa <= 0) {
    // waktu habis: puzzle yang sudah tersusun benar tetap dinilai benar
    if (PZ(S.kat) && a.ch?.length) { const T = S.pz[S.i], txt = norm(a.ch.map(id => T.find(x => x.id === id).t).join(' ')); a.ok = [q.susunan, ...(q.susunan_alternatif || [])].some(x => norm(x) === txt); } else a.ok = false;
    a.done = true; a.habis = !a.ok; persist(); render(); return;
  }
  const el = $('#lt-sisa'), bar = $('#lt-tbar');
  if (el) el.textContent = fmt(sisa);
  if (bar) { bar.style.width = (sisa / W * 100) + '%'; bar.classList.toggle('bg-danger', genting(sisa, W)); }
}, 250);

/* ---------- init ---------- */
(async () => {
  root.innerHTML = '<div class="lt-skel"></div><div class="lt-skel"></div>';
  await load();
  if (TOKEN) { H = ls.g(hk(), []); S = ls.g(sk(), null); PROFIL = ls.g(pk(), null); if (!lengkap(PROFIL)) await muatProfil(); }
  render();
  if (TOKEN) { await tarik(); await muatProfil(); render(); sync(); }
  addEventListener('online', sync);
})();
})();
