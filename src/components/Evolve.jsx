import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { economyData } from '../data/economyData.js';

/**
 * 진화 갈래 선택 패널 — 정기가 충만하면 하단 중앙에 나타난다.
 * 육성 방향(상점 공격/체력 투자)에 따라 갈래가 잠금/해금되며, 해금된 갈래를 골라 진화한다.
 */
export default function Evolve() {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [eco, setEco] = useState(economyData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);
  useEffect(() => economyData.subscribe(setEco), []);

  if (!evo.essenceReady) return null;

  // 우세 스탯 = 상점에서 공격/체력 중 더 많이 투자한 쪽 → 진화 갈래 조건
  const { attack, maxHp } = eco.upgrades;
  const dominant = attack > maxHp ? 'attack' : maxHp > attack ? 'hp' : 'balanced';
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
