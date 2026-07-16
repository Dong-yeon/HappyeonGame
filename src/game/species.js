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
        evolveTo: [{ to: 'imugi', essence: 150 }],
      },
      imugi: {
        name: '이무기',
        color: 0x1f8f6f,
        mult: 1.9,
        tier: 2,
        skill: { name: '용트림', type: 'aoe', mult: 1.6, cooldown: 3500, range: 160, color: 0x63e6be },
        evolveTo: [
          { to: 'heukryong', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'cheongryong', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'hwangryong', essence: 1200 },
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
        evolveTo: [{ to: 'gumiho', essence: 150 }],
      },
      gumiho: {
        name: '구미호',
        color: 0xff8787,
        mult: 1.9,
        tier: 2,
        skill: { name: '여우불', type: 'beam', mult: 1.9, cooldown: 3200, range: 360, color: 0xff8787 },
        evolveTo: [
          { to: 'heukho', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'baekho', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'cheonho', essence: 1200 },
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

  dokkaebi: {
    name: '도깨비',
    root: 'dokkaebi_baby',
    forms: {
      dokkaebi_baby: {
        name: '아기 도깨비',
        color: 0xff922b,
        mult: 1.0,
        tier: 1,
        skill: { name: '방망이질', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0xffc078 },
        evolveTo: [{ to: 'dokkaebi', essence: 150 }],
      },
      dokkaebi: {
        name: '도깨비',
        color: 0xf76707,
        mult: 1.9,
        tier: 2,
        skill: { name: '도깨비불', type: 'beam', mult: 1.9, cooldown: 3200, range: 360, color: 0xffa94d },
        evolveTo: [
          { to: 'fire_dokkaebi', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'blue_dokkaebi', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'king_dokkaebi', essence: 1200 },
        ],
      },
      fire_dokkaebi: {
        name: '불도깨비',
        color: 0xe8590c,
        mult: 3.8,
        tier: 3,
        skill: { name: '화염 방망이', type: 'strike', mult: 3.6, cooldown: 2500, range: 140, color: 0xff6b6b },
        evolveTo: [],
      },
      blue_dokkaebi: {
        name: '청도깨비',
        color: 0x4dabf7,
        mult: 3.4,
        tier: 3,
        skill: { name: '뇌전 강타', type: 'aoe', mult: 2.2, cooldown: 3200, range: 220, color: 0x74c0fc },
        evolveTo: [],
      },
      king_dokkaebi: {
        name: '왕도깨비',
        color: 0xffd43b,
        mult: 3.6,
        tier: 3,
        skill: { name: '도깨비 대환란', type: 'aoe', mult: 2.4, cooldown: 3000, range: 240, color: 0xffe066 },
        evolveTo: [],
      },
    },
  },

  bulgasari: {
    name: '불가사리',
    root: 'bulgasari_baby',
    forms: {
      bulgasari_baby: {
        name: '새끼 불가사리',
        color: 0xadb5bd,
        mult: 1.0,
        tier: 1,
        skill: { name: '깨물기', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0xdee2e6 },
        evolveTo: [{ to: 'bulgasari', essence: 150 }],
      },
      bulgasari: {
        name: '불가사리',
        color: 0x868e96,
        mult: 1.9,
        tier: 2,
        skill: { name: '무쇠 파쇄', type: 'aoe', mult: 1.7, cooldown: 3400, range: 170, color: 0xced4da },
        evolveTo: [
          { to: 'steel_bulgasari', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'iron_bulgasari', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'giant_bulgasari', essence: 1200 },
        ],
      },
      steel_bulgasari: {
        name: '강철 불가사리',
        color: 0x495057,
        mult: 3.8,
        tier: 3,
        skill: { name: '강철 강타', type: 'strike', mult: 3.6, cooldown: 2600, range: 140, color: 0xadb5bd },
        evolveTo: [],
      },
      iron_bulgasari: {
        name: '무쇠 불가사리',
        color: 0x343a40,
        mult: 3.4,
        tier: 3,
        skill: { name: '지진 강타', type: 'aoe', mult: 2.3, cooldown: 3200, range: 230, color: 0x868e96 },
        evolveTo: [],
      },
      giant_bulgasari: {
        name: '거대 불가사리',
        color: 0xced4da,
        mult: 3.6,
        tier: 3,
        skill: { name: '짓밟기', type: 'aoe', mult: 2.4, cooldown: 3000, range: 250, color: 0xf1f3f5 },
        evolveTo: [],
      },
    },
  },

  geuseundae: {
    name: '그슨대',
    root: 'shadow',
    forms: {
      shadow: {
        name: '그림자',
        color: 0x5c5470,
        mult: 1.0,
        tier: 1,
        skill: { name: '어둠 손아귀', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0x9775fa },
        evolveTo: [{ to: 'geuseundae', essence: 150 }],
      },
      geuseundae: {
        name: '그슨대',
        color: 0x6741d9,
        mult: 1.9,
        tier: 2,
        skill: { name: '암흑 파동', type: 'aoe', mult: 1.7, cooldown: 3400, range: 180, color: 0x845ef7 },
        evolveTo: [
          { to: 'giryeong_geuseundae', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'amya_geuseundae', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'cheonjang_geuseundae', essence: 1200 },
        ],
      },
      giryeong_geuseundae: {
        name: '거령 그슨대',
        color: 0x7048e8,
        mult: 3.8,
        tier: 3,
        skill: { name: '심연 참격', type: 'strike', mult: 3.6, cooldown: 2600, range: 140, color: 0xb197fc },
        evolveTo: [],
      },
      amya_geuseundae: {
        name: '암야 그슨대',
        color: 0x4c6ef5,
        mult: 3.4,
        tier: 3,
        skill: { name: '그림자 폭발', type: 'aoe', mult: 2.3, cooldown: 3200, range: 230, color: 0x748ffc },
        evolveTo: [],
      },
      cheonjang_geuseundae: {
        name: '천장 그슨대',
        color: 0x9775fa,
        mult: 3.6,
        tier: 3,
        skill: { name: '밤의 겁화', type: 'beam', mult: 2.6, cooldown: 3000, range: 420, color: 0xd0bfff },
        evolveTo: [],
      },
    },
  },

  gureongi: {
    name: '구렁이',
    root: 'gureongi_baby',
    forms: {
      gureongi_baby: {
        name: '새끼 구렁이',
        color: 0x94d82d,
        mult: 1.0,
        tier: 1,
        skill: { name: '칭칭 감기', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0xc0eb75 },
        evolveTo: [{ to: 'gureongi', essence: 150 }],
      },
      gureongi: {
        name: '구렁이',
        color: 0x66a80f,
        mult: 1.9,
        tier: 2,
        skill: { name: '독 안개', type: 'aoe', mult: 1.7, cooldown: 3400, range: 170, color: 0xa9e34b },
        evolveTo: [
          { to: 'dokryong', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'baeksa', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'hwangnyongsa', essence: 1200 },
        ],
      },
      dokryong: {
        name: '독룡',
        color: 0x5c940d,
        mult: 3.8,
        tier: 3,
        skill: { name: '맹독 참격', type: 'strike', mult: 3.6, cooldown: 2600, range: 140, color: 0x82c91e },
        evolveTo: [],
      },
      baeksa: {
        name: '백사',
        color: 0xe9ecef,
        mult: 3.4,
        tier: 3,
        skill: { name: '백사 결계', type: 'aoe', mult: 2.3, cooldown: 3200, range: 230, color: 0xf1f3f5 },
        evolveTo: [],
      },
      hwangnyongsa: {
        name: '황룡사',
        color: 0xffd43b,
        mult: 3.6,
        tier: 3,
        skill: { name: '황금 똬리', type: 'beam', mult: 2.6, cooldown: 3000, range: 420, color: 0xffe066 },
        evolveTo: [],
      },
    },
  },

  jeoseung: {
    name: '저승사자',
    root: 'saja',
    forms: {
      saja: {
        name: '초급 사자',
        color: 0x495057,
        mult: 1.0,
        tier: 1,
        skill: { name: '낫질', type: 'strike', mult: 2.0, cooldown: 2500, range: 120, color: 0x868e96 },
        evolveTo: [{ to: 'jeoseung_saja', essence: 150 }],
      },
      jeoseung_saja: {
        name: '저승사자',
        color: 0x343a40,
        mult: 1.9,
        tier: 2,
        skill: { name: '명부 인도', type: 'aoe', mult: 1.7, cooldown: 3400, range: 180, color: 0x868e96 },
        evolveTo: [
          { to: 'yeomna_saja', essence: 1200, requires: { dominant: 'attack' }, hint: '공격 특화 필요' },
          { to: 'heukpo_saja', essence: 1200, requires: { dominant: 'hp' }, hint: '체력 특화 필요' },
          { to: 'myeonggye_saja', essence: 1200 },
        ],
      },
      yeomna_saja: {
        name: '염라 사자',
        color: 0xe03131,
        mult: 3.8,
        tier: 3,
        skill: { name: '염라의 낫', type: 'strike', mult: 3.6, cooldown: 2600, range: 140, color: 0xff8787 },
        evolveTo: [],
      },
      heukpo_saja: {
        name: '흑포 사자',
        color: 0x212529,
        mult: 3.4,
        tier: 3,
        skill: { name: '명계 장막', type: 'aoe', mult: 2.3, cooldown: 3200, range: 230, color: 0x495057 },
        evolveTo: [],
      },
      myeonggye_saja: {
        name: '명계 사자',
        color: 0x5f3dc4,
        mult: 3.6,
        tier: 3,
        skill: { name: '혼백 겁화', type: 'beam', mult: 2.6, cooldown: 3000, range: 420, color: 0x9775fa },
        evolveTo: [],
      },
    },
  },
};

/**
 * 특수 진화(합체) — 궁극체(비전체, tier 4).
 * 정기로는 도달 불가. 해당 종족의 최종체 3갈래를 모두 도감에 발견 + "합체의 정수"(재료로 제작)를
 * 소모해야 각성한다. 세 갈래의 힘을 하나로 합친 궁극 형태 (디지몬 합체 진화 개념).
 */
const SPECIAL_FORMS = {
  imugi: {
    id: 'yeouiju_ryong',
    form: {
      name: '여의주룡',
      color: 0xffe066,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '여의주 강림', type: 'beam', mult: 4.2, cooldown: 2600, range: 470, color: 0xffe066 },
      evolveTo: [],
    },
  },
  gumiho: {
    id: 'gumi_shinho',
    form: {
      name: '구미신호',
      color: 0xf783ac,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '구미 겁화', type: 'aoe', mult: 3.3, cooldown: 2800, range: 270, color: 0xf783ac },
      evolveTo: [],
    },
  },
  dokkaebi: {
    id: 'dokkaebi_shinjang',
    form: {
      name: '도깨비 신장',
      color: 0xff6b6b,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '신장 대환란', type: 'aoe', mult: 3.4, cooldown: 2800, range: 280, color: 0xff8787 },
      evolveTo: [],
    },
  },
  bulgasari: {
    id: 'bulgasal',
    form: {
      name: '불가살',
      color: 0x91a7ff,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '불가살 강타', type: 'strike', mult: 5.0, cooldown: 2400, range: 150, color: 0x91a7ff },
      evolveTo: [],
    },
  },
  geuseundae: {
    id: 'geuseundae_masin',
    form: {
      name: '그슨대 마신',
      color: 0x9775fa,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '마신 심연', type: 'beam', mult: 4.0, cooldown: 2700, range: 470, color: 0xb197fc },
      evolveTo: [],
    },
  },
  gureongi: {
    id: 'sawang',
    form: {
      name: '사왕',
      color: 0x82c91e,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '만독 강림', type: 'beam', mult: 4.0, cooldown: 2700, range: 470, color: 0xa9e34b },
      evolveTo: [],
    },
  },
  jeoseung: {
    id: 'yeomna_daewang',
    form: {
      name: '염라대왕',
      color: 0xf03e3e,
      mult: 5.5,
      tier: 4,
      special: true,
      skill: { name: '염라 대심판', type: 'aoe', mult: 3.4, cooldown: 2800, range: 290, color: 0xff8787 },
      evolveTo: [],
    },
  },
};

// 각 종족에 궁극체 형태와 링크(special = 궁극체 id)를 주입
for (const [key, sp] of Object.entries(SPECIES)) {
  const s = SPECIAL_FORMS[key];
  if (s) {
    sp.special = s.id;
    sp.forms[s.id] = s.form;
  }
}

/** 기본 시작 종족 */
export const DEFAULT_SPECIES = 'imugi';

export function getSpecies(key) {
  return SPECIES[key] ?? SPECIES[DEFAULT_SPECIES];
}
