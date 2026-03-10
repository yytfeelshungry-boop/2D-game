import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Sword, Wind, ChevronsUp } from 'lucide-react';
import { Input } from '../game/Input';
import { audio } from '../game/Audio';

interface VirtualControllerProps {
  input: Input | null;
}

export default function VirtualController({ input }: VirtualControllerProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if the device supports touch or is a small screen
    const checkTouch = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 800;
      setIsTouchDevice(isTouch || isSmallScreen);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  if (!isTouchDevice || !input) return null;

  const handlePointerDown = (code: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    audio.init();
    input.simulateKeyDown(code);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (code: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    input.simulateKeyUp(code);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-4 pb-16 sm:p-8 sm:pb-20 z-50">
      {/* Left side: D-Pad */}
      <div className="flex flex-col gap-1 pointer-events-auto opacity-70">
        <div className="flex justify-center">
          <ControlButton 
            label={<ArrowUp size={24} />} 
            code="ArrowUp" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-12 h-12 rounded-xl text-lg"
          />
        </div>
        <div className="flex gap-1">
          <ControlButton 
            label={<ArrowLeft size={24} />} 
            code="ArrowLeft" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-12 h-12 rounded-xl text-lg"
          />
          <ControlButton 
            label={<ArrowDown size={24} />} 
            code="ArrowDown" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-12 h-12 rounded-xl text-lg"
          />
          <ControlButton 
            label={<ArrowRight size={24} />} 
            code="ArrowRight" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-12 h-12 rounded-xl text-lg"
          />
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex gap-2 pointer-events-auto opacity-70 mb-2">
        <div className="flex flex-col gap-2 justify-end">
          <ControlButton 
            label={<Wind size={24} />} 
            code="ShiftLeft" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-14 h-14 rounded-full text-xs"
          />
        </div>
        <div className="flex flex-col gap-2 justify-end">
          <ControlButton 
            label={<ChevronsUp size={24} />} 
            code="Space" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-14 h-14 rounded-full text-xs mb-6"
          />
          <ControlButton 
            label={<Sword size={24} />} 
            code="KeyJ" 
            onPointerDown={handlePointerDown} 
            onPointerUp={handlePointerUp} 
            className="w-14 h-14 rounded-full text-xs"
          />
        </div>
      </div>
    </div>
  );
}

interface ControlButtonProps {
  label: React.ReactNode;
  code: string;
  onPointerDown: (code: string) => (e: React.PointerEvent) => void;
  onPointerUp: (code: string) => (e: React.PointerEvent) => void;
  className?: string;
}

function ControlButton({ label, code, onPointerDown, onPointerUp, className = "w-16 h-16 rounded-xl" }: ControlButtonProps) {
  return (
    <button
      className={`bg-slate-800/80 border-2 border-slate-500/50 text-white font-bold flex items-center justify-center active:bg-slate-600/80 active:scale-95 transition-transform select-none ${className}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
      onPointerDown={onPointerDown(code)}
      onPointerUp={onPointerUp(code)}
      onPointerCancel={onPointerUp(code)}
      onTouchStart={(e) => {
        // Only prevent default if it's not a multi-touch gesture on the same button
        if (e.touches.length <= 1) {
          e.preventDefault();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onSelect={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <span className="pointer-events-none">{label}</span>
    </button>
  );
}
