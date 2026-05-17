# 주다페이 (JudaPay) 마스터 문서

**버전**: v3.1
**최초 작성**: 2026.05.05 (v1.0) / **최종 개정**: 2026.05.16 (v3.1)
**범위**: 1차 MVP 기획 + 구현 현황 통합
**목적**: 개발팀 온보딩 · 라이센스 신청서 백본 · 변호사 검토 자료 · 화면 설계 일관성 기준 · AI 개발 컨텍스트
**현재 단계**: High-Fidelity Wireframe 완료 + 디자인 시스템 확정 + **구현 96% 진행 중**

---

## 변경 이력

| 버전 | 일자 | 주요 변경 |
|---|---|---|
| v1.0 | 2026.05.05 | 최초 작성 |
| v1.1 | 2026.05.05 | 공공기관 메뉴 1차 비활성으로 변경 · 외부 협력 결정 신설 |
| v1.2 | 2026.05.05 | **지갑(Wallet) 모델 도입** · 기관 메뉴 1차 활성으로 재변경 · 디폴트 우선순위 룰 신설 · 자금 모델 v2로 진화 |
| v1.3 | 2026.05.05 | **자금 집행 7단계 공통 골격 정의** · **단계형 공개 시스템** · **거래 관계 관리 시스템** · **본인확인 외부 위탁 모델** |
| v1.4 | 2026.05.05 | **외주비 v2: 단일+분할 지급 모드** · **AI 계약서 분석 옵션** · **사업자 외주 입금계좌 검증 흐름** |
| v1.5 | 2026.05.05 | **사업자 외주 입금계좌 검증 3가지 케이스** · **AI 계약서 업로드 흐름** · **메시지 자동 문서 분석** |
| v1.6 | 2026.05.05 | **투자 메뉴 신설 (4가지 시나리오)** · **시그니처 8번: 자금 사용처 자동 보고** · **시그니처 7번 재정의: 계약서 위험 진단** |
| v1.7 | 2026.05.05 | **투자 메뉴 흐름 완결** · **투자 시나리오 분기 화면 폐기** · **투자 표준 조항 4개** · **거래 정보 5탭 확장** |
| v1.8 | 2026.05.05 | **부동산 v2 — 조건부 잔금 집행** · **급여 자동 설정 1차 MVP 범위** · **결제 내역 위치 재정의** · **기업 충전 한도** |
| v1.9 | 2026.05.05 | **4단계 입력 표준 레이아웃 확정** · **메뉴 구조 최종 확정** |
| v2.0 | 2026.05.05 | **기업 계정 정체성 재정의** · **수령인 관리 화면 신설** · **알림 레벨 3단계** · **쿠콘 데이터 대조** |
| v2.1 | 2026.05.06 | **청렴도 지수 신설** · **기업 데이터 섹션** · **가입 구조 모델 A+ 확정** |
| v2.2 | 2026.05.06 | **디자인 시스템 확정 + 구현 진입** — 브랜드 컬러 `#5B4FE8` · 헤더 그라데이션 · 기술 스택 확정 |
| v2.3 | 2026.05.06 | **MCC 차단 공통 컴포넌트화** · **자금 사용 목적 역할 분리** · **투자 (개인→기업) 화면 구현 완료** |
| v2.4 | 2026.05.07 | **WalletPicker 전 화면 적용** · **ConfirmStep/PinStep/DoneStep 전 화면 적용** · **비즈니스 모델 3종 확정** |
| v2.5 | 2026.05.07 | **브랜드 색상 시스템 전 화면 적용** · **accountTokens 시스템** · **i18n 다국어** · **하단 탭 5개 확장** |
| v2.6 | 2026.05.08 | **통합 거래 store 도입** · store 기반 알림/메시지/홈 자동 연동 · ExecuteLendBusiness · ExecuteSupportBusiness |
| v2.7 | 2026.05.08 | **사업자 메뉴 5개 완성** · SelectVendor + SelectBusiness 미가입자 처리 · StoreTransactionDetail 풍부화 · 모든 거래형 메뉴 pushToStore 풍부화 · ExecuteVendorInvestBusiness 3단계 재작성 |
| v2.8 | 2026.05.10 | **자동지급 화면 완성** · ExecuteSalary 전면 재구조화 + 엑셀 업로드 · 알림 설정 통일 (3파일) · **쿠콘 API 파트너십 확정 + 연동 범위 결정** · **증빙 자체 생성 전략 확정** · 통지형 4개 pushToStore 완료 · 관리자관리 화면 6모듈 완성 |
| v2.9 | 2026.05.11 | **집행 통계 권한자금 화면 고도화** · AuthFundsDetail 아코디언 삭제 + 카드 클릭 시 RecipientDetail/aurora 이동 · 앰버 그라디언트 헤더 적용 · 진행 바 `회수→소비` 변경 · 헤더 금액 레이아웃 수정 · **RecipientDetail aurora 화면 재설계** — 타이틀 `집행 관제 센터→권한 자금` · 앰버 헤더 통일 · `집행 건수` KPI 제거 · **백버튼 state 기반 라우팅 완성** (aurora→권한자금 정확 복원) |
| **v3.0** | **2026.05.11** | **승인 대기 센터(ApprovalCenter) 완성** · STATUS_TABS(전체/진행 중/반려/완료) + TYPE_CHIPS(승인/검수/증빙/소명) · 버튼 4열 균등 그리드 · DetailSheet z-index 수정 · **소명/증빙 요청 모달 공통화** — ApprovalCenter·PaymentDetail·PaymentAlerts 3개 화면 통일 · **결제 목적 분류 시스템 통일** — ExecutionStats 운영비 세부항목 기준 · PURPOSE_OPTIONS 전 화면 5개로 통일(운영/출장식대/복리후생/기타/개인사용) · CATEGORY_GROUPS 3개 유저타입 모두 출장식대·복리후생·개인사용 추가 · CARD_TXNS purpose 정정(서버비→구독료, 출장비→출장식대) · PaymentAlerts 소명요청 선택 모드 + 모달 완성 · PaymentDetail 결제 목적 분류 카드 + ClassifySheet 완성 |
| **v3.1** | **2026.05.16** | **모바일 스크롤 완전 수정** · `overflow: clip` 도입으로 탄성 스크롤 클리핑 버그 해소 · `height: 100svh` 추가 (모바일 뷰포트 안정화) · `overscroll-behavior: contain` 복원 (부드러운 바운스 느낌) · **26개+ inner wrapper `overflow: hidden` 전면 제거** · MonthlyReport/CompanyProfile 절대위치 패널 `overflow: clip` 교체 · **9:41 상태바 5개 화면 완전 제거** (Start/Login/SignupBusiness/SignupPersonal/SignupPin) |

---

## 1. 제품 정체성

### 1.1 한 줄 정의

주다페이는 송금 서비스가 아니다.
**자금의 이동을 설계, 통제, 추적하는 자금 운영 인프라(Financial Control Infrastructure)이다.**

