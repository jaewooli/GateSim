import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Connection, SubCircuitDefinition, Tab, CanvasTransform, NodeType, Pin, CircuitState, Mission } from '../types';
import { runSimulationFull, runSimulationStep } from '../utils/simulation';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';

const INITIAL_TRANSFORM: CanvasTransform = { x: 0, y: 0, zoom: 1 };

function createDemoNode(
  id: string,
  type: NodeType,
  name: string,
  x: number,
  y: number,
  inputCount: number,
  outputCount: number,
  customGateId?: string,
  label?: string
): Node {
  return {
    id,
    type,
    name,
    x,
    y,
    inputs: Array.from({ length: inputCount }, (_, i) => ({
      id: `${id}-in-${i}`,
      nodeId: id,
      type: 'input',
      index: i,
      value: false,
    })),
    outputs: Array.from({ length: outputCount }, (_, i) => ({
      id: `${id}-out-${i}`,
      nodeId: id,
      type: 'output',
      index: i,
      value: false,
    })),
    customGateId,
    label,
    clockInterval: type === 'CLOCK' ? 1000 : undefined,
    clockState: type === 'CLOCK' ? false : undefined,
  };
}

export const DEMO_CUSTOM_GATES: Record<string, SubCircuitDefinition> = {
  'sub-half-adder': {
    id: 'sub-half-adder',
    name: 'HALF_ADDER',
    color: '#B6E63A',
    nodes: [
      createDemoNode('ha-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('ha-in-b', 'PORT_IN', 'IN PORT', 60, 240, 0, 1, undefined, 'B'),
      createDemoNode('ha-xor', 'XOR', 'XOR', 280, 60, 2, 1),
      createDemoNode('ha-and', 'AND', 'AND', 280, 220, 2, 1),
      createDemoNode('ha-out-s', 'PORT_OUT', 'OUT PORT', 500, 80, 1, 0, undefined, 'Sum'),
      createDemoNode('ha-out-c', 'PORT_OUT', 'OUT PORT', 500, 240, 1, 0, undefined, 'Carry'),
    ],
    connections: [
      { id: 'ha-conn-1', fromPinId: 'ha-in-a-out-0', toPinId: 'ha-xor-in-0' },
      { id: 'ha-conn-2', fromPinId: 'ha-in-b-out-0', toPinId: 'ha-xor-in-1' },
      { id: 'ha-conn-3', fromPinId: 'ha-in-a-out-0', toPinId: 'ha-and-in-0' },
      { id: 'ha-conn-4', fromPinId: 'ha-in-b-out-0', toPinId: 'ha-and-in-1' },
      { id: 'ha-conn-5', fromPinId: 'ha-xor-out-0', toPinId: 'ha-out-s-in-0' },
      { id: 'ha-conn-6', fromPinId: 'ha-and-out-0', toPinId: 'ha-out-c-in-0' },
    ],
  },
  'sub-sr-latch': {
    id: 'sub-sr-latch',
    name: 'SR_LATCH',
    color: '#F15B2A',
    nodes: [
      createDemoNode('sr-in-r', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'Reset (R)'),
      createDemoNode('sr-in-s', 'PORT_IN', 'IN PORT', 60, 320, 0, 1, undefined, 'Set (S)'),
      createDemoNode('sr-nor-q', 'NOR', 'NOR', 280, 60, 2, 1, undefined, 'Q Output Gate'),
      createDemoNode('sr-nor-qb', 'NOR', 'NOR', 280, 280, 2, 1, undefined, 'Q_bar Gate'),
      createDemoNode('sr-out-q', 'PORT_OUT', 'OUT PORT', 500, 80, 1, 0, undefined, 'Q'),
      createDemoNode('sr-out-qb', 'PORT_OUT', 'OUT PORT', 500, 320, 1, 0, undefined, 'Q_bar'),
    ],
    connections: [
      { id: 'sr-conn-1', fromPinId: 'sr-in-r-out-0', toPinId: 'sr-nor-q-in-0' },
      { id: 'sr-conn-2', fromPinId: 'sr-in-s-out-0', toPinId: 'sr-nor-qb-in-1' },
      { id: 'sr-conn-3', fromPinId: 'sr-nor-q-out-0', toPinId: 'sr-nor-qb-in-0' },
      { id: 'sr-conn-4', fromPinId: 'sr-nor-qb-out-0', toPinId: 'sr-nor-q-in-1' },
      { id: 'sr-conn-5', fromPinId: 'sr-nor-q-out-0', toPinId: 'sr-out-q-in-0' },
      { id: 'sr-conn-6', fromPinId: 'sr-nor-qb-out-0', toPinId: 'sr-out-qb-in-0' },
    ],
  },
  'sub-mux': {
    id: 'sub-mux',
    name: 'MUX_2_TO_1',
    color: '#3A86F0',
    nodes: [
      createDemoNode('mux-d0', 'PORT_IN', 'IN PORT', 60, 60, 0, 1, undefined, 'D0'),
      createDemoNode('mux-d1', 'PORT_IN', 'IN PORT', 60, 380, 0, 1, undefined, 'D1'),
      createDemoNode('mux-sel', 'PORT_IN', 'IN PORT', 60, 220, 0, 1, undefined, 'Select'),
      createDemoNode('mux-not', 'NOT', 'NOT', 240, 220, 1, 1),
      createDemoNode('mux-and-0', 'AND', 'AND', 420, 60, 2, 1),
      createDemoNode('mux-and-1', 'AND', 'AND', 420, 320, 2, 1),
      createDemoNode('mux-or', 'OR', 'OR', 600, 190, 2, 1),
      createDemoNode('mux-out', 'PORT_OUT', 'OUT PORT', 780, 190, 1, 0, undefined, 'Out'),
    ],
    connections: [
      { id: 'mux-conn-1', fromPinId: 'mux-sel-out-0', toPinId: 'mux-not-in-0' },
      { id: 'mux-conn-2', fromPinId: 'mux-d0-out-0', toPinId: 'mux-and-0-in-0' },
      { id: 'mux-conn-3', fromPinId: 'mux-not-out-0', toPinId: 'mux-and-0-in-1' },
      { id: 'mux-conn-4', fromPinId: 'mux-d1-out-0', toPinId: 'mux-and-1-in-1' },
      { id: 'mux-conn-5', fromPinId: 'mux-sel-out-0', toPinId: 'mux-and-1-in-0' },
      { id: 'mux-conn-6', fromPinId: 'mux-and-0-out-0', toPinId: 'mux-or-in-0' },
      { id: 'mux-conn-7', fromPinId: 'mux-and-1-out-0', toPinId: 'mux-or-in-1' },
      { id: 'mux-conn-8', fromPinId: 'mux-or-out-0', toPinId: 'mux-out-in-0' },
    ],
  },
  'sub-nand': {
    id: 'sub-nand',
    name: 'NAND_GATE',
    color: '#9E00FF',
    nodes: [
      createDemoNode('nand-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('nand-in-b', 'PORT_IN', 'IN PORT', 60, 200, 0, 1, undefined, 'B'),
      createDemoNode('nand-and', 'AND', 'AND', 240, 130, 2, 1),
      createDemoNode('nand-not', 'NOT', 'NOT', 420, 130, 1, 1),
      createDemoNode('nand-out', 'PORT_OUT', 'OUT PORT', 600, 130, 1, 0, undefined, 'Out'),
    ],
    connections: [
      { id: 'nand-conn-1', fromPinId: 'nand-in-a-out-0', toPinId: 'nand-and-in-0' },
      { id: 'nand-conn-2', fromPinId: 'nand-in-b-out-0', toPinId: 'nand-and-in-1' },
      { id: 'nand-conn-3', fromPinId: 'nand-and-out-0', toPinId: 'nand-not-in-0' },
      { id: 'nand-conn-4', fromPinId: 'nand-not-out-0', toPinId: 'nand-out-in-0' },
    ],
  },
  'sub-nor': {
    id: 'sub-nor',
    name: 'NOR_GATE',
    color: '#FF007A',
    nodes: [
      createDemoNode('nor-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('nor-in-b', 'PORT_IN', 'IN PORT', 60, 200, 0, 1, undefined, 'B'),
      createDemoNode('nor-or', 'OR', 'OR', 240, 130, 2, 1),
      createDemoNode('nor-not', 'NOT', 'NOT', 420, 130, 1, 1),
      createDemoNode('nor-out', 'PORT_OUT', 'OUT PORT', 600, 130, 1, 0, undefined, 'Out'),
    ],
    connections: [
      { id: 'nor-conn-1', fromPinId: 'nor-in-a-out-0', toPinId: 'nor-or-in-0' },
      { id: 'nor-conn-2', fromPinId: 'nor-in-b-out-0', toPinId: 'nor-or-in-1' },
      { id: 'nor-conn-3', fromPinId: 'nor-or-out-0', toPinId: 'nor-not-in-0' },
      { id: 'nor-conn-4', fromPinId: 'nor-not-out-0', toPinId: 'nor-out-in-0' },
    ],
  },
  'sub-xor': {
    id: 'sub-xor',
    name: 'XOR_GATE',
    color: '#00D1FF',
    nodes: [
      createDemoNode('xor-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('xor-in-b', 'PORT_IN', 'IN PORT', 60, 240, 0, 1, undefined, 'B'),
      createDemoNode('xor-not-a', 'NOT', 'NOT', 200, 80, 1, 1),
      createDemoNode('xor-not-b', 'NOT', 'NOT', 200, 240, 1, 1),
      createDemoNode('xor-and-1', 'AND', 'AND', 360, 60, 2, 1),
      createDemoNode('xor-and-2', 'AND', 'AND', 360, 220, 2, 1),
      createDemoNode('xor-or', 'OR', 'OR', 520, 140, 2, 1),
      createDemoNode('xor-out', 'PORT_OUT', 'OUT PORT', 680, 140, 1, 0, undefined, 'Out'),
    ],
    connections: [
      { id: 'xor-conn-1', fromPinId: 'xor-in-a-out-0', toPinId: 'xor-not-a-in-0' },
      { id: 'xor-conn-2', fromPinId: 'xor-in-b-out-0', toPinId: 'xor-not-b-in-0' },
      { id: 'xor-conn-3', fromPinId: 'xor-in-a-out-0', toPinId: 'xor-and-1-in-0' },
      { id: 'xor-conn-4', fromPinId: 'xor-not-b-out-0', toPinId: 'xor-and-1-in-1' },
      { id: 'xor-conn-5', fromPinId: 'xor-not-a-out-0', toPinId: 'xor-and-2-in-0' },
      { id: 'xor-conn-6', fromPinId: 'xor-in-b-out-0', toPinId: 'xor-and-2-in-1' },
      { id: 'xor-conn-7', fromPinId: 'xor-and-1-out-0', toPinId: 'xor-or-in-0' },
      { id: 'xor-conn-8', fromPinId: 'xor-and-2-out-0', toPinId: 'xor-or-in-1' },
      { id: 'xor-conn-9', fromPinId: 'xor-or-out-0', toPinId: 'xor-out-in-0' },
    ],
  },
  'sub-xnor': {
    id: 'sub-xnor',
    name: 'XNOR_GATE',
    color: '#FFB800',
    nodes: [
      createDemoNode('xnor-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('xnor-in-b', 'PORT_IN', 'IN PORT', 60, 240, 0, 1, undefined, 'B'),
      createDemoNode('xnor-not-a', 'NOT', 'NOT', 200, 80, 1, 1),
      createDemoNode('xnor-not-b', 'NOT', 'NOT', 200, 240, 1, 1),
      createDemoNode('xnor-and-1', 'AND', 'AND', 360, 60, 2, 1),
      createDemoNode('xnor-and-2', 'AND', 'AND', 360, 220, 2, 1),
      createDemoNode('xnor-or', 'OR', 'OR', 520, 140, 2, 1),
      createDemoNode('xnor-not-out', 'NOT', 'NOT', 660, 140, 1, 1),
      createDemoNode('xnor-out', 'PORT_OUT', 'OUT PORT', 800, 140, 1, 0, undefined, 'Out'),
    ],
    connections: [
      { id: 'xnor-conn-1', fromPinId: 'xnor-in-a-out-0', toPinId: 'xnor-not-a-in-0' },
      { id: 'xnor-conn-2', fromPinId: 'xnor-in-b-out-0', toPinId: 'xnor-not-b-in-0' },
      { id: 'xnor-conn-3', fromPinId: 'xnor-in-a-out-0', toPinId: 'xnor-and-1-in-0' },
      { id: 'xnor-conn-4', fromPinId: 'xnor-not-b-out-0', toPinId: 'xnor-and-1-in-1' },
      { id: 'xnor-conn-5', fromPinId: 'xnor-not-a-out-0', toPinId: 'xnor-and-2-in-0' },
      { id: 'xnor-conn-6', fromPinId: 'xnor-in-b-out-0', toPinId: 'xnor-and-2-in-1' },
      { id: 'xnor-conn-7', fromPinId: 'xnor-and-1-out-0', toPinId: 'xnor-or-in-0' },
      { id: 'xnor-conn-8', fromPinId: 'xnor-and-2-out-0', toPinId: 'xnor-or-in-1' },
      { id: 'xnor-conn-9', fromPinId: 'xnor-or-out-0', toPinId: 'xnor-not-out-in-0' },
      { id: 'xnor-conn-10', fromPinId: 'xnor-not-out-out-0', toPinId: 'xnor-out-in-0' },
    ],
  },
  'sub-full-adder': {
    id: 'sub-full-adder',
    name: 'FULL_ADDER',
    color: '#00FF66',
    nodes: [
      createDemoNode('fa-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
      createDemoNode('fa-in-b', 'PORT_IN', 'IN PORT', 60, 200, 0, 1, undefined, 'B'),
      createDemoNode('fa-in-cin', 'PORT_IN', 'IN PORT', 60, 320, 0, 1, undefined, 'Cin'),
      createDemoNode('fa-ha-1', 'CUSTOM', 'HALF_ADDER', 240, 80, 2, 2, 'sub-half-adder', 'HA 1'),
      createDemoNode('fa-ha-2', 'CUSTOM', 'HALF_ADDER', 460, 180, 2, 2, 'sub-half-adder', 'HA 2'),
      createDemoNode('fa-or', 'OR', 'OR', 660, 80, 2, 1),
      createDemoNode('fa-out-sum', 'PORT_OUT', 'OUT PORT', 840, 240, 1, 0, undefined, 'Sum'),
      createDemoNode('fa-out-cout', 'PORT_OUT', 'OUT PORT', 840, 80, 1, 0, undefined, 'Cout'),
    ],
    connections: [
      { id: 'fa-conn-1', fromPinId: 'fa-in-a-out-0', toPinId: 'fa-ha-1-in-0' },
      { id: 'fa-conn-2', fromPinId: 'fa-in-b-out-0', toPinId: 'fa-ha-1-in-1' },
      { id: 'fa-conn-3', fromPinId: 'fa-ha-1-out-0', toPinId: 'fa-ha-2-in-0' },
      { id: 'fa-conn-4', fromPinId: 'fa-in-cin-out-0', toPinId: 'fa-ha-2-in-1' },
      { id: 'fa-conn-5', fromPinId: 'fa-ha-1-out-1', toPinId: 'fa-or-in-0' },
      { id: 'fa-conn-6', fromPinId: 'fa-ha-2-out-1', toPinId: 'fa-or-in-1' },
      { id: 'fa-conn-7', fromPinId: 'fa-ha-2-out-0', toPinId: 'fa-out-sum-in-0' },
      { id: 'fa-conn-8', fromPinId: 'fa-or-out-0', toPinId: 'fa-out-cout-in-0' },
    ],
  },
  'sub-d-latch': {
    id: 'sub-d-latch',
    name: 'D_LATCH',
    color: '#FF6B6B',
    nodes: [
      createDemoNode('dlatch-in-d', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'D'),
      createDemoNode('dlatch-in-clk', 'PORT_IN', 'IN PORT', 60, 240, 0, 1, undefined, 'CLK'),
      createDemoNode('dlatch-not', 'NOT', 'NOT', 180, 80, 1, 1),
      createDemoNode('dlatch-and-s', 'AND', 'AND', 300, 60, 2, 1),
      createDemoNode('dlatch-and-r', 'AND', 'AND', 300, 220, 2, 1),
      createDemoNode('dlatch-nor-q', 'NOR', 'NOR', 460, 60, 2, 1, undefined, 'Q NOR'),
      createDemoNode('dlatch-nor-qb', 'NOR', 'NOR', 460, 220, 2, 1, undefined, 'Qb NOR'),
      createDemoNode('dlatch-out-q', 'PORT_OUT', 'OUT PORT', 620, 80, 1, 0, undefined, 'Q'),
      createDemoNode('dlatch-out-qb', 'PORT_OUT', 'OUT PORT', 620, 240, 1, 0, undefined, 'Q_bar'),
    ],
    connections: [
      { id: 'dlatch-conn-1', fromPinId: 'dlatch-in-d-out-0', toPinId: 'dlatch-and-s-in-0' },
      { id: 'dlatch-conn-2', fromPinId: 'dlatch-in-d-out-0', toPinId: 'dlatch-not-in-0' },
      { id: 'dlatch-conn-3', fromPinId: 'dlatch-not-out-0', toPinId: 'dlatch-and-r-in-1' },
      { id: 'dlatch-conn-4', fromPinId: 'dlatch-in-clk-out-0', toPinId: 'dlatch-and-s-in-1' },
      { id: 'dlatch-conn-5', fromPinId: 'dlatch-in-clk-out-0', toPinId: 'dlatch-and-r-in-0' },
      { id: 'dlatch-conn-6', fromPinId: 'dlatch-and-s-out-0', toPinId: 'dlatch-nor-qb-in-1' },
      { id: 'dlatch-conn-7', fromPinId: 'dlatch-and-r-out-0', toPinId: 'dlatch-nor-q-in-0' },
      { id: 'dlatch-conn-8', fromPinId: 'dlatch-nor-q-out-0', toPinId: 'dlatch-nor-qb-in-0' },
      { id: 'dlatch-conn-9', fromPinId: 'dlatch-nor-qb-out-0', toPinId: 'dlatch-nor-q-in-1' },
      { id: 'dlatch-conn-10', fromPinId: 'dlatch-nor-q-out-0', toPinId: 'dlatch-out-q-in-0' },
      { id: 'dlatch-conn-11', fromPinId: 'dlatch-nor-qb-out-0', toPinId: 'dlatch-out-qb-in-0' },
    ],
  },
  'sub-decoder': {
    id: 'sub-decoder',
    name: 'DECODER',
    color: '#E040FB',
    nodes: [
      createDemoNode('dec-op0', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'OP0'),
      createDemoNode('dec-op1', 'PORT_IN', 'IN PORT', 60, 200, 0, 1, undefined, 'OP1'),
      createDemoNode('dec-not0', 'NOT', 'NOT', 220, 80, 1, 1),
      createDemoNode('dec-not1', 'NOT', 'NOT', 220, 200, 1, 1),
      createDemoNode('dec-and-load', 'AND', 'AND', 380, 60, 2, 1),
      createDemoNode('dec-and-add', 'AND', 'AND', 380, 180, 2, 1),
      createDemoNode('dec-and-jump', 'AND', 'AND', 380, 300, 2, 1),
      createDemoNode('dec-out-load', 'PORT_OUT', 'OUT PORT', 540, 80, 1, 0, undefined, 'LOAD'),
      createDemoNode('dec-out-add', 'PORT_OUT', 'OUT PORT', 540, 200, 1, 0, undefined, 'ADD'),
      createDemoNode('dec-out-jump', 'PORT_OUT', 'OUT PORT', 540, 320, 1, 0, undefined, 'JUMP'),
    ],
    connections: [
      { id: 'dec-c1', fromPinId: 'dec-op0-out-0', toPinId: 'dec-not0-in-0' },
      { id: 'dec-c2', fromPinId: 'dec-op1-out-0', toPinId: 'dec-not1-in-0' },
      { id: 'dec-c3', fromPinId: 'dec-not0-out-0', toPinId: 'dec-and-load-in-0' },
      { id: 'dec-c4', fromPinId: 'dec-not1-out-0', toPinId: 'dec-and-load-in-1' },
      { id: 'dec-c5', fromPinId: 'dec-op0-out-0', toPinId: 'dec-and-add-in-0' },
      { id: 'dec-c6', fromPinId: 'dec-not1-out-0', toPinId: 'dec-and-add-in-1' },
      { id: 'dec-c7', fromPinId: 'dec-not0-out-0', toPinId: 'dec-and-jump-in-0' },
      { id: 'dec-c8', fromPinId: 'dec-op1-out-0', toPinId: 'dec-and-jump-in-1' },
      { id: 'dec-c9', fromPinId: 'dec-and-load-out-0', toPinId: 'dec-out-load-in-0' },
      { id: 'dec-c10', fromPinId: 'dec-and-add-out-0', toPinId: 'dec-out-add-in-0' },
      { id: 'dec-c11', fromPinId: 'dec-and-jump-out-0', toPinId: 'dec-out-jump-in-0' },
    ]
  },
  'sub-alu-1bit': {
    id: 'sub-alu-1bit',
    name: 'ALU_1BIT',
    color: '#00E676',
    nodes: [
      createDemoNode('alu-in-a', 'PORT_IN', 'IN PORT', 60, 60, 0, 1, undefined, 'A'),
      createDemoNode('alu-in-b', 'PORT_IN', 'IN PORT', 60, 180, 0, 1, undefined, 'B'),
      createDemoNode('alu-in-op0', 'PORT_IN', 'IN PORT', 60, 300, 0, 1, undefined, 'Op0'),
      createDemoNode('alu-in-op1', 'PORT_IN', 'IN PORT', 60, 420, 0, 1, undefined, 'Op1'),
      createDemoNode('alu-and', 'AND', 'AND', 240, 60, 2, 1),
      createDemoNode('alu-or', 'OR', 'OR', 240, 180, 2, 1),
      createDemoNode('alu-ha', 'CUSTOM', 'HALF_ADDER', 240, 300, 2, 2, 'sub-half-adder', 'HA'),
      createDemoNode('alu-mux1', 'CUSTOM', 'MUX_2_TO_1', 440, 120, 3, 1, 'sub-mux', 'MUX 1'),
      createDemoNode('alu-mux2', 'CUSTOM', 'MUX_2_TO_1', 620, 240, 3, 1, 'sub-mux', 'MUX 2'),
      createDemoNode('alu-out', 'PORT_OUT', 'OUT PORT', 800, 240, 1, 0, undefined, 'Result'),
    ],
    connections: [
      { id: 'alu-c1', fromPinId: 'alu-in-a-out-0', toPinId: 'alu-and-in-0' },
      { id: 'alu-c2', fromPinId: 'alu-in-b-out-0', toPinId: 'alu-and-in-1' },
      { id: 'alu-c3', fromPinId: 'alu-in-a-out-0', toPinId: 'alu-or-in-0' },
      { id: 'alu-c4', fromPinId: 'alu-in-b-out-0', toPinId: 'alu-or-in-1' },
      { id: 'alu-c5', fromPinId: 'alu-in-a-out-0', toPinId: 'alu-ha-in-0' },
      { id: 'alu-c6', fromPinId: 'alu-in-b-out-0', toPinId: 'alu-ha-in-1' },
      // MUX 1: AND(D0), OR(D1), Op0(Sel)
      { id: 'alu-c7', fromPinId: 'alu-and-out-0', toPinId: 'alu-mux1-in-0' },
      { id: 'alu-c8', fromPinId: 'alu-or-out-0', toPinId: 'alu-mux1-in-1' },
      { id: 'alu-c9', fromPinId: 'alu-in-op0-out-0', toPinId: 'alu-mux1-in-2' },
      // MUX 2: MUX1_Out(D0), HA_Sum(D1), Op1(Sel)
      { id: 'alu-c10', fromPinId: 'alu-mux1-out-0', toPinId: 'alu-mux2-in-0' },
      { id: 'alu-c11', fromPinId: 'alu-ha-out-0', toPinId: 'alu-mux2-in-1' },
      { id: 'alu-c12', fromPinId: 'alu-in-op1-out-0', toPinId: 'alu-mux2-in-2' },
      { id: 'alu-c13', fromPinId: 'alu-mux2-out-0', toPinId: 'alu-out-in-0' },
    ]
  },
  'sub-register-4bit': {
    id: 'sub-register-4bit',
    name: 'REGISTER_4BIT',
    color: '#29B6F6',
    nodes: [
      createDemoNode('reg-d0', 'PORT_IN', 'IN PORT', 60, 60, 0, 1, undefined, 'D0'),
      createDemoNode('reg-d1', 'PORT_IN', 'IN PORT', 60, 180, 0, 1, undefined, 'D1'),
      createDemoNode('reg-d2', 'PORT_IN', 'IN PORT', 60, 300, 0, 1, undefined, 'D2'),
      createDemoNode('reg-d3', 'PORT_IN', 'IN PORT', 60, 420, 0, 1, undefined, 'D3'),
      createDemoNode('reg-clk', 'PORT_IN', 'IN PORT', 60, 540, 0, 1, undefined, 'CLK'),
      createDemoNode('reg-l0', 'CUSTOM', 'D_LATCH', 240, 60, 2, 2, 'sub-d-latch', 'L0'),
      createDemoNode('reg-l1', 'CUSTOM', 'D_LATCH', 240, 180, 2, 2, 'sub-d-latch', 'L1'),
      createDemoNode('reg-l2', 'CUSTOM', 'D_LATCH', 240, 300, 2, 2, 'sub-d-latch', 'L2'),
      createDemoNode('reg-l3', 'CUSTOM', 'D_LATCH', 240, 420, 2, 2, 'sub-d-latch', 'L3'),
      createDemoNode('reg-q0', 'PORT_OUT', 'OUT PORT', 420, 60, 1, 0, undefined, 'Q0'),
      createDemoNode('reg-q1', 'PORT_OUT', 'OUT PORT', 420, 180, 1, 0, undefined, 'Q1'),
      createDemoNode('reg-q2', 'PORT_OUT', 'OUT PORT', 420, 300, 1, 0, undefined, 'Q2'),
      createDemoNode('reg-q3', 'PORT_OUT', 'OUT PORT', 420, 420, 1, 0, undefined, 'Q3'),
    ],
    connections: [
      { id: 'reg-c1', fromPinId: 'reg-d0-out-0', toPinId: 'reg-l0-in-0' },
      { id: 'reg-c2', fromPinId: 'reg-d1-out-0', toPinId: 'reg-l1-in-0' },
      { id: 'reg-c3', fromPinId: 'reg-d2-out-0', toPinId: 'reg-l2-in-0' },
      { id: 'reg-c4', fromPinId: 'reg-d3-out-0', toPinId: 'reg-l3-in-0' },
      { id: 'reg-c5', fromPinId: 'reg-clk-out-0', toPinId: 'reg-l0-in-1' },
      { id: 'reg-c6', fromPinId: 'reg-clk-out-0', toPinId: 'reg-l1-in-1' },
      { id: 'reg-c7', fromPinId: 'reg-clk-out-0', toPinId: 'reg-l2-in-1' },
      { id: 'reg-c8', fromPinId: 'reg-clk-out-0', toPinId: 'reg-l3-in-1' },
      { id: 'reg-c9', fromPinId: 'reg-l0-out-0', toPinId: 'reg-q0-in-0' },
      { id: 'reg-c10', fromPinId: 'reg-l1-out-0', toPinId: 'reg-q1-in-0' },
      { id: 'reg-c11', fromPinId: 'reg-l2-out-0', toPinId: 'reg-q2-in-0' },
      { id: 'reg-c12', fromPinId: 'reg-l3-out-0', toPinId: 'reg-q3-in-0' },
    ]
  },
  'sub-pc-4bit': {
    id: 'sub-pc-4bit',
    name: 'PROGRAM_COUNTER',
    color: '#FF7043',
    nodes: [
      createDemoNode('pc-in-rst', 'PORT_IN', 'IN PORT', 60, 100, 0, 1, undefined, 'Reset'),
      createDemoNode('pc-in-clk', 'PORT_IN', 'IN PORT', 60, 260, 0, 1, undefined, 'CLK'),
      createDemoNode('pc-not-rst', 'NOT', 'NOT', 180, 100, 1, 1),
      createDemoNode('pc-and0', 'AND', 'AND', 300, 60, 2, 1),
      createDemoNode('pc-and1', 'AND', 'AND', 300, 180, 2, 1),
      createDemoNode('pc-and2', 'AND', 'AND', 300, 300, 2, 1),
      createDemoNode('pc-and3', 'AND', 'AND', 300, 420, 2, 1),
      createDemoNode('pc-reg', 'CUSTOM', 'REGISTER_4BIT', 460, 150, 5, 4, 'sub-register-4bit', 'Reg'),
      createDemoNode('pc-ha0', 'CUSTOM', 'HALF_ADDER', 660, 60, 2, 2, 'sub-half-adder', 'HA0'),
      createDemoNode('pc-ha1', 'CUSTOM', 'HALF_ADDER', 660, 180, 2, 2, 'sub-half-adder', 'HA1'),
      createDemoNode('pc-ha2', 'CUSTOM', 'HALF_ADDER', 660, 300, 2, 2, 'sub-half-adder', 'HA2'),
      createDemoNode('pc-ha3', 'CUSTOM', 'HALF_ADDER', 660, 420, 2, 2, 'sub-half-adder', 'HA3'),
      createDemoNode('pc-one-gen', 'SWITCH', 'SWITCH', 580, 20, 0, 1, undefined, 'Power'),
      createDemoNode('pc-out0', 'PORT_OUT', 'OUT PORT', 820, 60, 1, 0, undefined, 'PC0'),
      createDemoNode('pc-out1', 'PORT_OUT', 'OUT PORT', 820, 180, 1, 0, undefined, 'PC1'),
      createDemoNode('pc-out2', 'PORT_OUT', 'OUT PORT', 820, 300, 1, 0, undefined, 'PC2'),
      createDemoNode('pc-out3', 'PORT_OUT', 'OUT PORT', 820, 420, 1, 0, undefined, 'PC3'),
    ],
    connections: [
      { id: 'pc-c1', fromPinId: 'pc-in-rst-out-0', toPinId: 'pc-not-rst-in-0' },
      { id: 'pc-c2', fromPinId: 'pc-not-rst-out-0', toPinId: 'pc-and0-in-0' },
      { id: 'pc-c3', fromPinId: 'pc-not-rst-out-0', toPinId: 'pc-and1-in-0' },
      { id: 'pc-c4', fromPinId: 'pc-not-rst-out-0', toPinId: 'pc-and2-in-0' },
      { id: 'pc-c5', fromPinId: 'pc-not-rst-out-0', toPinId: 'pc-and3-in-0' },
      { id: 'pc-c6', fromPinId: 'pc-and0-out-0', toPinId: 'pc-reg-in-0' },
      { id: 'pc-c7', fromPinId: 'pc-and1-out-0', toPinId: 'pc-reg-in-1' },
      { id: 'pc-c8', fromPinId: 'pc-and2-out-0', toPinId: 'pc-reg-in-2' },
      { id: 'pc-c9', fromPinId: 'pc-and3-out-0', toPinId: 'pc-reg-in-3' },
      { id: 'pc-c10', fromPinId: 'pc-in-clk-out-0', toPinId: 'pc-reg-in-4' },
      { id: 'pc-c11', fromPinId: 'pc-reg-out-0', toPinId: 'pc-ha0-in-0' },
      { id: 'pc-c12', fromPinId: 'pc-reg-out-1', toPinId: 'pc-ha1-in-0' },
      { id: 'pc-c13', fromPinId: 'pc-reg-out-2', toPinId: 'pc-ha2-in-0' },
      { id: 'pc-c14', fromPinId: 'pc-reg-out-3', toPinId: 'pc-ha3-in-0' },
      { id: 'pc-c15', fromPinId: 'pc-one-gen-out-0', toPinId: 'pc-ha0-in-1' },
      { id: 'pc-c16', fromPinId: 'pc-ha0-out-1', toPinId: 'pc-ha1-in-1' },
      { id: 'pc-c17', fromPinId: 'pc-ha1-out-1', toPinId: 'pc-ha2-in-1' },
      { id: 'pc-c18', fromPinId: 'pc-ha2-out-1', toPinId: 'pc-ha3-in-1' },
      { id: 'pc-c19', fromPinId: 'pc-ha0-out-0', toPinId: 'pc-and0-in-1' },
      { id: 'pc-c20', fromPinId: 'pc-ha1-out-0', toPinId: 'pc-and1-in-1' },
      { id: 'pc-c21', fromPinId: 'pc-ha2-out-0', toPinId: 'pc-and2-in-1' },
      { id: 'pc-c22', fromPinId: 'pc-ha3-out-0', toPinId: 'pc-and3-in-1' },
      { id: 'pc-c23', fromPinId: 'pc-reg-out-0', toPinId: 'pc-out0-in-0' },
      { id: 'pc-c24', fromPinId: 'pc-reg-out-1', toPinId: 'pc-out1-in-0' },
      { id: 'pc-c25', fromPinId: 'pc-reg-out-2', toPinId: 'pc-out2-in-0' },
      { id: 'pc-c26', fromPinId: 'pc-reg-out-3', toPinId: 'pc-out3-in-0' },
    ]
  },
  'sub-cpu-4bit': {
    id: 'sub-cpu-4bit',
    name: 'CPU_4BIT',
    color: '#E65100',
    nodes: [
      createDemoNode('cpu-rst', 'PORT_IN', 'IN PORT', 60, 100, 0, 1, undefined, 'Reset'),
      createDemoNode('cpu-clk', 'PORT_IN', 'IN PORT', 60, 220, 0, 1, undefined, 'CLK'),
      createDemoNode('cpu-pc', 'CUSTOM', 'PROGRAM_COUNTER', 220, 100, 2, 4, 'sub-pc-4bit', 'PC'),
      createDemoNode('cpu-dec', 'CUSTOM', 'DECODER', 420, 100, 2, 3, 'sub-decoder', 'Decoder'),
      createDemoNode('cpu-reg', 'CUSTOM', 'REGISTER_4BIT', 620, 100, 5, 4, 'sub-register-4bit', 'Accumulator'),
      createDemoNode('cpu-out0', 'PORT_OUT', 'OUT PORT', 820, 60, 1, 0, undefined, 'Out0'),
      createDemoNode('cpu-out1', 'PORT_OUT', 'OUT PORT', 820, 180, 1, 0, undefined, 'Out1'),
      createDemoNode('cpu-out2', 'PORT_OUT', 'OUT PORT', 820, 300, 1, 0, undefined, 'Out2'),
      createDemoNode('cpu-out3', 'PORT_OUT', 'OUT PORT', 820, 420, 1, 0, undefined, 'Out3'),
    ],
    connections: [
      { id: 'cpu-c1', fromPinId: 'cpu-rst-out-0', toPinId: 'cpu-pc-in-0' },
      { id: 'cpu-c2', fromPinId: 'cpu-clk-out-0', toPinId: 'cpu-pc-in-1' },
      { id: 'cpu-c3', fromPinId: 'cpu-pc-out-0', toPinId: 'cpu-dec-in-0' },
      { id: 'cpu-c4', fromPinId: 'cpu-pc-out-1', toPinId: 'cpu-dec-in-1' },
      { id: 'cpu-c5', fromPinId: 'cpu-dec-out-0', toPinId: 'cpu-reg-in-4' },
      { id: 'cpu-c6', fromPinId: 'cpu-pc-out-0', toPinId: 'cpu-reg-in-0' },
      { id: 'cpu-c7', fromPinId: 'cpu-pc-out-1', toPinId: 'cpu-reg-in-1' },
      { id: 'cpu-c8', fromPinId: 'cpu-pc-out-2', toPinId: 'cpu-reg-in-2' },
      { id: 'cpu-c9', fromPinId: 'cpu-pc-out-3', toPinId: 'cpu-reg-in-3' },
      { id: 'cpu-c10', fromPinId: 'cpu-reg-out-0', toPinId: 'cpu-out0-in-0' },
      { id: 'cpu-c11', fromPinId: 'cpu-reg-out-1', toPinId: 'cpu-out1-in-0' },
      { id: 'cpu-c12', fromPinId: 'cpu-reg-out-2', toPinId: 'cpu-out2-in-0' },
      { id: 'cpu-c13', fromPinId: 'cpu-reg-out-3', toPinId: 'cpu-out3-in-0' },
    ]
  },
};

const DEMO_TABS: Tab[] = [
  // 1. Main Circuit
  {
    id: 'main',
    name: 'Main Circuit',
    state: {
      nodes: [
        createDemoNode('switch-a', 'SWITCH', 'SWITCH', 60, 100, 0, 1, undefined, 'Input A'),
        createDemoNode('switch-b', 'SWITCH', 'SWITCH', 60, 220, 0, 1, undefined, 'Input B'),
        createDemoNode('custom-ha', 'CUSTOM', 'HALF_ADDER', 240, 140, 2, 2, 'sub-half-adder', 'Half Adder'),
        createDemoNode('led-sum', 'LED', 'LED', 460, 100, 1, 0, undefined, 'Sum (S)'),
        createDemoNode('led-carry', 'LED', 'LED', 460, 220, 1, 0, undefined, 'Carry (C)'),
      ],
      connections: [
        { id: 'conn-dem-1', fromPinId: 'switch-a-out-0', toPinId: 'custom-ha-in-0' },
        { id: 'conn-dem-2', fromPinId: 'switch-b-out-0', toPinId: 'custom-ha-in-1' },
        { id: 'conn-dem-3', fromPinId: 'custom-ha-out-0', toPinId: 'led-sum-in-0' },
        { id: 'conn-dem-4', fromPinId: 'custom-ha-out-1', toPinId: 'led-carry-in-0' },
      ],
    },
  },
  {
    id: 'sub-half-adder',
    name: 'Half Adder',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-half-adder'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-half-adder'].connections)),
    },
  },
  {
    id: 'sub-sr-latch',
    name: 'SR Latch',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-sr-latch'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-sr-latch'].connections)),
    },
  },
  {
    id: 'sub-mux',
    name: '2-to-1 MUX',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-mux'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-mux'].connections)),
    },
  },
  {
    id: 'sub-nand',
    name: 'NAND Gate',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-nand'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-nand'].connections)),
    },
  },
  {
    id: 'sub-nor',
    name: 'NOR Gate',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-nor'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-nor'].connections)),
    },
  },
  {
    id: 'sub-xor',
    name: 'XOR Gate',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-xor'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-xor'].connections)),
    },
  },
  {
    id: 'sub-xnor',
    name: 'XNOR Gate',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-xnor'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-xnor'].connections)),
    },
  },
  {
    id: 'sub-full-adder',
    name: 'Full Adder',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-full-adder'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-full-adder'].connections)),
    },
  },
  {
    id: 'sub-d-latch',
    name: 'Gated D Latch',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-d-latch'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-d-latch'].connections)),
    },
  },
  {
    id: 'sub-decoder',
    name: 'Decoder',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-decoder'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-decoder'].connections)),
    },
  },
  {
    id: 'sub-alu-1bit',
    name: '1-Bit ALU',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-alu-1bit'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-alu-1bit'].connections)),
    },
  },
  {
    id: 'sub-register-4bit',
    name: '4-Bit Register',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-register-4bit'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-register-4bit'].connections)),
    },
  },
  {
    id: 'sub-pc-4bit',
    name: 'Program Counter',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-pc-4bit'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-pc-4bit'].connections)),
    },
  },
  {
    id: 'sub-cpu-4bit',
    name: '4-Bit CPU',
    state: {
      nodes: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-cpu-4bit'].nodes)),
      connections: JSON.parse(JSON.stringify(DEMO_CUSTOM_GATES['sub-cpu-4bit'].connections)),
    },
  },
];

