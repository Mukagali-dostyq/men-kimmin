// «Мен кіммін?» v2 — три встречи от лёгкого к глубокому, после каждой ученик сразу
// получает приятный результат о себе. Ответы копятся в localStorage и уходят в базу
// (mk_save, ent_platform/supabase/008_men_kimmin.sql) после каждого блока. Читать базу сайт не умеет.
import { score } from "./scoring.js";

const D = window.MK;
const CFG = window.MK_CONFIG || {};
const app = document.getElementById("app");
const dock = document.getElementById("dock");
const STORE = "mk2_state_" + D.round;
const ALLQ = D.parts.flatMap((p) => p.blocks.flatMap((b) => b.questions));
const QI = Object.fromEntries(ALLQ.map((q) => [q.id, q]));

const fresh = () => ({ id: uuid(), student: "", answers: { _t: {} }, part: -1, block: 0, q: 0, intro: true, done: {}, view: "start", seconds: 0 });
let S = load() || fresh();
if (S.student && S.view === "start") S.view = "menu";
if (D.renamed?.[S.student]) { S.student = D.renamed[S.student]; persist(); }
let picked = "";
// ?p=3 — продолжить с 3-й встречи на другом телефоне: прошлые встречи уже в базе (в другой анкете),
// эта уходит отдельной строкой с answers._skip, потом их сливает _src/merge_skip.py
const SKIP_TO = Math.min(Math.max(+new URLSearchParams(location.search).get("p") || 1, 1), D.parts.length);
const skipped = (pid) => (S.answers._skip || []).includes(pid);
let shownAt = performance.now();

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}
function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
function persist() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* приватный режим */ } }

let tick = Date.now();
setInterval(() => {
  if (document.visibilityState === "visible" && S.view === "test") { S.seconds += Math.round((Date.now() - tick) / 1000); persist(); }
  tick = Date.now();
}, 5000);

// ---------- проверки ----------
function isDone(q, v) {
  if (!q) return false;
  if (q.type === "pick") return Array.isArray(v) && v.length >= (q.min || 1);
  if (q.type === "text") return true;
  return v !== undefined && v !== null && v !== "";
}
const allDone = () => D.parts.every((p) => S.done[p.id]);
// после обновления страницы сдавший все 3 встречи сразу видит все результаты
if (S.student && allDone() && S.view !== "test") S.view = "all";
const answeredCount = () => ALLQ.filter((q) => q.type !== "text" && isDone(q, S.answers[q.id])).length;
const TOTALQ = ALLQ.filter((q) => q.type !== "text").length;
const blocksDone = () => D.parts.reduce((n, p, pi) => n + (S.done[p.id] ? p.blocks.length : pi === S.part ? S.block : 0), 0);