### 1.2 기존 PG와의 본질적 차이

| 영역 | 기존 PG | 주다페이 |
|---|---|---|
| 핵심 행위 | 결제 처리 | 자금 집행 (목적 + 권한 부여) |
| 자금 통제 | 없음 | MCC 차단, 1회/시간 한도, 차단권 |
| 자금 단위 | 잔액 (단일) | **지갑 (출처별 분리)** |
| 증거 | 영수증 | 메시지 + 계약서 + 알림센터 + Case |
| 회계 연동 | 없음 | 자동 증빙 + 세무사 자동 전송 |
| 분쟁 대응 | 없음 | Case 시스템 + AML 보고 |
| 라이센스 | 결제대행업 | 선불전자지급수단 + 종합지급결제업 검토 |

### 1.3 핵심 가치 제안

1. **사기 방지 인프라**: 한국에서 자금이 잘못 흐르는 패턴(개인 간 외주, 부동산, 빌려주기, 투자)에 강한 통제 적용
2. **자동 증빙 인프라**: 자금 집행이 곧 회계 증빙. 세무사 자동 전송으로 백오피스 부담 제거
3. **공공자금 통제**: 정부/복지/장학 자금이 목적대로 사용되도록 MCC 차단 + 출금 불가 모델로 통제
4. **분쟁 시 증거**: 메시지 + 계약 + 자금 흐름이 한 패키지로 자동 보존, 5년 보관

---

## 2. 자금 모델 v2 — 지갑(Wallet) 기반

### 2.1 핵심 단위는 "지갑"

**지갑 = 출처 + 목적 + 룰의 묶음**

#### MY 지갑 (단 하나, 고정)
- 모든 출금 가능 자금이 통합되는 지갑
- 출금, 자금 집행, 충전, 카드 결제 모두 자유
- 시각적 표시: `MY` 뱃지 (보라 배경)

#### 받은 지갑 (출처별 N개)
- 받은 자금마다 별도 지갑 생성 (조건부 누적)
- **카드 결제만 가능** (출금 불가, 재집행 불가)
- 소유권은 보낸 사람에게 남아 있음 (사용권만 받은 사람에게)

### 2.2 자금 집행 모델 (불변)

A → B 자금 집행 시:
1. A의 MY 지갑에서 차감
2. B에게 새 지갑 생성 또는 기존 조건 일치 지갑에 누적
3. 법적 소유권은 A에게, B는 사용권만 보유
4. A는 차단권 행사 가능 (환수 X, freeze O)

### 2.3 지갑 누적 룰

같은 발신자 + 같은 목적 + 같은 MCC 룰 + 같은 만료일 → 기존 지갑 합산
하나라도 다르면 별도 지갑 생성

### 2.4 결제 우선순위 (디폴트)

1. 만료 임박 지갑
2. MCC 제한이 강한 지갑
3. 권한 자금 (받은 지갑)
4. MY 지갑

사용자가 화면 드래그로 직접 순서 변경 가능.

### 2.5 차단권 (Freeze, not Claw-back)

- B의 잔액은 그대로 유지 (환수 아님)
- 카드 결제 시도 시 거부
- Case 시스템에 자동 등록

### 2.6 자동지급 자금 모델 (기업 충전 기반)

자동지급(급여/임대료/통신비/구독료)은 기업 충전 잔액에서 집행:
- **충전 기반**: 기업이 Judapay 계정에 미리 충전
- **집행**: 충전 잔액에서 자동 차감 (외부 은행 계좌 스크래핑 불필요)
- **잔액 부족 시**: 사전 알림 → 자동지급 일시 중단
- **납부 완료 확인**: Judapay 집행 로그로 자체 처리

---

## 3. 자금 집행 7단계 공통 골격

```
[1] 누구에게? → [2] 목적 선택 → [3] 받는 사람
→ [4] 조건 입력 (메뉴별 차별화) ← 유일하게 다른 단계
→ [5] 확인 → [6] PIN/Face ID → [7] 집행 완료
```

4단계만 목적별 차별화. 나머지는 공통 화면.

---

## 4. 자금 집행 메뉴 구조

### 4.1 개인 계정

#### 개인에게 지급
- 용돈선물 · 빌려주기 · 부동산 · 외주비 · 투자 (개인→개인 엔젤)

#### 사업자에게 지급
- 부동산 · 외주비 · 투자 (개인→기업 엔젤)

### 4.2 기업 계정 (v2.7 완성 + v2.8 자동지급 완성)

#### 개인에게 지급 — 6개
외주비 · 경조사비 · 상여금 · 기타소득 · **대여금** · **투자 (기업→개인)**

#### 사업자에게 지급 — 5개
- **외주비/마케팅비** (ExecuteFreelanceBusiness)
- **부동산** (ExecuteRealEstate 공용)
- **자금 대여** (ExecuteVendorLoanBusiness) — B2B 차용증 + 이자
- **투자** (ExecuteVendorInvestBusiness) — 4가지 유형 + 3단계 입력
- **자금 지원** (ExecuteSupportBusiness) — 권한 자금 + MCC 통제

#### 자동지급 — 4개 (v2.8 완성)
- **급여** (ExecuteSalary) — 급여 차트 시스템 + 엑셀 업로드
- **임대료** (ExecuteRent) — 월세/전세 자동 납부
- **렌트리스** (ExecuteRentLease) — 장기 렌트 자동 납부
- **통신비** (ExecuteTelecom) — 법인 통신비 자동 납부

### 4.3 기관 계정 — 1차 활성

수급자에게 지급 (복지/장학/보조금) + 거래처에 지급 (공공사업비/위탁운영비)

### 4.4 투자 메뉴 — 4가지 시나리오

| 시나리오 | 주체 | 1차 MVP |
|---|---|---|
| A: 개인→개인 엔젤 | 지인 사업 투자 | ✅ 활성 |
| B: 개인→기업 엔젤 | 스타트업 투자 | ✅ 활성 |
| C: 기업→개인 | 1인 창업가 투자 | ✅ 활성 (간단 흐름) |
| D: 기업→기업 / VC | VC 투자 | ❌ 2차 |

**투자 표준 필수 항목**: 투자 금액 · 투자 형태 (지분/CB·SAFE/단순대여/수익분배) · 자금 사용 목적 · MCC 차단 · 계약 기간 · 정기 보고 주기

---

## 5. 8가지 시그니처 기능

### 5.1 메시지 = 트랜잭션 인터페이스
금융 행위(요청·승인·지급·기록)가 발생하는 인터페이스. 분쟁 시 메시지 + 자금 흐름이 결합된 증거 자료.

**v2.6 구현**: store 기반 메시지 자동 생성. 계약서 카드 / 진행 상태 카드 / 통지형 카드 / 미가입자 대기 카드 4가지 type.

