// «Мен кіммін?» v2 — три встречи от лёгкого к глубокому, после каждой ученик сразу
// получает приятный результат о себе. Тест для всей школы: вход — по ЖСН (ИИН), сервер узнаёт ученика
// (имя, класс, язык) и выдаёт пропуск-токен, так что за другого не сдать (ent_platform/supabase/009_men_kimmin_iin.sql).
// Ответы копятся в localStorage и уходят в базу (mk_save_iin) после каждого блока; анкету можно продолжить
// с любого телефона. Сам ИИН на телефоне не хранится — только токен.
// Тексты на двух языках: вопросы и результаты — data.js (MK_ALL.kk / MK_ALL.ru), надписи интерфейса — UI ниже.
import { score } from "./scoring.js?v=e83f4a55";

const ALL = window.MK_ALL;
const CFG = window.MK_CONFIG || {};
const app = document.getElementById("app");
const dock = document.getElementById("dock");
const STORE = "mk2_state_" + ALL.kk.round;
const LANG_KEY = "mk_lang";
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) === "ru" ? "ru" : "kk"; } catch { return "kk"; } })();
let D = ALL[LANG];
// id вопросов и значения ответов на обоих языках одинаковые
const ALLQ = D.parts.flatMap((p) => p.blocks.flatMap((b) => b.questions));
const QI = Object.fromEntries(ALLQ.map((q) => [q.id, q]));

