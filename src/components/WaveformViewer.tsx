import React, { useState, useEffect } from 'react';
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
  const [visibleSamples, setVisibleSamples] = useState<number>(100);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(true);

  // Find the longest history length among all probed signals
  let maxHistoryLength = 0;
  probedNodeIds.forEach((nodeId) => {
    const history = waveformHistory[nodeId] || [];
    if (history.length > maxHistoryLength) {
      maxHistoryLength = history.length;
    }
  });

  const maxScrollOffset = Math.max(0, maxHistoryLength - visibleSamples);

  // Keep scroll offset at 0 if we are in live tracking mode
  useEffect(() => {
    if (isLive) {
      setScrollOffset(0);
    }
  }, [isLive, maxHistoryLength]);

  const handleScrollChange = (val: number) => {
    setScrollOffset(val);
    if (val > 0) {
      setIsLive(false);
    } else {
      setIsLive(true);
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Find node details to display human-readable names
  const getProbeDetails = (nodeId: string) => {
    const node = activeTab.state.nodes.find((n) => n.id === nodeId);
    if (!node) return { name: nodeId, type: 'UNKNOWN', value: false };
    const name = node.label || node.name;
    const value = node.outputs[0]?.value ?? node.inputs[0]?.value ?? false;
    return { name, type: node.type, value };
  };

  // Waveform SVG Drawing Helper
  const drawWaveform = (history: boolean[], visibleCount: number, offset: number, width: number, height: number) => {
    if (!history || history.length === 0) return '';
    
    const L = history.length;
    const startIdx = Math.max(0, L - visibleCount - offset);
    const endIdx = Math.max(0, L - offset);
    const visibleHistory = history.slice(startIdx, endIdx);
    const H = visibleHistory.length;
    if (H === 0) return '';

    const points: string[] = [];
    const leftMargin = visibleCount - H;
    const dx = width / (visibleCount - 1);
    
    const highY = 6;
    const lowY = height - 6;
    
    let prevY = visibleHistory[0] ? highY : lowY;
    points.push(`M ${leftMargin * dx} ${prevY}`);
    
    for (let i = 0; i < visibleHistory.length; i++) {
      const x = (leftMargin + i) * dx;
      const y = visibleHistory[i] ? highY : lowY;
      
      if (y !== prevY) {
        // Draw vertical transition edge
        points.push(`L ${x} ${prevY}`);
      }
      points.push(`L ${x} ${y}`);
      prevY = y;
    }
    
    return points.join(' ');
  };

  // Draw timeline grid lines synchronized with zoom/scroll
  const renderGridLines = (historyLength: number, width: number, height: number) => {
    const startIdx = Math.max(0, historyLength - visibleSamples - scrollOffset);
    const endIdx = Math.max(0, historyLength - scrollOffset);
    const visibleLength = endIdx - startIdx;
    const leftMargin = visibleSamples - visibleLength;
    const dx = width / (visibleSamples - 1);

    const firstGridIdx = Math.ceil(startIdx / 10) * 10;
    const lines: React.ReactNode[] = [];

    for (let sIdx = firstGridIdx; sIdx < endIdx; sIdx += 10) {
      const i = sIdx - startIdx;
      const x = (leftMargin + i) * dx;
      lines.push(
        <line
          key={sIdx}
          x1={x}
          y1="0"
          x2={x}
          y2={height}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }
    return lines;
  };

  // Export Waveform History as VCD File
  const handleExportVCD = () => {
    if (probedNodeIds.length === 0) return;
    
    let vcd = '';
    vcd += `$date\n   ${new Date().toString()}\n$end\n`;
    vcd += `$version\n   GateSim Logic Analyzer VCD Export\n$end\n`;
    vcd += `$timescale\n   1ms\n$end\n`;
    vcd += `$scope module top $end\n`;
    
    // Define signals
    probedNodeIds.forEach((nodeId, idx) => {
      const { name } = getProbeDetails(nodeId);
      const safeName = name.replace(/\s+/g, '_');
      vcd += `$var wire 1 n${idx} ${safeName} $end\n`;
    });
    
    vcd += `$upscope $end\n`;
    vcd += `$enddefinitions $end\n`;
    
    // Export data timestamps
    let lastVals: Record<string, boolean> = {};
    for (let i = 0; i < maxHistoryLength; i++) {
      let timestampWritten = false;
      
      probedNodeIds.forEach((nodeId, idx) => {
        const history = waveformHistory[nodeId] || [];
        const historyOffset = maxHistoryLength - history.length;
        const sampleIdx = i - historyOffset;
        
        if (sampleIdx >= 0 && sampleIdx < history.length) {
          const val = history[sampleIdx];
          const lastVal = lastVals[nodeId];
          
          if (i === 0 || val !== lastVal) {
            if (!timestampWritten) {
              vcd += `#${i * 50}\n`; // 50ms sampling steps
              timestampWritten = true;
            }
            vcd += `${val ? '1' : '0'}n${idx}\n`;
            lastVals[nodeId] = val;
          }
        }
      });
    }
    
    const blob = new Blob([vcd], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gatesim-analyzer-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.vcd`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="analyzer-panel" 
      style={{ height: isExpanded ? '310px' : '40px' }}
    >
      {/* Panel Header */}
      <div className="analyzer-header" onClick={handleToggleExpand}>
        <div className="analyzer-title">
          <span>📊</span>
          <span>REAL-TIME LOGIC ANALYZER ({probedNodeIds.length} PROBES)</span>
        </div>
        
        <div className="analyzer-controls" onClick={(e) => e.stopPropagation()}>
          {probedNodeIds.length > 0 && (
            <>
              <button 
                onClick={handleExportVCD} 
                style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', marginRight: '6px' }}
                title="Export waves to standard VCD file"
              >
                💾 Export VCD
              </button>
              <button 
                onClick={clearWaveformHistory} 
                style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}
                title="Reset waveform history"
              >
                🧹 Clear Waves
              </button>
            </>
          )}
          <button 
            onClick={handleToggleExpand}
            style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: 'transparent' }}
          >
            {isExpanded ? '▼ Collapse' : '▲ Expand'}
          </button>
        </div>
      </div>

      {/* Waveform Controls and List Body */}
      {isExpanded && (
        <div className="analyzer-body" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
          {probedNodeIds.length > 0 && (
            <div 
              className="analyzer-controls-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}
            >
              {/* Zoom slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔍 Zoom:</span>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={visibleSamples}
                  onChange={(e) => setVisibleSamples(parseInt(e.target.value, 10))}
                  style={{ width: '80px', height: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--mono)', width: '24px' }}>{visibleSamples}</span>
              </div>

              {/* Scroll slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                <span>🎞️ Scroll Offset:</span>
                <input
                  type="range"
                  min="0"
                  max={maxScrollOffset}
                  value={scrollOffset}
                  disabled={maxScrollOffset === 0}
                  onChange={(e) => handleScrollChange(parseInt(e.target.value, 10))}
                  style={{ width: '100%', height: '4px', cursor: maxScrollOffset === 0 ? 'not-allowed' : 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--mono)', width: '24px' }}>{scrollOffset}</span>
              </div>

              {/* Pin to Live toggle */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={isLive ? 'primary' : ''}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{isLive ? '📌 Pinned' : '📌 Pin Live'}</span>
              </button>
            </div>
          )}

          <div style={{ flexGrow: 1, overflowY: 'auto' }}>
            {probedNodeIds.length === 0 ? (
              <div className="analyzer-empty" style={{ padding: '40px 0' }}>
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
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }} title={name}>{name}</span>
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
                        
                        {/* Timed grid lines */}
                        {renderGridLines(history.length, svgWidth, svgHeight)}

                        {/* Waveform line path */}
                        {history.length > 0 && (
                          <path
                            d={drawWaveform(history, visibleSamples, scrollOffset, svgWidth, svgHeight)}
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
        </div>
      )}
    </div>
  );
};

export default WaveformViewer;
