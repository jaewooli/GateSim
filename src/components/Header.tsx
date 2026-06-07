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
    showPinLabels,
    toggleShowPinLabels,
    // Theme
    theme,
    toggleTheme,
    // Curriculum integrations
    appMode,
    setAppMode,
    MISSIONS,
    activeMissionId,
    setActiveMissionId,
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

        {/* Mode switcher (Sandbox vs Curriculum) */}
        <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '2px', marginRight: '8px' }}>
          <button
            onClick={() => setAppMode('sandbox')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: appMode === 'sandbox' ? 'var(--text-primary)' : 'transparent',
              color: appMode === 'sandbox' ? 'var(--secondary-bg)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            🎮 Sandbox
          </button>
          <button
            onClick={() => {
              setAppMode('curriculum');
              if (!activeMissionId && MISSIONS.length > 0) {
                setActiveMissionId(MISSIONS[0].id);
              }
            }}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: appMode === 'curriculum' ? 'var(--text-primary)' : 'transparent',
              color: appMode === 'curriculum' ? 'var(--secondary-bg)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            🎓 Curriculum
          </button>
        </div>

        <div className="divider" />
        
        {/* Dynamic header content based on mode */}
        {appMode === 'sandbox' ? (
          /* Tabs Manager for Sandbox Mode */
          <div className="tabs-manager-header">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`tab-button ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span>{tab.name}</span>
                {tab.id !== 'main' && !tab.id.startsWith('sub-') && (
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
            <button className="add-tab-btn" style={{ flexShrink: 0 }} onClick={handleAddTab}>
              + Sub-circuit
            </button>
          </div>
        ) : (
          /* Active Mission banner for Curriculum Mode */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
              STEP {activeMissionId ? MISSIONS.findIndex(m => m.id === activeMissionId) + 1 : 1}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeMissionId ? MISSIONS.find(m => m.id === activeMissionId)?.title : '로딩 중...'}
            </span>
          </div>
        )}
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

        <button
          className={showPinLabels ? 'primary' : ''}
          onClick={toggleShowPinLabels}
          title="Toggle Input/Output Pin Labels on Custom Gates"
        >
          🏷️ {showPinLabels ? 'Pin Labels ON' : 'Pin Labels OFF'}
        </button>

        <button
          onClick={toggleTheme}
          title="Toggle between Light and Dark Teenage Engineering theme"
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>

        {/* Sandbox exclusive actions */}
        {appMode === 'sandbox' && (
          <>
            <div className="divider" />

            {/* Custom Gate Packager */}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
