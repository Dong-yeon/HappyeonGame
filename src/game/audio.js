/**
 * 절차적 오디오 엔진 — 외부 음원 파일 없이 Web Audio API 로 효과음·BGM 을 합성한다.
 *
 * 도트(픽셀아트)를 코드로 생성하듯, 사운드도 오실레이터/노이즈 + 엔벨로프로 즉석 합성.
 * 브라우저 자동재생 정책 때문에 최초 사용자 제스처(클릭/키/터치)에서 오디오를 깨운다.
 * 음소거/볼륨은 localStorage 에 저장되고, 설정 UI 는 subscribe 로 상태를 받는다.
 */

const STORAGE_KEY = 'yokai.audio.v1';
const hasWindow = typeof window !== 'undefined';
const AC = hasWindow && (window.AudioContext || window.webkitAudioContext);

let ctx = null;
let master = null; // 전체 볼륨/음소거
let sfxBus = null; // 효과음 버스
let bgmBus = null; // BGM 버스 (효과음보다 낮게)

let listeners = new Set();
let bgmTimer = null;
let bgmStep = 0;
let nextNoteTime = 0;
let lastHit = 0; // 타격음 스팸 방지용 throttle

// 저장된 설정 복원
let state = { muted: false, volume: 0.7, ready: false };
if (hasWindow) {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (s) {
      state.muted = !!s.muted;
      state.volume = typeof s.volume === 'number' ? Math.min(1, Math.max(0, s.volume)) : 0.7;
    }
  } catch (e) {
    /* 무시 */
  }
}

function emit() {
  const snap = { ...state };
  listeners.forEach((cb) => cb(snap));
}

function persist() {
  if (!hasWindow) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: state.muted, volume: state.volume }));
  } catch (e) {
    /* 무시 */
  }
}

/** 마스터 게인 = 음소거면 0, 아니면 volume */
function applyGain() {
  if (!master) return;
  const g = state.muted ? 0.0001 : Math.max(0.0001, state.volume);
  master.gain.setTargetAtTime(g, ctx.currentTime, 0.02);
}

/** 오디오 그래프 구성 (최초 1회) */
function ensureGraph() {
  if (ctx || !AC) return ctx;
  ctx = new AC();
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  bgmBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  bgmBus.gain.value = 0.32; // BGM 은 은은하게
  sfxBus.connect(master);
  bgmBus.connect(master);
  master.connect(ctx.destination);
  applyGain();
  return ctx;
}

// ===== 합성 프리미티브 =====

/** 오실레이터 1개 (엔벨로프 + 선택적 피치 슬라이드) */
function tone({ freq, dur = 0.15, type = 'sine', gain = 0.3, slideTo, when = 0, bus = sfxBus }) {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.01, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** 노이즈 버스트 (필터 통과) — 타격/폭발감 */
function noise({ dur = 0.1, gain = 0.3, when = 0, freq = 1200, filter = 'lowpass', bus = sfxBus }) {
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = filter;
  filt.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur);
}

// ===== 효과음 정의 (name → 합성 레시피) =====
const RECIPES = {
  // 일반 공격 타격 — 짧고 가벼운 타격 + 톤 블립 (피치 랜덤으로 단조로움 방지)
  hit() {
    const p = 620 + Math.random() * 160;
    noise({ dur: 0.05, gain: 0.18, freq: 2600, filter: 'highpass' });
    tone({ freq: p, dur: 0.06, type: 'square', gain: 0.12, slideTo: p * 0.6 });
  },
  // 포식(처치) — 아래로 떨어지는 "꿀꺽" + 저역 노이즈
  kill() {
    tone({ freq: 300, dur: 0.16, type: 'sawtooth', gain: 0.16, slideTo: 110 });
    noise({ dur: 0.12, gain: 0.14, freq: 900 });
  },
  // 골드 획득 — 밝은 두 음 (동전)
  gold() {
    tone({ freq: 988, dur: 0.07, type: 'triangle', gain: 0.14 });
    tone({ freq: 1319, dur: 0.1, type: 'triangle', gain: 0.13, when: 0.06 });
  },
  // 레벨업 — 상승 아르페지오
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.16, when: i * 0.08 }));
  },
  // 스킬 발동 — 하강 지빙(zap)
  skill() {
    tone({ freq: 880, dur: 0.22, type: 'sawtooth', gain: 0.16, slideTo: 180 });
    tone({ freq: 440, dur: 0.22, type: 'square', gain: 0.08, slideTo: 90 });
  },
  // 피격 — 둔탁한 저역 타격
  hurt() {
    tone({ freq: 180, dur: 0.16, type: 'sawtooth', gain: 0.18, slideTo: 70 });
    noise({ dur: 0.1, gain: 0.12, freq: 500 });
  },
  // 진화 — 상승 팡파레(3화음 아르페지오 + 반짝임)
  evolve() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.16, when: i * 0.09 }));
    tone({ freq: 2093, dur: 0.5, type: 'sine', gain: 0.06, when: 0.4 });
  },
  // 승천(최종 진화) — 더 웅장한 팡파레
  ascend() {
    [392, 523, 659, 784, 1047, 1568].forEach((f, i) =>
      tone({ freq: f, dur: 0.6, type: 'triangle', gain: 0.17, when: i * 0.1 }));
    tone({ freq: 2637, dur: 0.7, type: 'sine', gain: 0.07, when: 0.55 });
    noise({ dur: 0.5, gain: 0.05, freq: 4000, filter: 'highpass', when: 0.5 });
  },
  // 알 부화 — 통통 튀는 상승 블립
  hatch() {
    [440, 587, 784].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'sine', gain: 0.16, when: i * 0.1 }));
  },
  // 보스 처치 — 저역 폭발(붐)
  boss() {
    tone({ freq: 120, dur: 0.5, type: 'sine', gain: 0.24, slideTo: 40 });
    noise({ dur: 0.4, gain: 0.2, freq: 700 });
    tone({ freq: 200, dur: 0.3, type: 'sawtooth', gain: 0.1, slideTo: 60, when: 0.02 });
  },
  // 챕터 클리어 — 승리 징글
  clear() {
    [659, 784, 988, 1319].forEach((f, i) => tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.16, when: i * 0.11 }));
  },
  // 전생(환생) — 신비로운 하강 반짝임
  rebirth() {
    [1319, 988, 784, 659, 523].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'sine', gain: 0.14, when: i * 0.1 }));
  },
  // UI 클릭 — 아주 짧은 틱
  click() {
    tone({ freq: 660, dur: 0.03, type: 'square', gain: 0.07 });
  },
};

