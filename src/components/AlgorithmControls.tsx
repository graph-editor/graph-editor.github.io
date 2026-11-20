import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  X,
  Gauge,
  ChevronDown,
} from 'lucide-react';
import { AlgorithmStep } from '../types/graph';
import confetti from 'canvas-confetti';

interface AlgorithmControlsProps {
  steps: AlgorithmStep[];
  currentStepIndex: number;
  onSetStepIndex: (index: number) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AlgorithmControls: React.FC<AlgorithmControlsProps> = ({
  steps,
  currentStepIndex,
  onSetStepIndex,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(300); // ms per step (Fast default)

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= totalSteps - 1) {
      setIsPlaying(false);
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.82 },
      });
      return;
    }

    const timer = setTimeout(() => {
      onSetStepIndex(currentStepIndex + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, totalSteps, speed, onSetStepIndex]);

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      onSetStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (currentStepIndex < totalSteps - 1) {
      onSetStepIndex(currentStepIndex + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    onSetStepIndex(0);
  };

  const speedLabel = speed === 300 ? 'Fast (0.3s)' : speed === 800 ? 'Normal (0.8s)' : 'Slow (1.5s)';

  // Calculate percentage for custom slider background
  const progressPercent = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 100;

  return (
    <div className={`backdrop-blur-xl border rounded-2xl shadow-2xl p-4 sm:p-5 select-none w-full animate-slide-up ${
      isLight ? 'bg-white/95 border-slate-200 text-slate-900 shadow-xl' : 'bg-black/95 border-neutral-800 text-white shadow-2xl'
    }`}>
      {/* Top Header Row: Green Dot + Title + Step Badge | Speed + Close */}
      <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <h3 className={`font-bold text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentStep.title}</h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
            isLight ? 'bg-slate-100 text-slate-700' : 'bg-neutral-900 text-neutral-300'
          }`}>
            Step {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Speed Selector Pill */}
          <div className={`relative flex items-center border rounded-lg px-2.5 py-1 text-xs ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-950/90 border-slate-800 text-slate-300'
          }`}>
            <Gauge size={13} className={`mr-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className={`bg-transparent text-xs focus:outline-none cursor-pointer pr-4 appearance-none font-mono ${
                isLight ? 'text-slate-800 font-medium' : 'text-slate-200'
              }`}
            >
              <option value={300} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900'}>Fast (0.3s)</option>
              <option value={800} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900'}>Normal (0.8s)</option>
              <option value={1500} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900'}>Slow (1.5s)</option>
            </select>
            <ChevronDown size={12} className={`pointer-events-none absolute right-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-950 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Close Tracer (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Description Text */}
      <div className={`pt-2.5 pb-2 text-xs leading-relaxed min-h-[36px] flex items-center justify-between ${
        isLight ? 'text-slate-700 font-medium' : 'text-slate-400'
      }`}>
        <span>{currentStep.description}</span>
        {currentStep.dataStructureView && currentStep.dataStructureView.items.length > 0 && (
          <span className={`hidden sm:inline-block ml-2 text-[11px] font-mono px-2 py-0.5 rounded border ${
            isLight ? 'text-blue-700 bg-blue-50 border-blue-200 font-semibold' : 'text-blue-400 bg-slate-950 border-slate-800'
          }`}>
            {currentStep.dataStructureView.name}: [{currentStep.dataStructureView.items.slice(0, 5).join(', ')}]
          </span>
        )}
      </div>

      {/* Progress Slider (Electric blue track with clean thumb) */}
      <div className="py-2">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalSteps - 1)}
            value={currentStepIndex}
            onChange={e => {
              setIsPlaying(false);
              onSetStepIndex(Number(e.target.value));
            }}
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progressPercent}%, ${isLight ? '#cbd5e1' : '#1e293b'} ${progressPercent}%, ${isLight ? '#cbd5e1' : '#1e293b'} 100%)`,
            }}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none accent-blue-500"
          />
        </div>
      </div>

      {/* Centered Controls: Reset, Prev, Play/Pause, Next */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          onClick={handleReset}
          className={`p-2 rounded-xl transition-colors ${
            isLight ? 'text-slate-500 hover:text-slate-950 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Reset to Step 1"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`p-2 disabled:opacity-30 rounded-xl transition-colors ${
            isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Previous Step"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
          className={`p-2 disabled:opacity-30 rounded-xl transition-colors ${
            isLight ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Next Step"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
};
