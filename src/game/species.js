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
        evolveTo: [{ to: 'imugi', essence: 120 }],
      },
      imugi: {
        name: '이무기',
        color: 0x1f8f6f,
        mult: 1.9,
        tier: 2,
        evolveTo: [
          { to: 'heukryong', essence: 400, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'cheongryong', essence: 400, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'hwangryong', essence: 400 },
        ],
      },
      heukryong: { name: '흑룡', color: 0x5c7cfa, mult: 3.8, tier: 3, evolveTo: [] },
      cheongryong: { name: '청룡', color: 0x4dd4c4, mult: 3.4, tier: 3, evolveTo: [] },
      hwangryong: { name: '황룡', color: 0xffd43b, mult: 3.6, tier: 3, evolveTo: [] },
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
        evolveTo: [{ to: 'gumiho', essence: 120 }],
      },
      gumiho: {
        name: '구미호',
        color: 0xff8787,
        mult: 1.9,
        tier: 2,
        evolveTo: [
          { to: 'heukho', essence: 400, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'baekho', essence: 400, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'cheonho', essence: 400 },
        ],
      },
      heukho: { name: '흑호', color: 0x9775fa, mult: 3.8, tier: 3, evolveTo: [] },
      baekho: { name: '백호', color: 0xe9ecef, mult: 3.4, tier: 3, evolveTo: [] },
      cheonho: { name: '천호', color: 0xffe066, mult: 3.6, tier: 3, evolveTo: [] },
    },
  },
};

/** 기본 시작 종족 */
export const DEFAULT_SPECIES = 'imugi';

export function getSpecies(key) {
  return SPECIES[key] ?? SPECIES[DEFAULT_SPECIES];
}
