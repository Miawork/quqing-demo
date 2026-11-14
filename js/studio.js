/* ============================================================
 * 造曲台 · 微型 GarageBand 式歌曲 DIY 面板
 * ------------------------------------------------------------
 * 多轨步进音序器：底鼓/军鼓/踩镲/贝斯/和弦 + 主旋律音高格 + 人声轨。
 * 可调速率(BPM)、调性、和弦走向、音场(混音)。音阶锁定→不会弹错。
 * 纯前端 Web Audio 实时合成 + 前瞻调度器(lookahead scheduler)，
 * 不依赖外部音频或生成服务；生产环境可把合成替换为采样/后端。
 * ============================================================ */

const ST_STEPS = 16;                 // 一小节 16 步（4/4，十六分音符）
const ST_RHYTHM_LANES = [
  { key: "kick",  name: "底鼓", color: "#2152FF" },
  { key: "snare", name: "军鼓", color: "#6A3BFF" },
  { key: "hat",   name: "踩镲", color: "#2FA36B" },
  { key: "bass",  name: "贝斯", color: "#C23B3B" },
  { key: "chord", name: "和弦", color: "#8F9B1E" },
];
/* 主旋律音高格：大调五声 1 2 3 5 6，自上而下由高到低（半音偏移）。 */
const ST_MELODY_ROWS = [
  { label: "6", deg: 9 },
  { label: "5", deg: 7 },
  { label: "3", deg: 4 },
  { label: "2", deg: 2 },
  { label: "1", deg: 0 },
];
/* 调性预设：melodic 根音频率（中音区），贝斯自动降八度。 */
const ST_KEYS = {
  "C 五声": 261.63, "D 五声": 293.66, "E 五声": 329.63, "G 五声": 392.0, "A 五声": 440.0,
};
/* 和弦走向预设：每拍一个和弦根音（半音偏移），一小节走 4 个。 */
const ST_PROGS = {
  "温暖": [0, 7, 9, 5],   // I–V–vi–IV
  "国风": [9, 5, 0, 7],   // vi–IV–I–V
  "燃":   [0, 5, 7, 0],   // I–IV–V–I
  "游离": [9, 5, 7, 9],   // vi–IV–V–vi
};
const ST_CHORD_QUALITY = { 0: "maj", 5: "maj", 7: "maj", 9: "min", 2: "min", 4: "min" };
const ST_EFFECTS = ["贴近", "现场", "磁带"]; // 复用试作的音场处理语义

const studioState = {
  bpm: 96,
  key: "C 五声",
  prog: "温暖",
  effect: 0,
  playing: false,
  step: 0,
  rhythm: {
    kick:  Array(ST_STEPS).fill(false),
    snare: Array(ST_STEPS).fill(false),
    hat:   Array(ST_STEPS).fill(false),
    bass:  Array(ST_STEPS).fill(false),
    chord: Array(ST_STEPS).fill(false),
  },
  melody: Array(ST_STEPS).fill(null), // 每步存音高行索引 0..4，或 null（单音）
  mutes: { kick: false, snare: false, hat: false, bass: false, chord: false, melody: false },
  started: false, // 是否已填过内容
};

let studioLastFocus = null;
let stCtx = null;
let stMasterGraph = null;
let stTimer = null;
let stRaf = 0;
let stNextStepTime = 0;
let stSchedStep = 0;
let stQueue = []; // 播放头队列 {step, time}

/* ---------------- 打开 / 关闭 ---------------- */

function openStudio() {
  studioLastFocus = document.activeElement;
  if (typeof playerState !== "undefined" && playerState.playing) togglePlayerPlayback();
  const overlay = $("#studio");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  renderStudio();
  setTimeout(() => overlay.querySelector(".st-top button")?.focus(), 20);
}

function closeStudio() {
  stStop();
  const overlay = $("#studio");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  studioLastFocus?.focus?.();
}

function completeStudio() {
  stStop();
  const hasContent = Object.values(studioState.rhythm).some(a => a.some(Boolean)) ||
    studioState.melody.some(v => v != null);
  closeStudio();
  toast(hasContent ? "这段编曲已保留在本次体验中 ✓" : "空着也没关系，随时回来编");
}

