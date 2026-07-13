/**
 * 요괴 종족 정의 — 각 요괴는 고유한 "분기 진화 트리"를 가진다 (디지몬식).
 *
 * 인간을 포식해 모은 "정기"로 진화하며, 같은 요괴라도 육성 방향에 따라 다른 최종체로 갈린다.
 * 진화 갈래는 forms[id].evolveTo 에 정의하고, requires 조건으로 잠금/해금된다.
 *
 * evolveTo[].to:        진화 대상 form id
 * evolveTo[].essence:   진화에 필요한 정기
 * evolveTo[].requires:  해금 조건 (예: { dominant: 'attack' }) — 없으면 항상 해금(기본 갈래)
 * evolveTo[].hint:      잠금 시 표시할 안내 문구
 *
 * forms[id].mult:  해당 단계 능력치 배율
 * forms[id].tier:  진화 단계(도감 정렬용)
 * forms[id].skill: 형태별 고유기 (쿨타임마다 자동 발동)
 *   - name:     스킬 이름
 *   - type:     'strike'(단일 강타) | 'aoe'(광역) | 'beam'(전방 관통)
 *   - mult:     공격력 배율
 *   - cooldown: 쿨타임(ms)
 *   - range:    사거리/반경(px)
 *   - color:    이펙트 색
 *
 * 새 요괴/갈래는 여기 데이터만 추가하면 된다.
 */
export const SPECIES = {
  imugi: {
    name: '이무기',
    root: 'imugi_baby',
    forms: {
      imugi_baby: {
        name: '새끼 이무기',
        color: 0x2f9e44,
        mult: 1.0,
        tier: 1,
        skill: { name: '물어뜯기', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0x69db7c },
        evolveTo: [{ to: 'imugi', essence: 120 }],
      },
      imugi: {
        name: '이무기',
        color: 0x1f8f6f,
        mult: 1.9,
        tier: 2,
        skill: { name: '용트림', type: 'aoe', mult: 1.6, cooldown: 3500, range: 160, color: 0x63e6be },
        evolveTo: [
          { to: 'heukryong', essence: 400, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'cheongryong', essence: 400, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'hwangryong', essence: 400 },
        ],
      },
      heukryong: {
        name: '흑룡',
        color: 0x5c7cfa,
        mult: 3.8,
        tier: 3,
        skill: { name: '흑염 브레스', type: 'beam', mult: 2.8, cooldown: 3000, range: 420, color: 0x5c7cff },
        evolveTo: [],
      },
      cheongryong: {
        name: '청룡',
        color: 0x4dd4c4,
        mult: 3.4,
        tier: 3,
        skill: { name: '청뢰 폭풍', type: 'aoe', mult: 2.2, cooldown: 3200, range: 220, color: 0x4dd4c4 },
        evolveTo: [],
      },
      hwangryong: {
        name: '황룡',
        color: 0xffd43b,
        mult: 3.6,
        tier: 3,
        skill: { name: '황금 강타', type: 'strike', mult: 3.4, cooldown: 2600, range: 140, color: 0xffd43b },
        evolveTo: [],
      },
    },
  },

  gumiho: {
    name: '구미호',
    root: 'fox',
    forms: {
      fox: {
        name: '여우',
        color: 0xf59f00,
        mult: 1.0,
        tier: 1,
        skill: { name: '할퀴기', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0xffc078 },
        evolveTo: [{ to: 'gumiho', essence: 120 }],
      },
      gumiho: {
        name: '구미호',
        color: 0xff8787,
        mult: 1.9,
        tier: 2,
        skill: { name: '여우불', type: 'beam', mult: 1.9, cooldown: 3200, range: 360, color: 0xff8787 },
        evolveTo: [
          { to: 'heukho', essence: 400, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'baekho', essence: 400, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'cheonho', essence: 400 },
        ],
      },
      heukho: {
        name: '흑호',
        color: 0x9775fa,
        mult: 3.8,
        tier: 3,
        skill: { name: '구천 발톱', type: 'strike', mult: 3.6, cooldown: 2500, range: 140, color: 0x9775fa },
        evolveTo: [],
      },
      baekho: {
        name: '백호',
        color: 0xe9ecef,
        mult: 3.4,
        tier: 3,
        skill: { name: '백호 포효', type: 'aoe', mult: 2.2, cooldown: 3200, range: 220, color: 0xe9ecef },
        evolveTo: [],
      },
      cheonho: {
        name: '천호',
        color: 0xffe066,
        mult: 3.6,
        tier: 3,
        skill: { name: '천호 겁화', type: 'beam', mult: 2.6, cooldown: 3000, range: 420, color: 0xffe066 },
        evolveTo: [],
      },
    },
  },
};

/** 기본 시작 종족 */
export const DEFAULT_SPECIES = 'imugi';

export function getSpecies(key) {
  return SPECIES[key] ?? SPECIES[DEFAULT_SPECIES];
}
