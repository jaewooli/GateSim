import React from 'react';
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
    selectedNodeId,
    deleteNode,
    setNodeLabel,
    setClockInterval,
    customGates,
  } = circuit;

  const node = activeTab.state.nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="inspector-container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Inspector Panel</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '200px' }}>
          Select a gate or component on the canvas to configure its settings.
        </div>
      </div>
    );
  }

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
      default: return `${n.type} Gate`;
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeLabel(node.id, e.target.value);
  };

  const handleClockIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 50) {
      setClockInterval(node.id, val);
    }
  };

  return (
    <div className="inspector-container">
      <div className="inspector-header">
        <div className="inspector-title">{getReadableType(node)}</div>
        <div className="inspector-subtitle">ID: {node.id.split('-')[0]}...</div>
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
            value={node.clockInterval || 1000}
            onChange={handleClockIntervalChange}
            min="50"
            step="50"
          />
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Adjust the frequency. Minimum value is 50ms (faster ticks).
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
      {node.type === 'CUSTOM' && node.customGateId && customGates[node.customGateId] && (() => {
        const def = customGates[node.customGateId];
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

      {/* Delete Action Button */}
      <button
        className="danger"
        onClick={() => deleteNode(node.id)}
        style={{ width: '100%' }}
      >
        🗑 Delete Component
      </button>
    </div>
  );
};
export default Inspector;
