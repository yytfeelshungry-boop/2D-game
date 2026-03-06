import React, { useEffect, useState } from 'react';
import { Input } from '../game/Input';

interface VirtualControllerProps {
  input: Input | null;
}

export default function VirtualController({ input }: VirtualControllerProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if the device supports touch
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  if (!isTouchDevice || !input) return null;

  const handleTouchStart = (code: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    input.simulateKeyDown(code);
  };

  const handleTouchEnd = (code: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    input.simulateKeyUp(code);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-4 sm:p-8 z-50">
      {/* Left side: D-Pad */}
      <div className="flex flex-col gap-2 pointer-events-auto opacity-70">
        <div className="flex justify-center">
          <ControlButton 
            label="↑" 
            code="ArrowUp" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-16 h-16 rounded-xl text-xl"
          />
        </div>
        <div className="flex gap-2">
          <ControlButton 
            label="←" 
            code="ArrowLeft" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-16 h-16 rounded-xl text-xl"
          />
          <ControlButton 
            label="↓" 
            code="ArrowDown" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-16 h-16 rounded-xl text-xl"
          />
          <ControlButton 
            label="→" 
            code="ArrowRight" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-16 h-16 rounded-xl text-xl"
          />
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex gap-4 pointer-events-auto opacity-70 mb-4">
        <div className="flex flex-col gap-4 justify-end">
          <ControlButton 
            label="DASH" 
            code="ShiftLeft" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-20 h-20 rounded-full text-sm"
          />
        </div>
        <div className="flex flex-col gap-4 justify-end">
          <ControlButton 
            label="ATK" 
            code="KeyJ" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-20 h-20 rounded-full text-sm mb-10"
          />
          <ControlButton 
            label="JUMP" 
            code="Space" 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            className="w-20 h-20 rounded-full text-sm"
          />
        </div>
      </div>
    </div>
  );
}

interface ControlButtonProps {
  label: string;
  code: string;
  onTouchStart: (code: string) => (e: React.TouchEvent) => void;
  onTouchEnd: (code: string) => (e: React.TouchEvent) => void;
  className?: string;
}

function ControlButton({ label, code, onTouchStart, onTouchEnd, className = "w-16 h-16 rounded-xl" }: ControlButtonProps) {
  return (
    <button
      className={`bg-slate-800/80 border-2 border-slate-500/50 text-white font-bold flex items-center justify-center active:bg-slate-600/80 active:scale-95 transition-transform select-none ${className}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      onTouchStart={onTouchStart(code)}
      onTouchEnd={onTouchEnd(code)}
      onTouchCancel={onTouchEnd(code)}
    >
      {label}
    </button>
  );
}
