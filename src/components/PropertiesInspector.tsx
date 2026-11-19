import React from 'react';
import { GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { CP_PALETTE, CODEFORCES_TIER_COLORS, detectNodeType } from '../utils/parser';
import { Trash2, ArrowLeftRight, X, Palette, Pin, CheckCircle2, Sliders } from 'lucide-react';

interface PropertiesInspectorProps {
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  settings: GraphSettings;
  onUpdateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSetTreeRoot: (nodeId: string) => void;
  onTogglePinNode: (nodeId: string) => void;
  onClose: () => void;
}

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  selectedNode,
  selectedEdge,
  settings,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onSetTreeRoot,
  onTogglePinNode,
  onClose,
}) => {
  if (!selectedNode && !selectedEdge) return null;

  return (
    <aside className="w-72 border-l border-slate-800/80 bg-slate-900/95 flex flex-col z-10 select-none shrink-0 h-full overflow-hidden">
      {/* Docked Header */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-blue-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {selectedNode ? `Node ${selectedNode.label}` : 'Edge Properties'}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close Inspector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Docked Body: Scrollable */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* NODE PROPERTIES */}
        {selectedNode && (() => {
          const nodeType = selectedNode.nodeType || detectNodeType(selectedNode.label || selectedNode.id);
          const typeBadgeStyles = {
            int: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
            char: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
            bool: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
            string: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
          }[nodeType] || 'bg-slate-800 border-slate-700 text-slate-300';

          return (
            <div className="space-y-4">
              {/* Label / Name with Type Badge */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-slate-400">Node Identifier</label>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${typeBadgeStyles}`}>
                    {nodeType}
                  </span>
                </div>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={e => onUpdateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono mb-1.5"
                  placeholder="e.g. A, true, 42, Alice"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-500 mr-0.5">Preset:</span>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'A' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  >
                    Char ('A')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: selectedNode.label === 'true' ? 'false' : 'true' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
                  >
                    Bool ({selectedNode.label === 'true' ? 'false' : 'true'})
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: '1' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Int ('1')
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { label: 'Node' })}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                  >
                    String
                  </button>
                </div>
              </div>

            {/* Fixed / Pin Position Toggle */}
            <div>
              <button
                onClick={() => onTogglePinNode(selectedNode.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${
                  selectedNode.isPinned
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-inner'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Pin size={14} className={selectedNode.isPinned ? 'rotate-45 text-amber-400' : ''} />
                <span>
                  {selectedNode.isPinned ? 'Fixed (Double-click to unpin)' : 'Fix Position (Pin node)'}
                </span>
              </button>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {selectedNode.isPinned
                  ? 'Position is locked and immune to movement'
                  : 'Double-click node anytime on canvas to fix it'}
              </p>
            </div>

            {/* Node Value / Weight (for Tree DP / Vertex weights) */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Vertex Value / Weight</label>
              <input
                type="number"
                value={selectedNode.value ?? ''}
                placeholder="e.g. 10"
                onChange={e =>
                  onUpdateNode(selectedNode.id, {
                    value: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Color Picker Palette */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Node Color</label>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {CP_PALETTE.map(p => (
                  <button
                    key={p.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: p.color })}
                    className={`w-7 h-7 rounded-lg transition-transform border ${
                      selectedNode.color === p.color
                        ? 'scale-110 border-white ring-2 ring-blue-500/50'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>

              {/* Codeforces rating colors */}
              <div className="text-[10px] text-slate-500 mb-1">Codeforces Tiers:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {CODEFORCES_TIER_COLORS.map(cf => (
                  <button
                    key={cf.color}
                    onClick={() => onUpdateNode(selectedNode.id, { color: cf.color })}
                    className="px-2 py-1 text-[10px] rounded border border-slate-800 truncate text-slate-200 hover:border-slate-600 text-left"
                    style={{ borderLeftColor: cf.color, borderLeftWidth: 3 }}
                    title={cf.name}
                  >
                    {cf.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => onSetTreeRoot(selectedNode.id)}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors text-center font-medium"
              >
                Set as Tree Root
              </button>
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20"
                title="Delete Node (Del)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })()}

        {/* EDGE PROPERTIES */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between">
              <span>Edge:</span>
              <span>
                <strong className="text-blue-400">{selectedEdge.source}</strong> {selectedEdge.directed ? '→' : '—'}{' '}
                <strong className="text-blue-400">{selectedEdge.target}</strong>
              </span>
            </div>

            {/* Edge Weight */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Edge Weight</label>
              <input
                type="number"
                value={selectedEdge.weight ?? ''}
                placeholder="e.g. 5"
                onChange={e =>
                  onUpdateEdge(selectedEdge.id, {
                    weight: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Edge Color */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Edge Color</label>
              <div className="grid grid-cols-5 gap-1.5">
                {CP_PALETTE.map(p => (
                  <button
                    key={p.color}
                    onClick={() => onUpdateEdge(selectedEdge.id, { color: p.color })}
                    className={`w-7 h-7 rounded-lg transition-transform border ${
                      selectedEdge.color === p.color
                        ? 'scale-110 border-white ring-2 ring-blue-500/50'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              {settings.isDirected && (
                <button
                  onClick={() =>
                    onUpdateEdge(selectedEdge.id, {
                      source: selectedEdge.target,
                      target: selectedEdge.source,
                    })
                  }
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight size={13} />
                  <span>Reverse Direction</span>
                </button>
              )}
              <button
                onClick={() => onDeleteEdge(selectedEdge.id)}
                className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-red-500/20"
                title="Delete Edge (Del)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
