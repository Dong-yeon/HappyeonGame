import PhaserGame from './game/PhaserGame.jsx';
import HUD from './components/HUD.jsx';
import Shop from './components/Shop.jsx';
import Codex from './components/Codex.jsx';
import OfflineReward from './components/OfflineReward.jsx';
import Evolve from './components/Evolve.jsx';

export default function App() {
  return (
    <div className="game-container">
      <PhaserGame />
      <HUD />
      <Shop />
      <Codex />
      <Evolve />
      <OfflineReward />
    </div>
  );
}
