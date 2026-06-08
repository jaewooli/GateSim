# GateSim ⚡ — 풀스택 인터랙티브 논리 게이트 시뮬레이터

> **React + TypeScript + Vite + Express + SQLite** 로 제작된 프리미엄 웹 기반 논리 회로 시뮬레이터.  
> Teenage Engineering 감성의 다크/라이트 테마, 실시간 로직 분석기, 클라우드 저장, 공유 링크까지 지원합니다.

---

## 🚀 주요 기능

### 🖥 캔버스 & 편집
- **드래그 앤 드롭 노드 배치** — 20px 그리드 스냅
- **SVG 베지에 도선(Wire)** — 활성 시 네온 라임 그린 파티클 애니메이션
- **우클릭 드래그 팬(Pan)** + **스크롤 줌(Zoom)** + **핀치 투 줌(터치)**
- **다중 선택** (Shift + 드래그 영역) & 복사/붙여넣기 (`Ctrl+C/V`)
- **무제한 Undo / Redo** (`Ctrl+Z` / `Ctrl+Y`)
- **핀 라벨 토글** (커스텀 게이트 I/O 라벨 표시/숨김)

### ⚙️ 시뮬레이션 엔진
- **실시간 모드** — 신호 토글 시 즉시 전파, 클록 노드 주기 작동
- **단계별 디버그 모드** — `⏭ Step` 버튼으로 1틱씩 수동 진행
- **오실레이션 감지** — 무한 루프 회로 자동 감지 및 안전 캡 적용

### 📊 실시간 로직 분석기 (Logic Analyzer)
- 임의 노드 **Probe** → 하단 파형 뷰어에 실시간 표시
- **줌 슬라이더** (1x ~ 15x, 오른쪽 = 확대)
- **스크롤 슬라이더** — 최근 1000샘플 히스토리 탐색
- **Pin to Live / Unpin** 토글 — 과거 파형 고정 분석 지원
- **VCD 내보내기** — 표준 포맷으로 파형 데이터 저장

### 🧩 커스텀 합성 게이트
- Sub-circuit 탭에서 회로를 설계 후 `📦 Package Gate`로 블랙박스화
- 패키징된 게이트는 Sidebar 도구함에 즉시 등록, 다른 탭에서 배치 가능

### 🎓 학습 모드 (Curriculum)
- NAND 기초 → 4비트 CPU 순서대로 미션 진행
- 각 미션 별 실시간 정답 검증 (목표 진리표와 실제 시뮬레이션 비교)
- 미션 클리어 시 서버에 진도 저장

### ☁️ 클라우드 저장 & 공유 링크
- 로그인 후 Sidebar > `☁️ Cloud Storage` 패널에서 회로 저장/불러오기/삭제
- **공유 링크 생성** — 1클릭으로 `?share=id` URL 복사
- 링크 접속 시 회로 자동 로드 (저장 시점의 탭/상태까지 복원)
- 공유 링크 파라미터는 URL에 계속 유지 (새로고침/북마크 지원)
- 비로그인 공개 공유 가능 (GET 엔드포인트는 인증 불필요)

### 🔐 인증 시스템
- 회원가입 / 로그인 (JWT, 7일 세션)
- 비밀번호 **PBKDF2-SHA512** 해싱 (솔트 포함)
- 로그아웃 시 `localStorage` 폴백으로 오프라인 작동

### 🎨 UI/UX
- **다크 / 라이트 테마** 즉시 전환
- **헤더 드롭다운 메뉴** — `⋯ More` (설정), `📁 File` (내보내기/불러오기/초기화)
- **⌨️ 키보드 단축키** 치트시트 모달
- **터치 지원** — 핀치 줌, 터치 드래그

---

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router v7 |
| Styling | Vanilla CSS (CSS 변수 기반 디자인 토큰) |
| Canvas | 네이티브 SVG + DOM 이벤트 (외부 라이브러리 없음) |
| State | 커스텀 훅 `useCircuitState.ts` (단일 진실 공급원) |
| Backend | Node.js + Express (`server.cjs`, CommonJS) |
| Database | SQLite (`better-sqlite3`, `db/gatesim.db`) |
| Auth | JWT + PBKDF2-SHA512 비밀번호 해싱 |
| Deploy | PM2 (백엔드) + Nginx (리버스 프록시) |

---

## 💻 실행 방법

### 로컬 개발 (`npm run dev`)
```bash
npm install
npm run dev
# → http://localhost:8081/gatesimulator/sandbox
```
> 개발 모드에서는 백엔드 없이 로컬 상태만 사용합니다 (클라우드/공유 기능은 배포 환경에서만 동작).

### 프로덕션 빌드 & 배포
```bash
# 1. 프론트엔드 정적 파일 빌드
npm run build

# 2. PM2로 백엔드 API 서버 기동
pm2 start server.cjs --name gatesimulator
pm2 startup && pm2 save
```

