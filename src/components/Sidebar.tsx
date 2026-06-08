import React, { useState, useEffect } from 'react';
import type { NodeType } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';
import type { CollabState, CollabActions } from '../hooks/useCollaboration';
import { CollabPanel } from './CollabPanel';

interface SidebarProps {
  circuit: CircuitHook;
  onAddNode: (type: NodeType, customGateId?: string) => void;
  collab: CollabState & CollabActions;
}

interface ToolboxItem {
  type: NodeType;
  name: string;
  description: string;
  icon: React.ReactNode;
  customGateId?: string;
}

// Icons copied from old sidebar
const SVG_SWITCH = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <rect x="2" y="4" width="36" height="12" rx="6" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
    <circle cx="8" cy="10" r="4" fill="#1A1A1A" />
  </svg>
);

const SVG_BUTTON = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <rect x="10" y="2" width="20" height="16" rx="4" fill="#F4F5F2" stroke="#5F5F5F" strokeWidth="1.5" />
    <circle cx="20" cy="10" r="5" fill="#5F5F5F" />
  </svg>
);

const SVG_CLOCK = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <rect x="5" y="4" width="30" height="12" rx="2" fill="none" stroke="#5F5F5F" strokeWidth="1.5" />
    <path d="M 10 12 L 15 12 L 15 6 L 20 6 L 20 12 L 25 12 L 25 6 L 30 6" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_PORT_IN = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <rect x="5" y="3" width="30" height="14" rx="3" fill="#B6E63A" stroke="#1A1A1A" strokeWidth="1.5" />
    <text x="20" y="13" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#1A1A1A">IN</text>
  </svg>
);

const SVG_PORT_OUT = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <rect x="5" y="3" width="30" height="14" rx="3" fill="#D1D3CD" stroke="#1A1A1A" strokeWidth="1.5" />
    <text x="20" y="13" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#1A1A1A">OUT</text>
  </svg>
);

const SVG_AND = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 8 4 L 18 4 C 23 4, 27 8, 27 10 C 27 12, 23 16, 18 16 L 8 16 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="7" x2="8" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="13" x2="8" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="27" y1="10" x2="33" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_OR = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 8 4 C 11 4, 15 4, 18 4 C 23 4, 28 8, 30 10 C 28 12, 23 16, 18 16 C 15 16, 11 16, 8 16 C 10 12, 10 8, 8 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="30" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_NOT = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <polygon points="10,4 24,10 10,16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="27" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="10" x2="10" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="29.5" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_NAND = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 8 4 L 16 4 C 21 4, 25 8, 25 10 C 25 12, 21 16, 16 16 L 8 16 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="28" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="7" x2="8" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="13" x2="8" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="30.5" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_NOR = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 8 4 C 11 4, 14 4, 17 4 C 21 4, 25 8, 27 10 C 25 12, 21 16, 17 16 C 14 16, 11 16, 8 16 C 10 12, 10 8, 8 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="30" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="4" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="32.5" y1="10" x2="37" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_XOR = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 10 4 C 13 4, 16 4, 19 4 C 23 4, 28 8, 30 10 C 28 12, 23 16, 19 16 C 16 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <path d="M 7 4 C 9 8, 9 12, 7 16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="3" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="3" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="30" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_XNOR = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <path d="M 10 4 C 13 4, 15 4, 18 4 C 21 4, 25 8, 27 10 C 25 12, 21 16, 18 16 C 15 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <path d="M 7 4 C 9 8, 9 12, 7 16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="30" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="3" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="3" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="32.5" y1="10" x2="37" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_LED = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <circle cx="20" cy="10" r="7.5" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
    <line x1="5" y1="10" x2="12.5" y2="10" stroke="#5F5F5F" strokeWidth="1.5" />
    <path d="M 17 6 L 23 14 M 23 6 L 17 14" stroke="#5F5F5F" strokeWidth="1" />
  </svg>
);

