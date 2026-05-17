# 백엔드 구현 필요 항목 (Backend Required)

> 와이어프레임의 모든 "자동 처리" 동작 정리. 현재 UI에 안내 텍스트만 있고 실제 동작 X.

---

## 📋 현재 상태 vs 백엔드 도입 후

| 항목 | 현재 (와이어프레임) | 백엔드 도입 후 |
|---|---|---|
| 데이터 저장 | 메모리 store (새로고침 시 리셋) | DB 영구 저장 |
| 시간 기반 처리 | 없음 | 스케줄러 자동 처리 |
| 외부 이벤트 | 없음 | 서명/검수/인증 이벤트 수신 |
| 알림 | 정적 시드 데이터 | WebSocket / FCM 실시간 |
| 사업자 조회 | 데모 시뮬 (하드코딩) | 쿠콘 API 실시간 연동 |
| 계약서 생성 | 파일명만 표시 | PDF 자동 생성 + 전자서명 |
| 회계 처리 | 안내 텍스트만 | 자동 분개 + 세무사 연동 |
| 세금 고지 수집 | 없음 | 쿠콘 홈택스/위택스 스크래핑 |
| 4대보험 고지 | 없음 | 쿠콘 3종 스크래핑 |
| 결제 목적 분류 | 인메모리 purposeOverride | DB 영구 저장 + 집계 반영 |
| 소명/증빙 요청 | toast만 표시 (메시지 미발송) | 실제 메시지 채널 발송 |
| 승인 워크플로우 | 인메모리 상태 변경 | DB 트랜잭션 + 감사 로그 |

---

---

## 💳 카드 결제 자동 카테고리 분류 (v3.1 신규)

### 프론트엔드 구현 현황 (데모)
```
파일: src/shared/merchantCategoryMapper.js

구조:
  MCC_RANGES   — Visa/Mastercard MCC 코드 범위 50개 → mainCat/subCat 매핑
  KEYWORD_RULES — 가맹점명 키워드 → mainCat/subCat 매핑 (브랜드명 직접 매칭)
  autoClassify(merchant, mcc?) — 분류 함수

분류 우선순위:
  1. 가맹점명 키워드 매핑  (스타벅스 → 출장식대, AWS → 구독료 등)
  2. MCC 코드 범위 매핑   (5812~5814 음식점 → 출장식대 등)
  3. 미분류               (mainCat: '미분류', subCat: '미분류')

현재 PaymentAlerts.jsx:
  → PROCESSED_PAYMENTS = ALL_PAYMENTS.map(p => autoClassify 적용)
  → 데모용: 표시 직전 런타임에서 분류 실행 (mock data 처리용)
```

### ⚠️ 프로덕션 전환 시 핵심 변경점
```
현재 (데모):
  PaymentAlerts.jsx 렌더 시점에 autoClassify() 호출

프로덕션:
  카드사/쿠콘 결제 웹훅 수신 → autoClassify() 호출 → DB 저장
  PaymentAlerts는 이미 분류된 데이터를 읽어서 표시만 함

흐름:
  카드사 웹훅 수신
    ↓
  POST /api/webhooks/card-payment
    body: { merchantName, mccCode, amount, cardId, ... }
    ↓
  autoClassify(merchantName, mccCode) 호출
    → matched: true  → mainCat/subCat DB 저장, categoryAuto: true
    → matched: false → mainCat: '미분류', subCat: '미분류', categoryAuto: false
    ↓
  transaction 저장 + 실시간 알림 (WebSocket / FCM)
    ↓
  PaymentAlerts: DB에서 읽어 표시 (autoClassify 재호출 없음)
```

### 카테고리 체계 (ExecutionStats CATEGORY_GROUPS 동일)
```
대분류(mainCat) → 중분류(subCat)

인건비: 급여, 외주비, 상여금, 경조사비, 기타소득, 4대보험
운영비: 임대료, 렌트&리스, 구독료, 통신비, 공과금, 보험료,
        출장식대, 복리후생, 기타 정기지출, 개인사용
사업비: 마케팅비
금융:   투자, 대여금
세금:   세금
미분류: 미분류  ← MCC/키워드 불일치 시, 세무사가 수동 분류
```

### 결제 건 분류 저장 API

