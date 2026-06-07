import { useState, useEffect, useCallback } from 'react';
import type { Node, Connection, SubCircuitDefinition, Tab, CanvasTransform, NodeType, Pin, CircuitState } from '../types';
import { runSimulationFull, runSimulationStep } from '../utils/simulation';

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
  // 2. Half Adder sub-circuit definition tab
  {
    id: 'sub-half-adder',
    name: 'Half Adder',
    state: {
      nodes: [
        createDemoNode('ha-in-a', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'A'),
        createDemoNode('ha-in-b', 'PORT_IN', 'IN PORT', 60, 200, 0, 1, undefined, 'B'),
        createDemoNode('ha-xor', 'XOR', 'XOR', 220, 60, 2, 1),
        createDemoNode('ha-and', 'AND', 'AND', 220, 180, 2, 1),
        createDemoNode('ha-out-s', 'PORT_OUT', 'OUT PORT', 380, 80, 1, 0, undefined, 'Sum'),
        createDemoNode('ha-out-c', 'PORT_OUT', 'OUT PORT', 380, 200, 1, 0, undefined, 'Carry'),
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
  },
  // 3. SR Latch definition tab
  {
    id: 'sub-sr-latch',
    name: 'SR Latch',
    state: {
      nodes: [
        createDemoNode('sr-in-r', 'PORT_IN', 'IN PORT', 60, 80, 0, 1, undefined, 'Reset (R)'),
        createDemoNode('sr-in-s', 'PORT_IN', 'IN PORT', 60, 240, 0, 1, undefined, 'Set (S)'),
        createDemoNode('sr-nor-q', 'NOR', 'NOR', 220, 60, 2, 1, undefined, 'Q Output Gate'),
        createDemoNode('sr-nor-qb', 'NOR', 'NOR', 220, 220, 2, 1, undefined, 'Q_bar Gate'),
        createDemoNode('sr-out-q', 'PORT_OUT', 'OUT PORT', 380, 80, 1, 0, undefined, 'Q'),
        createDemoNode('sr-out-qb', 'PORT_OUT', 'OUT PORT', 380, 240, 1, 0, undefined, 'Q_bar'),
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
  },
  // 4. Mux 2 to 1 definition tab
  {
    id: 'sub-mux',
    name: '2-to-1 MUX',
    state: {
      nodes: [
        createDemoNode('mux-d0', 'PORT_IN', 'IN PORT', 60, 60, 0, 1, undefined, 'D0'),
        createDemoNode('mux-d1', 'PORT_IN', 'IN PORT', 60, 260, 0, 1, undefined, 'D1'),
        createDemoNode('mux-sel', 'PORT_IN', 'IN PORT', 60, 160, 0, 1, undefined, 'Select'),
        createDemoNode('mux-not', 'NOT', 'NOT', 170, 160, 1, 1),
        createDemoNode('mux-and-0', 'AND', 'AND', 280, 60, 2, 1),
        createDemoNode('mux-and-1', 'AND', 'AND', 280, 220, 2, 1),
        createDemoNode('mux-or', 'OR', 'OR', 420, 140, 2, 1),
        createDemoNode('mux-out', 'PORT_OUT', 'OUT PORT', 560, 160, 1, 0, undefined, 'Out'),
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
  },
];

const DEMO_CUSTOM_GATES: Record<string, SubCircuitDefinition> = {
  'sub-half-adder': {
    id: 'sub-half-adder',
    name: 'HALF_ADDER',
    color: '#B6E63A',
    nodes: DEMO_TABS[1].state.nodes,
    connections: DEMO_TABS[1].state.connections,
  },
  'sub-sr-latch': {
    id: 'sub-sr-latch',
    name: 'SR_LATCH',
    color: '#F15B2A',
    nodes: DEMO_TABS[2].state.nodes,
    connections: DEMO_TABS[2].state.connections,
  },
  'sub-mux': {
    id: 'sub-mux',
    name: 'MUX_2_TO_1',
    color: '#3A86F0',
    nodes: DEMO_TABS[3].state.nodes,
    connections: DEMO_TABS[3].state.connections,
  },
};

export function useCircuitState() {
  // Tabs & Custom Gates
  const [tabs, setTabs] = useState<Tab[]>(DEMO_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [customGates, setCustomGates] = useState<Record<string, SubCircuitDefinition>>(DEMO_CUSTOM_GATES);

  // Canvas Interactions
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copiedNode, setCopiedNode] = useState<Node | null>(null);
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);
  
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
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const { nodes, connections } = activeTab.state;

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
  }, [activeTabId]);

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
    } else if (type === 'CUSTOM' && customGateId && customGates[customGateId]) {
      const def = customGates[customGateId];
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
  }, [saveHistory, customGates, updateActiveCircuitState]);

  // Update Node position
  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    updateActiveCircuitState((prev) => ({
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
      connections: prev.connections,
    }));
  }, [updateActiveCircuitState]);

  // Delete Node and all its connections
  const deleteNode = useCallback((nodeId: string) => {
    saveHistory();
    updateActiveCircuitState((prev) => {
      const nodeToDelete = prev.nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return prev;

      const pinIds = new Set([
        ...nodeToDelete.inputs.map((p) => p.id),
        ...nodeToDelete.outputs.map((p) => p.id),
      ]);

      const nextConnections = prev.connections.filter(
        (c) => !pinIds.has(c.fromPinId) && !pinIds.has(c.toPinId)
      );

      return {
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        connections: nextConnections,
      };
    });

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [saveHistory, selectedNodeId, updateActiveCircuitState]);

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

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelectedNode();
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
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
        const simResult = runSimulationFull(prevCircuit, queue, customGates, 1000);
        
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
  }, [isSimulating, updateActiveCircuitState, customGates, oscillationError]);

  // STEP-BY-STEP PROPAGATION ACTION
  const stepSimulation = useCallback(() => {
    // If not simulating or step queue is empty, initialize queue with switches/clocks
    let activeQueue = [...debugQueue];
    if (activeQueue.length === 0) {
      nodes.forEach((n) => {
        if (n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'CLOCK' || n.type === 'PORT_IN') {
          if (n.outputs[0]) {
            activeQueue.push({ pinId: n.outputs[0].id, value: n.outputs[0].value });
          }
        }
      });
    }

    const result = runSimulationStep({ nodes, connections }, activeQueue, customGates);
    
    // Update circuit nodes
    updateActiveCircuitState(() => result.state);
    
    // Set next queue for subsequent steps
    setDebugQueue(result.nextQueue);
    setStepCount((s) => s + 1);
  }, [nodes, connections, debugQueue, customGates, updateActiveCircuitState]);

  return {
    // Canvas & Tab States
    tabs,
    activeTabId,
    activeTab,
    customGates,
    setActiveTabId,
    transform,
    setTransform,
    selectedNodeId,
    setSelectedNodeId,

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

    // Wire Draft state
    wireDraft,
    setWireDraft,
  };
}
export type CircuitHook = ReturnType<typeof useCircuitState>;
