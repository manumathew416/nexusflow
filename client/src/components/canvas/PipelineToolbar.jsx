import React, { useState } from 'react';
import {
  Save,
  Trash2,
  BookOpen,
  Zap
} from 'lucide-react';
import { PRESET_PIPELINES } from '../../constants/nodeTemplates';

export default function PipelineToolbar({
  pipelineName,
  setPipelineName,
  pipelineDesc,
  setPipelineDesc,
  isActive,
  onToggleActive,
  onSave,
  onClear,
  onLoadPreset,
  onTestRun,
  isSaving
}) {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="h-16 px-6 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between select-none z-10">
      {/* Left: Pipeline Title & Description */}
      <div className="flex items-center gap-4">
        <div>
          <input
            type="text"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="Pipeline Name..."
            className="text-sm font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-1 py-0.5 transition-colors font-mono max-w-[260px]"
          />
          <input
            type="text"
            value={pipelineDesc}
            onChange={(e) => setPipelineDesc(e.target.value)}
            placeholder="Add pipeline description..."
            className="block text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-800 focus:border-slate-600 focus:outline-none px-1 py-0.5 transition-colors max-w-[320px] truncate"
          />
        </div>

        {/* Live Active Status Badge */}
        <button
          onClick={onToggleActive}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all duration-300 border ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>{isActive ? 'ENGINE ACTIVE' : 'PAUSED'}</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Preset Templates Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/80 shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Presets</span>
          </button>

          {showPresets && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-fadeIn">
              <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 font-bold">Industrial Templates</div>
              {PRESET_PIPELINES.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadPreset(preset);
                    setShowPresets(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Test Run Stream */}
        <button
          onClick={onTestRun}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition-colors border border-purple-500/30"
          title="Validate graph structure and pipeline connectivity"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Validate</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-xs font-medium transition-colors border border-slate-700/80"
          title="Clear all nodes and edges"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Save & Deploy Button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Deploying...' : 'Save & Deploy'}</span>
        </button>
      </div>
    </div>
  );
}