```
현재: purposeOverride state — 새로고침 시 초기화, 집계 미반영
백엔드: 카드 결제 건별 분류값 DB 영구 저장 + 집행 통계 자동 집계

POST /api/payments/:id/classify
  body: {
    mainCat: '운영비' | '인건비' | '사업비' | '금융' | '세금' | '미분류',
    subCat:  '출장식대' | '구독료' | '복리후생' | ... (중분류),
    classifiedBy: 'user' | 'system',
    memo?: string
  }
  response: {
    paymentId,
    mainCat, subCat,
    classifiedAt,
    classifiedBy,
  }

※ 분류하기 바텀시트(ClassifySheet): 대분류 선택 → 중분류 선택 2단계 UI
   선택 결과가 이 API로 전달됨
```

### 카드 결제 웹훅 수신 API (신규)

```
POST /api/webhooks/card-payment
  body: {
    merchantName: string,  // 가맹점명
    mccCode: number,       // MCC 코드 (카드사/VAN 제공)
    amount: number,
    cardId: string,
    approvalNo: string,
    approvedAt: string,
  }

처리 흐름:
  1. autoClassify(merchantName, mccCode) 호출
  2. matched: true  → categoryAuto: true, mainCat/subCat 자동 저장
     matched: false → categoryAuto: false, mainCat: '미분류' 저장
  3. transactions 테이블 INSERT
  4. WebSocket 실시간 Push → PaymentAlerts 즉시 갱신
  5. 미분류 건 발생 시 관리자 알림 발송
```

### 분류 집계 → 집행 통계 반영

```
GET /api/stats/execution?period=monthly&type=card
  response: {
    categories: [
      { mainCat: '운영비', subCat: '출장식대', total: 840000,  count: 8  },
      { mainCat: '운영비', subCat: '구독료',   total: 876900,  count: 3  },
      { mainCat: '운영비', subCat: '복리후생', total: 520000,  count: 5  },
      { mainCat: '운영비', subCat: '임대료',   total: 5800000, count: 1  },
      ...
    ],
    unclassified: { total: 432000, count: 6 }
  }
```

### 미분류 알림

```
[일 1회 스케줄러]
  → 미분류(mainCat: '미분류') 건수 집계
  → 관리자 알림: "미분류 결제 OO건 — 세무사 분류 필요"

API: GET /api/payments/unclassified-count
```

---

## 📂 미분류 항목 처리 (기타 정기지출 / 기타지출)

```
대상 화면:
  ExecuteMisc.jsx        — 기타 정기지출 관리 (세무사 자문료 등 미분류 항목 등록)
  ExecuteOtherExpense.jsx — 기타 지출 상세 설정

현재:
  submit() / handleAdd() 호출 시 addTransaction 실행
  mainCat: '미분류', subCat: '미분류' 로 저장됨

백엔드 처리:
  → 세무사 연동 화면에서 미분류 건 목록 노출
  → 세무사가 수동으로 대분류/중분류 지정
  → POST /api/transactions/:id/reclassify
       body: { mainCat, subCat, classifiedBy: 'accountant', memo? }
  → 집행 통계 실시간 반영
```

---

## ✅ 승인 워크플로우 API (v3.0 신규)

### 승인 대기 목록

```
현재: DEMO_APPROVALS 하드코딩
백엔드: DB 조회 + 실시간 상태 반영

GET /api/approvals?status=all|inprogress|rejected|done&type=approval|review|evidence|claim
  response: {
    items: [{
      id, type, status, amount, name, purpose, date, dept,
      claimStatus: null | 'requested' | 'submitted',
      evidenceStatus: null | 'requested' | 'submitted',
      history: [{ action, actor, time, note }],
    }],
    total, counts: { all, inprogress, rejected, done }
  }
```

### 승인 처리

```
POST /api/approvals/:id/approve
  body: { note?: string }
  → status: 'done'
  → 양측 알림 발송
  → 집행 확인서 자동 생성

POST /api/approvals/:id/reject
  body: { reason: string }
  → status: 'rejected'
  → 요청자에게 반려 사유 알림

POST /api/approvals/:id/request
  body: {
    claimRequest: boolean,
    evidenceRequest: boolean,
    message: string
  }
  → claimStatus / evidenceStatus: 'requested'
  → 메시지 채널로 요청 발송
  → history 항목 추가
```

### 소명/증빙 제출

```
POST /api/approvals/:id/claim/submit
  body: { content: string, attachments?: file[] }
  → claimStatus: 'submitted'
  → 승인자에게 알림

POST /api/approvals/:id/evidence/submit
  body: { attachments: file[] }
  → evidenceStatus: 'submitted'
  → 승인자에게 알림
```

---

## 💬 소명요청 메시지 발송 API (v3.0 신규)

