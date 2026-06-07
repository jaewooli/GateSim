import React, { useState } from 'react';
import type { CircuitHook } from '../hooks/useCircuitState';

interface WaveformViewerProps {
  circuit: CircuitHook;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({ circuit }) => {
  const {
    activeTab,
    probedNodeIds,
    waveformHistory,
    toggleProbeNode,
    clearWaveformHistory,
  } = circuit;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Find node details to display human-readable names
  const getProbeDetails = (nodeId: string) => {
    const node = activeTab.state.nodes.find((n) => n.id === nodeId);
    if (!node) return { name: nodeId, type: 'UNKNOWN', value: false };
    const name = node.label || node.name;
    const value = node.outputs[0]?.value ?? node.inputs[0]?.value ?? false;
    return { name, type: node.type, value };
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Waveform SVG Drawing Helper
  const drawWaveform = (values: boolean[], width: number, height: number) => {
    if (!values || values.length === 0) return '';
    
    const points: string[] = [];
    const maxSamples = 100;
    const dx = width / (maxSamples - 1);
    const startIdx = maxSamples - values.length;
    
    // Top is HIGH (5px), bottom is LOW (height - 5px)
    const highY = 6;
    const lowY = height - 6;
    
    let prevY = values[0] ? highY : lowY;
    points.push(`M ${startIdx * dx} ${prevY}`);
    
    for (let i = 0; i < values.length; i++) {
      const x = (startIdx + i) * dx;
      const y = values[i] ? highY : lowY;
      
      if (y !== prevY) {
        // Draw vertical transition edge
        points.push(`L ${x} ${prevY}`);
      }
      points.push(`L ${x} ${y}`);
      prevY = y;
    }
    
    return points.join(' ');
  };

  return (
    <div 
      className="analyzer-panel" 
      style={{ height: isExpanded ? '240px' : '40px' }}
    >
      {/* Panel Header (Click to toggle expansion) */}
      <div className="analyzer-header" onClick={handleToggleExpand}>
        <div className="analyzer-title">
          <span>📊</span>
          <span>REAL-TIME LOGIC ANALYZER ({probedNodeIds.length} PROBES)</span>
        </div>
        
        <div className="analyzer-controls" onClick={(e) => e.stopPropagation()}>
          {probedNodeIds.length > 0 && (
            <button 
              onClick={clearWaveformHistory} 
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}
              title="Reset waveform history"
            >
              🧹 Clear Waves
            </button>
          )}
          <button 
            onClick={handleToggleExpand}
            style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: 'transparent' }}
          >
            {isExpanded ? '▼ Collapse' : '▲ Expand'}
          </button>
        </div>
      </div>

      {/* Waveform List Body */}
      {isExpanded && (
        <div className="analyzer-body">
          {probedNodeIds.length === 0 ? (
            <div className="analyzer-empty">
              <span>💡 No active probes.</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                Select any gate or input/output node and click "💻 Probe Signal" in the Inspector on the right!
              </span>
            </div>
          ) : (
            probedNodeIds.map((nodeId) => {
              const { name, type, value } = getProbeDetails(nodeId);
              const history = waveformHistory[nodeId] || [];
              const svgWidth = 600;
              const svgHeight = 30;

              return (
                <div key={nodeId} className="analyzer-row">
                  {/* Label Column */}
                  <div className="analyzer-row-label">
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{name}</span>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: value ? 'var(--logic-high)' : 'var(--text-muted)',
                        }}
                      >
                        {value ? '1' : '0'}
                      </span>
                      <span 
                        className="analyzer-row-remove" 
                        onClick={() => toggleProbeNode(nodeId)}
                        title="Remove probe"
                      >
                        ✕
                      </span>
                    </div>
                  </div>

                  {/* SVG Waveform Column */}
                  <div className="analyzer-wave-container">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="analyzer-svg" preserveAspectRatio="none">
                      {/* Horizontal Grid Guides */}
                      <line x1="0" y1="6" x2={svgWidth} y2="6" className="analyzer-grid-line" opacity="0.3" />
                      <line x1="0" y1={svgHeight - 6} x2={svgWidth} y2={svgHeight - 6} className="analyzer-grid-line" opacity="0.3" />
                      
                      {/* Vertical grid lines representing steps */}
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const x = (svgWidth / 12) * idx;
                        return (
                          <line key={idx} x1={x} y1="0" x2={x} y2={svgHeight} className="analyzer-grid-line" opacity="0.15" />
                        );
                      })}

                      {/* Waveform line path */}
                      {history.length > 0 && (
                        <path
                          d={drawWaveform(history, svgWidth, svgHeight)}
                          className={`analyzer-signal-path ${value ? 'high' : 'low'}`}
                        />
                      )}
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default WaveformViewer;
