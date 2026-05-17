# 주다페이 (JudaPay) Changelog

> 작업 단위로 묶은 버전 히스토리. 와이어프레임 단계라 백엔드 미연결, UI/UX 흐름 검증 위주.

---

## v3.1.0 — 모바일 스크롤 완전 수정 + 상태바 제거 (2026-05-16)

### 핵심 변경 요약
1. **스크롤 최상단 도달 불가 버그 수정** — `overflow: clip` 도입으로 탄성 스크롤 애니메이션 클리핑 해소
2. **스크롤 탄성 느낌 복원** — `overscroll-behavior: contain` 재적용 (내부 wrapper overflow:hidden 제거 후 안전)
3. **모바일 뷰포트 안정화** — `height: 100svh` 도입 (브라우저 UI 포함한 실제 뷰포트 정확 계산)
4. **9:41 시계 표시 전면 제거** — 로그인/회원가입 화면 5개에서 상태바 완전 삭제
5. **전체 화면 26개+ inner wrapper `overflow: hidden` 제거** — 스크롤 클리핑 근본 원인 해소

---

### 변경 상세

#### `src/index.css` — CSS 아키텍처 3가지 핵심 수정

**1) `overflow: clip` 도입 (핵심 버그 수정)**
```css
/* 변경 전 */
.phone {
  overflow: hidden;
}

/* 변경 후 */
.phone {
  overflow: hidden;  /* fallback — 구형 브라우저 */
  overflow: clip;    /* 모던 브라우저: 화면 프레임 클리핑은 유지하되
                        자식 엘리먼트의 탄성 스크롤 애니메이션은 차단하지 않음 */
}
```
`overflow: hidden`은 내부에 가상의 스크롤 컨테이너를 생성해 iOS/Android 탄성 스크롤 애니메이션을 클리핑함. 이로 인해 `scrollTop=0`에 도달해도 ProfileBadge 등 상단 콘텐츠가 화면 밖으로 잘려 보이지 않는 버그 발생.
`overflow: clip`은 픽셀 페인팅만 클리핑하고 스크롤 애니메이션에 간섭하지 않아 문제 해소.

**2) `height: 100svh` 추가**
```css
.phone {
  height: 100vh;   /* fallback */
  height: 100svh;  /* 모바일: 브라우저 주소창/탐색 바 포함 실제 뷰포트 높이 */
}
```
`100vh`는 브라우저 UI가 숨겨진 상태(최대 뷰포트)를 기준으로 계산. 모바일에서 주소창이 표시된 상태에서는 `.phone`이 실제 화면보다 커져 BottomTab이 잘리거나 레이아웃이 깨질 수 있었음. `svh`(small viewport height)는 항상 브라우저 UI가 표시된 상태의 최소 뷰포트를 기준으로 해 안정적.

**3) `overscroll-behavior: contain` 복원**
```css
/* 변경 전 (임시 제거 상태) */
[style*="overflow-y: auto"] {
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* overscroll-behavior 없음 → 스크롤이 딱딱하게 느껴짐 */
}

/* 변경 후 */
[style*="overflow-y: auto"] {
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior: contain; /* 경계 도달 시 탄성 바운스 효과 복원 */
}
```
이전에 `overscroll-behavior: contain`을 제거한 이유: inner wrapper에 `overflow: hidden`이 있을 때 탄성 애니메이션이 클리핑되어 "상단 도달 불가"처럼 보이는 버그와 조합이 나빴음. inner wrapper의 `overflow: hidden`을 제거(26개+ 파일)한 후에는 `contain`이 안전하므로 복원. 부드러운 바운스 느낌 회복.

---

#### 9:41 상태바 제거 (5개 화면)

| 파일 | 변경 내용 |
|---|---|
| `src/shared/auth/Start.jsx` | `{/* 상태바 */}` div (9:41 · 5G 100%) 완전 삭제 |
| `src/shared/auth/Login.jsx` | 인라인 상태바 div (9:41 · 5G ▮) 완전 삭제 |
| `src/shared/auth/SignupBusiness.jsx` | `const Sbar = () => null` (기존: 9:41 full div) |
| `src/shared/auth/SignupPersonal.jsx` | `<div style={S.sbar}>` 행 삭제 |
| `src/shared/auth/SignupPin.jsx` | `function Sbar() { return null }` + PIN 단계 내 인라인 바 삭제 |

`src/components/ExecuteHeader.jsx`의 `StatusBar`는 `SelectBusiness.jsx`에서 import하므로 export는 유지하되 `return null` 처리 (이미 반영).
`src/design/components.jsx`의 `StatusBar`도 동일하게 `return null` 처리.

---

#### Inner wrapper `overflow: hidden` 제거 (26개+ 파일)

스크롤 클리핑의 근본 원인: `.phone > 외부래퍼[overflow:hidden] > 스크롤컨테이너` 구조에서 탄성 애니메이션이 중간 wrapper에 의해 클리핑됨.