const UI = {
  kk: {
    brand: "Мен кіммін?", from: "сынып жетекшісінен", other: "Русский",
    lead: "Бұл — бақылау жұмысы емес, мұнда дұрыс не бұрыс жауап жоқ. Бұл — сені жақынырақ танудың ойыны: сен туралы көп нәрсені өзің де байқамайтын шығарсың. Әр кездесудің соңында өзің туралы қызық нәтиже аласың.",
    facts: ["қысқа кездесу", "минут әрқайсысы", "тек мұғалім көреді"],
    note: "Ойланба — бірінші сезгенің ең дұрыс жауап. Бетті жауып қойсаң, жауаптар сақталады — кейін кез келген телефоннан ЖСН-іңмен кіріп жалғастыра аласың.",
    iinTitle: "ЖСН-іңді жаз", iinLabel: "ЖСН, 12 сан",
    iinHint: "Жеке куәлігіңдегі 12 сан. Сенің атыңнан тек сен ғана кіре аласың. ЖСН телефонда сақталмайды, мұғалім де оны көрмейді.",
    demo: "Демо — мұғалімге (жауаптар сақталмайды)", enter: "Кіру →", teacherEnter: "Мұғалім ретінде кіру →", checking: "Тексерілуде…",
    errTypo: "ЖСН қате терілген — сандарды тексеріп қайта жаз.",
    errNotFound: "Бұл ЖСН мектеп тізімінде жоқ. Сандарды тексер немесе сынып жетекшісіне айт.",
    errMany: "Қате әрекет тым көп. 15 минуттан кейін қайталап көр.",
    errNet: "Байланыс жоқ сияқты — интернетті тексеріп, қайталап көр.",
    relogin: "Қайтадан кір — ЖСН-іңді жаз.", loading: "Жүктелуде…", saving: "Сақталуда…",
    hello: (n) => `Сәлем, ${n}! 👋`,
    menuLead: ["Бірінші кездесуден бастайық.", "Жалғастырайық. Үзіліс жасап алсаң да болады.", "Үш кездесу де өтті — рақмет! Нәтижелеріңді қайта қарай аласың."],
    partState: { skip: "Өтті", done: "Нәтиже", cur: "Жалғастыру", open: "Бастау" },
    saveErr: "Соңғы жауаптар әлі жіберілмеді — интернетті тексер. Олар осы құрылғыда сақтаулы.",
    notMe: (n) => `Мен ${n} емеспін — шығу`, allResults: "Барлық нәтижелерім →", start: "Бастау →",
    back: "← Артқа", next: "Келесі →", finish: "Аяқтау ✓", menu: "☰ Мәзір", logout: "Шығу",
    portrait: "Бұл адам саған қаншалықты ұқсайды?", mid: "5 — орташа",
    bip: ["Әрине А", "Көбірек А", "Бірдей", "Көбірек Б", "Әрине Б"], same: "бірдей",
    picked: (n, m) => `Таңдалды: ${n} / ${m}`, textPh: "Қаласаң, жаз", textDone: (n, m) => `Аяқталды: ${n} / ${m}`,
    sent: "жауаптар жіберілді", nextReady: "Келесі кездесу дайын. Қазір жалғастыра аласың немесе кейін — ертең де болады.",
    notVerdict: "Бұл — бағыт қана, үкім емес.", allDone: "Үш кездесу де өтті ✓", yourResults: (n) => `${n}, сенің нәтижелерің`,
    klimovTitle: "Кәсіп әлеміндегі бағытың", profs: "Саған жақын мамандықтар:", powers: "Сенің 5 суперкүшің",
    character: "Сенің мінезің", traits: "5 қасиет", valuesTitle: "Сен үшін ең маңыздысы",
    allDiff: "Адамдардың бәрі әртүрлі — және бұл тамаша. Ешбір қасиет «жаман» емес: әрқайсысының өз күші бар.",
    letter: "Саған хат", letterSub: "Үш кездесуден кейін",
    thanks: (n) => `${n}, рақмет саған — шынын жазғаның үшін. Бұл оңай емес.`,
    seen: (k, st, vals) => `Мен сенен мынаны көрдім: сенің бағытың — <b>${k}</b>${st ? `, ал күшің — <b>${st}</b>` : ""}.${vals ? ` Сен үшін <b>${vals}</b> маңызды — бұл сенің ішкі компасың.` : ""}`,
    and: "</b> және <b>",
    door: "Әр адамның қиын күндері болады. Егер бірдеңе мазаласа — үлкен не кішкентай болсын — кез келген уақытта келіп сөйлесе аласың. Мен тыңдауға дайынмын.",
    sign: "— Сынып жетекшің",
  },
  ru: {
    brand: "Кто я?", from: "от классного руководителя", other: "Қазақша",
    lead: "Это не контрольная — здесь нет правильных и неправильных ответов. Это игра, чтобы узнать тебя ближе: многое о себе ты, возможно, и сам не замечаешь. В конце каждой встречи получишь интересный результат о себе.",
    facts: ["короткие встречи", "минут каждая", "видит только учитель"],
    note: "Не раздумывай — первый ответ самый верный. Если закроешь страницу, ответы сохранятся — потом можно войти по ИИН с любого телефона и продолжить.",
    iinTitle: "Введи свой ИИН", iinLabel: "ИИН, 12 цифр",
    iinHint: "12 цифр из удостоверения личности. Под твоим именем можешь войти только ты. ИИН не сохраняется в телефоне, и учитель его не видит.",
    demo: "Демо — для учителя (ответы не сохраняются)", enter: "Войти →", teacherEnter: "Войти как учитель →", checking: "Проверяем…",
    errTypo: "ИИН набран с ошибкой — проверь цифры и введи ещё раз.",
    errNotFound: "Этого ИИН нет в списке школы. Проверь цифры или скажи классному руководителю.",
    errMany: "Слишком много неудачных попыток. Попробуй через 15 минут.",
    errNet: "Похоже, нет связи — проверь интернет и попробуй ещё раз.",
    relogin: "Войди ещё раз — введи свой ИИН.", loading: "Загрузка…", saving: "Сохраняем…",
    hello: (n) => `Привет, ${n}! 👋`,
    menuLead: ["Начнём с первой встречи.", "Продолжим. Можно и сделать перерыв.", "Все три встречи пройдены — спасибо! Можешь снова посмотреть свои результаты."],
    partState: { skip: "Пройдено", done: "Результат", cur: "Продолжить", open: "Начать" },
    saveErr: "Последние ответы ещё не отправлены — проверь интернет. Они сохранены на этом устройстве.",
    notMe: (n) => `Я не ${n} — выйти`, allResults: "Все мои результаты →", start: "Начать →",
    back: "← Назад", next: "Далее →", finish: "Завершить ✓", menu: "☰ Меню", logout: "Выйти",
    portrait: "Насколько этот человек похож на тебя?", mid: "5 — середина",
    bip: ["Точно А", "Скорее А", "Одинаково", "Скорее Б", "Точно Б"], same: "одинаково",
    picked: (n, m) => `Выбрано: ${n} / ${m}`, textPh: "Напиши, если хочешь", textDone: (n, m) => `Готово: ${n} / ${m}`,
    sent: "ответы отправлены", nextReady: "Следующая встреча готова. Можно продолжить сейчас или позже — хоть завтра.",
    notVerdict: "Это лишь направление, а не приговор.", allDone: "Все три встречи пройдены ✓", yourResults: (n) => `${n}, твои результаты`,
    klimovTitle: "Твоё направление в мире профессий", profs: "Тебе близки профессии:", powers: "Твои 5 суперсил",
    character: "Твой характер", traits: "5 черт", valuesTitle: "Самое важное для тебя",
    allDiff: "Все люди разные — и это здорово. Ни одна черта не «плохая»: у каждой своя сила.",
    letter: "Письмо тебе", letterSub: "После трёх встреч",
    thanks: (n) => `${n}, спасибо тебе за честные ответы. Это непросто.`,
    seen: (k, st, vals) => `Вот что видно из твоих ответов: твоё направление — <b>${k}</b>${st ? `, а твоя сила — <b>${st}</b>` : ""}.${vals ? ` Для тебя важны <b>${vals}</b> — это твой внутренний компас.` : ""}`,
    and: "</b> и <b>",
    door: "У каждого бывают трудные дни. Если что-то беспокоит — большое или маленькое — в любой момент можешь подойти и поговорить: тебя выслушают.",
    sign: "— Твой классный руководитель",
  },
};
let u = UI[LANG];
function setLang(l) {
  LANG = l; D = ALL[l]; u = UI[l];
  try { localStorage.setItem(LANG_KEY, l); } catch { /* приватный режим */ }
  document.documentElement.lang = l === "ru" ? "ru" : "kk";
  document.title = u.brand;
}
setLang(LANG);

