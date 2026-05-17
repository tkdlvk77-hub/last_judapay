# Judapay 프론트엔드 개발 가이드
> Claude 세션이 바뀌어도 이 파일을 읽으면 바로 이해할 수 있도록 작성된 개발 규칙 문서입니다.
> **새 세션 시작 시 반드시 이 파일을 먼저 읽으세요.**

---

## 1. 프로젝트 구조

```
judapay-front/src/
├── App.jsx                    # 라우터 + key={location.key} → 화면 전환 시 remount
├── index.css                  # 전역 CSS + 애니메이션 정의
├── main.jsx
├── components/
│   ├── BottomTab.jsx          # 하단 네비게이션 (모든 메인 화면에 필수)
│   ├── AmountInput.jsx
│   ├── DarkHeader.jsx
│   └── ExecuteHeader.jsx
├── contexts/
│   └── UserContext.jsx        # userType: 'personal' | 'business' | 'institution'
├── design/
│   ├── tokens.js              # COLORS, RADIUS, progressGradient 등
│   ├── accountTokens.js       # getAccountTheme() — userType별 색상 테마
│   └── components.jsx         # PhoneShell, GradientHeader, PageTitle, Badge, FilterChips 등
├── hooks/
│   ├── useStepHistory.js      # iOS 스와이프 백 가드 (★ 중요)
│   ├── useScrollRestore.js    # location.key 기반 스크롤 복원 (navigate 방식에서만 유효)
│   ├── useNoSwipeBack.js
│   └── useStoreData.js
├── shared/                    # 개인/기업 공통 화면
├── personal/                  # 개인 전용 화면
├── business/                  # 기업 전용 화면
└── institution/               # 기관 전용 화면
```

---

## 2. ★ 화면 전환 — 절대 규칙

### 문제: App.jsx의 `key={location.key}`
```jsx
// App.jsx — 현재 구조
<Route path="/messages" element={<Messages key={location.key} />} />
```
- `navigate()`로 이동할 때마다 `location.key`가 바뀜
- key가 바뀌면 React가 컴포넌트를 **완전히 unmount → remount**
- 무거운 화면(Messages, ChatRoom 등)에서 **스터터/프리즈** 발생

### 해결책: 화면 내 다단계 전환은 `setState`로

```jsx
// ❌ 나쁜 방법 — navigate → remount → 버벅임
const openChat = (id) => navigate('/messages/chat/' + id)

// ✅ 좋은 방법 — setState → 같은 컴포넌트 내 전환 → 부드러움
const [activeThread, setActiveThread] = useState(null)
const openChat = (id) => setActiveThread(id)
```

**규칙**: 같은 화면 안에서 "목록 → 상세 → 채팅방" 같은 단계 전환은 **반드시 useState**로 구현.
라우트 이동(`navigate`)은 완전히 다른 화면으로 나갈 때만 사용.

---

## 3. ★ 화면 진입 애니메이션

CSS 클래스만 붙이면 됩니다. `src/index.css`에 이미 정의되어 있음.

```jsx
// 앞으로 진입 (오른쪽에서 슬라이드인)
<div className="phone flex flex-col page-enter-right" style={{ height:'100%', overflow:'hidden' }}>

// 뒤로 돌아올 때 (왼쪽에서 스며들기)
<div className="phone flex flex-col page-enter-left" style={{ height:'100%', overflow:'hidden' }}>
```

### 방향 추적 패턴 (Messages.jsx 참고)
```jsx
const enterDirRef = useRef('forward')

const openThread = (id) => {
  enterDirRef.current = 'forward'
  setActiveThread(id)
}

const handleBack = () => {
  enterDirRef.current = 'back'
  setActiveThread(null)
}

// 렌더 시
const animClass = enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'
return <div className={`phone flex flex-col ${animClass}`} ...>
```

### CSS 정의 위치 (`src/index.css` 147번줄 근방)
```css
@keyframes pageEnterRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0%); }
}
.page-enter-right {
  animation: pageEnterRight 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes pageEnterLeft {
  from { transform: translateX(-30%); opacity: 0.6; }
  to   { transform: translateX(0);    opacity: 1; }
}
.page-enter-left {
  animation: pageEnterLeft 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes spin { to { transform: rotate(360deg); } }
```

---

## 4. ★ 스크롤 위치 저장/복원

### 방법 A: `useScrollRestore` 훅 (navigate 방식 화면에서만 유효)
`navigate()`로 이동하는 화면에서는 `location.key`가 바뀌므로 이 훅이 정상 동작합니다.