**적용 패턴 (모두 동일)**:
```jsx
// 변경 전
<div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

// 변경 후
<div style={{ flex:1, display:'flex', flexDirection:'column' }}>
```

**수정된 파일 목록**:
- `business/execute/ExecuteAutoPayAll.jsx`
- `business/execute/ExecuteOtherExpense.jsx`
- `business/execute/ExecuteRent.jsx`
- `business/execute/ExecuteRentLease.jsx`
- `business/execute/ExecuteSalary.jsx`
- `business/execute/ExecuteSalaryRegister.jsx`
- `business/execute/ExecuteSubscription.jsx`
- `business/execute/ExecuteUtility.jsx`
- `business/execute/ExecuteTelecom.jsx`
- `business/execute/ExecuteMisc.jsx`
- `business/execute/ExecuteInsurancePremium.jsx`
- `personal/PersonalProfile.jsx`
- `shared/ApprovalCenter.jsx`
- `shared/CompanyProfile.jsx` → `overflow: clip`으로 교체 (절대위치 전체화면 패널)
- `shared/ExecutionStats.jsx`
- `shared/Messages.jsx`
- `shared/MonthlyReport.jsx` → `overflow: clip`으로 교체 (절대위치 전체화면 패널)
- `shared/OtherPayments.jsx`
- `shared/PaymentAlerts.jsx`
- `shared/PaymentDetail.jsx`
- `business/HomeBusiness.jsx`
- (외 추가 파일 포함 총 26개+)

> 절대위치 전체화면 패널(`position:absolute, inset:0`)은 `overflow:hidden` 대신 `overflow:clip`으로 교체해 내부 스크롤도 동일하게 수정.

---

### 버그 수정 요약

| 버그 | 원인 | 수정 |
|---|---|---|
| 스크롤 최상단 도달 불가 (ProfileBadge 안 보임) | `.phone { overflow:hidden }` → 탄성 스크롤 클리핑 | `overflow: clip` 적용 |
| 스크롤이 딱딱하게 느껴짐 | `overscroll-behavior: contain` 임시 제거 | 재적용 |
| 모바일 BottomTab 잘림 | `height: 100vh` 뷰포트 계산 오차 | `height: 100svh` 추가 |
| 로그인/회원가입 상단 9:41 시계 노출 | 데모용 상태바 컴포넌트 잔존 | 전면 삭제 |
| 홈 화면 하단 버튼 안 보임 | inner wrapper `overflow:hidden` + flex min-height 버그 | wrapper overflow 제거 + `.phone > * { min-height:0 }` |

---

## v3.0.0 — 승인 대기 센터 완성 + 결제 분류 시스템 전사 통일 (2026-05-11)

### 핵심 변경 요약
1. **ApprovalCenter — 승인 대기 센터 전면 완성**
   - STATUS_TABS (전체/진행 중/반려/완료) 헤더 탭 복원
   - TYPE_CHIPS 필터 (승인요청/검수요청/증빙요청/소명요청) — 다중 토글
   - 버튼 4열 균등 그리드: 상세보기 → 추가요청 → 반려 → 승인
   - DetailSheet z-index(500) + 소명모달 z-index(600) 레이어링 수정
   - detailItem 동기화: 추가요청 확정 후 DetailSheet 내 즉시 반영
2. **소명/증빙 요청 모달 공통화** — 3개 화면 동일 패턴
3. **PaymentDetail — 결제 상세 분류 + 소명요청 완성**
4. **PaymentAlerts — 소명요청 선택 모드 완성**
5. **ExecutionStats 카테고리 통일** — 운영비 3개 항목 추가 + PURPOSE_OPTIONS 재편
6. **전사 분류 기준 통일** — PURPOSE_OPTIONS 5개로 확정

---

### 변경 상세

#### ApprovalCenter.jsx

**STATUS_TABS 복원**
```js
// 삭제됐다가 복원
const STATUS_TABS = [
  { id:'all', label:'전체' }, { id:'inprogress', label:'진행 중' },
  { id:'rejected', label:'반려' }, { id:'done', label:'완료' },
]
```
헤더 하단 탭 형태로 복원 (라운드탑 스타일, 활성 탭 흰 배경 + 브랜드 컬러)

**TYPE_CHIPS 추가 (기존 카드결제 필터 대체)**
```js
const TYPE_CHIPS = [
  { id:'approval', label:'승인요청' }, { id:'review', label:'검수요청' },
  { id:'evidence', label:'증빙요청' }, { id:'claim',  label:'소명요청'  },
]
```
TYPE_CHIPS는 STATUS_TABS 아래 칩 형태로 별도 배치. 다중 선택 가능.

