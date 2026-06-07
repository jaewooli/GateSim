import React, { useRef, useState } from 'react';
import type { CircuitHook } from '../hooks/useCircuitState';
import AuthModal from './AuthModal';

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
    // Auth
    user,
    loginUser,
    logoutUser,
  } = circuit;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isFileOpen, setIsFileOpen] = useState(false);
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
    <div className="header-wrapper" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div className="header-container" style={{ borderBottom: appMode === 'sandbox' ? 'none' : '2px solid var(--border-color)' }}>
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

          {appMode === 'curriculum' && (
            <>
              <div className="divider" />
              {/* Active Mission banner for Curriculum Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                  STEP {activeMissionId ? MISSIONS.findIndex(m => m.id === activeMissionId) + 1 : 1}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeMissionId ? MISSIONS.find(m => m.id === activeMissionId)?.title : '로딩 중...'}
                </span>
              </div>
            </>
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

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsMoreOpen(!isMoreOpen); setIsFileOpen(false); }}
              title="More options"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ⋯ More
            </button>
            {isMoreOpen && (
              <div
                onMouseLeave={() => setIsMoreOpen(false)}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: 'var(--secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 1000,
                  minWidth: '180px',
                }}
              >
                <button
                  className={showPinLabels ? 'primary' : ''}
                  onClick={() => { toggleShowPinLabels(); setIsMoreOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}
                >
                  🏷️ {showPinLabels ? 'Pin Labels: ON' : 'Pin Labels: OFF'}
                </button>
                <button
                  onClick={() => { toggleTheme(); setIsMoreOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 4px' }} />
                <button
                  onClick={() => { setIsShortcutsOpen(true); setIsMoreOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}
                >
                  ⌨️ Keyboard Shortcuts
                </button>
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Authentication Status / Trigger */}
          {user ? (
            <button
              onClick={logoutUser}
              className="danger outline"
              title={`Logged in as ${user.username}. Click to Sign Out.`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>👤</span> {user.username}
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="primary"
              title="Sign In / Create Account to save progress"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>👤</span> Sign In
            </button>
          )}

          {/* Sandbox exclusive actions */}
          {appMode === 'sandbox' && (
            <>
              <div className="divider" />

              {/* Custom Gate Packager */}
              {activeTabId !== 'main' && !activeTabId.startsWith('sub-') && (
                <button
                  className="primary"
                  onClick={onOpenCustomGateModal}
                  title="Package this design into a Custom Gate for the toolbox"
                >
                  📦 Package Gate
                </button>
              )}

              {/* File menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setIsFileOpen(!isFileOpen); setIsMoreOpen(false); }}
                  title="Import / Export / Clear"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  📁 File
                </button>
                {isFileOpen && (
                  <div
                    onMouseLeave={() => setIsFileOpen(false)}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      backgroundColor: 'var(--secondary-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 1000,
                      minWidth: '160px',
                    }}
                  >
                    <button
                      onClick={() => { handleExport(); setIsFileOpen(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}
                    >
                      ⬇️ Export JSON
                    </button>
                    <button
                      onClick={() => { handleImportClick(); setIsFileOpen(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}
                    >
                      ⬆️ Import JSON
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        style={{ display: 'none' }}
                      />
                    </button>
                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 4px' }} />
                    <button
                      className="danger outline"
                      onClick={() => { clearCanvas(); setIsFileOpen(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', border: 'none' }}
                    >
                      🗑️ Clear Canvas
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Sub-circuit tabs for Sandbox Mode */}
      {appMode === 'sandbox' && (
        <div className="sub-header-tabs-bar">
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
        </div>
      )}

      {/* Authentication Modal overlay */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={loginUser}
      />

      {/* Shortcuts Cheat Sheet Modal Overlay */}
      {isShortcutsOpen && (
        <div
          onClick={() => setIsShortcutsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '450px',
              maxWidth: '90%',
              backgroundColor: '#1E1E2E',
              border: '2px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              color: '#F8F8F2',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>⌨️ Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', fontSize: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Action</th>
                    <th style={{ padding: '6px 0', textAlign: 'right', color: 'var(--text-muted)' }}>Shortcut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Copy Selected Node</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Ctrl + C</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Paste Copied Node</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Ctrl + V</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Undo Action</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Ctrl + Z</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Redo Action</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Ctrl + Y</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Delete Node / Wire</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Delete / Backspace</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Delete Wire</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Double-click Wire</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Canvas Panning</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Right-Click + Drag</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Canvas Zooming</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Scroll Wheel</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Multi-select Area</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>Shift + Drag</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setIsShortcutsOpen(false)}
              className="primary"
              style={{ width: '100%', padding: '10px', fontWeight: 'bold', borderRadius: '8px', marginTop: '8px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
