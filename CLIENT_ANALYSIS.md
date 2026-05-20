# Judapay 클라이언트 프로젝트 분석 보고서 (`last_judapay`)

> 분석 일자: 2026-05-20
> 분석 대상: `/judapay_new/last_judapay`
> 분석자: Claude (재분석)

---

## 1. 요약 (Executive Summary)

`last_judapay`는 주다페이(Judapay) 결제·자금집행 서비스의 **모바일 우선 웹 클라이언트**입니다. React 18 + Vite + React Router v6 기반의 단일 페이지 애플리케이션(SPA)으로, iOS/Android 네이티브 셸(WebView) 위에서도 동작하도록 설계되어 있습니다.

핵심 특징:

- 약 **135개 소스 파일, 73,470 라인** 규모의 중대형 프론트엔드
- **개인·기업·기관** 3종 사용자 타입 분기 (현재 코드상 personal/business 위주)
- **20여 개의 자금집행(Execute) 시나리오** — 급여, 외주비, 임대료, 4대보험, 세금, 투자, 대여금 등
- 서버 연동은 **JWT(액세스/리프레시) + STOMP-over-SockJS 실시간 채널** 구조
- 현재 상당 부분이 **데모 모드(목 데이터)**로 동작 — 백엔드 미연결 상태에서도 UX가 흐른다

가장 큰 강점은 깔끔하게 모듈화된 자금집행 스텝(공통 `PinStep`/`ConfirmStep`/`DoneStep`)과 디자인 토큰 체계입니다. 가장 큰 리스크는 **보안 측면의 클라이언트 사이드 PIN/권한 판정** 및 **sessionStorage에 평문으로 저장되는 토큰**입니다 (자세한 내용은 §5 참조).

---

## 2. 전체 아키텍처 개요

### 2.1 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 빌드 | Vite 5.1 + `@vitejs/plugin-react` |
| UI 프레임워크 | React 18.2 (함수형 + Hooks) |
| 라우팅 | React Router DOM v6.22 (`BrowserRouter`) |
| 상태 관리 | Context API + 자체 구현 store(`transactionStore` 등) + `sessionStorage` 동기화 |
| 스타일 | Tailwind 3.4 + 인라인 스타일 + 디자인 토큰(`design/tokens.js`) |
| 애니메이션 | framer-motion 12.38, 자체 `page-enter-right/left` 키프레임 |
| 실시간 통신 | `@stomp/stompjs` + `sockjs-client` (코드상 import) |
| 배포 | Vercel (`vercel.json` 존재) |
| 네이티브 셸 | iOS/Android WebView (`window.JudaPay.platform` 분기) |

### 2.2 디렉토리 구조

```
front/src/
├── App.jsx              # 스택형 화면 전환 매니저 (entering/exiting 페이즈)
├── AppRoutes.jsx        # 90+ 라우트 정의 + Protected 가드
├── main.jsx             # 진입점 + visualViewport 보정
├── index.css            # 전역 + 키프레임 애니메이션
│
├── components/          # 공용 UI (BottomTab, AmountInput, Dialog 등)
├── contexts/            # UserContext (userType 전역 상태)
├── design/              # 디자인 토큰 + i18n + 공통 컴포넌트
├── hooks/               # useStepHistory(스와이프백), useScrollRestore 등
├── native/              # 네이티브 셸 브릿지 (StatusBar 등)
├── services/            # api.js / auth.js / hydrate.js / realtime.js
│
├── personal/            # 개인 사용자 전용 화면
│   └── execute/         # 7종 자금집행 (gift, living, lend, invest 등)
├── business/            # 기업 사용자 전용 화면
│   └── execute/         # 22종 자금집행 (salary, freelance, rent, tax 등)
├── institution/         # 기관 사용자 (현재 1화면만)
│
└── shared/              # 공통 화면
    ├── auth/            # Start, Login, SignupPersonal/Business, SignupPin
    ├── execute/         # Execute, ConfirmStep, PinStep, DoneStep, MccBlock
    └── messages/        # ChatRoom, ChatActionsPersonal/Business, ...
```

### 2.3 화면 전환 모델 (App.jsx의 가장 큰 특징)

`App.jsx`는 단순한 라우팅이 아닌 **자체 구현된 스택(stack) 기반 화면 매니저**입니다:

