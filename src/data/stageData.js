/**
 * 스테이지 진행 상태 모듈 (현재 스테이지 / 돌파 수 / 보스 상태)
 *
 * playerData 와 동일하게 Phaser·React 어디에도 의존하지 않는 순수 모듈.
 * 구독(subscribe)으로 HUD가 진행 상황을 받아 표시한다.
 * 추후 Spring Boot 연동 시 loadFromServer / saveToServer 만 채우면 된다.
 */
import { getStageConfig } from '../game/stages.js';
import { CHAPTER } from '../game/constants.js';

export function createStageData() {
  const listeners = new Set();

  const state = {
    stageIndex: 0, // 0-base
    stageNumber: 1,
    stageName: '',
    kills: 0, // 현재 스테이지에서 처치한 일반 적 수
    killsToClear: 8,
    bossActive: false, // 챕터 보스 등장 중 여부
    chapter: 1, // 현재 챕터 (1-base)
    stageInChapter: 1, // 챕터 내 스테이지 번호 (1..SIZE)
    isChapterBossStage: false, // 이번 스테이지가 챕터 보스 관문인지
  };

  function syncStage() {
    const cfg = getStageConfig(state.stageIndex);
    state.stageNumber = cfg.number;
    state.stageName = cfg.name;
    state.killsToClear = cfg.killsToClear;
    state.chapter = Math.floor(state.stageIndex / CHAPTER.SIZE) + 1;
    state.stageInChapter = (state.stageIndex % CHAPTER.SIZE) + 1;
    state.isChapterBossStage = (state.stageIndex + 1) % CHAPTER.SIZE === 0;
  }

  function advance() {
    state.stageIndex += 1;
    state.kills = 0;
    syncStage();
  }

  syncStage();

  function emit() {
    const snapshot = { ...state };
    listeners.forEach((fn) => fn(snapshot));
  }

  return {
    getState() {
      return { ...state };
    },

    /** 현재 스테이지의 밸런스 설정 (적 배율 등) */
    getConfig() {
      return getStageConfig(state.stageIndex);
    },

    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },

    /**
     * 일반 적 처치 등록. 목표 수 도달 시:
     *  - 챕터 보스 관문(10스테이지째) → 'boss' (챕터 보스 소환)
     *  - 그 외 → 'advance' (다음 스테이지로 즉시 진행, 보스 없음)
     *  - 그 외 진행 없음 → null
     * 챕터 보스 등장 중에는 집계하지 않는다.
     */
    registerKill() {
      if (state.bossActive) return null;
      state.kills += 1;
      if (state.kills >= state.killsToClear) {
        if (state.isChapterBossStage) {
          state.bossActive = true;
          emit();
          return 'boss';
        }
        advance();
        emit();
        return 'advance';
      }
      emit();
      return null;
    },

    /** 챕터 보스 처치 → 다음 챕터로 진행 */
    clearStage() {
      advance();
      state.bossActive = false;
      emit();
    },

    /** 처음부터 다시 (사망 패널티 등에 사용 가능) */
    reset() {
      state.stageIndex = 0;
      state.kills = 0;
      state.bossActive = false;
      syncStage();
      emit();
    },

    // ===== 저장/복원 (saveManager 가 서버 I/O 를 담당) =====

    /** 서버 저장용 직렬화 (보스 상태는 일시적이므로 저장 안 함) */
    getSaveState() {
      return {
        stageIndex: state.stageIndex,
        kills: state.kills,
      };
    },

    /** 서버에서 받은 상태로 복원 */
    loadSaveState(s) {
      if (!s) return;
      state.stageIndex = s.stageIndex ?? 0;
      state.bossActive = false;
      syncStage();
      // 돌파 수는 목표 미만으로 클램프 (복원 직후 즉시 보스 소환 방지)
      state.kills = Math.min(s.kills ?? 0, Math.max(0, state.killsToClear - 1));
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const stageData = createStageData();
