import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.TC_CONFIG;
const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => (s ?? "").toString().replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const PRINT_PRODUCTS = [
  "Business cards", "Flyers", "Postcards", "Brochures", "Posters",
  "Banners", "Stickers / labels", "Yard signs", "Door hangers", "Booklets", "Other"
];

const state = {
  user: null, profile: null, isAdmin: false,
  clients: [], client: null, activeClientId: null,
  posts: [], orders: [], assets: [],
  tab: "content", selectedPostId: null,
};

/* ---------------- boot ---------------- */
init();
async function init() {
  const { data } = await sb.auth.getSession();
  if (data.session) { state.user = data.session.user; await loadApp(); return; }
  showAuth();
  // Surface a failed Google round-trip (Supabase returns these in the hash).
  const p = new URLSearchParams(location.hash.slice(1));
  const oauthErr = p.get("error_description") || p.get("error");
  if (oauthErr) {
    $("#authErr").textContent = decodeURIComponent(oauthErr).replace(/\+/g, " ");
    history.replaceState(null, "", location.pathname);
  }
}

function showAuth() { $("#authView").classList.remove("hidden"); $("#appView").classList.add("hidden"); }
function showApp() { $("#authView").classList.add("hidden"); $("#appView").classList.remove("hidden"); }

/* ---------------- login ---------------- */
/* Two doors, no passwords: Google, or a one-time link over email.
   Both land back on this page and are picked up by getSession() in init(). */

$("#googleBtn").addEventListener("click", async () => {
  const btn = $("#googleBtn"); const err = $("#authErr");
  err.textContent = ""; btn.disabled = true; btn.querySelector("span").textContent = "Redirecting\u2026";
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) {
    btn.disabled = false; btn.querySelector("span").textContent = "Continue with Google";
    err.textContent = error.message || "Could not start Google sign-in.";
  }
});

$("#linkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#linkBtn"), err = $("#authErr"), ok = $("#authOk");
  const email = $("#email").value.trim();
  err.textContent = ""; ok.classList.add("hidden");
  btn.disabled = true; btn.textContent = "Sending\u2026";

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });

  btn.disabled = false; btn.textContent = "Email me a sign-in link";
  if (error) {
    err.textContent = /rate|limit/i.test(error.message || "")
      ? "That's a few too many requests in a row. Give it a minute, then try again."
      : (error.message || "Could not send the link.");
    return;
  }
  $("#linkForm").classList.add("hidden");
  ok.classList.remove("hidden");
  ok.innerHTML = `Check <strong>${esc(email)}</strong> for a sign-in link. It's good for one hour \u2014 open it on this device.`;
});

