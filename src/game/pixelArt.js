/**
 * 픽셀아트 스프라이트 생성 — 외부 에셋 없이 코드(ASCII 격자)로 Phaser 텍스처를 만든다.
 *
 * 각 격자는 문자 → 색 팔레트로 그려지며 1px/셀 텍스처가 된다.
 * config.js 의 pixelArt:true 로 확대 시 선명한 도트가 유지된다.
 */
import Phaser from 'phaser';

/** 색을 어둡게 (음영·외곽선용) */
function darken(color, f) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.red * f),
    Math.round(c.green * f),
    Math.round(c.blue * f),
  );
}

/** 색을 밝게 (상단 림 하이라이트용) */
function lighten(color, f) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.min(255, Math.round(c.red * f)),
    Math.min(255, Math.round(c.green * f)),
    Math.min(255, Math.round(c.blue * f)),
  );
}

/**
 * ASCII 격자 + 팔레트로 텍스처 생성 (이미 있으면 재사용).
 *
 * 상업적 도트 품질을 위해 렌더 시 자동으로:
 *  - 실루엣 둘레에 선명한 외곽선(opts.outline)
 *  - 각 열의 최상단 셀에 림 하이라이트(위에서 오는 빛), 최하단 셀에 접지 음영
 * → 격자를 다시 그리지 않고도 입체감 있는 스프라이트가 된다.
 * opts.flatTokens 문자(예: 눈 'WK')는 음영을 건너뛰어 또렷하게 유지.
 */
export function makePixelTexture(scene, key, grid, palette, opts = {}) {
  if (scene.textures.exists(key)) return key;
  const { outline = null, autoShade = true, lightF = 1.24, darkF = 0.72, flatTokens = '' } = opts;

  const H = grid.length;
  const W = Math.max(...grid.map((r) => r.length));
  const PAD = outline != null ? 1 : 0;
  const cols = W + PAD * 2;
  const rows = H + PAD * 2;

  // 1px 패딩된 토큰 맵
  const tok = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  for (let y = 0; y < H; y += 1) {
    const row = grid[y];
    for (let x = 0; x < row.length; x += 1) tok[y + PAD][x + PAD] = row[x];
  }
  const colorAt = (y, x) => (y >= 0 && y < rows && x >= 0 && x < cols ? palette[tok[y][x]] : null);
  const filled = (y, x) => colorAt(y, x) != null;

  // 열별 최상단/최하단 (자동 음영)
  const topY = new Array(cols).fill(-1);
  const botY = new Array(cols).fill(-1);
  if (autoShade) {
    for (let x = 0; x < cols; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        if (filled(y, x)) {
          if (topY[x] < 0) topY[x] = y;
          botY[x] = y;
        }
      }
    }
  }

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const put = (x, y, col) => {
    g.fillStyle(col, 1);
    g.fillRect(x, y, 1, 1);
  };

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const base = colorAt(y, x);
      if (base == null) {
        // 빈 셀이 채워진 셀과 상하좌우로 맞닿으면 외곽선
        if (outline != null && (filled(y - 1, x) || filled(y + 1, x) || filled(y, x - 1) || filled(y, x + 1))) {
          put(x, y, outline);
        }
        continue;
      }
      let col = base;
      if (autoShade && !flatTokens.includes(tok[y][x])) {
        if (y === topY[x]) col = lighten(base, lightF);
        else if (y === botY[x]) col = darken(base, darkF);
      }
      put(x, y, col);
    }
  }

  g.generateTexture(key, cols, rows);
  g.destroy();
  return key;
}

