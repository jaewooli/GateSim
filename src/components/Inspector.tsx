import React, { useState, useEffect } from 'react';
import type { Node } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';

const PRESET_DESCRIPTIONS: Record<string, string> = {
  'sub-half-adder': 'Half Adder: Computes the sum of two 1-bit binary inputs (A and B). It outputs the Sum (S) and a Carry (C) bit. Double-click this component on the canvas to inspect or edit its internal XOR and AND gate layout.',
  'sub-mux': '2-to-1 Multiplexer (MUX): Selects one of two data inputs (D0 or D1) based on a Select control input. If Select=0, D0 is routed to Out; if Select=1, D1 is routed to Out. Double-click this component on the canvas to inspect its gates.',
  'sub-sr-latch': 'SR Latch: A fundamental memory cell. Set (S) forces the Q output HIGH, and Reset (R) resets it to LOW. When both are LOW, it retains its previous logic state. Double-click to inspect its cross-coupled NOR gate feedback loop.',
  'sub-nand': 'NAND Gate: A derived universal gate. Built by combining a basic AND gate followed by a NOT inverter. Outputs LOW only if all inputs are HIGH. Double-click to inspect its components.',
  'sub-nor': 'NOR Gate: A derived universal gate. Built by combining a basic OR gate followed by a NOT inverter. Outputs HIGH only if all inputs are LOW. Double-click to inspect its components.',
  'sub-xor': 'XOR (Exclusive OR) Gate: Built using NOT, AND, and OR gates. Outputs HIGH if and only if the inputs are different. Double-click to inspect how its fundamental gates are stacked.',
  'sub-xnor': 'XNOR (Exclusive NOR) Gate: Built using NOT, AND, and OR gates. Outputs HIGH if inputs are identical. Double-click to inspect its fundamental gate structure.',
  'sub-d-latch': 'Gated D Latch: A 1-bit memory latch. When CLK (Enable) is HIGH, it captures the input data D and passes it to output Q; when CLK is LOW, it retains its stored value. Double-click to inspect its logic gates and cross-coupled feedback loop.',
};

interface InspectorProps {
  circuit: CircuitHook;
}

