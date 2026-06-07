# GateSim ⚡ 풀스택 인터랙티브 논리 게이트 시뮬레이터 (Full-Stack Logic Gate Simulator)

GateSim은 **React, Vite, TypeScript, Express**로 제작된 풀스택 인터랙티브 웹 기반 논리 게이트 시뮬레이터입니다. 고급 엔지니어링 하드웨어(Figma, Teenage Engineering 등)의 감성을 담은 다크/라이트 테마 시스템, 생동감 있는 네온 라임 그린 활성 상태 인디케이터, 둥근 모서리의 카드 프레임 및 매끄러운 SVG 상호작용을 통해 프리미엄 디자인 감각을 극대화했습니다.

현재 이 프로젝트는 단순한 정적 웹앱에서 **유저 인증 및 클라우드 진도 동기화 기능이 탑재된 풀스택 웹 애플리케이션**으로 업그레이드되었습니다.

---

## 🚀 주요 기능 (Key Features)

1. **커스텀 대화형 SVG 캔버스**: 노드 드래그 앤 드롭, 캔버스 우클릭 드래그(컨텍스트 메뉴 자동 차단)를 통한 그리드 팬(Pan) 이동, 마우스 휠을 통한 줌(Zoom), 20px 그리드 스냅 지원.
2. **빛나는 베지에 곡선 연결선**: 출력 핀을 클릭하고 드래그하여 입력 핀에 연결. 활성화된 도선은 선명한 네온 라임 그린색으로 빛나는 파티클 애니메이션을 띄우며, 비활성화된 선은 차분한 회색으로 표시됩니다.
3. **듀얼 시뮬레이션 엔진**:
   - **실시간 모드**: 신호가 토글될 때 즉시 전파되며, 클록 노드가 주기적으로 작동합니다.
   - **단계별 디버그 모드**: 시뮬레이션을 일시 중지하고 신호가 전파되는 과정을 한 틱씩 수동으로 단계별 모니터링할 수 있습니다.
4. **듀얼 모드 및 주소 라우팅 (react-router-dom)**:
   - **샌드박스 모드 (`/sandbox`)**: 자유롭게 게이트를 그리며 나만의 커스텀 합성 게이트를 무제한으로 만들 수 있는 공간입니다. (Sandbox에서는 탭들을 100% 가로로 시원하게 볼 수 있는 2단 '더블 데커' 헤더 탭 바가 제공됩니다.)
   - **학습 모드 (`/curriculum/:missionId`)**: NAND/NOR 기초 게이트부터 시작하여 4비트 CPU 계산기까지 설계해 나가는 교육용 맵 시스템입니다. (실시간 시뮬레이션 진도 채점 검증기 탑재)
5. **실시간 논리 분석기 (Logic Analyzer)**: 캔버스의 노드를 우측 패널에서 "💻 Probe"하여 화면 하단에서 실시간 전압 변화(100샘플, 50ms 간격)를 시각화합니다. 디버그 단계별 실행 모드에서도 가상 클록 진행도 비례(Time Proportionality)를 정확히 반영합니다.
6. **유저 로그인 & 클라우드 동기화**: 헤더에서 로그인/회원가입이 가능하며, 로그인 완료 시 학습 진도 및 미션 클리어 배치 상태가 백엔드 데이터베이스 서버에 실시간으로 자동 연동됩니다. (로그아웃 시에는 로컬 브라우저 `localStorage` 기반으로 자동 폴백 처리됩니다.)
7. **실행 취소 & 다시 실행 (Undo / Redo)**: 배치, 연결, 이름 변경, 삭제 등 모든 작업에 대해 완벽한 히스토리 추적(`Ctrl+Z` / `Ctrl+Y`)을 제공합니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend (Client)
- **Core**: React 19 (TypeScript) + Vite + React Router v7
- **Styling**: Vanilla CSS (CSS 변수를 활용한 Teenage Engineering 토큰 디자인 시스템)
- **Canvas**: 무거운 그래픽 라이브러리 없이 네이티브 SVG 요소와 DOM 이벤트만으로 구현
- **State Management**: 커스텀 React 훅 기반의 상태 엔진 ([useCircuitState.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/hooks/useCircuitState.ts))

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express (CommonJS 구동 포맷 `server.cjs` 제공)
- **Database**: 경량 파일 기반 관계형 데이터베이스 **SQLite** (`db/gatesim.db`에 테이블로 보존)
- **Authentication**: **JWT (JSON Web Tokens)** 및 고유 암호키 파일(`db/jwt_secret.key`)을 활용한 무상태 인증 시스템 (서버가 재기동되거나 PM2가 리로드되어도 7일간 로그인 세션 유지)

