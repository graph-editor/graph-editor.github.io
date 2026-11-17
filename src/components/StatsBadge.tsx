import React from 'react';
import { GraphStats } from '../types/graph';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface StatsBadgeProps {
  stats: GraphStats;
}

export const StatsBadge: React.FC<StatsBadgeProps> = ({ stats }) => {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 select-none pointer-events-none z-10">
      {/* Basic Metrics Pill */}
      <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto text-xs font-mono">
        <div>
          <span className="text-slate-400">V: </span>
          <strong className="text-blue-400 font-semibold">{stats.nodeCount}</strong>
        </div>
        <div className="w-[1px] h-3 bg-slate-800" />
        <div>
          <span className="text-slate-400">E: </span>
          <strong className="text-indigo-400 font-semibold">{stats.edgeCount}</strong>
        </div>
        <div className="w-[1px] h-3 bg-slate-800" />
        <div>
          <span className="text-slate-400">Comp: </span>
          <strong className="text-emerald-400 font-semibold">{stats.componentCount}</strong>
        </div>
      </div>

      {/* Graph Characteristic Badges */}
      <div className="hidden lg:flex items-center gap-1.5 pointer-events-auto">
        {stats.isTree && (
          <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-medium text-emerald-300">
            Tree
          </span>
        )}

        {stats.isDAG && !stats.isTree && (
          <span className="px-2 py-1 rounded-lg bg-blue-950/60 border border-blue-500/40 text-[11px] font-medium text-blue-300">
            DAG
          </span>
        )}

        {stats.isBipartite && !stats.isTree && (
          <span className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-[11px] font-medium text-purple-300">
            Bipartite
          </span>
        )}

        {/* Warning Badges for CP pitfalls */}
        {stats.hasSelfLoops && (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-[11px] font-medium text-amber-300"
            title="Warning: Self-loops can cause infinite loops or incorrect state in some CP algorithms"
          >
            <AlertTriangle size={12} />
            <span>Self-Loops</span>
          </span>
        )}

        {stats.hasMultiEdges && (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-[11px] font-medium text-amber-300"
            title="Warning: Parallel edges between same pair of vertices"
          >
            <AlertTriangle size={12} />
            <span>Multi-Edges</span>
          </span>
        )}
      </div>
    </div>
  );
};
