# GateSim ⚡ Tactile Logic Gate Simulator

GateSim is an interactive, web-based logic gate simulator built with **React, Vite, and TypeScript**. It adopts a premium tactile design aesthetic (reminiscent of high-end engineering hardware like Teenage Engineering or Figma) using a warm light-gray color palette, lime green active indicators, rounded card frames, and smooth SVG interactions.

---

## Key Features

1. **Custom Interactive SVG Canvas**: Drag and drop nodes, pan the grid (drag empty canvas), zoom (scroll wheel), and snap nodes to a 20px grid.
2. **Glowing Bezier Connections**: Click an output pin, drag, and drop onto an input pin. Active wires glow in vibrant neon-lime green; inactive lines are muted gray.
3. **Dual Simulation Engines**:
   - **Real-time Mode**: Signals propagate instantly when toggled, and clocks tick periodically.
   - **Step-by-Step Debug Mode**: Pause simulation and step through signal propagation tick-by-tick.
4. **Custom Sub-circuits (Composite Gates)**: Package any circuit design into a reusable custom gate using a multi-tab workspace with input and output port nodes.
5. **Undo & Redo System**: Full history tracking (`Ctrl+Z` / `Ctrl+Y`) for placements, connections, name modifications, and deletions.
6. **Save / Load & Export**: Export your designs as a portable JSON file and import them back at any time.

---

## Tech Stack

- **Core**: React 18 (TypeScript) + Vite
- **Styling**: Vanilla CSS (CSS Variables for token design system)
- **Canvas**: Native SVG elements & DOM events (no heavy graph libraries)
- **State Management**: Custom React hook-based state engine (`useCircuitState`)
- **Simulation**: Queue-based reactive propagation algorithm (`simulation.ts`)

---

## How to Run

Follow these steps to run the project locally on your system:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Open the local address (typically `http://localhost:5173`) in your web browser.

### 3. Build for Production
```bash
npm run build
```
The compiled, ready-to-host static files will be placed in the `dist/` directory.

---

## Project Structure

```
GateSim/
├── design_plan.md        # Architectural decisions and models
├── package.json          # Dependency configurations
├── src/
│   ├── App.css           # UI Grid and layout styling
│   ├── App.tsx           # Global layout & React bindings
│   ├── index.css         # CSS tokens & global HTML/SVG styling
│   ├── main.tsx          # React render bootstrapper
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces (Node, Pin, Connection, Tab)
│   ├── hooks/
│   │   └── useCircuitState.ts   # Centralized state hook (Undo/Redo, drag-states)
│   ├── utils/
│   │   └── simulation.ts        # Reactive queue simulation engine
│   └── components/
│       ├── Header.tsx           # Top navigation, file operations, & tabs
│       ├── Sidebar.tsx          # Drag-and-drop tool cabinet
│       ├── Canvas.tsx           # SVG interactive workspace & wire drafting
│       ├── Inspector.tsx        # Selected component editor
│       └── CreateCustomGateModal.tsx # Custom gate creator modal
```