```jsx
import { useScrollRestore } from '../hooks/useScrollRestore'

const scrollRef = useScrollRestore()
return <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
```

### 방법 B: 수동 ref 방식 (setState 방식 화면에서 필수)
`setState`로 단계 전환할 때는 `location.key`가 바뀌지 않으므로 수동으로 저장해야 합니다.
**Messages.jsx가 이 방식을 사용합니다.**

```jsx
const scrollRef = useRef(null)
const savedScrollTop = useRef(0)

// 반드시 useState 선언 이후에 위치할 것
const saveScroll = () => {
  if (scrollRef.current) savedScrollTop.current = scrollRef.current.scrollTop
}

useEffect(() => {
  // 목록으로 돌아올 때 스크롤 복원
  if (!activeThread && scrollRef.current) {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = savedScrollTop.current
    })
  }
}, [activeThread])

// 채팅방 진입 전에 저장
const openThread = (id) => {
  saveScroll()
  setActiveThread(id)
}

// 스크롤 컨테이너에 ref 부착
return <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
```

---

## 5. ★ iOS 스와이프 백 가드 — `useStepHistory`

파일: `src/hooks/useStepHistory.js`

화면 내 다단계 구조(목록 → 상세)에서 iOS 스와이프 뒤로가기가 앱처럼 동작하게 해주는 훅.

```jsx
import { useStepHistory } from '../hooks/useStepHistory'

// isFirstStep이 true이면 sentinel 없음 (스와이프하면 이전 라우트로 이동)
// isFirstStep이 false이면 sentinel 삽입 (스와이프하면 handleBack 호출)
useStepHistory(handleBack, isFirstStep)

// 예시 (Messages.jsx)
useStepHistory(handleBack, !activeThread && !showDetail)
```

**주의**: `handleBack`이 호출된 직후, 다음 단계가 있으면 자동으로 새 sentinel을 push합니다.

---

## 6. ★ 코드 스플리팅 — React.lazy

무거운 화면(ChatRoom 등 300줄+)은 lazy로 분리해 초기 번들을 줄입니다.

```jsx
import { Suspense, lazy } from 'react'

// ★ 반드시 static import 이후에, 컴포넌트 함수 바깥에서 선언
const ChatRoom = lazy(() => import('./messages/ChatRoom'))

// 사용
<Suspense fallback={<LoadingSpinner />}>
  <ChatRoom ... />
</Suspense>
```

**오류 주의**: `lazy()` 선언은 static `import` 문들이 끝난 뒤에 위치해야 합니다.
컴포넌트 함수 안에 넣으면 렌더마다 새 Promise를 만들어 무한 리렌더 발생.

---

## 7. ★ React Hooks 선언 순서 규칙

JavaScript `const`는 호이스팅이 없습니다. 훅들은 **사용 전에 반드시 먼저 선언**해야 합니다.

```jsx
// ✅ 올바른 순서
const scrollRef = useRef(null)          // 1. useRef
const savedScrollTop = useRef(null)

const [activeThread, setActiveThread] = useState(null)  // 2. useState
const [showDetail, setShowDetail] = useState(false)

const saveScroll = () => { ... }        // 3. 일반 함수 (state 참조 가능)

useEffect(() => {                       // 4. useEffect (state, ref 참조 가능)
  if (!activeThread ...) { ... }
}, [activeThread])

// ❌ 잘못된 순서 — ReferenceError 발생
useEffect(() => {
  if (!activeThread ...) { ... }        // ← activeThread 아직 없음!
}, [activeThread])

const [activeThread, setActiveThread] = useState(null)  // 너무 늦음
```

---

## 8. 성능 최적화 규칙

### MOCK/정적 데이터는 모듈 레벨에 선언
```jsx
// ❌ 나쁨 — 렌더마다 새 객체 생성
function ChatRoom() {
  const MOCK_DATA = [{ id: 1, ... }, ...]  // 매 렌더마다 재생성
}

// ✅ 좋음 — 모듈 레벨 (한 번만 생성)
const MOCK_DATA = [{ id: 1, ... }, ...]

function ChatRoom() { ... }
```

### 무거운 계산은 useMemo
```jsx
const sortedThreads = useMemo(() =>
  threads.sort(...), [threads]
)
```

---

## 9. 화면 구조 템플릿