```
현재: toast만 표시, 실제 메시지 채널 미연결
백엔드: 내부 메시지 시스템 + Push 알림 실제 발송

POST /api/claim-requests/bulk
  body: {
    paymentIds: string[],
    message: string,
    requestedBy: userId
  }
  response: {
    sent: number,
    failed: number,
    threadIds: string[]   // 생성된 메시지 스레드
  }

흐름:
  PaymentAlerts 선택 N건 → 소명요청 모달 → 전송
  → 각 결제 건의 수신자별 메시지 스레드 생성
  → FCM / 앱 내 알림 발송
  → Messages 탭에 스레드 자동 노출
```

---

## 🔍 사업자 인증 API

### 사업자번호 조회 (쿠콘 API 연동)
```
현재: 데모 숫자로 정상/폐업 하드코딩
백엔드: 실시간 국세청 사업자 정보 조회

POST /api/vendor/lookup
  body: { brn: "123-45-67890" }
  response: {
    status: "normal" | "closed" | "not_found",
    name, representative, industry, address,
    establishedAt, taxType, closedAt?,
    isJudaUser: boolean,
  }
```

### 미가입 사업자 이메일 발송
```
현재: vendorEmail state에 저장만 (발송 X)
백엔드: 계약서/초대 이메일 자동 발송

POST /api/vendor/invite
  body: { brn, email, transactionId, type }
  → 계약서 PDF + 주다페이 가입 링크 발송
  → 30일 만료 JWT 토큰 포함
```

---

## 🏛️ 쿠콘 API 연동 (v2.8 확정)

### 확정 계약 5개 (쿠콘 회장 = Judapay 주주)

#### 1. 공동인증서 모듈
```
전체 스크래핑의 기반 인증.
법인 공동인증서 1회 등록 → 하위 모든 API 자동 인증.

POST /api/coocon/auth/register-cert
  body: { certFile, certPassword, bizId }
  → 인증서 안전 보관 (HSM)
  → 만료일 자동 추적 → D-30 갱신 알림
```

#### 2. 홈택스 스크래핑 (1순위)
```
국세: 법인세 / 부가가치세 / 원천세 / 종합소득세 고지 내역 + 전자납부번호 자동 수집.

POST /api/coocon/hometax/fetch
  → 고지 목록: [{ taxType, amount, dueDate, paymentNo, status }]
  → 전자납부번호 자동 추출 → Execute > 세금 화면 자동 등록

GET /api/coocon/hometax/bills
  → 미납/예정 고지서 목록

납부 자동화 흐름:
  고지 수집 → 관리자 승인 → 충전 잔액에서 집행 → 지급확인서 자동 생성
```

#### 3. 위택스 스크래핑 (1순위)
```
지방세: 재산세 / 지방소득세 / 취득세 고지 내역.

POST /api/coocon/wetax/fetch
  → 고지 목록: [{ taxType, region, amount, dueDate, paymentNo }]
```

#### 4. 전자세금계산서 조회 (2순위)
```
국세청 승인 원본 데이터 (자체 생성 불가 — 공식 원본 필요).

GET /api/coocon/etax/invoices
  query: { from, to, type: 'issued'|'received' }
  → 매입/매출 세금계산서 목록
  → 통합증빙센터 자동 첨부 연동
```

#### 5. 4대보험 3종 스크래핑 (3순위)
```
건강보험공단:
POST /api/coocon/nhis/fetch
  → 사업장 건강보험료 고지 [{ month, amount, dueDate, paymentNo }]

국민연금공단:
POST /api/coocon/nps/fetch
  → 사업장 국민연금 고지 [{ month, amount, dueDate }]

근로복지공단 (고용보험 + 산재보험):
POST /api/coocon/kwf/fetch
  → 고용보험 + 산재보험 고지 [{ type, month, amount, dueDate }]

쿠콘 연동 완료 시 카테고리 자동 주입:
  → mainCat: '인건비', subCat: '4대보험'
  → addTransaction() 호출 시 TYPE_TO_CATEGORY['insurance4'] 자동 매핑
  → ExecuteInsurance4.jsx는 쿠콘 고지 수집 데이터 표시 + 납부 처리로 전환
     (현재: 납부 완료 시 수동 addTransaction 없음 → 쿠콘 웹훅 수신 시 자동 처리)
```

### 제외 항목 (설계 결정)
```
❌ 기업 계좌 잔액/거래내역 — 충전 잔액 기반 모델이므로 불필요
❌ 통신비 스크래핑 — 수동 등록 + 자동납부로 충분
❌ 전기/가스 스크래핑 — 동일 이유
```

