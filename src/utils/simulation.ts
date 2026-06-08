import type { Node, SubCircuitDefinition, CircuitState, SignalUpdate } from '../types';

interface PinSignal {
  value: boolean;
  busValue?: number;
}

// Sub-circuit ID to required ports mapping to keep pin indexing stable
const CUSTOM_GATE_PORT_SPECS: Record<string, { inputs: string[]; outputs: string[] }> = {
  'sub-nand': { inputs: ['A', 'B'], outputs: ['Out'] },
  'sub-nor': { inputs: ['A', 'B'], outputs: ['Out'] },
  'sub-xor': { inputs: ['A', 'B'], outputs: ['Out'] },
  'sub-xnor': { inputs: ['A', 'B'], outputs: ['Out'] },
  'sub-mux': { inputs: ['D0', 'D1', 'Select'], outputs: ['Out'] },
  'sub-half-adder': { inputs: ['A', 'B'], outputs: ['Sum', 'Carry'] },
  'sub-full-adder': { inputs: ['A', 'B', 'Cin'], outputs: ['Sum', 'Cout'] },
  'sub-sr-latch': { inputs: ['Reset (R)', 'Set (S)'], outputs: ['Q', 'Q_bar'] },
  'sub-d-latch': { inputs: ['D', 'CLK'], outputs: ['Q', 'Q_bar'] },
  'sub-d-flipflop': { inputs: ['D', 'CLK'], outputs: ['Q', 'Q_bar'] },
  'sub-decoder': { inputs: ['OP0', 'OP1'], outputs: ['LOAD', 'ADD', 'JUMP'] },
  'sub-alu-1bit': { inputs: ['A', 'B', 'Op0', 'Op1'], outputs: ['Result'] },
  'sub-alu-4bit': {
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Op0', 'Op1'],
    outputs: ['R0', 'R1', 'R2', 'R3', 'Carry'],
  },
  'sub-register-4bit': { inputs: ['D0', 'D1', 'D2', 'D3', 'CLK'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] },
  'sub-pc-4bit': { inputs: ['Reset', 'CLK'], outputs: ['PC0', 'PC1', 'PC2', 'PC3'] },
  'sub-cpu-4bit': { inputs: ['Reset', 'CLK'], outputs: ['Out0', 'Out1', 'Out2', 'Out3'] },
};

// Robust port sorting based on mission requirements first, fallback to y-coordinate
export function sortSubCircuitPorts(
  nodes: Node[],
  portType: 'PORT_IN' | 'PORT_OUT',
  subCircuitId?: string
): Node[] {
  const ports = nodes.filter((n) => n.type === portType);
  
  if (!subCircuitId || !CUSTOM_GATE_PORT_SPECS[subCircuitId]) {
    return [...ports].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  const spec = CUSTOM_GATE_PORT_SPECS[subCircuitId];
  const requiredNames = portType === 'PORT_IN' ? spec.inputs : spec.outputs;
  
  const normalizeName = (s: string) => {
    if (!s) return '';
    return s.replace(/\s+/g, '')
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/[_-]/g, '');
  };

  const matchedPorts: Node[] = [];
  const unmatchedPorts: Node[] = [];

  requiredNames.forEach((reqName) => {
    const targetNorm = normalizeName(reqName);
    const found = ports.find((p) => {
      const pNormLabel = normalizeName(p.label || '');
      const pNormName = normalizeName(p.name || '');
      return pNormLabel === targetNorm || pNormName === targetNorm;
    });
    if (found && !matchedPorts.includes(found)) {
      matchedPorts.push(found);
    }
  });

  ports.forEach((p) => {
    if (!matchedPorts.includes(p)) {
      unmatchedPorts.push(p);
    }
  });

  unmatchedPorts.sort((a, b) => a.y - b.y || a.x - b.x);

  return [...matchedPorts, ...unmatchedPorts];
}

// Helper to get pin value by ID
export function findPinValue(state: CircuitState, pinId: string): boolean {
  for (const node of state.nodes) {
    const pin = node.inputs.find((p) => p.id === pinId) || node.outputs.find((p) => p.id === pinId);
    if (pin) return pin.value;
  }
  return false;
}

function toSignal(value: boolean, busValue?: number): PinSignal {
  return busValue === undefined ? { value } : { value: busValue !== 0, busValue };
}

function getBusWidth(node: Node): 8 | 16 | 32 {
  return node.busWidth || 8;
}

function busMask(width: 8 | 16 | 32) {
  return width === 32 ? 0xffffffff : (1 << width) - 1;
}

function pinBusValue(node: Node, index: number) {
  const pin = node.inputs[index];
  return pin?.busValue ?? (pin?.value ? 1 : 0);
}

function normalizeBusValue(value: number, width: 8 | 16 | 32) {
  return value & busMask(width);
}