**ApprovalCard 버튼 레이아웃**
```jsx
// 변경 전: 가변 너비 버튼들
<button onClick={...}>상세보기</button>
<button onClick={...}>승인</button>

// 변경 후: 4열 균등 그리드
<div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'6px' }}>
  <button onClick={() => onDetail(item)}>상세보기</button>
  <button onClick={() => onRequest(item)}>추가요청</button>
  <button onClick={() => onReject(item)}>반려</button>
  <button onClick={() => onApprove(item)}>{item.type==='review' ? '검수 승인' : '승인'}</button>
</div>
```

**DetailSheet 추가요청 버그 수정**
```jsx
// 수정 전: onRequest 호출 시 DetailSheet 닫힘 + 모달이 뒤에 렌더
onRequest={(item) => { setDetailItem(null); handleRequest(item) }}

// 수정 후: DetailSheet 유지, 모달(z:600)이 위에 렌더
onRequest={(item) => { handleRequest(item) }}
```

**detailItem 동기화 (handleConfirm — request 모드)**
```jsx
// 추가요청 확정 후 detailItem 즉시 업데이트
if (detailItem?.id === item.id) {
  setDetailItem(prev => ({
    ...prev, status:'inprogress',
    claimStatus: claimRequest ? 'requested' : prev.claimStatus,
    evidenceStatus: evidenceRequest ? 'requested' : prev.evidenceStatus,
    history: [...prev.history, newHistEntry]
  }))
}
```

---

#### 소명/증빙 요청 모달 — 공통 패턴 (3개 화면)

ApprovalCenter · PaymentDetail · PaymentAlerts 동일 구조:

```jsx
// 공통 state
const [claimRequest, setClaimRequest] = useState(true)
const [evidenceRequest, setEvidRequest] = useState(false)
const [message, setMessage] = useState('소명 부탁드립니다.')
const [msgEdited, setMsgEdited] = useState(false)

// 자동 메시지 생성
function autoMsg(claim, evid) {
  if (claim && evid) return '소명 및 증빙 서류 제출 부탁드립니다.'
  if (claim) return '소명 부탁드립니다.'
  if (evid)  return '증빙 서류 제출 부탁드립니다.'
  return ''
}

// 토글 변경 시 메시지 자동 갱신 (직접 편집했으면 갱신 안 함)
useEffect(() => {
  if (!msgEdited) setMessage(autoMsg(claimRequest, evidenceRequest))
}, [claimRequest, evidenceRequest])
```

---

#### PaymentDetail.jsx

**소명요청 버튼 동작 변경**
```jsx
// 변경 전
onClick={() => navigate('/messages')}

// 변경 후
onClick={() => setShowClaimModal(true)}
```

**결제 목적 분류 (거래 정보 카드 내)**
```jsx
const effectiveCategory = purposeOverride ?? payment.category
const effectiveCategoryAuto = purposeOverride ? false : payment.categoryAuto

// 미분류: 주황 점선 박스 "⚠ 미분류 · 분류하기"
// 자동분류: 파란 뱃지 "✦ {category}"
// 수동분류: 초록 뱃지 "✓ {category}"
```

**ClassifySheet (bottom sheet)**
```jsx
// 5개 항목, 5번째(개인사용)는 전체 너비
const PURPOSE_OPTIONS = ['운영', '출장식대', '복리후생', '기타', '개인사용']
gridColumn: i === 4 ? 'span 2' : undefined
```

---

#### PaymentAlerts.jsx

**소명요청 선택 모드**
```jsx
// 헤더 우상단 소명요청 버튼 → 선택 모드 활성화
const [selectMode, setSelectMode] = useState(false)
const [selected, setSelected] = useState([])

// 선택 모드 활성 시 행 클릭 → 체크박스 토글
const handleClick = () => {
  if (selectMode) { onToggle(item.id); return }
  onClick()
}

// 선택 바 (탭 아래 고정)
[전체선택] ··· [소명요청 N건] (파란 버튼)
```

**소명요청 모달 + 토스트**
```jsx
const openJustify = () => {
  setJustifyMsg(`[소명요청] 아래 ${selItems.length}건에 대해 소명 부탁드립니다.`)
  setJustifyModal(true)
}
const handleJustifySend = () => {
  setJustifyModal(false); setSelectMode(false); setSelected([])
  setToast('💬 소명요청 메시지 발송 완료')
}
```

---

#### ExecutionStats.jsx — 카테고리 통일

**CATEGORY_GROUPS 운영비 세부항목 추가 (3개 유저타입 모두)**
```js
// business 기준 (personal/public도 동일 항목, 금액만 다름)
{ id:'travel_meal', label:'출장식대', icon:'✈️', color:'#0891B2' }
{ id:'welfare',     label:'복리후생', icon:'🎁', color:'#10B981' }
{ id:'personal_use',label:'개인사용', icon:'👤', color:'#6B7280' }
```

**PURPOSE_OPTIONS 재편 (9개 → 5개)**
```js
// 변경 전 (9개 — 산발적)
['운영비','서버비','구독료','출장비','접대비','복리후생','공과금','교육비','기타']

// 변경 후 (5개 — 운영비 세부항목 기준)
['운영', '출장식대', '복리후생', '기타', '개인사용']
```