const SVG_BUS = (
  <svg viewBox="0 0 40 20" className="toolbox-item-icon">
    <line x1="4" y1="10" x2="36" y2="10" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />
    <text x="20" y="8" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#B6E63A">BUS</text>
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({ circuit, onAddNode, collab }) => {
  const {
    appMode,
    activeTabId,
    setActiveTabId,
    activeCustomGates,
    // Curriculum integrations
    MISSIONS,
    completedMissions,
    activeMissionId,
    setActiveMissionId,
    verifyCurrentMission,
    resetMissionTab,
    loadMissionSolution,
    // Auth & Cloud Storage
    user,
    cloudCircuits,
    saveCircuitToCloud,
    loadCircuitFromCloud,
    deleteCircuitFromCloud,
  } = circuit;

  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Clear verification and hints on mission change
  useEffect(() => {
    setVerificationResult(null);
    setShowHint(false);
  }, [activeMissionId]);

  const handleDragStart = (e: React.DragEvent, type: NodeType, customGateId?: string) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    if (customGateId) {
      e.dataTransfer.setData('application/reactflow-custom-id', customGateId);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  if (appMode === 'curriculum') {
    const activeMission = MISSIONS.find((m) => m.id === activeMissionId);

    return (
      <div className="sidebar-container curriculum-sidebar">
        {/* Curriculum Header */}
        <div className="curriculum-header-block">
          <div className="curriculum-mode-title">🎓 CPU DESIGN ROADMAP</div>
          <div className="curriculum-mode-desc">
            기초 논리 게이트 설계부터 시작하여 최종적으로 4비트 작동형 CPU를 제작하는 로드맵 코스입니다.
          </div>
        </div>

        {/* 1. Roadmap Mission Steps List */}
        <div className="curriculum-roadmap-list">
          {MISSIONS.map((m, idx) => {
            const isCleared = completedMissions.includes(m.id);
            const isUnlocked = idx === 0 || completedMissions.includes(MISSIONS[idx - 1].id);
            const isActive = activeMissionId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => {
                  if (isUnlocked) {
                    setActiveMissionId(m.id);
                    setActiveTabId(m.targetTabId);
                  }
                }}
                className={`roadmap-step-item ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="roadmap-step-icon-wrapper">
                  {isCleared ? (
                    <span className="step-status-badge cleared">✓</span>
                  ) : isUnlocked ? (
                    <span className="step-status-badge unlocked">{idx + 1}</span>
                  ) : (
                    <span className="step-status-badge locked">🔒</span>
                  )}
                </div>
                <div className="roadmap-step-info">
                  <div className="roadmap-step-title">{m.title}</div>
                  <div className="roadmap-step-ports">
                    입력 {m.inputsRequired.length} / 출력 {m.outputsRequired.length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Active Mission Briefing Panel */}
        {activeMission ? (
          <div className="active-mission-card">
            <div className="mission-card-header">
              <span className="mission-badge">ACTIVE MISSION</span>
              <span className="mission-status-label">
                {completedMissions.includes(activeMission.id) ? '🌟 CLEAR' : '⚡ PROGRESS'}
              </span>
            </div>

            <h4 className="mission-card-title">{activeMission.title}</h4>
            <p className="mission-card-desc">{activeMission.description}</p>

            {/* Ports Info */}
            <div className="mission-ports-section">
              <div className="port-req-group">
                <span className="port-req-label">INPUT PORTS (Top ➔ Bottom):</span>
                <div className="port-req-badges">
                  {activeMission.inputsRequired.map((name, idx) => (
                    <span key={idx} className="port-badge in">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="port-req-group">
                <span className="port-req-label">OUTPUT PORTS (Top ➔ Bottom):</span>
                <div className="port-req-badges">
                  {activeMission.outputsRequired.map((name, idx) => (
                    <span key={idx} className="port-badge out">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Hint toggler */}
            {activeMission.hint && (
              <div className="mission-hint-block">
                <button onClick={() => setShowHint(!showHint)} className={`hint-toggle-btn ${showHint ? 'active' : ''}`}>
                  {showHint ? '💡 힌트 닫기' : '💡 힌트 보기'}
                </button>
                {showHint && <div className="hint-content-box">{activeMission.hint}</div>}
              </div>
            )}

            {/* Verification result overlay modal */}
            {verificationResult && (
              <div 
                className="verification-modal-overlay" 
                onClick={() => setVerificationResult(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                }}
              >
                <div 
                  className={`verification-modal-content ${verificationResult.success ? 'success' : 'failure'}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '500px',
                    maxWidth: '90%',
                    backgroundColor: '#1E1E2E',
                    border: `2px solid ${verificationResult.success ? '#00FF66' : '#FF6B6B'}`,
                    borderRadius: '16px',
                    padding: '28px',
                    color: '#F8F8F2',
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px ${verificationResult.success ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 107, 107, 0.2)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    {verificationResult.success ? '🎉' : '❌'}
                  </div>
                  
                  <h2 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '22px', 
                    fontWeight: 'bold',
                    color: verificationResult.success ? '#00FF66' : '#FF6B6B'
                  }}>
                    {verificationResult.success ? '검증 성공!' : '검증 실패!'}
                  </h2>
                  
                  <div style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.6', 
                    whiteSpace: 'pre-line',
                    textAlign: 'left',
                    width: '100%',
                    backgroundColor: '#151522',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #2D2D3F',
                    overflowY: 'auto',
                    maxHeight: '300px',
                    marginBottom: '24px',
                    fontFamily: 'monospace',
                    color: '#E0E0E0'
                  }}>
                    {verificationResult.message}
                  </div>
                  
                  <button 
                    onClick={() => setVerificationResult(null)}
                    style={{
                      padding: '10px 24px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: verificationResult.success ? '#00FF66' : '#FF6B6B',
                      color: '#1E1E2E',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}

            <div style={{ flexGrow: 1 }} />

            {/* Verify & Reset Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (window.confirm("이 탭의 회로를 초기화하고 빈 도화지에서 미션을 새로 시작하시겠습니까?\n(입력/출력 포트만 정렬되어 생성됩니다)")) {
                      resetMissionTab(activeMission.id);
                      setVerificationResult(null);
                    }
                  }}
                  className="mission-reset-btn"
                  style={{ flex: 1 }}
                >
                  🔄 Reset
                </button>
                
                <button
                  onClick={() => {
                    if (window.confirm("현재 작업 중인 회로가 사라지고 이 미션의 정답 회로 예시가 로드됩니다. 진행하시겠습니까?")) {
                      loadMissionSolution(activeMission.id);
                      setVerificationResult(null);
                    }
                  }}
                  className="mission-reset-btn"
                  style={{ flex: 1, backgroundColor: 'rgba(0, 229, 118, 0.1)', borderColor: 'rgba(0, 229, 118, 0.3)', color: '#00E676' }}
                >
                  💡 정답 보기
                </button>
              </div>

              <button
                onClick={() => {
                  const res = verifyCurrentMission();
                  setVerificationResult(res);
                }}
                className="mission-verify-btn primary"
                style={{ width: '100%' }}
              >
                ✓ Verify Code
              </button>
            </div>
          </div>
        ) : (
          <div className="no-mission-placeholder">
            <span>🗺️ 미션을 로드맵에서 선택하세요.</span>
          </div>
        )}
      </div>
    );
  }

  // Classical Sandbox Sidebar
  const inputs: ToolboxItem[] = [
    { type: 'SWITCH', name: 'Toggle Switch', description: 'Manually toggles HIGH (1) or LOW (0)', icon: SVG_SWITCH },
    { type: 'BUTTON', name: 'Push Button', description: 'HIGH (1) only while pressed', icon: SVG_BUTTON },
    { type: 'CLOCK', name: 'Clock Gen', description: 'Toggles periodically at set interval', icon: SVG_CLOCK },
    { type: 'BUS_INPUT', name: 'Bus Input', description: 'Numeric 8/16/32-bit bus source', icon: SVG_BUS },
  ];

  if (activeTabId !== 'main') {
    inputs.push({ type: 'PORT_IN', name: 'Input Port', description: 'Sub-circuit input node pin', icon: SVG_PORT_IN });
  }

  const gates: ToolboxItem[] = [
    { type: 'AND', name: 'AND Gate', description: 'Outputs HIGH if all inputs are HIGH', icon: SVG_AND },
    { type: 'OR', name: 'OR Gate', description: 'Outputs HIGH if any input is HIGH', icon: SVG_OR },
    { type: 'NOT', name: 'NOT Gate', description: 'Outputs opposite of input state', icon: SVG_NOT },
    { type: 'CUSTOM', name: 'NAND Gate', description: 'Composite universal NAND gate', customGateId: 'sub-nand', icon: SVG_NAND },
    { type: 'CUSTOM', name: 'NOR Gate', description: 'Composite universal NOR gate', customGateId: 'sub-nor', icon: SVG_NOR },
    { type: 'CUSTOM', name: 'XOR Gate', description: 'Composite XOR gate', customGateId: 'sub-xor', icon: SVG_XOR },
    { type: 'CUSTOM', name: 'XNOR Gate', description: 'Composite XNOR gate', customGateId: 'sub-xnor', icon: SVG_XNOR },
    { type: 'BUS_AND', name: 'Bus AND', description: 'Bitwise AND for numeric buses', icon: SVG_BUS },
    { type: 'BUS_OR', name: 'Bus OR', description: 'Bitwise OR for numeric buses', icon: SVG_BUS },
    { type: 'BUS_XOR', name: 'Bus XOR', description: 'Bitwise XOR for numeric buses', icon: SVG_BUS },
    { type: 'BUS_NOT', name: 'Bus NOT', description: 'Bitwise invert within bus width', icon: SVG_BUS },
    { type: 'BUS_ADD', name: 'Bus ADD', description: 'Adds two bus values modulo width', icon: SVG_BUS },
    { type: 'BUS_SUB', name: 'Bus SUB', description: 'Subtracts two bus values modulo width', icon: SVG_BUS },
  ];

  const outputs: ToolboxItem[] = [
    { type: 'LED', name: 'LED Light', description: 'Illuminates HIGH (green) or LOW (gray)', icon: SVG_LED },
    { type: 'BUS_OUTPUT', name: 'Bus Output', description: 'Displays numeric bus value', icon: SVG_BUS },
  ];

  if (activeTabId !== 'main') {
    outputs.push({ type: 'PORT_OUT', name: 'Output Port', description: 'Sub-circuit output node pin', icon: SVG_PORT_OUT });
  }

  const presetBlockIds = ['sub-half-adder', 'sub-sr-latch', 'sub-mux', 'sub-full-adder', 'sub-d-latch'];
  const systemPresetIds = [...presetBlockIds, 'sub-nand', 'sub-nor', 'sub-xor', 'sub-xnor'];

  return (
    <div className="sidebar-container sandbox-sidebar">
      {/* Category: Cloud Storage */}
      <div className="toolbox-group cloud-storage-group">
        <div className="toolbox-title">☁️ Cloud Storage</div>
        {!user ? (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span>Sign in to sync your circuits to the cloud database.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                const name = prompt('Enter a name for this circuit:');
                if (name && name.trim()) {
                  saveCircuitToCloud(name.trim());
                }
              }}
              className="primary"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              💾 Save Current Circuit
            </button>

            {cloudCircuits.length === 0 ? (
              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '8px 0'
              }}>
                No saved circuits found.
              </div>
            ) : (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingRight: '4px'
              }}>
                {cloudCircuits.map((c) => (
                  <div
                    key={c.id}
                    className="cloud-circuit-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      onClick={() => {
                        if (confirm(`Load "${c.name}"? This will replace your current canvas.`)) {
                          loadCircuitFromCloud(c);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        flexGrow: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-primary)',
                        textAlign: 'left'
                      }}
                      title={`Click to load: ${c.name}`}
                    >
                      {c.name}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = `${window.location.origin}/gatesimulator/sandbox?share=${c.id}`;
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          alert('Share link copied to clipboard!');
                        }).catch(() => {
                          alert(`Share URL: ${shareUrl}`);
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '11px',
                        opacity: 0.6,
                        marginRight: '4px',
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      title="Copy Share Link"
                    >
                      🔗
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${c.name}" from the cloud?`)) {
                          deleteCircuitFromCloud(c.id);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '11px',
                        opacity: 0.6,
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      title="Delete from Cloud"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category: Inputs */}
      <div className="toolbox-group">
        <div className="toolbox-title">Inputs</div>
        <div className="toolbox-list">
          {inputs.map((item) => (
            <div
              key={item.type}
              className="toolbox-item"
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              title={item.description}
            >
              {item.icon}
              <div className="toolbox-item-name">{item.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category: Gates */}
      <div className="toolbox-group">
        <div className="toolbox-title">Basic Logic Gates</div>
        <div className="toolbox-list">
          {gates.map((item) => (
            <div
              key={item.customGateId || item.type}
              className="toolbox-item"
              draggable
              onDragStart={(e) => handleDragStart(e, item.type, item.customGateId)}
              onClick={() => onAddNode(item.type, item.customGateId)}
              title={item.description}
            >
              {item.icon}
              <div className="toolbox-item-name">{item.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category: Outputs */}
      <div className="toolbox-group">
        <div className="toolbox-title">Outputs</div>
        <div className="toolbox-list">
          {outputs.map((item) => (
            <div
              key={item.type}
              className="toolbox-item"
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              title={item.description}
            >
              {item.icon}
              <div className="toolbox-item-name">{item.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category: Advanced Blocks (Presets) */}
      <div className="toolbox-group">
        <div className="toolbox-title">Advanced Blocks (Derived Gates)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.values(activeCustomGates)
            .filter((g) => presetBlockIds.includes(g.id))
            .map((gate) => (
              <div
                key={gate.id}
                className="toolbox-item custom-gate-item"
                style={{ borderLeftColor: gate.color }}
                draggable
                onDragStart={(e) => handleDragStart(e, 'CUSTOM', gate.id)}
                onClick={() => onAddNode('CUSTOM', gate.id)}
                title={`Preset Advanced Block: ${gate.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: gate.color }} />
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>{gate.name}</div>
                </div>
                <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                  {gate.nodes.filter((n) => n.type === 'PORT_IN').length} IN / {gate.nodes.filter((n) => n.type === 'PORT_OUT').length} OUT
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Category: Custom Gates (User Made) */}
      <div className="toolbox-group">
        <div className="toolbox-title">Custom Gates (User Built)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.values(activeCustomGates).filter((g) => !systemPresetIds.includes(g.id)).length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No custom gates packaged yet. Build a sub-circuit in another tab and click "Package Gate".
            </div>
          ) : (
            Object.values(activeCustomGates)
              .filter((g) => !systemPresetIds.includes(g.id))
              .map((gate) => (
                <div
                  key={gate.id}
                  className="toolbox-item custom-gate-item"
                  style={{ borderLeftColor: gate.color }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'CUSTOM', gate.id)}
                  onClick={() => onAddNode('CUSTOM', gate.id)}
                  title={`User Custom Gate: ${gate.name}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: gate.color }} />
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>{gate.name}</div>
                  </div>
                  <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                    {gate.nodes.filter((n) => n.type === 'PORT_IN').length} IN / {gate.nodes.filter((n) => n.type === 'PORT_OUT').length} OUT
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Collaboration Panel */}
      <div className="toolbox-group" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
        <CollabPanel
          collab={collab}
          isLoggedIn={!!circuit.user}
        />
      </div>
    </div>
  );
};

export default Sidebar;
