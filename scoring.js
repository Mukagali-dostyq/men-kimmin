// «Мен кіммін?» v2 — подсчёт и сигналы. ОДИН файл на всех: сайт ученика (dist/scoring.js)
// и портал (ent_platform/lib/men-kimmin-scoring.js — копирует build.py). Править только здесь.
// D — содержимое data (PARTS, ...), a — ответы ученика { id: значение, _t: { id: мс } }.

const num = (x) => (typeof x === "number" && !Number.isNaN(x) ? x : undefined);
const mean = (xs) => {
  const v = xs.filter((x) => typeof x === "number");
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100 : null;
};

export function questions(D) {
  const out = [];
  for (const p of D.parts) for (const b of p.blocks) for (const q of b.questions) out.push({ ...q, block: b.id, part: p.id });
  return out;
}

export function score(D, a) {
  const Q = questions(D);
  const s = {
    klimov: { P: 0, T: 0, H: 0, S: 0, A: 0 },
    big5: {}, values: {}, valuesCentered: {}, hidden: {}, motiv: {}, conflict: {}, coping: [],
    projection: {}, att: null,
  };
  const b5 = { E: [], A: [], C: [], N: [], O: [] };
  for (const q of Q) {
    const v = a[q.id];
    if (v === undefined || v === null) continue;
    if (q.block === "klimov") {
      s.klimov[q.a.k] += (4 - v) / 4;
      s.klimov[q.b.k] += v / 4;
    } else if (q.block === "big5") {
      if (q.s === "ATT") s.att = v === 2;
      else b5[q.s].push(q.pole === "a" ? 4 - v : v);
    } else if (q.block === "portraits") {
      const k = q.id.slice(2);
      if (k.startsWith("H_")) s.hidden[k] = v;
      else if (k.startsWith("M_")) s.motiv[k] = v;
      else s.values[k] = v;
    } else if (q.block === "situations") {
      if (q.id.startsWith("cp")) s.coping.push(v);
      else s.conflict[v] = (s.conflict[v] || 0) + 1;
    } else if (q.block === "class10") s.projection[q.id] = v;
  }
  for (const k of Object.keys(s.klimov)) s.klimov[k] = Math.round(s.klimov[k] * 10) / 10;
  s.klimovTop = Object.keys(s.klimov).sort((x, y) => s.klimov[y] - s.klimov[x]);
  for (const [k, xs] of Object.entries(b5)) s.big5[k] = xs.length ? Math.round((mean(xs) / 4) * 100) : null;
  // ценности: центрируем на средний балл человека (так рекомендует Шварц) — видно, что важнее именно ему
  const vals = Object.values(s.values);
  const vm = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
  for (const [k, v] of Object.entries(s.values)) s.valuesCentered[k] = Math.round((v - vm) * 10) / 10;
  s.valuesTop = Object.keys(s.valuesCentered).sort((x, y) => s.valuesCentered[y] - s.valuesCentered[x]).slice(0, 3);

  const E = s.big5.E, N = s.big5.N;
  if (E != null && N != null) {
    s.temper = E >= 50 ? (N > 50 ? "choleric" : "sanguine") : N > 50 ? "melancholic" : "phlegmatic";
    s.temperBorder = Math.abs(E - 50) <= 12 || Math.abs(N - 50) <= 12;
  }
  const who = [1, 2, 3, 4, 5].map((i) => num(a[`who${i}`]));
  s.who5 = who.every((x) => x !== undefined) ? who.reduce((x, y) => x + y, 0) * 4 : null;
  const bel = Q.filter((q) => q.id.startsWith("bel")).map((q) => (num(a[q.id]) === undefined ? undefined : q.rev ? 5 - a[q.id] : a[q.id]));
  s.belong = mean(bel);
  s.sentencesFilled = Q.filter((q) => q.id.startsWith("f_") && typeof a[q.id] === "string" && a[q.id].trim().length >= 2).length;
  const t = a._t || {};
  const times = Object.values(t).filter((x) => typeof x === "number");
  s.medianMs = times.length ? times.sort((x, y) => x - y)[Math.floor(times.length / 2)] : null;
  return s;
}

const RISK = /(өлгім|өлсем|өліп кет|өзімді өлтір|асылып|жоқ болғым|өмір сүргім келме|ешкімге керек емес|ұрады|ұрып|соғады|умереть|убить себя|не хочу жить|покончить|суицид|вены|повеситься|режу себя|резать себя|никому не нуж|бьют|избивают)/i;