export const MISSIONS: Mission[] = [
  {
    id: 'mission-nand',
    title: '미션 1: NAND 게이트 제작',
    description: 'AND 게이트와 NOT 게이트를 이용해 두 입력 A, B가 모두 참(true)일 때만 거짓(false)을 출력하는 NAND 게이트를 완성하세요.',
    targetTabId: 'sub-nand',
    inputsRequired: ['A', 'B'],
    outputsRequired: ['Out'],
    truthTable: [
      { inputs: [false, false], outputs: [true] },
      { inputs: [false, true], outputs: [true] },
      { inputs: [true, false], outputs: [true] },
      { inputs: [true, true], outputs: [false] }
    ],
    hint: 'AND 게이트를 먼저 배치한 후, 그 출력을 NOT 게이트의 입력으로 연결하세요. 그리고 NOT 게이트의 출력을 Out 포트에 꽂으시면 됩니다.'
  },
  {
    id: 'mission-nor',
    title: '미션 2: NOR 게이트 제작',
    description: 'OR 게이트와 NOT 게이트를 이용해 두 입력 A, B가 모두 거짓(false)일 때만 참(true)을 출력하는 NOR 게이트를 완성하세요.',
    targetTabId: 'sub-nor',
    inputsRequired: ['A', 'B'],
    outputsRequired: ['Out'],
    truthTable: [
      { inputs: [false, false], outputs: [true] },
      { inputs: [false, true], outputs: [false] },
      { inputs: [true, false], outputs: [false] },
      { inputs: [true, true], outputs: [false] }
    ],
    hint: 'OR 게이트를 먼저 배치한 후, 그 출력을 NOT 게이트의 입력으로 연결하세요. 그리고 NOT 게이트의 출력을 Out 포트에 꽂으시면 됩니다.'
  },
  {
    id: 'mission-xor',
    title: '미션 3: XOR 게이트 제작',
    description: 'AND, OR, NOT 게이트를 사용해 두 입력 A, B가 다를 때만 참(true)을 출력하는 XOR 게이트를 완성하세요. (A · NOT B) + (NOT A · B) 공식을 구현하면 됩니다.',
    targetTabId: 'sub-xor',
    inputsRequired: ['A', 'B'],
    outputsRequired: ['Out'],
    truthTable: [
      { inputs: [false, false], outputs: [false] },
      { inputs: [false, true], outputs: [true] },
      { inputs: [true, false], outputs: [true] },
      { inputs: [true, true], outputs: [false] }
    ],
    hint: 'NOT 게이트 2개로 입력 A, B를 각각 뒤집은 뒤, AND 게이트 2개를 배치해 A와 NOT B, 그리고 NOT A와 B를 각각 결선하세요. 그 다음 두 AND 출력을 OR 게이트로 묶어 Out 포트에 보내면 완성입니다.'
  },
  {
    id: 'mission-xnor',
    title: '미션 4: XNOR 게이트 제작',
    description: 'XOR 게이트와 NOT 게이트(혹은 기본 게이트들의 조합)를 사용해 두 입력 A, B가 서로 같을 때만 참(true)을 출력하는 XNOR 게이트를 완성하세요.',
    targetTabId: 'sub-xnor',
    inputsRequired: ['A', 'B'],
    outputsRequired: ['Out'],
    truthTable: [
      { inputs: [false, false], outputs: [true] },
      { inputs: [false, true], outputs: [false] },
      { inputs: [true, false], outputs: [false] },
      { inputs: [true, true], outputs: [true] }
    ],
    hint: 'XOR 게이트(toolbox에서 가져오거나 직접 설계)의 출력 끝에 NOT 게이트를 이어 붙이세요. 즉, A와 B를 XOR 게이트로 연결한 후 그 출력을 NOT 게이트에 거쳐 Out 포트에 연결합니다.'
  },
  {
    id: 'mission-mux',
    title: '미션 5: 2-to-1 MUX 제작',
    description: '선택 신호 Sel이 거짓(false)이면 D0을, 참(true)이면 D1을 출력하는 멀티플렉서(MUX)를 만드세요. y축 위에서 아래로 순서대로 D0, D1, Select 입력 포트를 배치하세요.',
    targetTabId: 'sub-mux',
    inputsRequired: ['D0', 'D1', 'Select'],
    outputsRequired: ['Out'],
    truthTable: [
      { inputs: [false, false, false], outputs: [false] },
      { inputs: [false, true, false], outputs: [false] },
      { inputs: [true, false, false], outputs: [true] },
      { inputs: [true, true, false], outputs: [true] },
      { inputs: [false, false, true], outputs: [false] },
      { inputs: [false, true, true], outputs: [true] },
      { inputs: [true, false, true], outputs: [false] },
      { inputs: [true, true, true], outputs: [true] }
    ],
    hint: '선택 신호(Select)를 NOT 게이트로 뒤집어 둡니다. 두 개의 AND 게이트를 준비하여, 위쪽 AND 게이트에는 D0과 NOT Select를, 아래쪽 AND 게이트에는 D1과 Select 신호를 입력으로 넣습니다. 마지막으로 두 AND 출력을 OR 게이트로 합산해 Out 포트에 연결하면 완성입니다.'
  },
  {
    id: 'mission-half-adder',
    title: '미션 6: 반가산기(Half Adder) 제작',
    description: '1비트 수 두 개(A, B)를 더해 합(Sum)과 올림수(Carry)를 계산하는 반가산기를 만드세요. (Sum은 XOR, Carry는 AND 게이트로 만듭니다. y축 정렬 순서대로 Sum, Carry 출력 포트를 배치하세요.)',
    targetTabId: 'sub-half-adder',
    inputsRequired: ['A', 'B'],
    outputsRequired: ['Sum', 'Carry'],
    truthTable: [
      { inputs: [false, false], outputs: [false, false] },
      { inputs: [false, true], outputs: [true, false] },
      { inputs: [true, false], outputs: [true, false] },
      { inputs: [true, true], outputs: [false, true] }
    ],
    hint: '두 입력 A, B를 XOR 게이트에 결선해 합(Sum) 출력 포트로 보내고, 동시에 A, B를 AND 게이트에 결선해 올림수(Carry) 출력 포트로 보내세요.'
  },
  {
    id: 'mission-full-adder',
    title: '미션 7: 전가산기(Full Adder) 제작',
    description: '하위 자리 올림수 Cin까지 더하는 전가산기를 만드세요. 반가산기(HA) 2개와 OR 게이트 1개를 조합하여 만들 수 있습니다. y축 정렬 순서대로 입력 A, B, Cin 및 출력 Sum, Cout을 배치하세요.',
    targetTabId: 'sub-full-adder',
    inputsRequired: ['A', 'B', 'Cin'],
    outputsRequired: ['Sum', 'Cout'],
    truthTable: [
      { inputs: [false, false, false], outputs: [false, false] },
      { inputs: [false, false, true], outputs: [true, false] },
      { inputs: [false, true, false], outputs: [true, false] },
      { inputs: [false, true, true], outputs: [false, true] },
      { inputs: [true, false, false], outputs: [true, false] },
      { inputs: [true, false, true], outputs: [false, true] },
      { inputs: [true, true, false], outputs: [false, true] },
      { inputs: [true, true, true], outputs: [true, true] }
    ],
    hint: '반가산기(HA) 2개와 OR 게이트 1개로 완성할 수 있습니다. 첫 번째 HA의 입력핀 0, 1에 A, B 포트를 결선하고, 첫 번째 HA의 Sum 출력을 두 번째 HA의 입력핀 0에, Cin 포트를 두 번째 HA의 입력핀 1에 연결합니다. 마지막으로 두 HA의 Carry 출력핀들을 OR 게이트의 입력으로 모아서 Cout 포트에 연결하고, 두 번째 HA의 Sum 출력을 Sum 포트에 직접 연결하세요.'
  },
  {
    id: 'mission-sr-latch',
    title: '미션 8: SR Latch 제작',
    description: '두 개의 NOR 게이트의 교차 피드백 구조를 통해 1비트를 기억하는 SR Latch를 완성하세요. 위에서 아래 순서대로 입력 R, S와 출력 Q, Q_bar를 배치하세요.',
    targetTabId: 'sub-sr-latch',
    inputsRequired: ['Reset (R)', 'Set (S)'],
    outputsRequired: ['Q', 'Q_bar'],
    truthTable: [
      { inputs: [true, false], outputs: [false, true] },
      { inputs: [false, false], outputs: [false, true] },
      { inputs: [false, true], outputs: [true, false] },
      { inputs: [false, false], outputs: [true, false] }
    ],
    hint: '위쪽 NOR 게이트(Q)의 입력 0에 Reset (R) 포트를 연결하고, 아래쪽 NOR 게이트(Q_bar)의 입력 1에 Set (S) 포트를 연결합니다. 위쪽 NOR 게이트의 출력을 아래쪽 NOR 게이트의 입력 0으로 공급하고, 아래쪽 NOR 게이트의 출력을 위쪽 NOR 게이트의 입력 1로 교차 피드백 결선합니다. 출력 포트 Q와 Q_bar는 각각 위아래 NOR 게이트의 출력핀과 매핑하세요.'
  },
  {
    id: 'mission-d-latch',
    title: '미션 9: Gated D Latch 제작',
    description: '클록/이네이블(CLK)이 참일 때만 입력 D를 래치하고, CLK가 거짓일 때는 출력 Q를 유지하는 D Latch를 완성하세요. 위에서 아래 순서대로 입력 D, CLK와 출력 Q, Q_bar를 배치하세요.',
    targetTabId: 'sub-d-latch',
    inputsRequired: ['D', 'CLK'],
    outputsRequired: ['Q', 'Q_bar'],
    truthTable: [
      { inputs: [true, true], outputs: [true, false] },
      { inputs: [true, false], outputs: [true, false] }, // CLK falls first
      { inputs: [false, false], outputs: [true, false] }, // D changes after CLK is low, value is held
      { inputs: [false, true], outputs: [false, true] },
      { inputs: [false, false], outputs: [false, true] }, // CLK falls first
      { inputs: [true, false], outputs: [false, true] } // D changes after CLK is low, value is held
    ],
    hint: 'D 포트와 CLK 포트를 AND 게이트에 연결합니다. 그리고 D 포트를 NOT 게이트로 반전시킨 출력과 CLK 포트를 또 다른 AND 게이트에 연결합니다. 이 두 AND 게이트의 출력을 각각 SR Latch(혹은 교차 피드백 구조)의 S, R 입력단으로 공급하면 래치가 제어됩니다. (주의: NOR 기반 SR Latch를 쓰므로, Q를 기억하는 NOR 게이트의 다른 입력에는 NOT D와 CLK을 결합한 R AND 출리가 연결되어야 합니다.)'
  },
  {
    id: 'mission-decoder',
    title: '미션 10: Instruction Decoder 제작',
    description: '2비트 명령어 OP 코드를 해독하여 각 연산 장치를 제어할 LOAD, ADD, JUMP 신호를 만드세요. OP=00 이면 LOAD, OP=10 이면 ADD, OP=01 이면 JUMP를 출력하게 설계합니다.',
    targetTabId: 'sub-decoder',
    inputsRequired: ['OP0', 'OP1'],
    outputsRequired: ['LOAD', 'ADD', 'JUMP'],
    truthTable: [
      { inputs: [false, false], outputs: [true, false, false] },
      { inputs: [true, false], outputs: [false, true, false] },
      { inputs: [false, true], outputs: [false, false, true] }
    ],
    hint: 'OP0, OP1 신호를 NOT 게이트로 반전하여 준비해 둡니다. 그 다음 AND 게이트 3개를 사용해 LOAD(NOT OP0 · NOT OP1), ADD(OP0 · NOT OP1), JUMP(NOT OP0 · OP1) 조건을 판별하고 각 출력 포트에 매핑하세요.'
  },
  {
    id: 'mission-alu-1bit',
    title: '미션 11: 1-Bit ALU 연산 장치 제작',
    description: '입력 A, B와 2비트 제어 신호 Op0, Op1을 조합해 Op=00 일 때 AND, Op=01 일 때 OR, Op=10 일 때 덧셈(HA Sum)을 수행하는 1비트 ALU를 만드세요.',
    targetTabId: 'sub-alu-1bit',
    inputsRequired: ['A', 'B', 'Op0', 'Op1'],
    outputsRequired: ['Result'],
    truthTable: [
      { inputs: [false, true, false, false], outputs: [false] },
      { inputs: [true, true, false, false], outputs: [true] },
      { inputs: [true, false, true, false], outputs: [true] },
      { inputs: [false, false, true, false], outputs: [false] },
      { inputs: [true, false, false, true], outputs: [true] },
      { inputs: [true, true, false, true], outputs: [false] }
    ],
    hint: 'AND, OR 게이트 및 Half Adder를 배치하여 A와 B의 연산 결과를 구합니다. 그 다음 2-to-1 MUX 2개를 엮어, Op0 신호로 AND/OR를 먼저 고르고 그 출력을 다시 Op1 신호로 HA Sum 결과와 비교하여 선택하게 하면 연산 장치가 완성됩니다.'
  },
  {
    id: 'mission-register-4bit',
    title: '미션 12: 4-Bit Register 메모리 제작',
    description: '4비트 데이터 입력을 클록 CLK의 HIGH 활성화 순간에 맞춰 동기화해 저장하는 4비트 레지스터를 만드세요.',
    targetTabId: 'sub-register-4bit',
    inputsRequired: ['D0', 'D1', 'D2', 'D3', 'CLK'],
    outputsRequired: ['Q0', 'Q1', 'Q2', 'Q3'],
    truthTable: [
      { inputs: [true, false, true, false, true], outputs: [true, false, true, false] },
      { inputs: [true, false, true, false, false], outputs: [true, false, true, false] }, // CLK falls first
      { inputs: [false, false, false, false, false], outputs: [true, false, true, false] } // D inputs change after CLK is low, value is held
    ],
    hint: '이전 단계에서 제작한 D Latch 커스텀 게이트 4개를 배치합니다. 입력 포트 D0~D3을 각 Latch의 D에 연결하고, CLK 포트 신호를 4개 Latch의 CLK 입력에 한꺼번에 결선해 공급하세요. Latch들의 Q 출력을 Q0~Q3 포트에 연결합니다.'
  },
  {
    id: 'mission-pc-4bit',
    title: '미션 13: 4-Bit Program Counter 제작',
    description: 'Reset 신호가 들어오면 0으로 초기화되고, CLK이 뛸 때마다 카운트 값을 1씩 증가시키는 4비트 PC의 루프 회로를 만드세요.',
    targetTabId: 'sub-pc-4bit',
    inputsRequired: ['Reset', 'CLK'],
    outputsRequired: ['PC0', 'PC1', 'PC2', 'PC3'],
    truthTable: [
      { inputs: [true, true], outputs: [false, false, false, false] }, // CLK pulse with Reset=1 registers 0000
      { inputs: [true, false], outputs: [false, false, false, false] }, // CLK falls, holds 0000
      { inputs: [false, false], outputs: [false, false, false, false] }, // Reset released, holds 0000
      { inputs: [false, true], outputs: [true, false, false, false] }, // CLK pulse increments count to 1000
      { inputs: [false, false], outputs: [true, false, false, false] }, // CLK falls, holds 1000
      { inputs: [false, true], outputs: [false, true, false, false] } // CLK pulse increments count to 0100
    ],
    hint: '4비트 레지스터(sub-register-4bit)와 가산기(Half Adder 4개 체인)를 배치합니다. 레지스터의 출력을 가산기로 공급해 1을 더한 결과를 다시 레지스터 입력으로 피드백하세요. Reset 신호 활성화 시 입력을 0으로 강제하는 AND 게이트(NOT Reset과 결합)를 피드백 루프 중간에 설치합니다.'
  },
  {
    id: 'mission-cpu-4bit',
    title: '미션 14: 4-Bit CPU 데이터패스 완성',
    description: 'PC, Instruction Decoder, Register, ALU를 한데 통합하여 명령어 루프를 주기적으로 수행하는 대망의 4비트 CPU 회로를 완성하세요.',
    targetTabId: 'sub-cpu-4bit',
    inputsRequired: ['Reset', 'CLK'],
    outputsRequired: ['Out0', 'Out1', 'Out2', 'Out3'],
    truthTable: [
      { inputs: [true, true], outputs: [false, false, false, false] }, // CLK pulse with Reset=1 registers 0000
      { inputs: [true, false], outputs: [false, false, false, false] }, // CLK falls, holds 0000
      { inputs: [false, false], outputs: [false, false, false, false] }, // Reset released, holds 0000
      { inputs: [false, true], outputs: [true, false, false, false] }, // CLK pulse increments count to 1000
      { inputs: [false, false], outputs: [true, false, false, false] }, // CLK falls, holds 1000
      { inputs: [false, true], outputs: [false, true, false, false] } // CLK pulse increments count to 0100
    ],
    hint: 'CPU 캔버스에 그동안 제작한 PC, Decoder, Register, ALU 컴포넌트를 배치합니다. PC 출력을 Decoder의 입력(명령어 해독)으로 보내고, Decoder의 제어선(LOAD)으로 Register의 쓰기를 활성화하세요. PC 출력을 데이터로서 Register와 ALU에 연결해 순차 제어를 완수하면 CPU가 구동됩니다.'
  }
];