- `useLocation()` / `useNavigationType()`을 추적하여 PUSH/POP/REPLACE 별 페이즈 부여
- 각 화면은 `entering → entered → exiting` 페이즈 사이를 이동
- `transform: translate3d(x, 0, 0)` + transition 으로 슬라이드 인/아웃
- iOS 네이티브 셸일 때는 WebView 측 슬라이드와 충돌하지 않도록 exit 애니메이션 즉시 unmount (`IS_IOS_SHELL` 분기)
- TAB_PATHS에 속한 경로는 스택 리셋

이 패턴은 네이티브 앱의 화면 스택 느낌을 웹에서 재현하려는 의도이며, `CLAUDE_DEV_GUIDE.md`에서 강조하는 "navigate 대신 setState로 화면 단계 전환" 원칙과 짝을 이룹니다.

### 2.4 라우팅 가드

`AppRoutes.jsx`의 `Protected` 컴포넌트는 **`sessionStorage.bizType`을 직접 읽어** 사용자 타입을 판정합니다. UserContext가 아닌 sessionStorage를 직접 보는 이유는 주석에 "Context 의존 제거"로 표기되어 있습니다.

```jsx
function Protected({ children, requireType }) {
  const stored = sessionStorage.getItem('bizType')
  const userType = stored === 'business' ? 'business' :
                   stored === 'personal' ? 'personal' : null
  if (!userType) return <Navigate to="/" replace />
  if (requireType && userType !== requireType) {
    return <Navigate to={userType === 'business' ? '/home-business' : '/home'} replace />
  }
  return children
}
```

---

## 3. 코드 품질 및 개선점

### 3.1 잘 되어 있는 점

**모듈화된 자금집행 컴포넌트.** `PinStep`, `ConfirmStep`, `DoneStep`이 공용 컴포넌트로 분리되어 있어 20여 개의 자금집행 화면이 동일한 UX 패턴을 따릅니다. 헤더 그라데이션, 단계 표시기, 거래 요약 미니박스, 종료 확인 모달 등 디테일이 일관성 있게 처리되어 있습니다.

**디자인 토큰 체계.** `design/tokens.js`(컬러/라운드/섀도우/그라데이션), `design/accountTokens.js`(사용자 타입별 테마), `design/components.jsx`(`PhoneShell`, `GradientHeader`, `PageTitle` 등 원자 단위 컴포넌트)로 분리되어 있어 디자인 시스템의 기반이 잡혀 있습니다.

**개발자 가이드 문서화.** `CLAUDE_DEV_GUIDE.md`는 화면 전환 규칙, Hooks 선언 순서, 스크롤 복원 패턴, 코드 스플리팅(`React.lazy`), 자주 발생하는 오류 등을 정리한 매우 실용적인 문서입니다.

**부드러운 화면 전환.** App.jsx의 스택 매니저와 `page-enter-right/left` CSS 키프레임이 결합해 네이티브 앱 수준의 슬라이드 전환을 구현합니다.

### 3.2 개선이 필요한 점

#### 3.2.1 인라인 스타일 과다

대부분의 화면이 **수백 줄에 달하는 인라인 `style={{ ... }}` 객체**로 작성되어 있습니다 (`PinStep.jsx`, `ConfirmStep.jsx`, `HomePersonal.jsx` 등). Tailwind와 디자인 토큰이 있음에도 활용도가 낮습니다.

문제점:
- 매 렌더마다 스타일 객체가 재생성되어 React가 props 변경으로 인식 (memoization 효과 감소)
- 컴포넌트 가독성 저하 — JSX 트리가 스타일 객체에 묻힘
- 디자인 토큰의 영향 범위가 제한적 (값을 바꿔도 인라인 hex가 곳곳에 산재)

권장: `clsx` + Tailwind 또는 CSS Modules로 점진적 마이그레이션. 최소한 자주 쓰이는 스타일 객체는 모듈 레벨 상수로 추출.

#### 3.2.2 백업 파일이 소스 트리에 포함

```
business/HomeBusiness.backup_v2.9.jsx
```

`.gitignore` 처리 또는 삭제 필요. `CLAUDE_DEV_GUIDE.md` §11 "코드 정리 원칙"에도 명시되어 있으나 실제로 남아있음.

#### 3.2.3 큰 파일들

```
business/execute/ExecuteSalary.jsx        (1037 line+, 인라인 직원 데이터 포함)
shared/ApprovalCenter.jsx                 (1791 line+)
```

특히 `ExecuteSalary.jsx`는 직원 명단(`'01012345678':'김지수', ...`)이 컴포넌트 내부에 하드코딩되어 있습니다. 데이터 / 비즈니스 로직 / 프레젠테이션 분리가 필요합니다.

#### 3.2.4 라우트 정의 비대화

