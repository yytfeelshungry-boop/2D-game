import React from 'react';
import GameCanvas from './components/GameCanvas';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <GameCanvas />
    </div>
  );
}
