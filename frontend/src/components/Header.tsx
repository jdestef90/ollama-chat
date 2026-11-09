import React, { useState } from 'react';
import { AppSettings, ModelInfo } from '../types';
import { Terminal, Sliders, RefreshCw, Cpu, Globe, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  isOnline: boolean;
  modelsCount: number;
  isConnecting: boolean;
  onRefreshModels: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  isOnline,
  modelsCount,
  isConnecting,
  onRefreshModels,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(settings.customUrl);
  const [tempApiKey, setTempApiKey] = useState(settings.apiKey);

  const handleSaveConfig = () => {
    onUpdateSettings({ customUrl: tempUrl, apiKey: tempApiKey });
    setShowConfigModal(false);
    onRefreshModels();
  };

  return (
    <header className="border-b border-[#222222] bg-[#0c0c0c]/90 backdrop-blur px-4 py-2 flex items-center justify-between text-xs select-none">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-wider crt-glow text-sm">
          <Terminal className="w-4 h-4 inline-block" />
          <span>OTC://TERMINAL-CHAT</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 font-normal">
            v1.0.0
          </span>
        </div>

        {/* Connection Status Indicator */}
        <div
          data-testid="connection-status"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${
            isOnline
              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
              : 'border-red-500/40 bg-red-950/30 text-red-400 animate-pulse'
          }`}
          title={isOnline ? 'Daemon connected' : 'Cannot reach backend / model provider'}
        >
          {isOnline ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-red-400" />
          )}
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">
            {modelsCount} {modelsCount === 1 ? 'model' : 'models'}
          </span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Provider Switcher */}
        <div className="flex items-center bg-[#151515] border border-[#262626] rounded overflow-hidden">
          <button
            onClick={() => {
              onUpdateSettings({ provider: 'ollama' });
              onRefreshModels();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
              settings.provider === 'ollama'
                ? 'bg-neutral-800 text-white font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ollama
          </button>
          <button
            onClick={() => {
              onUpdateSettings({ provider: 'openai' });
              onRefreshModels();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
              settings.provider === 'openai'
                ? 'bg-neutral-800 text-white font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            OpenAI-Compat
          </button>
        </div>

        {/* Config Modal Button */}
        <button
          onClick={() => {
            setTempUrl(settings.customUrl);
            setTempApiKey(settings.apiKey);
            setShowConfigModal(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1 border border-[#262626] hover:border-neutral-500 rounded bg-[#151515] text-neutral-300 hover:text-white transition-colors"
          title="Configure API Endpoint & Keys"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Endpoint</span>
        </button>

        {/* Refresh Models Button */}
        <button
          data-testid="refresh-models-btn"
          onClick={onRefreshModels}
          disabled={isConnecting}
          className="p-1 border border-[#262626] hover:border-neutral-500 rounded bg-[#151515] text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh Model Registry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`flex items-center gap-1 px-2.5 py-1 border rounded transition-colors ${
            isSidebarOpen
              ? 'border-neutral-500 bg-neutral-800 text-white'
              : 'border-[#262626] bg-[#151515] text-neutral-300 hover:border-neutral-500'
          }`}
          title="Toggle Control Drawer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Controls</span>
        </button>
      </div>

      {/* Endpoint Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#333333] rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2 crt-glow">
                <Globe className="w-4 h-4" /> Endpoint Configuration
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">
                  Active Provider: <span className="text-white font-bold">{settings.provider.toUpperCase()}</span>
                </label>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">
                  Custom Base URL (optional):
                </label>
                <input
                  type="text"
                  placeholder={
                    settings.provider === 'ollama'
                      ? 'http://localhost:11434 (default)'
                      : 'https://api.openai.com/v1 (default)'
                  }
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full bg-[#080808] border border-[#2a2a2a] rounded px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              {settings.provider === 'openai' && (
                <div>
                  <label className="block text-neutral-400 mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" /> API Key (stored in browser session):
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="w-full bg-[#080808] border border-[#2a2a2a] rounded px-3 py-1.5 text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222222]">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 rounded border border-[#262626] text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