const fresh = () => ({ token: "", student: "", cls: "", answers: { _t: {} }, part: -1, block: 0, q: 0, intro: true, done: {}, view: "start", seconds: 0 });
// ?demo=1 — показ на презентации: сразу демо-ученик, ничего не пишется ни в базу, ни в память телефона
const URL_DEMO = new URLSearchParams(location.search).has("demo");
let S = URL_DEMO ? { ...fresh(), student: "Демо", demo: true, view: "menu" } : load() || fresh();
// старая анкета «по выбору имени» (до входа по ЖСН) остаётся на телефоне: после входа того же ученика её ответы дольются
if (!S.token && !S.demo) S.view = "start";
const skipped = (pid) => (S.answers._skip || []).includes(pid);
let shownAt = performance.now();

function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
function persist() { if (URL_DEMO) return; try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* приватный режим */ } }

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
if (S.token && allDone() && S.view !== "test") S.view = "all";
const answeredCount = () => ALLQ.filter((q) => q.type !== "text" && isDone(q, S.answers[q.id])).length;
const TOTALQ = ALLQ.filter((q) => q.type !== "text").length;
const blocksDone = () => D.parts.reduce((n, p, pi) => n + (S.done[p.id] ? p.blocks.length : pi === S.part ? S.block : 0), 0);
const filledText = (b) => b.questions.filter((q) => q.id.startsWith("f_") && (S.answers[q.id] || "").trim().length >= 2).length;
// с какого блока продолжать встречу: первый, где что-то не отвечено (анкета пришла с другого телефона)
function firstOpenBlock(pi) {
  const i = D.parts[pi].blocks.findIndex((b) =>
    b.questions.some((q) => q.type !== "text" && !isDone(q, S.answers[q.id])) || (b.minText && filledText(b) < b.minText));
  return i === -1 ? 0 : i;
}

