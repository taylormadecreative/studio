/* Taylormade Creative Print : site.js */
"use strict";

const SUPABASE_URL = "https://pgqdmnmessbbzyszjfvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_fyYqa9QkEeA5LD_0hYLTTA_F8Gxw1oz";
const NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/taylormademd@gmail.com";
const MAX_FILES = 12;
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const OK_EXT = /\.(pdf|png|jpe?g|ai|eps|svg|tiff?|psd|zip)$/i;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- nav ---------------- */
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const toggle = $("#navToggle");
const sheet = $("#mobileSheet");
function setMenu(open) {
  sheet.classList.toggle("open", open);
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  sheet.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("locked", open);
}
toggle.addEventListener("click", () => setMenu(!sheet.classList.contains("open")));
$$("a", sheet).forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheet.classList.contains("open")) { setMenu(false); toggle.focus(); }
});
window.addEventListener("resize", () => {
  if (window.innerWidth >= 920 && sheet.classList.contains("open")) setMenu(false);
}, { passive: true });

/* ---------------- reveals ---------------- */
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = $$("[data-reveal]");
if (reduce || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  reveals.forEach((el) => io.observe(el));
}

/* ---------------- sticky mobile CTA ---------------- */
const sticky = $("#stickyCta");
const hero = $(".hero");
const orderSec = $("#order");
function updateSticky() {
  const pastHero = window.scrollY > hero.offsetHeight - 80;
  const r = orderSec.getBoundingClientRect();
  const nearOrder = r.top < window.innerHeight && r.bottom > 0;
  const show = pastHero && !nearOrder && !sheet.classList.contains("open");
  sticky.classList.toggle("show", show);
  sticky.setAttribute("aria-hidden", String(!show));
}
updateSticky();
window.addEventListener("scroll", updateSticky, { passive: true });

/* ---------------- year ---------------- */
$("#yr").textContent = new Date().getFullYear();

/* ================= ORDER DESK ================= */
const form = $("#orderForm");
const chipsWrap = $("#productChips");
const chips = $$(".chip", chipsWrap);
const fileInput = $("#fileInput");
const drop = $("#drop");
const fileListEl = $("#fileList");
const designHelp = $("#designHelp");
const submitBtn = $("#submitBtn");

/* human-readable ticket ref, assigned per visit */
const ref = "TC-" + Date.now().toString(36).slice(-4).toUpperCase() +
  Math.random().toString(36).slice(2, 4).toUpperCase();
$("#ticketRef").textContent = "N° " + ref;

/* product chip state (class-based; :has fallback) */
function syncChips() {
  chips.forEach((c) => c.classList.toggle("on", $("input", c).checked));
  if ($("input:checked", chipsWrap)) hideErr("productErr");
}
chips.forEach((c) => $("input", c).addEventListener("change", syncChips));

/* price-list rows and event CTA preselect the product, then scroll */
$$("[data-product]").forEach((el) => {
  el.addEventListener("click", () => {
    const val = el.getAttribute("data-product");
    const input = $$("input", chipsWrap).find((i) => i.value === val);
    if (input) {
      input.checked = true;
      syncChips();
      input.closest(".chip")?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  });
});

/* ---------------- files ---------------- */
const picked = []; // { file, status: pending|uploading|done|error, path, pct }

function fmtSize(b) {
  if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

function addFiles(list) {
  let rejected = [];
  for (const f of list) {
    if (picked.length >= MAX_FILES) { rejected.push(f.name + " (over the 12 file limit)"); continue; }
    if (!OK_EXT.test(f.name)) { rejected.push(f.name + " (file type not supported)"); continue; }
    if (f.size > MAX_FILE_BYTES) { rejected.push(f.name + " (over 150MB)"); continue; }
    if (picked.some((p) => p.file.name === f.name && p.file.size === f.size)) continue;
    picked.push({ file: f, status: "pending", path: null, pct: 0 });
  }
  if (rejected.length) showErr("filesErr", "Could not add: " + rejected.join(", "));
  else hideErr("filesErr");
  renderFiles();
}

function renderFiles() {
  fileListEl.innerHTML = "";
  picked.forEach((p, i) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "fl-name";
    name.textContent = p.file.name;
    const size = document.createElement("span");
    size.className = "fl-size";
    size.textContent = fmtSize(p.file.size);
    li.append(name, size);
    if (p.status === "uploading") {
      const bar = document.createElement("span");
      bar.className = "fl-bar";
      const fill = document.createElement("i");
      fill.style.width = p.pct + "%";
      bar.appendChild(fill);
      li.appendChild(bar);
      p.barFill = fill;
    } else if (p.status === "done") {
      const ok = document.createElement("span");
      ok.className = "fl-ok";
      ok.textContent = "✓";
      li.appendChild(ok);
    } else if (p.status === "error") {
      const bad = document.createElement("span");
      bad.className = "fl-err-mark";
      bad.textContent = "✕";
      li.appendChild(bad);
    }
    if (p.status === "pending" || p.status === "error") {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "fl-x";
      x.setAttribute("aria-label", "Remove " + p.file.name);
      x.textContent = "×";
      x.addEventListener("click", () => { picked.splice(i, 1); renderFiles(); });
      li.appendChild(x);
    }
    fileListEl.appendChild(li);
  });
}

drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
["dragenter", "dragover"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); }));
["dragleave", "drop"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("dragover"); }));
drop.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
designHelp.addEventListener("change", () => hideErr("filesErr"));

