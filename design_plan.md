# GateSim: Tactile Logic Gate Simulator Design Plan

This document outlines the architectural plan, data model, and styling system for **GateSim**, an interactive, web-based logic gate simulator using a premium tactile design aesthetic.

---

## 1. Technical Stack & Foundation

- **Frontend Framework**: React 18+ with Vite (TypeScript)
- **Styling**: Vanilla CSS (using a centralized design token system)
- **Canvas System**: Interactive SVG Canvas (using standard React mouse event listeners, zoom/pan transform states, and SVG bezier wires)
- **Routing & State**: Local React states, using context or custom hooks for global commands (Undo/Redo, Canvas state, Simulation runner)

---

## 2. Design System & Aesthetics (Tactile Engineering Style)

| Token | Value | Purpose |
| :--- | :--- | :--- |
| **Primary BG** | `#E6E7E3` | Warm, light gray backdrop for pages and panels |
| **Secondary BG**| `#F4F5F2` | Slightly lighter gray for active elements and selected tabs |
| **Accent Color**| `#B6E63A` | Vibrant lime green for active logic HIGH (1), primary CTAs, and hover highlights |
| **Text Primary**| `#1A1A1A` | High-contrast dark gray for headlines and text |
| **Text Muted**  | `#5F5F5F` | Medium-contrast gray for descriptions and sub-labels |
| **Logic LOW BG**| `#D1D3CD` | Muted cool-gray representing logic state LOW (0) |
| **Border Radius**| `24px` | Large, friendly round corners for cards, panels, and gates |
| **Shadow**      | `0px 12px 32px rgba(0,0,0,0.06)` | Low-contrast, soft drop shadow for a clean layered layout |

### Key UX Rules
- **Tactile feel**: Buttons and cards float slightly on hover (`transform: translateY(-4px)` with standard `transition`).
- **Gradients**: Not allowed. Colors are solid and intentional.
- **Wires**: Curved Bezier lines (`d="M x1 y1 C (x1+50) y1, (x2-50) y2, x2 y2"`). When high, they display a vibrant `#B6E63A` lime-green glow. When low, they are `#D1D3CD`.

---

## 3. Data Models & State Structure

### Circuit State
A circuit design is defined by nodes (gates/inputs/outputs) and connections (wires).

```typescript
export interface Pin {
  id: string;        // Unique pin ID: `${nodeId}-in-${index}` or `${nodeId}-out`
  nodeId: string;    // Parent node
  type: 'input' | 'output';
  value: boolean;    // Current logic value (true/false)
}

export interface Node {
  id: string;
  type: 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'SWITCH' | 'BUTTON' | 'CLOCK' | 'LED' | 'CUSTOM' | 'PORT_IN' | 'PORT_OUT';
  name: string;
  x: number;
  y: number;
  inputs: Pin[];
  outputs: Pin[];
  customGateId?: string; // If type is 'CUSTOM', reference to the sub-circuit definition
  // Component-specific settings:
  clockInterval?: number; // for CLOCK node (in ms)
  label?: string;         // user-defined name
}

export interface Connection {
  id: string;
  fromPinId: string; // Must be an output pin
  toPinId: string;   // Must be an input pin
}

export interface SubCircuitDefinition {
  id: string;        // Matches customGateId
  name: string;
  nodes: Node[];
  connections: Connection[];
}

export interface Tab {
  id: string;        // 'main' or custom sub-circuit ID
  name: string;      // e.g. "Main Circuit", "Full Adder"
  nodes: Node[];
  connections: Connection[];
}
```

---

## 4. Simulation Engine (Dual-Mode)

The simulator operates using a **Reactive Propagation Queue** to resolve gate logic step-by-step.

1. **Gate Evaluation Rules**:
   - `AND`: Output is `true` if all inputs are `true`.
   - `OR`: Output is `true` if any input is `true`.
   - `NOT`: Output is `!input`.
   - `SWITCH`/`BUTTON`/`CLOCK`: Output is set by user action or ticker.
   - `CUSTOM` (Sub-circuit):
     - Maps its inputs to the internal `PORT_IN` nodes of the sub-circuit definition.
     - Runs the sub-circuit simulation until stable.
     - Maps the sub-circuit's internal `PORT_OUT` nodes back to the custom gate's outputs.

2. **Propagation Loop**:
   - Maintains a queue of `Pin` changes.
   - For each change, identify downstream connections, update the connected input pins, and add the receiving nodes to the evaluation list.
   - Evaluate receiving nodes; if their output values change, queue the new output values for propagation.
   - To prevent infinite loops (e.g., feedback loops without delay), limit the maximum propagations per tick (e.g., 500 steps) and report an oscillation error if exceeded.

3. **Execution Modes**:
   - **Real-time**: Flushes the propagation queue instantly inside a `requestAnimationFrame` loop, and ticks clocks periodically using `setInterval`.
   - **Step-by-Step (Debug)**: When paused, clock ticks and manual inputs add to the queue. The user can click a "Step" button to propagate exactly one wave of changes, highlighting the active wires as they toggle.

---

## 5. UI Layout Structure

```
+--------------------------------------------------------------------------------+
|  GateSim Logo       [Main Canvas]  [Full Adder +]        [Play/Pause] [Step] [Undo/Redo]   |
+--------------------------------------------------------------------------------+
|  TOOLBOX           |  CANVAS                                     |  INSPECTOR  |
|                    |                                             |             |
|  - Inputs          |  [Tab: Main Canvas]                         |  Selected   |
|    * Switch        |  +---------------------------------------+  |  Gate       |
|    * Button        |  |  Grid snapping active                 |  |  AND Gate   |
|    * Clock         |  |                                       |  |             |
|  - Gates           |  |  [Toggle]--------(AND)-------[LED]   |  |  Label: U1  |
|    * AND, OR, NOT  |  |                    |                  |  |  Delete btn |
|  - Custom Gates    |  |  [Switch]----------+                  |  |             |
|    * Create New +  |  +---------------------------------------+  |  Settings   |
+--------------------------------------------------------------------------------+
|  Status: Running (clocks active)  |  Zoom: 100%  |  Step Count: 142            |
+--------------------------------------------------------------------------------+
```

---

## 6. Implementation Stages

1. **Stage 1: Setup & Project Initialization** (Vite, TypeScript, Design tokens, Tab structure).
2. **Stage 2: Custom SVG Canvas & Dragging** (Pan/zoom, Node dragging, Snapping grid).
3. **Stage 3: Wiring System** (Click-drag to connect, Bezier drawing, Wire hover/delete).
4. **Stage 4: Simulation Engine** (Reactive queue propagation, Basic gates, Switches, LEDs).
5. **Stage 5: Custom Sub-circuits** (Creating custom gates, Tab switching, Multi-level evaluation).
6. **Stage 6: UI Polish & Editor Actions** (Undo/Redo, LocalStorage saving, JSON Export, animations).
