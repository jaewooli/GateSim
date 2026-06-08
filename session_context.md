# GateSim 세션 컨텍스트 (AI 이어가기용)

> 이 파일은 AI 코딩 어시스턴트가 세션이 끊긴 후 빠르게 상황을 파악하고 이어갈 수 있도록 작성된 요약 파일입니다.
> 마지막 갱신: 2026-06-08

---

## 프로젝트 개요

**GateSim** — 풀스택 인터랙티브 논리 게이트 시뮬레이터
- React 19 + TypeScript + Vite (프론트)
- Express + SQLite (`better-sqlite3`) + JWT (백엔드)
- PM2로 `server.cjs` 구동 → Nginx가 `/gatesimulator` 경로 리버스 프록시
- 배포 서버: `/home/ubuntu/GateSim/`
- 로컬 개발: `/mnt/e/Programming/Projects/Hosting/GateSim/`
- 베이스 경로: `/gatesimulator/` (vite.config.ts + BrowserRouter basename)

---

## 완성된 기능 목록 (현재 상태)

### ✅ 핵심 시뮬레이터
- SVG 캔버스: 드래그 배치, 베지에 도선, 20px 그리드 스냅
- 실시간 시뮬레이션 + 단계별 디버그 모드
- Undo/Redo 무제한 히스토리
- 오실레이션 감지 + 안전 캡
- 다중 선택 (Shift+드래그), 복사/붙여넣기

### ✅ 커스텀 합성 게이트
- Sub-circuit 탭 설계 → `📦 Package Gate`로 블랙박스화
- 패키징 게이트 Sidebar 등록 및 배치 가능

### ✅ 학습 모드
- `/curriculum/:missionId` 라우트
- 실시간 진리표 검증, 미션 클리어 시 서버 저장

### ✅ 실시간 로직 분석기
- 임의 노드 Probe → 하단 파형 뷰어
- zoomLevel 슬라이더 (1x~15x, 오른쪽=확대, visibleSamples 역산)
- 스크롤 슬라이더 (최근 1000샘플 버퍼)
- Live/Pinned 토글
- VCD 내보내기

### ✅ 클라우드 저장 & 공유
- 로그인 후 `☁️ Cloud Storage` 패널에서 CRUD
- 저장 시 `activeTabId`도 포함 → 로드 시 해당 탭으로 복원
- 공유 링크 `?share=id` 생성/복사
- 공유 링크 로드 시 `window.history.replaceState` 대신 URL 유지 (새로고침/북마크 지원)
- `hasLoadedShareRef`로 중복 로드 방지

### ✅ 인증
- 회원가입/로그인 JWT (7일)
- PBKDF2-SHA512 비밀번호 해싱

### ✅ 미니맵 (Minimap)
- `src/components/Minimap.tsx` — 우하단 오버레이
- 전체 노드 BBox 기반 축소 렌더링 (200×140px)
- 뷰포트 직사각형 표시 (라임 그린 테두리)
- 클릭 → 해당 위치로 메인 캔버스 팬
- ▼/▲ 토글로 접기/펴기
- Canvas.tsx 내 `ResizeObserver`로 뷰포트 크기 추적

### ✅ WebSocket 실시간 협업
- `server.cjs` — `ws` 패키지 + `http.createServer`로 WebSocket 서버 추가
- `src/hooks/useCollaboration.ts` — 협업 훅 및 실시간 커서 챗 액션 정의
- `src/components/CollabPanel.tsx` — Sidebar 하단 협업 UI 패널

**협업 및 커서 챗 흐름:**
1. 로그인 사용자가 `POST /api/collab/rooms` → roomId 발급
2. `WS /gatesimulator/ws/collab/<roomId>?token=<jwt>` 로 WebSocket 연결
3. welcome 메시지로 현재 멤버 목록 + Lock 상태 + 기존 활성 커서 챗 수신
4. cursor_move (20fps 쓰로틀) → 원격 커서 SVG 렌더링
5. lock_request/lock_release → 요소 단위 잠금 (점선 컬러 테두리 + 사용자명 레이블)
6. **피그마식 커서 챗 (Cursor Chat)**:
   - 텍스트 입력창이 아닐 때 `스페이스바 (Spacebar)` 누르면 마우스 커서 위치에 입력 버블 활성화
   - 입력값 실시간 브로드캐스트 (타이핑 시 다른 사람 커서 옆에 실시간 텍스트 반영)
   - `Enter` 키 입력 시 메시지 확정(isFinal: true) 처리 후 입력창이 닫히고, 최종 메시지는 5초 동안 유지 후 자동 소멸
   - `Escape` 키 또는 외부 클릭(Blur) 시 입력 취소
   - 버블 내부 클릭/마우스다운 시 이벤트 전파 방지 (`stopPropagation`)
