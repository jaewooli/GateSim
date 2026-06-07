import React, { useState, useRef } from 'react';
import type { Node, Pin, NodeType } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';

export const GATE_WIDTH = 110;
export const GATE_HEIGHT = 70;

export function getPinPosition(node: Node, pinId: string) {
  const isInput = pinId.includes('-in-');
  const pin = isInput
    ? node.inputs.find((p) => p.id === pinId)
    : node.outputs.find((p) => p.id === pinId);

  if (!pin) return { x: node.x, y: node.y };

  const index = pin.index;
  const totalPins = isInput ? node.inputs.length : node.outputs.length;

  const x = isInput ? node.x : node.x + GATE_WIDTH;
  const y = node.y + (index + 1) * (GATE_HEIGHT / (totalPins + 1));

  return { x, y };
}

interface CanvasProps {
  circuit: CircuitHook;
}

export const Canvas: React.FC<CanvasProps> = ({ circuit }) => {
  const {
    activeTab,
    customGates,
    transform,
    setTransform,
    selectedNodeId,
    setSelectedNodeId,
    moveNode,
    connectPins,
    deleteConnection,
    toggleSwitch,
    setButtonState,
    addNode,
    wireDraft,
    setWireDraft,
    setActiveTabId,
  } = circuit;

  const { nodes, connections } = activeTab.state;

  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Convert screen coordinates to canvas grid coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    
    return {
      x: (rawX - transform.x) / transform.zoom,
      y: (rawY - transform.y) / transform.zoom,
    };
  };

  // Zoom Handler
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const zoomIntensity = 0.05;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
    const nextZoom = Math.min(Math.max(transform.zoom * zoomFactor, 0.2), 3);

    // Zoom centered on mouse position
    const nextX = mouseX - (mouseX - transform.x) * (nextZoom / transform.zoom);
    const nextY = mouseY - (mouseY - transform.y) * (nextZoom / transform.zoom);

    setTransform({ x: nextX, y: nextY, zoom: nextZoom });
  };

  // Mousedown on Canvas background (for panning)
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Check if clicking background
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('canvas-grid')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      setSelectedNodeId(null);
    }
  };

  // Mousemove on Canvas (dragging nodes, panning, draft wires)
  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // 1. Pan Canvas
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }

    // 2. Drag Node
    if (draggedNode) {
      const snapGrid = 20;
      const targetX = Math.round((coords.x - draggedNode.offsetX) / snapGrid) * snapGrid;
      const targetY = Math.round((coords.y - draggedNode.offsetY) / snapGrid) * snapGrid;
      moveNode(draggedNode.id, targetX, targetY);
    }

    // 3. Update Wire Draft Position
    if (wireDraft) {
      setWireDraft({
        ...wireDraft,
        currentX: coords.x,
        currentY: coords.y,
      });
    }
  };

  // Mouseup on Canvas
  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
    setWireDraft(null);
  };

  // Drag and drop node from Sidebar toolbox
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow-type') as NodeType;
    const customGateId = e.dataTransfer.getData('application/reactflow-custom-id') || undefined;
    
    if (type) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      // Align to grid
      const grid = 20;
      const rx = Math.round(coords.x / grid) * grid;
      const ry = Math.round(coords.y / grid) * grid;
      addNode(type, rx - GATE_WIDTH / 2, ry - GATE_HEIGHT / 2, customGateId);
    }
  };

  // Wire Connection Initiation
  const handlePinMouseDown = (e: React.MouseEvent, pin: Pin, node: Node) => {
    e.stopPropagation();
    const pinPos = getPinPosition(node, pin.id);
    setWireDraft({
      fromPinId: pin.id,
      currentX: pinPos.x,
      currentY: pinPos.y,
    });
  };

  // Wire Connection Drop
  const handlePinMouseUp = (e: React.MouseEvent, targetPin: Pin) => {
    e.stopPropagation();
    if (wireDraft) {
      const sourcePinId = wireDraft.fromPinId;
      
      // Prevent connecting a pin to itself
      if (sourcePinId === targetPin.id) {
        setWireDraft(null);
        return;
      }

      // Check pin directions. Wires go Output -> Input
      let outPinId = '';
      let inPinId = '';

      if (sourcePinId.includes('-out-') && targetPin.id.includes('-in-')) {
        outPinId = sourcePinId;
        inPinId = targetPin.id;
      } else if (sourcePinId.includes('-in-') && targetPin.id.includes('-out-')) {
        outPinId = targetPin.id;
        inPinId = sourcePinId;
      }

      if (outPinId && inPinId) {
        connectPins(outPinId, inPinId);
      }
    }
    setWireDraft(null);
  };

  // Node Drag Start
  const handleNodeMouseDown = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);

    // If clicking a switch, button, clock controls, handle interaction
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const targetElement = e.target as SVGElement;

    if (targetElement.classList.contains('interactive-switch')) {
      toggleSwitch(node.id);
      return;
    }

    if (targetElement.classList.contains('interactive-button')) {
      setButtonState(node.id, true);
      
      // Register button release listener on window
      const handleButtonRelease = () => {
        setButtonState(node.id, false);
        window.removeEventListener('mouseup', handleButtonRelease);
      };
      window.addEventListener('mouseup', handleButtonRelease);
      return;
    }

    setDraggedNode({
      id: node.id,
      offsetX: coords.x - node.x,
      offsetY: coords.y - node.y,
    });
  };

  // Reset Zoom Control
  const handleZoomReset = () => {
    setTransform({ x: 0, y: 0, zoom: 1 });
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 3) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.2) }));
  };

  return (
    <div
      className="canvas-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        className="canvas-svg"
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <defs>
          {/* Engineering grid pattern */}
          <pattern
            id="grid-pattern"
            width={20 * transform.zoom}
            height={20 * transform.zoom}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${20 * transform.zoom} 0 L 0 0 0 ${20 * transform.zoom}`}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="0.5"
              opacity="0.6"
            />
          </pattern>
        </defs>

        {/* Grid Background layer */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          className="canvas-grid"
        />

        {/* Scaled & Panned Group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.zoom})`}>
          
          {/* 1. RENDER WIRES (CONNECTIONS) */}
          {connections.map((conn) => {
            // Find fromNode and toNode to calculate pin positions
            let fromNode: Node | undefined;
            let toNode: Node | undefined;

            for (const n of nodes) {
              if (n.outputs.some((p) => p.id === conn.fromPinId)) fromNode = n;
              if (n.inputs.some((p) => p.id === conn.toPinId)) toNode = n;
            }

            if (!fromNode || !toNode) return null;

            const fromPos = getPinPosition(fromNode, conn.fromPinId);
            const toPos = getPinPosition(toNode, conn.toPinId);

            // Calculate Bezier control points for clean routing
            const dx = Math.abs(toPos.x - fromPos.x) * 0.5;
            const cx1 = fromPos.x + Math.max(dx, 40);
            const cy1 = fromPos.y;
            const cx2 = toPos.x - Math.max(dx, 40);
            const cy2 = toPos.y;

            const d = `M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toPos.x} ${toPos.y}`;
            const wireValue = fromNode.outputs.find((p) => p.id === conn.fromPinId)?.value ?? false;

            return (
              <g key={conn.id} className="wire-container">
                {/* Thick invisible hover stroke to make wires easy to double click */}
                <path
                  d={d}
                  className="wire-path-hover-box"
                  onDoubleClick={() => {
                    if (confirm('Delete this wire connection?')) {
                      deleteConnection(conn.id);
                    }
                  }}
                >
                  <title>Double click to delete connection</title>
                </path>
                {/* Visual Wire */}
                <path
                  d={d}
                  className={`wire-path ${wireValue ? 'high' : 'low'}`}
                />
              </g>
            );
          })}

          {/* 2. RENDER WIRING DRAFT PREVIEW */}
          {wireDraft && (() => {
            const startNode = nodes.find((n) =>
              n.inputs.some((p) => p.id === wireDraft.fromPinId) ||
              n.outputs.some((p) => p.id === wireDraft.fromPinId)
            );
            if (!startNode) return null;

            const startPos = getPinPosition(startNode, wireDraft.fromPinId);
            const fromX = startPos.x;
            const fromY = startPos.y;
            const toX = wireDraft.currentX;
            const toY = wireDraft.currentY;

            // Curved draft wire
            const dx = Math.abs(toX - fromX) * 0.5;
            const cx1 = fromX + (wireDraft.fromPinId.includes('-out-') ? Math.max(dx, 40) : -Math.max(dx, 40));
            const cy1 = fromY;
            const cx2 = toX + (wireDraft.fromPinId.includes('-in-') ? -Math.max(dx, 40) : Math.max(dx, 40));
            const cy2 = toY;

            const d = `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;

            return <path d={d} className="wire-draft-path" />;
          })()}

          {/* 3. RENDER GATE NODES */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            let customColor = '#B6E63A';

            if (node.type === 'CUSTOM' && node.customGateId && customGates[node.customGateId]) {
              customColor = customGates[node.customGateId].color;
            }

            return (
              <g
                key={node.id}
                transform={`translate(0, 0)`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDoubleClick={(e) => {
                  if (node.type === 'CUSTOM' && node.customGateId) {
                    e.stopPropagation();
                    setActiveTabId(node.customGateId);
                  }
                }}
                style={{ cursor: 'move' }}
              >
                {/* Gate Card Body */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={GATE_WIDTH}
                  height={GATE_HEIGHT}
                  rx="18"
                  className={`gate-body ${isSelected ? 'selected' : ''}`}
                  style={{
                    stroke: isSelected
                      ? 'var(--text-primary)'
                      : node.type === 'CUSTOM'
                      ? customColor
                      : 'var(--border-color)',
                    strokeWidth: isSelected ? 3.5 : 2.5,
                  }}
                />

                {/* Gate Sub-circuits indicator strip */}
                {node.type === 'CUSTOM' && (
                  <path
                    d={`M ${node.x + 10} ${node.y + 4} L ${node.x + 24} ${node.y + 4}`}
                    stroke={customColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Card Title Label */}
                <text
                  x={node.x + GATE_WIDTH / 2}
                  y={node.y + 24}
                  textAnchor="middle"
                  className="gate-label"
                >
                  {node.label || node.name}
                </text>

                {/* Draw Component Specific Visuals inside card */}
                {node.type === 'SWITCH' && (() => {
                  const val = node.outputs[0]?.value ?? false;
                  return (
                    <g transform={`translate(${node.x + GATE_WIDTH / 2 - 15}, ${node.y + 36})`}>
                      {/* Toggle visual */}
                      <rect
                        width="30"
                        height="14"
                        rx="7"
                        fill={val ? 'var(--accent)' : 'var(--border-color)'}
                        className="interactive-switch"
                        style={{ cursor: 'pointer' }}
                      />
                      <circle
                        cx={val ? 23 : 7}
                        cy="7"
                        r="5"
                        fill="var(--text-primary)"
                        className="interactive-switch"
                        style={{ cursor: 'pointer', transition: 'cx 0.1s ease' }}
                      />
                    </g>
                  );
                })()}

                {node.type === 'BUTTON' && (() => {
                  const val = node.outputs[0]?.value ?? false;
                  return (
                    <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 44})`}>
                      {/* Physical button visual */}
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill={val ? 'var(--accent)' : '#FFF'}
                        stroke="var(--text-primary)"
                        strokeWidth="1.5"
                        className="interactive-button"
                        style={{ cursor: 'pointer' }}
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill={val ? 'var(--accent-hover)' : 'var(--border-color)'}
                        className="interactive-button"
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  );
                })()}

                {node.type === 'CLOCK' && (() => {
                  const val = node.outputs[0]?.value ?? false;
                  const interval = node.clockInterval || 1000;
                  return (
                    <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 46})`}>
                      <text className="gate-subtext" textAnchor="middle">
                        {val ? '⚡ HIGH' : '💤 LOW'} ({interval}ms)
                      </text>
                    </g>
                  );
                })()}

                {node.type === 'LED' && (() => {
                  const val = node.inputs[0]?.value ?? false;
                  return (
                    <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 44})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill={val ? 'var(--logic-high)' : '#B5B7B1'}
                        stroke="var(--text-primary)"
                        strokeWidth="2"
                        style={{
                          filter: val ? 'drop-shadow(0px 0px 6px var(--logic-high))' : 'none',
                          transition: 'fill 0.15s ease',
                        }}
                      />
                    </g>
                  );
                })()}

                {/* Port Nodes In/Out labels */}
                {(node.type === 'PORT_IN' || node.type === 'PORT_OUT') && (
                  <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 46})`}>
                    <text className="gate-subtext" textAnchor="middle" style={{ fontWeight: 'bold' }}>
                      {node.type === 'PORT_IN' ? 'INPUT SOURCE' : 'OUTPUT SINK'}
                    </text>
                  </g>
                )}

                {/* Sub-circuit node internal representation label */}
                {node.type === 'CUSTOM' && (
                  <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 46})`}>
                    <text className="gate-subtext" textAnchor="middle">
                      Composite Gate
                    </text>
                  </g>
                )}

                {/* Render Logic Symbol inside core basic gates */}
                {['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(node.type) && (
                  <g transform={`translate(${node.x + GATE_WIDTH / 2}, ${node.y + 46})`}>
                    <text className="gate-subtext" textAnchor="middle">
                      {node.type} Logic
                    </text>
                  </g>
                )}

                {/* 4. RENDER INPUT PINS */}
                {node.inputs.map((pin) => {
                  const pos = getPinPosition(node, pin.id);
                  return (
                    <circle
                      key={pin.id}
                      cx={pos.x}
                      cy={pos.y}
                      r="6"
                      className={`pin-circle ${pin.value ? 'connected-high' : 'connected-low'}`}
                      onMouseDown={(e) => handlePinMouseDown(e, pin, node)}
                      onMouseUp={(e) => handlePinMouseUp(e, pin)}
                    >
                      <title>{`Input Pin ${pin.index + 1}: ${pin.value ? '1' : '0'}`}</title>
                    </circle>
                  );
                })}

                {/* 5. RENDER OUTPUT PINS */}
                {node.outputs.map((pin) => {
                  const pos = getPinPosition(node, pin.id);
                  return (
                    <circle
                      key={pin.id}
                      cx={pos.x}
                      cy={pos.y}
                      r="6"
                      className={`pin-circle ${pin.value ? 'connected-high' : 'connected-low'}`}
                      onMouseDown={(e) => handlePinMouseDown(e, pin, node)}
                      onMouseUp={(e) => handlePinMouseUp(e, pin)}
                    >
                      <title>{`Output Pin ${pin.index + 1}: ${pin.value ? '1' : '0'}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Canvas Controls */}
      <div className="canvas-controls">
        <button className="canvas-controls-btn" onClick={handleZoomIn} title="Zoom In">
          ➕
        </button>
        <button className="canvas-controls-btn" onClick={handleZoomOut} title="Zoom Out">
          ➖
        </button>
        <button className="canvas-controls-btn" onClick={handleZoomReset} title="Reset view">
          100%
        </button>
        <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', padding: '0 4px', fontWeight: 'bold' }}>
          {Math.round(transform.zoom * 100)}%
        </div>
      </div>
    </div>
  );
};
export default Canvas;
