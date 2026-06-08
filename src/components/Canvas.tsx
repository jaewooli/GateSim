import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Node, Pin, NodeType, SubCircuitDefinition } from '../types';
import type { CircuitHook } from '../hooks/useCircuitState';
import type { CollabState, CollabActions } from '../hooks/useCollaboration';
import { sortSubCircuitPorts } from '../utils/simulation';
import { Minimap } from './Minimap';

export const GATE_WIDTH = 110;
export const GATE_HEIGHT = 70;

export function getNodeWidth(node: Node) {
  if (node.width !== undefined) return node.width;
  if (node.type === 'CUSTOM') return 145; // Make custom gates wider by default (from 110)
  if (node.type.startsWith('BUS_')) return 130;
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
  collab?: CollabState & CollabActions;
}

export const Canvas: React.FC<CanvasProps> = ({ circuit, collab }) => {
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
  const [wireBitWidth, setWireBitWidth] = useState<1 | 8 | 16 | 32>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodes, setDraggedNodes] = useState<{ id: string; dragOffsetX: number; dragOffsetY: number }[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [resizedNode, setResizedNode] = useState<{ id: string; startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);

  // Cursor Chat (Figma-like Spacebar Chat)
  const [cursorChat, setCursorChat] = useState<{
    active: boolean;
    text: string;
    canvasX: number;
    canvasY: number;
  }>({
    active: false,
    text: '',
    canvasX: 0,
    canvasY: 0,
  });

  const [localFinalBubble, setLocalFinalBubble] = useState<{
    text: string;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  const latestMouseRef = useRef({ canvasX: 0, canvasY: 0 });
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Focus chat input when activated
  useEffect(() => {
    if (cursorChat.active && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [cursorChat.active]);

  // Spacebar global keyboard listener to open chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return; // ignore if typing in fields
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (!collab?.isConnected) return;
        e.preventDefault();
        setCursorChat((prev) => {
          if (prev.active) return prev;
          return {
            active: true,
            text: '',
            canvasX: latestMouseRef.current.canvasX,
            canvasY: latestMouseRef.current.canvasY,
          };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collab?.isConnected]);

  // Viewport size tracking for minimap
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // Touch tracking refs for mobile/tablet zoom and pan
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const buildExportSvgMarkup = () => {
    if (!svgRef.current) return null;

    const sourceSvg = svgRef.current;
    const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
    const rect = sourceSvg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const computed = getComputedStyle(document.body);
    const cssVar = (name: string) => computed.getPropertyValue(name).trim();

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clone.setAttribute(
      'style',
      [
        `--primary-bg: ${cssVar('--primary-bg')}`,
        `--secondary-bg: ${cssVar('--secondary-bg')}`,
        `--accent: ${cssVar('--accent')}`,
        `--accent-hover: ${cssVar('--accent-hover')}`,
        `--accent-light: ${cssVar('--accent-light')}`,
        `--text-primary: ${cssVar('--text-primary')}`,
        `--text-muted: ${cssVar('--text-muted')}`,
        `--border-color: ${cssVar('--border-color')}`,
        `--logic-low: ${cssVar('--logic-low')}`,
        `--logic-high: ${cssVar('--logic-high')}`,
        `font-family: ${cssVar('--sans') || 'system-ui, sans-serif'}`,
        `background-color: ${cssVar('--primary-bg')}`,
      ].join('; ')
    );

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .canvas-grid { fill: var(--primary-bg); }
      .gate-body { fill: var(--secondary-bg); stroke: var(--border-color); stroke-width: 2.5; }
      .gate-body.selected { stroke: var(--text-primary); stroke-width: 3.5; }
      .gate-label { font-family: system-ui, sans-serif; font-size: 13px; font-weight: 700; fill: var(--text-primary); }
      .gate-subtext { font-family: ui-monospace, monospace; font-size: 10px; fill: var(--text-muted); }
      .pin-circle { fill: var(--secondary-bg); stroke: var(--border-color); stroke-width: 2; }
      .pin-circle.connected-high { fill: var(--logic-high); stroke: var(--logic-high); }
      .pin-circle.connected-low { fill: var(--logic-low); stroke: var(--border-color); }
      .wire-path { fill: none; stroke-width: 3; }
      .wire-path.high { stroke: var(--logic-high); stroke-width: 3.5; }
      .wire-path.low { stroke: var(--logic-low); stroke-width: 3; }
      .wire-path-hover-box, .wire-delete-group, .wire-particles { display: none; }
      .wire-draft-path { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 6 6; }
      text { dominant-baseline: auto; }
    `;
    clone.insertBefore(style, clone.firstChild);

    return new XMLSerializer().serializeToString(clone);
  };

  const downloadBlob = (blob: Blob, extension: 'svg' | 'png') => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gatesim-${activeTab.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportVisibleCanvas = async (format: 'svg' | 'png') => {
    const svgMarkup = buildExportSvgMarkup();
    if (!svgMarkup) return;

    if (format === 'svg') {
      downloadBlob(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }), 'svg');
      return;
    }

    const sourceSvg = svgRef.current;
    if (!sourceSvg) return;

    const rect = sourceSvg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) downloadBlob(blob, 'png');
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Could not export PNG from the current canvas.');
    };

    img.src = url;
  };

  useEffect(() => {
    const handleExportRequest = (event: Event) => {
      const format = (event as CustomEvent<'svg' | 'png'>).detail;
      void exportVisibleCanvas(format);
    };

    window.addEventListener('gatesim:export-canvas', handleExportRequest);
    return () => window.removeEventListener('gatesim:export-canvas', handleExportRequest);
  });

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

    // Track latest mouse coordinates for cursor chat
    latestMouseRef.current = { canvasX: coords.x, canvasY: coords.y };
    if (cursorChat.active) {
      setCursorChat((prev) => ({
        ...prev,
        canvasX: coords.x,
        canvasY: coords.y,
      }));
    }

    // Send cursor position to collab peers
    if (collab?.isConnected) {
      collab.sendCursor(coords.x, coords.y);
    }

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
    
    // 내 화면 즉시 갱신
    moveNodes(updates);
    
    if (collab?.isConnected) {
      updates.forEach((up) => {
        // 내가 확실히 락을 쥔 노드일 때만 실시간 브로드캐스트
        if (collab.iLockedBy(up.id)) {
          collab.broadcastOp({
            op: 'MOVE_NODE',
            payload: { nodeId: up.id, x: up.x, y: up.y }
          });
        }
      });
    }
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
    // Release collab locks for all dragged nodes
    if (collab?.isConnected && draggedNodes.length > 0) {
      draggedNodes.forEach((dn) => handleCollabRelease(dn.id));
      circuit.setIsDragging(false);
    }
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
      bitWidth: pin.busWidth || wireBitWidth,
    });
  };

  // Touch handlers for mobile/tablet interaction
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('canvas-grid')) {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
      }
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      setDraggedNodes([]);
      setSelectionBox(null);
      setWireDraft(null);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      lastTouchDistance.current = dist;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      lastTouchCenter.current = { x: midX, y: midY };
      setPanStart({ x: midX - transform.x, y: midY - transform.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setTransform((prev) => ({
        ...prev,
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      }));
    } else if (e.touches.length === 1 && draggedNodes.length > 0) {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      const updates = draggedNodes.map((dn) => {
        const snapGrid = 20;
        const targetX = Math.round((coords.x - dn.dragOffsetX) / snapGrid) * snapGrid;
        const targetY = Math.round((coords.y - dn.dragOffsetY) / snapGrid) * snapGrid;
        return { id: dn.id, x: targetX, y: targetY };
      });
      moveNodes(updates);
    } else if (e.touches.length === 1 && wireDraft) {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      setWireDraft({
        ...wireDraft,
        currentX: coords.x,
        currentY: coords.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current && lastTouchCenter.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      
      const factor = dist / lastTouchDistance.current;
      const newZoom = Math.min(Math.max(transform.zoom * factor, 0.2), 3);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      setTransform((prev) => ({
        zoom: newZoom,
        x: midX - (midX - prev.x) * (newZoom / prev.zoom),
        y: midY - (midY - prev.y) * (newZoom / prev.zoom),
      }));

      lastTouchDistance.current = dist;
      lastTouchCenter.current = { x: midX, y: midY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (wireDraft) {
      const touch = e.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const pinElement = element?.closest('.pin-circle') as SVGElement | null;
      if (pinElement) {
        const targetPinId = pinElement.getAttribute('data-pin-id');
        if (targetPinId && wireDraft.fromPinId !== targetPinId) {
          let outPinId = '';
          let inPinId = '';
          if (wireDraft.fromPinId.includes('-out-') && targetPinId.includes('-in-')) {
            outPinId = wireDraft.fromPinId;
            inPinId = targetPinId;
          } else if (wireDraft.fromPinId.includes('-in-') && targetPinId.includes('-out-')) {
            outPinId = targetPinId;
            inPinId = wireDraft.fromPinId;
          }
          if (outPinId && inPinId) {
            connectPins(outPinId, inPinId, wireDraft.bitWidth);
          }
        }
      }
    }

    setIsPanning(false);
    setDraggedNodes([]);
    setSelectionBox(null);
    setWireDraft(null);
    setResizedNode(null);
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
  };

  // Node Drag Start on Touch
  const handleNodeTouchStart = (e: React.TouchEvent, node: Node) => {
    e.stopPropagation();
    
    if (!selectedNodeIds.includes(node.id)) {
      setSelectedNodeIds([node.id]);
    }

    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    const targetElement = e.target as SVGElement;

    if (targetElement.classList.contains('interactive-switch')) {
      toggleSwitch(node.id);
      return;
    }

    if (targetElement.classList.contains('interactive-button')) {
      setButtonState(node.id, true);
      const handleTouchButtonRelease = () => {
        setButtonState(node.id, false);
        window.removeEventListener('touchend', handleTouchButtonRelease);
      };
      window.addEventListener('touchend', handleTouchButtonRelease);
      return;
    }

    const activeDragSelection = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
    const currentDragged = nodes
      .filter((n) => activeDragSelection.includes(n.id))
      .map((n) => ({
        id: n.id,
        dragOffsetX: coords.x - n.x,
        dragOffsetY: coords.y - n.y,
      }));

    setDraggedNodes(currentDragged);
  };

  const handlePinTouchStart = (e: React.TouchEvent, pin: Pin, node: Node) => {
    e.stopPropagation();
    const pinPos = getPinPosition(node, pin.id);
    setWireDraft({
      fromPinId: pin.id,
      currentX: pinPos.x,
      currentY: pinPos.y,
      bitWidth: pin.busWidth || wireBitWidth,
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
        connectPins(outPinId, inPinId, wireDraft.bitWidth);
      }
    }
    setWireDraft(null);
  };

  // Lock node on drag start (collab)
  const handleCollabLock = useCallback((nodeId: string) => {
    if (collab?.isConnected) collab.requestLock(nodeId);
  }, [collab]);

  const handleCollabRelease = useCallback((nodeId: string) => {
    if (collab?.isConnected) collab.releaseLock(nodeId);
  }, [collab]);

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

    if (collab?.isConnected) {
      nextSelectedIds.forEach((id) => handleCollabLock(id));
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
    // Request lock for all nodes being dragged
    if (collab?.isConnected) {
      activeDragSelection.forEach((id) => handleCollabLock(id));
    }
  };

useEffect(() => {
    if (!collab?.isConnected) return;

    setSelectedNodeIds((prevSelected) => {
      const nextSelected = prevSelected.filter((nodeId) => {
        const currentLock = collab.locks[nodeId];
        if (!currentLock || currentLock.clientId === collab.myClientId) {
          return true;
        }        
        return false;
      });
      
      if (prevSelected.length !== nextSelected.length) {
        return nextSelected;
      }
      return prevSelected;
    });
  }, [collab?.locks, collab?.isConnected, setSelectedNodeIds]);
  
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            const fromPin = fromNode.outputs.find((p) => p.id === conn.fromPinId);
            const wireValue = fromPin?.busValue !== undefined ? fromPin.busValue !== 0 : fromPin?.value ?? false;
            const bitWidth = conn.bitWidth || 1;
            const isBus = bitWidth > 1;

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
                  className={`wire-path ${wireValue ? 'high' : 'low'} ${isBus ? 'bus' : ''}`}
                  style={{
                    strokeWidth: isBus ? 7 : undefined,
                  }}
                />
                {isBus && (
                  <g transform={`translate(${0.125 * fromPos.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * toPos.x}, ${0.125 * fromPos.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * toPos.y})`}>
                    <rect x="-17" y="-10" width="34" height="20" rx="5" fill="var(--secondary-bg)" stroke="var(--border-color)" strokeWidth="1.5" />
                    <text textAnchor="middle" dy="0.35em" className="gate-subtext" style={{ fontWeight: 800 }}>
                      {bitWidth}b
                    </text>
                  </g>
                )}
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

            return (
              <g>
                <path
                  d={d}
                  className="wire-draft-path"
                  style={{ strokeWidth: (wireDraft.bitWidth || 1) > 1 ? 7 : undefined }}
                />
                {(wireDraft.bitWidth || 1) > 1 && (
                  <text x={toX + 12} y={toY - 12} className="gate-subtext" style={{ fontWeight: 800 }}>
                    {wireDraft.bitWidth}b bus
                  </text>
                )}
              </g>
            );
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
                onTouchStart={(e) => handleNodeTouchStart(e, node)}
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

                {node.type === 'BUS_INPUT' && (() => {
                  const widthBits = node.busWidth || 8;
                  const busValue = node.outputs[0]?.busValue ?? node.busValue ?? 0;
                  return (
                    <g transform={`translate(${node.x + width / 2}, ${node.y + height / 2 + 9})`}>
                      <text className="gate-subtext" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 900 }}>
                        0x{busValue.toString(16).toUpperCase().padStart(Math.ceil(widthBits / 4), '0')}
                      </text>
                      <text className="gate-subtext" textAnchor="middle" y="18">
                        {widthBits}-bit source
                      </text>
                    </g>
                  );
                })()}

                {node.type === 'BUS_OUTPUT' && (() => {
                  const widthBits = node.busWidth || node.inputs[0]?.busWidth || 8;
                  const busValue = node.inputs[0]?.busValue ?? 0;
                  return (
                    <g transform={`translate(${node.x + width / 2}, ${node.y + height / 2 + 9})`}>
                      <text className="gate-subtext" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 900 }}>
                        0x{busValue.toString(16).toUpperCase().padStart(Math.ceil(widthBits / 4), '0')}
                      </text>
                      <text className="gate-subtext" textAnchor="middle" y="18">
                        {widthBits}-bit sink
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

                {node.type.startsWith('BUS_') && !['BUS_INPUT', 'BUS_OUTPUT'].includes(node.type) && (
                  <g transform={`translate(${node.x + width / 2}, ${node.y + height - 18})`}>
                    <text className="gate-subtext" textAnchor="middle">
                      {node.type.replace('BUS_', '')} {node.busWidth || 8}-bit
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
                        onTouchStart={(e) => handlePinTouchStart(e, pin, node)}
                        data-pin-id={pin.id}
                      >
                          <title>{`Input Pin ${pin.index + 1}: ${pin.busValue !== undefined ? `0x${pin.busValue.toString(16).toUpperCase()}` : pin.value ? '1' : '0'}`}</title>
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
                        onTouchStart={(e) => handlePinTouchStart(e, pin, node)}
                        data-pin-id={pin.id}
                      >
                          <title>{`Output Pin ${pin.index + 1}: ${pin.busValue !== undefined ? `0x${pin.busValue.toString(16).toUpperCase()}` : pin.value ? '1' : '0'}`}</title>
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

          {/* 7. REMOTE CURSORS (collab) */}
          {collab?.isConnected && collab.members.map((member) => {
            if (!member.cursor) return null;
            const { x, y } = member.cursor;
            return (
              <g key={member.clientId} transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
                {/* Cursor arrow */}
                <path
                  d="M 0 0 L 0 16 L 4 13 L 7 20 L 9 19 L 6 12 L 11 12 Z"
                  fill={member.color}
                  stroke="#fff"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                {/* Username label */}
                <rect x="12" y="14" width={member.username.length * 7 + 10} height="18" rx="4" fill={member.color} opacity="0.92" />
                <text x="17" y="27" style={{ fontSize: '11px', fontWeight: 700, fill: '#fff', fontFamily: 'var(--sans)' }}>
                  {member.username}
                </text>
              </g>
            );
          })}

          {/* 8. COLLAB LOCK INDICATORS */}
          {collab?.isConnected && nodes.map((node) => {
            const lock = collab.locks[node.id];
            if (!lock) return null;
            const isMe = lock.clientId === collab.myClientId;
            const w = getNodeWidth(node);
            return (
              <g key={`lock-${node.id}`} style={{ pointerEvents: 'none' }}>
                <rect
                  x={node.x - 3}
                  y={node.y - 3}
                  width={w + 6}
                  height={getNodeHeight(node) + 6}
                  rx={21}
                  fill="none"
                  stroke={lock.color}
                  strokeWidth={isMe ? 2 : 2.5}
                  strokeDasharray={isMe ? '0' : '5 3'}
                  opacity={0.85}
                />
                {!isMe && (
                  <>
                    <rect
                      x={node.x + w / 2 - 30}
                      y={node.y - 19}
                      width={60}
                      height={16}
                      rx={4}
                      fill={lock.color}
                      opacity={0.92}
                    />
                    <text
                      x={node.x + w / 2}
                      y={node.y - 7}
                      textAnchor="middle"
                      style={{ fontSize: '9px', fontWeight: 700, fill: '#fff', fontFamily: 'var(--sans)' }}
                    >
                      {lock.username}
                    </text>
                  </>
                )}
              </g>
            );
          })}
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

        <select
          value={wireBitWidth}
          onChange={(e) => setWireBitWidth(Number(e.target.value) as 1 | 8 | 16 | 32)}
          title="Wire width"
          style={{
            height: '31px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--secondary-bg)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 800,
            padding: '0 8px',
          }}
        >
          <option value={1}>1b</option>
          <option value={8}>8b</option>
          <option value={16}>16b</option>
          <option value={32}>32b</option>
        </select>

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

      {/* Minimap overlay (bottom-right) */}
      <Minimap
        nodes={nodes}
        transform={transform}
        viewportW={viewportSize.w}
        viewportH={viewportSize.h}
        onPan={(t) => setTransform(t)}
        collapsed={minimapCollapsed}
        onToggleCollapse={() => setMinimapCollapsed((v) => !v)}
      />

      {/* 9. CURSOR CHAT OVERLAYS (Figma-like Spacebar Chat) */}
      {collab?.isConnected && (
        <div 
          className="cursor-chats-overlay-container" 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none', 
            overflow: 'hidden',
            zIndex: 999 
          }}
        >
          {/* Local User Active Chat Input */}
          {cursorChat.active && (
            <div
              className="cursor-chat-bubble local"
              style={{
                position: 'absolute',
                left: `${cursorChat.canvasX * transform.zoom + transform.x}px`,
                top: `${cursorChat.canvasY * transform.zoom + transform.y}px`,
                borderColor: collab.myColor || 'var(--accent)',
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="cursor-chat-dot" style={{ backgroundColor: collab.myColor || 'var(--accent)' }} />
              <input
                ref={chatInputRef}
                type="text"
                value={cursorChat.text}
                placeholder="Say something..."
                onChange={(e) => {
                  const val = e.target.value;
                  setCursorChat((prev) => ({ ...prev, text: val }));
                  collab.sendCursorChat(val, false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = cursorChat.text.trim();
                    if (trimmed) {
                      collab.sendCursorChat(trimmed, true);
                      setLocalFinalBubble({
                        text: trimmed,
                        canvasX: cursorChat.canvasX,
                        canvasY: cursorChat.canvasY,
                      });
                      setTimeout(() => {
                        setLocalFinalBubble((prev) => (prev?.text === trimmed ? null : prev));
                      }, 5000);
                    } else {
                      collab.sendCursorChat('', false);
                    }
                    setCursorChat((prev) => ({ ...prev, active: false, text: '' }));
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    collab.sendCursorChat('', false);
                    setCursorChat((prev) => ({ ...prev, active: false, text: '' }));
                  }
                }}
                onBlur={() => {
                  collab.sendCursorChat('', false);
                  setCursorChat((prev) => ({ ...prev, active: false, text: '' }));
                }}
              />
            </div>
          )}

          {/* Local User Finalized Chat Bubble */}
          {localFinalBubble && (
            <div
              className="cursor-chat-bubble local-final"
              style={{
                position: 'absolute',
                left: `${localFinalBubble.canvasX * transform.zoom + transform.x}px`,
                top: `${localFinalBubble.canvasY * transform.zoom + transform.y}px`,
                borderColor: collab.myColor || 'var(--accent)',
              }}
            >
              <span className="cursor-chat-dot" style={{ backgroundColor: collab.myColor || 'var(--accent)' }} />
              <div className="cursor-chat-text">
                <span className="cursor-chat-user">나:</span> {localFinalBubble.text}
              </div>
            </div>
          )}

          {/* Remote Users Chat Bubbles */}
          {collab.members.map((member) => {
            if (!member.cursor || !member.chatText) return null;
            return (
              <div
                key={`chat-${member.clientId}`}
                className="cursor-chat-bubble remote"
                style={{
                  position: 'absolute',
                  left: `${member.cursor.x * transform.zoom + transform.x}px`,
                  top: `${member.cursor.y * transform.zoom + transform.y}px`,
                  borderColor: member.color,
                }}
              >
                <span className="cursor-chat-dot" style={{ backgroundColor: member.color }} />
                <div className="cursor-chat-text">
                  <span className="cursor-chat-user">{member.username}:</span> {member.chatText}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Canvas;
