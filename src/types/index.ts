export type NodeType =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  | 'XNOR'
  | 'SWITCH'
  | 'BUTTON'
  | 'CLOCK'
  | 'LED'
  | 'PORT_IN'
  | 'PORT_OUT'
  | 'BUS_INPUT'
  | 'BUS_OUTPUT'
  | 'BUS_AND'
  | 'BUS_OR'
  | 'BUS_XOR'
  | 'BUS_NOT'
  | 'BUS_ADD'
  | 'BUS_SUB'
  | 'CUSTOM';

export interface Pin {
  id: string;        // Formatted as `${nodeId}-in-${index}` or `${nodeId}-out-${index}`
  nodeId: string;    // ID of the parent node
  type: 'input' | 'output';
  index: number;     // Index of the pin on the node
  value: boolean;    // Logical value (true/high, false/low)
  busValue?: number; // Numeric value for bus-capable pins
  busWidth?: 8 | 16 | 32;
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;      // User-friendly name or symbol (e.g., "AND", "OR", "U1")
  x: number;
  y: number;
  inputs: Pin[];
  outputs: Pin[];
  customGateId?: string; // Reference to custom sub-circuit ID if type === 'CUSTOM'
  width?: number;        // Explicit node width (optional)
  height?: number;       // Explicit node height (optional)
  // Special component properties:
  clockInterval?: number; // Clock frequency interval in ms (for CLOCK)
  clockState?: boolean;   // Internal state for clocks
  label?: string;         // Custom user label
  subState?: CircuitState; // Internal simulation state for CUSTOM gates
  prevClk?: boolean;
  latchedOutputs?: boolean[];
  busValue?: number;
  busWidth?: 8 | 16 | 32;
}

export interface Connection {
  id: string;
  fromPinId: string; // Must be an output pin
  toPinId: string;   // Must be an input pin
  bitWidth?: 1 | 8 | 16 | 32; // Visual bus width; omitted means single-bit wire
}

export interface BusWire extends Connection {
  bitWidth: 8 | 16 | 32;
}

export interface SignalUpdate {
  pinId: string;
  value: boolean;
  busValue?: number;
}

export interface SubCircuitDefinition {
  id: string;
  name: string;
  color: string;      // Custom node color for the toolbox/canvas
  nodes: Node[];
  connections: Connection[];
}

export interface CircuitState {
  nodes: Node[];
  connections: Connection[];
}

export interface Tab {
  id: string;        // 'main' or a custom sub-circuit ID
  name: string;      // e.g. "Main Circuit", "Half Adder"
  state: CircuitState;
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  targetTabId: string;
  inputsRequired: string[];
  outputsRequired: string[];
  truthTable: { inputs: boolean[]; outputs: boolean[] }[];
  hint?: string;
}