### 단일 화면 (목록/홈)
```jsx
import BottomTab from '../components/BottomTab'
import { PhoneShell, GradientHeader, PageTitle } from '../design/components'

export default function MyScreen() {
  const scrollRef = useScrollRestore()  // navigate 방식

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <GradientHeader ...>
          <PageTitle title="화면 제목" />
        </GradientHeader>
        {/* 내용 */}
      </div>
      <BottomTab />  {/* ← 반드시 PhoneShell 안에, scrollRef div 밖에 */}
    </PhoneShell>
  )
}
```

### 다단계 화면 (목록 → 상세, Messages 패턴)
```jsx
export default function MyScreen() {
  const scrollRef = useRef(null)
  const savedScrollTop = useRef(0)
  const enterDirRef = useRef('forward')

  // ★ useState 먼저
  const [activeItem, setActiveItem] = useState(null)

  // ★ 그 다음 함수/useEffect
  const saveScroll = () => { ... }
  useEffect(() => { /* 스크롤 복원 */ }, [activeItem])

  const openItem = (id) => { saveScroll(); enterDirRef.current = 'forward'; setActiveItem(id) }
  const handleBack = () => { enterDirRef.current = 'back'; setActiveItem(null) }

  useStepHistory(handleBack, !activeItem)

  // 상세 화면
  if (activeItem) {
    return (
      <div className={`phone flex flex-col ${enterDirRef.current === 'forward' ? 'page-enter-right' : 'page-enter-left'}`}
           style={{ height:'100%', overflow:'hidden' }}>
        <DetailComponent onBack={handleBack} />
      </div>
    )
  }

  // 목록 화면
  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        ...
      </div>
      <BottomTab />
    </PhoneShell>
  )
}
```

---

## 10. 자주 발생하는 오류 & 해결법

| 오류 | 원인 | 해결 |
|------|------|------|
| `ReferenceError: Cannot access 'X' before initialization` | useEffect/함수가 useState보다 위에 선언됨 | useState를 useEffect 위로 이동 |
| CSS parse error: Unclosed block | `@keyframes` 블록 미완성 또는 내부에 다른 규칙 삽입 | `@keyframes`의 `from`/`to`/`}` 완성 후 분리 |
| 화면 진입 시 버벅임/프리즈 | `navigate()` + `key={location.key}` → remount | setState 방식으로 전환 |
| 스크롤 복원 안됨 | setState 방식인데 `useScrollRestore` 사용 | 수동 ref 방식(방법 B)으로 교체 |
| `lazy()` 무한 리렌더 | `lazy()`를 컴포넌트 함수 내부에 선언 | 모듈 최상위로 이동 |
| BottomTab 안 나옴 | import는 했지만 JSX에 렌더링 누락 | `<BottomTab />`을 `</PhoneShell>` 바로 앞에 추가 |
| ES module syntax error | static `import` 사이에 `const X = lazy(...)` 삽입 | lazy 선언을 모든 import 이후로 이동 |

---

## 11. 코드 정리 원칙 (앞으로 모든 작업 시 적용)

수정 작업 시 함께 정리할 것들:
1. **사용하지 않는 import** 제거
2. **수정 과정에서 주석 처리된 채 남은 코드** 제거
3. **backup 파일** 확인 후 삭제 (예: `HomeBusiness.backup_v2.9.jsx`)
4. **중복 선언** (같은 변수/상수 두 번 선언) 제거
5. **console.log, console.warn** 디버그 로그 제거
6. **수정 전 검증**: 중괄호 균형 체크, import 순서 확인

---

## 12. 현재 진행 중인 작업 (Tasks)

| # | 내용 | 상태 |
|---|------|------|
| 2 | HomeBusiness 기업 홈 화면 고도화 | 대기 |
| 21 | ChatActionsPersonal.jsx 생성 | 진행중 |
| 22 | ChatActionsBusiness.jsx 생성 | 대기 |
| 23 | ChatRoom.jsx 분리 + userType 연결 | 대기 |
| 24 | Messages.jsx 슬림화 + 필터 userType 분기 | 대기 |

---

*최종 업데이트: 2026-05-17*

---

## 13. ★ Collapse 헤더 패턴 (표준)

"○○ 화면 헤더 적용해줘" 또는 "collapse 헤더 적용해줘" 라고 하면 아래 패턴 그대로 적용.

### 핵심 원칙
- **헤더 전체를 스크롤 컨테이너 안에 배치** (밖에 두면 스크롤 속도 왜곡 발생)
- **Sticky 네비 바** (`position: sticky, top: 0`) — 항상 화면 상단 고정
- **Sticky 탭 바** (`position: sticky, top: 66px`) — 네비 바 바로 아래 고정
- **프로필/KPI/본문 요약** — 자연스럽게 스크롤됨
- **CSS transition 금지** — 타이틀 크로스페이드는 직접 DOM 조작 (ref.current.style)
- **절대 boolean collapsed 상태 쓰지 말 것** — 스크롤 양에 비례하는 ref 방식만 사용