**CARD_TXNS purpose 정정**
```js
// 변경 전 → 변경 후
purpose: '서버비'  → '구독료'
purpose: '출장비'  → '출장식대'
```

---

### 버그 수정

- **DetailSheet 위에 추가요청 모달 렌더**: `setDetailItem(null)` 제거로 해결
- **STATUS_TABS 누락**: TYPE_CHIPS 추가 과정에서 실수로 삭제됨 → 복원
- **detailItem stale state**: 추가요청 확정 후 DetailSheet가 이전 상태 표시 → `setDetailItem` 동기화

---

## v2.9.0 — 집행 통계 권한자금 화면 고도화 + RecipientDetail aurora 연동 (2026-05-11)

### 핵심 변경 요약
1. **AuthFundsDetail 아코디언 완전 삭제** — 펼치기/접기 기능 제거, 기본 카드 뷰만 유지
2. **권한자금 리스트 클릭 → RecipientDetail/aurora 화면 이동** — `navigate('/control-center/recipient/aurora', { state: { from: 'stats-auth' } })`
3. **권한자금 헤더 앰버 그라디언트 적용** — `#92400E → #B45309 → #D97706` + 배경 장식 원
4. **진행 바 라벨 `회수` → `소비` 변경** — 투자 자금 소비량 표시로 의미 명확화
5. **헤더 금액 레이아웃 수정** — `flex:'0 0 auto'` + `fmtM()` 함수 적용, 숫자 깨짐 해소
6. **RecipientDetail aurora 헤더 전면 재설계** — 앰버 그라디언트, 타이틀 `집행 관제 센터` → `권한 자금`
7. **RecipientDetail KPI 재구성** — `집행 건수` 제거, `총 집행액` + `다음 예정` 2박스로 교체
8. **백버튼 네비게이션 수정** — aurora → 권한자금 화면 정확 복원 (state 기반 라우팅)

---

### 변경 상세

#### ExecutionStats.jsx — AuthFundsDetail 컴포넌트

**아코디언 제거**
```jsx
// 삭제된 state
const [openItems, setOpenItems] = useState({})
const toggleItem = (id) => ...
const listExpanded = openItems[id]

// 삭제된 JSX
{listExpanded && <div>...펼쳐진 상세 내용...</div>}
```

**리스트 → 버튼으로 교체**
```jsx
// 변경 전: div + 아코디언
<div key={item.id} onClick={() => toggleItem(item.id)}>

// 변경 후: button + 화면 이동
<button key={item.id}
  onClick={() => navigate('/control-center/recipient/aurora', { state: { from: 'stats-auth' } })}
  style={{ ... }}>
```

**진행 바 라벨**
```jsx
// 변경 전
<div>{repaidPct}% 회수</div>

// 변경 후
<div>{repaidPct}% 소비</div>
```

**헤더 금액 레이아웃 수정**
```jsx
// 변경 전: fontSize만 조정, 깨짐 발생
<div style={{ fontSize:'26px', fontWeight:800 }}>{totalAuth/100000000}억원</div>

// 변경 후: flex 레이아웃 + fmtM 함수 적용
<div style={{ flex:'0 0 auto' }}>
  <div>{fmtM(totalAuth)}원</div>   // 총 집행
</div>
<div style={{ flex:1, minWidth:0 }}>
  <div>{fmtM(totalAuth - totalReturn)}원</div>  // 현재 잔액
</div>
```

**백버튼 state 복원 (ExecutionStats 메인)**
```jsx
// import 추가
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// useEffect 추가 (aurora 화면에서 돌아왔을 때 권한자금 자동 복원)
useEffect(() => {
  if (location.state?.openDetail === 'auth') {
    setDetail({ type: 'auth' })
  }
}, [])
```

---

#### RecipientDetail.jsx — aurora 화면

**import 추가**
```jsx
import { useNavigate, useParams, useLocation } from 'react-router-dom'
```

**헤더 그라디언트 교체**
```jsx
// 변경 전
<div style={{ background: theme.headerGrad }}>

// 변경 후 — 앰버 그라디언트 + 장식 원
<div style={{ background: 'linear-gradient(135deg,#92400E 0%,#B45309 50%,#D97706 100%)', position:'relative', overflow:'hidden' }}>
  <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'140px', ... }} /> {/* 장식 원 1 */}
  <div style={{ position:'absolute', bottom:'-20px', left:'-20px', width:'100px', ... }} /> {/* 장식 원 2 */}
```

**타이틀 변경**
```jsx
// 변경 전
<span>집행 관제 센터</span>

// 변경 후
<span>권한 자금</span>
```

