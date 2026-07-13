import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { SPECIES } from '../game/species.js';

/**
 * 요괴 종족 선택 화면 — 신규 플레이어에게만 표시.
 * 종족마다 진화 트리가 다르며, 선택 후 육성으로 최종체가 갈린다.
 */
export default function SpeciesPicker() {
  const [evo, setEvo] = useState(evolutionData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);

  if (evo.chosen) return null;

  const entries = Object.entries(SPECIES);

  return (
    <div className="modal-backdrop">
      <div className="picker">
        <div className="picker-title">🥚 요괴를 선택하세요</div>
        <div className="picker-sub">종족마다 진화 트리가 다릅니다. 어떻게 키우느냐에 따라 최종체가 갈립니다.</div>
        <div className="picker-cards">
          {entries.map(([key, sp]) => {
            const root = sp.forms[sp.root];
            const finals = Object.values(sp.forms).filter((f) => !f.evolveTo.length);
            return (
              <button
                key={key}
                className="picker-card"
                style={{ borderColor: hex(root.color) }}
                onClick={() => evolutionData.chooseSpecies(key)}
              >
                <span className="picker-dot" style={{ background: hex(root.color) }} />
                <span className="picker-name">{sp.name}</span>
                <span className="picker-root">시작: {root.name}</span>
                <span className="picker-finals">최종: {finals.map((f) => f.name).join(' · ')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}
