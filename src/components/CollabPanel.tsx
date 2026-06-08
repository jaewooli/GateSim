import React, { useState, useRef } from 'react';
import type { CollabState, CollabActions } from '../hooks/useCollaboration';

interface CollabPanelProps {
  collab: CollabState & CollabActions;
  /** Whether the user is logged in */
  isLoggedIn: boolean;
}

export const CollabPanel: React.FC<CollabPanelProps> = ({ collab, isLoggedIn }) => {
  const [joinInput, setJoinInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    const roomId = await collab.createRoom();
    setIsCreating(false);
    if (roomId) {
      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set('collab', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleJoin = () => {
    const id = joinInput.trim();
    if (!id) return;
    collab.joinRoom(id);
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('collab', id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleLeave = () => {
    collab.leaveRoom();
    const url = new URL(window.location.href);
    url.searchParams.delete('collab');
    window.history.replaceState({}, '', url.toString());
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    if (collab.roomId) url.searchParams.set('collab', collab.roomId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Not connected ─────────────────────────────────────────────
  if (!collab.isConnected) {
    return (
      <div className="collab-panel">
        <div className="collab-panel-title">
          <span className="collab-icon">🤝</span>
          실시간 협업
        </div>

        {collab.error && (
          <div className="collab-error">{collab.error}</div>
        )}

        {collab.status === 'connecting' ? (
          <div className="collab-connecting">
            <span className="collab-spinner" />
            연결 중…
          </div>
        ) : (
          <>
            {/* Create room */}
            {isLoggedIn ? (
              <button
                className="collab-btn primary"
                onClick={handleCreate}
                disabled={isCreating}
                id="collab-create-room-btn"
              >
                {isCreating ? '생성 중…' : '+ 새 협업 룸 만들기'}
              </button>
            ) : (
              <div className="collab-login-hint">
                협업 룸을 만들려면 로그인이 필요합니다.
              </div>
            )}

            {/* Join room */}
            <div className="collab-join-row">
              <input
                ref={inputRef}
                className="collab-input"
                placeholder="룸 ID 입력..."
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                id="collab-join-input"
              />
              <button
                className="collab-btn"
                onClick={handleJoin}
                disabled={!joinInput.trim()}
                id="collab-join-btn"
              >
                참여
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────
  const allMembers = [
    { clientId: collab.myClientId!, username: '나', color: collab.myColor!, cursor: null, isMe: true },
    ...collab.members.map((m) => ({ ...m, isMe: false })),
  ];

  return (
    <div className="collab-panel collab-panel--active">
      {/* Header */}
      <div className="collab-panel-title">
        <span className="collab-icon collab-icon--live">🟢</span>
        협업 중 · 룸 <code className="collab-room-id">{collab.roomId}</code>
      </div>

      {/* Copy link */}
      <button
        className={`collab-btn collab-btn--copy ${copied ? 'copied' : ''}`}
        onClick={handleCopyLink}
        id="collab-copy-link-btn"
      >
        {copied ? '✓ 복사됨!' : '🔗 협업 링크 복사'}
      </button>

      {/* Member list */}
      <div className="collab-members-label">참여자 ({allMembers.length})</div>
      <div className="collab-members">
        {allMembers.map((m) => (
          <div className="collab-member" key={m.clientId}>
            <span
              className="collab-member-dot"
              style={{ background: m.color }}
            />
            <span className="collab-member-name">{m.isMe ? `${m.username} (나)` : m.username}</span>
          </div>
        ))}
      </div>

      {/* Leave */}
      <button
        className="collab-btn collab-btn--leave"
        onClick={handleLeave}
        id="collab-leave-btn"
      >
        나가기
      </button>
    </div>
  );
};

export default CollabPanel;
