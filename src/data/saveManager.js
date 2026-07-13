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

const ENDPOINT = '/api/save';
const USER_ID = 'local'; // 단일 플레이어 프로토타입 (멀티유저는 추후 인증 연동)
const DEBOUNCE_MS = 2000;
const INTERVAL_MS = 15000;

let mode = 'local'; // 'server' | 'local'
let saveTimer = null;

function gather() {
  return {
    player: playerData.getSaveState(),
    stage: stageData.getSaveState(),
    economy: economyData.getSaveState(),
  };
}

/** 서버에 즉시 저장 (server 모드에서만) */
async function save() {
  if (mode !== 'server') return;
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
  if (mode !== 'server' || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, DEBOUNCE_MS);
}

/** 탭 종료 시 마지막 저장 (sendBeacon 은 비동기 unload 에도 안전, POST 사용) */
function saveOnExit() {
  if (mode !== 'server') {
    economyData.markSeen(); // local 모드는 localStorage 에 접속 시각 기록
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
        const data = await res.json();
        playerData.loadSaveState(data.player);
        stageData.loadSaveState(data.stage);
        economyData.loadSaveState(data.economy);
        economyData.computeOffline(data.lastSeen); // 서버 기준 오프라인 보상
        mode = 'server';
      } else {
        mode = 'local';
      }
    } catch (e) {
      mode = 'local'; // 백엔드 미기동 — localStorage 폴백 (economyData 가 자체 로드)
    }
    startAutoSave();
    return mode;
  },

  /** 수동 저장 트리거 (필요 시) */
  save,
};