// ===== 요괴(플레이어) — 종족별 × 진화 단계별 고유 도트, 형태 색으로 채색 =====
// 공통 토큰: B=몸(색), D=외곽(색 어둡게), S=음영/뿔/날개(색 더 어둡게),
//           W=눈흰자, K=눈동자, N=검정 액센트, R=붉은 액센트, F=뼈/흰털, Y=금빛
// 각 종족은 1(새끼)/2(성체)/3(최종체) 단계별 격자를 가진다.
const SPECIES_GRIDS = {
  imugi: {
    1: [
      '...S...S...',
      '..DBBBBBD..',
      '.DBBBBBBBD.',
      '.DBWKBWKBD.',
      '.DBBBBBBBD.',
      '..DBBBBBD..',
      '...DBBBD...',
      '...DBBBD...',
      '...DB.BD...',
      '...DD.DD...',
    ],
    2: [
      '....S....S....',
      '....S....S....',
      '...DBBBBBBBD..',
      '..DBBBBBBBBBD.',
      '..DBWKBBWKBBD.',
      '..DBBBBBBBBBD.',
      '..DBBBBBBBBBD.',
      '...DBBBBBBBD..',
      '....DBBBBBD...',
      '.....DBBBBD...',
      '......DBBBBD..',
      '.......DBBBD..',
      '.......DBBBD..',
      '......DBBSD...',
      '.....DBSD.....',
      '.....DD.......',
    ],
    3: [
      '...SS.....SS...',
      '...SS.....SS...',
      '...DBBBBBBBBD..',
      '..DBBBBBBBBBBD.',
      '..DBWKBBBBWKBD.',
      'SSDBBBBBBBBBBDSS',
      'SSDBBBBBBBBBBDSS',
      '..DBBBBBBBBBBD..',
      '...DBBBBBBBBD...',
      '....DBBBBBBD...',
      '.....DBBBBBD...',
      '......DBBBBD...',
      '......DBBBBD...',
      '.....DBBBSD....',
      '....DBBSD......',
      '....DD........',
    ],
  },
  gumiho: {
    1: [
      '..S.....S..',
      '.SBS...SBS.',
      '.DBBBBBBBD.',
      '.DBWKBWKBD.',
      '.DBBBBBBBD.',
      '.DBBBBBBDS.',
      '..DBBBBDBS.',
      '...DBBBD...',
      '...DB.BD...',
      '..FF...FF..',
    ],
    2: [
      '..S......S....',
      '.SBS....SBS...',
      '..DBBBBBBBD...',
      '.DBBBBBBBBBD..',
      '.DBWKBBWKBBD..',
      '.DBBBBBBBBBD..',
      '.DBBBBBBBBBDS.',
      '..DBBBBBBBDBS.',
      '...DBBBBBBDBS.',
      '....DBBBBDBBS.',
      '....DBBBBDBS..',
      '....DBBBBD....',
      '....DB..BD....',
      '....DB..BD....',
      '...FF..FF.....',
      '..............',
    ],
    3: [
      '..S........S....',
      '.SBS......SBS...',
      '..DBBBBBBBBD....',
      '.DBBBBBBBBBBD.S.',
      '.DBWKBBBBWKBDBS.',
      '.DBBBBBBBBBBDBS.',
      '.DBBBBBBBBBBSBS.',
      '..DBBBBBBBBDBBS.',
      '..DBBBBBBBBDBS..',
      '...DBBBBBBDBBS..',
      '...DBBBBBBDBS...',
      '...DBBBBBBD.....',
      '...DBB..BBD.....',
      '...DBB..BBD.....',
      '..FFF..FFF......',
      '...............',
    ],
  },
  dokkaebi: {
    1: [
      '....SS.....',
      '..DBBBBBD..',
      '.DBBBBBBBD.',
      '.DBWKBWKBD.',
      '.DBKBKBKBD.',
      '..DBBBBBD..',
      '...DBBBD...',
      '...DB.BD...',
      '...DD.DD...',
      '...........',
    ],
    2: [
      '......SS......',
      '.....SSSS.....',
      '..DBBBBBBBBD..',
      '.DBBBBBBBBBBD.',
      '.DBWKBBBBWKBD.',
      '.DBBBBBBBBBBD.',
      '.DBKBKBKBKBBD.',
      '.DBBBBBBBBBBDNN',
      '..DBBBBBBBBDNN',
      '..DBBBBBBBBD..',
      '...DBBBBBBD...',
      '...DBBBBBBD...',
      '...DB....BD...',
      '..NDB....BDN..',
      '..NN......NN..',
      '.............',
    ],
    3: [
      '...S..SS..S...',
      '..SSSSSSSSSS..',
      '..DBBBBBBBBD..',
      '.DBBBBBBBBBBD.',
      '.DBWKBBBBWKBD.',
      '.DBBBBBBBBBBD.',
      '.DBKBKBKBKBBD.NN',
      '.DBBBBBBBBBBDNN',
      'DBBBBBBBBBBBBNN',
      'DBBBBBBBBBBBBD.',
      '.DBBBBBBBBBBD..',
      '..DBBBBBBBBD...',
      '..DB......BD...',
      '.NDB......BDN..',
      '.NN........NN..',
      '.............',
    ],
  },
  bulgasari: {
    1: [
      '..S.....S..',
      '.DBBBBBBBD.',
      '.DBWKBWKBD.',
      'DBBBBBBBBBD',
      'DBBBBBBBBBD',
      '.DBBBBBBBD.',
      '..DBBBBBD..',
      '..DB...BD..',
      '..DD...DD..',
      '...........',
    ],
    2: [
      '..............',
      '...S......S...',
      '..DSBBBBBBSD..',
      '.DBBBBBBBBBBD.',
      '.DBWKBBBBWKBD.',
      '.DBBBBBBBBBBD.',
      'DBBBBBBBBBBBBD',
      'DBBBBSSSSBBBBD',
      'DBBBBBBBBBBBBD',
      'DBBBBBBBBBBBBD',
      '.DBBBBBBBBBBD.',
      '.DBBBBBBBBBBD.',
      '..DBB..BBD....',
      '..DBB..BBD....',
      '..DD....DD....',
      '..............',
    ],
    3: [
      '.S..S....S..S.',
      '.DSBBBBBBBBSD.',
      '.DBWKBBBBWKBD.',
      'SDBBBBBBBBBBDS',
      'SDBBBBBBBBBBDS',
      'DBBBBBBBBBBBBD',
      'DBBBSSSSSSBBBD',
      'DBBBBBBBBBBBBD',
      'DBBBBBBBBBBBBD',
      'DBBBBBBBBBBBBD',
      'SDBBBBBBBBBBDS',
      '.DBBBBBBBBBBD.',
      '.DBBB..BBBD...',
      '.DBBB..BBBD...',
      '.DDD....DDD...',
      '.............',
    ],
  },
  geuseundae: {
    1: [
      '...DBBBD...',
      '..DBBBBBD..',
      '..DBRBRBD..',
      '..DBBBBBD..',
      '..DBBBBBD..',
      '...NBBBN...',
      '...NNBNN...',
      '....N.N....',
      '...N...N...',
      '...........',
    ],
    2: [
      '....DBBBBD....',
      '...DBBBBBBD...',
      '...DBRBBRBD...',
      '...DBBBBBBD...',
      '..DBBBBBBBBD..',
      '..DBBBBBBBBD..',
      '..DBBBBBBBBD..',
      '..DBBBBBBBBD..',
      '...NBBBBBBN...',
      '...NNBBBBNN...',
      '....NNBBNN....',
      '....N.NN.N....',
      '...N..N...N...',
      '..N...N....N..',
      '..............',
      '..............',
    ],
    3: [
      '...S.DBBBD.S...',
      '..S.DBBBBBD.S..',
      '....DBRBBRBD...',
      '...DBBBBBBBBD..',
      '..DBBBBBBBBBBD.',
      '..DBBBBBBBBBBD.',
      '..DBBBBBBBBBBD.',
      '..DBBBBBBBBBBD.',
      '..DBBBBBBBBBBD.',
      '...NBBBBBBBBN..',
      '...NNBBBBBBNN..',
      '....NNBBBBNN...',
      '....N.NNNN.N...',
      '...N..N..N..N..',
      '..N..N....N..N.',
      '..............',
    ],
  },
  gureongi: {
    1: [
      '..DBBBD..',
      '.DBBBBBD.',
      '.DWKBWKD.',
      '.DBBBBBD.',
      '..DBBBD.R',
      '...DBBBD.',
      '..DBBBD..',
      '..DBSD...',
      '..DD.....',
      '.........',
    ],
    2: [
      '.....DBBBD....',
      '....DBBBBBD...',
      '....DWKBWKD...',
      '....DBBBBBD...',
      '.....DBBBD.R..',
      '......DBBBD...',
      '.......DBBBD..',
      '........DBBBD.',
      '.......DBBBD..',
      '......DBBBD...',
      '.....DBBBD....',
      '....DBBBD.....',
      '...DBBBD......',
      '...DBBSD......',
      '...DBSD.......',
      '...DD.........',
    ],
    3: [
      '....DBBBBD.....',
      '...DBBBBBBD....',
      '...DWKBBWKD....',
      '...DBBBBBBD.RR.',
      '....DBBBBD.....',
      '.....DBBBBD....',
      '......DBBBBD...',
      '.......DBBBBD..',
      '......DBBBBD...',
      '.....DBBBBD....',
      '....DBBBBD.....',
      '...DBBBBD......',
      '..DBBBBD.......',
      '..DBBSD........',
      '..DBSD.........',
      '..DD..........',
    ],
  },
  jeoseung: {
    1: [
      '.NNNNNN..',
      '...NN....',
      '.FFFFFF..',
      '.FKFFKF..',
      '.FFFFFF..',
      'DBBBBBBD.',
      'DBBBBBBD.',
      '.DBBBBD..',
      '.DB..BD..',
      '.DD..DD..',
    ],
    2: [
      '.NNNNNNNNNN...',
      '....NNNN......',
      '...FFFFFF.....',
      '...FKFFKF.....',
      '...FFFFFF.....',
      '..DBBBBBBD.NN.',
      '.DBBBBBBBBDN..',
      '.DBBBBBBBBDNNN',
      '.DBBBBBBBBDN..',
      '.DBBBBBBBBDN..',
      '.DBBBBBBBBDN..',
      '..DBBBBBBD.N..',
      '..DBBBBBBD.N..',
      '..DBBBBBBD....',
      '..DB....BD....',
      '..DD....DD....',
    ],
    3: [
      '.NNNNNNNNNNNN.',
      '...NNYYNN.....',
      '...FFFFFF..NN.',
      '...FKFFKF..N..',
      '...FFFFFF.NNN.',
      '..DBBBBBBD.N..',
      '.DBBBBBBBBDN..',
      'DBBBBBBBBBBDN.',
      'DBBBBYYYYBBDN.',
      'DBBBBBBBBBBDN.',
      'DBBBBBBBBBBDN.',
      '.DBBBBBBBBD.N.',
      '.DBBBBBBBBD...',
      '..DBBBBBBD....',
      '..DB....BD....',
      '..DD....DD....',
    ],
  },
};