/* ---------------- 渲染 ---------------- */

function studioIcon(name) { return (typeof CONFIG !== "undefined" && CONFIG.icons[name]) || ""; }

function renderStudio() {
  const stage = $("#stStage");
  if (!stage) return;
  $("#stBpmVal").textContent = `${studioState.bpm} BPM`;
  $("#stBpm").value = studioState.bpm;
  const playBtn = $("#stPlay");
  if (playBtn) {
    playBtn.textContent = studioState.playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", studioState.playing ? "停止" : "播放");
    playBtn.classList.toggle("on", studioState.playing);
  }
  stage.innerHTML = `
    ${studioControlsHTML()}
    <div class="st-ruler">${stRulerHTML()}</div>
    <div class="st-lanes">
      ${ST_RHYTHM_LANES.map(stLaneHTML).join("")}
    </div>
    ${stMelodyHTML()}
    ${stVocalHTML()}`;
}

function studioControlsHTML() {
  const keyOpts = Object.keys(ST_KEYS).map(k =>
    `<option ${k === studioState.key ? "selected" : ""}>${k}</option>`).join("");
  const progOpts = Object.keys(ST_PROGS).map(p =>
    `<option ${p === studioState.prog ? "selected" : ""}>${p}</option>`).join("");
  const effOpts = ST_EFFECTS.map((e, i) =>
    `<option value="${i}" ${i === studioState.effect ? "selected" : ""}>音场 · ${e}</option>`).join("");
  return `
    <div class="st-controls">
      <label class="st-sel"><span>调性</span><select onchange="studioSetKey(this.value)">${keyOpts}</select></label>
      <label class="st-sel"><span>和弦</span><select onchange="studioSetProg(this.value)">${progOpts}</select></label>
      <label class="st-sel"><span>音场</span><select onchange="studioSetEffect(this.value)">${effOpts}</select></label>
    </div>`;
}

function stRulerHTML() {
  let cells = "";
  for (let s = 0; s < ST_STEPS; s++) {
    cells += `<i data-step="${s}" class="${s % 4 === 0 ? "beat" : ""}">${s % 4 === 0 ? (s / 4 + 1) : ""}</i>`;
  }
  return `<span class="st-ruler-label"></span><div class="st-ruler-cells">${cells}</div>`;
}

function stLaneHTML(lane) {
  const muted = studioState.mutes[lane.key];
  const cells = studioState.rhythm[lane.key].map((on, s) =>
    `<button type="button" class="st-cell ${on ? "on" : ""} ${s % 4 === 0 ? "beat" : ""}"
       data-track="${lane.key}" data-step="${s}" aria-pressed="${on}"
       style="--lane:${lane.color}" onclick="studioToggle('${lane.key}',${s})"></button>`
  ).join("");
  return `
    <div class="st-lane ${muted ? "muted" : ""}" data-lane="${lane.key}">
      <div class="st-lane-head" style="--lane:${lane.color}">
        <button type="button" class="st-mute" onclick="studioMute('${lane.key}')" aria-label="静音">${lane.name}</button>
      </div>
      <div class="st-cells">${cells}</div>
    </div>`;
}

function stMelodyHTML() {
  const muted = studioState.mutes.melody;
  const rows = ST_MELODY_ROWS.map((row, r) => {
    const cells = [];
    for (let s = 0; s < ST_STEPS; s++) {
      const on = studioState.melody[s] === r;
      cells.push(`<button type="button" class="st-mcell ${on ? "on" : ""} ${s % 4 === 0 ? "beat" : ""}"
        data-step="${s}" data-row="${r}" aria-pressed="${on}"
        onclick="studioToggleMel(${s},${r})"></button>`);
    }
    return `<div class="st-prow"><span class="st-pnum">${row.label}</span><div class="st-pcells">${cells.join("")}</div></div>`;
  }).join("");
  return `
    <div class="st-melody ${muted ? "muted" : ""}">
      <div class="st-lane-head st-melody-head" style="--lane:#E8622B">
        <button type="button" class="st-mute" onclick="studioMute('melody')" aria-label="静音">主旋律</button>
      </div>
      <div class="st-melody-grid">${rows}</div>
    </div>`;
}