// ---------- база ----------
let saveErr = false;
async function save() {
  if (!CFG.url || !S.student) return true;
  try {
    const res = await fetch(`${CFG.url}/rest/v1/rpc/mk_save`, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: CFG.anonKey, Authorization: `Bearer ${CFG.anonKey}` },
      body: JSON.stringify({
        p_id: S.id, p_round: D.round, p_class: D.className, p_student: S.student,
        p_answers: S.answers, p_scores: { done: S.done }, p_progress: blocksDone(),
        p_finished: allDone(), p_seconds: S.seconds,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    saveErr = false;
    return true;
  } catch {
    saveErr = true;
    return false;
  }
}

// ---------- общее ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firstName = () => S.student.split(" ")[1] || S.student;
function setDock(html) { dock.innerHTML = html ? `<div class="in">${html}</div>` : ""; }
function bar() {
  const p = Math.round((answeredCount() / TOTALQ) * 100);
  return `<div class="bar"><span class="brand">🧭 Мен кіммін?</span><div class="track"><div class="fill" style="width:${p}%"></div></div><span class="pct">${p}%</span></div>`;
}
function go(fn) { fn(); persist(); render(); scrollTo(0, 0); }
const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

function render() {
  shownAt = performance.now();
  if (S.view === "start") return renderStart();
  if (S.view === "menu") return renderMenu();
  if (S.view === "result") return renderResult(S.resultPart);
  if (S.view === "all") return renderAll();
  const b = D.parts[S.part].blocks[S.block];
  if (S.intro) return renderIntro(b);
  return b.mode === "one" ? renderOne(b) : renderList(b);
}

// ---------- старт и меню ----------
function renderStart() {
  app.innerHTML = `<div class="screen">
    <p class="eyebrow">${esc(D.className)} · сынып жетекшісінен</p>
    <h1>Мен кіммін?</h1>
    <p class="lead">Бұл — бақылау жұмысы емес, мұнда дұрыс не бұрыс жауап жоқ. Бұл — сені жақынырақ танудың ойыны: сен туралы көп нәрсені өзің де байқамайтын шығарсың. Әр кездесудің соңында өзің туралы қызық нәтиже аласың.</p>
    <div class="facts">
      <div class="fact"><b>3</b><span>қысқа кездесу</span></div>
      <div class="fact"><b>≈10</b><span>минут әрқайсысы</span></div>
      <div class="fact"><b>🔒</b><span>тек мұғалім көреді</span></div>
    </div>
    <div class="note">Ойланба — бірінші сезгенің ең дұрыс жауап. Бетті жауып қойсаң, жауаптар сақталады. Кездесулерді әртүрлі күні өтсең де болады.</div>
    <h2>Өз атыңды таңда</h2>
    <div class="names">${D.students.map((n) => `<button class="name" data-name="${esc(n)}" aria-pressed="${picked === n}">${esc(n)}</button>`).join("")}</div>
  </div>`;
  app.querySelectorAll(".name").forEach((el) => el.onclick = () => { picked = el.dataset.name; render(); });
  setDock(`<button class="btn wide" id="go" ${picked ? "" : "disabled"}>${picked ? "Бастау →" : "Атыңды таңда"}</button>`);
  on("go", () => go(() => {
    S = fresh(); S.student = picked; S.view = "menu";
    if (SKIP_TO > 1) { S.answers._skip = D.parts.slice(0, SKIP_TO - 1).map((p) => p.id); for (const id of S.answers._skip) S.done[id] = true; }
  }));
}

function renderMenu() {
  const next = D.parts.findIndex((p) => !S.done[p.id]);
  app.innerHTML = `<div class="screen">${bar()}
    <h1>Сәлем, ${esc(firstName())}! 👋</h1>
    <p class="lead">${next === -1 ? "Үш кездесу де өтті — рақмет! Нәтижелеріңді қайта қарай аласың." : next === 0 ? "Бірінші кездесуден бастайық." : "Жалғастырайық. Үзіліс жасап алсаң да болады."}</p>
    <div class="parts">${D.parts.map((p, i) => {
      const done = S.done[p.id], open = i <= (next === -1 ? 99 : next), cur = i === S.part && !done && (S.block > 0 || !S.intro);
      const skip = skipped(p.id);
      return `<button class="partc ${done ? "done" : ""}" data-p="${i}" ${open && !skip ? "" : "disabled"}>
        <span class="pi">${done ? "✅" : open ? p.icon : "🔒"}</span>
        <span class="pt"><b>${esc(p.title)}</b><small>${esc(p.teaser)} · ≈${p.min} мин</small></span>
        <span class="pa">${skip ? "Өтті" : done ? "Нәтиже" : cur ? "Жалғастыру" : open ? "Бастау" : ""}</span></button>`;
    }).join("")}</div>
    ${saveErr ? `<p class="err">Соңғы жауаптар әлі жіберілмеді — интернетті тексер. Олар осы құрылғыда сақтаулы.</p>` : ""}
    <p class="saved"><button class="link" id="other">Мен ${esc(firstName())} емеспін — басқа оқушы</button></p>
  </div>`;
  app.querySelectorAll(".partc").forEach((el) => el.onclick = () => {
    const i = +el.dataset.p, p = D.parts[i];
    if (S.done[p.id]) go(() => { S.view = "result"; S.resultPart = i; });
    else go(() => { if (S.part !== i) { S.part = i; S.block = 0; S.q = 0; S.intro = true; } S.view = "test"; });
  });
  on("other", () => go(() => { S = fresh(); picked = ""; }));
  setDock(next === -1 ? `<button class="btn wide" id="all">Барлық нәтижелерім →</button>` : `<button class="btn wide" id="cont">${esc(D.parts[next].title)} →</button>`);
  on("all", () => go(() => { S.view = "all"; }));
  on("cont", () => go(() => { if (S.part !== next) { S.part = next; S.block = 0; S.q = 0; S.intro = true; } S.view = "test"; }));
  if (saveErr) save().then((ok) => ok && render());
}

function renderIntro(b) {
  const p = D.parts[S.part];
  app.innerHTML = `<div class="screen">${bar()}
    <div class="intro-icon">${b.icon}</div>
    <p class="part">${esc(p.title)} · ${S.block + 1} / ${p.blocks.length}</p>
    <h1>${esc(b.title)}</h1>
    <p class="lead">${esc(b.intro)}</p>
  </div>`;
  setDock(`<button class="btn ghost" id="menu">☰</button><button class="btn" id="go">Бастау →</button>`);
  on("menu", () => go(() => { S.view = "menu"; }));
  on("go", () => go(() => { S.intro = false; S.q = firstOpen(b); }));
}
function firstOpen(b) {
  if (b.mode !== "one") return 0;
  const i = b.questions.findIndex((q) => S.answers[q.id] === undefined);
  return i === -1 ? b.questions.length - 1 : i;
}

// ---------- по одному вопросу ----------
let lock = false;
function scaleRow(q, v) {
  const cells = Array.from({ length: 11 }, (_, i) =>
    `<button class="sc" data-v="${i}" aria-pressed="${v === i}" aria-label="${i}">${q.fmt === "pct" ? i * 10 : i}</button>`).join("");
  return `<div class="scale">${cells}</div>
    <div class="scale-ends"><span>${esc(q.lo || "0")}</span><span>5 — орташа</span><span>${esc(q.hi || "10")}</span></div>`;
}
function renderOne(b) {
  const p = D.parts[S.part];
  const q = b.questions[S.q];
  const v = S.answers[q.id];
  let body;
  if (q.type === "bipolar") {
    const sizes = [46, 36, 26, 36, 46];
    body = `<p class="qtext small">${esc(b.ask || "")}</p>
      <div class="bip">
        <div class="side a"><span class="lt">А</span>${esc(q.a.t)}</div>
        <div class="dots">${sizes.map((s, i) => `<button class="dot d${i}" data-v="${i}" aria-pressed="${v === i}" style="--s:${s}px" aria-label="${["Әрине А", "Көбірек А", "Бірдей", "Көбірек Б", "Әрине Б"][i]}"></button>`).join("")}</div>
        <div class="dot-labels"><span>← А</span><span>бірдей</span><span>Б →</span></div>
        <div class="side b"><span class="lt">Б</span>${esc(q.b.t)}</div>
      </div>`;
  } else if (q.type === "scale10") {
    body = `<p class="qtext ${q.portrait ? "portrait" : ""}">${q.portrait ? "👤 " : ""}${esc(q.t)}</p>${q.portrait ? `<p class="hint">Бұл адам саған қаншалықты ұқсайды?</p>` : ""}${scaleRow(q, v)}`;
  } else {
    body = `<p class="qtext">${esc(q.t)}</p><div class="${q.grid ? "grid-opts" : "yn"}">${q.opts.map((o) =>
      `<button class="gopt" data-v="${esc(o.v)}" aria-pressed="${v === o.v}">${esc(o.t)}</button>`).join("")}</div>`;
  }
  app.innerHTML = `<div class="screen quick">${bar()}
    <p class="qnum">${b.icon} ${esc(b.title)} · ${S.q + 1} / ${b.questions.length}</p>${body}</div>`;
  app.querySelectorAll("[data-v]").forEach((el) => el.onclick = () => {
    if (lock) return;
    lock = true;
    const raw = el.dataset.v;
    const val = q.type === "choice" ? (typeof q.opts[0].v === "number" ? Number(raw) : raw) : Number(raw);
    S.answers[q.id] = val;
    S.answers._t[q.id] = Math.round(performance.now() - shownAt);
    app.querySelectorAll("[data-v]").forEach((x) => x.setAttribute("aria-pressed", x === el));
    persist();
    setTimeout(() => {
      lock = false;
      if (S.q < b.questions.length - 1) { S.q++; if (S.q % 7 === 0) save(); go(() => {}); } else nextBlock();
    }, 230);
  });
  setDock(`<button class="btn ghost" id="back">← Артқа</button>` + (v !== undefined ? `<button class="btn" id="fwd">Келесі →</button>` : ""));
  on("back", () => go(() => { if (S.q > 0) S.q--; else S.intro = true; }));
  on("fwd", () => (S.q < b.questions.length - 1 ? go(() => S.q++) : nextBlock()));
}

// ---------- списком ----------
function renderList(b) {
  const p = D.parts[S.part];
  const a = S.answers;
  const filledText = () => b.questions.filter((q) => q.id.startsWith("f_") && (a[q.id] || "").trim().length >= 2).length;
  const items = b.questions.map((q) => {
    const v = a[q.id];
    let inner = "";
    if (q.type === "choice") {
      const agree = q.opts.length === 4 && q.opts[0].v === 1 && !q.scenario;
      const col = q.scenario || q.opts.some((o) => o.t.length > 24);
      inner = `<div class="${agree ? "agree" : "opts" + (col ? " col" : "")}">${q.opts.map((o) =>
        `<button class="opt ${o.v === -1 ? "skip" : ""}" data-q="${q.id}" data-v="${esc(o.v)}" aria-pressed="${v === o.v}">${esc(o.t)}</button>`).join("")}</div>`;
    } else if (q.type === "pick") {
      const sel = Array.isArray(v) ? v : [];
      inner = `<div class="${q.cards ? "cards" : "opts"}">${q.opts.map((o) => {
        const onn = sel.includes(o.v);
        const [title, sub] = o.t.split(" — ");
        return `<button class="opt ${q.cards ? "card-opt" : ""}" data-m="${q.id}" data-v="${esc(o.v)}" aria-pressed="${onn}" ${!onn && sel.length >= q.max ? "disabled" : ""}>${
          q.cards ? `<span class="ci">${o.i || ""}</span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}` : esc(o.t)}</button>`;
      }).join("")}</div><div class="cnt">Таңдалды: ${sel.length} / ${q.max}${q.min === q.max ? "" : ""}</div>`;
    } else if (q.type === "text") {
      inner = q.short
        ? `<input class="sent" data-t="${q.id}" maxlength="300" value="${esc(v || "")}" placeholder="…" autocomplete="off">`
        : `<textarea data-t="${q.id}" maxlength="1200" placeholder="Қаласаң, жаз">${esc(v || "")}</textarea>`;
    }
    const done = q.type !== "text" && isDone(q, v);
    const label = q.scenario ? `<p class="t scen">${esc(q.t)}</p>` : `<p class="t">${esc(q.t)}</p>`;
    return `<div class="q ${done ? "done" : ""} ${q.short ? "q-sent" : ""}" id="q_${q.id}">${label}${inner}</div>`;
  }).join("");
  app.innerHTML = `<div class="screen">${bar()}
    <p class="qnum">${b.icon} ${esc(p.title)} · ${S.block + 1} / ${p.blocks.length}</p>
    <h2>${esc(b.title)}</h2><p class="lead">${esc(b.intro)}</p>
    <div class="qs">${items}</div>
    ${b.minText ? `<p class="cnt" id="tcount">Аяқталды: ${filledText()} / ${b.minText}</p>` : ""}</div>`;

  app.querySelectorAll("[data-q]").forEach((el) => el.onclick = () => {
    const q = QI[el.dataset.q];
    S.answers[q.id] = typeof q.opts[0].v === "number" ? Number(el.dataset.v) : el.dataset.v;
    persist();
    el.parentElement.querySelectorAll(".opt").forEach((x) => x.setAttribute("aria-pressed", x === el));
    const box = el.closest(".q"); box.classList.remove("miss"); box.classList.add("done");
    updBar();
  });
  app.querySelectorAll("[data-m]").forEach((el) => el.onclick = () => {
    const q = QI[el.dataset.m];
    let sel = Array.isArray(S.answers[q.id]) ? S.answers[q.id].slice() : [];
    const v = el.dataset.v;
    if (sel.includes(v)) sel = sel.filter((x) => x !== v);
    else {
      if (v === "none") sel = []; else sel = sel.filter((x) => x !== "none");
      if (sel.length < q.max) sel.push(v);
    }
    S.answers[q.id] = sel;
    persist();
    const y = scrollY; render(); scrollTo(0, y);
  });
  app.querySelectorAll("[data-t]").forEach((el) => el.oninput = () => {
    S.answers[el.dataset.t] = el.value; persist();
    const c = document.getElementById("tcount");
    if (c) c.textContent = `Аяқталды: ${filledText()} / ${b.minText}`;
  });

  setDock(`<button class="btn ghost" id="back">←</button><button class="btn" id="fwd">${S.block === p.blocks.length - 1 ? "Аяқтау ✓" : "Келесі →"}</button>`);
  on("back", () => go(() => { S.intro = true; }));
  on("fwd", () => {
    const miss = b.questions.filter((q) => !isDone(q, S.answers[q.id]));
    if (miss.length) {
      miss.forEach((q) => document.getElementById("q_" + q.id).classList.add("miss"));
      document.getElementById("q_" + miss[0].id).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (b.minText && filledText() < b.minText) {
      const empty = b.questions.find((q) => q.id.startsWith("f_") && !(S.answers[q.id] || "").trim());
      if (empty) { const el = document.getElementById("q_" + empty.id); el.classList.add("miss"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      const c = document.getElementById("tcount"); if (c) c.classList.add("err");
      return;
    }
    nextBlock();
  });
}
function updBar() {
  const p = Math.round((answeredCount() / TOTALQ) * 100);
  const f = app.querySelector(".fill"), t = app.querySelector(".pct");
  if (f) f.style.width = p + "%";
  if (t) t.textContent = p + "%";
}

async function nextBlock() {
  const p = D.parts[S.part];
  if (S.block < p.blocks.length - 1) {
    save();
    return go(() => { S.block++; S.intro = true; S.q = 0; });
  }
  S.done[p.id] = true;
  const pi = S.part;
  S.part = -1; S.block = 0; S.q = 0; S.intro = true;
  persist();
  app.innerHTML = `<div class="screen">${bar()}<h2>Сақталуда…</h2></div>`;
  setDock("");
  await save();
  go(() => { S.view = "result"; S.resultPart = pi; });
}

// ---------- результаты («молочко») ----------
function bars(rows) {
  return `<div class="bars">${rows.map((r) => `<div class="brow"><span class="ic">${r.icon || ""}</span><span class="nm">${esc(r.name)}</span>
    <span class="tr"><i style="width:${Math.max(3, Math.min(100, r.pct))}%"></i></span><span class="n">${esc(r.shown ?? "")}</span></div>`).join("")}</div>`;
}
function resultHtml(pi, sc) {
  const part = D.parts[pi];
  let html = "";
  if (part.id === "p1") {
    const [t1, t2] = sc.klimovTop;
    const K = D.klimov[t1], K2 = D.klimov[t2];
    const tie = sc.klimov[t1] - sc.klimov[t2] < 0.5;
    const st = (S.answers.strengths || []).map((v) => D.parts[0].blocks[2].questions[0].opts.find((o) => o.v === v)).filter(Boolean);
    html = `<div class="res-top"><div class="big">${K.icon}</div><h2>${esc(K.name)}${tie ? ` + ${esc(K2.name)}` : ""}</h2><p>${esc(K.short)}</p></div>
      <div class="card"><h3>Кәсіп әлеміндегі бағытың</h3>${bars(sc.klimovTop.map((k) => ({ icon: D.klimov[k].icon, name: D.klimov[k].name, pct: (sc.klimov[k] / 8) * 100, shown: sc.klimov[k].toFixed(1) })))}
        <p class="prof"><b>Саған жақын мамандықтар:</b> ${esc(K.prof)}${tie ? `; ${esc(K2.prof.split(", ").slice(0, 4).join(", "))}` : ""}.</p></div>
      <div class="card"><h3>Сенің 5 суперкүшің</h3><div class="powers">${st.map((o) => {
        const [title, sub] = o.t.split(" — ");
        return `<div class="pw"><span>${o.i}</span><b>${esc(title)}</b><small>${esc(sub || "")}</small></div>`;
      }).join("")}</div></div>`;
  } else if (part.id === "p2") {
    const T = sc.temper && D.temper[sc.temper];
    const order = ["E", "O", "C", "A", "N"];
    html = `<div class="res-top"><div class="big">${T ? T.icon : "🎭"}</div><h2>Сенің мінезің</h2><p>${T ? esc(T.short) : ""}</p></div>
      <div class="card"><h3>5 қасиет</h3>${order.map((k) => {
        const B = D.big5[k], v = sc.big5[k] ?? 50;
        return `<div class="trait"><div class="tn"><b>${esc(B.name)}</b><span>${v}</span></div><span class="tr"><i style="width:${Math.max(3, v)}%"></i></span><p>${esc(v >= 50 ? B.hi : B.lo)}</p></div>`;
      }).join("")}</div>
      <div class="card"><h3>Сен үшін ең маңыздысы</h3><ol class="vals">${sc.valuesTop.map((k) => `<li>${esc(D.values[k])}</li>`).join("")}</ol>
      <p class="prof">Адамдардың бәрі әртүрлі — және бұл тамаша. Ешбір қасиет «жаман» емес: әрқайсысының өз күші бар.</p></div>`;
  } else {
    const K = D.klimov[sc.klimovTop[0]];
    const st = (S.answers.strengths || []).map((v) => D.parts[0].blocks[2].questions[0].opts.find((o) => o.v === v)).filter(Boolean).slice(0, 3);
    const vals = sc.valuesTop.slice(0, 2).map((k) => D.values[k]);
    html = `<div class="res-top"><div class="big">🫶</div><h2>Саған хат</h2><p>Үш кездесуден кейін</p></div>
      <div class="card letter">
        <p>${esc(firstName())}, рақмет саған — шынын жазғаның үшін. Бұл оңай емес.</p>
        ${skipped("p1") ? "" : `<p>Мен сенен мынаны көрдім: сенің бағытың — <b>${esc(K.name)}</b>${st.length ? `, ал күшің — <b>${st.map((o) => esc(o.t.split(" — ")[0].toLowerCase())).join(", ")}</b>` : ""}.${vals.length ? ` Сен үшін <b>${vals.map((v) => esc(v.toLowerCase())).join("</b> және <b>")}</b> маңызды — бұл сенің ішкі компасың.` : ""}</p>`}
        <p>Әр адамның қиын күндері болады. Егер бірдеңе мазаласа — үлкен не кішкентай болсын — кез келген уақытта келіп сөйлесе аласың. Мен тыңдауға дайынмын.</p>
        <p class="sign">— Сынып жетекшің</p>
      </div>`;
  }
  return html;
}
function renderResult(pi) {
  const part = D.parts[pi];
  const html = resultHtml(pi, score(D, S.answers));
  const next = D.parts.findIndex((p) => !S.done[p.id]);
  app.innerHTML = `<div class="screen"><p class="eyebrow" style="margin-top:14px">${esc(part.title)} ✓ · жауаптар жіберілді</p>${html}
    ${next !== -1 ? `<p class="saved">Келесі кездесу дайын. Қазір жалғастыра аласың немесе кейін — ертең де болады.</p>` : `<p class="saved">Бұл — бағыт қана, үкім емес.</p>`}</div>`;
  setDock(next !== -1
    ? `<button class="btn ghost" id="menu">☰</button><button class="btn" id="nx">${esc(D.parts[next].title)} →</button>`
    : `<button class="btn ghost" id="menu">☰ Мәзір</button><button class="btn ghost" id="other">Келесі оқушы</button>`);
  on("menu", () => go(() => { S.view = "menu"; }));
  on("nx", () => go(() => { S.part = next; S.block = 0; S.q = 0; S.intro = true; S.view = "test"; }));
  on("other", () => go(() => { S = fresh(); picked = ""; }));
}

function renderAll() {
  const sc = score(D, S.answers);
  app.innerHTML = `<div class="screen">
    <p class="eyebrow" style="margin-top:14px">Үш кездесу де өтті ✓</p>
    <h1>${esc(firstName())}, сенің нәтижелерің</h1>
    ${D.parts.map((p, i) => skipped(p.id) ? "" : `<h2 class="sec">${p.icon} ${esc(p.title)}</h2>${resultHtml(i, sc)}`).join("")}
    <p class="saved">Бұл — бағыт қана, үкім емес.</p></div>`;
  setDock(`<button class="btn ghost" id="menu">☰ Мәзір</button><button class="btn ghost" id="other">Келесі оқушы</button>`);
  on("menu", () => go(() => { S.view = "menu"; }));
  on("other", () => go(() => { S = fresh(); picked = ""; }));
}

addEventListener("pagehide", () => { if (S.student && S.view === "test") save(); });
// при каждом открытии досылаем анкету: если последнее сохранение не дошло (сеть), сервер получит его сейчас;
// сданную анкету mk_save всё равно не перезапишет
if (S.student && answeredCount() > 0) save();
render();