### 5.2 알림센터 = 금융 타임라인
모든 자금 집행 = 알림센터 카드. 양 당사자 알림센터에 동시 기록. 5년 영구 보관.

**v2.6 구현**: store 기반 알림 자동 생성. 거래형(계약 탭) / 통지형(알림 탭) 분리.

### 5.3 자동 증빙 + 세무사 자동 전송
자금 집행 → 거래확인서 자동 생성 → 세무사 이메일 자동 전송 → 5년 보관

### 5.4 사기 방지 5개 축
MCC 통제 · 계약서 자동 생성 · 외부 시스템 연동 (쿠콘) · 자동 이행 (조건부 에스크로) · 분쟁 증거 자동 수집

### 5.5 단계형 공개 시스템
발신자가 설정한 공개 수준(최소/표준/전체)에 따라 받는 사람의 사용 내역 공개.

### 5.6 거래 관계 관리 (CRM)
메시지 리스트에 잔액 그래프 + 주의 점 (3색). 채팅방에 FDS 경고 박스.

### 5.7 계약서 위험 진단
자금 집행 시점에만 AI 분석. 위험 신호 검출: 위약금 누락 / 마감일 없음 / 비정상 분할 비율 / 사기 키워드 ("원금 보장", "확정 수익률")

### 5.8 자금 사용처 자동 보고
권한 자금 집행 후 받는 사람의 사용을 발신자에게 자동 알림 + 정기 보고서 (투자/공공/기업 임직원 자금 적용).

---

## 6. 자동지급 시스템 (v2.8 완성)

### 6.1 공통 구조

자동지급 4개 화면 (ExecuteRent / ExecuteRentLease / ExecuteTelecom / ExecuteSalary) 모두 동일 패턴 적용:

```
screen: 'list' | 'addForm' | 'detail' | 'log'
```

#### 공통 STATUS_MAP (3상태)

```js
const STATUS_MAP = {
  active:  { label: '자동지급 ON',  color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  overdue: { label: '미납 중',      color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  paused:  { label: '자동지급 OFF', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
}

// 상태 계산 함수
const getComputedStatus = (item) => {
  if (!item.autoEnabled) return 'paused'
  if (item.lastPayStatus === 'fail') return 'overdue'
  return 'active'
}
```

#### 공통 알림 설정 토글 구조

모든 자동지급 화면에 Toggle 기반 알림 설정 (addForm + detail 동일):

```jsx
// RentLease — 5개 토글
{ icon:'🔔', label:'지급 예정 알림', sub:'지급 3일 전 사전 안내' }
{ icon:'✅', label:'지급 완료 알림', sub:'납부 완료 즉시 발송' }
{ icon:'⚠️', label:'지급 실패 알림', sub:'실패 즉시 운영자 알림' }
{ icon:'📅', label:'계약 만료 30일 전 알림', sub:'갱신 또는 종료 안내' }
{ icon:'🔄', label:'갱신 필요 알림', sub:'계약 만료 7일 전 발송' }

// Rent — 4개 토글 (갱신 없음)
// Telecom — 3개 토글 (지급예정/완료/실패)
// Salary — 3개 토글 (지급예정/완료/실패)
```

### 6.2 ExecuteSalary — 급여 차트 시스템

#### 급여 차트 (Chart) 개념

1개 급여 차트 = 1개 급여 정책 그룹 (부서별/직군별 분리 가능)

```js
DEMO_CHARTS = [{
  id, name, payDay, payMethod,        // 지급일/방식
  autoEnabled, lastPayStatus,
  employees: [...],                    // 직원 목록
  bankName, bankAccount,              // 계좌 자동이체 시 은행 정보
  limitEnabled, limitAmount,
  approvalEnabled,
  hasReceipt, hasTax, hasPayroll,     // 증빙 연동
  notifBefore, notifDone, notifFail,  // 알림 설정
}]
```

#### 자동지급 설정 (구독료 화면 동일 스타일)

```
[지급일 칩 선택]
1일 5일 10일 15일 20일 25일 말일 + 직접 입력
↓ 직접 입력 선택 시 숫자 입력 필드 표시

[지급 방식]
● 계좌 자동이체   ○ 링크 수취형
↓ 계좌 자동이체 선택 시:
  은행 칩 (국민/신한/우리/하나/기업/농협/카카오뱅크/토스뱅크)
  계좌번호 입력 필드
↓ 링크 수취형 선택 시:
  안내 박스 표시
```

#### 엑셀 업로드 (ExcelUploadSheet)

급여 차트를 엑셀로 일괄 생성하는 기능:

```
Step 1: 업로드
  - CSV 양식 다운로드 (UTF-8 BOM, Excel 한글 호환)
  - 드래그&드롭 또는 파일 선택 업로드

Step 2: 미리보기 + 확인
  - 파싱된 직원 목록 카드 표시
  - 직원 상태 칩:
    🏦 계좌 등록됨 (은행+계좌 입력된 경우, authStatus='account_provided')
    📩 초대 링크 발송 예정 (계좌 없는 경우, authStatus='invited')
  - 차트 이름 입력
  - 생성 버튼 → 급여 차트 자동 생성

CSV 컬럼: 이름 / 휴대폰번호 / 월급(세전) / 은행명 / 계좌번호
```

#### 증빙 연동 (3가지)

```
✅ 원천세 자동 처리  — 홈택스 원천세 신고 자동 연동
✅ 전자 세금계산서   — 급여 관련 세금계산서 자동 발행
✅ 급여 대장 자동 생성 — 통합증빙센터 인건비 급여대장 자동 첨부 (v2.8 추가)
```

### 6.3 매월 총 지급액 요약 표시 조건

```jsx
// 변경 전 (detail 화면에만 표시)
{ec.gross > 0 && <summary />}

// 변경 후 (직원 1명 이상이면 addForm에도 표시)
{editEmployees.length > 0 && <summary />}
```

---

## 7. 증빙 자동화 체계 (v2.8 확정)

### 7.1 주다페이 자체 생성 증빙 (외부 API 불필요)

주다페이 시스템 내부 데이터만으로 자동 생성 가능:

| 증빙 종류 | 포함 내용 | 비고 |
|---|---|---|
| 지급 확인서 | 지급일시/수신자/목적/금액/승인정보/결제수단 | 금융 증빙 가치 |
| 집행 영수증 | 거래ID/승인자/지급목적/지급시간/첨부계약서/상대방인증 | 내부 회계 증빙 |
| 급여 명세서 | 급여계산/지급/수령인/세액 | 자동 생성 |
| 외주비 지급명세 | 프리랜서 지급 내역 | 원천세 포함 |
| 임대료 지급 증빙 | 월세/보증금/계약서/납부로그 | 자동 생성 |
| 운영비 지급 증빙 | 통신비/SaaS/렌트료 납부 이력 | 자동 생성 |

### 7.2 외부 API가 필요한 공식 원본 데이터

아래 데이터는 Judapay가 자체 생성 불가 → 쿠콘 API 연동 필수:

