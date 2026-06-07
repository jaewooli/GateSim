import React from 'react';
import type { NodeType, SubCircuitDefinition } from '../types';

interface SidebarProps {
  onAddNode: (type: NodeType, customGateId?: string) => void;
  customGates: Record<string, SubCircuitDefinition>;
  activeTabId: string;
}

interface ToolboxItem {
  type: NodeType;
  name: string;
  description: string;
  icon: React.ReactNode;
  customGateId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode, customGates, activeTabId }) => {
  const handleDragStart = (e: React.DragEvent, type: NodeType, customGateId?: string) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    if (customGateId) {
      e.dataTransfer.setData('application/reactflow-custom-id', customGateId);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const inputs: ToolboxItem[] = [
    {
      type: 'SWITCH',
      name: 'Toggle Switch',
      description: 'Manually toggles HIGH (1) or LOW (0)',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <rect x="2" y="4" width="36" height="12" rx="6" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
          <circle cx="8" cy="10" r="4" fill="#1A1A1A" />
        </svg>
      ),
    },
    {
      type: 'BUTTON',
      name: 'Push Button',
      description: 'HIGH (1) only while pressed',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <rect x="10" y="2" width="20" height="16" rx="4" fill="#F4F5F2" stroke="#5F5F5F" strokeWidth="1.5" />
          <circle cx="20" cy="10" r="5" fill="#5F5F5F" />
        </svg>
      ),
    },
    {
      type: 'CLOCK',
      name: 'Clock Gen',
      description: 'Toggles periodically at set interval',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <rect x="5" y="4" width="30" height="12" rx="2" fill="none" stroke="#5F5F5F" strokeWidth="1.5" />
          <path d="M 10 12 L 15 12 L 15 6 L 20 6 L 20 12 L 25 12 L 25 6 L 30 6" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  // Include Port Inputs if we are in a sub-circuit designer tab
  if (activeTabId !== 'main') {
    inputs.push({
      type: 'PORT_IN',
      name: 'Input Port',
      description: 'Sub-circuit input node pin',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <rect x="5" y="3" width="30" height="14" rx="3" fill="#B6E63A" stroke="#1A1A1A" strokeWidth="1.5" />
          <text x="20" y="13" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#1A1A1A">IN</text>
        </svg>
      ),
    });
  }

  const gates: ToolboxItem[] = [
    {
      type: 'AND',
      name: 'AND Gate',
      description: 'Outputs HIGH if all inputs are HIGH',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 8 4 L 18 4 C 23 4, 27 8, 27 10 C 27 12, 23 16, 18 16 L 8 16 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="7" x2="8" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="13" x2="8" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="27" y1="10" x2="33" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'OR',
      name: 'OR Gate',
      description: 'Outputs HIGH if any input is HIGH',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 8 4 C 11 4, 15 4, 18 4 C 23 4, 28 8, 30 10 C 28 12, 23 16, 18 16 C 15 16, 11 16, 8 16 C 10 12, 10 8, 8 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="30" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'NOT',
      name: 'NOT Gate',
      description: 'Outputs opposite of input state',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <polygon points="10,4 24,10 10,16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <circle cx="27" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="10" x2="10" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="29.5" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'CUSTOM',
      name: 'NAND Gate',
      description: 'Outputs LOW only if all inputs are HIGH (Composite: AND + NOT)',
      customGateId: 'sub-nand',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 8 4 L 16 4 C 21 4, 25 8, 25 10 C 25 12, 21 16, 16 16 L 8 16 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <circle cx="28" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="7" x2="8" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="13" x2="8" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="30.5" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'CUSTOM',
      name: 'NOR Gate',
      description: 'Outputs HIGH only if all inputs are LOW (Composite: OR + NOT)',
      customGateId: 'sub-nor',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 8 4 C 11 4, 14 4, 17 4 C 21 4, 25 8, 27 10 C 25 12, 21 16, 17 16 C 14 16, 11 16, 8 16 C 10 12, 10 8, 8 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <circle cx="30" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="4" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="32.5" y1="10" x2="37" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'CUSTOM',
      name: 'XOR Gate',
      description: 'Outputs HIGH if inputs are different (Composite: NOT + AND + OR)',
      customGateId: 'sub-xor',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 10 4 C 13 4, 16 4, 19 4 C 23 4, 28 8, 30 10 C 28 12, 23 16, 19 16 C 16 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <path d="M 7 4 C 9 8, 9 12, 7 16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="3" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="3" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="30" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      type: 'CUSTOM',
      name: 'XNOR Gate',
      description: 'Outputs HIGH if inputs are same (Composite: XOR + NOT)',
      customGateId: 'sub-xnor',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <path d="M 10 4 C 13 4, 15 4, 18 4 C 21 4, 25 8, 27 10 C 25 12, 21 16, 18 16 C 15 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <path d="M 7 4 C 9 8, 9 12, 7 16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <circle cx="30" cy="10" r="2.5" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="3" y1="7" x2="9" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="3" y1="13" x2="9" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
          <line x1="32.5" y1="10" x2="37" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  const outputs: ToolboxItem[] = [
    {
      type: 'LED',
      name: 'LED Light',
      description: 'Illuminates HIGH (green) or LOW (gray)',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <circle cx="20" cy="10" r="7.5" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
          <line x1="5" y1="10" x2="12.5" y2="10" stroke="#5F5F5F" strokeWidth="1.5" />
          <path d="M 17 6 L 23 14 M 23 6 L 17 14" stroke="#5F5F5F" strokeWidth="1" />
        </svg>
      ),
    },
  ];

  if (activeTabId !== 'main') {
    outputs.push({
      type: 'PORT_OUT',
      name: 'Output Port',
      description: 'Sub-circuit output node pin',
      icon: (
        <svg viewBox="0 0 40 20" className="toolbox-item-icon">
          <rect x="5" y="3" width="30" height="14" rx="3" fill="#D1D3CD" stroke="#1A1A1A" strokeWidth="1.5" />
          <text x="20" y="13" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#1A1A1A">OUT</text>
        </svg>
      ),
    });
  }

  // Define preset IDs that are treated as official advanced blocks
  const presetBlockIds = ['sub-half-adder', 'sub-sr-latch', 'sub-mux', 'sub-full-adder', 'sub-d-latch'];

  // All system presets to prevent duplicates in user Custom Gates section
  const systemPresetIds = [...presetBlockIds, 'sub-nand', 'sub-nor', 'sub-xor', 'sub-xnor'];

  return (
    <div className="sidebar-container">
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
          {Object.values(customGates)
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
          {Object.values(customGates).filter((g) => !systemPresetIds.includes(g.id)).length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No custom gates packaged yet. Build a sub-circuit in another tab and click "Package Gate".
            </div>
          ) : (
            Object.values(customGates)
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
    </div>
  );
};
export default Sidebar;