// ---------- база ----------
async function rpc(fn, body, ms) {
  const res = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, {
    method: "POST", keepalive: fn === "mk_save_iin",
    signal: ms && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined,
    headers: { "Content-Type": "application/json", apikey: CFG.anonKey, Authorization: `Bearer ${CFG.anonKey}` },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt);
  return txt ? JSON.parse(txt) : null;
}

let saveErr = false;
async function save() {
  if (!CFG.url || S.demo || !S.token) return true;
  try {
    await rpc("mk_save_iin", {
      p_token: S.token, p_round: D.round, p_answers: S.answers, p_scores: { done: S.done },
      p_progress: blocksDone(), p_finished: allDone(), p_seconds: S.seconds,
    });
    saveErr = false;
    return true;
  } catch (e) {
    if (String(e.message).includes("no session")) {
      // пропуск больше не действует (ключи перезаписали) — ответы остаются на телефоне, после входа дольются
      S.token = ""; S.view = "start"; persist(); render(u.relogin);
    } else saveErr = true;
    return false;
  }
}

// вход по ЖСН: анкета берётся с сервера; несданные ответы этого же ученика с этого телефона ложатся сверху
function adopt(student, cls, token, row) {
  const local = S.student === student && !S.demo ? S : null;
  S = fresh(); S.student = student; S.cls = cls || ""; S.token = token; S.view = "menu";
  if (row) {
    S.answers = { ...row.answers, _t: { ...(row.answers?._t || {}) } };
    S.done = { ...(row.scores?.done || {}) };
    S.seconds = row.seconds || 0;
  }
  if (local && !row?.finished) {
    S.answers = { ...S.answers, ...local.answers, _t: { ...S.answers._t, ...(local.answers._t || {}) } };
    S.done = { ...S.done, ...local.done };
    S.seconds = Math.max(S.seconds, local.seconds || 0);
    S.resultPart = local.resultPart;
    if (local.part >= 0 && !S.done[D.parts[local.part].id]) Object.assign(S, { part: local.part, block: local.block, q: local.q, intro: local.intro });
  }
  if (allDone()) S.view = "all";
}

async function login(iin) {
  const r = await rpc("mk_login", { p_iin: iin }, 15000);
  if (!r) return false;
  const loaded = await rpc("mk_load", { p_token: r.token, p_round: D.round }, 15000);
  if (r.lang === "kk" || r.lang === "ru") setLang(r.lang);   // язык обучения ученика; переключить можно в меню
  adopt(r.student, r.class, r.token, loaded.response);
  persist();
  if (!loaded.response?.finished && answeredCount() > 0) save();
  return true;
}

// при открытии сайта: подтянуть анкету с сервера (вдруг её продолжали на другом телефоне)
async function sync() {
  const view = S.view;
  try {
    const loaded = await rpc("mk_load", { p_token: S.token, p_round: D.round }, 6000);
    adopt(loaded.student, loaded.class, S.token, loaded.response);
    if (!allDone() && view !== "start") {
      S.view = (view === "test" && S.part < 0) || (view === "result" && S.resultPart == null) ? "menu" : view;
    }
    persist();
    return loaded.response?.finished;
  } catch (e) {
    if (String(e.message).includes("no session")) { S.token = ""; S.view = "start"; persist(); }
    return false;   // нет сети — работаем с тем, что на телефоне
  }
}

// ---------- общее ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firstName = () => S.student.split(" ")[1] || S.student;
function setDock(html) { dock.innerHTML = html ? `<div class="in">${html}</div>` : ""; }
function bar() {
  const p = Math.round((answeredCount() / TOTALQ) * 100);
  return `<div class="bar"><span class="brand">🧭 ${u.brand}</span><div class="track"><div class="fill" style="width:${p}%"></div></div><span class="pct">${p}%</span></div>`;
}
function go(fn) { fn(); persist(); render(); scrollTo(0, 0); }
const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
const langLink = () => `<button class="link" id="lang">${u.other}</button>`;
function onLang(msg) { on("lang", () => { setLang(LANG === "kk" ? "ru" : "kk"); render(msg); }); }