| 데이터 | 출처 | 비고 |
|---|---|---|
| 부가세·법인세 고지 내역 + 전자납부번호 | 홈택스 | 납부 자동화 핵심 |
| 지방세 고지 내역 + 납부번호 | 위택스 | 재산세·지방소득세 |
| 전자세금계산서 원본 | 국세청 | 공식 승인 데이터 |
| 4대보험 공식 고지 | 건보공단/국민연금/근로복지공단 | 급여 자동화 완성 |

---

## 8. 쿠콘(Coocon) API 연동 확정 (v2.8)

### 8.1 파트너십 현황

- **쿠콘 회장 = Judapay 주주** → API 계약 실질적 확정
- 요금: 쿠콘 표준 요금제 적용
- 개발 전제: 쿠콘 API 100% 사용 가능으로 설계

### 8.2 확정 계약 리스트 (5개)

| 우선순위 | API | 용도 |
|---|---|---|
| 1순위 | **공동인증서 모듈** | 하위 모든 스크래핑의 기반 인증 |
| 1순위 | **홈택스 스크래핑** | 국세 고지 내역 + 전자납부번호 자동 수집 |
| 1순위 | **위택스 스크래핑** | 지방세 고지 내역 + 납부번호 |
| 2순위 | **전자세금계산서 조회** | 국세청 승인 원본 데이터 |
| 3순위 | **4대보험 3종 스크래핑** | 건강보험공단 + 국민연금공단 + 근로복지공단 |

### 8.3 제외 항목 (불필요)

- ❌ 기업 계좌 잔액/거래내역 — 충전 잔액 기반 모델이므로 불필요
- ❌ 통신비 스크래핑 — 수동 등록 + 자동납부 방식으로 충분
- ❌ 전기/가스 스크래핑 — 동일 이유

### 8.4 세금 자동화 흐름 (쿠콘 연동 후)

```
법인 공동인증서 등록
  ↓
홈택스 스크래핑 (자동 주기적 실행)
  ↓
부가세/법인세/원천세 고지 내역 수집
  + 전자납부번호 자동 추출
  ↓
Judapay Execute > 세금 화면에 자동 등록
  ↓
관리자 승인 (또는 자동 승인)
  ↓
충전 잔액에서 집행
  ↓
납부 완료 → 지급 확인서 자동 생성 → 세무사 전송
```

### 8.5 기존 BACKEND_REQUIRED 상 쿠콘 활용 영역

기존에 언급된 쿠콘 연동 항목 (변경 없음):
- 사업자번호 조회 (국세청 실시간) → SelectVendor / SelectBusiness
- 부동산 근저당 말소 확인 → ExecuteRealEstate 잔금 조건
- 홈택스 완납 증명 → 부동산 잔금 집행 전 세금 완납 체크

---

## 9. UX 설계 원칙

### 9.1 4단계 표준 레이아웃 (v1.9 확정)
받는 사람 → 금액 → 세부 옵션 → 요약/안내 박스 → 다음 버튼

### 9.2 네비게이션 정책
**좌상단 ← 만 사용, 하단 [이전/다음] 페어 X** (한국 핀테크 표준)

### 9.3 메뉴 명칭 원칙
"친구/가족에게" 같은 따뜻한 표현 금지. "개인에게 / 사업자에게" 처럼 행위자 중심 표현 유지.

### 9.4 카피 원칙

| 피해야 할 표현 | 대신 |
|---|---|
| 송금 / 보내기 | 자금 집행 |
| 친구/가족에게 | 개인에게 지급 |
| 받은 잔액 | 권한 자금 / 받은 지갑 |

---

## 10. 디자인 시스템 (v2.2 확정 + v2.5 전 화면 적용)

### 10.1 브랜드 컬러

```js
// tokens.js — COLORS
brand:     '#5B4FE8'   // 보라/인디고 (토스/카카오/네이버 차별화)
brandDark: '#3D2090'
headerGrad: 'linear-gradient(160deg, #5B4FE8 0%, #3D2090 50%, #1A1240 100%)'
bg:        '#F4F6FB'   // 라벤더 그레이 배경
bgCard:    '#FFFFFF'
bgMuted:   '#F1F2F7'

// 텍스트
t1: '#1A1F36'  // 제목
t2: '#374151'  // 본문
t3: '#6B7280'  // 보조
t4: '#9CA3AF'  // 흐림 (메타)
t5: '#BABADA'  // placeholder

// 보더
border:     '#E5E7EB'
borderSoft: '#F1F2F7'

// 시맨틱
success: '#10B981'   successBg: '#D1FAE5'
warning: '#F59E0B'   warningBg: '#FEF3C7'
danger:  '#EF4444'   dangerBg:  '#FEE2E2'
```

### 10.2 계정 타입별 테마 (accountTokens.js)

```
// getAccountTheme() — 컴포넌트 내부 첫 줄에 반드시 호출

개인 (personal):
  brand: '#5B4FE8'  brandDark: '#3D2090'
  headerGrad: linear-gradient(160deg, #5B4FE8 → #3D2090 → #1A1240)

기업 (business):
  brand: '#0EA5E9'  brandDark: '#0369A1'
  headerGrad: linear-gradient(160deg, #1E3A5F → #0F2035 → #0A1628)

공공기관 (institution):
  brand: '#16A34A'  brandDark: '#166534'
  headerGrad: linear-gradient(160deg, #2A5C3F → #1A3D2B → #0F2D1A)
```

### 10.3 RADIUS / SHADOWS

```js
RADIUS = { sm:'8px', md:'12px', lg:'16px', xl:'20px', pill:'999px' }
SHADOWS = {
  card: '0 2px 8px rgba(0,0,0,0.06)',
  buttonBrand: '0 4px 12px rgba(91,79,232,0.35)',
}
```

### 10.4 FUND_COLORS (자금 종류별 배지)

```js
freelance:    { main:'#2D6BB0', bg:'#EDF3FA', border:'#B5CFE8' }  // 외주비
marketing:    { main:'#B45309', bg:'#FFF7ED', border:'#FED7AA' }  // 마케팅비
realestate:   { main:'#085041', bg:'#E6F5EF', border:'#B5DDC8' }  // 부동산
lend:         { main:'#6B21A8', bg:'#F5F3FF', border:'#DDD6FE' }  // 대여금
invest:       { main:'#065F46', bg:'#ECFDF5', border:'#6EE7B7' }  // 투자
support:      { main:'#047857', bg:'#ECFDF5', border:'#6EE7B7' }  // 자금 지원
personalLend: { main:'#C2410C', bg:'#FFF7ED', border:'#FED7AA' }  // 빌려주기
bonus:        { main:'#065F46', bg:'#ECFDF5', border:'#6EE7B7' }  // 상여금
condolence:   { main:'#9D174D', bg:'#FFF0F5', border:'#F9A8D4' }  // 경조사비
otherIncome:  { main:'#5B21B6', bg:'#F5F3FF', border:'#C4B5FD' }  // 기타소득
gift:         { main:'#9D174D', bg:'#FFF0F5', border:'#F9A8D4' }  // 용돈/선물
```

