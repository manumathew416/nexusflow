import React, { useState, useEffect } from 'react';
import { X, Sliders, Save, Trash2 } from 'lucide-react';

export default function NodeConfigModal({ node, isOpen, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (node && node.data) {
      setFormData({ ...node.data });
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const category = formData.nodeCategory || 'filter';
  const opType = formData.operatorType || 'threshold';

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Configure Node</h3>
              <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">{category} node</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Fields */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Label */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Display Label</label>
            <input
              type="text"
              value={formData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* SENSOR SPECIFIC */}
          {category === 'source' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Device ID</label>
                  <input
                    type="text"
                    value={formData.deviceId || ''}
                    onChange={(e) => handleChange('deviceId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Metric</label>
                  <input
                    type="text"
                    value={formData.metric || ''}
                    onChange={(e) => handleChange('metric', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit || ''}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nominal Base</label>
                  <input
                    type="number"
                    value={formData.nominal || 0}
                    onChange={(e) => handleChange('nominal', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* FILTER SPECIFIC */}
          {category === 'filter' && (
            <>
              {opType === 'threshold' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Comparison Operator</label>
                    <select
                      value={formData.operator || '>'}
                      onChange={(e) => handleChange('operator', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value=">">Greater than (&gt;)</option>
                      <option value=">=">Greater or equal (&gt;=)</option>
                      <option value="<">Less than (&lt;)</option>
                      <option value="<=">Less or equal (&lt;=)</option>
                      <option value="==">Exact Equal (==)</option>
                      <option value="!=">Not Equal (!=)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Threshold Value</label>
                    <input
                      type="number"
                      value={formData.threshold !== undefined ? formData.threshold : 80}
                      onChange={(e) => handleChange('threshold', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {opType === 'moving_average' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Window Size (N Readings)</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={formData.windowSize || 5}
                    onChange={(e) => handleChange('windowSize', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Calculates rolling arithmetic mean of last N readings.</p>
                </div>
              )}

              {opType === 'rate_of_change' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Delta Threshold (|Δ| / sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deltaThreshold || 2}
                    onChange={(e) => handleChange('deltaThreshold', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Passes when differential rate of change exceeds this threshold.</p>
                </div>
              )}

              {opType === 'range_gate' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Min Boundary</label>
                      <input
                        type="number"
                        value={formData.min !== undefined ? formData.min : 20}
                        onChange={(e) => handleChange('min', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Max Boundary</label>
                      <input
                        type="number"
                        value={formData.max !== undefined ? formData.max : 80}
                        onChange={(e) => handleChange('max', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Filter Mode</label>
                    <select
                      value={formData.mode || 'outside'}
                      onChange={(e) => handleChange('mode', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                    >
                      <option value="outside">Trigger when OUTSIDE [Min, Max]</option>
                      <option value="inside">Trigger when INSIDE [Min, Max]</option>
                    </select>
                  </div>
                </div>
              )}

              {opType === 'debounce' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Debounce Duration (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.seconds || 5}
                    onChange={(e) => handleChange('seconds', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Suppresses subsequent triggers within this time window.</p>
                </div>
              )}
            </>
          )}

          {/* ACTION SPECIFIC */}
          {category === 'action' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Action Type</label>
                  <select
                    value={formData.actionType || 'sms'}
                    onChange={(e) => handleChange('actionType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  >
                    <option value="sms">SMS Alert</option>
                    <option value="webhook">Webhook POST</option>
                    <option value="alert">Dashboard Alert</option>
                    <option value="actuator">Relay / Actuator Trip</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severity Level</label>
                  <select
                    value={formData.severity || 'warning'}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              {formData.actionType === 'sms' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Recipient Phone Number</label>
                  <input
                    type="text"
                    value={formData.recipient || ''}
                    onChange={(e) => handleChange('recipient', e.target.value)}
                    placeholder="+1 (555) 019-8234"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              )}

              {formData.actionType === 'webhook' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Webhook Endpoint URL</label>
                  <input
                    type="text"
                    value={formData.webhookUrl || ''}
                    onChange={(e) => handleChange('webhookUrl', e.target.value)}
                    placeholder="https://api.your-system.com/webhook"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alert Message Template</label>
                <textarea
                  rows="2"
                  value={formData.messageTemplate || ''}
                  onChange={(e) => handleChange('messageTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Variables: {'{deviceId}'}, {'{metric}'}, {'{value}'}, {'{unit}'}, {'{pipelineName}'}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Node</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors text-xs shadow-md shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}