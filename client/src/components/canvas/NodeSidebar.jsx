import React, { useState } from 'react';
import {
  AVAILABLE_NODES,
  NODE_CATEGORIES
} from '../../constants/nodeTemplates';
import {
  Flame,
  Activity,
  Gauge,
  Snowflake,
  Radio,
  SlidersHorizontal,
  TrendingUp,
  Zap,
  Maximize2,
  Calculator,
  Clock,
  MessageSquare,
  Webhook,
  BellRing,
  PowerOff,
  Layers,
  Search
} from 'lucide-react';

const iconMap = {
  Flame,
  Activity,
  Gauge,
  Snowflake,
  Radio,
  SlidersHorizontal,
  TrendingUp,
  Zap,
  Maximize2,
  Calculator,
  Clock,
  MessageSquare,
  Webhook,
  BellRing,
  PowerOff
};

export default function NodeSidebar() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const onDragStart = (event, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredNodes = AVAILABLE_NODES.filter(node => {
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    const matchesSearch = node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          node.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All' },
    { id: NODE_CATEGORIES.SOURCE, label: 'Sensors' },
    { id: NODE_CATEGORIES.FILTER, label: 'Filters' },
    { id: NODE_CATEGORIES.MATH, label: 'Math' },
    { id: NODE_CATEGORIES.ACTION, label: 'Actions' }
  ];

  return (
    <aside className="w-80 h-full flex flex-col bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-lg select-none z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">Node Palette</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">Drag nodes onto the canvas to construct reactive pipelines.</p>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Draggable Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredNodes.map((node, idx) => {
          const Icon = iconMap[node.icon] || Radio;
          return (
            <div
              key={idx}
              draggable
              onDragStart={(e) => onDragStart(e, node)}
              className="group p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-md hover:shadow-cyan-950/30 hover:scale-[1.01]"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${node.color} text-white shadow-sm shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                      {node.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {node.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    {node.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No matching nodes found.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>Nodes Available</span>
        <span className="text-cyan-400 font-bold">{AVAILABLE_NODES.length} Total</span>
      </div>
    </aside>
  );
}