**KPI 재구성**
```jsx
// 변경 전: 총 집행액 + 집행 건수
[
  { label: t('totalExec', lang), value: (r.totalAmount/10000).toFixed(0)+'만원' },
  { label: '집행 건수',          value: r.count+'건' },
]

// 변경 후: 총 집행액 + 다음 예정 (집행 건수 제거)
<div>총 집행액 — {(r.totalAmount/10000).toFixed(0)}만원</div>
<div>다음 예정 — {r.nextExpected}  (앰버 강조색 #FDE68A)</div>
```

**백버튼 수정**
```jsx
// 변경 전
<button onClick={() => navigate(-1)}>

// 변경 후 — 출처에 따라 분기
const fromStatsAuth = location.state?.from === 'stats-auth'

<button onClick={() =>
  fromStatsAuth
    ? navigate('/stats', { state: { openDetail: 'auth' } })
    : navigate(-1)
}>
```

---

### 화면 이동 플로우 (완성)

```
집행 통계 메인 (/stats)
  └─ [권한 자금 버튼] → AuthFundsDetail (React state)
       └─ [리스트 클릭] → RecipientDetail/aurora (/control-center/recipient/aurora)
                          state: { from: 'stats-auth' }
            └─ [백버튼] → /stats + state: { openDetail: 'auth' }
                           → useEffect 감지 → setDetail({ type: 'auth' })
                           → AuthFundsDetail 자동 복원 ✅
```

---

## v2.8.0 — 자동지급 완성 + 쿠콘 API 확정 (2026-05-10)

### 핵심 변경 요약
1. **자동지급 화면 4개 완성** (ExecuteSalary / ExecuteRent / ExecuteRentLease / ExecuteTelecom) — 디자인 완전 통일
2. **ExecuteSalary 전면 재구조화** — 급여 차트 시스템 + 엑셀 업로드 + 구독료 스타일 자동지급 설정
3. **알림 설정 Toggle 통일** — RentLease·Rent·Telecom 3개 파일 모두 Toggle 방식으로 통일
4. **통지형 4개 pushToStore 완료** — Bonus / Condolence / OtherIncome / Gift
5. **관리자관리 화면 6모듈 완성**
6. **쿠콘 API 파트너십 확정** — 쿠콘 회장 = Judapay 주주 → 계약 실질 확정
7. **쿠콘 연동 범위 최종 결정** — 5개 API (공동인증서/홈택스/위택스/전자세금계산서/4대보험)
8. **증빙 자체 생성 전략 확정** — 외부 API 불필요한 6가지 증빙 명확화

---

### ExecuteSalary 재구조화 (v2.8 핵심)

#### 자동지급 설정 — 구독료 스타일로 전면 교체

기존: 별도 바텀시트 (showPayDaySheet 모달)
변경: 인라인 칩 선택 방식 (구독료/임대료 동일 패턴)

```jsx
// 지급일 칩 (인라인)
[1일] [5일] [10일] [15일] [20일] [25일] [말일] [직접 입력]
→ 직접 입력 선택 시: 숫자 input 필드 표시

// 지급 방식 (카드 자동결제형 제거)
● 계좌 자동이체   ○ 링크 수취형
→ 계좌 자동이체: 은행 칩 (8개) + 계좌번호 입력
→ 링크 수취형: 안내 박스
```

추가 state: `bankName`, `bankAccount`, `editHasPayroll`, `customDayInput`
computed: `const isCustomDay = !PAY_DAYS.includes(editPayDay) && editPayDay !== ''`
삭제: `showPayDaySheet` state + payDaySheet 바텀시트 모달 전체

#### 매월 총 지급액 — addForm에도 표시

```jsx
// 변경 전: detail 화면에서만
{ec.gross > 0 && <SummaryCard />}

// 변경 후: 직원 1명 이상이면 addForm에서도 표시
{editEmployees.length > 0 && <SummaryCard />}
```

#### 증빙 연동 — 급여 대장 추가

```js
{ label:'급여 대장 자동 생성', sub:'통합증빙센터 인건비 급여대장 자동 첨부',
  val:editHasPayroll, set:setEditHasPayroll }
```

#### 엑셀 업로드 (ExcelUploadSheet 컴포넌트)

급여 차트 일괄 생성 기능:

```
[Step 1 - 업로드]
  - CSV 양식 다운로드 (UTF-8 BOM, 한글 Excel 호환)
    컬럼: 이름 / 휴대폰번호 / 월급(세전) / 은행명 / 계좌번호
  - 드래그&드롭 / 파일 선택 업로드

[Step 2 - 미리보기]
  - FileReader API로 CSV 파싱 (외부 라이브러리 없음)
  - 직원 카드: 이름 / 전화 / 금액 / 상태 칩
    🏦 계좌 등록됨 (은행+계좌 있음, authStatus='account_provided')
    📩 초대 링크 발송 예정 (계좌 없음, authStatus='invited')
  - 차트 이름 입력 → 생성
```

empStatusChip 추가:
```js
if (emp.payable && emp.authStatus === 'account_provided')
  → { icon:'🏦', label:'계좌 등록됨', bg:'#E0F2FE', color:'#0369A1', border:'#BAE6FD' }
```

