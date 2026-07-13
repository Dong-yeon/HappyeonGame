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

export default function App() {
  return (
    <div className="game-container">
      <PhaserGame />
      <HUD />
      <Shop />
      <Codex />
      <Care />
      <SkillIndicator />
      <Evolve />
      <Rebirth />
      <OfflineReward />
      <SpeciesPicker />
    </div>
  );
}