7. 룸 ID는 URL `?collab=<roomId>` 파라미터로 공유
8. 비로그인 사용자도 룸 ID로 참여 가능 (익명 처리)

**서버 룸 관리:**
- 메모리 내 Map으로 룸 관리 (재시작 시 초기화)
- 4시간 idle 룸 자동 정리 (30분 interval)
- 8가지 고정 커서 색상 순환 할당

---

## 핵심 파일 상세

### `src/hooks/useCircuitState.ts` (~2400줄)
모든 상태의 단일 진실 공급원.

**주요 상태:**
- `tabs` / `activeTabId` — 탭 목록 + 현재 활성 탭
- `customGates` — 패키징된 커스텀 게이트 목록
- `isSimulating` / `stepCount` — 시뮬레이션 상태
- `undoStack` / `redoStack` — Undo/Redo 히스토리
- `probedNodeIds` / `waveformHistory` — 로직 분석기 프로브 목록/데이터
- `cloudCircuits` — 클라우드 저장 목록
- `user` — 로그인 유저 정보

**주요 함수:**
- `saveHistory()` — 현재 상태를 undo 스택에 push (useCallback, deps 많음 → useEffect 의존 시 무한루프 주의)
- `saveCircuitToCloud(name, existingId?)` — 클라우드 저장 (tabs + customGates + activeTabId 포함)
- `loadCircuitFromCloud(circuit)` — 클라우드 불러오기 (activeTabId 복원)
- 공유 링크 로드 useEffect — `hasLoadedShareRef`로 중복 방지, `window.history.replaceState` 미사용 (URL 유지)

**중요 주의사항:**
```
saveHistory는 자주 재생성됨 → useEffect deps 배열에 절대 추가 금지
hasLoadedShareRef = useRef → 같은 마운트 생애 내에서만 중복 방지
공유 링크 effect deps: [location.search] 만 사용 (eslint-disable 주석 포함)
```

### `server.cjs`
Express API 서버 (CommonJS).

**엔드포인트:**
- `POST /gatesimulator/api/auth/register` — 회원가입
- `POST /gatesimulator/api/auth/login` — 로그인 (JWT 반환)
- `GET /gatesimulator/api/circuits` — 내 회로 목록 (인증 필요)
- `POST /gatesimulator/api/circuits` — 회로 저장 (인증 필요)
- `DELETE /gatesimulator/api/circuits/:id` — 회로 삭제 (인증 필요)
- `GET /gatesimulator/api/circuits/share/:id` — 공유 회로 로드 (인증 불필요, public)
- `GET /gatesimulator/*` — SPA 정적 파일 서빙 (`dist/`)

**SQLite 테이블:**
- `users` — id, username, password_hash, salt, created_at
- `circuits` — id, user_id, name, state (JSON), updated_at
- `mission_progress` — user_id, mission_id, passed, updated_at

### `src/components/Header.tsx`
드롭다운 메뉴 상태:
- `isMoreOpen` — `⋯ More` 드롭다운 (Pin Labels, Theme, Shortcuts)
- `isFileOpen` — `📁 File` 드롭다운 (Export JSON, Import JSON, Clear Canvas)
- `isShortcutsOpen` — 단축키 모달
- `isAuthModalOpen` — 로그인 모달

### `src/components/WaveformViewer.tsx`
줌 계산:
```ts
const [zoomLevel, setZoomLevel] = useState<number>(3); // 1~15
const visibleSamples = Math.round(300 - (zoomLevel - 1) * (280 / 14));
// zoomLevel 1 → 300샘플(줌아웃), zoomLevel 15 → ~20샘플(줌인)
```

---

## 배포 방법 (서버에 적용)

```bash
# 로컬에서 빌드
npm run build

# 서버에 dist/ 폴더 업로드 (rsync/scp 등)
rsync -avz dist/ ubuntu@<server>:/home/ubuntu/GateSim/dist/

# 서버에서 PM2 재시작 (server.cjs 변경 시)
pm2 restart gatesimulator

# PM2 로그 확인
pm2 logs gatesimulator --lines 50
```

