import { useEffect, useState } from 'react';
import { playerData } from '../data/playerData.js';
import { stageData } from '../data/stageData.js';
import { evolutionData } from '../data/evolutionData.js';

/** React 기반 HUD — 요괴 형태 / HP / 레벨 / 경험치 / 스테이지 진행 / 정기(진화) / 포식 수 */
export default function HUD() {
  const [stats, setStats] = useState(playerData.getState());
  const [stage, setStage] = useState(stageData.getState());
  const [evo, setEvo] = useState(evolutionData.getState());

  useEffect(() => playerData.subscribe(setStats), []);
  useEffect(() => stageData.subscribe(setStage), []);
  useEffect(() => evolutionData.subscribe(setEvo), []);

  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const expPercent = (stats.exp / stats.expToNext) * 100;
  const stagePercent = stage.bossActive ? 100 : (stage.kills / stage.killsToClear) * 100;
  const essencePercent = evo.isFinal
    ? 100
    : Math.min(100, (evo.essence / evo.essenceToEvolve) * 100);

  return (
    <div className="hud">
      <div className="hud-titlecol">
        <span className="hud-title">
          {evo.formName} <span className="hud-species">· {evo.speciesName}</span>
        </span>
        <span className="hud-stage">
          STAGE {stage.stageNumber} · {stage.stageName}
        </span>
      </div>
      <span className="hud-level">Lv.{stats.level}</span>
      <div className="hud-bars">
        <div className="bar">
          <div className="bar-fill hp" style={{ width: `${hpPercent}%` }} />
          <span className="bar-label">
            HP {stats.hp} / {stats.maxHp}
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill exp" style={{ width: `${expPercent}%` }} />
          <span className="bar-label">
            EXP {stats.exp} / {stats.expToNext}
          </span>
        </div>
        <div className="bar">
          <div
            className={`bar-fill stage${stage.bossActive ? ' boss' : ''}`}
            style={{ width: `${stagePercent}%` }}
          />
          <span className="bar-label">
            {stage.bossActive ? '⚔ 장수 처치!' : `돌파 ${stage.kills} / ${stage.killsToClear}`}
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill essence" style={{ width: `${essencePercent}%` }} />
          <span className="bar-label">
            {evo.isFinal ? '승천 완료 · 최종 형태' : `정기 ${evo.essence} / ${evo.essenceToEvolve}`}
          </span>
        </div>
      </div>
      <span className="hud-kills">포식 {stats.kills}</span>
    </div>
  );
}
