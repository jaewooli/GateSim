# GateSim ⚡ 직관적인 촉각 피드백 논리 게이트 시뮬레이터 (Tactile Logic Gate Simulator)

GateSim은 **React, Vite, TypeScript**로 제작된 인터랙티브 웹 기반 논리 게이트 시뮬레이터입니다. 고급 엔지니어링 하드웨어(Figma, Teenage Engineering 등)의 감성을 담은 따뜻한 라이트 그레이 톤의 색상, 생동감 있는 라임 그린 활성 상태 인디케이터, 둥근 모서리의 카드 프레임 및 매끄러운 SVG 상호작용을 통해 프리미엄 디자인 감각을 극대화했습니다.

---

## 🚀 주요 기능 (Key Features)

1. **커스텀 대화형 SVG 캔버스**: 노드 드래그 앤 드롭, 캔버스 빈 곳을 드래그하여 그리드 팬(Pan) 이동, 마우스 휠을 통한 줌(Zoom), 20px 그리드 스냅 지원.
2. **빛나는 베지에 곡선 연결선**: 출력 핀을 클릭하고 드래그하여 입력 핀에 드롭. 활성화된 도선은 선명한 네온 라임 그린색으로 빛나며, 비활성화된 선은 차분한 회색으로 표시됩니다.
3. **듀얼 시뮬레이션 엔진**:
   - **실시간 모드**: 신호가 토글될 때 즉시 전파되며, 클록 노드가 주기적으로 작동합니다.
   - **단계별 디버그 모드**: 시뮬레이션을 일시 중지하고 신호가 전파되는 과정을 한 틱씩 수동으로 단계별 모니터링할 수 있습니다.
4. **커스텀 서브 회로 (합성 게이트)**: 설계한 회로를 입력/출력 포트 노드가 포함된 멀티 탭 작업공간에서 재사용 가능한 커스텀 게이트로 패키징할 수 있습니다.
5. **실행 취소 & 다시 실행 (Undo / Redo)**: 배치, 연결, 이름 변경, 삭제 등 모든 작업에 대해 완벽한 히스토리 추적(`Ctrl+Z` / `Ctrl+Y`)을 제공합니다.
6. **저장 / 불러오기 및 내보내기**: 설계한 회로를 이식 가능한 JSON 파일로 내보내고, 언제든지 다시 불러올 수 있습니다.

---

## 🛠 기술 스택 (Tech Stack)

- **Core**: React 18 (TypeScript) + Vite
- **Styling**: Vanilla CSS (CSS 변수를 활용한 토큰 디자인 시스템)
- **Canvas**: 무거운 그래픽 라이브러리 없이 네이티브 SVG 요소와 DOM 이벤트만으로 구현
- **State Management**: 커스텀 React 훅 기반의 상태 엔진 ([useCircuitState.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/hooks/useCircuitState.ts))
- **Simulation**: 큐(Queue) 기반의 반응형 전파 알고리즘 ([simulation.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/utils/simulation.ts))

---

## 💻 실행 방법 (How to Run)

로컬 개발 환경에서 프로젝트를 실행하려면 아래 단계를 따르세요.

### 1. 패키지 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```
실행 후 브라우저에서 로컬 주소(기본값: `http://localhost:5173`)를 엽니다.

### 3. 프로덕션 빌드
```bash
npm run build
```
빌드가 완료되면 호스팅 가능한 정적 파일들이 `dist/` 디렉토리에 생성됩니다.

---

## 📂 프로젝트 구조 (Project Structure)

- [design_plan.md](file:///mnt/e/Programming/Projects/Hosting/GateSim/design_plan.md): 아키텍처 의사결정 및 데이터 모델 명세
- [package.json](file:///mnt/e/Programming/Projects/Hosting/GateSim/package.json): 프로젝트 의존성 설정
- [src/](file:///mnt/e/Programming/Projects/Hosting/GateSim/src)
  - [App.css](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/App.css): UI 그리드 및 레이아웃 스타일
  - [App.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/App.tsx): 전반적인 레이아웃 및 React 바인딩
  - [index.css](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/index.css): CSS 토큰 및 전역 HTML/SVG 스타일
  - [main.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/main.tsx): React 렌더링 진입점
  - **types/**
    - [index.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/types/index.ts): TypeScript 인터페이스 정의 (Node, Pin, Connection, Tab)
  - **hooks/**
    - [useCircuitState.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/hooks/useCircuitState.ts): 중앙 상태 관리 훅 (Undo/Redo, 드래그 상태 관리 등)
  - **utils/**
    - [simulation.ts](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/utils/simulation.ts): 큐 기반 반응형 신호 전파 엔진
  - **components/**
    - [Header.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Header.tsx): 상단 네비게이션, 파일 입출력 및 탭 관리
    - [Sidebar.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Sidebar.tsx): 드래그 앤 드롭 부품 상자
    - [Canvas.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Canvas.tsx): 인터랙티브 SVG 작업공간 및 도선 연결 관리
    - [Inspector.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/Inspector.tsx): 선택한 컴포넌트 속성 편집기
    - [CreateCustomGateModal.tsx](file:///mnt/e/Programming/Projects/Hosting/GateSim/src/components/CreateCustomGateModal.tsx): 커스텀 게이트 생성 모달