// Evaluate a single node's outputs based on its current input values.
// Supports standard logic gates, switches, clocks, sub-circuit ports, and custom gates.
export function evaluateNode(
  node: Node,
  customDefs: Record<string, SubCircuitDefinition>,
  // Prevent infinite recursion during nested evaluations:
  evaluatingCustomIds: Set<string> = new Set()
): PinSignal[] {
  const inputs = node.inputs.map((p) => p.value);
  const width = getBusWidth(node);
  const mask = busMask(width);

  switch (node.type) {
    case 'AND':
      return [toSignal(inputs.length > 0 && inputs.every((v) => v))];
    
    case 'OR':
      return [toSignal(inputs.length > 0 && inputs.some((v) => v))];
    
    case 'NOT':
      return [toSignal(inputs.length > 0 ? !inputs[0] : true)];
    
    case 'XOR':
      return [toSignal(inputs.filter((v) => v).length % 2 === 1)];
    
    case 'NAND':
      return [toSignal(!(inputs.length > 0 && inputs.every((v) => v)))];
    
    case 'NOR':
      return [toSignal(!(inputs.length > 0 && inputs.some((v) => v)))];
    
    case 'XNOR':
      return [toSignal(inputs.filter((v) => v).length % 2 === 0)];
    
    case 'SWITCH':
    case 'CLOCK':
      // The output of a switch or clock is its own state (stored in its outputs[0].value)
      return [toSignal(node.outputs[0]?.value ?? false)];
    
    case 'BUTTON':
      // Button value is evaluated and held, output matches the button's output state
      return [toSignal(node.outputs[0]?.value ?? false)];

    case 'BUS_INPUT': {
      const busValue = normalizeBusValue(node.busValue ?? node.outputs[0]?.busValue ?? 0, width);
      return [toSignal(busValue !== 0, busValue)];
    }

    case 'BUS_AND':
      return [toSignal(true, normalizeBusValue(pinBusValue(node, 0) & pinBusValue(node, 1), width))];

    case 'BUS_OR':
      return [toSignal(true, normalizeBusValue(pinBusValue(node, 0) | pinBusValue(node, 1), width))];

    case 'BUS_XOR':
      return [toSignal(true, normalizeBusValue(pinBusValue(node, 0) ^ pinBusValue(node, 1), width))];

    case 'BUS_NOT':
      return [toSignal(true, normalizeBusValue((~pinBusValue(node, 0)) & mask, width))];

    case 'BUS_ADD':
      return [toSignal(true, normalizeBusValue(pinBusValue(node, 0) + pinBusValue(node, 1), width))];

    case 'BUS_SUB':
      return [toSignal(true, normalizeBusValue(pinBusValue(node, 0) - pinBusValue(node, 1), width))];
    
    case 'LED':
    case 'BUS_OUTPUT':
      // LED is an output component and has no output pins
      return [];

    case 'PORT_IN':
      // An input port of a sub-circuit passes its value through.
      // In the parent custom gate, the input is set. In the sub-circuit, PORT_IN acts as a source.
      return [toSignal(node.outputs[0]?.value ?? false, node.outputs[0]?.busValue)];

    case 'PORT_OUT':
      // An output port of a sub-circuit receives an input and has no output pins
      return [];

    case 'CUSTOM': {
      if (!node.customGateId || !customDefs[node.customGateId]) {
        return node.outputs.map(() => toSignal(false));
      }

      // Emulate rising edge triggering for 4-Bit Register to avoid feedback loop oscillation
      if (node.customGateId === 'sub-register-4bit' && !node.id.includes('cpu-reg')) {
        const currClk = inputs[4]; // CLK is the 5th input of sub-register-4bit (D0, D1, D2, D3, CLK)
        const prevClk = node.prevClk ?? false;
        const isRisingEdge = currClk && !prevClk;
        node.prevClk = currClk;

        // Only return early if CLK is HIGH and it's NOT a rising edge.
        // If CLK is LOW, we let it propagate normally to sync the D latch inputs.
        if (currClk && !isRisingEdge && node.latchedOutputs) {
          return node.latchedOutputs.map((value) => toSignal(value));
        }
      }

      const def = customDefs[node.customGateId];

      if (evaluatingCustomIds.has(node.customGateId)) {
          return node.outputs.map(() => toSignal(false));
      }

      const isFirstEval = !node.subState;
      if (!node.subState || node.subState.nodes.length !== def.nodes.length) {
        node.subState = {
          nodes: JSON.parse(JSON.stringify(def.nodes)),
          connections: JSON.parse(JSON.stringify(def.connections)),
        };
      }

      const subState = node.subState;

      // Force internal SWITCHes to true for Program Counter custom gate
      if (node.customGateId === 'sub-pc-4bit') {
        subState.nodes.forEach((n) => {
          if (n.type === 'SWITCH' && n.outputs[0]) {
            n.outputs[0].value = true;
          }
        });
      }

      const subPortIns = sortSubCircuitPorts(subState.nodes, 'PORT_IN', node.customGateId);

      const initialQueue: SignalUpdate[] = [];

      if (isFirstEval) {
        inputs.forEach((val, idx) => {
          if (subPortIns[idx] && subPortIns[idx].outputs[0]) {
            subPortIns[idx].outputs[0].value = val;
          }
        });
        subState.nodes.forEach((n) => {
          n.outputs.forEach((pin) => {
              initialQueue.push({ pinId: pin.id, value: pin.value, busValue: pin.busValue });
          });
        });
      } else {
        inputs.forEach((val, idx) => {
          if (subPortIns[idx] && subPortIns[idx].outputs[0]) {
            const pin = subPortIns[idx].outputs[0];
            if (pin.value !== val) {
              pin.value = val;
              initialQueue.push({ pinId: pin.id, value: val, busValue: pin.busValue });
            }
          }
        });
      }

      const nextRecSet = new Set(evaluatingCustomIds);
      nextRecSet.add(node.customGateId);

      const result = runSimulationFull(subState, initialQueue, customDefs, 500, nextRecSet);

      node.subState = result.state;

      const subPortOuts = sortSubCircuitPorts(result.state.nodes, 'PORT_OUT', node.customGateId);

      const outputs = node.outputs.map((_, idx) => {
        const portOutNode = subPortOuts[idx];
        const pin = portOutNode?.inputs[0];
        return toSignal(pin?.value ?? false, pin?.busValue);
      });

      if (node.customGateId === 'sub-register-4bit' && !node.id.includes('cpu-reg')) {
        node.latchedOutputs = outputs.map((signal) => signal.value);
      }

      return outputs;
    }

    default:
      return [];
  }
}