### 쿠콘 기반 세금 자동화 전체 흐름
```
[법인 공동인증서 최초 등록]
  ↓
[주기적 스크래핑 (cron — 매일 새벽)]
  홈택스 / 위택스 / 건보 / 국민연금 / 근로복지공단
  ↓
[고지서 자동 수집 → Execute > 세금/4대보험 화면 등록]
  ↓
[관리자 알림: "새 고지서 OO건 수집됨"]
  ↓
[승인 (또는 금액 범위 내 자동 승인)]
  ↓
[충전 잔액에서 집행]
  ↓
[지급 확인서 자동 생성 → 세무사 자동 전송]
```

---

## 🔄 자동 처리 항목 (스케줄러)

### 1. 급여 선지급 — 급여일 자동 차감
```
[급여일 00:00 스케줄러]
  → lend 거래 중 purpose='salary' && milestone.date <= today 조회
  → 급여 명세에서 선지급금 차감
  → milestone status: pending → paid
  → 거래 status → completed
  → 양측 알림: "급여 선지급 OOO원이 급여에서 차감되었습니다"

API: POST /api/scheduler/salary-deduction
     PUT /api/transactions/:id/milestones/:mid/complete
```

### 2. 급여 자동지급 (ExecuteSalary)
```
[급여일 00:00 스케줄러]
  → 자동지급 ON 차트 조회 (autoEnabled: true)
  → 직원별 세전 금액 계산
  → 원천세(3.3%) 차감 후 실수령액 계산
  → 은행 계좌로 자동 이체 (또는 링크 발송)
  → 급여 명세서 자동 생성
  → 급여 대장 자동 생성 → 통합증빙센터 첨부
  → 원천세 내역 → 홈택스 원천세 신고 자동 연동

API: POST /api/scheduler/salary-auto-pay
     POST /api/salary/:chartId/execute
     POST /api/salary/:chartId/generate-payslip
     POST /api/salary/:chartId/generate-payroll-ledger
```

### 3. 출장비 선지급 — 영수증 정산
```
[직원이 영수증 첨부 시]
  → POST /api/transactions/:id/receipts
  → 합계 계산 후 차액 정산 (초과/부족 분기)

[마감일 D-3 알림]
  → 직원에게: "영수증 정산 마감 D-3"

API: POST /api/transactions/:id/receipts
     POST /api/transactions/:id/settle-travel
     POST /api/scheduler/travel-deadline-check
```

### 4. 직원 대여금 — 만기 상환
```
[차용증 서명 완료]
  → 직원 지갑으로 즉시 입금

[매월 말일 — 이자 인식]
  → 활성 대여금 조회 → 인정이자 자동 분개 → 세무사 전송

[만기 D-7 알림]
  → 양측 자동 알림

[만기일 도래]
  → 급여에서 자동 차감 또는 지갑 출금

API: POST /api/contracts/:id/sign-event
     POST /api/scheduler/loan-monthly-interest
     POST /api/scheduler/loan-maturity-process
```

### 5. 외주비/마케팅비 — 검수 후 자동 입금
```
[프리랜서 작업물 납품]
  → milestone: pending → reviewing
  → 발주자 검수 요청 알림

[발주자 검수 승인]
  → 원천세 3.3% 차감 후 즉시 입금

[검수 미응답 7일]
  → 자동 승인 (auto_deadline 설정 시)

API: POST /api/transactions/:id/milestones/:mid/deliverables
     POST /api/transactions/:id/milestones/:mid/approve
     POST /api/transactions/:id/milestones/:mid/reject
     POST /api/scheduler/review-auto-approve
```

### 6. 부동산 — 단계별 자동 처리
```
[양측 서명 완료]
  → 계약금(10%) 즉시 입금

[중도금 지정일 도래]
  → 자동 입금

[잔금 집행 조건 모두 충족]
  - 근저당 말소 확인 (쿠콘 자동)
  - 국세/지방세 완납 증명 (홈택스 연동)
  - 잔금일 도래
  → 잔금 자동 입금

API: POST /api/real-estate/:id/lien-check
     POST /api/real-estate/:id/tax-check
     POST /api/scheduler/real-estate-final-check
```

