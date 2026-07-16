import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { careData } from '../data/careData.js';
import { economyData } from '../data/economyData.js';

/**
 * 진화 패널 — 하단 중앙.
 *  - 정기 충만 시: 진화 갈래 선택 (육성 방향에 따라 잠금/해금)
 *  - 최종체 + 모든 최종체 발견 + 합체의 정수 보유 시: 합체(궁극체) 진화 (상단에 별도 표시)
 */
export default function Evolve() {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [care, setCare] = useState(careData.getState());
  const [eco, setEco] = useState(economyData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);
  useEffect(() => careData.subscribe(setCare), []);
  useEffect(() => economyData.subscribe(setEco), []);

  const fusion = evolutionData.getFusionInfo();
  const catalyst = eco.fusionCatalyst || 0;
  const showFusion = fusion.ready && catalyst >= 1;

  if (!evo.essenceReady && !showFusion) return null;

  // ===== 합체(궁극체) — 정수 보유 시 최종체에서 각성 =====
  if (showFusion) {
    return (
      <div className="evolve fusion">
        <div className="evolve-title">✦ 합체 진화 ✦ — 궁극체 각성</div>
        <div className="evolve-fusion-sub">세 최종체의 힘을 합쳐 각성합니다 · 합체의 정수 ×{catalyst}</div>
        <div className="evolve-options">
          <button
            className="evolve-opt"
            style={{ borderColor: hex(fusion.targetColor) }}
            onClick={() => {
              if (economyData.useFusionCatalyst()) evolutionData.fuse();
            }}
          >
            <span className="evolve-opt-name">{fusion.targetName}</span>
            <span className="evolve-opt-meta">정수 1 소모 · ×{fusion.targetMult} 능력</span>
          </button>
        </div>
      </div>
    );
  }

  // ===== 일반 진화 갈래 =====
  const dominant = care.dominant;
  const options = evolutionData.getAvailableEvolutions({ dominant });
  const multiple = options.length > 1;

  return (
    <div className="evolve">
      <div className="evolve-title">✦ 진화 ✦{multiple ? ' — 갈래 선택' : ''}</div>
      <div className="evolve-options">
        {options.map((opt) => (
          <button
            key={opt.to}
            className={`evolve-opt${opt.canTake ? '' : ' locked'}`}
            style={opt.canTake ? { borderColor: hex(opt.color) } : undefined}
            disabled={!opt.canTake}
            onClick={() => evolutionData.evolve(opt.to, { dominant })}
          >
            <span className="evolve-opt-name">
              {opt.discovered || opt.canTake ? opt.name : '???'}
            </span>
            <span className="evolve-opt-meta">
              {!opt.essenceMet
                ? `정기 ${opt.essenceCost}`
                : !opt.unlocked
                  ? opt.hint
                  : `×${opt.multiplier} 능력`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function hex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}
