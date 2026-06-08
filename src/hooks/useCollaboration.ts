import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────
export interface CollabMember {
  clientId: string;
  username: string;
  color: string;
  cursor: { x: number; y: number } | null;
  chatText?: string;
  chatIsFinal?: boolean;
}

export interface CollabState {
  /** Whether we are in a collab room */
  isConnected: boolean;
  /** Our own client ID in the room */
  myClientId: string | null;
  /** Our assigned color */
  myColor: string | null;
  /** Current room ID */
  roomId: string | null;
  /** All members currently in the room (excluding self) */
  members: CollabMember[];
  /** nodeId → { clientId, username, color } of the lock holder */
  locks: Record<string, { clientId: string; username: string; color: string }>;
  /** Connection status string */
  status: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
  /** Error message */
  error: string | null;
}

export interface CollabActions {
  /** Create a new room (returns the roomId) */
  createRoom: () => Promise<string | null>;
  /** Join an existing room */
  joinRoom: (roomId: string) => void;
  /** Leave the current room */
  leaveRoom: () => void;
  /** Send cursor position in canvas coordinates */
  sendCursor: (x: number, y: number) => void;
  /** Request a lock on a node. Returns true if immediate (server will broadcast result) */
  requestLock: (nodeId: string) => void;
  /** Release a lock on a node */
  releaseLock: (nodeId: string) => void;
  /** Broadcast a circuit operation to all peers */
  broadcastOp: (op: CircuitOp) => void;
  /** Whether I hold the lock on a given node */
  iLockedBy: (nodeId: string) => boolean;
  /** Send cursor chat message */
  sendCursorChat: (text: string, isFinal: boolean) => void;
}

export interface CircuitOp {
  op: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

// ─────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────
/** e.g. "/gatesimulator" (trailing slash stripped) */
const BASE_PATH = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function getWsBaseUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${proto}://${host}`;
}

