import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { careData } from '../data/careData.js';

/**
 * 진화 갈래 선택 패널 — 정기가 충만하면 하단 중앙에 나타난다.
 * 육성 방향(공격/체력 훈련)에 따라 갈래가 잠금/해금되며, 해금된 갈래를 골라 진화한다.
 */
export default function Evolve() {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [care, setCare] = useState(careData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);
  useEffect(() => careData.subscribe(setCare), []);

  if (!evo.essenceReady) return null;

  // 우세 훈련 방향 → 진화 갈래 조건
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
