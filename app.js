// «Мен кіммін?» — ученик 11 Ә выбирает себя из списка и проходит 9 блоков тестов.
// Ответы копятся в localStorage (можно закрыть и продолжить) и уходят в базу через mk_save
// после каждого блока (ent_platform/supabase/008_men_kimmin.sql). Читать ответы сайт не умеет.
(function () {
  "use strict";
  const D = window.MK;
  const CFG = window.MK_CONFIG || {};
  const app = document.getElementById("app");
  const dock = document.getElementById("dock");
  const STORE = "mk_state_" + D.round;
  const TOTAL = D.blocks.reduce((n, b) => n + b.questions.length, 0);

  // ---------- состояние ----------
  const fresh = () => ({ id: uuid(), student: "", answers: {}, block: -1, q: 0, intro: true, finished: false, seconds: 0, saved: 0 });
  let S = load() || fresh();
  let view = S.student ? (S.finished ? "result" : "resume") : "start";
  let picked = "";
  let saveState = "";  // "" | saving | error

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
  }
  function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* приватный режим — живём без него */ } }

  // время считаем только пока вкладка видна
  let tick = Date.now();
  setInterval(() => {
    if (document.visibilityState === "visible" && S.student && !S.finished) { S.seconds += Math.round((Date.now() - tick) / 1000); persist(); }
    tick = Date.now();
  }, 5000);

  // ---------- подсчёт ----------
  function scores() {
    const a = S.answers, sc = { klimov: { P: 0, T: 0, H: 0, S: 0, A: 0 }, E: 0, N: 0, L: 0, ch: { V: 0, A: 0, K: 0 } };
    for (const b of D.blocks) for (const q of b.questions) {
      const v = a[q.id];
      if (v === undefined) continue;
      if (q.type === "pair") sc.klimov[v === "a" ? q.a.k : q.b.k]++;
      if (b.id === "temper") sc[q.s] += q.rev ? 1 - v : v;
      if (b.id === "channel") sc.ch[q.s] += v;
    }
    sc.temper = (sc.E >= 4 ? (sc.N >= 5 ? "choleric" : "sanguine") : (sc.N >= 5 ? "melancholic" : "phlegmatic"));
    const ch = Object.entries(sc.ch).sort((x, y) => y[1] - x[1]);
    sc.channel = ch[0][0];
    sc.klimovTop = Object.entries(sc.klimov).sort((x, y) => y[1] - x[1]).map((e) => e[0]);
    return sc;
  }
  const answered = () => Object.keys(S.answers).filter((k) => isDone(findQ(k), S.answers[k])).length;
  const qIndex = {};
  D.blocks.forEach((b) => b.questions.forEach((q) => (qIndex[q.id] = q)));
  const findQ = (id) => qIndex[id];
  function isDone(q, v) {
    if (!q) return false;
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    if (q.type === "text") return !q.req || (typeof v === "string" && v.trim().length >= 2);
    return v !== undefined && v !== null && v !== "";
  }

  // ---------- база ----------
  async function save(finished) {
    if (!CFG.url) return;
    saveState = "saving";
    try {
      const res = await fetch(`${CFG.url}/rest/v1/rpc/mk_save`, {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", apikey: CFG.anonKey, Authorization: `Bearer ${CFG.anonKey}` },
        body: JSON.stringify({
          p_id: S.id, p_round: D.round, p_class: D.className, p_student: S.student,
          p_answers: S.answers, p_scores: scores(), p_progress: Math.max(0, S.block + (finished ? 1 : 0)),
          p_finished: !!finished, p_seconds: S.seconds,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      saveState = "";
      S.saved = Date.now();
      persist();
      return true;
    } catch (e) {
      saveState = "error";
      return false;
    }
  }

  // ---------- отрисовка ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function setDock(html) { dock.innerHTML = html ? `<div class="in">${html}</div>` : ""; }
  function bar() {
    const p = Math.round((answered() / TOTAL) * 100);
    return `<div class="bar"><span class="brand">🧭 Мен кіммін?</span><div class="track"><div class="fill" style="width:${p}%"></div></div><span class="pct">${p}%</span></div>`;
  }
  function go(fn) { fn(); persist(); render(); scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" }); }

  function render() {
    if (view === "start") return renderStart();
    if (view === "resume") return renderResume();
    if (view === "result") return renderResult();
    const b = D.blocks[S.block];
    if (S.intro) return renderIntro(b);
    return b.mode === "one" ? renderOne(b) : renderList(b);
  }

  function renderStart() {
    app.innerHTML = `<div class="screen">
      <p class="eyebrow">${esc(D.className)} · сынып жетекшісінен</p>
      <h1>Мен кіммін?</h1>
      <p class="lead">Бұл — бақылау жұмысы емес. Мұнда дұрыс не бұрыс жауап жоқ. Мақсат — сені жақынырақ тану: қандай мамандыққа бейімсің, мінезің қандай, қалай оқыған ыңғайлы және оқуыңа не кедергі келтіреді. Сонда мен әрқайсыңа өз жолымды таба аламын.</p>
      <div class="facts">
        <div class="fact"><b>9</b><span>шағын бөлім</span></div>
        <div class="fact"><b>≈25</b><span>минут</span></div>
        <div class="fact"><b>🔒</b><span>тек мұғалім көреді</span></div>
      </div>
      <div class="note">Шынын жаз — «дұрыс сияқты» емес, өзіңе қалай болса, солай. Соңында өз нәтижеңді — кәсіптік типіңді, мінезіңді, оқу стиліңді — бірден көресің. Бетті жауып қойсаң, жауаптар сақталады — кейін жалғастырасың.</div>
      <h2>Өз атыңды таңда</h2>
      <div class="names">${D.students.map((n) => `<button class="name" data-name="${esc(n)}" aria-pressed="${picked === n}">${esc(n)}</button>`).join("")}</div>
    </div>`;
    app.querySelectorAll(".name").forEach((el) => el.onclick = () => { picked = el.dataset.name; render(); });
    setDock(`<button class="btn wide" id="go" ${picked ? "" : "disabled"}>${picked ? "Бастау →" : "Атыңды таңда"}</button>`);
    const goBtn = document.getElementById("go");
    if (goBtn) goBtn.onclick = () => go(() => { S = fresh(); S.student = picked; S.block = 0; S.intro = true; view = "test"; });
  }

  function renderResume() {
    const p = Math.round((answered() / TOTAL) * 100);
    app.innerHTML = `<div class="screen">${bar()}
      <h1>Сәлем, ${esc(S.student.split(" ")[1] || S.student)}!</h1>
      <p class="lead">Сен ${p}% орындадың. Тоқтаған жерден жалғастырайық.</p>
    </div>`;
    setDock(`<button class="btn ghost" id="other">Мен басқа оқушымын</button><button class="btn" id="cont">Жалғастыру →</button>`);
    document.getElementById("cont").onclick = () => go(() => { view = "test"; });
    document.getElementById("other").onclick = () => go(() => { S = fresh(); picked = ""; view = "start"; });
  }

  function renderIntro(b) {
    app.innerHTML = `<div class="screen">${bar()}
      <div class="intro-icon">${b.icon}</div>
      <p class="part">Бөлім ${S.block + 1} / ${D.blocks.length} · ≈${b.min} мин</p>
      <h1>${esc(b.title)}</h1>
      <p class="lead">${esc(b.intro)}</p>
    </div>`;
    setDock(`<button class="btn wide" id="go">Бастау →</button>`);
    document.getElementById("go").onclick = () => go(() => { S.intro = false; S.q = firstOpen(b); });
  }
  function firstOpen(b) {
    if (b.mode !== "one") return 0;
    const i = b.questions.findIndex((q) => S.answers[q.id] === undefined);
    return i === -1 ? b.questions.length - 1 : i;
  }

  // ---- по одному вопросу: Климов, темперамент ----
  let lock = false;
  function renderOne(b) {
    const q = b.questions[S.q];
    const v = S.answers[q.id];
    let body;
    if (q.type === "pair") {
      body = `<p class="qtext">${esc(b.ask)}</p><div class="pair">
        <button data-v="a" aria-pressed="${v === "a"}"><span class="lt">А</span><span>${esc(q.a.t)}</span></button>
        <div class="or">немесе</div>
        <button data-v="b" aria-pressed="${v === "b"}"><span class="lt">Б</span><span>${esc(q.b.t)}</span></button></div>`;
    } else {
      body = `<p class="qtext">${esc(q.t)}</p><div class="yn">${q.opts.map((o) => `<button data-v="${o.v}" aria-pressed="${v === o.v}">${esc(o.t)}</button>`).join("")}</div>`;
    }
    app.innerHTML = `<div class="screen" style="animation-duration:.22s">${bar()}
      <p class="qnum">${b.icon} ${esc(b.title)} · ${S.q + 1} / ${b.questions.length}</p>${body}</div>`;
    app.querySelectorAll("[data-v]").forEach((el) => el.onclick = () => {
      if (lock) return;
      lock = true;
      const val = q.type === "pair" ? el.dataset.v : Number(el.dataset.v);
      S.answers[q.id] = val;
      app.querySelectorAll("[data-v]").forEach((x) => x.setAttribute("aria-pressed", x === el));
      persist();
      setTimeout(() => {
        lock = false;
        if (S.q < b.questions.length - 1) { S.q++; if (S.q % 6 === 0) save(false); go(() => {}); }
        else nextBlock();
      }, 260);
    });
    setDock(`<button class="btn ghost" id="back">← Артқа</button>` + (v !== undefined ? `<button class="btn" id="fwd">Келесі →</button>` : ""));
    document.getElementById("back").onclick = () => go(() => { if (S.q > 0) S.q--; else S.intro = true; });
    const f = document.getElementById("fwd");
    if (f) f.onclick = () => (S.q < b.questions.length - 1 ? go(() => S.q++) : nextBlock());
  }

  // ---- списком ----
  function renderList(b) {
    const a = S.answers;
    const items = b.questions.map((q, i) => {
      const v = a[q.id];
      const done = isDone(q, v) && q.type !== "text";
      let inner = "";
      if (q.type === "choice") {
        const agree = q.opts.length === 4 && b.id !== "life" && b.id !== "people";
        const col = q.scenario || q.opts.some((o) => o.t.length > 22);
        inner = `<div class="${agree ? "agree" : "opts" + (col ? " col" : "")}">${q.opts.map((o) =>
          `<button class="opt" data-q="${q.id}" data-v="${esc(o.v)}" aria-pressed="${v === o.v}">${esc(o.t)}</button>`).join("")}</div>`;
      } else if (q.type === "multi") {
        const sel = Array.isArray(v) ? v : [];
        inner = `<div class="opts">${q.opts.map((o) => {
          const on = sel.includes(o.v);
          return `<button class="opt" data-m="${q.id}" data-v="${esc(o.v)}" aria-pressed="${on}" ${!on && sel.length >= q.max ? "disabled" : ""}>${esc(o.t)}</button>`;
        }).join("")}</div><div class="cnt">Таңдалды: ${sel.length} / ${q.max}</div>`;
      } else if (q.type === "slider") {
        const set = typeof v === "number";
        inner = `<div class="slider ${set ? "set" : ""}"><input type="range" min="1" max="10" step="1" value="${set ? v : 5}" data-s="${q.id}" aria-label="${esc(q.t)}"><span class="val">${set ? v : "?"}</span></div>
          <div class="ends"><span>1 — ең төмен</span><span>10 — ең жоғары</span></div>`;
      } else if (q.type === "text") {
        inner = `<textarea data-t="${q.id}" maxlength="1200" placeholder="${q.req ? "Міндетті — қысқа болса да жаз" : "Қаласаң, жаз"}">${esc(v || "")}</textarea>`;
      }
      const label = q.scenario ? `<p class="t scen">${esc(q.t)}</p>` : `<p class="t">${b.stem ? "…" : ""}${esc(q.t)}${q.req ? ' <span class="req">*</span>' : ""}</p>`;
      return `<div class="q ${done ? "done" : ""}" id="q_${q.id}">${label}${inner}</div>`;
    }).join("");
    app.innerHTML = `<div class="screen">${bar()}
      <p class="qnum">${b.icon} Бөлім ${S.block + 1} / ${D.blocks.length}</p>
      <h2>${esc(b.title)}</h2><p class="lead">${esc(b.intro)}</p>
      ${b.stem ? `<p class="stem">${esc(b.stem)}</p>` : ""}
      <div class="qs">${items}</div></div>`;

    app.querySelectorAll("[data-q]").forEach((el) => el.onclick = () => {
      const q = findQ(el.dataset.q);
      const raw = el.dataset.v;
      S.answers[q.id] = typeof q.opts[0].v === "number" ? Number(raw) : raw;
      persist();
      el.parentElement.querySelectorAll(".opt").forEach((x) => x.setAttribute("aria-pressed", x === el));
      const box = el.closest(".q"); box.classList.remove("miss"); box.classList.add("done");
      updBar();
    });
    app.querySelectorAll("[data-m]").forEach((el) => el.onclick = () => {
      const q = findQ(el.dataset.m);
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
    app.querySelectorAll("[data-s]").forEach((el) => {
      const upd = () => {
        S.answers[el.dataset.s] = Number(el.value);
        const box = el.closest(".q");
        box.querySelector(".slider").classList.add("set");
        box.querySelector(".val").textContent = el.value;
        box.classList.remove("miss"); box.classList.add("done");
        persist(); updBar();
      };
      el.oninput = upd; el.onchange = upd;
    });
    app.querySelectorAll("[data-t]").forEach((el) => el.oninput = () => {
      S.answers[el.dataset.t] = el.value; persist();
      if (el.value.trim().length >= 2) el.closest(".q").classList.remove("miss");
    });

    const last = S.block === D.blocks.length - 1;
    setDock(`<button class="btn ghost" id="back">←</button><button class="btn" id="fwd">${last ? "Аяқтау ✓" : "Келесі бөлім →"}</button>`);
    document.getElementById("back").onclick = () => go(() => { S.intro = true; });
    document.getElementById("fwd").onclick = () => {
      const miss = b.questions.filter((q) => !isDone(q, S.answers[q.id]));
      if (miss.length) {
        miss.forEach((q) => document.getElementById("q_" + q.id).classList.add("miss"));
        document.getElementById("q_" + miss[0].id).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      nextBlock();
    };
  }
  function updBar() {
    const p = Math.round((answered() / TOTAL) * 100);
    const f = app.querySelector(".fill"), t = app.querySelector(".pct");
    if (f) f.style.width = p + "%";
    if (t) t.textContent = p + "%";
  }

  function nextBlock() {
    if (S.block < D.blocks.length - 1) {
      save(false);
      go(() => { S.block++; S.intro = true; S.q = 0; });
    } else {
      finish();
    }
  }

  async function finish() {
    app.innerHTML = `<div class="screen">${bar()}<h2>Сақталуда…</h2><p class="lead">Бір секунд.</p></div>`;
    setDock("");
    const ok = await save(true);
    if (ok) { S.finished = true; persist(); view = "result"; render(); scrollTo(0, 0); }
    else {
      app.innerHTML = `<div class="screen">${bar()}<h2>Жіберілмеді 😕</h2>
        <p class="lead">Интернетті тексеріп, қайта басып көр. Жауаптарың осы құрылғыда сақтаулы — ештеңе жоғалмайды.</p></div>`;
      setDock(`<button class="btn wide" id="retry">Қайта жіберу</button>`);
      document.getElementById("retry").onclick = finish;
    }
  }

  function renderResult() {
    const sc = scores();
    const top = sc.klimovTop[0], second = sc.klimovTop[1];
    const K = D.klimov[top], K2 = D.klimov[second];
    const max = 8;
    const bars = sc.klimovTop.map((k) => `<div class="brow"><span class="ic">${D.klimov[k].icon}</span><span class="nm">${esc(D.klimov[k].name)}</span>
      <span class="tr"><i style="width:${(sc.klimov[k] / max) * 100}%"></i></span><span class="n">${sc.klimov[k]}</span></div>`).join("");
    const T = D.temper[sc.temper], C = D.channel[sc.channel];
    const tie = sc.klimov[top] === sc.klimov[second];
    app.innerHTML = `<div class="screen">
      <p class="eyebrow" style="margin-top:14px">Рақмет, ${esc(S.student.split(" ")[1] || S.student)}! Жауаптарың мұғалімге жіберілді ✓</p>
      <div class="res-top"><div class="big">${K.icon}</div>
        <h2>${esc(K.name)}${tie ? ` + ${esc(K2.name)}` : ""}</h2>
        <p>${esc(K.short)}</p></div>
      <div class="card"><h3 style="margin:0 0 12px">Климов бойынша кәсіп типтері</h3><div class="bars">${bars}</div>
        <p class="prof"><b>Саған жақын мамандықтар:</b> ${esc(K.prof)}${!tie && sc.klimov[second] >= 6 ? `; сондай-ақ ${esc(K2.prof.split(", ").slice(0, 4).join(", "))}` : ""}.</p></div>
      <div class="res-grid">
        <div class="card mini"><div class="ic">${T.icon}</div><h3>${esc(T.name)}</h3><p>${esc(T.short)}</p></div>
        <div class="card mini"><div class="ic">${C.icon}</div><h3>${esc(C.name)}</h3><p>${esc(C.short)}</p></div>
      </div>
      <p class="saved">Бұл — бағыт қана, үкім емес. Толық талдауды сынып жетекшісімен бірге талқылаймыз.</p>
    </div>`;
    setDock(`<button class="btn ghost wide" id="next">Келесі оқушы (осы құрылғыда)</button>`);
    document.getElementById("next").onclick = () => go(() => { S = fresh(); picked = ""; view = "start"; });
  }

  addEventListener("pagehide", () => { if (S.student && !S.finished && S.block >= 0) save(false); });
  render();
})();