/* ---------------- errors ---------------- */
function showErr(id, msg) {
  const el = $("#" + id);
  if (msg) el.textContent = msg;
  el.hidden = false;
}
function hideErr(id) { $("#" + id).hidden = true; }

/* ---------------- upload ---------------- */
function uploadFile(p) {
  return new Promise((resolve) => {
    const safe = p.file.name.replace(/[^\w.\-]/g, "_");
    const path = ref + "/" + Date.now() + "-" + safe;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", SUPABASE_URL + "/storage/v1/object/quote-art/" + encodeURIComponent(path).replace(/%2F/g, "/"));
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", "Bearer " + SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        p.pct = Math.round((e.loaded / e.total) * 100);
        if (p.barFill) p.barFill.style.width = p.pct + "%";
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        p.status = "done";
        p.path = path;
      } else {
        p.status = "error";
      }
      resolve();
    });
    xhr.addEventListener("error", () => { p.status = "error"; resolve(); });
    xhr.send(p.file);
  });
}

/* ---------------- submit ---------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideErr("submitErr");

  /* honeypot: pretend success, do nothing */
  if ($("#fWebsite").value) { finish(); return; }

  const product = $("input:checked", chipsWrap)?.value;
  const name = $("#fName").value.trim();
  const email = $("#fEmail").value.trim();
  let bad = false;

  if (!product) { showErr("productErr"); bad = true; } else hideErr("productErr");
  if (!name) { showErr("nameErr"); bad = true; } else hideErr("nameErr");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showErr("emailErr"); bad = true; } else hideErr("emailErr");
  if (!picked.length && !designHelp.checked) { showErr("filesErr", "Add your files, or check the box and I will design it for you."); bad = true; } else hideErr("filesErr");

  if (bad) {
    const firstErr = $(".field-err:not([hidden])", form);
    firstErr?.closest("fieldset")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    return;
  }

  submitBtn.disabled = true;

  /* 1. upload files (sequential, with per-file progress) */
  const toUpload = picked.filter((p) => p.status !== "done");
  for (let i = 0; i < toUpload.length; i++) {
    const p = toUpload[i];
    p.status = "uploading";
    renderFiles();
    submitBtn.textContent = "Sending file " + (picked.indexOf(p) + 1) + " of " + picked.length + "…";
    await uploadFile(p);
    renderFiles();
  }
  const failed = picked.filter((p) => p.status === "error");
  if (failed.length) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send my order request <span class="arr" aria-hidden="true">→</span>';
    showErr("submitErr", "Some files did not go through: " + failed.map((p) => p.file.name).join(", ") + ". Tap send again to retry, or remove them.");
    return;
  }

  /* 2. save the request */
  submitBtn.textContent = "Sending your request…";
  const row = {
    ref,
    name,
    business: $("#fBiz").value.trim() || null,
    email,
    phone: $("#fPhone").value.trim() || null,
    product,
    quantity: $("#fQty").value.trim() || null,
    size: $("#fSize").value.trim() || null,
    deadline: $("#fDeadline").value.trim() || null,
    notes: [$("#fNotes").value.trim(), designHelp.checked ? "Needs design (no print-ready art)." : ""]
      .filter(Boolean).join(" · ") || null,
    art_paths: picked.map((p) => p.path).filter(Boolean),
    status: "new",
  };
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/print_quotes", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error("Request failed (" + res.status + ")");
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send my order request <span class="arr" aria-hidden="true">→</span>';
    showErr("submitErr", "Something went wrong sending your request. Try again, or email taylormademd@gmail.com and I will take it from there.");
    return;
  }

  /* 3. best-effort email ping (the request is already saved either way) */
  try {
    await fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "New print quote request " + ref + " · " + row.product,
        _template: "table",
        ticket: ref,
        name: row.name,
        business: row.business || "",
        email: row.email,
        phone: row.phone || "",
        product: row.product,
        quantity: row.quantity || "",
        size: row.size || "",
        deadline: row.deadline || "",
        notes: row.notes || "",
        files: String(row.art_paths.length),
      }),
    });
  } catch (_) { /* non-blocking */ }

  finish();

  function finish() {
    form.hidden = true;
    const done = $("#orderDone");
    const to = $("#fEmail").value.trim();
    $("#doneRef").textContent = "N° " + ref;
    $("#doneMeta").textContent = "Your ticket number is " + ref +
      ". A copy of your quote goes to " + (to || "your email") + ".";
    done.hidden = false;
    done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
});