### 10.5 헤더 원칙
- 라운드/글래스 카드 없이 좌우 꽉
- 9:41 상태바 제거
- 큰 28px 페이지 타이틀
- 단계 인디케이터: 4px 점, 활성=흰색 / 비활성=`rgba(255,255,255,0.18)`

---

## 11. 기술 스택 (확정)

```
프론트엔드: Vite + React 18 + React Router v6
스타일: 인라인 스타일 + 디자인 토큰 (Tailwind 미사용)
뷰포트: 390px 모바일 고정
i18n: 자체 구현 (design/i18n.js, useT() 훅) — 한/영 지원
상태: 인메모리 store (transactionStore.js, Pub/Sub)
```

```
백엔드 (미정):
  후보: Spring Boot 또는 Go
  DB: PostgreSQL (트랜잭션 + JSONB)
  메시지 큐: Kafka
  그래프 분석: Neo4j
```

---

## 12. 핵심 시스템 규칙 (절대 준수)

1. **`getAccountTheme()`** — 컴포넌트 내부 **첫 줄**에 호출
2. **싱글쿼트 `'${theme.xxx}'` 금지** → 백틱 사용
3. **최상위 상수에 theme 참조 금지** (컴포넌트 밖 X)
4. **import 중복 금지**
5. **`theme.brandDark`** — 흰 배경 위, **`theme.brand`** — 다크 배경 위
6. **헤더 스크롤 함께**, BottomTab만 `position: absolute`
7. **모달/바텀시트 `position: 'absolute'`** (PhoneShell 안에)
8. **early return 위에 useMemo 금지**
9. **새 화면마다** `getAccountTheme()` + `useT()` + DarkHeader

---

## 13. 통합 거래 Store (v2.6 도입)

### 13.1 아키텍처

```
addTransaction(params)
  ├── _appendActivity(tx)        → 홈 활동 피드
  ├── _appendAlertSender(tx)     → 보낸 사람 알림
  ├── _appendAlertReceiver(tx)   → 받는 사람 알림
  └── contract  → _appendContractMessages(tx)   → 거래형 메시지
      notification → _appendNotificationMessage(tx) → 통지형 메시지
```

### 13.2 거래 카테고리

```
contract:     freelance, marketing, lend, invest, support, realestate, personalLend
notification: bonus, condolence, otherIncome, gift
```

### 13.3 TX_TYPE_META (아이콘 + 라벨)

```js
freelance:    { icon: '💼', labelKo: '외주비' }
marketing:    { icon: '📢', labelKo: '마케팅비' }
lend:         { icon: '🤝', labelKo: '대여금' }
invest:       { icon: '📈', labelKo: '투자' }
support:      { icon: '🌱', labelKo: '자금 지원' }
realestate:   { icon: '🏠', labelKo: '부동산' }
personalLend: { icon: '🤝', labelKo: '빌려주기' }
bonus:        { icon: '🎉', labelKo: '상여금' }
condolence:   { icon: '💐', labelKo: '경조사비' }
otherIncome:  { icon: '📋', labelKo: '기타소득' }
gift:         { icon: '🎁', labelKo: '용돈/선물' }
```

### 13.4 addTransaction() 전체 파라미터 (v2.7 확장)

```js
addTransaction({
  // 필수
  type, fromUserId, fromUserName, fromUserType,
  recipient: { id?, name, phone?, initial, isBusiness?,
               verified, avatarBg?, avatarFg?, brn?, ceo?, vendorEmail? },
  amount,

  // 선택
  whtAmount, netAmount, reason, walletId, walletLabel,
  payDateMode, scheduledDate,

  // 거래형 (v2.7 풀 풍부화)
  dealTitle,
  dealDescription,
  contractDocId,
  contractExpires,
  contractSigned,
  contractFile,
  milestones: [{
    id, label, amount, status, date, action,
    note,
    conditions: [{ label, done, sub }],
  }],
  timeline: [{ time, label, type }],
  safety: string[],
  dealStatus, statusLabel, myAction,

  // 투자/자금 지원 메타
  investMeta: {
    type, typeLabel,
    equityPct, valuation,
    interestRate, profitShare,
    period, reportFreq,
    autoRefund, purposeLabel, purposeMemo,
    categories, blockedMcc, userContractFile,
  },
  supportMeta: { reportCycle, expiryDate, blockedCategories },
})
```

### 13.5 셀렉터 API

```js
getTransactionById(id)
getActivityFeed({ userId, limit })
getMyAlerts({ userId })
getMyContractDeals({ userId, role })
getMyMessageThreads({ userId })
getMessagesForThread(threadKey)
getTransactionsByPhone(phone)
migratePendingToVerified(phone, newUserId)
```

---

## 14. SelectVendor / SelectBusiness — 미가입자 처리 (v2.7)

### 14.1 공통 패턴

```
사업자번호 조회 결과:
  isJudaUser: false → 노란 박스 📩 + 이메일 입력 필수 + 버튼 disabled
  isJudaUser: true  → 바로 진행

최근 거래 사업자 선택:
  isJudaUser: true  → 이메일 없이 바로 진행

recipient 전달:
  { ...business, isJudaUser, verified: isJudaUser,
    vendorEmail?, brn, ceo, kyc }
```

### 14.2 SelectBusiness 카드 순서 (v2.7)
1. ✓ 정상 사업자 카드 (녹색)
2. 회사 정보 (대표자/업종/소재지/개업일/과세유형)
3. 📩 미가입 안내 + 이메일 입력
4. ✓ 검수 완료 시 자동 처리됩니다
5. ⓘ 쿠콘 연동 안내

---

## 15. StoreTransactionDetail 풍부 화면 (v2.7)

```
다크 헤더
  카운터파티 아바타 + 이름 + 인증배지 + 진행률%
  진행률 바 (executedAmount / total)
  큰 금액 + dealTitle + dealDescription

단계별 진행 카드
  활성 마일스톤: 노란 보더
  amount > 0일 때만 금액 표시 (0원 숨김)
  isActive && conditions → 노란 체크리스트 박스

투자/자금 지원 정보 카드 (investMeta 있을 때)
  자금 지원: 지원 명목/사유/기간/보고주기/미사용 잔액
  투자: 형태/지분율/회사가치/계약기간/보고주기
  🚫 MCC 차단 박스 (빨간 톤)

자금 사용 목적
  한도 있을 때: 진행률 바
  한도 없을 때: 칩 형태 (emoji + label) + "계약서·보고서 기재용"

활동 타임라인
안전 장치 (그린 박스)
계약서 보기 카드
메시지 버튼 (풀 네이비 sticky)
```

---

## 16. 라우트 현황 (v3.0)