`AppRoutes.jsx`가 80+ import + 90+ `<Route>` 선언으로 매우 큽니다. 다음 패턴 권장:

- 도메인별 라우트 모듈 분리 (`routes/business.jsx`, `routes/personal.jsx`)
- `React.lazy()` + `Suspense`로 자금집행 화면 코드 스플리팅 (현재 모든 화면이 초기 번들에 포함됨)
- `Protected` 래핑을 매 Route 마다 반복하지 않도록 `<Route element={<Protected>}>` 그룹화

#### 3.2.5 sessionStorage 직접 읽기 분산

`Protected`, `getUserType()`, `PinStep`의 권한 가드 등 여러 곳에서 `sessionStorage.getItem('bizType')` / `'bizRole'`을 직접 읽습니다. Context와 sessionStorage가 이중으로 관리되어 동기화 누락 위험이 있습니다.

권장: 단일 출처(SSO)로 통합. UserContext가 sessionStorage를 owns 하도록 하고, 모든 읽기는 `useUser()` 또는 named selector를 통하도록.

#### 3.2.6 console.* 잔존

`design/notification_events.js`, `shared/activityLogStore.js`, `shared/merchantCategoryMapper.js` 등에 `console.log`/`console.warn`/`console.table` 호출이 남아있습니다. 프로덕션 빌드에서는 Vite plugin(`vite-plugin-remove-console`) 또는 ESLint rule로 제거 권장.

#### 3.2.7 데모 분기 로직이 소스에 남아있음

```jsx
// shared/auth/Login.jsx
const type = next === '999999' ? 'business' : 'personal'  // 데모: PIN 999999는 기업
```

서비스 출시 전 반드시 제거 필요. 백엔드 응답의 `userType`에 의존하도록 전환 (이미 `auth.js`의 `persistSession`은 그렇게 되어 있음 — Login.jsx만 미연결).

---

## 4. 서버 연동 분석

### 4.1 HTTP 클라이언트 — `services/api.js`

견고하게 작성된 fetch 래퍼입니다:

- `VITE_API_BASE` 환경변수 또는 same-origin 자동 선택 (로컬에선 Vite proxy 활용 의도)
- sessionStorage의 `judapay.accessToken`을 자동으로 `Authorization: Bearer ...` 첨부
- **401 응답 시 한 번에 한 번만 refresh** (`refreshing` 프로미스 캐싱) — 동시 401 폭주 방지
- refresh 실패 → 토큰 클리어 → `/`로 리다이렉트
- `api.get/post/put/patch/del` 단축 헬퍼

### 4.2 인증 — `services/auth.js`

```
POST /api/auth/signup    → { accessToken, refreshToken, userId, userType, bizRole }
POST /api/auth/login     → 위와 동일
POST /api/auth/refresh   → 새 토큰 쌍
```

응답 받은 토큰 쌍과 사용자 정보는 `sessionStorage`에 저장됩니다. 기존 가드(Protected) 호환을 위해 `bizType`/`bizRole`도 별도 키에 미러링.

### 4.3 부팅 시 하이드레이션 — `services/hydrate.js`

토큰이 있을 때 4개 엔드포인트를 병렬 호출하여 클라이언트 store를 시드합니다:

```
GET /api/wallets                            → window.__judapay_wallets
GET /api/transactions/feed?page=0&size=50   → transactionStore.ingestServerTransactions
GET /api/alerts?tab=all&limit=50            → ingestServerAlerts
GET /api/messages/threads                   → ingestServerMessageThreads
```

`Promise.allSettled`로 실패 격리, 끝나면 `judapay:hydrated` 커스텀 이벤트 dispatch. 토큰 없으면 no-op(데모 모드).

### 4.4 실시간 — `services/realtime.js`

STOMP-over-SockJS 클라이언트가 정의되어 있습니다:

```
WS: ${API_BASE}/ws  (SockJS endpoint)
SUB: /topic/user/{userId}
Payload: { kind: 'alert' | 'transaction' | 'message', data: {...} }
```

수신된 이벤트는 (1) 즉시 store에 push (`pushServerTransaction`, `pushServerAlert`), (2) `judapay:realtime` 커스텀 이벤트로 fanout. `reconnectDelay: 4000`, `heartbeat: 10s`로 자동 재연결.

다만 **`hydrate()`와 `connectRealtime()`을 호출하는 곳이 소스에서 명시적으로 보이지 않습니다** (예: `main.jsx`나 `UserProvider`에서 자동 트리거하지 않음). 로그인 성공 후 어딘가에서 호출되어야 하는데, 이 부분이 누락된 것으로 보입니다. **검토 필요**.

