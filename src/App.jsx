import PhaserGame from './game/PhaserGame.jsx';
import HUD from './components/HUD.jsx';

export default function App() {
  return (
    <div className="game-container">
      <PhaserGame />
      <HUD />
    </div>
  );
}