function stVocalHTML() {
  return `
    <div class="st-vocal" onclick="studioVocal()">
      <span class="st-vocal-ic">${studioIcon("mic")}</span>
      <div><b>人声 / 上传干音</b><span>把你录好的干音叠到这段伴奏上 · 即将开放</span></div>
      <em>＋</em>
    </div>`;
}

/* ---------------- 交互 ---------------- */

function studioToggle(key, step) {
  const arr = studioState.rhythm[key];
  arr[step] = !arr[step];
  const cell = $(`.st-cell[data-track="${key}"][data-step="${step}"]`);
  cell?.classList.toggle("on", arr[step]);
  cell?.setAttribute("aria-pressed", arr[step]);
  if (!studioState.playing) stPreviewStep(key, step);
}

function studioToggleMel(step, row) {
  const cur = studioState.melody[step];
  studioState.melody[step] = cur === row ? null : row;
  // 单音：同一步其它行取消高亮
  document.querySelectorAll(`.st-mcell[data-step="${step}"]`).forEach(c => {
    const on = Number(c.dataset.row) === studioState.melody[step];
    c.classList.toggle("on", on);
    c.setAttribute("aria-pressed", on);
  });
  if (!studioState.playing && studioState.melody[step] != null) stPreviewMel(step, row);
}

function studioMute(key) {
  studioState.mutes[key] = !studioState.mutes[key];
  const el = key === "melody" ? document.querySelector(".st-melody") : document.querySelector(`.st-lane[data-lane="${key}"]`);
  el?.classList.toggle("muted", studioState.mutes[key]);
}

function studioSetKey(v) { studioState.key = v; }
function studioSetProg(v) { studioState.prog = v; }
function studioSetEffect(v) {
  studioState.effect = Number(v);
  if (studioState.playing) { stBuildMaster(); }
}

function studioSetBpm(v) {
  studioState.bpm = Number(v);
  $("#stBpmVal").textContent = `${studioState.bpm} BPM`;
}

function studioClearAll() {
  Object.keys(studioState.rhythm).forEach(k => studioState.rhythm[k].fill(false));
  studioState.melody.fill(null);
  renderStudio();
  toast("已清空，重新来过");
}

/* 一键来灵感：填入一套互相咬合的律动 + 一句五声小动机。 */
function studioInspire() {
  const R = studioState.rhythm;
  R.kick  = idx([0, 4, 8, 12, 14], ST_STEPS);
  R.snare = idx([4, 12], ST_STEPS);
  R.hat   = idx([0, 2, 4, 6, 8, 10, 12, 14], ST_STEPS);
  R.bass  = idx([0, 3, 8, 11], ST_STEPS);
  R.chord = idx([0, 8], ST_STEPS);
  // 五声小动机（行索引，null 为休止）：一句上行再回落
  const motif = [4, null, 3, null, 2, 3, 1, null, 2, null, 3, 4, 2, null, 1, null];
  studioState.melody = motif.slice(0, ST_STEPS);
  renderStudio();
  toast("灵感已填入，点播放听听 ♪");
  if (!studioState.playing) stToggle();
}

function idx(list, len) {
  const a = Array(len).fill(false);
  list.forEach(i => { if (i < len) a[i] = true; });
  return a;
}

function studioVocal() {
  toast("上传干音即将开放：录好的人声可叠到这段伴奏上一起混");
}

/* ---------------- 音频引擎（前瞻调度器） ---------------- */

function stToggle() { studioState.playing ? stStop() : stStart(); }

function stStart() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return toast("当前浏览器暂不支持实时合成");
  if (!stCtx) stCtx = new Ctor();
  stCtx.resume?.();
  stBuildMaster();
  studioState.playing = true;
  stSchedStep = 0;
  stNextStepTime = stCtx.currentTime + 0.08;
  stQueue = [];
  clearInterval(stTimer);
  stTimer = setInterval(stScheduler, 25);
  stPlayheadLoop();
  const b = $("#stPlay");
  if (b) { b.textContent = "❚❚"; b.classList.add("on"); }
}