/** Сигналы для учителя: level 3 — поговорить срочно, 2 — обратить внимание, 1 — к сведению. */
export function flags(D, a, s, meta = {}) {
  const f = [];
  const add = (level, text) => f.push({ level, text });
  const texts = Object.entries(a).filter(([k, v]) => (k.startsWith("f_") || k.startsWith("o_")) && typeof v === "string");
  if (texts.some(([, v]) => RISK.test(v))) add(3, "В незаконченных предложениях есть тревожные слова — прочитать лично; при необходимости — школьный психолог");
  if (s.who5 != null && s.who5 <= 28) add(3, `Очень низкое самочувствие за 2 недели (ВОЗ-5: ${s.who5}/100) — поговорить, предложить психолога`);
  else if (s.who5 != null && s.who5 <= 50) add(2, `Сниженное самочувствие (ВОЗ-5: ${s.who5}/100)`);
  if (a.safe === 3) add(3, "Не чувствует себя в безопасности в школе");
  else if (a.safe === 2) add(2, "Не всегда чувствует себя в безопасности в школе");
  if (a.bully === 2) add(3, "Часто высмеивают / обижают");
  else if (a.bully === 1) add(2, "Иногда высмеивают / обижают");
  if (a.safe === -1 || a.bully === -1) add(2, "Не захотел(а) отвечать про безопасность/обиды — мягко поговорить");
  if (a.night === "none") add(2, "В беде «никому не позвоню — справлюсь сам(а)»");
  if (a.night === "dunno") add(2, "Не знает, к кому обратиться в беде");
  if (s.belong != null && s.belong <= 2) add(2, `Слабое чувство принадлежности к школе (${s.belong}/4)`);
  const hid = { H_TIRED: "скрытую усталость", H_ALONE: "одиночество среди людей", H_DOUBT: "неверие в себя", H_PRESS: "давление ожиданий",
    H_MASK: "«маску» — смеётся, но не открывается", H_ASK: "стыд просить помощи" };
  for (const [k, txt] of Object.entries(hid)) {
    const v = s.hidden[k];
    if (v != null && v >= 8) add(k === "H_MASK" || k === "H_ASK" ? 1 : 2, `Узнал(а) себя (${v}/10) в портрете про ${txt}`);
  }
  if ((s.motiv.M_AM ?? 0) >= 8) add(2, `Узнал(а) себя в «не видит смысла в учёбе» (${s.motiv.M_AM}/10)`);
  if (num(a.w_battery) !== undefined && a.w_battery <= 2) add(2, `«Батарейка» ${a.w_battery * 10}%`);
  if (a.w_school === "cage") add(2, "Школа для него — «клетка»");
  else if (a.w_school === "fort" || a.w_school === "stage") add(1, `Школа — «${a.w_school === "fort" ? "крепость, надо обороняться" : "сцена, все оценивают"}»`);
  if (["storm", "fog", "rain"].includes(a.w_weather)) add(1, `Настроение-погода: ${{ storm: "гроза", fog: "туман", rain: "дождь" }[a.w_weather]}`);
  const obst = Array.isArray(a.obst) ? a.obst : [];
  const own = { family: "трудности в семье", classmates: "отношения с одноклассниками", teachers: "отношения с учителями", health: "здоровье, усталость", personal: "личные переживания" };
  for (const [k, t] of Object.entries(own)) if (obst.includes(k)) add(2, "Сам(а) отметил(а) помеху: " + t);
  if ((a.bed ?? 0) >= 3) add(2, "Ложится после полуночи — недосып");
  if ((a.phone ?? 0) >= 3) add(1, "Телефон 4+ часа в день");
  if (a.place === 2) add(1, "Дома нет тихого места для учёбы");
  if (a.pc === 2) add(1, "Дома нет компьютера");
  if (a.duties === 2) add(1, "Много обязанностей дома / подработка, устаёт");
  if (a.breakfast === 2) add(1, "Почти не завтракает");
  if ((a.road ?? 0) >= 2) add(1, "Дорога до школы больше 30 минут");
  if (meta.classProjection) {
    for (const [k, txt] of Object.entries({ p_home: "трудности дома", p_alone: "одиночество в классе", p_tired: "усталость от учёбы", p_hide: "страх говорить учителю правду" })) {
      const v = s.projection[k], m = meta.classProjection[k];
      if (v != null && m != null && v >= 7 && v - m >= 3) add(1, `Сильно завышает, сколько в классе испытывают ${txt} (${v} из 10 при среднем ${m}) — возможно, про себя`);
    }
  }
  if (s.att === false) add(2, "Не прошёл(ла) проверочный вопрос — часть ответов могла быть наугад");
  if (s.medianMs != null && s.medianMs < 1200) add(2, `Отвечал(а) очень быстро (медиана ${(s.medianMs / 1000).toFixed(1)} с на вопрос) — возможно, наугад`);
  return f.sort((x, y) => y.level - x.level);
}