function render(msg) {
  shownAt = performance.now();
  if (S.view === "start") return renderStart(msg);
  if (S.view === "menu") return renderMenu();
  if (S.view === "result") return renderResult(S.resultPart);
  if (S.view === "all") return renderAll();
  const b = D.parts[S.part].blocks[S.block];
  if (S.intro) return renderIntro(b);
  return b.mode === "one" ? renderOne(b) : renderList(b);
}

// ---------- старт и меню ----------
// контрольная цифра ЖСН — та же проверка, что в mk_iin_ok на сервере: опечатку видно сразу
function iinOk(p) {
  if (!/^\d{12}$/.test(p)) return false;
  const d = [...p].map(Number);
  let c = d.slice(0, 11).reduce((s, x, i) => s + x * (i + 1), 0) % 11;
  if (c === 10) c = d.slice(0, 11).reduce((s, x, i) => s + x * ((i + 2) % 11 + 1), 0) % 11;
  return c < 10 && c === d[11];
}
function renderStart(msg = "") {
  app.innerHTML = `<div class="screen">
    <p class="eyebrow top"><span>Dostyq school · ${u.from}</span>${langLink()}</p>
    <h1>${u.brand}</h1>
    <p class="lead">${u.lead}</p>
    <div class="facts">
      <div class="fact"><b>3</b><span>${u.facts[0]}</span></div>
      <div class="fact"><b>≈10</b><span>${u.facts[1]}</span></div>
      <div class="fact"><b>🔒</b><span>${u.facts[2]}</span></div>
    </div>
    <div class="note">${u.note}</div>
    <h2>${u.iinTitle}</h2>
    <p class="hint">${u.iinHint}</p>
    <input class="iin" id="iin" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="000000000000" aria-label="${u.iinLabel}">
    <p class="err" id="iinerr" role="alert">${esc(msg)}</p>
    <p class="saved"><button class="link" id="demo">${u.demo}</button></p>
  </div>`;
  setDock(`<button class="btn wide" id="go" disabled>${u.enter}</button>`);
  const inp = document.getElementById("iin"), err = document.getElementById("iinerr"), btn = document.getElementById("go");
  // 8 цифр — код учителя: он уходит на портал (/mk/enter), там учитель видит разбор классов; 12 цифр — ИИН ученика
  const isCode = (v) => v.length === 8 && CFG.portal;
  inp.oninput = () => {
    inp.value = inp.value.replace(/\D/g, "").slice(0, 12);
    btn.disabled = !(inp.value.length === 12 || isCode(inp.value));
    btn.textContent = isCode(inp.value) ? u.teacherEnter : u.enter;
    err.textContent = "";
  };
  inp.onkeydown = (e) => { if (e.key === "Enter" && !btn.disabled) btn.click(); };
  btn.onclick = async () => {
    const iin = inp.value;
    if (isCode(iin)) {
      const f = Object.assign(document.createElement("form"), { method: "post", action: `${CFG.portal}/mk/enter` });
      f.append(Object.assign(document.createElement("input"), { type: "hidden", name: "code", value: iin }));
      document.body.append(f);
      inp.value = "";
      return f.submit();
    }
    if (!iinOk(iin)) { err.textContent = u.errTypo; return; }
    btn.disabled = true; btn.textContent = u.checking;
    try {
      if (await login(iin)) { render(); scrollTo(0, 0); return; }
      err.textContent = u.errNotFound;
    } catch (e) {
      err.textContent = String(e.message).includes("too many") ? u.errMany : u.errNet;
    }
    btn.disabled = false; btn.textContent = u.enter;
  };
  onLang(msg);
  on("demo", () => go(() => { S = fresh(); S.student = "Демо"; S.demo = true; S.view = "menu"; }));
}