function sanitizeNode(node: Node): Node {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    x: node.x,
    y: node.y,
    inputs: node.inputs,
    outputs: node.outputs,
    customGateId: node.customGateId,
    width: node.width,
    height: node.height,
    clockInterval: node.clockInterval,
    clockState: node.clockState,
    label: node.label,
  };
}

function sanitizeCircuitState(state: CircuitState): CircuitState {
  return {
    nodes: state.nodes.map(sanitizeNode),
    connections: state.connections,
  };
}

function sanitizeRecord(record: Record<string, CircuitState>): Record<string, CircuitState> {
  const clean: Record<string, CircuitState> = {};
  for (const key in record) {
    if (record[key]) {
      clean[key] = sanitizeCircuitState(record[key]);
    }
  }
  return clean;
}

function sanitizeCustomGates(record: Record<string, SubCircuitDefinition>): Record<string, SubCircuitDefinition> {
  const clean: Record<string, SubCircuitDefinition> = {};
  for (const key in record) {
    if (record[key]) {
      clean[key] = {
        ...record[key],
        nodes: record[key].nodes.map(sanitizeNode),
      };
    }
  }
  return clean;
}

export function useCircuitState() {
  const location = useLocation();
  const navigate = useNavigate();
  const curriculumMatch = useMatch('/curriculum/:missionId');

  const appMode = location.pathname.startsWith('/curriculum') ? 'curriculum' : 'sandbox';
  const activeMissionId = curriculumMatch?.params.missionId || null;

  const setAppMode = useCallback((mode: 'sandbox' | 'curriculum') => {
    if (mode === 'sandbox') {
      navigate('/sandbox');
    } else {
      const defaultMissionId = activeMissionId || 'mission-nand';
      navigate(`/curriculum/${defaultMissionId}`);
    }
  }, [navigate, activeMissionId]);

  const setActiveMissionId = useCallback((id: string | null) => {
    if (id) {
      navigate(`/curriculum/${id}`);
    } else {
      navigate('/curriculum');
    }
  }, [navigate]);

  // Dynamic route redirection for root paths
  useEffect(() => {
    if (location.pathname === '/curriculum' || location.pathname === '/curriculum/') {
      navigate('/curriculum/mission-nand', { replace: true });
    } else if (location.pathname === '/' || location.pathname === '') {
      navigate('/sandbox', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Tabs & Custom Gates
  const [tabs, setTabs] = useState<Tab[]>(DEMO_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [customGates, setCustomGates] = useState<Record<string, SubCircuitDefinition>>(DEMO_CUSTOM_GATES);
  const [curriculumCustomGates, setCurriculumCustomGates] = useState<Record<string, SubCircuitDefinition>>(() => {
    try {
      const saved = localStorage.getItem('curriculumCustomGates');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeCustomGates = appMode === 'curriculum'
    ? DEMO_CUSTOM_GATES
    : customGates;

  // Curriculum Mode States
  const [completedMissions, setCompletedMissions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('completedMissions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Curriculum Canvas States (Keeps empty/work in progress states separate from solved sandbox tabs)
  const [missionStates, setMissionStates] = useState<Record<string, CircuitState>>(() => {
    try {
      const saved = localStorage.getItem('missionStates');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Canvas Interactions
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds[0] || null;
  const setSelectedNodeId = useCallback((id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  }, []);
  const [copiedNode, setCopiedNode] = useState<Node | null>(null);
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);

  // Teenage Engineering theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  // Waveform logic analyzer states
  const [probedNodeIds, setProbedNodeIds] = useState<string[]>([]);
  const [waveformHistory, setWaveformHistory] = useState<Record<string, boolean[]>>({});

  const toggleProbeNode = useCallback((nodeId: string) => {
    setProbedNodeIds((prev) => {
      if (prev.includes(nodeId)) {
        const next = prev.filter((id) => id !== nodeId);
        setWaveformHistory((history) => {
          const nextHistory = { ...history };
          delete nextHistory[nodeId];
          return nextHistory;
        });
        return next;
      } else {
        return [...prev, nodeId];
      }
    });
  }, []);

  const probeNodesBulk = useCallback((nodeIds: string[], forceProbe?: boolean) => {
    setProbedNodeIds((prev) => {
      const currentlyProbed = nodeIds.filter(id => prev.includes(id));
      const shouldAdd = forceProbe !== undefined ? forceProbe : (currentlyProbed.length < nodeIds.length);

      if (shouldAdd) {
        const toAdd = nodeIds.filter(id => !prev.includes(id));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      } else {
        const next = prev.filter(id => !nodeIds.includes(id));
        setWaveformHistory((history) => {
          const nextHistory = { ...history };
          nodeIds.forEach(id => {
            delete nextHistory[id];
          });
          return nextHistory;
        });
        return next;
      }
    });
  }, []);

  const clearWaveformHistory = useCallback(() => {
    setWaveformHistory({});
  }, []);
  
  // Undo/Redo Stacks (Saves full tabs and customGates states)
  const [undoStack, setUndoStack] = useState<{ tabs: Tab[]; customGates: Record<string, SubCircuitDefinition> }[]>([]);
  const [redoStack, setRedoStack] = useState<{ tabs: Tab[]; customGates: Record<string, SubCircuitDefinition> }[]>([]);

  // Simulation Controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [debugQueue, setDebugQueue] = useState<{ pinId: string; value: boolean }[]>([]);
  const [stepCount, setStepCount] = useState<number>(0);
  const [oscillationError, setOscillationError] = useState<boolean>(false);

  // Wire Drawing States
  const [wireDraft, setWireDraft] = useState<{ fromPinId: string; currentX: number; currentY: number } | null>(null);

  // Active Tab State Helper
  const activeTab = (() => {
    if (appMode === 'curriculum' && activeMissionId) {
      const mission = MISSIONS.find(m => m.id === activeMissionId);
      const mState = missionStates[activeMissionId] || { nodes: [], connections: [] };
      return {
        id: mission?.targetTabId || 'curriculum-temp',
        name: mission?.title || 'Curriculum Task',
        state: mState
      };
    }
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  })();
  const { nodes, connections } = activeTab.state;

  // Keep nodes ref updated to prevent logic analyzer interval resets
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Update waveform history
  useEffect(() => {
    if (probedNodeIds.length === 0 || !isSimulating) return;
    const interval = setInterval(() => {
      setWaveformHistory((prev) => {
        const next = { ...prev };
        probedNodeIds.forEach((id) => {
          const node = nodesRef.current.find((n) => n.id === id);
          let val = false;
          if (node) {
            if (node.outputs[0]) {
              val = node.outputs[0].value;
            } else if (node.inputs[0]) {
              val = node.inputs[0].value;
            }
          }
          const history = next[id] || [];
          next[id] = [...history, val].slice(-100); // Keep last 100 samples
        });
        return next;
      });
    }, 50); // Run analyzer at 50ms sampling rate (immune to aliasing for 100ms clock)
    return () => clearInterval(interval);
  }, [probedNodeIds, isSimulating]);

  // Auto-initialize empty mission ports when starting a mission
  useEffect(() => {
    if (appMode === 'curriculum' && activeMissionId) {
      setMissionStates((prev) => {
        if (prev[activeMissionId] && prev[activeMissionId].nodes.length > 0) {
          return prev;
        }
        
        const mission = MISSIONS.find(m => m.id === activeMissionId);
        if (!mission) return prev;
        
        const portInNodes = mission.inputsRequired.map((name, idx) => 
          createDemoNode(`${mission.targetTabId}-in-${idx}-${Date.now()}`, 'PORT_IN', 'IN PORT', 80, 80 + idx * 120, 0, 1, undefined, name)
        );
        
        const portOutNodes = mission.outputsRequired.map((name, idx) => 
          createDemoNode(`${mission.targetTabId}-out-${idx}-${Date.now()}`, 'PORT_OUT', 'OUT PORT', 600, 80 + idx * 120, 1, 0, undefined, name)
        );
        
        const nextState: CircuitState = {
          nodes: [...portInNodes, ...portOutNodes],
          connections: []
        };
        
        const next = { ...prev, [activeMissionId]: nextState };
        localStorage.setItem('missionStates', JSON.stringify(sanitizeRecord(next)));
        return next;
      });
    }
  }, [appMode, activeMissionId]);

  // Save state to undo stack
  const saveHistory = useCallback((currentTabs = tabs, currentCustomGates = customGates) => {
    // Save deep copies
    setUndoStack((prev) => [
      ...prev,
      {
        tabs: JSON.parse(JSON.stringify(currentTabs)),
        customGates: JSON.parse(JSON.stringify(currentCustomGates)),
      },
    ]);
    setRedoStack([]); // Clear redo stack on new action
  }, [tabs, customGates]);

  // Undo Function
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [
      ...prev,
      {
        tabs: JSON.parse(JSON.stringify(tabs)),
        customGates: JSON.parse(JSON.stringify(customGates)),
      },
    ]);
    setTabs(previous.tabs);
    setCustomGates(previous.customGates);
    setSelectedNodeId(null);
  }, [undoStack, tabs, customGates]);

  // Redo Function
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [
      ...prev,
      {
        tabs: JSON.parse(JSON.stringify(tabs)),
        customGates: JSON.parse(JSON.stringify(customGates)),
      },
    ]);
    setTabs(next.tabs);
    setCustomGates(next.customGates);
    setSelectedNodeId(null);
  }, [redoStack, tabs, customGates]);

  // Toggle Pin Labels visibility
  const toggleShowPinLabels = useCallback(() => {
    setShowPinLabels((prev) => !prev);
  }, []);



  // Modify active tab circuit state helper
  const updateActiveCircuitState = useCallback((updater: (state: CircuitState) => CircuitState) => {
    if (appMode === 'curriculum' && activeMissionId) {
      setMissionStates((prev) => {
        const currState = prev[activeMissionId] || { nodes: [], connections: [] };
        const nextState = updater(currState);
        const next = { ...prev, [activeMissionId]: nextState };
        localStorage.setItem('missionStates', JSON.stringify(sanitizeRecord(next)));
        return next;
      });
    } else {
      setTabs((prevTabs) => {
        const nextTabs = prevTabs.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              state: updater(t.state),
            };
          }
          return t;
        });
        return nextTabs;
      });
    }
  }, [appMode, activeMissionId, activeTabId]);

  // Generate Unique Pin IDs
  const createPinId = (nodeId: string, pinType: 'in' | 'out', index: number) => {
    return `${nodeId}-${pinType}-${index}`;
  };

  // Add Node to Active Circuit
  const addNode = useCallback((type: NodeType, x: number, y: number, customGateId?: string) => {
    saveHistory();

    const nodeId = `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let inputCount = 2;
    let outputCount = 1;
    let name: string = type;

    // Adjust pins based on type
    if (type === 'NOT') {
      inputCount = 1;
    } else if (type === 'SWITCH' || type === 'BUTTON' || type === 'CLOCK') {
      inputCount = 0;
      outputCount = 1;
    } else if (type === 'LED') {
      inputCount = 1;
      outputCount = 0;
    } else if (type === 'PORT_IN') {
      inputCount = 0;
      outputCount = 1;
      name = 'IN PORT';
    } else if (type === 'PORT_OUT') {
      inputCount = 1;
      outputCount = 0;
      name = 'OUT PORT';
    } else if (type === 'CUSTOM' && customGateId && activeCustomGates[customGateId]) {
      const def = activeCustomGates[customGateId];
      name = def.name;
      inputCount = def.nodes.filter((n) => n.type === 'PORT_IN').length;
      outputCount = def.nodes.filter((n) => n.type === 'PORT_OUT').length;
    }

    const inputs: Pin[] = Array.from({ length: inputCount }, (_, i) => ({
      id: createPinId(nodeId, 'in', i),
      nodeId,
      type: 'input',
      index: i,
      value: false,
    }));

    const outputs: Pin[] = Array.from({ length: outputCount }, (_, i) => ({
      id: createPinId(nodeId, 'out', i),
      nodeId,
      type: 'output',
      index: i,
      value: false,
    }));

    const newNode: Node = {
      id: nodeId,
      type,
      name,
      x,
      y,
      inputs,
      outputs,
      customGateId,
      clockInterval: type === 'CLOCK' ? 1000 : undefined,
      clockState: type === 'CLOCK' ? false : undefined,
    };

    updateActiveCircuitState((prev) => ({
      nodes: [...prev.nodes, newNode],
      connections: prev.connections,
    }));

    setSelectedNodeId(nodeId);
  }, [saveHistory, activeCustomGates, updateActiveCircuitState]);

  // Update Node position
  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Update multiple Nodes positions (for group dragging)
  const moveNodes = useCallback((updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => {
        const update = updateMap.get(n.id);
        return update ? { ...n, x: update.x, y: update.y } : n;
      }),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Resize Node
  const resizeNode = useCallback((nodeId: string, width: number, height: number) => {
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, width, height } : n)),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Delete Node and all its connections
  const deleteNode = useCallback((nodeId: string) => {
    saveHistory();
    updateActiveCircuitState((prev) => {
      // Delete multiple nodes if the target node is part of the selection group, else delete just that node
      const idsToDelete = new Set(selectedNodeIds.includes(nodeId) ? selectedNodeIds : [nodeId]);

      const pinIds = new Set<string>();
      prev.nodes.forEach((n) => {
        if (idsToDelete.has(n.id)) {
          n.inputs.forEach((p) => pinIds.add(p.id));
          n.outputs.forEach((p) => pinIds.add(p.id));
        }
      });

      const nextConnections = prev.connections.filter(
        (c) => !pinIds.has(c.fromPinId) && !pinIds.has(c.toPinId)
      );

      return {
        nodes: prev.nodes.filter((n) => !idsToDelete.has(n.id)),
        connections: nextConnections,
      };
    });

    setSelectedNodeIds((prev) => {
      const idsToDelete = new Set(selectedNodeIds.includes(nodeId) ? selectedNodeIds : [nodeId]);
      return prev.filter((id) => !idsToDelete.has(id));
    });
  }, [saveHistory, selectedNodeIds, updateActiveCircuitState]);

  // Copy Selected Node
  const copySelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const nodeToCopy = activeTab.state.nodes.find((n) => n.id === selectedNodeId);
    if (nodeToCopy) {
      setCopiedNode(nodeToCopy);
    }
  }, [selectedNodeId, activeTab]);

  // Paste Node
  const pasteNode = useCallback(() => {
    if (!copiedNode) return;
    saveHistory();

    const newNodeId = `${copiedNode.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const inputs: Pin[] = copiedNode.inputs.map((_, i) => ({
      id: `${newNodeId}-in-${i}`,
      nodeId: newNodeId,
      type: 'input',
      index: i,
      value: false,
    }));

    const outputs: Pin[] = copiedNode.outputs.map((_, i) => ({
      id: `${newNodeId}-out-${i}`,
      nodeId: newNodeId,
      type: 'output',
      index: i,
      value: false,
    }));

    const newNode: Node = {
      ...copiedNode,
      id: newNodeId,
      x: copiedNode.x + 40,
      y: copiedNode.y + 40,
      inputs,
      outputs,
    };

    updateActiveCircuitState((prev) => ({
      nodes: [...prev.nodes, newNode],
      connections: prev.connections,
    }));

    setSelectedNodeId(newNodeId);
  }, [copiedNode, saveHistory, updateActiveCircuitState]);

  // Keyboard shortcut listener (Undo, Redo, Copy, Paste, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return; // Skip when user is typing in inspector or fields
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      if (isCtrl && (key === 'z' || code === 'keyz')) {
        e.preventDefault();
        undo();
      } else if (isCtrl && (key === 'y' || code === 'keyy')) {
        e.preventDefault();
        redo();
      } else if (isCtrl && (key === 'c' || code === 'keyc')) {
        e.preventDefault();
        copySelectedNode();
      } else if (isCtrl && (key === 'v' || code === 'keyv')) {
        e.preventDefault();
        pasteNode();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelectedNode, pasteNode, selectedNodeId, deleteNode]);

  // Connect Pins
  const connectPins = useCallback((fromPinId: string, toPinId: string) => {
    saveHistory();
    updateActiveCircuitState((prev) => {
      // Find source and target pins to validate they exist and are correct types
      let fromPin: Pin | undefined;
      let toPin: Pin | undefined;

      for (const node of prev.nodes) {
        const outPin = node.outputs.find((p) => p.id === fromPinId);
        if (outPin) fromPin = outPin;
        const inPin = node.inputs.find((p) => p.id === toPinId);
        if (inPin) toPin = inPin;
      }

      if (!fromPin || !toPin) return prev; // Invalid pins

      // Prevent circular loops on same node
      if (fromPin.nodeId === toPin.nodeId) return prev;

      // Prevent multiple connections to the same input pin
      const filteredConnections = prev.connections.filter((c) => c.toPinId !== toPinId);

      const newConn: Connection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fromPinId,
        toPinId,
      };

      return {
        nodes: prev.nodes,
        connections: [...filteredConnections, newConn],
      };
    });
  }, [saveHistory, updateActiveCircuitState]);

  // Delete Connection
  const deleteConnection = useCallback((connId: string) => {
    saveHistory();
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes,
      connections: prev.connections.filter((c) => c.id !== connId),
    }));
  }, [saveHistory, updateActiveCircuitState]);

  // Toggle Switch state (input toggle)
  const toggleSwitch = useCallback((nodeId: string) => {
    updateActiveCircuitState((prev) => {
      const nextNodes = prev.nodes.map((n) => {
        if (n.id === nodeId && (n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'PORT_IN')) {
          const nextOutputs = n.outputs.map((p) => ({ ...p, value: !p.value }));
          return { ...n, outputs: nextOutputs };
        }
        return n;
      });
      return { nodes: nextNodes, connections: prev.connections };
    });
  }, [updateActiveCircuitState]);

  // Button state toggle helper (press/release)
  const setButtonState = useCallback((nodeId: string, pressed: boolean) => {
    updateActiveCircuitState((prev) => {
      const nextNodes = prev.nodes.map((n) => {
        if (n.id === nodeId && n.type === 'BUTTON') {
          const nextOutputs = n.outputs.map((p) => ({ ...p, value: pressed }));
          return { ...n, outputs: nextOutputs };
        }
        return n;
      });
      return { nodes: nextNodes, connections: prev.connections };
    });
  }, [updateActiveCircuitState]);

  // Modify Node Label
  const setNodeLabel = useCallback((nodeId: string, label: string) => {
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Modify Clock Interval
  const setClockInterval = useCallback((nodeId: string, interval: number) => {
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, clockInterval: interval } : n)),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Add custom sub-circuit tab
  const createSubCircuitTab = useCallback((name: string) => {
    saveHistory();
    const subId = `sub-${Date.now()}`;
    setTabs((prev) => [
      ...prev,
      {
        id: subId,
        name,
        state: { nodes: [], connections: [] },
      },
    ]);
    setActiveTabId(subId);
    setTransform(INITIAL_TRANSFORM);
    setSelectedNodeId(null);
    return subId;
  }, [saveHistory]);

  // Close / Delete SubCircuit Tab
  const deleteSubCircuitTab = useCallback((tabId: string) => {
    if (tabId === 'main') return;
    saveHistory();
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTabId('main');
    setTransform(INITIAL_TRANSFORM);
    setSelectedNodeId(null);
  }, [saveHistory]);

  // Create Custom Gate definition from current sub-circuit tab
  const convertTabToCustomGate = useCallback((tabId: string, name: string, color: string) => {
    const tabToConvert = tabs.find((t) => t.id === tabId);
    if (!tabToConvert || tabId === 'main') return;

    // Verify it has ports
    const portIns = tabToConvert.state.nodes.filter((n) => n.type === 'PORT_IN');
    const portOuts = tabToConvert.state.nodes.filter((n) => n.type === 'PORT_OUT');

    if (portIns.length === 0 && portOuts.length === 0) {
      alert("A sub-circuit must have at least one Input Port or Output Port to be packaged as a custom gate.");
      return;
    }

    saveHistory();
    
    // Define the custom sub-circuit definition
    const newDef: SubCircuitDefinition = {
      id: tabId,
      name,
      color,
      nodes: JSON.parse(JSON.stringify(tabToConvert.state.nodes)),
      connections: JSON.parse(JSON.stringify(tabToConvert.state.connections)),
    };

    setCustomGates((prev) => ({
      ...prev,
      [tabId]: newDef,
    }));

    // Alert completion
    alert(`Custom Gate "${name}" created successfully and added to toolbox!`);
  }, [tabs, saveHistory]);

  // Clear Canvas
  const clearCanvas = useCallback(() => {
    saveHistory();
    updateActiveCircuitState(() => ({ nodes: [], connections: [] }));
    setSelectedNodeId(null);
  }, [saveHistory, updateActiveCircuitState]);

  // Export circuit as JSON file
  const exportCircuitJSON = useCallback(() => {
    const data = {
      version: '1.0',
      tabs,
      customGates,
    };
    return JSON.stringify(data, null, 2);
  }, [tabs, customGates]);

  // Import circuit from JSON data
  const importCircuitJSON = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.tabs && parsed.customGates) {
        saveHistory();
        setTabs(parsed.tabs);
        setCustomGates(parsed.customGates);
        setActiveTabId('main');
        setTransform(INITIAL_TRANSFORM);
        setSelectedNodeId(null);
        setStepCount(0);
        setOscillationError(false);
      } else {
        alert('Invalid circuit file format.');
      }
    } catch (e) {
      alert('Failed to parse circuit JSON file.');
    }
  }, [saveHistory]);

  // SIMULATION EXECUTION LOOP (REAL-TIME STATE PROPAGATION)
  useEffect(() => {
    if (!isSimulating) return;

    // Timer for evaluating clock nodes and inputs in real time
    const interval = setInterval(() => {
      // Find clock nodes in active tab that need ticking
      const now = Date.now();

      updateActiveCircuitState((prevCircuit) => {
        let changed = false;
        const nextNodes = prevCircuit.nodes.map((node) => {
          if (node.type === 'CLOCK') {
            const intervalTime = node.clockInterval || 1000;
            // Determine ticks based on current time
            const shouldToggle = Math.floor(now / intervalTime) % 2 === 1;
            const outputPin = node.outputs[0];
            if (outputPin && outputPin.value !== shouldToggle) {
              outputPin.value = shouldToggle;
              changed = true;
            }
          }
          return node;
        });

        if (changed) {
          return { nodes: nextNodes, connections: prevCircuit.connections };
        }
        return prevCircuit;
      });

      // Regular full simulation run to stabilize values in the active circuit
      updateActiveCircuitState((prevCircuit) => {
        // Collect all outputs and evaluate downstream values
        const queue: { pinId: string; value: boolean }[] = [];
        
        // Add sources (Switches, Clocks, buttons) outputs to queue
        prevCircuit.nodes.forEach((n) => {
          if (n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'CLOCK' || n.type === 'PORT_IN') {
            if (n.outputs[0]) {
              queue.push({ pinId: n.outputs[0].id, value: n.outputs[0].value });
            }
          }
        });

        // Run propagation to resolve states
        const simResult = runSimulationFull(prevCircuit, queue, activeCustomGates, 1000);
        
        if (simResult.oscillated !== oscillationError) {
          setOscillationError(simResult.oscillated);
        }
        
        if (simResult.iterations > 0) {
          setStepCount((s) => s + simResult.iterations);
        }

        return simResult.state;
      });

    }, 1000 / 30); // Run propagation cycles at 30Hz

    return () => clearInterval(interval);
  }, [isSimulating, updateActiveCircuitState, activeCustomGates, oscillationError]);

  // Curriculum Verification logic
  const verifyCurrentMission = useCallback((): { success: boolean; message: string } => {
    const mission = MISSIONS.find(m => m.id === activeMissionId);
    if (!mission) {
      return { success: false, message: '활성화된 미션이 없습니다.' };
    }

    if (activeTabId !== mission.targetTabId) {
      const targetTab = tabs.find(t => t.id === mission.targetTabId);
      return { 
        success: false, 
        message: `검증하려면 '${targetTab?.name || mission.title}' 탭으로 이동해야 합니다.` 
      };
    }

    const state = appMode === 'curriculum' 
      ? (missionStates[activeMissionId!] || { nodes: [], connections: [] })
      : activeTab.state;
    
    const rawPortIns = [...state.nodes].filter((n) => n.type === 'PORT_IN');
    const rawPortOuts = [...state.nodes].filter((n) => n.type === 'PORT_OUT');

    if (rawPortIns.length !== mission.inputsRequired.length) {
      return {
        success: false,
        message: `입력 포트 개수가 일치하지 않습니다. (필요: ${mission.inputsRequired.length}개 [${mission.inputsRequired.join(', ')}], 현재: ${rawPortIns.length}개)`
      };
    }

    if (rawPortOuts.length !== mission.outputsRequired.length) {
      return {
        success: false,
        message: `출력 포트 개수가 일치하지 않습니다. (필요: ${mission.outputsRequired.length}개 [${mission.outputsRequired.join(', ')}], 현재: ${rawPortOuts.length}개)`
      };
    }

    // Helper to normalize label/name for robust comparison
    const normalizeName = (s: string) => {
      if (!s) return '';
      return s.replace(/\s+/g, '')
              .toLowerCase()
              .replace(/\([^)]*\)/g, '')
              .replace(/[_-]/g, '');
    };

    // Match inputs by label first, fallback to y-coordinate sorting if any are missing
    let portIns: Node[] = [];
    let inputMappingSuccess = true;
    for (const reqName of mission.inputsRequired) {
      const targetNorm = normalizeName(reqName);
      const matched = rawPortIns.find((n) => {
        const nodeNormLabel = normalizeName(n.label || '');
        const nodeNormName = normalizeName(n.name || '');
        return nodeNormLabel === targetNorm || nodeNormName === targetNorm;
      });
      if (matched) {
        portIns.push(matched);
      } else {
        inputMappingSuccess = false;
        break;
      }
    }

    if (!inputMappingSuccess || portIns.length !== mission.inputsRequired.length) {
      portIns = [...rawPortIns].sort((a, b) => a.y - b.y || a.x - b.x);
    }

    // Match outputs by label first, fallback to y-coordinate sorting if any are missing
    let portOuts: Node[] = [];
    let outputMappingSuccess = true;
    for (const reqName of mission.outputsRequired) {
      const targetNorm = normalizeName(reqName);
      const matched = rawPortOuts.find((n) => {
        const nodeNormLabel = normalizeName(n.label || '');
        const nodeNormName = normalizeName(n.name || '');
        return nodeNormLabel === targetNorm || nodeNormName === targetNorm;
      });
      if (matched) {
        portOuts.push(matched);
      } else {
        outputMappingSuccess = false;
        break;
      }
    }

    if (!outputMappingSuccess || portOuts.length !== mission.outputsRequired.length) {
      portOuts = [...rawPortOuts].sort((a, b) => a.y - b.y || a.x - b.x);
    }

    // Sequentially evaluate the truth table to preserve internal states (latch support)
    let runningCircuitState = JSON.parse(JSON.stringify(state)) as CircuitState;

    // Clear all runtime simulation variables to ensure a clean slate
    runningCircuitState.nodes.forEach((n) => {
      delete n.prevClk;
      delete n.latchedOutputs;
      delete n.subState;
    });

    // Stabilization/Setup Phase: Set initial inputs but force CLK to false so combinational paths settle first
    const firstRow = mission.truthTable[0];
    if (firstRow) {
      portIns.forEach((portNode, idx) => {
        const liveNode = runningCircuitState.nodes.find(n => n.id === portNode.id);
        if (liveNode && liveNode.outputs[0]) {
          const isClkPort = normalizeName(mission.inputsRequired[idx]) === 'clk';
          liveNode.outputs[0].value = isClkPort ? false : firstRow.inputs[idx];
        }
      });

      const setupQueue: { pinId: string; value: boolean }[] = [];
      runningCircuitState.nodes.forEach((n) => {
        n.outputs.forEach((pin) => {
          let val = pin.value;
          if (n.type === 'SWITCH') {
            val = true;
            pin.value = true;
          }
          setupQueue.push({ pinId: pin.id, value: val });
        });
      });

      const setupResult = runSimulationFull(runningCircuitState, setupQueue, DEMO_CUSTOM_GATES, 1000);
      runningCircuitState = setupResult.state;
    }

    for (let rowIndex = 0; rowIndex < mission.truthTable.length; rowIndex++) {
      const row = mission.truthTable[rowIndex];
      
      // Inject inputs
      portIns.forEach((portNode, idx) => {
        const liveNode = runningCircuitState.nodes.find(n => n.id === portNode.id);
        if (liveNode && liveNode.outputs[0]) {
          liveNode.outputs[0].value = row.inputs[idx];
        }
      });

      // Prepare propagation queue
      const queue: { pinId: string; value: boolean }[] = [];
      if (rowIndex === 0) {
        // On the first step, queue ALL outputs of ALL nodes to force initial propagation of all gates
        runningCircuitState.nodes.forEach((n) => {
          n.outputs.forEach((pin) => {
            let val = pin.value;
            if (n.type === 'SWITCH') {
              val = true;
              pin.value = true;
            }
            queue.push({ pinId: pin.id, value: val });
          });
        });
      } else {
        runningCircuitState.nodes.forEach((n) => {
          if (n.type === 'PORT_IN' || n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'CLOCK') {
            if (n.outputs[0]) {
              const val = n.type === 'SWITCH' ? true : n.outputs[0].value;
              n.outputs[0].value = val;
              queue.push({ pinId: n.outputs[0].id, value: val });
            }
          }
        });
      }

      // Execute simulation until stable
      const result = runSimulationFull(runningCircuitState, queue, DEMO_CUSTOM_GATES, 1000);
      if (result.oscillated) {
        return {
          success: false,
          message: `테스트 단계 ${rowIndex + 1}에서 발진(Oscillation)이 감지되었습니다. 피드백 결선을 검토해 주세요.`
        };
      }

      runningCircuitState = result.state;

      // Extract and check outputs matching the resolved portOuts order
      const livePortOuts = portOuts.map((portNode) => {
        return runningCircuitState.nodes.find((n) => n.id === portNode.id);
      }).filter((n): n is Node => !!n);

      for (let outIdx = 0; outIdx < mission.outputsRequired.length; outIdx++) {
        const actualVal = livePortOuts[outIdx]?.inputs[0]?.value ?? false;
        const expectedVal = row.outputs[outIdx];
        
        let isCorrect = actualVal === expectedVal;
        
        // Special check for Mission 14 (CPU Datapath) Step 6 (rowIndex 5)
        // Allow either PC-connected design (Out0=0, Out1=1, Out2=0, Out3=0)
        // or Accumulator-connected design (Out0=1, Out1=0, Out2=0, Out3=0)
        if (mission.id === 'mission-cpu-4bit' && rowIndex === 5) {
          const accOutputs = [true, false, false, false];
          if (actualVal === accOutputs[outIdx]) {
            isCorrect = true;
          }
        }

        if (!isCorrect) {
          const inputStr = row.inputs.map((v, i) => `${mission.inputsRequired[i]}=${v ? '1' : '0'}`).join(', ');
          const expectedStr = row.outputs.map((v, i) => `${mission.outputsRequired[i]}=${v ? '1' : '0'}`).join(', ');
          const actualStr = livePortOuts.map((n, i) => {
            const outName = mission.outputsRequired[i];
            const val = n.inputs[0]?.value ?? false;
            return `${outName}=${val ? '1' : '0'}`;
          }).join(', ');

          return {
            success: false,
            message: `검증 실패! 입력 조건 [${inputStr}] 일 때,\n기대 출력: [${expectedStr}]\n실제 출력: [${actualStr}]\n회로 설계를 다시 한번 확인해 보세요.`
          };
        }
      }
    }

    // Success: Mark completed
    setCompletedMissions(prev => {
      if (prev.includes(activeMissionId!)) return prev;
      const next = [...prev, activeMissionId!];
      localStorage.setItem('completedMissions', JSON.stringify(next));
      return next;
    });

    // Success: Package user design into curriculumCustomGates
    if (mission) {
      const state = appMode === 'curriculum'
        ? (missionStates[activeMissionId!] || { nodes: [], connections: [] })
        : activeTab.state;
      const cleanState = JSON.parse(JSON.stringify(state)) as CircuitState;
      const color = DEMO_CUSTOM_GATES[mission.targetTabId]?.color || '#9E00FF';
      const name = mission.targetTabId.replace('sub-', '').toUpperCase().replace(/-/g, '_'); // e.g. NAND_GATE
      
      const newDef: SubCircuitDefinition = {
        id: mission.targetTabId,
        name,
        color,
        nodes: cleanState.nodes,
        connections: cleanState.connections,
      };
      
      setCurriculumCustomGates(prev => {
        const next = { ...prev, [mission.targetTabId]: newDef };
        localStorage.setItem('curriculumCustomGates', JSON.stringify(sanitizeCustomGates(next)));
        return next;
      });
    }

    return {
      success: true,
      message: `축하합니다! '${mission?.title}' 미션을 성공적으로 클리어했습니다! 🎉 다음 단계로 넘어가보세요.`
    };
  }, [activeMissionId, appMode, missionStates, activeTab.state, activeCustomGates]);

  const resetMissionTab = useCallback((missionId: string) => {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) return;
    
    saveHistory();
    
    // Create new ports clean
    const portInNodes = mission.inputsRequired.map((name, idx) => 
      createDemoNode(`${mission.targetTabId}-in-${idx}-${Date.now()}`, 'PORT_IN', 'IN PORT', 80, 80 + idx * 120, 0, 1, undefined, name)
    );
    
    const portOutNodes = mission.outputsRequired.map((name, idx) => 
      createDemoNode(`${mission.targetTabId}-out-${idx}-${Date.now()}`, 'PORT_OUT', 'OUT PORT', 600, 80 + idx * 120, 1, 0, undefined, name)
    );
    
    const nextState: CircuitState = {
      nodes: [...portInNodes, ...portOutNodes],
      connections: []
    };
    
    if (appMode === 'curriculum') {
      setMissionStates(prev => {
        const next = { ...prev, [missionId]: nextState };
        localStorage.setItem('missionStates', JSON.stringify(sanitizeRecord(next)));
        return next;
      });
    } else {
      setTabs(prev => prev.map(t => {
        if (t.id === mission.targetTabId) {
          return {
            ...t,
            state: nextState
          };
        }
        return t;
      }));
    }
    
    setSelectedNodeId(null);
  }, [saveHistory, appMode]);

  const loadMissionSolution = useCallback((missionId: string) => {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) return;
    
    const preset = DEMO_CUSTOM_GATES[mission.targetTabId];
    if (!preset) return;
    
    saveHistory();
    
    const nextState: CircuitState = {
      nodes: JSON.parse(JSON.stringify(preset.nodes)),
      connections: JSON.parse(JSON.stringify(preset.connections))
    };
    
    if (appMode === 'curriculum') {
      setMissionStates(prev => {
        const next = { ...prev, [missionId]: nextState };
        localStorage.setItem('missionStates', JSON.stringify(sanitizeRecord(next)));
        return next;
      });
    } else {
      setTabs(prev => prev.map(t => {
        if (t.id === mission.targetTabId) {
          return {
            ...t,
            state: nextState
          };
        }
        return t;
      }));
    }
    
    setSelectedNodeId(null);
  }, [saveHistory, appMode]);

  // STEP-BY-STEP PROPAGATION ACTION
  const stepSimulation = useCallback(() => {
    let activeQueue = [...debugQueue];
    let nextNodes = [...nodes];
    const isNewCycle = activeQueue.length === 0;

    if (isNewCycle) {
      // 1. Calculate virtual time step based on the minimum clock interval
      const clocks = nodes.filter((n) => n.type === 'CLOCK');
      const T_step = clocks.length > 0 
        ? Math.min(...clocks.map((c) => c.clockInterval || 1000)) 
        : 500;
      const N = Math.max(1, Math.round(T_step / 50));

      // 2. Append N samples of the current stable state to the waveform history
      if (probedNodeIds.length > 0) {
        setWaveformHistory((prev) => {
          const next = { ...prev };
          probedNodeIds.forEach((id) => {
            const node = nodes.find((n) => n.id === id);
            let val = false;
            if (node) {
              if (node.outputs[0]) {
                val = node.outputs[0].value;
              } else if (node.inputs[0]) {
                val = node.inputs[0].value;
              }
            }
            const history = next[id] || [];
            const newSamples = Array(N).fill(val);
            next[id] = [...history, ...newSamples].slice(-100);
          });
          return next;
        });
      }

      // 3. Toggle all CLOCK nodes to start a new propagation cycle
      nextNodes = nodes.map((n) => {
        if (n.type === 'CLOCK') {
          const outPin = n.outputs[0];
          if (outPin) {
            return {
              ...n,
              outputs: [
                {
                  ...outPin,
                  value: !outPin.value, // Toggle the output value of the clock
                }
              ]
            };
          }
        }
        return n;
      });

      // Populate queue with updated clock outputs and existing switch/button outputs
      nextNodes.forEach((n) => {
        if (n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'CLOCK' || n.type === 'PORT_IN') {
          if (n.outputs[0]) {
            activeQueue.push({ pinId: n.outputs[0].id, value: n.outputs[0].value });
          }
        }
      });
    }

    const result = runSimulationStep({ nodes: nextNodes, connections }, activeQueue, activeCustomGates);
    
    // Update circuit nodes
    updateActiveCircuitState(() => result.state);
    
    // Set next queue for subsequent steps
    setDebugQueue(result.nextQueue);
    setStepCount((s) => s + 1);

    // 4. Update the last sample of the waveform history to show the latest value
    if (probedNodeIds.length > 0) {
      setWaveformHistory((prev) => {
        const next = { ...prev };
        probedNodeIds.forEach((id) => {
          const node = result.state.nodes.find((n) => n.id === id);
          let val = false;
          if (node) {
            if (node.outputs[0]) {
              val = node.outputs[0].value;
            } else if (node.inputs[0]) {
              val = node.inputs[0].value;
            }
          }
          const history = next[id] || [];
          if (history.length > 0) {
            const updatedHistory = [...history];
            updatedHistory[updatedHistory.length - 1] = val;
            next[id] = updatedHistory;
          } else {
            next[id] = [val];
          }
        });
        return next;
      });
    }
  }, [nodes, connections, debugQueue, activeCustomGates, updateActiveCircuitState, probedNodeIds]);

  return {
    // Canvas & Tab States
    tabs,
    activeTabId,
    activeTab,
    customGates,
    curriculumCustomGates,
    activeCustomGates,
    setActiveTabId,
    transform,
    setTransform,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,

    // Controls
    isSimulating,
    setIsSimulating,
    stepCount,
    oscillationError,
    setStepCount,
    setOscillationError,

    // Actions
    addNode,
    moveNode,
    moveNodes,
    resizeNode,
    deleteNode,
    connectPins,
    deleteConnection,
    toggleSwitch,
    setButtonState,
    setNodeLabel,
    setClockInterval,
    createSubCircuitTab,
    deleteSubCircuitTab,
    convertTabToCustomGate,
    clearCanvas,
    exportCircuitJSON,
    importCircuitJSON,
    stepSimulation,
    undo,
    redo,
    copySelectedNode,
    pasteNode,
    showPinLabels,
    toggleShowPinLabels,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    // Theme (Teenage Engineering styling)
    theme,
    toggleTheme,

    // Waveform / Logic Analyzer
    probedNodeIds,
    waveformHistory,
    toggleProbeNode,
    probeNodesBulk,
    clearWaveformHistory,

    // App Mode
    appMode,
    setAppMode,

    // Curriculum API
    MISSIONS,
    completedMissions,
    setCompletedMissions,
    activeMissionId,
    setActiveMissionId,
    verifyCurrentMission,
    resetMissionTab,
    loadMissionSolution,
    missionStates,
    setMissionStates,

    // Wire Draft state
    wireDraft,
    setWireDraft,
  };
}
export type CircuitHook = ReturnType<typeof useCircuitState>;