export const Inspector: React.FC<InspectorProps> = ({ circuit }) => {
  const {
    activeTab,
    activeTabId,
    appMode,
    activeMissionId,
    MISSIONS,
    selectedNodeId,
    selectedNodeIds,
    deleteNode,
    setNodeLabel,
    setClockInterval,
    setBusValue,
    setBusWidth,
    activeCustomGates,
    probedNodeIds,
    toggleProbeNode,
    probeNodesBulk,
  } = circuit;

  const node = activeTab.state.nodes.find((n) => n.id === selectedNodeId);

  // Helper to format types nicely
  const getReadableType = (n: Node) => {
    if (n.type === 'CUSTOM') {
      const presets = ['sub-half-adder', 'sub-sr-latch', 'sub-mux', 'sub-full-adder', 'sub-d-latch', 'sub-nand', 'sub-nor', 'sub-xor', 'sub-xnor'];
      if (n.customGateId && presets.includes(n.customGateId)) {
        return 'Advanced Block';
      }
      return 'Custom Gate';
    }
    switch (n.type) {
      case 'SWITCH': return 'Toggle Switch';
      case 'BUTTON': return 'Push Button';
      case 'CLOCK': return 'Clock Generator';
      case 'LED': return 'LED Indicator';
      case 'PORT_IN': return 'Sub-circuit Input';
      case 'PORT_OUT': return 'Sub-circuit Output';
      case 'BUS_INPUT': return 'Bus Input';
      case 'BUS_OUTPUT': return 'Bus Output';
      default: return `${n.type} Gate`;
    }
  };

  const [tempInterval, setTempInterval] = useState<string>('');

  useEffect(() => {
    if (node && node.type === 'CLOCK') {
      setTempInterval((node.clockInterval || 1000).toString());
    }
  }, [node?.id, node?.clockInterval]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (node) {
      setNodeLabel(node.id, e.target.value);
    }
  };

  const handleClockIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempInterval(e.target.value);
  };

  const handleClockIntervalBlur = () => {
    if (node) {
      let val = parseInt(tempInterval, 10);
      if (isNaN(val) || val < 100) {
        val = 100;
      }
      setClockInterval(node.id, val);
      setTempInterval(val.toString());
    }
  };

  const handleClockIntervalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (selectedNodeIds.length > 1) {
    const selectedNodes = activeTab.state.nodes.filter((n) => selectedNodeIds.includes(n.id));
    const selectedProbedCount = selectedNodes.filter(n => probedNodeIds.includes(n.id)).length;
    const allProbed = selectedProbedCount === selectedNodes.length;

    return (
      <div className="inspector-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <div className="inspector-header">
            <div className="inspector-title">Selection Block</div>
            <div className="inspector-subtitle">{selectedNodeIds.length} components selected</div>
          </div>

          {/* Selected components summary list */}
          <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>Selected Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedNodes.map((n) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{n.label || n.name}</span>
                  <span style={{ fontSize: '9px', opacity: 0.7 }}>{n.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Logic Analyzer Bulk Probe Button */}
          <button
            className={`probe-btn ${allProbed ? 'active' : ''}`}
            onClick={() => probeNodesBulk(selectedNodeIds)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}
          >
            <span>📊</span>
            {allProbed 
              ? 'Remove Selected Probes' 
              : selectedProbedCount > 0 
                ? `Probe Remaining (${selectedNodeIds.length - selectedProbedCount})` 
                : 'Probe All Selected (Analyzer)'
            }
          </button>

          {/* Delete Action Button */}
          <button
            className="danger"
            onClick={() => deleteNode(selectedNodeIds[0])}
            style={{ width: '100%' }}
          >
            🗑 Delete Selected Components
          </button>
        </div>
      </div>
    );
  }

  if (!node) {
    // Case 1: Curriculum Mode Active Task Description
    if (appMode === 'curriculum' && activeMissionId) {
      const mission = MISSIONS.find((m) => m.id === activeMissionId);
      if (mission) {
        return (
          <div className="inspector-container">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              <div className="inspector-header">
                <div className="inspector-title">Active Mission</div>
                <div className="inspector-subtitle">{mission.title}</div>
              </div>

              {/* Description Panel */}
              <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Mission Objective</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {mission.description}
                </div>
              </div>

              {/* Requirement Panel */}
              <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Interface Specifications</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• Required Inputs: {mission.inputsRequired.join(', ')}</div>
                  <div>• Required Outputs: {mission.outputsRequired.join(', ')}</div>
                </div>
              </div>

              {/* Hint Panel */}
              {mission.hint && (
                <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--accent-color)' }}>💡 Hint</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {mission.hint}
                  </div>
                </div>
              )}

              <div style={{ flex: 1 }} />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                Select a component on the canvas to configure its settings.
              </div>
            </div>
          </div>
        );
      }
    }

    // Case 2: Sandbox Sub-circuit Tab Description
    const isSubCircuit = activeTabId.startsWith('sub-');
    if (isSubCircuit) {
      const description = PRESET_DESCRIPTIONS[activeTabId] || 
        "Custom Gate: A user-created composite sub-circuit. Double-click this component on the canvas to open and edit its internal gate schematics.";
      
      return (
        <div className="inspector-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div className="inspector-header">
              <div className="inspector-title">Active Sub-circuit</div>
              <div className="inspector-subtitle">{activeTab.name}</div>
            </div>

            {/* Description Panel */}
            <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>About this Circuit</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {description}
              </div>
            </div>

            {/* Circuit stats */}
            <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Circuit Composition</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>• Total Components: {activeTab.state.nodes.length}</div>
                <div>• Total Wires: {activeTab.state.connections.length}</div>
                <div>• Input Ports: {activeTab.state.nodes.filter(n => n.type === 'PORT_IN').map(n => n.label || n.name).join(', ') || 'None'}</div>
                <div>• Output Ports: {activeTab.state.nodes.filter(n => n.type === 'PORT_OUT').map(n => n.label || n.name).join(', ') || 'None'}</div>
              </div>
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
              Select a component on the canvas to configure its settings.
            </div>
          </div>
        </div>
      );
    }

    // Case 3: Sandbox Main Editor Description
    return (
      <div className="inspector-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <div className="inspector-header">
            <div className="inspector-title">Sandbox Editor</div>
            <div className="inspector-subtitle">Active Tab: {activeTab.name}</div>
          </div>

          {/* Description Panel */}
          <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Overview</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Welcome to the GateSim Sandbox! Place inputs, basic logic gates, presets, and custom composite blocks from the left sidebar onto the canvas. Wire components together by dragging between pins, select multiple elements to drag or delete them, and package your layouts into reusable custom blocks.
            </div>
          </div>

          {/* Circuit stats */}
          <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Circuit Composition</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>• Total Components: {activeTab.state.nodes.length}</div>
              <div>• Total Wires: {activeTab.state.connections.length}</div>
              <div>• Switches: {activeTab.state.nodes.filter(n => n.type === 'SWITCH').length}</div>
              <div>• Clocks: {activeTab.state.nodes.filter(n => n.type === 'CLOCK').length}</div>
              <div>• Output LEDs: {activeTab.state.nodes.filter(n => n.type === 'LED').length}</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
            Select a component on the canvas to configure its settings.
          </div>
        </div>
      </div>
    );
  }

  const gatesSource = activeCustomGates;

  return (
    <div className="inspector-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        <div className="inspector-header">
          <div className="inspector-title">{getReadableType(node)}</div>
          <div className="inspector-subtitle">ID: {node.id}</div>
        </div>

        {/* Label Edit field */}
        <div className="inspector-group">
          <label className="inspector-label" htmlFor="node-label">Custom Label</label>
          <input
            id="node-label"
            type="text"
            className="inspector-input"
            value={node.label || ''}
            onChange={handleLabelChange}
            placeholder={node.name}
          />
        </div>

        {/* Component Specific Settings */}
        {node.type === 'CLOCK' && (
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="clock-interval">Clock Tick Interval (ms)</label>
            <input
              id="clock-interval"
              type="number"
              className="inspector-input"
              value={tempInterval}
              onChange={handleClockIntervalChange}
              onBlur={handleClockIntervalBlur}
              onKeyDown={handleClockIntervalKeyDown}
              min="100"
              step="100"
            />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Adjust the frequency. Minimum value is 100ms (faster ticks).
            </div>
          </div>
        )}

        {node.type.startsWith('BUS_') && (
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="bus-width">Bus Width</label>
            <select
              id="bus-width"
              className="inspector-input"
              value={node.busWidth || 8}
              onChange={(e) => setBusWidth(node.id, Number(e.target.value) as 8 | 16 | 32)}
            >
              <option value={8}>8-bit</option>
              <option value={16}>16-bit</option>
              <option value={32}>32-bit</option>
            </select>
          </div>
        )}

        {node.type === 'BUS_INPUT' && (
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="bus-value">Bus Value</label>
            <input
              id="bus-value"
              type="number"
              className="inspector-input"
              value={node.busValue || 0}
              onChange={(e) => setBusValue(node.id, Number(e.target.value) || 0)}
              min="0"
              max={node.busWidth === 32 ? 0xffffffff : (1 << (node.busWidth || 8)) - 1}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Current hex: 0x{(node.busValue || 0).toString(16).toUpperCase()}
            </div>
          </div>
        )}

        {node.type === 'BUS_OUTPUT' && (
          <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Bus Readout</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--mono)', fontWeight: 800 }}>
              {(node.inputs[0]?.busValue ?? 0).toString(10)} / 0x{(node.inputs[0]?.busValue ?? 0).toString(16).toUpperCase()}
            </div>
          </div>
        )}

        {/* Node Description Panel (For Custom Gates and Presets) */}
        {node.type === 'CUSTOM' && node.customGateId && (
          <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Component Description</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {PRESET_DESCRIPTIONS[node.customGateId] || 
               "Custom Gate: A user-created composite sub-circuit. Double-click this component on the canvas to open and edit its internal gate schematics."}
            </div>
          </div>
        )}

        {/* Composite Node Details */}
        {node.type === 'CUSTOM' && node.customGateId && gatesSource[node.customGateId] && (() => {
          const def = gatesSource[node.customGateId];
          return (
            <div className="inspector-group" style={{ backgroundColor: 'var(--primary-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>Composite Node Details</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>• Internal Nodes: {def.nodes.length}</div>
                <div>• Internal Connections: {def.connections.length}</div>
                <div>• Input Pins: {node.inputs.length}</div>
                <div>• Output Pins: {node.outputs.length}</div>
              </div>
            </div>
          );
        })()}

        <div style={{ flex: 1 }} />

        {/* Logic Analyzer Probe Button */}
        <button
          className={`probe-btn ${probedNodeIds.includes(node.id) ? 'active' : ''}`}
          onClick={() => toggleProbeNode(node.id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}
        >
          <span>💻</span>
          {probedNodeIds.includes(node.id) ? 'Remove Probe' : 'Probe Signal (Analyzer)'}
        </button>

        {/* Delete Action Button */}
        <button
          className="danger"
          onClick={() => deleteNode(node.id)}
          style={{ width: '100%' }}
        >
          🗑 Delete Component
        </button>
      </div>
    </div>
  );
};

export default Inspector;
