import { useEffect, useState } from 'react';
import { playerData } from '../data/playerData.js';
import { stageData } from '../data/stageData.js';

/** React 기반 HUD — 스테이지 / HP바 / 레벨 / 경험치 / 스테이지 진행도 / 처치 수 */
export default function HUD() {
  const [stats, setStats] = useState(playerData.getState());
  const [stage, setStage] = useState(stageData.getState());

  useEffect(() => playerData.subscribe(setStats), []);
  useEffect(() => stageData.subscribe(setStage), []);

  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const expPercent = (stats.exp / stats.expToNext) * 100;
  const stagePercent = stage.bossActive ? 100 : (stage.kills / stage.killsToClear) * 100;

  return (
    <div className="hud">
      <div className="hud-titlecol">
        <span className="hud-title">군웅록 · 화랑</span>
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
            {stage.bossActive ? '⚔ 보스 처치!' : `돌파 ${stage.kills} / ${stage.killsToClear}`}
          </span>
        </div>
      </div>
      <span className="hud-kills">누적 처치 {stats.kills}</span>
    </div>
  );
}