function stStop() {
  studioState.playing = false;
  clearInterval(stTimer); stTimer = null;
  cancelAnimationFrame(stRaf); stRaf = 0;
  stQueue = [];
  if (stMasterGraph) {
    try {
      const now = stCtx.currentTime;
      stMasterGraph.master.gain.setTargetAtTime(0, now, 0.02);
    } catch (_) {}
  }
  stClearPlayhead();
  const b = $("#stPlay");
  if (b) { b.textContent = "▶"; b.classList.remove("on"); }
}

function stScheduler() {
  const spb = 60 / studioState.bpm / 4; // 每步秒数（十六分）
  while (stNextStepTime < stCtx.currentTime + 0.1) {
    stScheduleStep(stSchedStep, stNextStepTime);
    stQueue.push({ step: stSchedStep, time: stNextStepTime });
    stNextStepTime += spb;
    stSchedStep = (stSchedStep + 1) % ST_STEPS;
  }
}

function stScheduleStep(step, at) {
  const g = stMasterGraph; if (!g) return;
  const m = studioState.mutes;
  const R = studioState.rhythm;
  const root = ST_KEYS[studioState.key] || 261.63;
  const prog = ST_PROGS[studioState.prog] || [0, 0, 0, 0];
  const chordRoot = prog[Math.floor(step / 4) % prog.length];

  if (!m.kick && R.kick[step]) stKick(at, step % 4 === 0 ? 0.9 : 0.75);
  if (!m.snare && R.snare[step]) stSnare(at, 0.7);
  if (!m.hat && R.hat[step]) stHat(at, step % 2 === 0 ? 0.5 : 0.32);
  if (!m.bass && R.bass[step]) stTone(root / 4 * Math.pow(2, chordRoot / 12), at, 0.26, "triangle", 0.5, 2200);
  if (!m.chord && R.chord[step]) stChord(root, chordRoot, at);
  if (!m.melody && studioState.melody[step] != null) {
    const deg = ST_MELODY_ROWS[studioState.melody[step]].deg;
    stTone(root * Math.pow(2, deg / 12), at, 0.42, "sine", 0.42);
    stTone(root * Math.pow(2, deg / 12) * 2, at, 0.3, "triangle", 0.07);
  }
}

function stBuildMaster() {
  const ctx = stCtx; if (!ctx) return;
  if (stMasterGraph) { try { stMasterGraph.nodes.forEach(n => n.disconnect()); } catch (_) {} }
  const input = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  comp.threshold.value = -18; comp.ratio.value = 4;
  comp.connect(master).connect(ctx.destination);
  const nodes = [input, comp, master];
  const eff = studioState.effect;
  if (eff === 1) { // 现场：延时混响
    const dry = ctx.createGain(), delay = ctx.createDelay(0.8), fb = ctx.createGain(), wet = ctx.createGain();
    dry.gain.value = 0.82; delay.delayTime.value = 0.25; fb.gain.value = 0.26; wet.gain.value = 0.34;
    input.connect(dry).connect(comp);
    input.connect(delay).connect(wet).connect(comp);
    delay.connect(fb).connect(delay);
    nodes.push(dry, delay, fb, wet);
  } else if (eff === 2) { // 磁带：低通 + 暖色
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3200; lp.Q.value = 0.5;
    input.connect(lp).connect(comp);
    nodes.push(lp);
  } else {
    input.connect(comp);
  }
  stMasterGraph = { input, master, nodes };
}

/* 合成基元 */
function stTone(freq, at, dur, type, vol, lp) {
  const ctx = stCtx, g = stMasterGraph; if (!ctx || !g) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  const end = at + Math.max(0.08, dur);
  osc.type = type; osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  if (lp) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp;
    osc.connect(f).connect(gain).connect(g.input);
  } else {
    osc.connect(gain).connect(g.input);
  }
  osc.start(at); osc.stop(end + 0.03);
}

