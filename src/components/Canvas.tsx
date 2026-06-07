import React, { useState, useRef } from 'react';
import type { Node, Pin, NodeType, SubCircuitDefinition } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';
import { sortSubCircuitPorts } from '../utils/simulation';

export const GATE_WIDTH = 110;
export const GATE_HEIGHT = 70;

export function getNodeWidth(node: Node) {
  if (node.width !== undefined) return node.width;
  if (node.type === 'CUSTOM') return 145; // Make custom gates wider by default (from 110)
  return GATE_WIDTH;
}

export function getNodeHeight(node: Node) {
  if (node.height !== undefined) return node.height;
  if (node.type === 'CUSTOM') {
    const maxPins = Math.max(node.inputs.length, node.outputs.length);
    // Generous default size + per-pin padding to keep labels separated
    return Math.max(105, maxPins * 28 + 14);
  }
  return GATE_HEIGHT;
}

export function getPinPosition(node: Node, pinId: string) {
  const isInput = node.inputs.some((p) => p.id === pinId);
  const pin = isInput
    ? node.inputs.find((p) => p.id === pinId)
    : node.outputs.find((p) => p.id === pinId);

  if (!pin) return { x: node.x, y: node.y };

  const index = pin.index;
  const totalPins = isInput ? node.inputs.length : node.outputs.length;
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);

  const x = isInput ? node.x : node.x + width;
  const y = node.y + (index + 1) * (height / (totalPins + 1));

  return { x, y };
}

