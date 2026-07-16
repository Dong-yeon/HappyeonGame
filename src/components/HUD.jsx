import { useEffect, useState } from 'react';
import { playerData } from '../data/playerData.js';
import { stageData } from '../data/stageData.js';
import { evolutionData } from '../data/evolutionData.js';
import { rebirthData } from '../data/rebirthData.js';
import { economyData } from '../data/economyData.js';
import { CHAPTER } from '../game/constants.js';
import { fmt } from '../format.js';

/** React 기반 HUD — 요괴 형태 / HP / 레벨 / 경험치 / 스테이지 진행 / 정기(진화) / 포식 수 */
export default function HUD() {
  const [stats, setStats] = useState(playerData.getState());
  const [stage, setStage] = useState(stageData.getState());
  const [evo, setEvo] = useState(evolutionData.getState());
  const [rb, setRb] = useState(rebirthData.getState());
  const [materials, setMaterials] = useState(economyData.getState().materials);

  useEffect(() => playerData.subscribe(setStats), []);
  useEffect(() => stageData.subscribe(setStage), []);
  useEffect(() => evolutionData.subscribe(setEvo), []);
  useEffect(() => rebirthData.subscribe(setRb), []);
  useEffect(() => economyData.subscribe((s) => setMaterials(s.materials)), []);

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
          {rb.count > 0 && <span className="hud-rebirth"> · 전생 {rb.count}회</span>}
        </span>
        <span className="hud-stage">
          챕터 {stage.chapter} · {stage.stageInChapter}/{CHAPTER.SIZE} · {stage.stageName}
          {stage.isChapterBossStage && <span className="hud-gate"> · 토벌대 관문</span>}
        </span>
      </div>
      <span className="hud-level">Lv.{stats.level}</span>
      <div className="hud-bars">
        <div className="bar">
          <div className="bar-fill hp" style={{ width: `${hpPercent}%` }} />
          <span className="bar-label">
            HP {fmt(stats.hp)} / {fmt(stats.maxHp)}
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill exp" style={{ width: `${expPercent}%` }} />
          <span className="bar-label">
            EXP {fmt(stats.exp)} / {fmt(stats.expToNext)}
          </span>
        </div>
        <div className="bar">
          <div
            className={`bar-fill stage${stage.bossActive ? ' boss' : ''}`}
            style={{ width: `${stagePercent}%` }}
          />
          <span className="bar-label">
            {stage.bossActive ? '⚔ 토벌대 대장 처치!' : `돌파 ${stage.kills} / ${stage.killsToClear}`}
          </span>
        </div>
        <div className="bar">
          <div className="bar-fill essence" style={{ width: `${essencePercent}%` }} />
          <span className="bar-label">
            {evo.isFinal ? '승천 완료 · 최종 형태' : `정기 ${fmt(evo.essence)} / ${fmt(evo.essenceToEvolve)}`}
          </span>
        </div>
      </div>
      <div className="hud-right">
        <span className="hud-mat">🪵 {fmt(materials)}</span>
        <span className="hud-kills">포식 {fmt(stats.kills)}</span>
      </div>
    </div>
  );
}