$("#logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

/* ---------------- load app ---------------- */
async function loadApp() {
  const { data: prof, error } = await sb.from("profiles").select("*").eq("id", state.user.id).single();
  if (error || !prof) {
    const email = state.user?.email || "that account";
    await sb.auth.signOut(); showAuth();
    $("#authErr").textContent = `${email} isn't linked to a portal account yet. Text Nelson at (817) 707-1291 and he'll switch it on.`;
    return;
  }
  state.profile = prof;
  state.isAdmin = prof.role === "admin";

  if (state.isAdmin) {
    const { data: clients } = await sb.from("clients").select("*").order("name");
    state.clients = clients || [];
    state.activeClientId = state.clients[0]?.id || null;
    $("#adminSwitch").classList.remove("hidden");
    const sel = $("#clientSelect");
    sel.innerHTML = state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    sel.value = state.activeClientId;
    sel.addEventListener("change", async () => { state.activeClientId = sel.value; await loadClientContext(); });
  } else {
    state.activeClientId = prof.client_id;
  }
  showApp();
  await loadClientContext();
  wireShell();
}

async function loadClientContext() {
  const { data: client } = await sb.from("clients").select("*").eq("id", state.activeClientId).single();
  state.client = client;
  applyTheme(client);
  state.selectedPostId = null;
  await loadData();
  renderShell();
  renderAll();
}

function applyTheme(client) {
  const b = client?.brand || {};
  const app = $("#appView");
  app.style.setProperty("--accent", b.accent || "#D97585");
  app.style.setProperty("--accent2", b.accent2 || "#F8F3EC");
  app.style.setProperty("--ink", b.ink || "#16110F");
  app.style.setProperty("--paper", b.paper || "#FBF7F1");
  app.style.setProperty("--brandfont", `"${b.font || "Fraunces"}"`);
}

async function loadData() {
  const cid = state.activeClientId;
  const [posts, orders, assets] = await Promise.all([
    sb.from("posts").select("*").eq("client_id", cid).order("sort").order("created_at"),
    sb.from("print_orders").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
    sb.from("assets").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
  ]);
  state.posts = posts.data || [];
  state.orders = orders.data || [];
  state.assets = assets.data || [];
}

/* ---------------- shell ---------------- */
function renderShell() {
  const c = state.client, b = c.brand || {};
  $("#crestDot").textContent = (c.name || "T")[0];
  $("#crestName").textContent = c.name;
  $("#brandQuote").textContent = b.quote || "";
  $("#brandQuote").style.display = b.quote ? "" : "none";
  const first = (state.isAdmin ? c.name : (state.profile.full_name || "there")).split(" ")[0];
  $("#greeting").textContent = `Hi ${first}`;
  $("#subhead").textContent = state.isAdmin
    ? `Managing ${c.name} · ${(c.platforms || []).join(", ")}`
    : `${b.tagline || "Your content portal"}`;
}

function wireShell() {
  $$("#tabs button").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  $$("#nav button").forEach(btn => btn.addEventListener("click", () => { setTab(btn.dataset.tab); $("#side").classList.remove("open"); }));
  $("#menuBtn").addEventListener("click", () => $("#side").classList.toggle("open"));
}

function setTab(tab) {
  state.tab = tab;
  $$("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$("#nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  ["content", "print", "uploads"].forEach(t => $(`#tab-${t}`).classList.toggle("hidden", t !== tab));
}

/* ---------------- render all ---------------- */
function renderAll() { renderStats(); renderContent(); renderPrint(); renderUploads(); setTab(state.tab); }

function statusOf(p) { return p.status || "review"; }

function renderStats() {
  const p = state.posts;
  const needs = p.filter(x => statusOf(x) === "review").length;
  const appr = p.filter(x => statusOf(x) === "approved").length;
  const sched = p.filter(x => ["scheduled", "published"].includes(statusOf(x))).length;
  const openOrders = state.orders.filter(o => !["shipped", "cancelled"].includes(o.status)).length;
  $("#stats").innerHTML = [
    [needs, "Needs your review"], [appr, "Approved"], [sched, "Scheduled"], [openOrders, "Open print orders"]
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
}

/* ---------------- content tab ---------------- */
function renderContent() {
  const pane = $("#tab-content");
  if (!state.posts.length) {
    pane.innerHTML = emptyState("No content yet",
      state.isAdmin ? "Add posts for this client to start the review flow." : "Your first posts drop here after your content day. I'll text you when they're ready.");
    return;
  }
  if (!state.selectedPostId) state.selectedPostId = state.posts[0].id;
  pane.innerHTML = `<div class="review">
    <div class="postlist">${state.posts.map(postCard).join("")}</div>
    <div class="detail" id="detail"></div>
  </div>`;
  $$(".postcard", pane).forEach(el => el.addEventListener("click", () => { state.selectedPostId = el.dataset.id; renderContent(); }));
  renderDetail();
}

function postCard(p) {
  const slide = (p.slides || [])[0];
  const st = statusOf(p);
  return `<div class="postcard ${p.id === state.selectedPostId ? "sel" : ""}" data-id="${p.id}">
    ${slide ? `<img class="thumb" src="${esc(slide)}" alt="">` : `<div class="thumb"></div>`}
    <div class="pc-body"><b>${esc(p.title)}</b><span>${esc(p.type)} · ${(p.platforms || []).join(", ")}</span></div>
    <span class="pill ${st}">${st}</span>
  </div>`;
}

function renderDetail() {
  const p = state.posts.find(x => x.id === state.selectedPostId);
  const d = $("#detail"); if (!p || !d) return;
  const slides = p.slides || [];
  const st = statusOf(p);
  d.innerHTML = `
    <div class="preview"><img id="bigSlide" src="${esc(slides[0] || "")}" alt=""></div>
    ${slides.length > 1 ? `<div class="filmstrip">${slides.map((s, i) => `<img src="${esc(s)}" class="${i === 0 ? "on" : ""}" data-i="${i}">`).join("")}</div>` : ""}
    <div class="d-body">
      <h3>${esc(p.title)}</h3>
      <div class="d-meta">${esc(p.type)} · ${(p.platforms || []).join(", ")}${p.go_live ? " · goes live " + esc(p.go_live) : ""} · <b>${st}</b></div>
      ${p.caption ? `<div class="caption">${esc(p.caption)}</div>` : ""}
      ${st === "approved" ? `<p class="ph">You approved this. ✓</p>` :
      `<textarea id="noteBox" placeholder="Notes for Nelson (optional)…"></textarea>
       <div class="d-actions">
         <button class="btn approve" id="approveBtn">Approve</button>
         <button class="btn changes" id="changesBtn">Request changes</button>
       </div>`}
    </div>`;
  $$(".filmstrip img", d).forEach(img => img.addEventListener("click", () => {
    $("#bigSlide").src = img.src;
    $$(".filmstrip img", d).forEach(x => x.classList.remove("on")); img.classList.add("on");
  }));
  if ($("#approveBtn")) $("#approveBtn").addEventListener("click", () => decide(p, "approved"));
  if ($("#changesBtn")) $("#changesBtn").addEventListener("click", () => decide(p, "changes"));
}

async function decide(post, decision) {
  const notes = $("#noteBox")?.value?.trim() || null;
  const { error } = await sb.from("decisions").insert({
    post_id: post.id, client_id: post.client_id, decision, notes, created_by: state.user.id,
  });
  if (error) { toast("Could not save: " + error.message); return; }
  toast(decision === "approved" ? "Approved ✓" : "Sent to Nelson ✓");
  await loadData(); renderStats(); renderContent();
}

/* ---------------- print tab ---------------- */
function renderPrint() {
  const pane = $("#tab-print");
  pane.innerHTML = `
    <div class="panel">
      <h3>Order a print</h3>
      <p class="ph">Upload your art, pick what you need, and I'll send you a proof. Nothing prints until you sign off.</p>
      <form id="printForm">
        <div class="form-row">
          <div class="form-field"><label>Product</label>
            <select id="pProduct">${PRINT_PRODUCTS.map(p => `<option>${p}</option>`).join("")}</select></div>
          <div class="form-field"><label>Quantity</label><input id="pQty" type="number" min="1" value="100"></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Size</label><input id="pSize" placeholder='e.g. 3.5 x 2 in'></div>
          <div class="form-field"><label>Stock / finish</label><input id="pStock" placeholder="e.g. 16pt matte"></div>
        </div>
        <div class="form-row one">
          <div class="form-field"><label>Sides & color</label><input id="pSides" placeholder="e.g. double-sided, full color"></div>
        </div>
        <div class="form-row one">
          <div class="form-field"><label>Notes</label><textarea id="pNotes" placeholder="Anything else I should know…"></textarea></div>
        </div>
        <div class="form-field"><label>Your artwork</label>
          <div class="dropzone" id="pDrop">Tap to upload art (PDF, PNG, JPG, AI). You can add several.</div>
          <input type="file" id="pFiles" multiple accept=".pdf,.png,.jpg,.jpeg,.ai,.eps,.svg,.tif,.tiff" style="display:none">
          <div class="filelist" id="pFileList"></div>
        </div>
        <button class="btn-primary" type="submit" id="pSubmit" style="margin-top:0.6rem;color:#fff;background:var(--accent)">Submit print order</button>
      </form>
    </div>
    <div class="orderlist" id="orderList"></div>`;

  const fileInput = $("#pFiles"); const chosen = [];
  $("#pDrop").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    chosen.length = 0; chosen.push(...fileInput.files);
    $("#pFileList").innerHTML = chosen.map(f => `<span class="filechip">${esc(f.name)}</span>`).join("");
  });
  $("#printForm").addEventListener("submit", (e) => { e.preventDefault(); submitOrder(chosen); });
  renderOrders();
}

async function submitOrder(files) {
  const btn = $("#pSubmit"); btn.disabled = true; btn.textContent = "Uploading…";
  const cid = state.activeClientId;
  const artPaths = [];
  try {
    for (const f of files) {
      const path = `${cid}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await sb.storage.from("print-art").upload(path, f, { upsert: false });
      if (error) throw error;
      artPaths.push(path);
    }
    const { error } = await sb.from("print_orders").insert({
      client_id: cid, created_by: state.user.id,
      product: $("#pProduct").value, quantity: parseInt($("#pQty").value || "0", 10),
      specs: { size: $("#pSize").value, stock: $("#pStock").value, sides: $("#pSides").value },
      notes: $("#pNotes").value || null, art_paths: artPaths, status: "submitted",
    });
    if (error) throw error;
    toast("Print order submitted ✓");
    await loadData(); renderStats(); renderPrint();
  } catch (err) {
    toast("Order failed: " + (err.message || err)); btn.disabled = false; btn.textContent = "Submit print order";
  }
}

function renderOrders() {
  const list = $("#orderList"); if (!list) return;
  if (!state.orders.length) { list.innerHTML = `<p class="ph" style="margin-top:1rem">No print orders yet.</p>`; return; }
  list.innerHTML = state.orders.map(orderCard).join("");
  $$(".signoff-btn", list).forEach(b => b.addEventListener("click", () => signOff(b.dataset.id)));
  $$(".adv-btn", list).forEach(b => b.addEventListener("click", () => advance(b.dataset.id, b.dataset.to)));
}

function orderCard(o) {
  const s = o.specs || {};
  const canSign = o.status === "client_signoff" && !o.client_signed_off && !state.isAdmin;
  const adminCtl = state.isAdmin ? adminOrderControls(o) : "";
  return `<div class="order">
    <div class="o-top"><b>#${o.order_no} · ${esc(o.product)}</b><span class="pill ${pillForOrder(o.status)}">${esc(o.status.replace(/_/g, " "))}</span></div>
    <div class="o-meta">Qty ${o.quantity}${s.size ? " · " + esc(s.size) : ""}${s.stock ? " · " + esc(s.stock) : ""}${s.sides ? " · " + esc(s.sides) : ""} · ${(o.art_paths || []).length} file(s)</div>
    ${o.notes ? `<div class="o-meta">“${esc(o.notes)}”</div>` : ""}
    ${o.client_signed_off ? `<div class="o-meta">✓ Signed off by client${o.signed_off_at ? " · " + new Date(o.signed_off_at).toLocaleDateString() : ""}</div>` : ""}
    ${canSign ? `<div class="signoff-box">Please confirm the proof is correct. Nothing prints until you do.
       <div class="o-actions"><button class="btn approve signoff-btn" data-id="${o.id}">I approve — everything is correct</button></div></div>` : ""}
    ${adminCtl}
  </div>`;
}

function pillForOrder(st) {
  if (st === "submitted") return "review";
  if (["shipped"].includes(st)) return "approved";
  if (st === "cancelled") return "changes";
  return "scheduled";
}

function adminOrderControls(o) {
  const next = {
    submitted: ["in_review", "Move to review"],
    in_review: ["client_signoff", "Send proof for sign-off"],
    client_signoff: o.client_signed_off ? ["approved_to_print", "Mark ready to print"] : null,
    approved_to_print: ["sent_to_4over", "Mark sent to 4over"],
    sent_to_4over: ["printing", "Mark printing"],
    printing: ["shipped", "Mark shipped"],
  }[o.status];
  let btns = "";
  if (next) btns += `<button class="btn approve adv-btn" data-id="${o.id}" data-to="${next[0]}">${next[1]}</button>`;
  if (!["shipped", "cancelled"].includes(o.status))
    btns += `<button class="btn changes adv-btn" data-id="${o.id}" data-to="cancelled">Cancel</button>`;
  return `<div class="o-actions">${btns}</div>`;
}

async function signOff(id) {
  const { error } = await sb.from("print_orders").update({
    client_signed_off: true, signed_off_at: new Date().toISOString(), status: "approved_to_print",
  }).eq("id", id);
  if (error) { toast("Could not sign off: " + error.message); return; }
  toast("Signed off ✓ — Nelson can place the order now.");
  await loadData(); renderPrint();
}

async function advance(id, to) {
  const patch = { status: to };
  const { error } = await sb.from("print_orders").update(patch).eq("id", id);
  if (error) { toast("Update failed: " + error.message); return; }
  toast("Order updated → " + to.replace(/_/g, " "));
  await loadData(); renderStats(); renderPrint();
}

/* ---------------- uploads tab ---------------- */
function renderUploads() {
  const pane = $("#tab-uploads");
  pane.innerHTML = `
    <div class="panel">
      <h3>Send me your footage</h3>
      <p class="ph">Drop your raw photos and videos here. They go straight to me, scoped to your brand only.</p>
      <div class="dropzone" id="uDrop">Tap to choose photos or video</div>
      <input type="file" id="uFiles" multiple accept="image/*,video/*" style="display:none">
      <div class="filelist" id="uProgress"></div>
    </div>
    <div class="orderlist" id="assetList"></div>`;
  $("#uDrop").addEventListener("click", () => $("#uFiles").click());
  $("#uFiles").addEventListener("change", () => uploadAssets($("#uFiles").files));
  renderAssets();
}

async function uploadAssets(files) {
  const cid = state.activeClientId; const prog = $("#uProgress");
  for (const f of files) {
    const chip = document.createElement("span"); chip.className = "filechip"; chip.textContent = "↑ " + f.name; prog.appendChild(chip);
    const path = `${cid}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await sb.storage.from("client-uploads").upload(path, f);
    if (error) { chip.textContent = "✕ " + f.name; continue; }
    await sb.from("assets").insert({
      client_id: cid, storage_path: path, filename: f.name,
      kind: f.type.startsWith("video") ? "video" : "photo", uploaded_by: state.user.id,
    });
    chip.textContent = "✓ " + f.name;
  }
  toast("Footage sent ✓");
  await loadData(); renderAssets();
}

function renderAssets() {
  const list = $("#assetList"); if (!list) return;
  if (!state.assets.length) { list.innerHTML = `<p class="ph" style="margin-top:1rem">Nothing sent yet.</p>`; return; }
  list.innerHTML = `<div class="panel"><h3 style="font-size:1.05rem">Sent files</h3>${state.assets.map(a =>
    `<div class="o-meta">${a.kind === "video" ? "🎬" : "🖼"} ${esc(a.filename)} · ${new Date(a.created_at).toLocaleDateString()}</div>`).join("")}</div>`;
}

/* ---------------- helpers ---------------- */
function emptyState(big, sub) { return `<div class="empty"><div class="big">${esc(big)}</div><p>${esc(sub)}</p></div>`; }
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
}