function yokaiPalette(color) {
  // 자동 외곽선/림/접지음영이 렌더 시 얹히므로, 격자 토큰은 은은한 3톤(D/B/S)만 담당
  return {
    B: color,
    D: darken(color, 0.8), // 은은한 가장자리 톤 (예전 외곽선 → 자동 외곽선으로 대체)
    S: darken(color, 0.55), // 뿔·날개·꼬리 등 깊은 음영 액센트
    W: 0xf7f4ee, // 눈 흰자 (약간 따뜻하게)
    K: 0x141414,
    N: 0x201d29,
    R: 0xe03131,
    F: 0xf3ecdb,
    Y: 0xffd43b,
    '.': null,
  };
}

/** 종족·단계·형태 색에 맞춘 요괴 텍스처 (종족+단계+색별 캐시) */
export function getYokaiTexture(scene, speciesKey, tier, color) {
  const bySpecies = SPECIES_GRIDS[speciesKey] || SPECIES_GRIDS.imugi;
  // 궁극체(tier 4)는 전용 격자가 없으면 최종체(tier 3) 도트를 재사용 (색·크기로 차별화)
  const grid = bySpecies[tier] || bySpecies[3] || bySpecies[2] || bySpecies[1];
  const key = `yokaiV2_${speciesKey}_${tier}_${color.toString(16)}`;
  return makePixelTexture(scene, key, grid, yokaiPalette(color), {
    outline: darken(color, 0.28),
    autoShade: true,
    flatTokens: 'WK', // 눈은 또렷하게
  });
}

