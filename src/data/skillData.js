/**
 * 스킬 표시용 경량 모듈 — 현재 스킬 이름/색/쿨타임과 발동 신호(castSeq)를 UI에 전달.
 *
 * 실제 스킬 판정/데미지는 GameScene 이 담당하고, 이 모듈은 표시(쿨타임 바)만을 위한 것.
 * (스킬은 현재 형태에서 파생되므로 저장하지 않는다.)
 */
export function createSkillData() {
  const listeners = new Set();

  const state = {
    name: '',
    color: '#ffffff',
    cooldown: 1,
    castSeq: 0, // 발동할 때마다 증가 → UI 가 쿨타임 애니메이션 리셋
  };

  function emit() {
    const snap = { ...state };
    listeners.forEach((fn) => fn(snap));
  }

  return {
    getState() {
      return { ...state };
    },

    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },

    /** 형태 변경 시 현재 스킬 정보 설정 */
    setSkill(skill) {
      if (!skill) return;
      state.name = skill.name;
      state.color = typeof skill.color === 'number'
        ? `#${skill.color.toString(16).padStart(6, '0')}`
        : skill.color;
      state.cooldown = skill.cooldown;
      emit();
    },

    /** 스킬 발동 신호 (쿨타임 바 리셋) */
    markCast() {
      state.castSeq += 1;
      emit();
    },
  };
}

export const skillData = createSkillData();
