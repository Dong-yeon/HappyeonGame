import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { stageData } from '../data/stageData.js';
import { playerData } from '../data/playerData.js';
import { careData } from '../data/careData.js';
import { SPECIES } from '../game/species.js';

/**
 * 요괴 알 부화 화면.
 * - 신규 플레이어: 최초 종족 선택 (닫을 수 없음)
 * - 부화(전환): 도감의 "다른 알 부화"로 열림 → 다른 요괴를 처음부터 육성 (도감·골드·전생은 유지)
 */
export default function SpeciesPicker({ hatchOpen, onClose }) {
  const [evo, setEvo] = useState(evolutionData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);

  const isNew = !evo.chosen;
  if (!isNew && !hatchOpen) return null;

  function select(key) {
    if (isNew) {
      evolutionData.chooseSpecies(key);
      return;
    }
    // 부화(전환): 현재 종족과 같으면 그냥 닫기, 다르면 새 요괴를 처음부터 육성
    if (key !== evo.species) {
      stageData.reset();
      careData.reset();
      playerData.rebirthReset();
      evolutionData.chooseSpecies(key); // 마지막: 씬이 부화 연출을 띄운다
    }
    onClose && onClose();
  }

  return (
    <div className="modal-backdrop">
      <div className="picker">
        <div className="picker-title">🥚 {isNew ? '요괴를 선택하세요' : '다른 알 부화'}</div>
        <div className="picker-sub">
          {isNew
            ? '종족마다 진화 트리가 다릅니다. 어떻게 키우느냐에 따라 최종체가 갈립니다.'
            : '다른 요괴를 처음부터 육성합니다. 도감·골드·전생 배율은 유지됩니다.'}
        </div>
        <div className="picker-cards">
          {Object.entries(SPECIES).map(([key, sp]) => {
            const root = sp.forms[sp.root];
            const finals = Object.values(sp.forms).filter((f) => !f.evolveTo.length);
            const isCurrent = !isNew && key === evo.species;
            return (
              <button
                key={key}
                className={`picker-card${isCurrent ? ' current' : ''}`}
                style={{ borderColor: hex(root.color) }}
                onClick={() => select(key)}
              >
                <span className="picker-dot" style={{ background: hex(root.color) }} />
                <span className="picker-name">{sp.name}</span>
                <span className="picker-root">시작: {root.name}</span>
                <span className="picker-finals">최종: {finals.map((f) => f.name).join(' · ')}</span>
                {isCurrent && <span className="picker-current-tag">현재</span>}
              </button>
            );
          })}
        </div>
        {!isNew && (
          <button className="picker-cancel" onClick={() => onClose && onClose()}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}

function hex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}
