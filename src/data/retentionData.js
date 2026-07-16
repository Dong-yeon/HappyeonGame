/**
 * 리텐션 메타 데이터 모듈 — 일일 미션 / 업적(도전과제) / 출석 보상.
 *
 * economyData 와 동일한 순수 모듈 + 구독 패턴 + localStorage 자체 영속화(로컬 모드 대비)
 * + saveManager 용 getSaveState/loadSaveState(서버 모드).
 *
 * 보상은 "무엇을 줄지"만 서술(gold/materials/essence)해 반환하고, 실제 지급은 호출부가
 * economyData/evolutionData 로 처리한다 → 이 모듈은 다른 데이터 모듈에 의존하지 않는다.
 */

const STORAGE_KEY = 'yokai.retention.v1';
const DAY_MS = 86400000;

// ===== 일일 미션 풀 (매일 3개 순환 선택) =====
export const MISSION_POOL = [
  { id: 'kill', metric: 'kills', goal: 40, name: '인간 40 처치', reward: { gold: 300 } },
  { id: 'essence', metric: 'essence', goal: 250, name: '정기 250 흡수', reward: { materials: 8 } },
  { id: 'gold', metric: 'gold', goal: 500, name: '골드 500 획득', reward: { essence: 120 } },
  { id: 'boss', metric: 'boss', goal: 1, name: '챕터 보스 1 처치', reward: { materials: 15 } },
  { id: 'exped', metric: 'expeditions', goal: 1, name: '원정 1회 보내기', reward: { gold: 250 } },
  { id: 'evolve', metric: 'evolves', goal: 1, name: '진화 1회', reward: { essence: 150 } },
];

// ===== 출석 보상 (7일 주기, 7일차 크게) =====
export const ATTENDANCE = [
  { gold: 200 },
  { essence: 100 },
  { gold: 400 },
  { materials: 10 },
  { essence: 250 },
  { gold: 800 },
  { materials: 30, essence: 300 },
];

// ===== 업적(영구 도전과제) — metric 이 threshold 도달 시 보상 =====
export const ACHIEVEMENTS = [
  { id: 'lv10', metric: 'level', goal: 10, name: '성장의 시작', desc: '레벨 10 도달', reward: { gold: 300 } },
  { id: 'lv30', metric: 'level', goal: 30, name: '무르익은 요력', desc: '레벨 30 도달', reward: { gold: 1500 } },
  { id: 'lv60', metric: 'level', goal: 60, name: '경지에 이르다', desc: '레벨 60 도달', reward: { materials: 40 } },
  { id: 'ch3', metric: 'chapter', goal: 3, name: '마을을 넘어', desc: '챕터 3 진입', reward: { materials: 12 } },
  { id: 'ch5', metric: 'chapter', goal: 5, name: '관군 격파', desc: '챕터 5 진입', reward: { materials: 25 } },
  { id: 'ch10', metric: 'chapter', goal: 10, name: '천계의 문', desc: '챕터 10 진입', reward: { materials: 60, essence: 500 } },
  { id: 'evo1', metric: 'discovered', goal: 5, name: '수집가', desc: '형태 5종 발견', reward: { gold: 500 } },
  { id: 'evo2', metric: 'discovered', goal: 15, name: '요괴 박사', desc: '형태 15종 발견', reward: { materials: 30 } },
  { id: 'evo3', metric: 'discovered', goal: 35, name: '요괴록 완성', desc: '전 형태 35종 발견', reward: { materials: 100, essence: 1000 } },
  { id: 'rb1', metric: 'rebirth', goal: 1, name: '첫 환생', desc: '전생 1회', reward: { essence: 300 } },
  { id: 'rb3', metric: 'rebirth', goal: 3, name: '윤회의 굴레', desc: '전생 3회', reward: { materials: 30 } },
  { id: 'rb5', metric: 'rebirth', goal: 5, name: '초월자', desc: '전생 5회', reward: { materials: 80 } },
  { id: 'kill100', metric: 'kills', goal: 100, name: '포식자', desc: '누적 100 처치', reward: { gold: 400 } },
  { id: 'kill1k', metric: 'kills', goal: 1000, name: '재앙', desc: '누적 1,000 처치', reward: { materials: 20 } },
  { id: 'boss10', metric: 'boss', goal: 10, name: '관문 파괴자', desc: '챕터 보스 10 처치', reward: { materials: 35 } },
];

