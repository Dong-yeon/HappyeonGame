import { useState, useEffect, useRef } from 'react';
import PhaserGame from './game/PhaserGame.jsx';
import HUD from './components/HUD.jsx';
import Shop from './components/Shop.jsx';
import Codex from './components/Codex.jsx';
import Care from './components/Care.jsx';
import OfflineReward from './components/OfflineReward.jsx';
import Evolve from './components/Evolve.jsx';
import Rebirth from './components/Rebirth.jsx';
import SpeciesPicker from './components/SpeciesPicker.jsx';
import SkillIndicator from './components/SkillIndicator.jsx';
import Expedition from './components/Expedition.jsx';
import Retention from './components/Retention.jsx';
import Settings from './components/Settings.jsx';
import Title from './components/Title.jsx';
import AdBoost from './components/AdBoost.jsx';
import AdModal from './components/AdModal.jsx';

const BASE_W = 1280;
const BASE_H = 720;

/**
 * 1280×720 고정 디자인을 화면 크기에 맞춰 통째로 스케일 (레터박스).
 * 절대배치 UI 좌표계를 그대로 유지하면서 모바일/태블릿 어디서든 겹침 없이 축소된다.
 */
function useStageScale(ref) {
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
      el.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, [ref]);
}

export default function App() {
  const [hatchOpen, setHatchOpen] = useState(false);
  const stageRef = useRef(null);
  useStageScale(stageRef);

  return (
    <div className="game-container">
      <div className="stage" ref={stageRef}>
        <PhaserGame />
        <HUD />
        <Shop />
        <Codex onHatch={() => setHatchOpen(true)} />
        <Care />
        <Expedition />
        <Retention />
        <SkillIndicator />
        <AdBoost />
        <Settings />
        <Evolve />
        <Rebirth />
        <OfflineReward />
        <SpeciesPicker hatchOpen={hatchOpen} onClose={() => setHatchOpen(false)} />
        <AdModal />
        <Title />
      </div>
      {/* 세로 모드 안내 (모바일) — 스테이지 밖 전체화면 오버레이 */}
      <div className="rotate-hint">
        <div className="rotate-icon">📱↻</div>
        <div className="rotate-text">가로로 돌려서 플레이하세요</div>
      </div>
    </div>
  );
}
