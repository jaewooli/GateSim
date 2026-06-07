import React from 'react';
import type { NodeType, SubCircuitDefinition } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';
import { DEMO_CUSTOM_GATES } from '../hooks/useCircuitState';

interface CurriculumDockProps {
  circuit: CircuitHook;
  onAddNode: (type: NodeType, customGateId?: string) => void;
}

// Icons for the dock
const SVG_SWITCH = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <rect x="4" y="4" width="32" height="12" rx="6" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="3.5" fill="#1A1A1A" />
  </svg>
);

const SVG_BUTTON = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <rect x="12" y="2" width="16" height="16" rx="4" fill="#F4F5F2" stroke="#5F5F5F" strokeWidth="1.5" />
    <circle cx="20" cy="10" r="4" fill="#5F5F5F" />
  </svg>
);

const SVG_CLOCK = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <rect x="6" y="4" width="28" height="12" rx="2" fill="none" stroke="#5F5F5F" strokeWidth="1.5" />
    <path d="M 11 12 L 15 12 L 15 6 L 19 6 L 19 12 L 23 12 L 23 6 L 27 6" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_AND = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <path d="M 10 4 L 18 4 C 23 4, 27 8, 27 10 C 27 12, 23 16, 18 16 L 10 16 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="7" x2="10" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="13" x2="10" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="27" y1="10" x2="34" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_OR = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <path d="M 10 4 C 13 4, 16 4, 18 4 C 22 4, 26 8, 28 10 C 26 12, 22 16, 18 16 C 16 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="7" x2="10" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="13" x2="10" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="28" y1="10" x2="34" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_NOT = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <polygon points="12,4 24,10 12,16" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="27" cy="10" r="2" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="10" x2="12" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="29" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_NOR = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <path d="M 10 4 C 13 4, 15 4, 17 4 C 20 4, 24 8, 26 10 C 24 12, 20 16, 17 16 C 15 16, 13 16, 10 16 C 12 12, 12 8, 10 4 Z" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <circle cx="29" cy="10" r="2" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="7" x2="10" y2="7" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="5" y1="13" x2="10" y2="13" stroke="#1A1A1A" strokeWidth="1.5" />
    <line x1="31" y1="10" x2="35" y2="10" stroke="#1A1A1A" strokeWidth="1.5" />
  </svg>
);

const SVG_LED = (
  <svg viewBox="0 0 40 20" className="dock-item-icon">
    <circle cx="20" cy="10" r="7" fill="#D1D3CD" stroke="#5F5F5F" strokeWidth="1.5" />
    <line x1="6" y1="10" x2="13" y2="10" stroke="#5F5F5F" strokeWidth="1.5" />
    <path d="M 17 7 L 23 13 M 23 7 L 17 13" stroke="#5F5F5F" strokeWidth="1" />
  </svg>
);

// Map of standard components to icons/names
const COMPONENT_DETAILS: Record<string, { name: string; icon: React.ReactNode; desc: string }> = {
  SWITCH: { name: 'Switch', icon: SVG_SWITCH, desc: 'Toggles high/low input signal' },
  BUTTON: { name: 'Button', icon: SVG_BUTTON, desc: 'High signal while pressed' },
  CLOCK: { name: 'Clock', icon: SVG_CLOCK, desc: 'Generates tick pulses' },
  AND: { name: 'AND', icon: SVG_AND, desc: 'High if all inputs are high' },
  OR: { name: 'OR', icon: SVG_OR, desc: 'High if any input is high' },
  NOT: { name: 'NOT', icon: SVG_NOT, desc: 'Inverts the input signal' },
  NOR: { name: 'NOR', icon: SVG_NOR, desc: 'Universal NOR gate' },
  LED: { name: 'LED', icon: SVG_LED, desc: 'Lights up on high signal' },
  PORT_IN: { name: 'Input Port', icon: null, desc: 'Input pin' },
  PORT_OUT: { name: 'Output Port', icon: null, desc: 'Output pin' },
  CUSTOM: { name: 'Custom', icon: null, desc: 'Custom integrated gate' },
};