```
/home-business                         → HomeBusiness
/home                                  → HomePersonal
/alerts                                → Alerts (거래탭 + 알림탭)
/messages                              → Messages
/transaction/:id                       → TransactionDetail

/execute/business                      → ExecuteBusinessRouter (기업/개인 분기)
/execute/business/select-vendor        → SelectVendor (사업자 조회 + 미가입자)
/execute/business/select-recipient     → SelectRecipientBusiness
/execute/business/freelance            → ExecuteFreelanceBusiness (외주비/마케팅비)
/execute/business/bonus                → ExecuteBonusBusiness
/execute/business/condolence           → ExecuteCondolenceBusiness
/execute/business/other-income         → ExecuteOtherIncomeBusiness
/execute/business/lend                 → ExecuteLendBusiness (사유 4가지)
/execute/business/support              → ExecuteSupportBusiness
/execute/business/vendor-loan          → ExecuteVendorLoanBusiness
/execute/business/vendor-invest        → ExecuteVendorInvestBusiness (3단계)
/execute/business/invest               → ExecuteInvestBusiness (개인, requireType=personal)

/execute/personal/select               → SelectBusiness (미가입자 이메일)
/execute/personal/freelance            → ExecuteFreelance (공용)
/execute/personal/realestate           → ExecuteRealEstate (공용)
/execute/personal/invest               → ExecuteInvest (개인 자금 지원)
/execute/personal/lend                 → ExecuteLend

/auto/salary                           → ExecuteSalary
/auto/rent                             → ExecuteRent
/auto/rent-lease                       → ExecuteRentLease
/auto/telecom                          → ExecuteTelecom

/payments                              → PaymentLogs (결제 내역 + 소명요청 선택 모드)
/payment-alerts                        → PaymentAlerts (결제 알림 + 소명요청 선택 모드)
/payment/:id                           → PaymentDetail (결제 상세 + 분류 + 소명요청 모달)
/approval-center                       → ApprovalCenter (승인 대기 센터)
/stats                                 → ExecutionStats (집행 통계)
```

---

## 17. 디렉토리 구조

```
src/
├── App.jsx
├── design/
│   ├── tokens.js          COLORS / RADIUS / SHADOWS / FUND_COLORS
│   ├── accountTokens.js   ACCOUNT_THEMES / getAccountTheme()
│   ├── i18n.js            다국어 키맵 + useT()
│   └── components.jsx     PhoneShell 등
├── hooks/
│   └── useStoreData.js    store 변경 시 자동 리렌더
├── shared/
│   ├── transactionStore.js        ⭐ 핵심 store
│   ├── walletsData.js             지갑 목록
│   ├── recipientsData.js          14명 수신자 풀
│   ├── TransactionDetail.jsx      거래 상세 (정적 + StoreTransactionDetail)
│   ├── Alerts.jsx                 알림 탭
│   ├── Messages.jsx               메시지 탭
│   └── execute/
│       ├── ConfirmStep.jsx        공용 확인
│       ├── PinStep.jsx            공용 PIN
│       ├── DoneStep.jsx           공용 완료
│       ├── MccBlock.jsx           MCC 차단 공통 컴포넌트
│       ├── ExecuteFreelance.jsx   외주비 (공용)
│       └── ExecuteRealEstate.jsx  부동산 (공용)
├── business/execute/
│   ├── ExecuteBusiness.jsx             사업자에게 지급 5메뉴 진입
│   ├── ExecuteBusinessRouter.jsx       기업/개인 분기
│   ├── SelectVendor.jsx                사업자 조회 + 미가입자
│   ├── SelectRecipientBusiness.jsx
│   ├── ExecuteFreelanceBusiness.jsx    외주비/마케팅비
│   ├── ExecuteBonusBusiness.jsx        ✅ pushToStore 풍부화 완료 (v2.8)
│   ├── ExecuteCondolenceBusiness.jsx   ✅ pushToStore 풍부화 완료 (v2.8)
│   ├── ExecuteOtherIncomeBusiness.jsx  ✅ pushToStore 풍부화 완료 (v2.8)
│   ├── ExecuteLendBusiness.jsx         직원 대여금 4가지 사유
│   ├── ExecuteSupportBusiness.jsx      자금 지원
│   ├── ExecuteVendorLoanBusiness.jsx   B2B 자금 대여
│   └── ExecuteVendorInvestBusiness.jsx B2B 투자 3단계
├── personal/execute/
│   ├── ExecutePersonal.jsx
│   ├── ExecuteToBusiness.jsx
│   ├── SelectBusiness.jsx         미가입자 이메일 처리
│   ├── ExecuteGift.jsx            ✅ pushToStore 풍부화 완료 (v2.8)
│   ├── ExecuteLend.jsx
│   ├── ExecuteInvest.jsx          자금 지원 (type='support')
│   └── ExecuteInvestBusiness.jsx  개인→사업자 투자 4가지 유형
├── business/auto/                 ⭐ v2.8 완성
│   ├── ExecuteSalary.jsx          급여 차트 + 엑셀 업로드
│   ├── ExecuteRent.jsx            임대료 자동납부
│   ├── ExecuteRentLease.jsx       렌트리스 자동납부
│   └── ExecuteTelecom.jsx         통신비 자동납부
└── shared/                        ⭐ v3.0 추가
    ├── ApprovalCenter.jsx         승인 대기 센터 (status tabs + type chips)
    ├── PaymentAlerts.jsx          결제 알림 (소명요청 선택 모드)
    ├── PaymentDetail.jsx          결제 상세 (분류 + 소명요청 모달)
    ├── PaymentLogs.jsx            결제 내역 (소명요청 선택 모드)
    └── ExecutionStats.jsx         집행 통계 (카테고리 통일 기준)
```

---

## 18. 풍부화 완료 현황 (v2.8)

### 거래형 메뉴 pushToStore

| 파일 | 마일스톤 | note | conditions | timeline | safety | contractFile | dealDesc | investMeta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ExecuteRealEstate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| ExecuteFreelanceBusiness | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| ExecuteFreelance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| ExecuteVendorLoanBusiness | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| ExecuteVendorInvestBusiness | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExecuteLend | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| ExecuteInvest | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExecuteInvestBusiness | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExecuteSupportBusiness | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExecuteLendBusiness | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |

### 통지형 메뉴 pushToStore (v2.8 완료)

| 파일 | 완료 |
|---|---|
| ExecuteBonusBusiness | ✅ |
| ExecuteCondolenceBusiness | ✅ |
| ExecuteOtherIncomeBusiness | ✅ |
| ExecuteGift | ✅ |

---

## 19. 데모 데이터

| 항목 | 값 |
|---|---|
| 본인 (개인) | 김주다 (`me_juda_kim`) |
| 본인 (기업) | ㈜주다컴퍼니 (`biz_juda`) |
| MY 지갑 잔액 | 1,932,000원 |
| 법인 잔액 | 47,820,000원 |
| 카드 | 5234 7891 2345 0001 · 05/31 · CVC 342 |
| 테스트 사업자 (정상) | 123-45-67890 → (주)오로라 |
| 테스트 사업자 (폐업) | 234-56-78901 → (주)한빛홀딩스 |