### 7. 자동지급 공통 — 잔액 부족 사전 알림
```
[자동지급일 D-3 스케줄러]
  → 충전 잔액 vs 예정 지급 총액 비교
  → 부족 시: 관리자 알림 "잔액 부족 — 충전 필요"
  → 지급일 도래 시 잔액 부족이면: 자동지급 SKIP + 미납 상태로 변경

API: POST /api/scheduler/auto-pay-balance-check
```

### 8. B2B 자금 대여 — 만기 회수
```
[서명 완료]
  → 사업자 계좌로 즉시 입금

[매 분기말 — 이자 인식]
  → 이자수익 자동 분개 → 세무사 전송

[만기일 도래]
  → 원금 + 이자 자동 회수

API: POST /api/vendor-loan/:id/collect-maturity
     POST /api/scheduler/vendor-loan-quarterly-interest
```

### 9. B2B 투자 — 평가 손익
```
[매 분기말]
  → 평가 손익 자동 인식 → 세무사 전송

[CB/대여 만기]
  → 원금 자동 회수 또는 주식 전환 옵션

API: POST /api/invest/:id/quarterly-valuation
     POST /api/invest/:id/convert-to-equity
```

### 10. 자금 지원 — 보고서 + 환급
```
[정기 보고일]
  → 자금 사용 보고서 PDF 자동 생성

[사용 종료일 도래]
  → 미사용 잔액 자동 환급 + 최종 보고서

API: POST /api/support/:id/generate-report
     POST /api/support/:id/collect-remaining
     POST /api/scheduler/support-report-cycle
```

---

## 🔔 알림 처리 항목

### 외부 이벤트 → 알림

| 이벤트 | 트리거 | 양측 알림 |
|---|---|---|
| 차용증/계약서 서명 완료 | 전자서명 서비스 | "서명 완료 - 자금 입금 진행" |
| 영수증 첨부 | 직원 앱 | "영수증 도착 - 정산 진행" |
| 미가입자 가입 완료 | 외부링크 인증 | "인증 완료 - 자금 입금" |
| 작업물 납품 | 프리랜서 앱 | "작업물 도착 - 검수 요청" |
| 검수 승인 | 발주자 앱 | "검수 완료 - 입금 진행" |
| 세금 고지 수집 | 쿠콘 스크래핑 | "새 고지서 OO건 수집됨" |
| 4대보험 고지 수집 | 쿠콘 스크래핑 | "건강보험 OO월 고지서 수집됨" |
| MCC 한도 80% 초과 | 카드 결제 | "OO 카테고리 한도 80% 도달" |

### 시간 기반 자동 알림

| 시점 | 대상 | 내용 |
|---|---|---|
| 자동지급일 D-3 | 관리자 | "잔액 부족 — 충전 필요" (잔액 부족 시) |
| 급여일 D-1 | 관리자 | "내일 급여 자동지급 예정 OOO원" |
| 세금 납부 기한 D-7 | 관리자 | "세금 납부 기한 D-7" |
| 4대보험 납부 기한 D-3 | 관리자 | "건강보험료 납부 기한 D-3" |
| 만기 D-7 | 양측 | "대여금/상환 만기 D-7" |
| 검수 마감 D-3 | 발주자 | "검수 마감 D-3" |
| 보고 주기 도래 | 받는 사람 | "OO 보고서 작성 요청" |
| 부동산 갱신 D-30 | 임차인 | "계약 갱신 검토" |
| 공동인증서 만료 D-30 | 관리자 | "공동인증서 갱신 필요" |

---

## 💼 회계 처리 항목

### 자동 분개

| 자금 종류 | 차변 (Dr) | 대변 (Cr) | 비고 |
|---|---|---|---|
| 외주비 | 외주가공비 / 부가세대급금 | 보통예금 / 예수금(원천세) | WHT 3.3% |
| 마케팅비 | 광고선전비 | 보통예금 / 예수금(원천세) | WHT 3.3% |
| 상여금 | 상여금 | 보통예금 / 예수금(원천세) | WHT 6.6% |
| 경조사비 | 복리후생비 | 보통예금 | 비과세 |
| 기타소득 | 기타소득 | 보통예금 / 예수금(원천세) | WHT 8.8% |
| 급여 | 급여 | 보통예금 / 예수금(4대보험+원천세) | 급여 차트 기반 |
| 급여 선지급 | 가지급금 | 보통예금 | 급여일 상계 |
| 출장비 선지급 | 가지급금 | 보통예금 | 영수증 정산 |
| 직원 대여금 | 단기/장기 대여금 | 보통예금 | 매월 이자 인식 |
| B2B 대여 | 단기 대여금 | 보통예금 | 만기 회수 |
| B2B 투자 | 장기 투자 자산 | 보통예금 | 자기자본법 |
| 자금 지원 | 투자 자산 | 보통예금 | 분기별 평가 |
| 부동산 (전세) | 임차보증금 | 보통예금 | 만기 회수 |
| 국세 납부 | 세금과공과 | 보통예금 | 홈택스 전자납부번호 |
| 지방세 납부 | 세금과공과 | 보통예금 | 위택스 전자납부번호 |
| 4대보험 납부 | 복리후생비 (사용자분) | 보통예금 | 건보/연금/고용/산재 |

