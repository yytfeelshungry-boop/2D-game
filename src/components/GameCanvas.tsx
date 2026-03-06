import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { Input } from '../game/Input';
import VirtualController from './VirtualController';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputInstance, setInputInstance] = useState<Input | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Internal resolution
    const GAME_WIDTH = 400;
    const GAME_HEIGHT = 225;
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // Disable smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    const input = new Input();
    setInputInstance(input);
    const game = new Game(GAME_WIDTH, GAME_HEIGHT);

    let animationFrameId: number;
    let lastTime = performance.now();
    const targetFPS = 60;
    const frameDuration = 1000 / targetFPS;
    let accumulator = 0;

    const loop = (time: number) => {
      animationFrameId = requestAnimationFrame(loop);

      const deltaTime = time - lastTime;
      lastTime = time;
      
      // Cap delta time to prevent spiral of death if tab is inactive
      accumulator += Math.min(deltaTime, 100);

      while (accumulator >= frameDuration) {
        game.update(input);
        input.update();
        accumulator -= frameDuration;
      }

      game.draw(ctx);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-950 text-slate-200 font-mono">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-green-400 mb-2 tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(74, 222, 128, 0.5)' }}>Rogue Cells</h1>
        <p className="text-xs text-slate-400">A pixel-art action roguelite</p>
      </div>
      
      <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-green-900/20 border-2 border-slate-800 group touch-none select-none">
        <canvas
          ref={canvasRef}
          className="w-full max-w-[800px] aspect-video bg-black"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* CRT Scanline Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-30 mix-blend-overlay" />
        {/* Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
        
        {/* Virtual Controller for Touch Devices */}
        <VirtualController input={inputInstance} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 text-xs text-slate-400 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-slate-200 font-bold mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Movement</h3>
          <ul className="space-y-1">
            <li><kbd className="bg-slate-800 px-1 rounded text-slate-300">A</kbd> / <kbd className="bg-slate-800 px-1 rounded text-slate-300">D</kbd> : Move</li>
            <li><kbd className="bg-slate-800 px-1 rounded text-slate-300">W</kbd> / <kbd className="bg-slate-800 px-1 rounded text-slate-300">Space</kbd> : Jump (Double Jump)</li>
            <li><span className="text-emerald-400 font-bold">New:</span> <kbd className="bg-slate-800 px-1 rounded text-slate-300">S</kbd> : Drop through wooden platforms</li>
            <li>Jump against walls to Wall Jump!</li>
          </ul>
        </div>
        <div>
          <h3 className="text-slate-200 font-bold mb-2 uppercase tracking-wider border-b border-slate-700 pb-1">Combat</h3>
          <ul className="space-y-1">
            <li><kbd className="bg-slate-800 px-1 rounded text-slate-300">J</kbd> / <kbd className="bg-slate-800 px-1 rounded text-slate-300">X</kbd> : Attack</li>
            <li><kbd className="bg-slate-800 px-1 rounded text-slate-300">L</kbd> / <kbd className="bg-slate-800 px-1 rounded text-slate-300">Shift</kbd> : Dash (Invincible)</li>
            <li><span className="text-emerald-400 font-bold">New:</span> Jump on enemies to Stomp them!</li>
            <li><kbd className="bg-slate-800 px-1 rounded text-slate-300">S</kbd> + <kbd className="bg-slate-800 px-1 rounded text-slate-300">J</kbd> in air : Plunge Attack!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