// Curriculum Tool Lock Map
const MISSION_UNLOCK_MAP: Record<string, {
  inputs: NodeType[];
  gates: NodeType[];
  outputs: NodeType[];
  custom: string[];
}> = {
  'mission-nand': {
    inputs: ['SWITCH'],
    gates: ['AND', 'NOT'],
    outputs: ['LED'],
    custom: []
  },
  'mission-nor': {
    inputs: ['SWITCH'],
    gates: ['OR', 'NOT'],
    outputs: ['LED'],
    custom: []
  },
  'mission-xor': {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: ['sub-nand', 'sub-nor']
  },
  'mission-xnor': {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: ['sub-nand', 'sub-nor', 'sub-xor']
  },
  'mission-mux': {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: ['sub-nand', 'sub-nor', 'sub-xor', 'sub-xnor']
  },
  'mission-half-adder': {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: ['sub-nand', 'sub-nor', 'sub-xor', 'sub-xnor']
  },
  'mission-full-adder': {
    inputs: ['SWITCH'],
    gates: ['OR'],
    outputs: ['LED'],
    custom: ['sub-half-adder']
  },
  'mission-sr-latch': {
    inputs: ['SWITCH', 'BUTTON'],
    gates: ['NOR', 'AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: []
  },
  'mission-d-latch': {
    inputs: ['SWITCH', 'CLOCK'],
    gates: ['AND', 'NOT', 'NOR'],
    outputs: ['LED'],
    custom: ['sub-sr-latch']
  },
  'mission-decoder': {
    inputs: ['SWITCH'],
    gates: ['AND', 'NOT'],
    outputs: ['LED'],
    custom: []
  },
  'mission-alu-1bit': {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR'],
    outputs: ['LED'],
    custom: ['sub-half-adder', 'sub-mux']
  },
  'mission-register-4bit': {
    inputs: ['SWITCH'],
    gates: [],
    outputs: ['LED'],
    custom: ['sub-d-latch']
  },
  'mission-pc-4bit': {
    inputs: ['SWITCH'],
    gates: ['AND', 'NOT'],
    outputs: ['LED'],
    custom: ['sub-register-4bit', 'sub-half-adder']
  },
  'mission-cpu-4bit': {
    inputs: ['SWITCH'],
    gates: [],
    outputs: ['LED'],
    custom: ['sub-pc-4bit', 'sub-decoder', 'sub-register-4bit', 'sub-alu-1bit']
  }
};

export const CurriculumDock: React.FC<CurriculumDockProps> = ({ circuit, onAddNode }) => {
  const { activeMissionId, curriculumCustomGates } = circuit;

  if (!activeMissionId) return null;

  const unlockInfo = MISSION_UNLOCK_MAP[activeMissionId] || {
    inputs: ['SWITCH'],
    gates: ['AND', 'OR', 'NOT'],
    outputs: ['LED'],
    custom: []
  };

  const handleDragStart = (e: React.DragEvent, type: NodeType, customGateId?: string) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    if (customGateId) {
      e.dataTransfer.setData('application/reactflow-custom-id', customGateId);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  // Resolve custom gates that are unlocked
  const unlockedCustomGates = unlockInfo.custom
    .map(id => curriculumCustomGates[id] || DEMO_CUSTOM_GATES[id])
    .filter((g): g is SubCircuitDefinition => !!g);

  return (
    <div className="curriculum-dock-container">
      <div className="dock-title-label">🛠️ UNLOCKED COMPONENT TOOLBOX</div>
      <div className="dock-items-wrapper">
        
        {/* Render Unlocked Basic Inputs */}
        {unlockInfo.inputs.map(type => {
          const detail = COMPONENT_DETAILS[type];
          return (
            <div
              key={type}
              className="dock-item"
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => onAddNode(type)}
              title={detail.desc}
            >
              <div className="dock-item-visual">{detail.icon}</div>
              <div className="dock-item-name">{detail.name}</div>
            </div>
          );
        })}

        {/* Separator if gates exist */}
        {(unlockInfo.inputs.length > 0 && unlockInfo.gates.length > 0) && <div className="dock-divider" />}

        {/* Render Unlocked Logic Gates */}
        {unlockInfo.gates.map(type => {
          const detail = COMPONENT_DETAILS[type];
          return (
            <div
              key={type}
              className="dock-item gate-item"
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => onAddNode(type)}
              title={detail.desc}
            >
              <div className="dock-item-visual">{detail.icon}</div>
              <div className="dock-item-name">{detail.name}</div>
            </div>
          );
        })}

        {/* Separator if outputs exist */}
        {(unlockInfo.gates.length > 0 && unlockInfo.outputs.length > 0) && <div className="dock-divider" />}

        {/* Render Unlocked Outputs */}
        {unlockInfo.outputs.map(type => {
          const detail = COMPONENT_DETAILS[type];
          return (
            <div
              key={type}
              className="dock-item"
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => onAddNode(type)}
              title={detail.desc}
            >
              <div className="dock-item-visual">{detail.icon}</div>
              <div className="dock-item-name">{detail.name}</div>
            </div>
          );
        })}

        {/* Separator if custom gates exist */}
        {unlockedCustomGates.length > 0 && <div className="dock-divider" />}

        {/* Render Package Custom Gates (User built from prior steps) */}
        {unlockedCustomGates.map(gate => {
          return (
            <div
              key={gate.id}
              className="dock-item custom-gate-item"
              draggable
              onDragStart={(e) => handleDragStart(e, 'CUSTOM', gate.id)}
              onClick={() => onAddNode('CUSTOM', gate.id)}
              title={`직접 패키징한 ${gate.name} 게이트 (${gate.nodes.filter(n => n.type === 'PORT_IN').length} IN / ${gate.nodes.filter(n => n.type === 'PORT_OUT').length} OUT)`}
            >
              <div className="dock-item-visual">
                <div className="custom-gate-dot" style={{ backgroundColor: gate.color }} />
              </div>
              <div className="dock-item-name" style={{ color: gate.color, fontWeight: 700 }}>{gate.name}</div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default CurriculumDock;