export function getPinLabel(
  node: Node,
  pin: Pin,
  customGates: Record<string, SubCircuitDefinition>
) {
  if (node.type !== 'CUSTOM' || !node.customGateId) return null;
  const def = customGates[node.customGateId];
  if (!def) return null;

  if (pin.type === 'input') {
    const portInNodes = sortSubCircuitPorts(def.nodes, 'PORT_IN', node.customGateId);
    const matchingPort = portInNodes[pin.index];
    return matchingPort ? (matchingPort.label || matchingPort.name) : null;
  } else {
    const portOutNodes = sortSubCircuitPorts(def.nodes, 'PORT_OUT', node.customGateId);
    const matchingPort = portOutNodes[pin.index];
    return matchingPort ? (matchingPort.label || matchingPort.name) : null;
  }
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
    selectedNodeIds,
    setSelectedNodeIds,
    moveNodes,
    resizeNode,
    connectPins,
    deleteConnection,
    toggleSwitch,
    setButtonState,
    addNode,
    wireDraft,
    setWireDraft,
    setActiveTabId,
    showPinLabels,
  } = circuit;

  const { nodes, connections } = activeTab.state;

  const svgRef = useRef<SVGSVGElement>(null);
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodes, setDraggedNodes] = useState<{ id: string; dragOffsetX: number; dragOffsetY: number }[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [resizedNode, setResizedNode] = useState<{ id: string; startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);

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

  // Mousedown on Canvas background (for panning or marquee select)
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('canvas-grid')) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      
      if (canvasMode === 'pan' || e.button === 1 || e.button === 2) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      } else {
        // Selection Box start
        setSelectionBox({
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
        });
        
        // Clear selection unless Shift or Ctrl or Meta is held
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          setSelectedNodeIds([]);
        }
      }
    }
  };

  // Mousemove on Canvas (dragging nodes, selection box, panning, draft wires)
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

    // 2. Selection Box drag
    if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));
      
      const x = Math.min(selectionBox.startX, coords.x);
      const y = Math.min(selectionBox.startY, coords.y);
      const w = Math.abs(selectionBox.startX - coords.x);
      const h = Math.abs(selectionBox.startY - coords.y);
      
      const overlappedIds: string[] = [];
      nodes.forEach((node) => {
        const nw = getNodeWidth(node);
        const nh = getNodeHeight(node);
        const nodeOverlaps = (
          node.x < x + w &&
          node.x + nw > x &&
          node.y < y + h &&
          node.y + nh > y
        );
        if (nodeOverlaps) {
          overlappedIds.push(node.id);
        }
      });
      setSelectedNodeIds(overlappedIds);
    }

    // 3. Drag Group of Nodes
    if (draggedNodes.length > 0) {
      const updates = draggedNodes.map((dn) => {
        const snapGrid = 20;
        const targetX = Math.round((coords.x - dn.dragOffsetX) / snapGrid) * snapGrid;
        const targetY = Math.round((coords.y - dn.dragOffsetY) / snapGrid) * snapGrid;
        return { id: dn.id, x: targetX, y: targetY };
      });
      moveNodes(updates);
    }

    // 5. Resize Node
    if (resizedNode) {
      const dx = coords.x - resizedNode.startX;
      const dy = coords.y - resizedNode.startY;
      const targetWidth = Math.max(80, Math.round((resizedNode.startWidth + dx) / 10) * 10);
      const targetHeight = Math.max(50, Math.round((resizedNode.startHeight + dy) / 10) * 10);
      resizeNode(resizedNode.id, targetWidth, targetHeight);
    }

    // 4. Update Wire Draft Position
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
    setDraggedNodes([]);
    setSelectionBox(null);
    setWireDraft(null);
    setResizedNode(null);
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
    
    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
    let nextSelectedIds = [...selectedNodeIds];

    if (isMulti) {
      if (nextSelectedIds.includes(node.id)) {
        nextSelectedIds = nextSelectedIds.filter((id) => id !== node.id);
      } else {
        nextSelectedIds.push(node.id);
      }
      setSelectedNodeIds(nextSelectedIds);
    } else {
      if (!selectedNodeIds.includes(node.id)) {
        setSelectedNodeIds([node.id]);
      }
    }

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

    // Prepare group dragging offsets
    const activeDragSelection = isMulti
      ? nextSelectedIds
      : selectedNodeIds.includes(node.id)
      ? selectedNodeIds
      : [node.id];

    const currentDragged = nodes
      .filter((n) => activeDragSelection.includes(n.id))
      .map((n) => ({
        id: n.id,
        dragOffsetX: coords.x - n.x,
        dragOffsetY: coords.y - n.y,
      }));

    setDraggedNodes(currentDragged);
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
        onContextMenu={(e) => e.preventDefault()}
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
              <g 
                key={conn.id} 
                className="wire-container"
                onMouseEnter={() => setHoveredWireId(conn.id)}
                onMouseLeave={() => setHoveredWireId(null)}
              >
                {/* Thick invisible hover stroke to make wires easy to click */}
                <path
                  d={d}
                  className="wire-path-hover-box"
                  onDoubleClick={() => {
                    deleteConnection(conn.id);
                  }}
                >
                  <title>Double click to delete connection</title>
                </path>
                {/* Visual Wire */}
                <path
                  d={d}
                  className={`wire-path ${wireValue ? 'high' : 'low'}`}
                />
                {/* Signal Flow Particles */}
                {wireValue && (
                  <path
                    d={d}
                    className="wire-particles"
                  />
                )}
                {/* Midpoint delete button on hover */}
                {hoveredWireId === conn.id && (() => {
                  const midX = 0.125 * fromPos.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * toPos.x;
                  const midY = 0.125 * fromPos.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * toPos.y;
                  return (
                    <g
                      className="wire-delete-group"
                      transform={`translate(${midX}, ${midY})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection(conn.id);
                        setHoveredWireId(null);
                      }}
                    >
                      <circle r="8.5" className="wire-delete-btn-bg" />
                      <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" className="wire-delete-btn-icon" />
                      <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" className="wire-delete-btn-icon" />
                      <title>Delete connection</title>
                    </g>
                  );
                })()}
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
            const isSelected = selectedNodeIds.includes(node.id);
            const width = getNodeWidth(node);
            const height = getNodeHeight(node);
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
                  width={width}
                  height={height}
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
                  x={node.x + width / 2}
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
                    <g transform={`translate(${node.x + width / 2 - 15}, ${node.y + height / 2 - 7})`}>
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
                    <g transform={`translate(${node.x + width / 2}, ${node.y + height / 2 + 9})`}>
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
                    <g transform={`translate(${node.x + width / 2}, ${node.y + height - 18})`}>
                      <text className="gate-subtext" textAnchor="middle">
                        {val ? '⚡ HIGH' : '💤 LOW'} ({interval}ms)
                      </text>
                    </g>
                  );
                })()}

                {node.type === 'LED' && (() => {
                  const val = node.inputs[0]?.value ?? false;
                  return (
                    <g transform={`translate(${node.x + width / 2}, ${node.y + height / 2 + 9})`}>
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
                {node.type === 'PORT_OUT' && (
                  <g transform={`translate(${node.x + width / 2}, ${node.y + height - 18})`}>
                    <text className="gate-subtext" textAnchor="middle" style={{ fontWeight: 'bold' }}>
                      OUTPUT SINK
                    </text>
                  </g>
                )}

                {node.type === 'PORT_IN' && (() => {
                  const val = node.outputs[0]?.value ?? false;
                  return (
                    <g>
                      <g transform={`translate(${node.x + width / 2}, ${node.y + height - 12})`}>
                        <text className="gate-subtext" textAnchor="middle" style={{ fontWeight: 'bold' }}>
                          TEST INPUT
                        </text>
                      </g>
                      <g transform={`translate(${node.x + width / 2 - 15}, ${node.y + height / 2 - 10})`}>
                        {/* Toggle switch for testing */}
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
                    </g>
                  );
                })()}

                {/* Sub-circuit node internal representation label */}
                {node.type === 'CUSTOM' && (
                  <g transform={`translate(${node.x + width / 2}, ${node.y + height - 18})`}>
                    <text className="gate-subtext" textAnchor="middle">
                      Composite Gate
                    </text>
                  </g>
                )}

                {/* Render Logic Symbol inside core basic gates */}
                {['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(node.type) && (
                  <g transform={`translate(${node.x + width / 2}, ${node.y + height - 18})`}>
                    <text className="gate-subtext" textAnchor="middle">
                      {node.type} Logic
                    </text>
                  </g>
                )}

                {/* Resize Handle (visible when selected) */}
                {isSelected && (
                  <g
                    transform={`translate(${node.x + width - 12}, ${node.y + height - 12})`}
                    style={{ cursor: 'se-resize' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const coords = getCanvasCoords(e.clientX, e.clientY);
                      setResizedNode({
                        id: node.id,
                        startWidth: width,
                        startHeight: height,
                        startX: coords.x,
                        startY: coords.y,
                      });
                    }}
                  >
                    <path
                      d="M 10 0 L 0 10 M 10 4 L 4 10 M 10 8 L 8 10"
                      stroke="var(--text-muted)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                  </g>
                )}

                {/* 4. RENDER INPUT PINS */}
                {node.inputs.map((pin) => {
                  const pos = getPinPosition(node, pin.id);
                  const label = getPinLabel(node, pin, customGates);
                  return (
                    <g key={pin.id}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="6"
                        className={`pin-circle ${pin.value ? 'connected-high' : 'connected-low'}`}
                        onMouseDown={(e) => handlePinMouseDown(e, pin, node)}
                        onMouseUp={(e) => handlePinMouseUp(e, pin)}
                      >
                        <title>{`Input Pin ${pin.index + 1}: ${pin.value ? '1' : '0'}`}</title>
                      </circle>
                      {showPinLabels && label && (
                        <text
                          x={pos.x + 12}
                          y={pos.y}
                          dy="0.32em"
                          textAnchor="start"
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            fontFamily: 'var(--mono)',
                            fill: 'var(--text-primary)',
                            opacity: 0.8,
                            pointerEvents: 'none',
                          }}
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 5. RENDER OUTPUT PINS */}
                {node.outputs.map((pin) => {
                  const pos = getPinPosition(node, pin.id);
                  const label = getPinLabel(node, pin, customGates);
                  return (
                    <g key={pin.id}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="6"
                        className={`pin-circle ${pin.value ? 'connected-high' : 'connected-low'}`}
                        onMouseDown={(e) => handlePinMouseDown(e, pin, node)}
                        onMouseUp={(e) => handlePinMouseUp(e, pin)}
                      >
                        <title>{`Output Pin ${pin.index + 1}: ${pin.value ? '1' : '0'}`}</title>
                      </circle>
                      {showPinLabels && label && (
                        <text
                          x={pos.x - 12}
                          y={pos.y}
                          dy="0.32em"
                          textAnchor="end"
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            fontFamily: 'var(--mono)',
                            fill: 'var(--text-primary)',
                            opacity: 0.8,
                            pointerEvents: 'none',
                          }}
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* 6. RENDER SELECTION BOX OVERLAY */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.startX - selectionBox.currentX)}
              height={Math.abs(selectionBox.startY - selectionBox.currentY)}
              fill="var(--accent-light)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="4, 4"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* Floating Canvas Controls */}
      <div className="canvas-controls">
        {/* Toggle Mode: Select vs Pan */}
        <button 
          className={`canvas-controls-btn ${canvasMode === 'select' ? 'primary' : ''}`} 
          onClick={() => {
            setCanvasMode('select');
            setIsPanning(false);
          }}
          title="Select Mode (Draw marquee selection or select/move nodes)"
        >
          🔍 Select
        </button>
        <button 
          className={`canvas-controls-btn ${canvasMode === 'pan' ? 'primary' : ''}`} 
          onClick={() => {
            setCanvasMode('pan');
            setSelectionBox(null);
          }}
          title="Pan Mode (Click & drag canvas background to pan)"
        >
          🖐️ Pan
        </button>
        
        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

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
