import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { saveManager } from './data/saveManager.js';
import './styles.css';

// 저장 데이터를 먼저 복원한 뒤 게임을 렌더 (스탯/스테이지/골드가 게임 시작 전에 반영되도록)
saveManager.init().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