function todayKey(now) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → epoch 일수 (미션 순환·연속 출석 판정) */
function dayNumber(key) {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

function pickMissions(dayNum) {
  const picks = [];
  for (let i = 0; picks.length < 3 && i < MISSION_POOL.length; i += 1) {
    const idx = (dayNum + i) % MISSION_POOL.length;
    if (!picks.includes(MISSION_POOL[idx].id)) picks.push(MISSION_POOL[idx].id);
  }
  return picks;
}

function emptyDaily() {
  return { kills: 0, essence: 0, gold: 0, boss: 0, expeditions: 0, evolves: 0 };
}

export function createRetentionData() {
  const listeners = new Set();

  const state = {
    // 누적/최고 기록 (업적 평가용)
    stats: { kills: 0, boss: 0, evolves: 0, expeditions: 0, gold: 0, essence: 0, level: 1, chapter: 1, rebirth: 0, discovered: 0 },
    // 일일 미션
    daily: { day: null, picks: [], counters: emptyDaily(), claimed: [] },
    // 출석
    attendance: { lastClaimDay: null, streak: 0, totalDays: 0 },
    // 업적 수령 목록
    achClaimed: [],
  };

  /** 날짜가 바뀌었으면 일일 미션 갱신 (반환: 갱신 여부) */
  function rollDaily(now) {
    const key = todayKey(now);
    if (state.daily.day === key) return false;
    state.daily = { day: key, picks: pickMissions(dayNumber(key)), counters: emptyDaily(), claimed: [] };
    return true;
  }

  function missionList() {
    return state.daily.picks
      .map((id) => MISSION_POOL.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => {
        const cur = state.daily.counters[m.metric] || 0;
        const done = cur >= m.goal;
        const claimed = state.daily.claimed.includes(m.id);
        return { ...m, progress: Math.min(cur, m.goal), done, claimed, claimable: done && !claimed };
      });
  }

  function achievementList() {
    return ACHIEVEMENTS.map((a) => {
      const cur = state.stats[a.metric] || 0;
      const done = cur >= a.goal;
      const claimed = state.achClaimed.includes(a.id);
      return { ...a, current: Math.min(cur, a.goal), done, claimed, claimable: done && !claimed };
    });
  }

  function attendanceInfo(now) {
    const key = todayKey(now);
    const canClaim = state.attendance.lastClaimDay !== key;
    // 오늘 수령 시 도달할 주기 일차 (미리보기)
    let nextStreak = 1;
    if (state.attendance.lastClaimDay) {
      const gap = dayNumber(key) - dayNumber(state.attendance.lastClaimDay);
      nextStreak = gap === 1 ? state.attendance.streak + 1 : 1;
    }
    const cycleDay = ((nextStreak - 1) % ATTENDANCE.length) + 1;
    return {
      canClaim,
      streak: state.attendance.streak,
      totalDays: state.attendance.totalDays,
      nextCycleDay: cycleDay,
      nextReward: ATTENDANCE[cycleDay - 1],
      cycle: ATTENDANCE,
    };
  }

  function snapshot() {
    const now = Date.now();
    rollDaily(now);
    const missions = missionList();
    const achievements = achievementList();
    const att = attendanceInfo(now);
    const claimable =
      (att.canClaim ? 1 : 0) +
      missions.filter((m) => m.claimable).length +
      achievements.filter((a) => a.claimable).length;
    return { missions, achievements, attendance: att, stats: { ...state.stats }, claimable };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  // ===== 영속화 (localStorage — 로컬 모드 대비) =====
  function serialize() {
    return {
      stats: { ...state.stats },
      daily: { ...state.daily, counters: { ...state.daily.counters }, picks: [...state.daily.picks], claimed: [...state.daily.claimed] },
      attendance: { ...state.attendance },
      achClaimed: [...state.achClaimed],
    };
  }

  function persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (e) {
      /* 무시 */
    }
  }

  function applyLoaded(s) {
    if (!s) return;
    state.stats = { ...state.stats, ...(s.stats || {}) };
    if (s.daily) {
      state.daily = {
        day: s.daily.day ?? null,
        picks: Array.isArray(s.daily.picks) ? [...s.daily.picks] : [],
        counters: { ...emptyDaily(), ...(s.daily.counters || {}) },
        claimed: Array.isArray(s.daily.claimed) ? [...s.daily.claimed] : [],
      };
    }
    if (s.attendance) {
      state.attendance = {
        lastClaimDay: s.attendance.lastClaimDay ?? null,
        streak: s.attendance.streak ?? 0,
        totalDays: s.attendance.totalDays ?? 0,
      };
    }
    state.achClaimed = Array.isArray(s.achClaimed) ? [...s.achClaimed] : [];
    rollDaily(Date.now());
  }

  function load() {
    if (typeof localStorage === 'undefined') return;
    try {
      applyLoaded(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (e) {
      /* 무시 */
    }
  }

  load();
  rollDaily(Date.now());

  /** 이벤트 기록 헬퍼 — 누적 + 일일 카운터 동시 증가 */
  function bump(metric, amount) {
    if (amount <= 0) return;
    rollDaily(Date.now());
    state.stats[metric] = (state.stats[metric] || 0) + amount;
    if (metric in state.daily.counters) state.daily.counters[metric] += amount;
    persist();
    emit();
  }

  const api = {
    getState() {
      return snapshot();
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(api.getState());
      return () => listeners.delete(fn);
    },

    // ===== 이벤트 기록 (GameScene / 컴포넌트에서 호출) =====
    recordKill() {
      bump('kills', 1);
    },
    recordGold(amount) {
      bump('gold', Math.round(amount));
    },
    recordEssence(amount) {
      bump('essence', Math.round(amount));
    },
    recordBoss() {
      bump('boss', 1);
    },
    recordEvolve() {
      bump('evolves', 1);
    },
    recordExpedition() {
      bump('expeditions', 1);
    },

    /** 최고 기록형 지표 갱신 (레벨/챕터/전생/도감) — 값이 갱신됐을 때만 emit */
    sync({ level, chapter, rebirth, discovered } = {}) {
      let changed = false;
      const set = (k, v) => {
        if (typeof v === 'number' && v > (state.stats[k] || 0)) {
          state.stats[k] = v;
          changed = true;
        }
      };
      set('level', level);
      set('chapter', chapter);
      set('rebirth', rebirth);
      set('discovered', discovered);
      if (changed) {
        persist();
        emit();
      }
    },

    // ===== 보상 수령 (성공 시 reward 객체 반환, 실패 시 null) =====
    claimMission(id) {
      rollDaily(Date.now());
      const m = missionList().find((x) => x.id === id);
      if (!m || !m.claimable) return null;
      state.daily.claimed.push(id);
      persist();
      emit();
      return m.reward;
    },

    claimAchievement(id) {
      const a = achievementList().find((x) => x.id === id);
      if (!a || !a.claimable) return null;
      state.achClaimed.push(id);
      persist();
      emit();
      return a.reward;
    },

    claimAttendance() {
      const now = Date.now();
      const key = todayKey(now);
      if (state.attendance.lastClaimDay === key) return null;
      const gap = state.attendance.lastClaimDay ? dayNumber(key) - dayNumber(state.attendance.lastClaimDay) : null;
      state.attendance.streak = gap === 1 ? state.attendance.streak + 1 : 1;
      state.attendance.lastClaimDay = key;
      state.attendance.totalDays += 1;
      const cycleDay = ((state.attendance.streak - 1) % ATTENDANCE.length) + 1;
      persist();
      emit();
      return ATTENDANCE[cycleDay - 1];
    },

    // ===== saveManager 용 직렬화/복원 =====
    getSaveState() {
      return serialize();
    },
    loadSaveState(s) {
      applyLoaded(s);
      persist();
      emit();
    },
  };

  return api;
}

export const retentionData = createRetentionData();