### 세무 자동 처리
```
[매월 10일] 원천세 신고서 자동 생성 (외주비/상여금/기타소득/급여 합산)
[매월 10일] 4대보험 납부 확인 → 세무사 전송
[분기말] 부가세 신고 지원
[매년 5월] 종합소득세 신고 지원
[연말] 직원별 급여명세 + 대여금 잔고 보고
[5년 보관] 모든 거래 원장 (법정 의무)
```

---

## 🔐 보안/인증 항목

### 미가입자 외부링크 인증
```
POST /api/auth/external-link/generate
  body: { phone | email, transactionId, type }
  → JWT 토큰 발행 (30일 만료) → SMS / 이메일 발송

POST /api/auth/external-link/verify
  body: { token, phone, code }
  → 가입 완료 + migratePendingToVerified() 호출
```

### 전자서명 (차용증/계약서)
```
연동 후보: KICA, 카카오 인증, 모두싸인

POST /api/contracts/:id/send-for-signature
  → 서명 링크 발송
  → 완료 웹훅: POST /api/contracts/:id/sign-event
```

### 근저당 말소 확인 (부동산)
```
연동: 쿠콘 부동산 등기 API
POST /api/real-estate/:id/lien-check
  → 근저당 존재 여부 실시간 조회
```

### 홈택스 완납 증명 (부동산)
```
연동: 쿠콘 홈택스 API
POST /api/real-estate/:id/tax-clearance
  → 국세/지방세 완납 여부 조회
```

---

## 🚀 단계적 도입 계획

### Phase 1 — 영구 저장 (필수)
- store → DB (PostgreSQL / MongoDB)
- 사용자 인증 (JWT + Refresh Token)
- 기본 CRUD API
- **결제 목적 분류 DB 저장** (`payments.purpose`, `classifiedBy`, `classifiedAt`)
- **승인 워크플로우 테이블** (`approvals`, `approval_history`)

### Phase 2 — 자동 처리 (핵심)
- 만기 알림 스케줄러 (cron)
- 외부 이벤트 핸들러 (서명/검수/인증)
- 비가입자 매칭 흐름
- 자동지급 실행 스케줄러 (급여/임대료/통신비)
- **소명/증빙 요청 → 메시지 스레드 자동 생성**
- **미분류 결제 일일 알림 스케줄러**

### Phase 3 — 쿠콘 API 연동
- 공동인증서 모듈 등록/관리
- 홈택스 스크래핑 → 세금 고지 자동 수집
- 위택스 스크래핑 → 지방세 자동 수집
- 4대보험 3종 스크래핑 → **ExecuteInsurance4 연동 + mainCat:'인건비'/subCat:'4대보험' 자동 주입**
- 사업자번호 조회 API
- **카드 결제 웹훅 수신 → autoClassify(merchant, mcc) → mainCat/subCat DB 저장**

### Phase 4 — 전자서명 + 증빙
- 전자서명 서비스 (모두싸인 등)
- 전자세금계산서 조회 API
- 지급 확인서 / 급여 명세서 PDF 자동 생성
- 세무사 시스템 연동 (더존, 세무사랑)

### Phase 5 — 회계 자동화
- 자동 분개 생성
- 원천세 자동 신고
- 4대보험 납부 자동화
- **결제 분류 → 집행 통계 자동 집계 연동**

### Phase 6 — 권한 자금 + AI 고도화
- MCC 통제 실시간 적용 (카드사 API)
- 자금 사용 내역 실시간 모니터링
- 분기별 보고서 PDF 자동 생성
- **AI 기반 결제 목적 자동 분류 고도화**
  - Phase 3의 MCC + 키워드 룰 기반 → ML 모델로 전환
  - merchantName + MCC + 금액 + 시간대 학습
  - 미분류율 목표: 5% 이하
  - 분류 신뢰도 낮은 건만 세무사에게 노출
- AI 기반 이상 거래 탐지
