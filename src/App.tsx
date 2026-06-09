import { useState, useRef, useEffect } from 'react';
import { useCircuitState } from './hooks/useCircuitState';
import { useCollaboration } from './hooks/useCollaboration';
import type { CollabActions } from './hooks/useCollaboration';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
import CurriculumDock from './components/CurriculumDock';
import WaveformViewer from './components/WaveformViewer';
import CreateCustomGateModal from './components/CreateCustomGateModal';
import './App.css';

function App() {
  const collabRef = useRef<Pick<CollabActions, 'broadcastOp'> | null>(null);
  const initialSyncRoomRef = useRef<string | null>(null);

  const circuit = useCircuitState((op) => {
    collabRef.current?.broadcastOp(op);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Collaboration ─────────────────────────────────────────────
  const collab = useCollaboration(
    (_op) => {
      circuit.applyRemoteOp(_op);
    },
    circuit.user?.token ?? null,
  );

  useEffect(() => {
    collabRef.current = collab;
  }, [collab]);

  // Synchronize circuit state when first joining an empty collaboration room
  useEffect(() => {
    if (
      collab.isConnected &&
      collab.members.length === 0 &&
      collab.roomId &&
      initialSyncRoomRef.current !== collab.roomId
    ) {
      initialSyncRoomRef.current = collab.roomId;
      collab.broadcastOp({
        op: 'SYNC_CIRCUIT',
        payload: {
          nodes: circuit.activeTab.state.nodes,
          connections: circuit.activeTab.state.connections,
          customGates: circuit.customGates,
          tabId: circuit.activeTabId,
          tabs: circuit.tabs.map((t) => ({ id: t.id, name: t.name, state: t.state })),
        },
      });
    }
    if (!collab.isConnected) {
      initialSyncRoomRef.current = null;
    }
  }, [collab, circuit.activeTab.state.nodes, circuit.activeTab.state.connections, circuit.customGates, circuit.activeTabId, circuit.tabs]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveCustomGate = (name: string, color: string) => {
    circuit.convertTabToCustomGate(circuit.activeTabId, name, color);
  };

  return (
    <div className="app-container">
      {/* 1. TOP HEADER & MAIN CONTROLS */}
      <Header circuit={circuit} onOpenCustomGateModal={handleOpenModal} />

      {/* 2. EDITOR WORKSPACE */}
      <div className="editor-body">
        {/* Left Toolbar / Toolbox */}
        <Sidebar
          circuit={circuit}
          collab={collab}
          onAddNode={(type, customGateId) => {
            // Spawn node in the center of the canvas view
            // Take zoom and pan into account so it spawns on screen
            const width = window.innerWidth;
            const height = window.innerHeight;
            const spawnX = (width / 2 - 140 - circuit.transform.x) / circuit.transform.zoom - 55;
            const spawnY = (height / 2 - 80 - circuit.transform.y) / circuit.transform.zoom - 35;
            
            // Align to 20px grid
            const grid = 20;
            const rx = Math.round(spawnX / grid) * grid;
            const ry = Math.round(spawnY / grid) * grid;
            
            circuit.addNode(type, rx, ry, customGateId);
          }}
        />

        {/* Center Canvas with overlay Dock */}
        <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Canvas circuit={circuit} collab={collab} />
          <WaveformViewer circuit={circuit} />
          {circuit.appMode === 'curriculum' && (
            <CurriculumDock
              circuit={circuit}
              onAddNode={(type, customGateId) => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const spawnX = (width / 2 - 140 - circuit.transform.x) / circuit.transform.zoom - 55;
                const spawnY = (height / 2 - 80 - circuit.transform.y) / circuit.transform.zoom - 35;
                
                const grid = 20;
                const rx = Math.round(spawnX / grid) * grid;
                const ry = Math.round(spawnY / grid) * grid;
                
                circuit.addNode(type, rx, ry, customGateId);
              }}
            />
          )}
        </div>

        {/* Right Inspector Column - Only visible in curriculum mode when a node is selected, or always in sandbox mode */}
        {(circuit.appMode !== 'curriculum' || circuit.selectedNodeId !== null) && (
          <Inspector circuit={circuit} collab={collab} />
        )}
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-indicator ${circuit.isSimulating ? 'active' : ''}`} />
          <span>Simulation: {circuit.isSimulating ? 'ACTIVE (Realtime)' : 'PAUSED'}</span>
          {circuit.oscillationError && (
            <span className="status-error">
              ⚠️ OSCILLATION WARNING: Circuit loops detected and safety-capped!
            </span>
          )}
        </div>
        
        <div className="status-right">
          {collab.isConnected && (
            <>
              <span className="collab-status-badge">
                🤝 협업 중 · {collab.members.length + 1}명
              </span>
              <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--border-color)' }} />
            </>
          )}
          <span>Simulation Ticks: {circuit.stepCount}</span>
          <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--border-color)' }} />
          <span>Active View: {circuit.activeTab.name}</span>
        </div>
      </div>

      {/* 4. CUSTOM GATE PACKAGER MODAL */}
      <CreateCustomGateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomGate}
        defaultName={circuit.activeTab.name.toUpperCase().replace(/\s+/g, '_')}
      />
    </div>
  );
}

export default App;
