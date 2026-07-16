import { useState } from 'react';
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
import AudioControls from './components/AudioControls.jsx';

export default function App() {
  const [hatchOpen, setHatchOpen] = useState(false);

  return (
    <div className="game-container">
      <PhaserGame />
      <HUD />
      <Shop />
      <Codex onHatch={() => setHatchOpen(true)} />
      <Care />
      <Expedition />
      <SkillIndicator />
      <AudioControls />
      <Evolve />
      <Rebirth />
      <OfflineReward />
      <SpeciesPicker hatchOpen={hatchOpen} onClose={() => setHatchOpen(false)} />
    </div>
  );
}