### 4.5 데모/실서비스 듀얼 모드

`services/currentUser.js`는 토큰의 userId를 우선 사용하되, 없으면 `'u1'`/`'biz_juda'`/`'i1'` 같은 데모 ID로 폴백합니다. 이 덕분에 백엔드 없이도 UI 흐름을 시연할 수 있지만, **실서비스 전환 시 분기 코드를 일제히 정리해야 합니다.**

---

## 5. 보안 및 결제 로직 분석

### 5.1 토큰 저장 — sessionStorage 사용

`api.js`는 access/refresh 토큰을 `sessionStorage`에 저장합니다.

| 측면 | 평가 |
|---|---|
| XSS 노출 | sessionStorage는 동일 origin의 JS에서 접근 가능 → XSS 발생 시 토큰 탈취 가능 |
| 탭 격리 | 탭마다 격리 (localStorage 대비 우수) |
| 새로고침 | 유지됨 (탭이 살아있는 한) |
| 모바일 WebView | 네이티브 셸이 처리하는 인증과 별개로 동작 — 통합 검토 필요 |

권장:
- 토큰은 **httpOnly + Secure + SameSite=Strict 쿠키**로 발급, `apiFetch`는 `credentials: 'include'` 사용
- 또는 access token만 메모리 변수에 보관, refresh token만 httpOnly 쿠키
- CSP(Content-Security-Policy) 헤더로 XSS 위험 완화

### 5.2 PIN 처리

**PIN 6자리는 자금집행과 로그인의 핵심 인증 수단**이지만, 현재 구현에서는:

1. **클라이언트에서 평문으로 핸들링** — `PinStep`은 `pin` state에 6자리를 모은 뒤 `onComplete()` 콜백만 호출합니다. 실제 검증 로직(`onComplete`의 구현)이 보이지 않으며, 서버 검증 API 호출이 명시적으로 보이지 않습니다.
2. **Login.jsx의 데모 분기** — `if (next === '999999') type = 'business'`로 PIN을 사용자 타입 분기에 그대로 사용. 백엔드 인증 미연동.
3. **5회 오류 → 30분 잠금** 문구가 표시되지만, 실제로 클라이언트가 이 정책을 강제하는 코드는 보이지 않음 — 서버에서 구현되어야 함.

권장:
- PIN은 **반드시 서버에 전송하여 검증** (PBKDF2/Argon2 등으로 솔트 + 해시 저장)
- 클라이언트에서는 PIN을 즉시 zeroize (state에서 빠르게 비움) — 현재 `setPin('')`은 하고 있음
- 잠금 정책은 서버 차원에서 enforcing (계정 단위 / 디바이스 단위)
- Face ID 분기는 native bridge로 위임, 웹 단독 폴백은 데모 표시 전용

### 5.3 권한(role) 기반 가드

`PinStep.jsx`는 기업 사용자 중 `viewer`/`manager` 역할은 직접 집행 불가능하게 가드합니다 (master만 집행 가능):

```jsx
const BIZ_NO_EXECUTE = ['viewer', 'manager']
if (bizType === 'business' && bizRole && BIZ_NO_EXECUTE.includes(bizRole)) {
  return <집행권한 없음 화면>
}
```

좋은 의도이나, **클라이언트 가드만으로는 보안 효과가 없습니다.** 서버의 결제 API가 동일한 role 검증을 반드시 수행해야 합니다 (요청 토큰의 claim 또는 user 조회 후 비교).

### 5.4 PII / 민감정보 인라인 노출

```
business/execute/ExecuteSalary.jsx:18: '01012345678':'김지수', '01022223333':'박성민', ...
business/execute/ExecuteSalary.jsx:43: bankName:'국민', bankAccount:'12345678901234',
```

실제 서비스 데이터는 아니라 데모 더미겠으나, **번들에 그대로 포함되어 배포될 위험**이 있습니다. 데모 데이터는 환경변수 또는 별도 fixture 모듈로 분리하여 프로덕션 빌드에서 트리쉐이킹되도록 권장.

### 5.5 외부 출처 의존성

- `framer-motion@^12.38.0`, `@stomp/stompjs`, `sockjs-client` 등 의존성이 있음
- `package-lock.json` 91KB → 의존성 트리 큼
- npm audit 결과 확인 + Renovate/Dependabot 적용 권장

### 5.6 결제 흐름 요약