npm install 불가 (403 Forbidden) → 네이티브 Blob API + FileReader API로 해결

---

### 알림 설정 Toggle 통일

#### ExecuteRentLease — 자동 뱃지 → 5개 Toggle

```js
추가 state: notifBefore, notifDone, notifFail, notifExpiry, notifRenew
```

```
🔔 지급 예정 알림 (지급 3일 전)
✅ 지급 완료 알림 (납부 완료 즉시)
⚠️ 지급 실패 알림 (실패 즉시)
📅 계약 만료 30일 전 알림
🔄 갱신 필요 알림 (만료 7일 전)
```

#### ExecuteRent — 자동 뱃지 → 4개 Toggle

```js
추가 state: notifBefore, notifDone, notifFail, notifExpiry
```

#### ExecuteTelecom — 알림 설정 섹션 신규 추가

기존: 알림 설정 섹션 없음
추가: 3개 Toggle (addForm + detail 동시 적용)

```js
추가 state: notifBefore, notifDone, notifFail
{ label:'지급 전 알림', sub:'지급 1일 전 사전 안내' }
{ label:'지급 완료 알림', sub:'납부 완료 즉시 발송' }
{ label:'지급 실패 알림', sub:'실패 즉시 관리자 알림' }
```

---

### 쿠콘 API 연동 범위 확정

#### 파트너십

- 쿠콘 회장 = Judapay 주주 → 계약 실질 확정
- 표준 요금제 적용, 전체 API 사용 가능

#### 확정 계약 5개

1. 공동인증서 모듈 (전체 기반)
2. 홈택스 스크래핑 (국세 고지 + 전자납부번호)
3. 위택스 스크래핑 (지방세)
4. 전자세금계산서 조회
5. 4대보험 3종 (건강보험공단 + 국민연금공단 + 근로복지공단)

#### 불필요 항목 (결정)

- ❌ 기업 계좌 잔액 — 충전 잔액 기반 모델이므로 불필요
- ❌ 통신비/전기/가스 스크래핑 — 수동 등록 + 자동납부로 충분

---

### 증빙 자체 생성 전략 확정

주다페이 내부 데이터만으로 자동 생성 가능한 증빙 (쿠콘 불필요):

| 증빙 | 비고 |
|---|---|
| 지급 확인서 | 금융 증빙 가치 |
| 집행 영수증 | 내부 회계 증빙 |
| 급여 명세서 | 자동 생성 |
| 외주비 지급명세 | 원천세 포함 |
| 임대료 지급 증빙 | 자동 생성 |
| 운영비 지급 증빙 | 자동 생성 |

---

### 통지형 메뉴 pushToStore 풍부화 (v2.8 완료)

| 파일 | 완료 |
|---|---|
| ExecuteBonusBusiness | ✅ |
| ExecuteCondolenceBusiness | ✅ |
| ExecuteOtherIncomeBusiness | ✅ |
| ExecuteGift | ✅ |

---

### 버그 수정

- **RentLease/Rent 알림 "자동" 뱃지**: Toggle로 전환
- **Telecom 알림 섹션 누락**: addForm + detail 양쪽 추가
- **Salary addForm 총 지급액 미표시**: `ec.gross > 0` → `editEmployees.length > 0`
- **급여 대장 증빙 누락**: 통합증빙센터 연동 toggle 추가

---

## v2.7.0 — 사업자 메뉴 완성 + 거래 상세 풍부화 (2026-05-08)

### 핵심 변경 요약
1. **사업자에게 지급 5개 메뉴** 완성 (외주비/마케팅비/부동산/자금대여/투자)
2. **SelectVendor** — 사업자번호 조회 + 미가입자 이메일 처리
3. **SelectBusiness** — 개인→사업자 흐름에도 미가입자 이메일 처리 추가
4. **StoreTransactionDetail** — 정적 예제와 동등한 풍부 상세 화면 구현
5. **모든 거래형 메뉴 pushToStore 풍부화** — timeline/safety/contractFile/dealDescription/investMeta 추가
6. **ExecuteVendorInvestBusiness** — 3단계 B2B 투자 (4가지 유형 + 자금 사용 목적 + MCC + 계약서)

---

### 신규 화면

#### SelectVendor (`business/execute/SelectVendor.jsx`)
- 사업자번호 10자리 입력 → 국세청 실시간 조회 시뮬
- 데모: `123-45-67890` 정상 (주)오로라 / `234-56-78901` 폐업 (주)한빛홀딩스
- 최근 거래 사업자 4명 (오로라/벨라부동산/그로스마케팅/네오컴퍼니)
- **미가입 사업자**: 이메일 입력 필수 → verified=false → 외부링크 발송 흐름
- `?menu=${menuId}` query string → 진입 경로 보존