function stChord(root, chordRoot, at) {
  const quality = ST_CHORD_QUALITY[chordRoot] || "maj";
  const intervals = quality === "min" ? [0, 3, 7] : [0, 4, 7];
  intervals.forEach((iv, i) =>
    stTone(root / 2 * Math.pow(2, (chordRoot + iv) / 12), at, 0.5, i === 0 ? "triangle" : "sine", 0.12));
}

function stKick(at, vol) {
  const ctx = stCtx, g = stMasterGraph; if (!ctx || !g) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, at);
  osc.frequency.exponentialRampToValueAtTime(46, at + 0.14);
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
  osc.connect(gain).connect(g.input);
  osc.start(at); osc.stop(at + 0.22);
}

function stSnare(at, vol) {
  const ctx = stCtx, g = stMasterGraph; if (!ctx || !g) return;
  const len = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buf; f.type = "highpass"; f.frequency.value = 1700;
  gain.gain.value = vol;
  src.connect(f).connect(gain).connect(g.input);
  src.start(at);
  // 主体音
  const osc = ctx.createOscillator(), og = ctx.createGain();
  osc.type = "triangle"; osc.frequency.setValueAtTime(180, at);
  og.gain.setValueAtTime(vol * 0.5, at);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  osc.connect(og).connect(g.input);
  osc.start(at); osc.stop(at + 0.13);
}

function stHat(at, vol) {
  const ctx = stCtx, g = stMasterGraph; if (!ctx || !g) return;
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buf; f.type = "highpass"; f.frequency.value = 6000;
  gain.gain.value = vol;
  src.connect(f).connect(gain).connect(g.input);
  src.start(at);
}

/* 停播时点格子的即时试听 */
function stPreviewStep(key, step) {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  if (!stCtx) stCtx = new Ctor();
  stCtx.resume?.();
  if (!stMasterGraph) stBuildMaster();
  const at = stCtx.currentTime + 0.01;
  const root = ST_KEYS[studioState.key] || 261.63;
  const chordRoot = (ST_PROGS[studioState.prog] || [0])[Math.floor(step / 4) % 4] || 0;
  if (!studioState.rhythm[key][step]) return;
  if (key === "kick") stKick(at, 0.85);
  else if (key === "snare") stSnare(at, 0.7);
  else if (key === "hat") stHat(at, 0.45);
  else if (key === "bass") stTone(root / 4 * Math.pow(2, chordRoot / 12), at, 0.26, "triangle", 0.5, 2200);
  else if (key === "chord") stChord(root, chordRoot, at);
  if (stMasterGraph) stMasterGraph.master.gain.setTargetAtTime(0.9, at, 0.01);
}

function stPreviewMel(step, row) {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  if (!stCtx) stCtx = new Ctor();
  stCtx.resume?.();
  if (!stMasterGraph) stBuildMaster();
  const at = stCtx.currentTime + 0.01;
  const root = ST_KEYS[studioState.key] || 261.63;
  const deg = ST_MELODY_ROWS[row].deg;
  stTone(root * Math.pow(2, deg / 12), at, 0.4, "sine", 0.42);
  if (stMasterGraph) stMasterGraph.master.gain.setTargetAtTime(0.9, at, 0.01);
}

/* ---------------- 播放头 ---------------- */

function stPlayheadLoop() {
  const tick = () => {
    if (!studioState.playing) return;
    const now = stCtx.currentTime;
    let cur = null;
    while (stQueue.length && stQueue[0].time <= now) cur = stQueue.shift().step;
    if (cur != null && cur !== studioState.step) {
      studioState.step = cur;
      stPaintPlayhead(cur);
    }
    stRaf = requestAnimationFrame(tick);
  };
  stRaf = requestAnimationFrame(tick);
}

function stPaintPlayhead(step) {
  document.querySelectorAll(".st-playcol").forEach(el => el.classList.remove("st-playcol"));
  document.querySelectorAll(`[data-step="${step}"]`).forEach(el => el.classList.add("st-playcol"));
}

function stClearPlayhead() {
  document.querySelectorAll(".st-playcol").forEach(el => el.classList.remove("st-playcol"));
}

/* Esc 关闭；切出页面自动停。 */
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && $("#studio")?.classList.contains("show")) closeStudio();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && studioState.playing) stStop();
});
