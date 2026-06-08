import React, { useMemo, useCallback } from 'react';
import type { Node, CanvasTransform } from '../types';
import { getNodeWidth, getNodeHeight } from './Canvas';

// ─────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────
const MINIMAP_W = 200;
const MINIMAP_H = 140;
const PADDING = 20;

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────
interface BBox { minX: number; minY: number; maxX: number; maxY: number }

function getNodesBBox(nodes: Node[]): BBox | null {
  if (nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const w = getNodeWidth(n);
    const h = getNodeHeight(n);
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  }
  return { minX, minY, maxX, maxY };
}

// ─────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────
interface MinimapProps {
  nodes: Node[];
  transform: CanvasTransform;
  /** viewport size of the main SVG canvas (px) */
  viewportW: number;
  viewportH: number;
  /** called when user clicks/drags in minimap to pan */
  onPan: (newTransform: CanvasTransform) => void;
  /** collapse toggle */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  transform,
  viewportW,
  viewportH,
  onPan,
  collapsed,
  onToggleCollapse,
}) => {
  // ── Derive world bounding box from all nodes ────────────────────
  const bbox = useMemo(() => getNodesBBox(nodes), [nodes]);

  // ── Build minimap coordinate space ─────────────────────────────
  const { scaleX, scaleY, worldOffX, worldOffY } = useMemo(() => {
    if (!bbox) return { scaleX: 1, scaleY: 1, worldOffX: 0, worldOffY: 0 };

    const worldW = Math.max(bbox.maxX - bbox.minX + PADDING * 2, viewportW / transform.zoom);
    const worldH = Math.max(bbox.maxY - bbox.minY + PADDING * 2, viewportH / transform.zoom);
    const worldOffX = bbox.minX - PADDING;
    const worldOffY = bbox.minY - PADDING;

    return {
      scaleX: MINIMAP_W / worldW,
      scaleY: MINIMAP_H / worldH,
      worldOffX,
      worldOffY,
    };
  }, [bbox, transform.zoom, viewportW, viewportH]);

  // ── Map world→minimap ──────────────────────────────────────────
  const toMini = useCallback((wx: number, wy: number) => ({
    mx: (wx - worldOffX) * scaleX,
    my: (wy - worldOffY) * scaleY,
  }), [scaleX, scaleY, worldOffX, worldOffY]);

  // ── Viewport rectangle in minimap space ────────────────────────
  const viewportRect = useMemo(() => {
    // Top-left of visible world
    const vLeft = -transform.x / transform.zoom;
    const vTop = -transform.y / transform.zoom;
    const vW = viewportW / transform.zoom;
    const vH = viewportH / transform.zoom;

    const { mx: rx, my: ry } = toMini(vLeft, vTop);
    const rw = vW * scaleX;
    const rh = vH * scaleY;
    return { x: rx, y: ry, w: rw, h: rh };
  }, [transform, viewportW, viewportH, toMini, scaleX, scaleY]);

  // ── Click/drag to pan main canvas ──────────────────────────────
  const handleMinimapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert minimap click → world center
    const wCx = mx / scaleX + worldOffX;
    const wCy = my / scaleY + worldOffY;

    // Pan so the world center is centered in viewport
    const newX = viewportW / 2 - wCx * transform.zoom;
    const newY = viewportH / 2 - wCy * transform.zoom;
    onPan({ ...transform, x: newX, y: newY });
  }, [scaleX, scaleY, worldOffX, worldOffY, viewportW, viewportH, transform, onPan]);

  return (
    <div className="minimap-container">
      <div className="minimap-header" onClick={onToggleCollapse}>
        <span className="minimap-title">⊞ 미니맵</span>
        <span className="minimap-toggle">{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <svg
          className="minimap-svg"
          width={MINIMAP_W}
          height={MINIMAP_H}
          onClick={handleMinimapClick}
          style={{ cursor: 'crosshair' }}
        >
          {/* Background */}
          <rect x={0} y={0} width={MINIMAP_W} height={MINIMAP_H} className="minimap-bg" />

          {/* Node rectangles */}
          {nodes.map((node) => {
            const nw = getNodeWidth(node);
            const nh = getNodeHeight(node);
            const { mx, my } = toMini(node.x, node.y);
            const mw = nw * scaleX;
            const mh = nh * scaleY;
            return (
              <rect
                key={node.id}
                x={mx}
                y={my}
                width={Math.max(mw, 3)}
                height={Math.max(mh, 3)}
                rx={2}
                className={`minimap-node minimap-node--${node.type.toLowerCase()}`}
              />
            );
          })}

          {/* Viewport indicator */}
          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={Math.max(viewportRect.w, 10)}
            height={Math.max(viewportRect.h, 10)}
            className="minimap-viewport"
          />
        </svg>
      )}
    </div>
  );
};

export default Minimap;