function renderMenu() {
  const next = D.parts.findIndex((p) => !S.done[p.id]);
  app.innerHTML = `<div class="screen">${bar()}
    ${S.cls ? `<p class="eyebrow">${esc(S.cls)}</p>` : ""}
    <h1>${esc(u.hello(firstName()))}</h1>
    <p class="lead">${u.menuLead[next === -1 ? 2 : next === 0 ? 0 : 1]}</p>
    <div class="parts">${D.parts.map((p, i) => {
      const done = S.done[p.id], open = i <= (next === -1 ? 99 : next), cur = i === S.part && !done && (S.block > 0 || !S.intro);
      const skip = skipped(p.id), st = u.partState;
      return `<button class="partc ${done ? "done" : ""}" data-p="${i}" ${open && !skip ? "" : "disabled"}>
        <span class="pi">${done ? "✅" : open ? p.icon : "🔒"}</span>
        <span class="pt"><b>${esc(p.title)}</b><small>${esc(p.teaser)} · ≈${p.min} мин</small></span>
        <span class="pa">${skip ? st.skip : done ? st.done : cur ? st.cur : open ? st.open : ""}</span></button>`;
    }).join("")}</div>
    ${saveErr ? `<p class="err">${u.saveErr}</p>` : ""}
    <p class="saved"><button class="link" id="other">${esc(u.notMe(firstName()))}</button> · ${langLink()}</p>
  </div>`;
  app.querySelectorAll(".partc").forEach((el) => el.onclick = () => {
    const i = +el.dataset.p, p = D.parts[i];
    if (S.done[p.id]) go(() => { S.view = "result"; S.resultPart = i; });
    else go(() => { if (S.part !== i) { S.part = i; S.block = firstOpenBlock(i); S.q = 0; S.intro = true; } S.view = "test"; });
  });
  on("other", () => go(() => { S = fresh(); }));
  onLang();
  setDock(next === -1 ? `<button class="btn wide" id="all">${u.allResults}</button>` : `<button class="btn wide" id="cont">${esc(D.parts[next].title)} →</button>`);
  on("all", () => go(() => { S.view = "all"; }));
  on("cont", () => go(() => { if (S.part !== next) { S.part = next; S.block = firstOpenBlock(next); S.q = 0; S.intro = true; } S.view = "test"; }));
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
  setDock(`<button class="btn ghost" id="menu">☰</button><button class="btn" id="go">${u.start}</button>`);
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
    <div class="scale-ends"><span>${esc(q.lo || "0")}</span><span>${u.mid}</span><span>${esc(q.hi || "10")}</span></div>`;
}
function renderOne(b) {
  const q = b.questions[S.q];
  const v = S.answers[q.id];
  let body;
  if (q.type === "bipolar") {
    const sizes = [46, 36, 26, 36, 46];
    body = `<p class="qtext small">${esc(b.ask || "")}</p>
      <div class="bip">
        <div class="side a"><span class="lt">А</span>${esc(q.a.t)}</div>
        <div class="dots">${sizes.map((s, i) => `<button class="dot d${i}" data-v="${i}" aria-pressed="${v === i}" style="--s:${s}px" aria-label="${u.bip[i]}"></button>`).join("")}</div>
        <div class="dot-labels"><span>← А</span><span>${u.same}</span><span>Б →</span></div>
        <div class="side b"><span class="lt">Б</span>${esc(q.b.t)}</div>
      </div>`;
  } else if (q.type === "scale10") {
    body = `<p class="qtext ${q.portrait ? "portrait" : ""}">${q.portrait ? "👤 " : ""}${esc(q.t)}</p>${q.portrait ? `<p class="hint">${u.portrait}</p>` : ""}${scaleRow(q, v)}`;
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
  setDock(`<button class="btn ghost" id="back">${u.back}</button>` + (v !== undefined ? `<button class="btn" id="fwd">${u.next}</button>` : ""));
  on("back", () => go(() => { if (S.q > 0) S.q--; else S.intro = true; }));
  on("fwd", () => (S.q < b.questions.length - 1 ? go(() => S.q++) : nextBlock()));
}

// ---------- списком ----------
function renderList(b) {
  const p = D.parts[S.part];
  const a = S.answers;
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
      }).join("")}</div><div class="cnt">${u.picked(sel.length, q.max)}</div>`;
    } else if (q.type === "text") {
      inner = q.short
        ? `<input class="sent" data-t="${q.id}" maxlength="300" value="${esc(v || "")}" placeholder="…" autocomplete="off">`
        : `<textarea data-t="${q.id}" maxlength="1200" placeholder="${u.textPh}">${esc(v || "")}</textarea>`;
    }
    const done = q.type !== "text" && isDone(q, v);
    const label = q.scenario ? `<p class="t scen">${esc(q.t)}</p>` : `<p class="t">${esc(q.t)}</p>`;
    return `<div class="q ${done ? "done" : ""} ${q.short ? "q-sent" : ""}" id="q_${q.id}">${label}${inner}</div>`;
  }).join("");
  app.innerHTML = `<div class="screen">${bar()}
    <p class="qnum">${b.icon} ${esc(p.title)} · ${S.block + 1} / ${p.blocks.length}</p>
    <h2>${esc(b.title)}</h2><p class="lead">${esc(b.intro)}</p>
    <div class="qs">${items}</div>
    ${b.minText ? `<p class="cnt" id="tcount">${u.textDone(filledText(b), b.minText)}</p>` : ""}</div>`;

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
    if (c) c.textContent = u.textDone(filledText(b), b.minText);
  });

  setDock(`<button class="btn ghost" id="back">←</button><button class="btn" id="fwd">${S.block === p.blocks.length - 1 ? u.finish : u.next}</button>`);
  on("back", () => go(() => { S.intro = true; }));
  on("fwd", () => {
    const miss = b.questions.filter((q) => !isDone(q, S.answers[q.id]));
    if (miss.length) {
      miss.forEach((q) => document.getElementById("q_" + q.id).classList.add("miss"));
      document.getElementById("q_" + miss[0].id).scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (b.minText && filledText(b) < b.minText) {
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
  app.innerHTML = `<div class="screen">${bar()}<h2>${u.saving}</h2></div>`;
  setDock("");
  await save();
  if (S.view === "start") return;   // пропуск не действует — save() уже отправил на вход
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
      <div class="card"><h3>${u.klimovTitle}</h3>${bars(sc.klimovTop.map((k) => ({ icon: D.klimov[k].icon, name: D.klimov[k].name, pct: (sc.klimov[k] / 8) * 100, shown: sc.klimov[k].toFixed(1) })))}
        <p class="prof"><b>${u.profs}</b> ${esc(K.prof)}${tie ? `; ${esc(K2.prof.split(", ").slice(0, 4).join(", "))}` : ""}.</p></div>
      <div class="card"><h3>${u.powers}</h3><div class="powers">${st.map((o) => {
        const [title, sub] = o.t.split(" — ");
        return `<div class="pw"><span>${o.i}</span><b>${esc(title)}</b><small>${esc(sub || "")}</small></div>`;
      }).join("")}</div></div>`;
  } else if (part.id === "p2") {
    const T = sc.temper && D.temper[sc.temper];
    const order = ["E", "O", "C", "A", "N"];
    html = `<div class="res-top"><div class="big">${T ? T.icon : "🎭"}</div><h2>${u.character}</h2><p>${T ? esc(T.short) : ""}</p></div>
      <div class="card"><h3>${u.traits}</h3>${order.map((k) => {
        const B = D.big5[k], v = sc.big5[k] ?? 50;
        return `<div class="trait"><div class="tn"><b>${esc(B.name)}</b><span>${v}</span></div><span class="tr"><i style="width:${Math.max(3, v)}%"></i></span><p>${esc(v >= 50 ? B.hi : B.lo)}</p></div>`;
      }).join("")}</div>
      <div class="card"><h3>${u.valuesTitle}</h3><ol class="vals">${sc.valuesTop.map((k) => `<li>${esc(D.values[k])}</li>`).join("")}</ol>
      <p class="prof">${u.allDiff}</p></div>`;
  } else {
    const K = D.klimov[sc.klimovTop[0]];
    const st = (S.answers.strengths || []).map((v) => D.parts[0].blocks[2].questions[0].opts.find((o) => o.v === v)).filter(Boolean).slice(0, 3);
    const vals = sc.valuesTop.slice(0, 2).map((k) => esc(D.values[k].toLowerCase())).join(u.and);
    html = `<div class="res-top"><div class="big">🫶</div><h2>${u.letter}</h2><p>${u.letterSub}</p></div>
      <div class="card letter">
        <p>${esc(u.thanks(firstName()))}</p>
        ${skipped("p1") ? "" : `<p>${u.seen(esc(K.name), st.map((o) => esc(o.t.split(" — ")[0].toLowerCase())).join(", "), vals)}</p>`}
        <p>${u.door}</p>
        <p class="sign">${u.sign}</p>
      </div>`;
  }
  return html;
}
function renderResult(pi) {
  const part = D.parts[pi];
  const html = resultHtml(pi, score(D, S.answers));
  const next = D.parts.findIndex((p) => !S.done[p.id]);
  app.innerHTML = `<div class="screen"><p class="eyebrow" style="margin-top:14px">${esc(part.title)} ✓ · ${u.sent}</p>${html}
    ${next !== -1 ? `<p class="saved">${u.nextReady}</p>` : `<p class="saved">${u.notVerdict}</p>`}</div>`;
  setDock(next !== -1
    ? `<button class="btn ghost" id="menu">☰</button><button class="btn" id="nx">${esc(D.parts[next].title)} →</button>`
    : `<button class="btn ghost" id="menu">${u.menu}</button><button class="btn ghost" id="other">${u.logout}</button>`);
  on("menu", () => go(() => { S.view = "menu"; }));
  on("nx", () => go(() => { S.part = next; S.block = firstOpenBlock(next); S.q = 0; S.intro = true; S.view = "test"; }));
  on("other", () => go(() => { S = fresh(); }));
}

function renderAll() {
  const sc = score(D, S.answers);
  app.innerHTML = `<div class="screen">
    <p class="eyebrow top" style="margin-top:14px"><span>${u.allDone}</span>${langLink()}</p>
    <h1>${esc(u.yourResults(firstName()))}</h1>
    ${D.parts.map((p, i) => skipped(p.id) ? "" : `<h2 class="sec">${p.icon} ${esc(p.title)}</h2>${resultHtml(i, sc)}`).join("")}
    <p class="saved">${u.notVerdict}</p></div>`;
  setDock(`<button class="btn ghost" id="menu">${u.menu}</button><button class="btn ghost" id="other">${u.logout}</button>`);
  on("menu", () => go(() => { S.view = "menu"; }));
  on("other", () => go(() => { S = fresh(); }));
  onLang();
}

// Демо внутри презентации: PageDown/PageUp/Esc (кликер) передаём слайдам
if (URL_DEMO && window.parent !== window) {
  document.addEventListener("keydown", (e) => {
    if (["PageDown", "PageUp", "Escape"].includes(e.key) && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      window.parent.postMessage({ pitchKey: e.key }, "*");
    }
  });
}

addEventListener("pagehide", () => { if (S.token && S.view === "test") save(); });
// при каждом открытии: подтянуть анкету с сервера и дослать то, что не дошло (сеть);
// сданную анкету mk_save_iin всё равно не перезапишет
if (S.token) {
  app.innerHTML = `<div class="screen"><h2>${u.loading}</h2></div>`;
  sync().then((finished) => {
    if (!finished && S.token && answeredCount() > 0) save();
    render();
  });
} else render();
