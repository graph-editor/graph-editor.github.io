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
}

export const AlgorithmControls: React.FC<AlgorithmControlsProps> = ({
  steps,
  currentStepIndex,
  onSetStepIndex,
  onClose,
}) => {
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
    <div className="bg-[#0b101b]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 select-none w-full animate-slide-up">
      {/* Top Header Row: Green Dot + Title + Step Badge | Speed + Close */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <h3 className="font-bold text-sm text-white tracking-tight">{currentStep.title}</h3>
          <span className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-0.5 rounded-full font-mono font-medium">
            Step {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Speed Selector Pill */}
          <div className="relative flex items-center bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Gauge size={13} className="text-slate-400 mr-1.5" />
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-4 appearance-none font-mono"
            >
              <option value={300} className="bg-slate-900">Fast (0.3s)</option>
              <option value={800} className="bg-slate-900">Normal (0.8s)</option>
              <option value={1500} className="bg-slate-900">Slow (1.5s)</option>
            </select>
            <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-2" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
            title="Close Tracer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Description Text */}
      <div className="pt-2.5 pb-2 text-xs text-slate-400 leading-relaxed min-h-[36px] flex items-center justify-between">
        <span>{currentStep.description}</span>
        {currentStep.dataStructureView && currentStep.dataStructureView.items.length > 0 && (
          <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-blue-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
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
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`,
            }}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none accent-blue-500"
          />
        </div>
      </div>

      {/* Centered Controls: Reset, Prev, Play/Pause, Next */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
          title="Reset to Step 1"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 disabled:opacity-30 rounded-xl transition-colors"
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
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 disabled:opacity-30 rounded-xl transition-colors"
          title="Next Step"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
};