---

## 향후 개발 제안 (우선순위 순)

### 🎯 계획됨 — 사용자가 선택한 항목 (다음 세션에서 구현 시작)

#### 1. 다중 선택 이동
- **파일**: `Canvas.tsx`, `useCircuitState.ts`
- **구현 힌트**:
  - `useCircuitState.ts`에 `selectedNodeIds: Set<string>` 상태 추가 (현재는 `selectedNodeId: string | null` 단일)
  - Shift+클릭 → 해당 노드를 set에 추가/제거
  - Shift+드래그 영역 → bbox 안의 노드들 전체 선택
  - `Canvas.tsx`의 드래그 핸들러에서 `selectedNodeIds`가 비어있지 않으면 전체 동시 이동
  - `useCircuitState.ts`의 `moveNode(id, dx, dy)` → `moveNodes(ids: string[], dx, dy)` 확장
  - 선택된 노드들에 파란색 테두리 하이라이트 표시

#### 2. PNG/SVG 내보내기
- **파일**: `Canvas.tsx`, `Header.tsx` (📁 File 드롭다운에 추가)
- **구현 힌트**:
  ```ts
  // SVG 내보내기
  const svgEl = svgRef.current;
  const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  // 다운로드 링크 클릭
  
  // PNG 변환 (Canvas API)
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgEl.outerHTML);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.getContext('2d')?.drawImage(img, 0, 0);
    canvas.toBlob(blob => /* download */);
  };
  ```
  - Canvas.tsx에 `svgRef` 추가 및 export
  - Header의 `📁 File` 드롭다운에 "📸 Export PNG" / "📐 Export SVG" 항목 추가

#### 3. 버스(Bus) 와이어
- **파일**: `types/index.ts`, `simulation.ts`, `Canvas.tsx`
- **구현 힌트**:
  - `types/index.ts`에 `BusWire` 타입: `{ id, fromNodeId, fromPinIndex, toNodeId, toPinIndex, bitWidth: 8 | 16 | 32 }`
  - 노드에 `busInputs` / `busOutputs` 핀 배열 추가
  - SVG 렌더링 시 버스 도선을 굵은 선 + 비트 폭 레이블로 표시
  - `simulation.ts`에서 버스 값은 `number` (정수) 타입으로 전파
  - 난이도가 높으므로 먼저 설계 문서(`design_plan.md`) 업데이트 후 구현 권장

#### 4. Flip-Flop / ALU 미션
- **파일**: `useCircuitState.ts`의 `MISSIONS` 배열
- **추가할 미션 목록**:
  - `mission-sr-latch`: SR Latch (NOR 기반), 진리표: S=0,R=0→유지 / S=1,R=0→Q=1 / S=0,R=1→Q=0 / S=1,R=1→금지
  - `mission-d-latch`: D Latch (SR Latch + NOT 게이트), 클록 엣지 트리거
  - `mission-d-flipflop`: D Flip-Flop (마스터-슬레이브 구조)
  - `mission-4bit-alu`: 4비트 ALU (AND, OR, ADD, SUB 연산, Carry 출력)
- **구현 힌트**:
  - 각 미션: `{ id, title, description, allowedGates[], targetTruthTable[][], hints[] }` 구조
  - 진리표 검증 로직은 기존 `checkMissionComplete()` 함수 재활용

---

### 🟡 보류 (나중에 할 수도 있는 항목)
- **회로 코멘트 박스** — 캔버스에 텍스트 주석 노드 타입 (`COMMENT`) 추가

### 🟢 낮음
- **WebSocket OT** — 현재는 cursor/lock만 동기화, 향후 circuit_op를 통한 구조적 동기화 추가
- **룸 영속성** — 현재는 메모리, 향후 DB 저장으로 재시작 후에도 룸 복원


---

## 알려진 버그 / 주의사항

| 항목 | 내용 |
|---|---|
| 공유 링크 로드 | `hasLoadedShareRef`는 컴포넌트 마운트 기준 → 새로고침 시 다시 로드됨 (정상 동작) |
| saveHistory 의존성 | useEffect deps에 추가하면 무한루프 발생, 항상 eslint-disable 처리 |
| 로컬 개발 API | `npm run dev`에서는 백엔드 없어 클라우드/공유 기능 동작 안 함 |
| 기존 저장 회로 | `activeTabId` 없는 구 버전 저장 데이터는 main 탭으로 열림 |