자금집행은 다음 공통 5단계로 일관성 있게 구성되어 있습니다:

```
1) 메뉴 선택  (Execute → 개인/사업자 분기)
2) 입력       (수령인, 금액, 사유, 지급일, 지갑)
3) 확인       (ConfirmStep — 요약 카드 + 자동처리 안내 + 잔액 미리보기)
4) PIN        (PinStep — 6자리 + Face ID 옵션 + 권한 가드)
5) 완료       (DoneStep + transactionStore.addTransaction)
```

`transactionStore.addTransaction()`이 호출되면 클라이언트 사이드에서:
- 거래 레코드 push
- 보낸/받은 사람 양쪽에 activity, alerts, messages 자동 생성
- 비가입자는 휴대폰 번호 기반으로 보관 (이후 가입 시 매칭)

**위험 신호**: 현재 코드 흐름상 결제 성공이 **클라이언트 측 store 갱신으로만 완결**될 가능성이 있어 보입니다. 서버 결제 API 호출 → 응답 확인 → 그 다음에 store 반영 순서가 명확히 강제되어 있는지 검증 필요. (전체 Execute*.jsx를 깊게 보지 못함)

---

## 6. 우선순위별 개선 권장사항

### 🔴 출시 전 필수 (Security)

1. **토큰 저장소 재검토** — sessionStorage → httpOnly 쿠키 또는 메모리 + httpOnly refresh 쿠키
2. **데모 PIN 분기 제거** — `Login.jsx`의 `999999 → business` 코드 제거, 백엔드 인증 응답 기반으로 전환
3. **PIN 서버 검증 경로 확립** — `PinStep.onComplete`에서 반드시 `POST /api/auth/pin-verify` 등 호출
4. **결제 API 서버 검증** — 클라이언트 store 갱신 전에 서버 confirm 응답 필수
5. **민감 더미 데이터 분리** — 실제 형식의 폰번호/계좌번호 등을 환경 분리 fixture로 이동

### 🟡 중기 (Quality & Maintainability)

6. `AppRoutes.jsx` 도메인별 분할 + `React.lazy()` 코드 스플리팅
7. `ExecuteSalary.jsx`, `ApprovalCenter.jsx` 등 대형 파일 리팩터
8. 인라인 스타일 → Tailwind / CSS Modules 점진 전환
9. `Protected`/`getUserType()`/`PinStep` 권한 가드의 단일 출처화 (Context로 통합)
10. `console.*` 호출 제거 (vite plugin)
11. `HomeBusiness.backup_v2.9.jsx` 등 백업 파일 제거
12. `hydrate()` / `connectRealtime()` 호출부 명시화 — 로그인 성공 시 자동 실행 보장

### 🟢 장기 (Performance & DX)

13. 메시지/홈/승인센터 같은 무거운 화면 lazy 적용
14. 상태 라이브러리 도입 검토 (Zustand 등) — 현재의 custom store + 이벤트 fanout 패턴 단순화
15. TypeScript 도입 — 결제 데이터 타입 안정성 확보
16. E2E 테스트 (Playwright)로 자금집행 5단계 회귀 방지
17. CI에서 `npm audit` + Renovate 자동 PR
18. 디자인 시스템 Storybook화

---

## 7. 종합 평가

| 영역 | 점수 | 코멘트 |
|---|---|---|
| 아키텍처 명료성 | ★★★★☆ | 화면 분류와 디자인 시스템이 명확. 라우트 비대만 보완하면 매우 우수 |
| 코드 일관성 | ★★★☆☆ | 자금집행 흐름은 일관됨. 인라인 스타일 등은 미정리 |
| 서버 연동 | ★★★☆☆ | api/auth/realtime 골격 양호. 실제 호출부 누락 의심 |
| 보안 | ★★☆☆☆ | 데모 분기·sessionStorage·클라이언트 가드 위주 — 출시 전 강화 필요 |
| 성능 | ★★★☆☆ | 화면 전환은 우수. 초기 번들 크기·코드 스플리팅 미흡 |
| 문서화 | ★★★★☆ | `CLAUDE_DEV_GUIDE.md`가 매우 실용적 |

**전반적으로 UI/UX 완성도와 도메인 모델링은 인상적인 수준**이며, 자금집행 흐름의 추상화는 잘 되어 있습니다. 다만 **데모 모드를 걷어내고 서버와 진짜로 연결하는 단계에서 보안 사항을 한 번 더 점검**하는 것이 가장 중요한 다음 단계로 보입니다.

---

*보고서 작성: Claude · 2026-05-20*
