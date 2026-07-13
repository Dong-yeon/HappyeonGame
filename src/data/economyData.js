/**
 * 경제/메타 데이터 모듈 — 골드 / 업그레이드 / 오프라인 보상
 *
 * playerData·stageData 와 동일한 순수 모듈 + 구독 패턴.
 * 프로토타입 단계에서는 localStorage 로 영속화하고,
 * 추후 Spring Boot 연동 시 loadFromServer / saveToServer 만 교체하면 된다.
 *
 * 업그레이드 효과(공격력·체력 보너스, 골드 배율)는 이 모듈이 "값"으로만 계산하고,
 * 실제 스탯 반영은 playerData 가 이 모듈을 구독해서 처리한다 (일방 의존: playerData → economyData).
 */
import { GOLD } from '../game/constants.js';

const STORAGE_KEY = 'gunungrok.economy.v1';

/** 업그레이드 정의 — 이름 / 비용 곡선 / 레벨당 효과 */
export const UPGRADES = {
  attack: {
    name: '공격력 강화',
    baseCost: 25,
    costGrowth: 1.55,
    perLevel: 4, // 레벨당 공격력 +4
    effectText: (lv) => `공격력 +${lv * 4}`,
  },
  maxHp: {
    name: '체력 강화',
    baseCost: 20,
    costGrowth: 1.5,
    perLevel: 30, // 레벨당 최대 HP +30
    effectText: (lv) => `최대 HP +${lv * 30}`,
  },
  goldGain: {
    name: '골드 획득량',
    baseCost: 30,
    costGrowth: 1.6,
    perLevel: 0.15, // 레벨당 골드 +15%
    effectText: (lv) => `골드 획득 +${lv * 15}%`,
  },
};

function upgradeCost(key, level) {
  const def = UPGRADES[key];
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, level));
}

export function createEconomyData() {
  const listeners = new Set();

  const state = {
    gold: 0,
    upgrades: { attack: 0, maxHp: 0, goldGain: 0 },
    goldPerSec: 0, // 최근 골드 획득 속도(EMA) — 오프라인 보상 계산에 사용
    pendingOfflineReward: null, // { gold, seconds } — 수령 대기 중인 오프라인 보상
  };

  let lastEarnTime = null; // 골드 획득 속도 추정용

  // ===== 영속화 (localStorage) =====
  function persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          gold: state.gold,
          upgrades: state.upgrades,
          goldPerSec: state.goldPerSec,
          lastSeen: Date.now(),
        }),
      );
    } catch (e) {
      /* 저장 실패는 무시 (프로토타입) */
    }
  }

  function load() {
    if (typeof localStorage === 'undefined') return;
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      saved = null;
    }
    if (!saved) return;

    state.gold = saved.gold ?? 0;
    state.upgrades = { attack: 0, maxHp: 0, goldGain: 0, ...(saved.upgrades || {}) };
    state.goldPerSec = saved.goldPerSec ?? 0;

    // 오프라인 보상 계산: 마지막 접속 이후 경과 시간 × 획득 속도 × 효율
    if (saved.lastSeen && state.goldPerSec > 0) {
      const elapsedSec = (Date.now() - saved.lastSeen) / 1000;
      if (elapsedSec > GOLD.OFFLINE_MIN_SEC) {
        const capped = Math.min(elapsedSec, GOLD.OFFLINE_CAP_HOURS * 3600);
        const reward = Math.floor(state.goldPerSec * capped * GOLD.OFFLINE_EFFICIENCY);
        if (reward > 0) {
          state.pendingOfflineReward = { gold: reward, seconds: Math.floor(capped) };
        }
      }
    }
  }

  function emit() {
    const snapshot = {
      ...state,
      upgrades: { ...state.upgrades },
      pendingOfflineReward: state.pendingOfflineReward ? { ...state.pendingOfflineReward } : null,
    };
    listeners.forEach((fn) => fn(snapshot));
  }

  // 초기 로드 (모듈 생성 시 1회)
  load();

  const api = {
    getState() {
      return {
        ...state,
        upgrades: { ...state.upgrades },
        pendingOfflineReward: state.pendingOfflineReward ? { ...state.pendingOfflineReward } : null,
      };
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(api.getState());
      return () => listeners.delete(fn);
    },

    // ===== 골드 =====

    /** 골드 획득 (획득 속도 EMA 갱신 → 오프라인 보상 정확도 향상) */
    gainGold(amount) {
      if (amount <= 0) return;
      const now = Date.now();
      if (lastEarnTime !== null) {
        const dt = (now - lastEarnTime) / 1000;
        if (dt > 0 && dt < 60) {
          const inst = amount / dt;
          state.goldPerSec = state.goldPerSec === 0 ? inst : state.goldPerSec * 0.85 + inst * 0.15;
        }
      }
      lastEarnTime = now;
      state.gold += amount;
      persist();
      emit();
    },

    /** 현재 골드 획득 배율 (업그레이드 반영) */
    getGoldMultiplier() {
      return 1 + state.upgrades.goldGain * UPGRADES.goldGain.perLevel;
    },

    // ===== 업그레이드 =====

    /** 스탯 보너스 (playerData 가 구독해서 반영) */
    getBonuses() {
      return {
        attack: state.upgrades.attack * UPGRADES.attack.perLevel,
        maxHp: state.upgrades.maxHp * UPGRADES.maxHp.perLevel,
      };
    },

    /** 특정 업그레이드의 다음 레벨 비용 */
    getCost(key) {
      return upgradeCost(key, state.upgrades[key]);
    },

    /** UI 표시용 업그레이드 목록 */
    getUpgradeList() {
      return Object.keys(UPGRADES).map((key) => {
        const level = state.upgrades[key];
        const cost = upgradeCost(key, level);
        return {
          key,
          name: UPGRADES[key].name,
          level,
          cost,
          effect: UPGRADES[key].effectText(level),
          nextEffect: UPGRADES[key].effectText(level + 1),
          affordable: state.gold >= cost,
        };
      });
    },

    /** 업그레이드 구매 (성공 시 true) */
    buyUpgrade(key) {
      if (!(key in state.upgrades)) return false;
      const cost = upgradeCost(key, state.upgrades[key]);
      if (state.gold < cost) return false;
      state.gold -= cost;
      state.upgrades[key] += 1;
      persist();
      emit();
      return true;
    },

    // ===== 오프라인 보상 =====

    /** 대기 중인 오프라인 보상 수령 */
    claimOfflineReward() {
      if (!state.pendingOfflineReward) return 0;
      const amount = state.pendingOfflineReward.gold;
      state.gold += amount;
      state.pendingOfflineReward = null;
      persist();
      emit();
      return amount;
    },

    /** 접속 종료 시점 기록 (오프라인 계산 기준) */
    markSeen() {
      persist();
    },

    // ===== 백엔드 연동 지점 (Spring Boot) =====

    /** GET /api/economy — 서버에서 골드/업그레이드 불러오기 */
    async loadFromServer() {
      // TODO: localStorage 대신 서버 응답으로 state 채우고 오프라인 계산
    },

    /** PUT /api/economy — 서버에 저장 */
    async saveToServer() {
      // TODO: fetch('/api/economy', { method: 'PUT', body: JSON.stringify(state) })
    },
  };

  return api;
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const economyData = createEconomyData();

// 탭을 닫거나 숨길 때 접속 시점을 기록 (오프라인 보상 기준점)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => economyData.markSeen());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') economyData.markSeen();
  });
}
