import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { SPECIES } from '../game/species.js';

/** 도감 — 전 종족의 진화 트리를 종족 탭으로 열람, 발견 현황 표시. 다른 알 부화 진입점. */
export default function Codex({ onHatch }) {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(evo.species);

  useEffect(() => evolutionData.subscribe(setEvo), []);

  const speciesKeys = Object.keys(SPECIES);
  const allForms = speciesKeys.flatMap((k) => Object.keys(SPECIES[k].forms));
  const totalDiscovered = allForms.filter((id) => evo.discovered.includes(id)).length;

  const codexBonusPct = Math.round(totalDiscovered * 2); // BONUS_PER_FORM 0.02 = +2%/종

  const sp = SPECIES[view] || SPECIES[evo.species];
  const forms = Object.entries(sp.forms).map(([id, f]) => ({ id, ...f }));
  const tiers = [...new Set(forms.map((f) => f.tier))].sort((a, b) => a - b);

  return (
    <div className="codex">
      <button className="codex-toggle" onClick={() => setOpen((v) => !v)}>
        📖 도감 {totalDiscovered}/{allForms.length}
        <span className="codex-toggle-label">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="codex-panel">
          <div className="codex-reward">
            수집 보상 <b>+{codexBonusPct}%</b> 능력 <span className="codex-reward-sub">(발견 {totalDiscovered}/{allForms.length})</span>
          </div>
          <div className="codex-tabs">
            {speciesKeys.map((k) => (
              <button
                key={k}
                className={`codex-tab${view === k ? ' active' : ''}${k === evo.species ? ' cur' : ''}`}
                onClick={() => setView(k)}
              >
                {SPECIES[k].name}
              </button>
            ))}
          </div>

          {tiers.map((tier) => (
            <div className="codex-tier" key={tier}>
              <span className="codex-tier-label">{tier}단계</span>
              <div className="codex-forms">
                {forms
                  .filter((f) => f.tier === tier)
                  .map((f) => {
                    const found = evo.discovered.includes(f.id);
                    const current = view === evo.species && f.id === evo.formId;
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

          <button className="codex-hatch" onClick={onHatch}>
            🥚 다른 알 부화
          </button>
          <div className="codex-hint">부화하면 다른 요괴를 처음부터 육성 (도감·골드는 유지).</div>
        </div>
      )}
    </div>
  );
}

function hex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}
