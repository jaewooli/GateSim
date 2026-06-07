# GateSim Session Context & Codebase Summary

This document provides a comprehensive summary of the **GateSim** codebase. Reading this file at the start of a new session will fully catch up any AI developer on the architecture, features, data models, and component structure of the simulator.

---

## 1. Project Overview & Architecture
**GateSim** is an interactive, web-based logic gate simulator using a premium tactile design aesthetic (inspired by Teenage Engineering and Figma). 

### Key Features
1. **Dual Modes & URL Routing (react-router-dom)**: 
   - **Sandbox Mode (`/sandbox`)**: Unlimited canvas where users can place gates, clocks, switches, and package their designs into custom composite gates.
   - **Curriculum Mode (`/curriculum/:missionId`)**: A step-by-step CPU design roadmap (from NAND/NOR gates up to a working 4-bit CPU) with interactive verification testing.
2. **Simulation Engine**: Queue-based reactive propagation engine supporting latch feedback loops, clock cycles (30Hz), oscillation safety limits, and step-by-step debugger stepping.
3. **Teenage Engineering UI**: Smooth panning & zooming canvas with grid snaps, glowing wire animations (particle flow on HIGH state wires), multiple node marquee selection/group dragging, and a dual theme system (Warm Light / TE Neon Dark mode).
4. **Real-time Logic Analyzer**: Interactive waveform drawer displaying time-series digital signal histories (60 samples at 25ms interval) for probed nodes.

---

## 2. Core Data Models (`src/types/index.ts`)
The circuit schema is based on nodes, pins, and connection wires:

```typescript
export type NodeType =
  | 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'
  | 'SWITCH' | 'BUTTON' | 'CLOCK' | 'LED'
  | 'PORT_IN' | 'PORT_OUT' | 'CUSTOM';

export interface Pin {
  id: string;        // `${nodeId}-in-${index}` or `${nodeId}-out-${index}`
  nodeId: string;    // Parent node
  type: 'input' | 'output';
  index: number;
  value: boolean;
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  inputs: Pin[];
  outputs: Pin[];
  customGateId?: string; // Reference to custom sub-circuit ID if type === 'CUSTOM'
  width?: number;
  height?: number;
  clockInterval?: number; // for CLOCK node
  clockState?: boolean;
  label?: string;
  subState?: CircuitState; // Nested state of custom sub-circuits
  prevClk?: boolean;
  latchedOutputs?: boolean[];
}

export interface Connection {
  id: string;
  fromPinId: string; // Output pin ID
  toPinId: string;   // Input pin ID
}

export interface CircuitState {
  nodes: Node[];
  connections: Connection[];
}

export interface Tab {
  id: string;        // 'main' or sub-circuit tab ID
  name: string;
  state: CircuitState;
}
```

---

## 3. Propagation & Simulation Engine (`src/utils/simulation.ts`)
Evaluates logic states reactively to prevent redundant evaluations and safely handle nested custom sub-circuits:

1. **Queue Propagation (`runSimulationFull` / `runSimulationStep`)**:
   - Loops propagate signal changes from source pins through connection wires to destination input pins.
   - Nodes containing changed inputs are evaluated via `evaluateNode`. If outputs change, they are pushed to the propagation queue.
   - **Oscillation Limit**: Set to a maximum iteration cap (e.g., 500 or 1000 steps). If exceeded, the engine reports an oscillation error to prevent page freezing (essential for cross-coupled SR Latch feedback loops).
2. **Custom Gates Mapping**:
   - When a `CUSTOM` node is evaluated, parent input pin values are mapped to the inner sub-circuit's `PORT_IN` nodes.
   - The inner sub-circuit is simulated until stable.
   - The stabilized inner `PORT_OUT` node values are mapped back to the parent CUSTOM outputs.
   - Stable pin indexing is preserved by sorting sub-circuit input/output ports based on pre-defined specifications first, then sorting by coordinates.

---

## 4. State Management Hook (`src/hooks/useCircuitState.ts`)
Manages all simulation controls, UI interactions, and state history:

- **Undo / Redo Stack**: Saves full Tab arrays and custom gate definition states.
- **Auto-Simulation**: Uses a `setInterval` running at 30Hz to evaluate clock toggles and flush signal propagations.
- **Copy / Paste & Hotkeys**: Listens to keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, `Ctrl+V`, `Delete`, `Backspace`) for rapid canvas interactions.
- **Multi-Selection & Theme State**: Manages `selectedNodeIds: string[]`, theme (`light` | `dark`), and group movement via `moveNodes`.
- **Logic Analyzer Probes**: Manages `probedNodeIds` and captures time-series histories in `waveformHistory` at 100ms intervals.
- **Curriculum Verification (`verifyCurrentMission`)**: Iterates through mission truth tables step-by-step, evaluating latches and checking output values against expected results.

---

## 5. UI Component Layout & Modules
The user interface is structured in a flex layout:

1. **`src/App.tsx`**: The main entry layout containing:
   - `<Header>` (Top controls, simulation toggle, import/export, dark mode switch, sandbox tabs).
   - `<Sidebar>` (Left toolbox for Sandbox, or CPU design roadmap roadmap list for Curriculum).
   - Canvas wrapper holding `<Canvas>` (Interactive SVG), `<WaveformViewer>` (Logic Analyzer graph), and `<CurriculumDock>` (Unlocked components dock).
   - `<Inspector>` (Right properties editor showing labels, clocks, and logic analyzer probe toggles).
   
2. **`src/components/Canvas.tsx`**: Custom SVG workspace handling:
   - Canvas Mode switching (Select mode with dotted marquee marquee box / Pan mode).
   - Bezier curve connection wires mapping (`M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`).
   - HIGH logic signal particle animations (`wire-particles`).
   - Non-blocking wire deletion: displays a hoverable delete `✕` button at the Bezier curve midpoint ($t = 0.5$ cubic formula) and supports double-click removal.
   - Node group dragging and pin connection wire drafts.

3. **`src/components/WaveformViewer.tsx`**: Real-time logic analyzer displaying time-series samples of probed elements as square digital logic steps.

4. **`src/components/Sidebar.tsx`**:
   - Sandbox: Displays category groups (Inputs, Gates, Outputs, Presets, User Made Custom Gates).
   - Curriculum: Renders active mission briefings, hints, resetting tools, loading solutions, and truth-table verification triggers.

---

## 6. Styling System (`src/index.css`)
Custom variables mapped across light and dark theme classes:

- **Light Mode (`:root`)**: Warm gray canvas (`#E6E7E3`), cream cards (`#F4F5F2`), neon lime green accent (`#B6E63A`).
- **Dark Mode (`body.dark-theme`)**: Sleek Teenage Engineering charcoal (`#141517`), dark gray panels (`#222428`), glowing wire particles.
- All cards feature standard transitions, hover translation float lifts (`transform: translateY(-2px)`), and modern typography imports.
