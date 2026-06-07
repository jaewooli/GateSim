import React, { useState } from 'react';

interface CreateCustomGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  defaultName: string;
}

const COLOR_OPTIONS = [
  '#B6E63A', // Lime Green (Default)
  '#3A86F0', // Vibrant Blue
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export const CreateCustomGateModal: React.FC<CreateCustomGateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName,
}) => {
  const [name, setName] = useState(defaultName);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  // Sync default name when opened
  React.useEffect(() => {
    setName(defaultName);
  }, [defaultName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), color);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">Package Custom Sub-circuit</div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name Input */}
          <div className="inspector-group">
            <label className="inspector-label" htmlFor="custom-gate-name">Gate Symbol / Name</label>
            <input
              id="custom-gate-name"
              type="text"
              className="inspector-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HALF_ADDER, XOR_2"
              required
              maxLength={15}
              autoFocus
            />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Give it a short, uppercase identifier that will display on the gate body.
            </div>
          </div>

          {/* Color Option Selector */}
          <div className="inspector-group">
            <label className="inspector-label">Gate Theme Color</label>
            <div className="color-picker">
              {COLOR_OPTIONS.map((c) => (
                <div
                  key={c}
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Package Gate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateCustomGateModal;