export function useCollaboration(
  /** Called when a remote circuit_op is received */
  onRemoteOp: (op: CircuitOp & { clientId: string; username: string }) => void,
  authToken: string | null,
): CollabState & CollabActions {
  const [state, setState] = useState<CollabState>({
    isConnected: false,
    myClientId: null,
    myColor: null,
    roomId: null,
    members: [],
    locks: {},
    status: 'idle',
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const myClientIdRef = useRef<string | null>(null);
  const onRemoteOpRef = useRef(onRemoteOp);
  onRemoteOpRef.current = onRemoteOp;

  // ── Throttled cursor send ──────────────────────────────────────
  const lastCursorSend = useRef(0);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ── Join an existing room ──────────────────────────────────────
  const joinRoom = useCallback((roomId: string) => {
    // Close any existing connection
    wsRef.current?.close();

    setState((prev) => ({ ...prev, status: 'connecting', error: null, roomId }));

    const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
    const wsUrl = `${getWsBaseUrl()}${BASE_PATH}/ws/collab/${roomId}${tokenParam}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Status will be updated on 'welcome'
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'welcome': {
          myClientIdRef.current = msg.clientId as string;
          setState((prev) => ({
            ...prev,
            isConnected: true,
            status: 'connected',
            myClientId: msg.clientId as string,
            myColor: msg.color as string,
            members: ((msg.members as CollabMember[]) ?? []).filter(
              (m) => m.clientId !== (msg.clientId as string)
            ),
            locks: (msg.locks as Record<string, { clientId: string; username: string; color: string }>) ?? {},
          }));
          break;
        }

        case 'member_joined': {
          const newMember: CollabMember = {
            clientId: msg.clientId as string,
            username: msg.username as string,
            color: msg.color as string,
            cursor: null,
            chatText: '',
            chatIsFinal: false,
          };
          setState((prev) => ({
            ...prev,
            members: [...prev.members.filter((m) => m.clientId !== newMember.clientId), newMember],
          }));
          break;
        }

        case 'member_left': {
          setState((prev) => ({
            ...prev,
            members: prev.members.filter((m) => m.clientId !== (msg.clientId as string)),
            // Release locks held by departing member
            locks: Object.fromEntries(
              Object.entries(prev.locks).filter(([, v]) => v.clientId !== (msg.clientId as string))
            ),
          }));
          break;
        }

        case 'cursor_move': {
          setState((prev) => ({
            ...prev,
            members: prev.members.map((m) =>
              m.clientId === (msg.clientId as string)
                ? { ...m, cursor: msg.cursor as { x: number; y: number } }
                : m
            ),
          }));
          break;
        }

        case 'lock_acquired': {
          setState((prev) => ({
            ...prev,
            locks: {
              ...prev.locks,
              [msg.nodeId as string]: {
                clientId: msg.clientId as string,
                username: msg.username as string,
                color: msg.color as string,
              },
            },
          }));
          break;
        }

        case 'lock_released': {
          setState((prev) => {
            const newLocks = { ...prev.locks };
            delete newLocks[msg.nodeId as string];
            return { ...prev, locks: newLocks };
          });
          break;
        }

        case 'lock_denied':
          // Could show a toast in future — for now silently ignored
          break;

        case 'circuit_op': {
          if (msg.clientId !== myClientIdRef.current) {
            onRemoteOpRef.current({
              op: msg.op as string,
              payload: msg.payload,
              clientId: msg.clientId as string,
              username: msg.username as string,
            });
          }
          break;
        }

        case 'cursor_chat': {
          const cid = msg.clientId as string;
          const text = msg.text as string;
          const isFinal = msg.isFinal as boolean;
          setState((prev) => ({
            ...prev,
            members: prev.members.map((m) =>
              m.clientId === cid
                ? { ...m, chatText: text, chatIsFinal: isFinal }
                : m
            ),
          }));

          if (isFinal) {
            setTimeout(() => {
              setState((prev) => ({
                ...prev,
                members: prev.members.map((m) =>
                  m.clientId === cid && m.chatText === text
                    ? { ...m, chatText: '', chatIsFinal: false }
                    : m
                ),
              }));
            }, 5000);
          }
          break;
        }

        default:
          break;
      }
    };

    ws.onclose = (e) => {
      wsRef.current = null;
      myClientIdRef.current = null;
      setState((prev) => ({
        ...prev,
        isConnected: false,
        status: e.code === 4004 ? 'error' : 'disconnected',
        error: e.code === 4004 ? '협업 룸을 찾을 수 없습니다.' : null,
        myClientId: null,
        myColor: null,
        members: [],
        locks: {},
      }));
    };

    ws.onerror = () => {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'WebSocket 연결 오류가 발생했습니다.',
      }));
    };
  }, [authToken]);

  // ── Create room (REST) then join ───────────────────────────────
  const createRoom = useCallback(async (): Promise<string | null> => {
    if (!authToken) {
      setState((prev) => ({ ...prev, error: '룸을 생성하려면 로그인이 필요합니다.' }));
      return null;
    }
    try {
      const res = await fetch(`${BASE_PATH}/api/collab/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('서버 오류');
      const data = (await res.json()) as { roomId: string };
      joinRoom(data.roomId);
      return data.roomId;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : '룸 생성 실패',
      }));
      return null;
    }
  }, [authToken, joinRoom]);

  // ── Leave room ────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    wsRef.current?.close();
  }, []);

  // ── Cursor (throttled to ~20 fps) ─────────────────────────────
  const sendCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSend.current < 50) return;
    lastCursorSend.current = now;
    send({ type: 'cursor_move', cursor: { x, y } });
  }, [send]);

  // ── Lock ──────────────────────────────────────────────────────
  const requestLock = useCallback((nodeId: string) => {
    send({ type: 'lock_request', nodeId });
  }, [send]);

  const releaseLock = useCallback((nodeId: string) => {
    send({ type: 'lock_release', nodeId });
  }, [send]);

  // ── Broadcast op ─────────────────────────────────────────────
  const broadcastOp = useCallback((op: CircuitOp) => {
    send({ type: 'circuit_op', ...op });
  }, [send]);

  // ── iLockedBy helper ──────────────────────────────────────────
  const iLockedBy = useCallback((nodeId: string) => {
    return state.locks[nodeId]?.clientId === state.myClientId;
  }, [state.locks, state.myClientId]);

  const sendCursorChat = useCallback((text: string, isFinal: boolean) => {
    send({ type: 'cursor_chat', text, isFinal });
  }, [send]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  // ── Parse roomId from URL on mount ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('collab');
    if (roomParam) {
      joinRoom(roomParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    sendCursor,
    requestLock,
    releaseLock,
    broadcastOp,
    iLockedBy,
    sendCursorChat,
  };
}
