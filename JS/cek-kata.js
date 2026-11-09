/* =====================================================================
   cek-kata.js — Fitur "Cek Kata" (baku / tidak baku) untuk KataBaku.id
   Sumber data: databaku.json  ->  [{ id, kata_baku, kata_tidak_baku }]
   (kata_tidak_baku boleh berisi beberapa bentuk dipisah koma.)
   Muat file ini SESUDAH script.js.
   ===================================================================== */
(function () {
  const URL_DATA = "databaku.json";   // letakkan satu folder dengan index.html
  const MAKS_SARAN = 6;

  const $ = s => document.querySelector(s);
  const norm = s => String(s || "").trim().toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, " ");
  const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks !== undefined) e.textContent = teks; return e; };
  const urutan = (a, b) => a.baku.localeCompare(b.baku, "id");

  let DATA = [];
  const indeks = new Map();   // kata (huruf kecil) -> [{ d, jenis: "baku" | "tb", bentuk }]
  const tambah = (w, item) => { const k = norm(w); if (!indeks.has(k)) indeks.set(k, []); indeks.get(k).push(item); };

  /* ---------- Muat & rapikan data ---------- */
  async function muat() {
    try {
      const res = await fetch(URL_DATA);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const mentah = await res.json();
      DATA = mentah.map(r => {
        const baku = String(r.kata_baku).trim();
        const tb = String(r.kata_tidak_baku || "").split(",").map(s => s.trim()).filter(s => s && norm(s) !== norm(baku));
        return { id: r.id, baku, tb };
      });
      DATA.forEach(d => { tambah(d.baku, { d, jenis: "baku", bentuk: d.baku }); d.tb.forEach(t => tambah(t, { d, jenis: "tb", bentuk: t })); });
      $("#ck-jumlah").textContent = DATA.length;
      $("#ck-stat").textContent = `${DATA.length} pasang kata siap dicek`;
      ["#ck-input", "#ck-tombol", "#ck-acak"].forEach(s => $(s).disabled = false);
      kosong(); buatAbjad(); tampilDaftar("A");
    } catch (e) {
      console.error(e);
      $("#ck-hasil").replaceChildren(el("div", "alert alert-danger", "Data kata tidak dapat dimuat. Pastikan databaku.json berada satu folder dengan index.html, dan buka website lewat Live Server atau GitHub Pages (bukan klik dua kali pada file)."));
    }
  }

  /* ---------- Kemiripan kata (saran jika tidak ditemukan) ---------- */
  function jarak(a, b) {
    const m = a.length, n = b.length, t = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) t[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      t[i][j] = Math.min(t[i - 1][j] + 1, t[i][j - 1] + 1, t[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return t[m][n];
  }
  const mirip = k => [...indeks.keys()].map(w => ({ w, j: jarak(k, w) })).filter(x => x.j <= 2).sort((a, b) => a.j - b.j).slice(0, 4).map(x => indeks.get(x.w)[0].bentuk);

  /* ---------- Saran saat mengetik ---------- */
  function tampilSaran() {
    const k = norm($("#ck-input").value), kotak = $("#ck-saran");
    if (!k) return kotak.classList.add("d-none");
    const cocok = [...indeks.entries()].filter(([w]) => w.startsWith(k) || w.includes(k))
      .sort((a, b) => (b[0].startsWith(k)) - (a[0].startsWith(k)) || a[0].length - b[0].length).slice(0, MAKS_SARAN);
    if (!cocok.length) return kotak.classList.add("d-none");
    kotak.replaceChildren(...cocok.map(([, items]) => {
      const it = items[0], b = el("button", "list-group-item list-group-item-action"); b.type = "button";
      b.append(el("span", "fw-medium", it.bentuk), el("span", `badge rounded-pill text-bg-${it.jenis === "baku" ? "success" : "danger"}`, it.jenis === "baku" ? "baku" : "tidak baku"));
      b.addEventListener("mousedown", e => { e.preventDefault(); periksa(it.bentuk); });
      return b;
    }));
    kotak.classList.remove("d-none");
  }

  /* ---------- Tampilan hasil ---------- */
  const kotakKata = (label, kata, kelas) => { const k = el("div", `ck-kotak ${kelas}`); k.append(el("small", "", label), el("div", "ck-kata", kata)); return k; };
  function kepala(ikon, bg, judul, sub) {
    const w = el("div", "text-center"), i = el("div", "ck-bulat", ikon); i.style.background = bg;
    w.append(i, el("h3", "fw-bold mb-1", judul)); if (sub) w.append(el("p", "text-secondary mb-0", sub));
    return w;
  }
  function aksi(baku) {
    const w = el("div", "d-flex flex-wrap justify-content-center gap-2 mt-3");
    const s = el("button", "btn btn-outline-primary rounded-pill btn-sm", "Salin kata baku"); s.type = "button";
    s.onclick = async () => { try { await navigator.clipboard.writeText(baku); s.textContent = "Tersalin ✓"; setTimeout(() => s.textContent = "Salin kata baku", 1500); } catch (e) {} };
    const k = el("a", "btn btn-primary rounded-pill btn-sm", "Lihat di KBBI ↗");
    k.href = "https://kbbi.kemendikdasmen.go.id/entri/" + encodeURIComponent(baku.toLowerCase()); k.target = "_blank"; k.rel = "noopener";
    w.append(s, k); return w;
  }
  function lain(label, daftar) {
    const p = el("div", "ck-lain"); p.append(el("strong", "", label + " "), document.createTextNode(daftar.join(", "))); return p;
  }

  function kartuHit(h) {
    const kartu = el("div", "ck-kartu"), d = h.d;
    if (h.jenis === "tb") {
      kartu.append(kepala("❌", "#fee2e2", "Wah, ini belum baku", "Bentuk yang benar ada di kotak hijau."));
      const b = el("div", "ck-banding");
      b.append(kotakKata("Tidak baku", h.bentuk, "ck-salah"), el("div", "ck-panah", "➜"), kotakKata("Baku", d.baku, "ck-benar"));
      kartu.append(b);
      const sisa = d.tb.filter(t => norm(t) !== norm(h.bentuk));
      if (sisa.length) kartu.append(lain("Bentuk tidak baku lainnya:", sisa));
    } else {
      kartu.append(kepala("✅", "#dcfce7", "Mantap! Kata ini sudah baku"));
      const b = el("div", "ck-banding"); b.style.gridTemplateColumns = "1fr";
      b.append(kotakKata("Baku", d.baku, "ck-benar")); kartu.append(b);
      if (d.tb.length) kartu.append(lain("Sering salah ditulis:", d.tb));
    }
    kartu.append(aksi(d.baku));
    return kartu;
  }

  function kosong() {
    const k = el("div", "ck-kartu kosong");
    k.append(el("div", "ck-bulat", "✍️"), el("h5", "fw-bold text-primary-emphasis", "Belum ada yang dicek"),
      el("p", "mb-0", "Ketik sebuah kata di kolom atas, tekan tombol Kata Acak, atau buka tab Jelajah A–Z."));
    k.querySelector(".ck-bulat").style.background = "#dbeafe";
    $("#ck-hasil").replaceChildren(k);
  }

  function periksa(kataMentah) {
    const k = norm(kataMentah), hasil = $("#ck-hasil");
    $("#ck-saran").classList.add("d-none");
    try { bootstrap.Tab.getOrCreateInstance($("#ck-btn-cek")).show(); } catch (e) {}
    if (!k) { const a = el("div", "alert alert-warning ck-kartu", "Ketik satu kata terlebih dahulu."); hasil.replaceChildren(a); return; }
    $("#ck-input").value = String(kataMentah).trim();
    const hits = indeks.get(k) || [];
    if (hits.length) hasil.replaceChildren(...hits.map(kartuHit));
    else {
      const kartu = el("div", "ck-kartu");
      kartu.append(kepala("🔎", "#e0e7ff", "Kata belum ada di daftar",
        `“${String(kataMentah).trim()}” belum tercakup. Daftar fitur ini terbatas pada ${DATA.length} pasang kata, jadi coba periksa ejaannya atau cek langsung di KBBI.`));
      const s = mirip(k);
      if (s.length) {
        const p = el("div", "text-center mt-3"); p.append(el("div", "fw-semibold mb-2", "Mungkin maksudmu:"));
        s.forEach(w => { const b = el("button", "btn btn-light rounded-pill me-1 mb-1", w); b.type = "button"; b.onclick = () => periksa(w); p.append(b); });
        kartu.append(p);
      }
      hasil.replaceChildren(kartu);
    }
    hasil.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- Jelajah A–Z ---------- */
  function buatAbjad() {
    const huruf = [...new Set(DATA.map(d => d.baku[0].toUpperCase()))].sort();
    $("#ck-abjad").replaceChildren(...["Semua", ...huruf].map(h => {
      const b = el("button", "ck-huruf" + (h === "A" ? " aktif" : ""), h); b.type = "button";
      b.onclick = () => { document.querySelectorAll(".ck-huruf").forEach(x => x.classList.toggle("aktif", x === b)); tampilDaftar(h); };
      return b;
    }));
  }
  function tampilDaftar(h) {
    const isi = DATA.filter(d => h === "Semua" || d.baku[0].toUpperCase() === h).sort(urutan);
    $("#ck-daftar").replaceChildren(...isi.map(d => {
      const kol = el("div", "col-sm-6 col-lg-4"), b = el("button", "ck-mini"); b.type = "button";
      if (d.tb.length) b.append(el("s", "", d.tb.join(", ")));
      b.append(el("strong", "", "✓ " + d.baku));
      b.onclick = () => periksa(d.tb[0] || d.baku);
      kol.append(b); return kol;
    }));
  }

  /* ---------- Pemasangan ---------- */
  $("#ck-form").addEventListener("submit", e => { e.preventDefault(); periksa($("#ck-input").value); });
  $("#ck-input").addEventListener("input", tampilSaran);
  $("#ck-input").addEventListener("keydown", e => { if (e.key === "Escape") $("#ck-saran").classList.add("d-none"); });
  $("#ck-acak").addEventListener("click", () => { const d = DATA[Math.floor(Math.random() * DATA.length)]; periksa(d.tb[0] || d.baku); });
  document.addEventListener("click", e => { if (!e.target.closest("#ck-form")) $("#ck-saran").classList.add("d-none"); });
  muat();
})();