// ===== 인간 병사(적) — 투구/얼굴/갑주/창 =====
// H=투구, S=피부, E=눈, A=갑주, D=갑주그림자, P=창, L=신발
const SOLDIER = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HSSSSSSH..',
  '..SSSSSSSS..',
  '..SEESSEES..',
  '..SSSSSSSS..',
  '...AAAAAA.P.',
  '..AAAAAAAAP.',
  '..ADAAAADAP.',
  '..AAAAAAAAP.',
  '..AAAAAAAAP.',
  '...AAAAAA.P.',
  '...A....A.P.',
  '...A....A.P.',
  '..LL....LL..',
  '............',
];

export function getSoldierTexture(scene) {
  return makePixelTexture(
    scene,
    'human_soldierV2',
    SOLDIER,
    {
      H: 0x545159,
      S: 0xe6b58a,
      E: 0x2b2b2b,
      A: 0xc9a26b,
      D: 0x7a5a34,
      P: 0x9c7038,
      L: 0x2e2620,
      '.': null,
    },
    { outline: 0x1c1712, autoShade: true, flatTokens: 'E' },
  );
}

// ===== 인간 장수(보스) — 붉은 깃털 투구 + 짙은 갑주 =====
// R=깃털, H=투구, S=피부, E=눈, A=갑주, D=그림자, P=창, L=신발
const GENERAL = [
  '.....RR.......',
  '....RRRR......',
  '...HHHHHH.....',
  '..HHHHHHHH....',
  '..HSSSSSSH....',
  '..SSSSSSSS....',
  '..SEESSEES....',
  '..SSSSSSSS....',
  '..DAAAAAAD.PP.',
  '.DAAAAAAAAD PP',
  '.DAARAARAAD.PP',
  '.DAAAAAAAAD.PP',
  '.DAAAAAAAAD.PP',
  '..DAAAAAAD..PP',
  '..DA....AD..PP',
  '..LLL..LLL....',
];

export function getGeneralTexture(scene) {
  return makePixelTexture(
    scene,
    'human_generalV2',
    GENERAL,
    {
      R: 0xe03131,
      H: 0x3a3550,
      S: 0xe6b58a,
      E: 0x2b2b2b,
      A: 0x5f4a8a,
      D: 0x3a2e58,
      P: 0x9c7038,
      L: 0x241d2e,
      '.': null,
    },
    { outline: 0x140f1e, autoShade: true, flatTokens: 'E' },
  );
}
