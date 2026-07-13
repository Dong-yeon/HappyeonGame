import PhaserGame from './game/PhaserGame.jsx';
import HUD from './components/HUD.jsx';
import Shop from './components/Shop.jsx';
import OfflineReward from './components/OfflineReward.jsx';

export default function App() {
  return (
    <div className="game-container">
      <PhaserGame />
      <HUD />
      <Shop />
      <OfflineReward />
    </div>
  );
}