#### ExecuteVendorLoanBusiness (`business/execute/ExecuteVendorLoanBusiness.jsx`)
- B2B 자금 대여 — 사업자에게 단기 차용증 + 이자 설정
- 이자율: 무이자 / 적정 4.6% / 직접 입력
- 법정 이자제한법 검증 (연 20% 초과 경고)

#### ExecuteVendorInvestBusiness (`business/execute/ExecuteVendorInvestBusiness.jsx`) — 3단계
- Step 1: 투자 유형 4가지 (지분/CB/단순대여/수익분배) + 금액 + 회사 가치 자동 계산
- Step 2: 계약 기간 + 보고 주기
- Step 3: 자금 사용 목적 (6개 카테고리) + MCC 차단 + 계약서 첨부

---

### 데이터 모델 확장

#### Milestone 확장
```js
{
  note: string,              // 단계 설명
  conditions: [{ label, done, sub }],  // 집행 조건
}
```

#### addTransaction 신규 필드
```js
dealDescription, contractFile, timeline, safety, supportMeta, investMeta
```

---

### 버그 수정

- **ExecuteInvest type 오류**: `type: 'invest'` → `type: 'support'`
- **마일스톤 amount=0 표시**: "0원" 숨김 처리
- **수익 분배 만기 금액 오류**: equity+profit 만기 amount=0
- **개인→사업자 투자 라우트 누락**: App.jsx 미등록 수정
- **자금 사용 목적 mock 오류**: 균등 분할 → 라벨 칩만 표시

---

## v2.6.0 — 통합 데이터 store 도입 (2026-05-08)

자금집행 1건 → 알림/메시지/홈 화면 활동 피드 자동 반영 완성.

### 신규 기능

#### 통합 거래 store (`shared/transactionStore.js`)
- 자금집행 1건 → 활동 피드 / 알림 / 메시지 양측 자동 생성
- 거래형(contract) / 통지형(notification) 분리
- Pub/Sub 변경 알림 시스템

#### 화면 통합
- HomeBusiness 활동 피드 → store 동적
- Alerts 알림/거래 탭 → 정적 + store 합산
- Messages → store 통합

### 신규 화면
- ExecuteLendBusiness — 대여금 사유 4가지
- ExecuteSupportBusiness — 기업 → 직원 자금 지원

---

## v2.5.x — 자금집행 화면 정비

### v2.5.4 — 모달 position: fixed → absolute
### v2.5.3 — ExecuteOtherIncomeBusiness (기타소득)
### v2.5.2 — ExecuteCondolenceBusiness (경조사비)
### v2.5.1 — ExecuteBonusBusiness (상여금)
### v2.5.0 — 사람 풀 시스템 + SelectRecipientBusiness

---

## 핵심 시스템 규칙 (모든 버전 공통)

1. `getAccountTheme()` 컴포넌트 내부 첫 줄
2. 싱글쿼트 안 `${theme.xxx}` 금지 → 백틱
3. 최상위 상수에 theme 참조 금지
4. import 중복 금지
5. `theme.brandDark` 흰 배경용
6. 헤더 스크롤 함께, BottomTab만 고정
7. 모달/바텀시트 `position: 'absolute'` (PhoneShell 안에)
8. early return 위 useMemo 금지
9. 새 화면마다 `getAccountTheme()` + `useT()` + DarkHeader

## 브랜드 색상
- 개인: `#5B4FE8` (보라), brandDark `#3D2090`
- 기업: `#0EA5E9` (네이비), brandDark `#0369A1`
- 기관: `#16A34A` (그린), brandDark `#166534`

---

## 미완료 작업

### 구현 잔여
- HomeBusiness 기업 홈 화면 고도화
- 단계 F: 비가입자 → 가입자 매칭 흐름
- 기관 홈 화면 고도화
- 백엔드 시뮬레이터 (마일스톤 진행)

### 쿠콘 API 연동 (계약 후)
- 공동인증서 모듈 → 홈택스/위택스 스크래핑 시작
- 전자세금계산서 조회
- 4대보험 3종 스크래핑
#### 파트너십

- 쿠콘 회장 = Judapay 주주 → 계약 실질 확정
- 표준 요금제 적용, 전체 API 사용 가능

#### 확정 계약 5개

1. 공동인증서 모듈 (전체 기반)
2. 홈택스 스크래핑 (국세 고지 + 전자납부번호)
3. 위택스 스크래핑 (지방세)
4. 전자세금계산서 조회
5. 4대보험 3종 (건강보험공단 + 국민연금공단 + 근로복지공단)

#### 불필요 항목 (결정)

- ❌ 기업 계좌 잔액 — 충전 잔액 기반 모델이므로 불필요
- ❌ 통신비/전기/가스 스크래핑 — 수동 등록 + 자동납부로 충분

---

### 증빙 자체 생성 전략 확정

주다페이 내부 데이터만으로 자동 생성 가능한 증빙 (쿠콘 불필요):