#### Nginx 설정 예시
```nginx
location /gatesimulator {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

---

## 📂 프로젝트 구조

```
GateSim/
├── server.cjs              # Express API 서버 (인증, 회로 CRUD, 공유)
├── db/
│   ├── gatesim.db          # SQLite 데이터베이스 (자동 생성)
│   └── jwt_secret.key      # JWT 서명 키 (자동 생성)
├── dist/                   # 빌드 결과물 (npm run build)
├── src/
│   ├── main.tsx            # 앱 진입점 + BrowserRouter
│   ├── App.tsx             # 레이아웃 + 컴포넌트 조립
│   ├── App.css             # 레이아웃 스타일
│   ├── index.css           # 전역 CSS 변수 (디자인 토큰)
│   ├── types/index.ts      # Node, Pin, Wire, Tab 타입 정의
│   ├── hooks/
│   │   └── useCircuitState.ts  # 핵심 상태 엔진 (2400+ 줄)
│   ├── utils/
│   │   └── simulation.ts   # 큐 기반 신호 전파 알고리즘
│   └── components/
│       ├── Header.tsx       # 제어 바 + 드롭다운 메뉴 + 단축키 모달
│       ├── Sidebar.tsx      # 부품함 + 클라우드 저장 패널
│       ├── Canvas.tsx       # SVG 캔버스 (터치/마우스 이벤트)
│       ├── Inspector.tsx    # 선택 노드 편집 + 탭 대시보드
│       ├── WaveformViewer.tsx  # 로직 분석기 파형 뷰어
│       ├── CurriculumDock.tsx  # 학습 모드 미션 패널
│       ├── CreateCustomGateModal.tsx  # 게이트 패키징 모달
│       └── AuthModal.tsx    # 로그인/회원가입 모달
└── design_plan.md          # 게이트 모델 설계 명세
```

---

## 🔮 향후 개발 로드맵

| 상태 | 기능 | 설명 |
|---|---|---|
| ✅ 완료 | **미니맵** | 우하단 회로 조감도, 클릭 팬 |
| ✅ 완료 | **WebSocket 협업** | 임시 룸, 원격 커서, 요소 단위 Lock |
| 🎯 계획됨 | **다중 선택 이동** | 여러 게이트를 한꺼번에 드래그 이동 |
| 🎯 계획됨 | **PNG/SVG 내보내기** | SVG/PNG로 회로 스냅샷 저장 |
| 🎯 계획됨 | **버스(Bus) 와이어** | 8비트/16비트 묶음 도선으로 복잡한 회로 정리 |
| 🎯 계획됨 | **Flip-Flop / ALU 미션** | SR Latch, D Flip-Flop, 4비트 ALU 교육 미션 추가 |
| 🟡 보류 | **회로 코멘트 박스** | 캔버스에 텍스트 주석 추가 |
| 🟢 낮음 | **WebSocket OT** | 현재는 cursor/lock 동기화만, 향후 구조적 동기화 추가 |
| 🟢 낮음 | **룸 영속성** | 현재 메모리 기반, DB 저장으로 재시작 후 복원 |

---

## 📝 AI 세션 이어가기 (Session Continuity)

> 이 섹션은 AI 코딩 어시스턴트와 세션이 끊겼을 때 빠르게 이어갈 수 있도록 핵심 맥락을 기록합니다.

### 현재 상태 (2026-06-08 기준)
- **모든 기능 정상 작동** — Logic Analyzer, Cloud Save, Share Link, Auth
- **공유 링크 수정 완료** — `navigate()` 대신 `window.history.replaceState()` 사용으로 state reset 버그 수정
- **Alert 반복 버그 수정** — `useRef`로 share ID 중복 로드 방지
- **헤더 메뉴 간소화** — `⋯ More` / `📁 File` 드롭다운으로 묶음

### 핵심 파일 & 역할
- `src/hooks/useCircuitState.ts` — 모든 상태의 단일 진실 공급원. 클라우드 저장/로드/공유 로직 포함 (약 2400줄)
- `server.cjs` — Express API. `/api/auth`, `/api/circuits`, `/api/circuits/share/:id` 엔드포인트
- `src/components/WaveformViewer.tsx` — `zoomLevel` (1~15) → `visibleSamples` 역산 방식
- `src/components/Header.tsx` — `isMoreOpen` / `isFileOpen` 상태로 드롭다운 제어

### 알려진 제약 / 주의사항
- `npm run build` 후 PM2로 `server.cjs` 구동 → Nginx가 `/gatesimulator` 경로를 프록시
- 로컬 `npm run dev` 환경에서는 백엔드 API가 없어 클라우드 기능은 동작 안 함
- `useCircuitState.ts`의 `saveHistory` 함수는 `useCallback`이지만 deps가 많아 자주 재생성됨 — useEffect deps에 추가 시 무한루프 주의
- `hasLoadedShareRef` — hook 내 `useRef`로 선언되어 동일 컴포넌트 생애주기 내 중복 로드 방지

### 다음 세션에서 바로 시작할 수 있는 작업 (사용자 선택)
1. **다중 선택 이동** — `Canvas.tsx`에서 `selectedNodeIds: Set<string>` 상태 추가, 드래그 시 선택된 모든 노드 동시 이동, `useCircuitState.ts`의 `moveNode`를 `moveNodes(ids, dx, dy)`로 확장
2. **PNG/SVG 내보내기** — `Canvas.tsx`의 SVG ref를 `new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })`로 다운로드, PNG 변환은 Canvas API 사용
3. **버스(Bus) 와이어** — `types/index.ts`에 `BusWire` 타입 추가, 8비트 묶음 도선 렌더링 및 시뮬레이션 로직 설계
4. **Flip-Flop / ALU 미션** — `useCircuitState.ts`의 `MISSIONS` 배열에 SR Latch, D Flip-Flop, 4비트 ALU 미션 데이터 추가, 진리표 검증 로직 확장
