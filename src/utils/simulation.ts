import type { Node, SubCircuitDefinition, CircuitState } from '../types';

// Helper to get pin value by ID
export function findPinValue(state: CircuitState, pinId: string): boolean {
  for (const node of state.nodes) {
    const pin = node.inputs.find((p) => p.id === pinId) || node.outputs.find((p) => p.id === pinId);
    if (pin) return pin.value;
  }
  return false;
}

// Evaluate a single node's outputs based on its current input values.
// Supports standard logic gates, switches, clocks, sub-circuit ports, and custom gates.
export function evaluateNode(
  node: Node,
  customDefs: Record<string, SubCircuitDefinition>,
  // Prevent infinite recursion during nested evaluations:
  evaluatingCustomIds: Set<string> = new Set()
): boolean[] {
  const inputs = node.inputs.map((p) => p.value);

  switch (node.type) {
    case 'AND':
      return [inputs.length > 0 && inputs.every((v) => v)];
    
    case 'OR':
      return [inputs.length > 0 && inputs.some((v) => v)];
    
    case 'NOT':
      return [inputs.length > 0 ? !inputs[0] : true];
    
    case 'XOR':
      return [inputs.filter((v) => v).length % 2 === 1];
    
    case 'NAND':
      return [!(inputs.length > 0 && inputs.every((v) => v))];
    
    case 'NOR':
      return [!(inputs.length > 0 && inputs.some((v) => v))];
    
    case 'XNOR':
      return [inputs.filter((v) => v).length % 2 === 0];
    
    case 'SWITCH':
    case 'CLOCK':
      // The output of a switch or clock is its own state (stored in its outputs[0].value)
      return [node.outputs[0]?.value ?? false];
    
    case 'BUTTON':
      // Button value is evaluated and held, output matches the button's output state
      return [node.outputs[0]?.value ?? false];

    case 'LED':
      // LED is an output component and has no output pins
      return [];

    case 'PORT_IN':
      // An input port of a sub-circuit passes its value through.
      // In the parent custom gate, the input is set. In the sub-circuit, PORT_IN acts as a source.
      return [node.outputs[0]?.value ?? false];

    case 'PORT_OUT':
      // An output port of a sub-circuit receives an input and has no output pins
      return [];

    case 'CUSTOM': {
      if (!node.customGateId || !customDefs[node.customGateId]) {
        // Return false for all outputs if definition is missing
        return node.outputs.map(() => false);
      }

      const def = customDefs[node.customGateId];

      // Detect circular custom gate definitions to prevent infinite loops
      if (evaluatingCustomIds.has(node.customGateId)) {
        return node.outputs.map(() => false);
      }

      // Clone the sub-circuit nodes & connections to simulate internally
      const subState: CircuitState = {
        nodes: JSON.parse(JSON.stringify(def.nodes)),
        connections: JSON.parse(JSON.stringify(def.connections)),
      };

      // Map parent custom node inputs -> sub-circuit PORT_IN node outputs
      const subPortIns = subState.nodes
        .filter((n) => n.type === 'PORT_IN')
        .sort((a, b) => a.y - b.y || a.x - b.x); // Sort by position to determine index mapping

      inputs.forEach((val, idx) => {
        if (subPortIns[idx] && subPortIns[idx].outputs[0]) {
          subPortIns[idx].outputs[0].value = val;
        }
      });

      // Run simulation on the sub-circuit state
      const nextRecSet = new Set(evaluatingCustomIds);
      nextRecSet.add(node.customGateId);
      
      // Initialize propagation queue with the values of the PORT_IN pins
      const initialQueue: { pinId: string; value: boolean }[] = [];
      subPortIns.forEach((portNode) => {
        if (portNode.outputs[0]) {
          initialQueue.push({ pinId: portNode.outputs[0].id, value: portNode.outputs[0].value });
        }
      });

      // Run internal simulation until stable
      const result = runSimulationFull(subState, initialQueue, customDefs, 500, nextRecSet);

      // Map sub-circuit PORT_OUT node inputs -> parent custom node outputs
      const subPortOuts = result.state.nodes
        .filter((n) => n.type === 'PORT_OUT')
        .sort((a, b) => a.y - b.y || a.x - b.x);

      return node.outputs.map((_, idx) => {
        const portOutNode = subPortOuts[idx];
        return portOutNode && portOutNode.inputs[0] ? portOutNode.inputs[0].value : false;
      });
    }

    default:
      return [];
  }
}

// Runs a single step of propagation (useful for step-by-step debug rendering)
export function runSimulationStep(
  state: CircuitState,
  queue: { pinId: string; value: boolean }[],
  customDefs: Record<string, SubCircuitDefinition>,
  evaluatingCustomIds: Set<string> = new Set()
): {
  state: CircuitState;
  nextQueue: { pinId: string; value: boolean }[];
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
  const updatesMap = new Map<string, boolean>();
  queue.forEach((u) => updatesMap.set(u.pinId, u.value));

  const nextQueue: { pinId: string; value: boolean }[] = [];
  const nodesToEvaluate = new Set<string>();

  // 1. Apply pin updates and identify downstream pins
  updatesMap.forEach((newValue, pinId) => {
    // Find and update the source pin
    for (const node of nextNodes) {
      const pin = node.outputs.find((p) => p.id === pinId) || node.inputs.find((p) => p.id === pinId);
      if (pin) {
        if (pin.value !== newValue) {
          pin.value = newValue;
          changedPins.push(pinId);
        }
        
        // If it's an output pin, propagate to connected input pins
        if (pin.type === 'output') {
          const matchingConns = connections.filter((c) => c.fromPinId === pinId);
          matchingConns.forEach((conn) => {
            nextQueue.push({ pinId: conn.toPinId, value: newValue });
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
    nextOutputs.forEach((val, idx) => {
      const outPin = node.outputs[idx];
      if (outPin && outPin.value !== val) {
        nextQueue.push({ pinId: outPin.id, value: val });
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
  initialQueue: { pinId: string; value: boolean }[],
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
