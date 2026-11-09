import React from 'react';
import { AppSettings, ModelInfo, ThemeName } from '../types';
import {
  Sliders,
  Cpu,
  Layers,
  Thermometer,
  Wrench,
  Palette,
  Tv,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  models: ModelInfo[];
  isRefreshingModels: boolean;
  onRefreshModels: () => void;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  models,
  isRefreshingModels,
  onRefreshModels,
  onClearHistory,
}) => {
  const toggleTool = (toolName: string) => {
    const current = settings.enabledTools;
    const updated = current.includes(toolName)
      ? current.filter((t) => t !== toolName)
      : [...current, toolName];
    onUpdateSettings({ enabledTools: updated });
  };

  const themes: { id: ThemeName; name: string; color: string }[] = [
    { id: 'green', name: 'Phosphor Green', color: '#00ff41' },
    { id: 'amber', name: 'Amber Cathode', color: '#ffb000' },
    { id: 'cyan', name: 'Cyber Cyan', color: '#00f0ff' },
    { id: 'white', name: 'Monochrome', color: '#f0f0f0' },
  ];

  return (
    <aside
      className={`border-r border-[#222222] bg-[#0c0c0c] flex flex-col h-full text-xs select-none transition-all duration-200 z-20 ${
        isOpen ? 'w-80' : 'w-0 overflow-hidden border-none'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b border-[#222222] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-neutral-300">
          <Sliders className="w-4 h-4" />
          <span>HYPERPARAMETERS & TOOLS</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white px-1.5 py-0.5"
          title="Close drawer"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Model Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <label
              htmlFor="model-select"
              className="flex items-center gap-1.5 font-semibold text-neutral-300"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Model Selection</span>
            </label>
            <button
              onClick={onRefreshModels}
              disabled={isRefreshingModels}
              className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <select
            id="model-select"
            data-testid="model-select"
            value={settings.selectedModel}
            onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
            className="w-full bg-[#141414] border border-[#2b2b2b] rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500 text-xs"
          >
            {models.length === 0 ? (
              <option value="">No models detected (Check connection)</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.size ? `(${Math.round(m.size / 1e9 * 10) / 10}GB)` : ''}
                </option>
              ))
            )}
          </select>
          <p className="text-[10px] text-neutral-500">
            Active model queried by OTC proxy.
          </p>
        </div>

        {/* 2. Context Window (num_ctx) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ctx-slider"
              className="flex items-center gap-1.5 font-semibold text-neutral-300"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Context Window (num_ctx)</span>
            </label>
            <span
              data-testid="ctx-value"
              className="text-neutral-200 font-mono font-bold bg-[#141414] px-2 py-0.5 rounded border border-[#262626]"
            >
              {settings.numCtx}
            </span>
          </div>

          <input
            id="ctx-slider"
            data-testid="ctx-slider"
            type="range"
            min="512"
            max="32768"
            step="512"
            value={settings.numCtx}
            onChange={(e) => onUpdateSettings({ numCtx: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500 bg-[#1c1c1c] h-1.5 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>512</span>
            <span>4096</span>
            <span>16384</span>
            <span>32768</span>
          </div>
        </div>

        {/* 3. Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="temp-slider"
              className="flex items-center gap-1.5 font-semibold text-neutral-300"
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Temperature</span>
            </label>
            <span
              data-testid="temp-value"
              className="text-neutral-200 font-mono font-bold bg-[#141414] px-2 py-0.5 rounded border border-[#262626]"
            >
              {settings.temperature.toFixed(2)}
            </span>
          </div>

          <input
            id="temp-slider"
            data-testid="temp-slider"
            type="range"
            min="0.0"
            max="2.0"
            step="0.05"
            value={settings.temperature}
            onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 bg-[#1c1c1c] h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 4. Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="topp-slider"
              className="flex items-center gap-1.5 font-semibold text-neutral-300"
            >
              <span>Top_P</span>
            </label>
            <span
              data-testid="topp-value"
              className="text-neutral-200 font-mono font-bold bg-[#141414] px-2 py-0.5 rounded border border-[#262626]"
            >
              {settings.topP.toFixed(2)}
            </span>
          </div>

          <input
            id="topp-slider"
            data-testid="topp-slider"
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={settings.topP}
            onChange={(e) => onUpdateSettings({ topP: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 bg-[#1c1c1c] h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* 5. Tool Registry Toggles */}
        <div className="space-y-3 pt-2 border-t border-[#222222]">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
            <Wrench className="w-3.5 h-3.5" />
            <span>Active Tools</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 'get_weather', label: 'Weather Forecast (get_weather)', desc: 'Provides real-time city weather forecasts' },
              { id: 'read_file', label: 'File Reader (read_file)', desc: 'Inspects safe workspace files' },
              { id: 'calculator', label: 'Math Calculator (calculator)', desc: 'Calculates arithmetic expressions' },
            ].map((tool) => (
              <label
                key={tool.id}
                className="flex items-start gap-2.5 p-2 rounded bg-[#141414] border border-[#262626] hover:border-neutral-500 cursor-pointer"
              >
                <input
                  type="checkbox"
                  data-testid={`tool-${tool.id}`}
                  checked={settings.enabledTools.includes(tool.id)}
                  onChange={() => toggleTool(tool.id)}
                  className="mt-0.5 accent-emerald-500 rounded"
                />
                <div>
                  <div className="font-medium text-neutral-200">{tool.label}</div>
                  <div className="text-[10px] text-neutral-500">{tool.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 6. Appearance & CRT Effects */}
        <div className="space-y-3 pt-2 border-t border-[#222222]">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
            <Palette className="w-3.5 h-3.5" />
            <span>CRT Theme & Display</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                data-testid={`theme-btn-${t.id}`}
                onClick={() => onUpdateSettings({ theme: t.id })}
                className={`p-2 rounded border text-left flex items-center gap-2 transition-colors ${
                  settings.theme === t.id
                    ? 'border-neutral-400 bg-neutral-800'
                    : 'border-[#262626] bg-[#141414] hover:border-neutral-600'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-[11px] text-neutral-200">{t.name}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between p-2 rounded bg-[#141414] border border-[#262626] cursor-pointer">
            <span className="flex items-center gap-2 text-neutral-300">
              <Tv className="w-3.5 h-3.5" />
              <span>CRT Scanlines Effect</span>
            </span>
            <input
              type="checkbox"
              data-testid="scanlines-toggle"
              checked={settings.scanlines}
              onChange={(e) => onUpdateSettings({ scanlines: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
          </label>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#222222] bg-[#0c0c0c]">
        <button
          data-testid="clear-history-btn"
          onClick={onClearHistory}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-950/20 hover:bg-red-900/40 border border-red-800/40 text-red-300 text-xs transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Terminal Buffer</span>
        </button>
      </div>
    </aside>
  );
};
