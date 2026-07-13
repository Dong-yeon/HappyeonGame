import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { getSpecies } from '../game/species.js';

/** 도감 — 현재 종족의 진화 트리를 단계별로 보여주고, 발견한 형태를 표시 */
export default function Codex() {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [open, setOpen] = useState(false);

  useEffect(() => evolutionData.subscribe(setEvo), []);

  const species = getSpecies(evo.species);
  const forms = Object.entries(species.forms).map(([id, f]) => ({ id, ...f }));
  const tiers = [...new Set(forms.map((f) => f.tier))].sort((a, b) => a - b);
  const discoveredCount = forms.filter((f) => evo.discovered.includes(f.id)).length;

  return (
    <div className="codex">
      <button className="codex-toggle" onClick={() => setOpen((v) => !v)}>
        📖 도감 {discoveredCount}/{forms.length}
        <span className="codex-toggle-label">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="codex-panel">
          <div className="codex-title">{species.name} 진화도</div>
          {tiers.map((tier) => (
            <div className="codex-tier" key={tier}>
              <span className="codex-tier-label">{tier}단계</span>
              <div className="codex-forms">
                {forms
                  .filter((f) => f.tier === tier)
                  .map((f) => {
                    const found = evo.discovered.includes(f.id);
                    const current = f.id === evo.formId;
                    return (
                      <div
                        key={f.id}
                        className={`codex-form${found ? '' : ' locked'}${current ? ' current' : ''}`}
                        style={found ? { borderColor: hex(f.color) } : undefined}
                      >
                        <span className="codex-dot" style={{ background: found ? hex(f.color) : '#3a3550' }} />
                        <span className="codex-form-name">{found ? f.name : '???'}</span>
                        {found && <span className="codex-form-mult">×{f.mult}</span>}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          <div className="codex-hint">육성 방향(공격/체력 훈련)에 따라 최종체가 갈립니다.</div>
        </div>
      )}
    </div>
  );
}

function hex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}