### DOM 구조
```jsx
<PhoneShell className="page-enter-right">
  <div ref={scrollRef} style={{ flex:1, overflowY:'auto', minHeight:0 }}>

    {/* ① Sticky 네비 바 — 항상 고정 */}
    <div style={{
      position:'sticky', top:0, zIndex:10,
      background: HEADER_COLOR,        // 헤더 배경색 (단색 권장)
      display:'flex', alignItems:'center', gap:'8px',
      padding:'20px 16px 14px',        // 출금 화면 기준 높이 (66px)
      overflow:'hidden',
    }}>
      {/* 뒤로가기 버튼 */}
      <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', ... }}>
        <svg ...back arrow... />
      </button>

      {/* 타이틀 크로스페이드: "화면명" → 수신자/항목명 */}
      <span style={{ flex:1, position:'relative', height:'22px', overflow:'hidden' }}>
        <span ref={title1Ref} style={{ position:'absolute', inset:0, ... }}>화면 타이틀</span>
        <span ref={title2Ref} style={{ position:'absolute', inset:0, ..., opacity:0 }}>항목명</span>
      </span>

      {/* 우측 액션 버튼 (있는 경우) */}
      <button ref={actionBtnRef} ...>...</button>
    </div>

    {/* ② 요약 정보 영역 — 자연스럽게 스크롤됨 */}
    <div style={{ background: HEADER_GRADIENT, padding:'12px 20px 16px' }}>
      {/* 프로필, KPI, 잔액 등 */}
    </div>

    {/* ③ Sticky 탭 바 (있는 경우) */}
    <div style={{ position:'sticky', top:'66px', zIndex:9, background: HEADER_COLOR, ... }}>
      {탭 버튼들}
    </div>

    {/* ④ 콘텐츠 */}
    <div style={{ ...본문... }}>...</div>

  </div>
</PhoneShell>
```

### 타이틀 크로스페이드 + 버튼 페이드 (직접 DOM)
```jsx
// refs
const scrollRef   = useRef(null)
const title1Ref   = useRef(null)   // 기본 타이틀
const title2Ref   = useRef(null)   // 스크롤 후 타이틀 (항목명 등)
const actionBtnRef = useRef(null)  // 우측 버튼 (없으면 생략)

// scroll useEffect — React re-render 없이 직접 DOM 조작
useEffect(() => {
  const el = scrollRef.current
  if (!el) return
  const FADE_START = 60
  const FADE_END   = 110
  let raf = null

  const update = () => {
    const p = Math.min(1, Math.max(0, (el.scrollTop - FADE_START) / (FADE_END - FADE_START)))
    if (title1Ref.current)
      title1Ref.current.style.opacity = String(Math.max(0, 1 - p * 1.6))
    if (title2Ref.current)
      title2Ref.current.style.opacity = String(Math.max(0, (p - 0.4) * 1.8))
    if (actionBtnRef.current) {
      const mo = Math.max(0, 1 - p * 2)
      actionBtnRef.current.style.opacity      = String(mo)
      actionBtnRef.current.style.pointerEvents = mo < 0.05 ? 'none' : 'auto'
    }
    raf = null
  }

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
  el.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    el.removeEventListener('scroll', onScroll)
    if (raf) cancelAnimationFrame(raf)
  }
}, [])
```

### 색상 가이드
- 네비 바 + 탭 바: 단색 (예: `'#7C2D12'`, `'#1A1A2E'` 등 헤더 최상단 색)
- 프로필/요약 영역: 그라디언트 (같은 색 계열로 하단으로 밝아지게)
- 두 영역 배경이 이어지도록 네비 바 색 = 그라디언트 시작 색

### 주의사항
| ❌ 하면 안 됨 | ✅ 올바른 방법 |
|---|---|
| 헤더를 스크롤 컨테이너 밖에 두기 | 헤더를 스크롤 컨테이너 안에 배치 |
| `boolean collapsed` state 사용 | `ref.current.style` 직접 조작 |
| CSS `transition` 사용 | transition 없이 scroll 1:1 연동 |
| 패딩 div 별도로 분리 | 네비 바 padding에 통합 (`padding:'20px 16px 14px'`) |
| sticky top 값 임의 지정 | 네비 바 실제 높이(66px) 기준으로 설정 |

*최종 업데이트: 2026-05-17*
