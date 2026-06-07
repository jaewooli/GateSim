import React, { useRef } from 'react';
import type { CircuitHook } from '../hooks/useCircuitState';

interface HeaderProps {
  circuit: CircuitHook;
  onOpenCustomGateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ circuit, onOpenCustomGateModal }) => {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    isSimulating,
    setIsSimulating,
    stepSimulation,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCanvas,
    exportCircuitJSON,
    importCircuitJSON,
    createSubCircuitTab,
    deleteSubCircuitTab,
  } = circuit;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTab = () => {
    const name = prompt('Enter sub-circuit name (e.g., XOR Gate, Half Adder):');
    if (name && name.trim()) {
      createSubCircuitTab(name.trim());
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importCircuitJSON(content);
      // Reset input value to allow importing the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const jsonStr = exportCircuitJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gatesim-circuit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="header-container">
      <div className="logo-section">
        <div className="logo-title">GateSim</div>
        <span className="logo-badge">TACTILE</span>
        
        <div className="divider" />
        
        {/* Tabs Manager */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-button ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.name}</span>
              {tab.id !== 'main' && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete sub-circuit "${tab.name}"? All placements will be lost.`)) {
                      deleteSubCircuitTab(tab.id);
                    }
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="add-tab-btn" onClick={handleAddTab}>
            + Sub-circuit
          </button>
        </div>
      </div>

      <div className="action-bar">
        {/* Play / Pause / Step Controls */}
        <button
          className={isSimulating ? 'primary' : ''}
          onClick={() => setIsSimulating(!isSimulating)}
          title={isSimulating ? 'Pause Simulation' : 'Resume Simulation'}
        >
          {isSimulating ? '⏸ Pause' : '▶ Live Sim'}
        </button>
        <button
          onClick={stepSimulation}
          disabled={isSimulating}
          title="Advance simulation by 1 propagation step"
          style={{ opacity: isSimulating ? 0.5 : 1 }}
        >
          ⏭ Step
        </button>

        <div className="divider" />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.5 }}>
          ↩ Undo
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" style={{ opacity: canRedo ? 1 : 0.5 }}>
          ↪ Redo
        </button>

        <div className="divider" />

        {/* Custom Gate Packager (Only visible in sub-circuit tabs) */}
        {activeTabId !== 'main' && (
          <button
            className="primary"
            onClick={onOpenCustomGateModal}
            title="Package this design into a Custom Gate for the toolbox"
          >
            📦 Package Gate
          </button>
        )}

        {/* Save / Load / Clear */}
        <button onClick={handleExport} title="Export circuit as JSON file">
          Export
        </button>
        <button onClick={handleImportClick} title="Import circuit from JSON file">
          Import
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </button>
        <button className="danger outline" onClick={clearCanvas} title="Clear all gates and wires">
          Clear Canvas
        </button>
      </div>
    </div>
  );
};
export default Header;
