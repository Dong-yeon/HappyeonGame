import { useEffect, useState } from 'react';
import { playerData } from '../data/playerData.js';

/** React 기반 HUD — HP바 / 레벨 / 경험치 / 처치 수 */
export default function HUD() {
  const [stats, setStats] = useState(playerData.getState());

  useEffect(() => playerData.subscribe(setStats), []);

  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const expPercent = (stats.exp / stats.expToNext) * 100;

  return (
    <div className="hud">
      <span className="hud-title">군웅록 · 화랑</span>
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
      </div>
      <span className="hud-kills">처치 {stats.kills}</span>
    </div>
  );
}