---

## 20. 자주 겪는 문제 & 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| 화면이 로그인으로 튕김 | App.jsx 라우트 누락 | import + Route 추가 |
| theme 참조 에러 | 최상위 상수에서 theme 사용 | 컴포넌트 내부로 이동 |
| `${theme.x}` 리터럴 출력 | 싱글쿼트 사용 | 백틱으로 변경 |
| 마일스톤에 0원 표시 | amount=0도 표시 | `amount > 0` 조건 추가 |
| 자금 지원이 투자로 표시 | type='invest'로 push | type='support'로 변경 |
| 수익 분배 만기에 원금 표시 | profit 만기 amount 미처리 | `(equity\|\|profit) ? 0 : amount` |
| 매월 총 지급액 addForm 미표시 | `ec.gross > 0` 조건 | `editEmployees.length > 0`으로 변경 |
| 자동지급 알림이 토글 아닌 배지 | 구형 "자동" 뱃지 방식 | Toggle 컴포넌트로 교체 |
| npm 패키지 설치 403 | 보안 정책 차단 | 네이티브 Blob/FileReader API 사용 |

---

## 21. 라이센스 전략

### 21.1 1차 목표
**금융감독원 선불전자지급수단 발행/관리업** — 2027년 1~2월 심사 통과

### 21.2 라이센스 의무사항 (화면에 반드시 표시)
1. 본인확인 (KYC) — 30만원 초과 충전 시 실명확인
2. 이용한도 표시 — 홈 + MY 지갑 상세에 항상 노출
3. 환불 청구권 안내 — 더보기 메뉴
4. 거래내역 5년 보관 + 즉시 조회 — 알림센터
5. 약관 동의 + 변경 7일 전 고지
6. 분쟁처리 절차 — 더보기 메뉴
7. 자금 분리 보관 (신탁) — "신탁 분리 보관 적용" 명시

### 21.3 변호사 검토 1순위 항목
1. 선불전자지급수단 vs 종합지급결제업 분류
2. 카드 Issuer Processor 모델 — 전자지급결제대행업 추가 라이센스 여부
3. 권한 자금 (출금 불가) 표시 방식
4. 공공자금 처리 — 보조금 관리법, 국가재정법
5. 자동 증빙 + 세무사 전송 — 개인정보 처리위탁
6. 기업 충전 한도 — 200만원 한도 법인 적용 여부

### 21.4 라이센스 어필 포인트
1. 창원진흥원, 국민은행 장학재단 등 공공기관 협의 완료
2. 카드사 Issuer Processor 모델 협의
3. 모두싸인/쿠콘 API 제휴 (쿠콘 회장 = 주주, 계약 확정)
4. Case 시스템 + AML 자동화
5. 지갑 모델 — 자금 출처 추적 강화 (AML 통과 가능성 높음)

---

## 22. 비즈니스 모델

### 22.1 기본 수익 구조

| 모델 | 내용 | 시기 |
|---|---|---|
| 신탁예치 이자 | 예치 잔액 × 시중금리 차이 | 라이센스 직후 |
| 기업 유료플랜 | 월 구독 (자동 증빙/세무사 전송/통계/보고서) | MVP 출시 후 |
| PG 결제 수수료 | 카드 결제 건당 0.x% | 라이센스 직후 |

### 22.2 분쟁 기반 수익 모델 (v2.4 확정)

| 서비스 | 대상 | 수익 |
|---|---|---|
| 외주비 중재 | 분쟁금액 1% 선납, 합의 성립 시 환급 | 불성립 케이스 0.5% |
| 가압류 공탁 대행 | 1천만원 이상 채권 | 원금 1.5~3% |
| 법무법인 레퍼럴 | 분쟁 유형별 전문 법무법인 연결 | 선임료 10~15% |

### 22.3 세무사 GTM 전략
세무사 이메일 등록 → 월 증빙 자동 전송 → 세무사가 고객사에 추천 → 영업비용 0

---

## 23. 카드 결제 분류 통일 시스템 (v3.0)

### 23.1 설계 원칙

> **모든 카드 결제 분류는 ExecutionStats.jsx의 CATEGORY_GROUPS → 운영비 세부항목을 단일 기준으로 사용한다.**

운영비 세부항목이 전사 카드 결제 분류의 source of truth. 분류 UI가 있는 모든 화면은 이 상수를 따른다.

### 23.2 통일된 PURPOSE_OPTIONS (5개)

```js
const PURPOSE_OPTIONS = ['운영', '출장식대', '복리후생', '기타', '개인사용']
```

| 항목 | 대상 | 비고 |
|---|---|---|
| 운영 | 임대료/렌트&리스/구독료/통신비/공과금/보험료/기타정기지출 | 운영비 일반 |
| 출장식대 | 출장 중 식비/교통/숙박 | 법인카드 주요 사용처 |
| 복리후생 | 직원 복지 관련 지출 | 법인카드 주요 사용처 |
| 기타 | 위 분류 외 업무 관련 지출 | |
| 개인사용 | 업무 무관 개인 사용 | 이상 거래 플래그 가능 |

### 23.3 분류 적용 화면

| 화면 | 분류 방식 | 적용 여부 |
|---|---|---|
| ExecutionStats (집행 통계) | CATEGORY_GROUPS 운영비 subs | ✅ (단일 기준) |
| PaymentDetail (결제 상세) | PURPOSE_OPTIONS ClassifySheet | ✅ |
| PaymentAlerts (결제 알림) | PURPOSE_OPTIONS ClassifySheet | ✅ |
| PaymentLogs (결제 내역) | PURPOSE_OPTIONS ClassifySheet | ✅ |

### 23.4 ExecutionStats CATEGORY_GROUPS — 운영비 최종 항목

모든 유저 타입(business/personal/public)에 공통 적용:

```
임대료 · 렌트&리스 · 구독료 · 통신비 · 공과금 · 보험료 · 기타정기지출
+ 출장식대 (✈️) · 복리후생 (🎁) · 개인사용 (👤)
```

### 23.5 ClassifySheet UX

```jsx
// 5개 항목 — 2×2 그리드, 5번째(개인사용)만 전체 너비
<div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px' }}>
  {PURPOSE_OPTIONS.map((opt, i) => (
    <button
      style={{ gridColumn: i === 4 ? 'span 2' : undefined }}>
      {opt}
    </button>
  ))}
</div>

// 분류 표시 로직
const effectiveCategory = purposeOverride ?? payment.category
const effectiveCategoryAuto = purposeOverride ? false : payment.categoryAuto

// 미분류: category === null → "⚠ 미분류 · 분류하기" (주황 점선 박스)
// 자동분류: categoryAuto === true → "✦ 자동분류명" (파란 뱃지)
// 수동분류: → "✓ 분류명" (초록 뱃지)
```