---

## 💻 실행 방법 (How to Run)

### 1. 패키지 설치
프로젝트 폴더 내에서 아래 명령을 실행하여 프론트엔드 및 백엔드에 필요한 모든 모듈을 설치합니다.
```bash
npm install
```

### 2. 로컬 개발 환경 실행 (포트 8081)
프론트엔드 Vite 개발 서버를 기동합니다.
```bash
npm run dev
```
브라우저에서 `http://localhost:8081/sandbox` 로 이동하여 실행합니다.

### 3. 프로덕션 빌드 및 백엔드 통합 가동 (Nginx + PM2 배포)
실제 백엔드 데이터 저장 기능이 작동하는 풀스택 프로덕션 서버를 배포하는 방법입니다.

```bash
# 1. 프론트엔드 배포 정적 파일 생성 (dist/ 폴더에 빌드)
npm run build

# 2. PM2를 통한 백엔드 API 서비스 백그라운드 구동 시작
pm2 start server.cjs --name gatesimulator

# 3. 서버 부팅 시 자동 재기동 등록 및 상태 저장
pm2 startup
pm2 save
```

#### Nginx Reverse Proxy 설정 예시
Vite 앱에 지정된 서브경로 `/gatesimulator/`로 들어오는 모든 요청(정적 파일 서빙 및 API 요청 포함)을 로컬 PM2 서버로 보내기 위해 Nginx 설정(`sites-available/default`)의 `server` 블록 내부에 아래 설정을 추가합니다.

```nginx
location /gatesimulator {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 웹소켓 및 실시간 접속 캐시 버패스 설정
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

---

## 📂 프로젝트 구조 (Project Structure)

* [server.cjs](file:///mnt/e/Programming/Projects/Hosting/GateSim/server.cjs): 풀스택 Express API 백엔드 구동 스크립트
* [design_plan.md](file:///mnt/e/Programming/Projects/Hosting/GateSim/design_plan.md): 게이트 모델 구조 및 시뮬레이션 설계 명세
* [session_context.md](file:///mnt/e/Programming/Projects/Hosting/GateSim/session_context.md): 전체 코드 요약본 (AI 세션 갱신용 요약 파일)
* [package.json](file:///mnt/e/Programming/Projects/Hosting/GateSim/package.json): 프론트엔드/백엔드 의존성 매니저
* [src/](file:///mnt/e/Programming/Projects/Hosting/GateSim/src)
  * [App.css](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/App.css): UI 레이아웃, 더블 데커 탭 바, 정렬 스타일
  * [App.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/App.tsx): 라우트 주입 및 메인 레이아웃 매핑
  * [index.css](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/index.css): 틴에이지 엔지니어링 감성의 전역 색상 변수 토큰 선언
  * [main.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/main.tsx): 라우팅 주입 및 DOM 렌더링 진입점
  * **types/**
    * [index.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/types/index.ts): 노드, 핀, 와이어 도선 구조 핵심 타입 모델정의
  * **hooks/**
    * [useCircuitState.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/hooks/useCircuitState.ts): 클라우드 동기화, 분석기 타이머 제어, 캔버스 연산 중앙 훅
  * **utils/**
    * [simulation.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/utils/simulation.ts): 큐(Queue) 기반 반응형 신호 전파 연산기
  * **components/**
    * [Header.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Header.tsx): 제어 바, 로그인 사용자 상태 확인 및 모달 제어
    * [Sidebar.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Sidebar.tsx): 부품 상자 및 학습 모드 미션 브리핑 목록
    * [Canvas.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Canvas.tsx): SVG 캔버스 물리 동작 렌더링 (그리드 스냅, 와이어 생성 등)
    * [Inspector.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Inspector.tsx): 선택 노드 편집기 혹은 탭 요약 대시보드
    * [WaveformViewer.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/WaveformViewer.tsx): 로직 분석기 파형 드로잉
    * [CreateCustomGateModal.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/CreateCustomGateModal.tsx): 합성 게이트 생성 창
    * [AuthModal.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/AuthModal.tsx): 회원가입 및 로그인 모달 창
