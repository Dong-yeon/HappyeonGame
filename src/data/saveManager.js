/**
 * 저장 오케스트레이터 — 세 데이터 모듈(player/stage/economy)의 서버 저장/복원을 총괄.
 *
 * 부팅 시 GET /api/save 로 전체 상태를 복원하고, 변경/주기/종료 시 PUT /api/save 로 저장한다.
 * 서버에 연결할 수 없으면 local 모드로 폴백 — economyData 가 localStorage 로 자체 영속화하므로
 * 백엔드 없이도 게임은 동작한다 (프론트 단독 실행 가능).
 */
import { playerData } from './playerData.js';
import { stageData } from './stageData.js';
import { economyData } from './economyData.js';
import { evolutionData } from './evolutionData.js';
import { careData } from './careData.js';
import { rebirthData } from './rebirthData.js';
import { expeditionData } from './expeditionData.js';
import { retentionData } from './retentionData.js';

const ENDPOINT = '/api/save';
const USER_ID = 'local'; // 단일 플레이어 프로토타입 (멀티유저는 추후 인증 연동)
const LOCAL_KEY = 'yokai.save.v1'; // 백엔드 미기동 시 전체 저장(itch 등 정적 배포)
const DEBOUNCE_MS = 2000;
const INTERVAL_MS = 15000;

let mode = 'local'; // 'server' | 'local'
let saveTimer = null;
let resetting = false; // 초기화 중에는 저장 억제

function gather() {
  return {
    player: playerData.getSaveState(),
    stage: stageData.getSaveState(),
    economy: economyData.getSaveState(),
    evolution: evolutionData.getSaveState(),
    care: careData.getSaveState(),
    rebirth: rebirthData.getSaveState(),
    expedition: expeditionData.getSaveState(),
    retention: retentionData.getSaveState(),
  };
}

/** 불러온 전체 상태를 각 모듈에 복원 (서버·로컬 공통) */
function applyAll(data) {
  if (!data) return;
  evolutionData.loadSaveState(data.evolution); // 스탯 배율 먼저 복원 (playerData 가 참조)
  careData.loadSaveState(data.care); // 훈련 보너스도 먼저 복원
  rebirthData.loadSaveState(data.rebirth); // 전생 배율도 먼저 복원
  expeditionData.loadSaveState(data.expedition); // 제단 배율도 먼저 복원
  retentionData.loadSaveState(data.retention);
  playerData.loadSaveState(data.player);
  stageData.loadSaveState(data.stage);
  economyData.loadSaveState(data.economy);
  economyData.computeOffline(data.lastSeen); // 기록된 lastSeen 기준 오프라인 보상
}

/** 로컬(localStorage)에 전체 상태 저장 — 백엔드 없이도 진행이 영속화되도록 */
function saveLocal() {
  if (resetting || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...gather(), lastSeen: Date.now() }));
  } catch (e) {
    /* 용량 초과 등은 무시 */
  }
}

/** 부팅 시 로컬 전체 저장 복원 */
function loadLocal() {
  if (typeof localStorage === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (data) applyAll(data);
  } catch (e) {
    /* 손상된 저장은 무시하고 신규 시작 */
  }
}

/** 즉시 저장 (server → PUT / local → localStorage) */
async function save() {
  if (resetting) return;
  if (mode === 'local') {
    saveLocal();
    return;
  }
  try {
    await fetch(`${ENDPOINT}?userId=${USER_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gather()),
    });
  } catch (e) {
    /* 일시적 네트워크 오류는 무시 — 다음 주기/변경에 재시도 */
  }
}

function scheduleSave() {
  if (resetting || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, DEBOUNCE_MS);
}

/** 탭 종료 시 마지막 저장 */
function saveOnExit() {
  if (resetting) return;
  if (mode === 'local') {
    saveLocal();
    return;
  }
  try {
    const blob = new Blob([JSON.stringify(gather())], { type: 'application/json' });
    navigator.sendBeacon(`${ENDPOINT}?userId=${USER_ID}`, blob);
  } catch (e) {
    /* 무시 */
  }
}

function startAutoSave() {
  playerData.subscribe(scheduleSave);
  stageData.subscribe(scheduleSave);
  economyData.subscribe(scheduleSave);
  evolutionData.subscribe(scheduleSave);
  rebirthData.subscribe(scheduleSave);
  expeditionData.subscribe(scheduleSave);
  retentionData.subscribe(scheduleSave);
  // careData 는 구독하지 않음: 포만감 감소(tick)마다 저장되면 과도함.
  // 훈련→playerData, 먹이→economy 변경으로 저장이 걸리고, 주기 저장(15s)이 백업.
  if (typeof window !== 'undefined') {
    setInterval(save, INTERVAL_MS);
    window.addEventListener('beforeunload', saveOnExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveOnExit();
    });
  }
}

export const saveManager = {
  /** 현재 저장 모드 ('server' | 'local') */
  getMode() {
    return mode;
  },

  /**
   * 부팅 시 1회 호출 — 서버에서 저장 데이터를 불러와 각 모듈에 복원하고 자동 저장을 시작한다.
   * 서버 응답: 204(신규 플레이어) / 200(저장 데이터 + lastSeen) / 실패(local 폴백).
   */
  async init() {
    try {
      const res = await fetch(`${ENDPOINT}?userId=${USER_ID}`);
      if (res.status === 204) {
        mode = 'server'; // 신규 플레이어 — 복원할 데이터 없음
      } else if (res.ok) {
        applyAll(await res.json()); // 서버 저장 복원
        mode = 'server';
      } else {
        mode = 'local';
      }
    } catch (e) {
      mode = 'local'; // 백엔드 미기동 — localStorage 전체 저장 폴백
    }
    if (mode === 'local') loadLocal();
    startAutoSave();
    return mode;
  },

  /**
   * 저장 데이터 전체 초기화 (설정 메뉴). 로컬 저장 키를 지우고,
   * 서버 모드면 서버 저장도 비운 뒤 페이지를 새로고침해 기본값으로 재시작한다.
   */
  async resetAll() {
    resetting = true;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (mode === 'server') {
      try {
        await fetch(`${ENDPOINT}?userId=${USER_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      } catch (e) {
        /* 무시 */
      }
    }
    if (typeof localStorage !== 'undefined') {
      // 게임 진행 데이터만 삭제 (사운드 설정 yokai.audio.v1 은 유지)
      [LOCAL_KEY, 'gunungrok.economy.v1', 'yokai.retention.v1'].forEach((k) => localStorage.removeItem(k));
    }
    if (typeof window !== 'undefined') window.location.reload();
  },

  /** 수동 저장 트리거 (필요 시) */
  save,
};