| 증빙 | 비고 |
|---|---|
| 지급 확인서 | 금융 증빙 가치 |
| 집행 영수증 | 내부 회계 증빙 |
| 급여 명세서 | 자동 생성 |
| 외주비 지급명세 | 원천세 포함 |
| 임대료 지급 증빙 | 자동 생성 |
| 운영비 지급 증빙 | 자동 생성 |

---

### 통지형 메뉴 pushToStore 풍부화 (v2.8 완료)

| 파일 | 완료 |
|---|---|
| ExecuteBonusBusiness | ✅ |
| ExecuteCondolenceBusiness | ✅ |
| ExecuteOtherIncomeBusiness | ✅ |
| ExecuteGift | ✅ |

---

### 버그 수정

- **RentLease/Rent 알림 "자동" 뱃지**: Toggle로 전환
- **Telecom 알림 섹션 누락**: addForm + detail 양쪽 추가
- **Salary addForm 총 지급액 미표시**: `ec.gross > 0` → `editEmployees.length > 0`
- **급여 대장 증빙 누락**: 통합증빙센터 연동 toggle 추가

---

## v2.7.0 — 사업자 메뉴 완성 + 거래 상세 풍부화 (2026-05-08)

### 핵심 변경 요약
1. **사업자에게 지급 5개 메뉴** 완성 (외주비/마케팅비/부동산/자금대여/투자)
2. **SelectVendor** — 사업자번호 조회 + 미가입자 이메일 처리
3. **SelectBusiness** — 개인→사업자 흐름에도 미가입자 이메일 처리 추가
4. **StoreTransactionDetail** — 정적 예제와 동등한 풍부 상세 화면 구현
5. **모든 거래형 메뉴 pushToStore 풍부화** — timeline/safety/contractFile/dealDescription/investMeta 추가
6. **ExecuteVendorInvestBusiness** — 3단계 B2B 투자 (4가지 유형 + 자금 사용 목적 + MCC + 계약서)

---

## v2.6.0 — 통합 데이터 store 도입 (2026-05-08)

자금집행 1건 → 알림/메시지/홈 화면 활동 피드 자동 반영 완성.

### 신규 기능

#### 통합 거래 store (`shared/transactionStore.js`)
- 자금집행 1건 → 활동 피드 / 알림 / 메시지 양측 자동 생성
- 거래형(contract) / 통지형(notification) 분리
- Pub/Sub 변경 알림 시스템

#### 화면 통합
- HomeBusiness 활동 피드 → store 동적
- Alerts 알림/거래 탭 → 정적 + store 합산
- Messages → store 통합

### 신규 화면
- ExecuteLendBusiness — 대여금 사유 4가지
- ExecuteSupportBusiness — 기업 → 직원 자금 지원

---

## v2.5.x — 자금집행 화면 정비

### v2.5.4 — 모달 position: fixed → absolute
### v2.5.3 — ExecuteOtherIncomeBusiness (기타소득)
### v2.5.2 — ExecuteCondolenceBusiness (경조사비)
### v2.5.1 — ExecuteBonusBusiness (상여금)
### v2.5.0 — 사람 풀 시스템 + SelectRecipientBusiness

---

## 핵심 시스템 규칙 (모든 버전 공통)

1. `getAccountTheme()` 컴포넌트 내부 첫 줄
2. 싱글쿼트 안 `${theme.xxx}` 금지 → 백틱
3. 최상위 상수에 theme 참조 금지
4. import 중복 금지
5. `theme.brandDark` 흰 배경용
6. 헤더 스크롤 함께, BottomTab만 고정
7. 모달/바텀시트 `position: 'absolute'` (PhoneShell 안에)
8. early return 위 useMemo 금지
9. 새 화면마다 `getAccountTheme()` + `useT()` + DarkHeader
10. inner wrapper에 `overflow: 'hidden'` 절대 금지 — `overflow: clip` 또는 제거
11. `.phone`은 CSS에서 `overflow: clip` 유지 (수동 수정 금지)

## 브랜드 색상
- 개인: `#5B4FE8` (보라), brandDark `#3D2090`
- 기업: `#0EA5E9` (네이비), brandDark `#0369A1`
- 기관: `#16A34A` (그린), brandDark `#166534`

---

## 미완료 작업

### 구현 잔여
- HomeBusiness 기업 홈 화면 고도화
- 단계 F: 비가입자 → 가입자 매칭 흐름
- 기관 홈 화면 고도화
- 백엔드 시뮬레이터 (마일스톤 진행)
- ChatActionsPersonal.jsx 생성 (진행 중)
- ChatActionsBusiness.jsx 생성
- ChatRoom.jsx 분리 + userType 연결
- Messages.jsx 슬림화 + 필터 userType 분기

### 쿠콘 API 연동 (계약 후)
- 공동인증서 모듈 → 홈택스/위택스 스크래핑 시작
- 전자세금계산서 조회
- 4대보험 3종 스크래핑 (건보/국민연금/근로복지)
