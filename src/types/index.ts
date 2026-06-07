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
  | 'CUSTOM';

export interface Pin {
  id: string;        // Formatted as `${nodeId}-in-${index}` or `${nodeId}-out-${index}`
  nodeId: string;    // ID of the parent node
  type: 'input' | 'output';
  index: number;     // Index of the pin on the node
  value: boolean;    // Logical value (true/high, false/low)
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
  // Special component properties:
  clockInterval?: number; // Clock frequency interval in ms (for CLOCK)
  clockState?: boolean;   // Internal state for clocks
  label?: string;         // Custom user label
}

export interface Connection {
  id: string;
  fromPinId: string; // Must be an output pin
  toPinId: string;   // Must be an input pin
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