---

## 24. 승인 대기 센터 (ApprovalCenter) — v3.0

### 24.1 화면 구조

```
헤더 (다크 그라디언트)
  타이틀: "승인 대기 센터"
  ──────────────────────
  STATUS_TABS (탭 네비게이션)
  [ 전체 ] [ 진행 중 ] [ 반려 ] [ 완료 ]
  ──────────────────────
  TYPE_CHIPS (필터 칩, 다중 선택)
  [승인요청] [검수요청] [증빙요청] [소명요청]
  ──────────────────────
  ApprovalCard 리스트
    카드 하단 버튼 (4열 균등 그리드):
    [ 상세보기 ] [ 추가요청 ] [ 반려 ] [ 승인 ]
```

### 24.2 주요 상태 및 요청 타입

```js
// STATUS_TABS
const STATUS_TABS = [
  { id:'all', label:'전체' }, { id:'inprogress', label:'진행 중' },
  { id:'rejected', label:'반려' }, { id:'done', label:'완료' },
]

// TYPE_CHIPS (다중 토글, 미선택 = 전체)
const TYPE_CHIPS = [
  { id:'approval', label:'승인요청' }, { id:'review', label:'검수요청' },
  { id:'evidence', label:'증빙요청' }, { id:'claim',  label:'소명요청'  },
]

// 승인 항목 데이터 모델
{
  id, type, status, amount, name, purpose, date, dept,
  history: [{ action, actor, time, note }],
  claimStatus: null | 'requested' | 'submitted',
  evidenceStatus: null | 'requested' | 'submitted',
}
```

### 24.3 소명/증빙 요청 모달 (공통)

ApprovalCenter · PaymentDetail · PaymentAlerts 3개 화면에 동일 모달 패턴 적용:

```jsx
// 토글 상태
const [claimRequest, setClaimRequest] = useState(true)   // 소명요청
const [evidenceRequest, setEvidRequest] = useState(false) // 증빙요청

// 자동 메시지 생성
function autoMsg(claim, evid) {
  if (claim && evid) return '소명 및 증빙 서류 제출 부탁드립니다.'
  if (claim) return '소명 부탁드립니다.'
  if (evid)  return '증빙 서류 제출 부탁드립니다.'
  return ''
}

// 모달 레이아웃
소명 요청 ON/OFF 토글
증빙 요청 ON/OFF 토글
────────────────────
전송 메시지 textarea (자동완성, 직접 편집 가능)
────────────────────
[ 전송하기 ] 버튼
```

### 24.4 DetailSheet z-index 레이어링

```
DetailSheet:     z-index: 500
소명/증빙 모달:  z-index: 600   ← 반드시 DetailSheet보다 위
```

### 24.5 확정 동작 흐름

```
[추가요청 클릭]
  → handleRequest(item) (DetailSheet 닫지 않음)
  → 모달 열기 (z:600)

[전송 확인]
  → approvals 상태 업데이트 (status: inprogress)
  → detailItem 동기화 (DetailSheet 내 즉시 반영)
  → 토스트 "요청 메시지 발송 완료"
```

---

## 25. CSS 스크롤 아키텍처 (v3.1 확정)

### 25.1 핵심 규칙

모바일 스크롤 버그를 방지하기 위한 CSS 레이아웃 불변 규칙:

```css
/* 1. .phone — overflow: clip 필수 (hidden 아님) */
.phone {
  overflow: hidden;  /* fallback */
  overflow: clip;    /* 탄성 스크롤 애니메이션 간섭 없이 프레임 클리핑 */
}

/* 2. 뷰포트 높이 — svh 우선 */
.phone {
  height: 100vh;   /* fallback */
  height: 100svh;  /* 모바일 브라우저 UI 포함 실제 뷰포트 */
}

/* 3. flex 직계 자식 min-height:0 필수 */
.phone > * { min-height: 0; }

/* 4. 스크롤 컨테이너 — overscroll-behavior: contain 유지 */
[style*="overflow-y: auto"] {
  min-height: 0;
  overscroll-behavior: contain;  /* 탄성 바운스 + 상위 scroll 전파 방지 */
}
```

### 25.2 금지 패턴

```jsx
// ❌ 절대 금지: inner wrapper에 overflow:'hidden'
<div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

// ✅ 올바른 방법: overflow 없이 flex만
<div style={{ flex:1, display:'flex', flexDirection:'column' }}>

// ❌ 절대 금지: .phone에 overflow:hidden (CSS에서)
.phone { overflow: hidden; }  /* 단독 사용 금지 */

// ✅ 올바른 방법: clip 사용
.phone { overflow: hidden; overflow: clip; }
```

### 25.3 절대위치 전체화면 패널

`position: absolute; inset: 0`으로 전체화면을 덮는 패널(MonthlyReport, CompanyProfile 등)도 `overflow: clip` 사용:

```jsx
// ✅
<div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', overflow:'clip' }}>
```

---

## 26. 미완료 작업

### 구현 잔여
```
⏳ HomeBusiness 기업 홈 화면 고도화
⏳ 단계 F: 비가입자 → 가입자 매칭 흐름
⏳ 기관 홈 화면 고도화
⏳ 백엔드 시뮬레이터 (마일스톤 진행)
⏳ PaymentLogs ClassifySheet 5번째 항목(개인사용) 확인
⏳ 결제 목적 분류 → ExecutionStats 집계 반영 연동
⏳ ChatActionsPersonal.jsx 생성 (진행 중)
⏳ ChatActionsBusiness.jsx 생성
⏳ ChatRoom.jsx 분리 + userType 연결
⏳ Messages.jsx 슬림화 + 필터 userType 분기
```

### 외부 API 연동 (쿠콘 계약 후)
```
⏳ 공동인증서 모듈 연동
⏳ 홈택스 스크래핑 → 세금 고지 자동 수집
⏳ 위택스 스크래핑 → 지방세 자동 수집
⏳ 전자세금계산서 조회 API
⏳ 4대보험 3종 스크래핑 (건보/국민연금/근로복지)
```

### 시스템 설계 잔여
```
⏳ Wallet 테이블 상세 스키마
⏳ Event 테이블 상세 스키마
⏳ FDS 룰 엔진
⏳ AML STR/CTR 워크플로우
⏳ 카드 Issuer Processor 백엔드 (100ms SLA)
⏳ 백엔드 / 인프라 스택 결정
```

### 외부 협력 잔여
```
⏳ 핀테크 전문 변호사 미팅
⏳ 카드사 Issuer Processor 계약
⏳ 쿠콘 5개 API 정식 계약 (공동인증서/홈택스/위택스/전자세금계산서/4대보험)
⏳ 모두싸인 전자서명 위탁 계약
⏳ KCB 본인인증 위탁 계약
⏳ 신탁 계좌 은행 협의
```
