/**
 * 원정 데이터 모듈 — 비활성 요괴를 원정 보내 재료를 시간당 수급 + 재료 제단(영구 강화).
 *
 * 현재 키우는(활성) 요괴는 전투 중이라 원정 불가. 그 외 발견한 종족을 원정 보낼 수 있다.
 * 원정 재료율 = 해당 종족의 발견 형태 수 × RATE_PER_FORM (분당). 오프라인에도 누적(시작 시각 기준).
 * 재료 제단: 재료를 소비해 영구 능력 배율을 올린다 (playerData 가 반영).
 */
import { SPECIES } from '../game/species.js';
import { EXPEDITION } from '../game/constants.js';
import { evolutionData } from './evolutionData.js';
import { economyData } from './economyData.js';

function formsDiscovered(speciesKey, discovered) {
  return Object.keys(SPECIES[speciesKey].forms).filter((id) => discovered.includes(id)).length;
}

export function createExpeditionData() {
  const listeners = new Set();

  const state = {
    active: {}, // { [speciesKey]: 시작시각(ms) }
    altarLevel: 0, // 재료 제단 — 능력 강화 레벨
    skillLevel: 0, // 재료 제단 — 스킬 강화 레벨
  };

  function snapshot() {
    return { active: { ...state.active }, altarLevel: state.altarLevel, skillLevel: state.skillLevel };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  /** 종족의 분당 재료율 (활성 종족은 0) */
  function rateOf(key, cur, discovered) {
    if (key === cur) return 0;
    return formsDiscovered(key, discovered) * EXPEDITION.RATE_PER_FORM;
  }

  /** 원정 대기 재료 (누적, 정수) */
  function pendingOf(key, cur, discovered) {
    if (!(key in state.active)) return 0;
    const rate = rateOf(key, cur, discovered);
    return Math.floor(((Date.now() - state.active[key]) / 60000) * rate);
  }

  function altarCost() {
    return Math.floor(EXPEDITION.ALTAR_BASE_COST * Math.pow(EXPEDITION.ALTAR_COST_GROWTH, state.altarLevel));
  }

  function skillCost() {
    return Math.floor(EXPEDITION.SKILL_BASE_COST * Math.pow(EXPEDITION.SKILL_COST_GROWTH, state.skillLevel));
  }

  return {
    getState() {
      return snapshot();
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    /** UI 표시용 원정 목록 (활성 종족 제외, 발견한 종족만 파견 가능) */
    getExpeditions() {
      const { species: cur, discovered } = evolutionData.getState();
      return Object.keys(SPECIES)
        .filter((k) => k !== cur)
        .map((k) => {
          const found = formsDiscovered(k, discovered);
          return {
            key: k,
            name: SPECIES[k].name,
            unlocked: found > 0, // 한 번이라도 발견(부화)한 종족
            found,
            total: Object.keys(SPECIES[k].forms).length,
            rate: rateOf(k, cur, discovered),
            on: k in state.active,
            pending: pendingOf(k, cur, discovered),
          };
        });
    },

    /** 원정 파견 */
    send(key) {
      if (!SPECIES[key]) return;
      state.active[key] = Date.now();
      emit();
    },

    /** 누적 재료 수령 (원정은 계속) */
    collect(key) {
      const { species: cur, discovered } = evolutionData.getState();
      const gained = pendingOf(key, cur, discovered);
      if (gained > 0) economyData.gainMaterials(gained);
      if (key in state.active) state.active[key] = Date.now();
      emit();
      return gained;
    },

    /** 원정 복귀 (수령 후 파견 해제) */
    recall(key) {
      const gained = this.collect(key);
      delete state.active[key];
      emit();
      return gained;
    },

    // ===== 재료 제단 (영구 강화) =====

    getAltarInfo() {
      return {
        level: state.altarLevel,
        cost: altarCost(),
        bonusPct: Math.round(state.altarLevel * EXPEDITION.ALTAR_BONUS_PER * 100),
        nextBonusPct: Math.round((state.altarLevel + 1) * EXPEDITION.ALTAR_BONUS_PER * 100),
      };
    },

    /** playerData 가 반영하는 영구 능력 배율 */
    getAltarMultiplier() {
      return 1 + state.altarLevel * EXPEDITION.ALTAR_BONUS_PER;
    },

    /** 능력 강화 (재료 소비) */
    upgradeAltar() {
      if (!economyData.spendMaterials(altarCost())) return false;
      state.altarLevel += 1;
      emit();
      return true;
    },

    // ===== 스킬 강화 (재료 → 영구 스킬 피해) =====

    getSkillInfo() {
      return {
        level: state.skillLevel,
        cost: skillCost(),
        bonusPct: Math.round(state.skillLevel * EXPEDITION.SKILL_BONUS_PER * 100),
        nextBonusPct: Math.round((state.skillLevel + 1) * EXPEDITION.SKILL_BONUS_PER * 100),
      };
    },

    /** GameScene 이 스킬 피해에 반영하는 배율 */
    getSkillMultiplier() {
      return 1 + state.skillLevel * EXPEDITION.SKILL_BONUS_PER;
    },

    upgradeSkill() {
      if (!economyData.spendMaterials(skillCost())) return false;
      state.skillLevel += 1;
      emit();
      return true;
    },

    // ===== 정기 촉진 (재료 → 정기, 반복) =====

    getEssenceBoostInfo() {
      const evo = evolutionData.getState();
      const amount = evo.isFinal ? 0 : Math.ceil(evo.essenceToEvolve * EXPEDITION.ESSENCE_BOOST_PCT);
      return { cost: EXPEDITION.ESSENCE_BOOST_COST, amount, available: !evo.isFinal };
    },

    /** 재료를 정기로 전환 (다음 진화 필요량의 일정 비율) */
    boostEssence() {
      const evo = evolutionData.getState();
      if (evo.isFinal) return 0;
      const amount = Math.ceil(evo.essenceToEvolve * EXPEDITION.ESSENCE_BOOST_PCT);
      if (!economyData.spendMaterials(EXPEDITION.ESSENCE_BOOST_COST)) return 0;
      evolutionData.gainEssence(amount);
      emit();
      return amount;
    },

    // ===== 저장/복원 =====

    getSaveState() {
      return { active: { ...state.active }, altarLevel: state.altarLevel, skillLevel: state.skillLevel };
    },

    loadSaveState(s) {
      if (!s) return;
      state.active = s.active && typeof s.active === 'object' ? { ...s.active } : {};
      state.altarLevel = s.altarLevel ?? 0;
      state.skillLevel = s.skillLevel ?? 0;
      emit();
    },
  };
}

export const expeditionData = createExpeditionData();