// Runs a single step of propagation (useful for step-by-step debug rendering)
export function runSimulationStep(
  state: CircuitState,
  queue: SignalUpdate[],
  customDefs: Record<string, SubCircuitDefinition>,
  evaluatingCustomIds: Set<string> = new Set()
): {
  state: CircuitState;
  nextQueue: SignalUpdate[];
  changedPins: string[];
} {
  if (queue.length === 0) {
    return { state, nextQueue: [], changedPins: [] };
  }

  // Create deep copy of state to avoid mutations
  const nextNodes = JSON.parse(JSON.stringify(state.nodes)) as Node[];
  const connections = state.connections;
  const changedPins: string[] = [];

  // Group queue by pin ID, taking the latest value for each
  const updatesMap = new Map<string, SignalUpdate>();
  queue.forEach((u) => updatesMap.set(u.pinId, u));

  const nextQueue: SignalUpdate[] = [];
  const nodesToEvaluate = new Set<string>();

  // 1. Apply pin updates and identify downstream pins
  updatesMap.forEach((update, pinId) => {
    // Find and update the source pin
    for (const node of nextNodes) {
      const pin = node.outputs.find((p) => p.id === pinId) || node.inputs.find((p) => p.id === pinId);
      if (pin) {
        const nextBusValue = update.busValue;
        const busChanged = nextBusValue !== undefined && pin.busValue !== nextBusValue;
        if (pin.value !== update.value || busChanged) {
          pin.value = update.value;
          if (nextBusValue !== undefined) {
            pin.busValue = nextBusValue;
          }
          changedPins.push(pinId);
        }
        
        // If it's an output pin, propagate to connected input pins
        if (pin.type === 'output') {
          const matchingConns = connections.filter((c) => c.fromPinId === pinId);
          matchingConns.forEach((conn) => {
            nextQueue.push({ pinId: conn.toPinId, value: update.value, busValue: update.busValue });
          });
        } 
        // If it's an input pin, queue the parent node for re-evaluation
        else {
          nodesToEvaluate.add(node.id);
        }
        break;
      }
    }
  });

  // 2. Evaluate nodes whose inputs changed
  nodesToEvaluate.forEach((nodeId) => {
    const node = nextNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Run node evaluation
    const nextOutputs = evaluateNode(node, customDefs, evaluatingCustomIds);

    // If outputs changed, queue them for the next tick
    nextOutputs.forEach((signal, idx) => {
      const outPin = node.outputs[idx];
      if (!outPin) return;
      const busChanged = signal.busValue !== undefined && outPin.busValue !== signal.busValue;
      if (outPin.value !== signal.value || busChanged) {
        nextQueue.push({ pinId: outPin.id, value: signal.value, busValue: signal.busValue });
      }
    });
  });

  return {
    state: { nodes: nextNodes, connections },
    nextQueue,
    changedPins,
  };
}

// Runs propagation recursively until the circuit settles or oscillates (hits max iterations)
export function runSimulationFull(
  state: CircuitState,
  initialQueue: SignalUpdate[],
  customDefs: Record<string, SubCircuitDefinition>,
  maxIterations = 1000,
  evaluatingCustomIds: Set<string> = new Set()
): {
  state: CircuitState;
  iterations: number;
  oscillated: boolean;
} {
  let currState = state;
  let queue = [...initialQueue];
  let iterations = 0;
  let oscillated = false;

  while (queue.length > 0 && iterations < maxIterations) {
    const stepResult = runSimulationStep(currState, queue, customDefs, evaluatingCustomIds);
    currState = stepResult.state;
    queue = stepResult.nextQueue;
    iterations++;
  }

  if (iterations >= maxIterations) {
    oscillated = true;
  }

  return {
    state: currState,
    iterations,
    oscillated,
  };
}