// ===== BGM — 야경 분위기의 은은한 오음계 루프 =====
// A 단조 오음계 근처 음 + 저역 드론. rest(0) 를 섞어 성글게 재생.
const BGM_SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
const BGM_MOTIF = [0, 2, 4, 0, 3, 2, 0, 4, 6, 4, 3, 1, 0, 0, 2, 0];
const BGM_REST = [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0]; // 1이면 쉼표
const BGM_BEAT = 0.42; // 한 스텝 길이(초)

function scheduleBgmNote(step, when) {
  const i = step % BGM_MOTIF.length;
  // 4스텝마다 저역 드론(패드)로 배경 두께
  if (i % 4 === 0) {
    tone({ freq: 110, dur: BGM_BEAT * 4, type: 'sine', gain: 0.07, when, bus: bgmBus });
  }
  if (BGM_REST[i]) return;
  const f = BGM_SCALE[BGM_MOTIF[i]];
  tone({ freq: f, dur: BGM_BEAT * 1.6, type: 'triangle', gain: 0.12, when, bus: bgmBus });
  tone({ freq: f * 2, dur: BGM_BEAT * 0.9, type: 'sine', gain: 0.03, when, bus: bgmBus }); // 옥타브 반짝임
}

function bgmScheduler() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + 0.2) {
    scheduleBgmNote(bgmStep, nextNoteTime - ctx.currentTime);
    nextNoteTime += BGM_BEAT;
    bgmStep += 1;
  }
}

function startBgm() {
  if (bgmTimer || !ctx) return;
  nextNoteTime = ctx.currentTime + 0.1;
  bgmScheduler();
  bgmTimer = setInterval(bgmScheduler, 60);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

/** 최초 사용자 제스처에서 오디오 컨텍스트를 깨우고 BGM 시작 */
function unlock() {
  if (!AC) return;
  ensureGraph();
  if (ctx.state === 'suspended') ctx.resume();
  if (!state.ready) {
    state.ready = true;
    emit();
  }
  if (!state.muted) startBgm();
}

// 전역 제스처 리스너 — 최초 상호작용에서 unlock, 버튼 클릭엔 틱
if (hasWindow) {
  const kick = () => unlock();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, kick, { once: false, passive: true }));
  // UI 버튼 클릭음 (위임)
  window.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('button')) audio.sfx('click');
    },
    { passive: true },
  );
}

export const audio = {
  /** 효과음 재생 (음소거/미준비 시 무시) */
  sfx(name) {
    if (!AC || !state.ready || state.muted) return;
    const recipe = RECIPES[name];
    if (!recipe) return;
    if (name === 'hit') {
      const now = ctx.currentTime;
      if (now - lastHit < 0.05) return; // 타격음 throttle
      lastHit = now;
    }
    try {
      recipe();
    } catch (e) {
      /* 오디오 실패는 게임에 영향 없음 */
    }
  },

  getState() {
    return { ...state };
  },

  subscribe(cb) {
    listeners.add(cb);
    cb({ ...state });
    return () => listeners.delete(cb);
  },

  setMuted(m) {
    state.muted = !!m;
    applyGain();
    if (state.muted) stopBgm();
    else if (state.ready) startBgm();
    persist();
    emit();
  },

  toggleMute() {
    this.setMuted(!state.muted);
  },

  setVolume(v) {
    state.volume = Math.min(1, Math.max(0, v));
    applyGain();
    persist();
    emit();
  },

  unlock,
};
