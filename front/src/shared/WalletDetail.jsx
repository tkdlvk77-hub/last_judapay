import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { getAccountTheme } from '../design/accountTokens'

const C = {
  navy:   '#0F172A',
  navy2:  '#1E293B',
  slate:  '#64748B',
  slateL: '#94A3B8',
  border: '#E2E8F0',
  bg:     '#F8FAFC',
  white:  '#FFFFFF',
  green:  '#059669',
  red:    '#DC2626',
  amber:  '#D97706',
  amberBg:'#FFFBEB',
  amberBd:'#FDE68A',
}

const FUND_COLOR = {
  my: '#0F172A', invest: '#0EA5E9', gift: '#F59E0B',
  lend: '#6366F1', freelance: '#10B981', living: '#0E7490',
}

const HOLD_TYPE_LABEL = {
  APPROVAL_PENDING: '승인대기',
  SCHEDULED:        '예약집행',
  AUTO_PAY:         '자동지출',
  INSPECTION:       '검수대기',
  TAX:              '세금예정',
  INSURANCE:        '4대보험',
  BUDGET_LOCK:      '예산잠금',
}

const HOLD_TYPE_COLOR = {
  APPROVAL_PENDING: { color: '#D97706', bg: '#FFFBEB' },
  SCHEDULED:        { color: '#6366F1', bg: '#EEF2FF' },
  AUTO_PAY:         { color: '#0EA5E9', bg: '#E0F2FE' },
  INSPECTION:       { color: '#059669', bg: '#D1FAE5' },
  TAX:              { color: '#DC2626', bg: '#FEE2E2' },
  INSURANCE:        { color: '#DC2626', bg: '#FEE2E2' },
  BUDGET_LOCK:      { color: '#64748B', bg: '#F1F5F9' },
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET_DATA  —  지갑 세부 화면용 정적 데모 데이터
//
// [공통 필드]
//   fund        : 지갑 종류 (my | invest | gift | lend | freelance | living)
//   canWithdraw : 출금 가능 여부 — MY 지갑만 true
//   balance     : 현재 잔액 (보류 포함 총액)
//   pendingAmount : 보류 중 금액 (대기 집행 합계)
//   pendingItems  : 보류 항목 배열 — 상세 바텀시트에 표시
//   completed   : true 이면 완료된 지갑 (헤더에 '완료' 뱃지)
//
// [일반 지갑 필드]
//   periodAmounts : 기간 탭(이번달/3개월/6개월/1년)별 헤더 금액
//   txns          : 거래 내역 배열, period 필드로 기간 필터링
//     txn.period  : '이번달' | '3개월' | '6개월' | '1년'
//     txn.sign    : +1 입금, -1 사용/출금
//     txn.type    : '입금' | '사용' | '출금' | '대기'
//
// [생활비(living) 지갑 — 별도 설계 참고]
//   isRecurring   : true = 월별 자동지급, false = 일회성 입금
//   → 상세 설계는 living_minjun 위 주석 블록 참고
// ─────────────────────────────────────────────────────────────────────────────

const WALLET_DATA = {
  my: {
    id: 'my', label: '내 지갑', sub: '내 지갑 합계',
    fund: 'my', canWithdraw: true,
    balance: 2252000,
    pendingAmount: 320000,
    periodAmounts: { '이번달': 1932000, '3개월': 5240000, '6개월': 9870000, '1년': 18540000 },
    pendingItems: [
      { id: 'h1', holdType: 'AUTO_PAY', name: '배민 외주 정산 대기', amount: 320000, scheduledAt: '5.15' },
    ],
    txns: [
      // ── 이번달 ──
      { id: 't01', period: '이번달', tag: '입금', tagColor: '#6D28D9', tagBg: '#EDE9FE', name: '(주)오로라 디자인 외주',   sub: '사업자 발신 · 5.20 10:14',    amount:  500000, sign:  1, type: '입금' },
      { id: 't02', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '박민준 · 빌려주기',         sub: '차용증 + 주다페이 · 5.19',    amount: 2500000, sign: -1, type: '사용' },
      { id: 't03', period: '이번달', tag: '출금', tagColor: '#D97706', tagBg: '#FEF3C7', name: '국민은행 1234***5678',      sub: '본인 명의 계좌 · 5.18 18:42', amount:  450000, sign: -1, type: '출금' },
      { id: 't04', period: '이번달', tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 5월 급여',       sub: '사업자 발신 · 5.17 09:00',    amount: 1200000, sign:  1, type: '입금' },
      { id: 't05', period: '이번달', tag: '대기', tagColor: '#D97706', tagBg: '#FFFBEB', name: '배민 외주 정산 대기',       sub: '자동지출 예정 · 5.15',        amount:  320000, sign: -1, type: '대기', holdType: 'AUTO_PAY', scheduledAt: '5.15' },
      { id: 't06', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '스타벅스 강남점',           sub: '카드 결제 · 5.14 08:30',      amount:    6500, sign: -1, type: '사용' },
      { id: 't07', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '쿠팡 로켓배송',             sub: '카드 결제 · 5.13',            amount:   38000, sign: -1, type: '사용' },
      { id: 't08', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 · 식료품',           sub: '카드 결제 · 5.11',            amount:   74000, sign: -1, type: '사용' },
      { id: 't09', period: '이번달', tag: '출금', tagColor: '#D97706', tagBg: '#FEF3C7', name: '신한은행 9876***1234',      sub: '본인 명의 계좌 · 5.10',       amount:  200000, sign: -1, type: '출금' },
      { id: 't10', period: '이번달', tag: '입금', tagColor: '#6D28D9', tagBg: '#EDE9FE', name: '프리랜서 UI 작업비',        sub: '개인 발신 · 5.08',            amount:  350000, sign:  1, type: '입금' },
      { id: 't11', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '넷플릭스 구독',             sub: '자동결제 · 5.07',             amount:   17000, sign: -1, type: '사용' },
      { id: 't12', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달의민족',                sub: '카드 결제 · 5.06',            amount:   23000, sign: -1, type: '사용' },
      { id: 't13', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: 'GS25 편의점',               sub: '카드 결제 · 5.05',            amount:    4200, sign: -1, type: '사용' },
      { id: 't14', period: '이번달', tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '4월 외주 추가 정산',        sub: '사업자 발신 · 5.03',          amount:  180000, sign:  1, type: '입금' },
      // ── 3개월 (4월) ──
      { id: 't15', period: '3개월',  tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 4월 급여',       sub: '사업자 발신 · 4.30',          amount: 1200000, sign:  1, type: '입금' },
      { id: 't16', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카카오 구독',               sub: '자동결제 · 4.28',             amount:   19000, sign: -1, type: '사용' },
      { id: 't17', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 · 식료품',           sub: '카드 결제 · 4.25',            amount:   81000, sign: -1, type: '사용' },
      { id: 't18', period: '3개월',  tag: '출금', tagColor: '#D97706', tagBg: '#FEF3C7', name: '국민은행 1234***5678',      sub: '본인 명의 계좌 · 4.22',       amount:  300000, sign: -1, type: '출금' },
      { id: 't19', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '올리브영',                  sub: '카드 결제 · 4.20',            amount:   32000, sign: -1, type: '사용' },
      { id: 't20', period: '3개월',  tag: '입금', tagColor: '#6D28D9', tagBg: '#EDE9FE', name: '(주)비타민 UI 외주',        sub: '사업자 발신 · 4.18',          amount:  420000, sign:  1, type: '입금' },
      { id: 't21', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '당근 · 중고 거래',          sub: '개인 결제 · 4.15',            amount:   55000, sign: -1, type: '사용' },
      { id: 't22', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통카드 충전',             sub: '카드 결제 · 4.12',            amount:   50000, sign: -1, type: '사용' },
      { id: 't23', period: '3개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달의민족',                sub: '카드 결제 · 4.08',            amount:   27000, sign: -1, type: '사용' },
      { id: 't24', period: '3개월',  tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 3월 급여',       sub: '사업자 발신 · 3.31',          amount: 1200000, sign:  1, type: '입금' },
      // ── 6개월 (2~3월) ──
      { id: 't25', period: '6개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '넷플릭스 구독',             sub: '자동결제 · 3.07',             amount:   17000, sign: -1, type: '사용' },
      { id: 't26', period: '6개월',  tag: '출금', tagColor: '#D97706', tagBg: '#FEF3C7', name: '국민은행 1234***5678',      sub: '본인 명의 계좌 · 3.05',       amount:  500000, sign: -1, type: '출금' },
      { id: 't27', period: '6개월',  tag: '입금', tagColor: '#6D28D9', tagBg: '#EDE9FE', name: '개인 UX 컨설팅비',          sub: '개인 발신 · 3.02',            amount:  280000, sign:  1, type: '입금' },
      { id: 't28', period: '6개월',  tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 2월 급여',       sub: '사업자 발신 · 2.28',          amount: 1200000, sign:  1, type: '입금' },
      { id: 't29', period: '6개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 · 설 선물세트',      sub: '카드 결제 · 2.20',            amount:  145000, sign: -1, type: '사용' },
      { id: 't30', period: '6개월',  tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카카오 구독',               sub: '자동결제 · 2.14',             amount:   19000, sign: -1, type: '사용' },
      // ── 1년 (작년 하반기) ──
      { id: 't31', period: '1년',    tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 1월 급여',       sub: '사업자 발신 · 1.31',          amount: 1200000, sign:  1, type: '입금' },
      { id: 't32', period: '1년',    tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 12월 급여',      sub: '사업자 발신 · 12.31',         amount: 1400000, sign:  1, type: '입금' },
      { id: 't33', period: '1년',    tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '연간 건강보험료',           sub: '자동이체 · 12.25',            amount:  230000, sign: -1, type: '사용' },
      { id: 't34', period: '1년',    tag: '출금', tagColor: '#D97706', tagBg: '#FEF3C7', name: '국민은행 1234***5678',      sub: '연말 저축 · 12.20',           amount: 1000000, sign: -1, type: '출금' },
      { id: 't35', period: '1년',    tag: '입금', tagColor: '#059669', tagBg: '#D1FAE5', name: '(주)오로라 11월 급여',      sub: '사업자 발신 · 11.30',         amount: 1200000, sign:  1, type: '입금' },
    ],
  },
  edu: {
    id: 'edu', label: '서울시 · 교육비 지원', sub: '교육비 지원 합계',
    fund: 'invest', canWithdraw: false,
    balance: 320000,
    pendingAmount: 80000,
    periodAmounts: { '이번달': 240000, '3개월': 720000, '6개월': 1440000, '1년': 2880000 },
    pendingItems: [
      { id: 'h2', holdType: 'APPROVAL_PENDING', name: '영어 학원 결제 승인 대기', amount: 80000, scheduledAt: '5.12' },
    ],
    txns: [
      { id: 'e1', period: '이번달', tag: '입금', tagColor: '#0369A1', tagBg: '#E0F2FE', name: '서울시 교육바우처 지급', sub: '서울시 · 5.01', amount: 300000, sign:  1, type: '입금' },
      { id: 'e2', period: '이번달', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '대치동 수학학원',        sub: '카드 결제 · 5.08', amount:  60000, sign: -1, type: '사용' },
      { id: 'e3', period: '이번달', tag: '대기', tagColor: '#D97706', tagBg: '#FFFBEB', name: '영어 학원 결제 승인 대기', sub: '승인대기 · 5.10', amount: 80000, sign: -1, type: '대기', holdType: 'APPROVAL_PENDING', scheduledAt: '5.12' },
    ],
  },
  mom: {
    id: 'mom', label: '엄마 · 용돈', sub: '용돈 합계',
    fund: 'gift', canWithdraw: false,
    balance: 200000,
    pendingAmount: 0,
    periodAmounts: { '이번달': 200000, '3개월': 600000, '6개월': 1200000, '1년': 2400000 },
    pendingItems: [],
    txns: [
      { id: 'm1', period: '이번달', tag: '입금', tagColor: '#92400E', tagBg: '#FEF3C7', name: '엄마 · 용돈 선물', sub: '개인 발신 · 5.05', amount: 200000, sign: 1, type: '입금' },
    ],
  },
  lent: {
    id: 'lent', label: '박민준 · 빌려준 돈', sub: '대여금 합계',
    fund: 'lend', canWithdraw: false,
    balance: 820,
    pendingAmount: 0,
    periodAmounts: { '이번달': 820, '3개월': 820, '6개월': 820, '1년': 820 },
    pendingItems: [],
    txns: [
      { id: 'l1', period: '이번달', tag: '사용', tagColor: '#4F46E5', tagBg: '#EEF2FF', name: '박민준 · 잔액 상환', sub: '차용증 기반 · 어제', amount: 999180, sign: -1, type: '사용' },
      { id: 'l2', period: '3개월',  tag: '입금', tagColor: '#4F46E5', tagBg: '#EEF2FF', name: '박민준 · 대여 집행', sub: '차용증 · 4.15',    amount: 1000000, sign:  1, type: '입금' },
    ],
  },
  // ───────────────────────────────────────────────────────────────────────────
  // 생활비(living) 지갑 설계 원칙
  //
  // [타입 분기 — isRecurring]
  //   true  → 월별 탭 뷰   : monthlyDeposits 배열 사용, 기간 칩 없음
  //   false → 일반 탭 뷰   : txns + periodAmounts 사용 (일회성 입금)
  //
  // [월별 탭 — monthlyDeposits 배열 (최신 월이 index 0)]
  //   month        : 'YYYY-MM' 형식 (탭 정렬 기준)
  //   label        : 탭에 표시할 월 이름 (예: '5월')
  //   depositedAt  : 자동 입금 실행일 (예: '5.15')
  //   amount       : 해당 월 자동 입금액
  //   carriedOver  : 전월(또는 preHistory)에서 이월된 금액
  //   carryForward : null   → 현재 진행 중인 달 (실시간 잔액)
  //                  number → 완료 달, 다음 달로 넘긴 금액
  //                  0      → 완료 + 전액 소진
  //   txns         : 해당 월 지출 내역 (입금 행은 컴포넌트에서 자동 생성)
  //
  // [selectedMonth 특수값 — 컴포넌트 useState]
  //   0 ~ monthlyDeposits.length-1 → 해당 월 탭 표시
  //   monthlyDeposits.length       → preHistory 탭 표시 (이전 내역)
  //
  // [잔액 계산 공식]
  //   진행 중 달 : amount + carriedOver - txns합계 = 현재 잔액
  //   완료 달   : carryForward 값이 다음 달 carriedOver 와 일치해야 함
  //
  // [일회성 → 자동지급 전환 시 (preHistory)]
  //   preHistory 필드가 있으면 월별 탭 끝에 "이전 내역" 탭 자동 생성
  //   preHistory.carryForward → 첫 번째 monthlyDeposits(가장 오래된 월)의
  //                             carriedOver 값과 반드시 일치해야 함
  //   예) preHistory.carryForward: 200000
  //       monthlyDeposits[마지막].carriedOver: 200000  ← 동일값
  // ───────────────────────────────────────────────────────────────────────────
  living_minjun: {
    id: 'living_minjun', label: '박민준 · 생활비', sub: '생활비 지갑',
    fund: 'living', canWithdraw: false, isRecurring: true, carryOverAllowed: true,
    recurringDay: 15, recurringAmount: 300000, senderName: '박민준',
    balance: 240000, pendingAmount: 0, pendingItems: [],
    monthlyDeposits: [
      {
        month: '2025-05', label: '5월', depositedAt: '5.15',
        amount: 300000, carriedOver: 0, carryForward: null,
        txns: [
          { id: 'lv5_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 식료품', sub: '카드 결제 · 5.16', amount:  42000, sign: -1 },
          { id: 'lv5_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '올리브영',      sub: '카드 결제 · 5.17', amount:  18000, sign: -1 },
        ],
      },
      {
        month: '2025-04', label: '4월', depositedAt: '4.15',
        amount: 300000, carriedOver: 0, carryForward: 0,
        txns: [
          { id: 'lv4_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기',  sub: '카드 결제 · 4.16', amount:  67000, sign: -1 },
          { id: 'lv4_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달 음식',    sub: '카드 결제 · 4.21', amount:  48000, sign: -1 },
          { id: 'lv4_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국',         sub: '카드 결제 · 4.24', amount:  22000, sign: -1 },
          { id: 'lv4_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '생필품 구매',  sub: '카드 결제 · 4.27', amount:  93000, sign: -1 },
          { id: 'lv4_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페·간식',    sub: '카드 결제 · 4.30', amount:  70000, sign: -1 },
        ],
      },
      {
        month: '2025-03', label: '3월', depositedAt: '3.15',
        amount: 300000, carriedOver: 0, carryForward: 0,
        txns: [
          { id: 'lv3_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기',  sub: '카드 결제 · 3.17', amount: 130000, sign: -1 },
          { id: 'lv3_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '의류 구매',    sub: '카드 결제 · 3.20', amount:  95000, sign: -1 },
          { id: 'lv3_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '외식',         sub: '카드 결제 · 3.25', amount:  50000, sign: -1 },
          { id: 'lv3_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통비 충전',  sub: '카드 결제 · 3.30', amount:  25000, sign: -1 },
        ],
      },
    ],
  },
  // ── 개인 전용 지갑 (userType === 'personal' 일 때만 MyWallet에 노출) ────────
  // 분류 기준: 개인→개인 거래
  //   living : 생활비 (새 지갑 최초 1회 생성 후 동일 지갑에 누적)
  //   lend   : 빌려주기 tracker (차용증 기반 상환 추적)
  //   invest : 자금지원 받은 지갑 (공공기관 등)
  // 개인→개인 생활비로 받은 지갑 (엄마가 보내준 생활비)
  living_mom: {
    id: 'living_mom', label: '엄마 · 생활비', sub: '생활비 지갑',
    fund: 'living', canWithdraw: false, isRecurring: true, carryOverAllowed: true,
    recurringDay: 15, recurringAmount: 300000, senderName: '엄마',
    balance: 285000, pendingAmount: 0, pendingItems: [],
    monthlyDeposits: [
      {
        month: '2025-05', label: '5월', depositedAt: '5.15',
        amount: 300000, carriedOver: 50000, carryForward: null,
        txns: [
          { id: 'lm5_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '홈플러스 식료품',   sub: '카드 결제 · 5.16', amount:  45000, sign: -1 },
          { id: 'lm5_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '다이소',            sub: '카드 결제 · 5.18', amount:  12000, sign: -1 },
          { id: 'lm5_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페인 커피',       sub: '카드 결제 · 5.19', amount:   8000, sign: -1 },
          { id: 'lm5_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국 · 감기약',     sub: '카드 결제 · 5.20', amount:  14000, sign: -1 },
          { id: 'lm5_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달의민족',        sub: '카드 결제 · 5.21', amount:  18500, sign: -1 },
          { id: 'lm5_6', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: 'CU 편의점',         sub: '카드 결제 · 5.21', amount:   3200, sign: -1 },
          { id: 'lm5_7', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 · 식료품',   sub: '카드 결제 · 5.23', amount:  56000, sign: -1 },
          { id: 'lm5_8', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '미용실',            sub: '카드 결제 · 5.24', amount:  28000, sign: -1 },
          { id: 'lm5_9', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통카드 충전',     sub: '카드 결제 · 5.25', amount:  10000, sign: -1 },
        ],
      },
      {
        month: '2025-04', label: '4월', depositedAt: '4.15',
        amount: 300000, carriedOver: 0, carryForward: 50000,
        txns: [
          { id: 'lm4_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 장보기',    sub: '카드 결제 · 4.17', amount:  71000, sign: -1 },
          { id: 'lm4_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국',             sub: '카드 결제 · 4.22', amount:  35000, sign: -1 },
          { id: 'lm4_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '편의점',           sub: '카드 결제 · 4.28', amount:  14000, sign: -1 },
          { id: 'lm4_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '버스카드 충전',    sub: '카드 결제 · 4.29', amount:  30000, sign: -1 },
          { id: 'lm4_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '분식집',           sub: '카드 결제 · 4.30', amount: 100000, sign: -1 },
        ],
      },
      {
        month: '2025-03', label: '3월', depositedAt: '3.15',
        amount: 300000, carriedOver: 0, carryForward: 0,
        txns: [
          { id: 'lm3_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기',      sub: '카드 결제 · 3.17', amount: 120000, sign: -1 },
          { id: 'lm3_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '의류 구매',        sub: '카드 결제 · 3.20', amount:  89000, sign: -1 },
          { id: 'lm3_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페',             sub: '카드 결제 · 3.25', amount:  23000, sign: -1 },
          { id: 'lm3_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통비 충전',      sub: '카드 결제 · 3.30', amount:  68000, sign: -1 },
        ],
      },
      {
        month: '2025-02', label: '2월', depositedAt: '2.15',
        amount: 300000, carriedOver: 20000, carryForward: 0,
        txns: [
          { id: 'lm2_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '홈플러스 장보기',  sub: '카드 결제 · 2.16', amount:  88000, sign: -1 },
          { id: 'lm2_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '설날 선물 구매',   sub: '카드 결제 · 2.18', amount:  62000, sign: -1 },
          { id: 'lm2_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국',             sub: '카드 결제 · 2.21', amount:  16000, sign: -1 },
          { id: 'lm2_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달 음식',        sub: '카드 결제 · 2.25', amount:  24000, sign: -1 },
          { id: 'lm2_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: 'GS25 편의점',      sub: '카드 결제 · 2.26', amount:   5500, sign: -1 },
          { id: 'lm2_6', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통카드 충전',    sub: '카드 결제 · 2.27', amount:  10000, sign: -1 },
          { id: 'lm2_7', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '미용실',           sub: '카드 결제 · 2.28', amount:  34000, sign: -1 },
        ],
      },
      {
        month: '2025-01', label: '1월', depositedAt: '1.15',
        amount: 300000, carriedOver: 0, carryForward: 20000,
        txns: [
          { id: 'lm1_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '이마트 · 신년 장보기', sub: '카드 결제 · 1.16', amount: 104000, sign: -1 },
          { id: 'lm1_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '올리브영',           sub: '카드 결제 · 1.19', amount:  41000, sign: -1 },
          { id: 'lm1_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페 · 커피',        sub: '카드 결제 · 1.22', amount:   7500, sign: -1 },
          { id: 'lm1_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '배달의민족',         sub: '카드 결제 · 1.25', amount:  19000, sign: -1 },
          { id: 'lm1_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통카드 충전',      sub: '카드 결제 · 1.28', amount:  10000, sign: -1 },
          { id: 'lm1_6', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국',              sub: '카드 결제 · 1.30', amount:   8500, sign: -1 },
          { id: 'lm1_7', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 · 생필품',     sub: '카드 결제 · 1.31', amount:  90000, sign: -1 },
        ],
      },
      {
        month: '2024-12', label: '12월', depositedAt: '12.15',
        amount: 300000, carriedOver: 0, carryForward: 0,
        txns: [
          { id: 'lm12_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '홈플러스 · 식료품',  sub: '카드 결제 · 12.16', amount:  93000, sign: -1 },
          { id: 'lm12_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '크리스마스 선물',    sub: '카드 결제 · 12.22', amount:  78000, sign: -1 },
          { id: 'lm12_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '외식 · 송년 모임',   sub: '카드 결제 · 12.28', amount:  65000, sign: -1 },
          { id: 'lm12_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국',              sub: '카드 결제 · 12.30', amount:  16000, sign: -1 },
          { id: 'lm12_5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: 'GS25 편의점',       sub: '카드 결제 · 12.31', amount:   8000, sign: -1 },
          { id: 'lm12_6', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '교통카드 충전',     sub: '카드 결제 · 12.31', amount:  40000, sign: -1 },
        ],
      },
    ],
  },
  // 개인→개인 생활비 (아빠 · 일회성 → 자동지급 전환)
  living_dad: {
    id: 'living_dad', label: '아빠 · 생활비', sub: '생활비 지갑',
    fund: 'living', canWithdraw: false, isRecurring: true, carryOverAllowed: true,
    recurringDay: 1, recurringAmount: 300000, senderName: '아빠',
    recurringStartLabel: '7월부터 자동지급 전환',
    balance: 700000, pendingAmount: 0, pendingItems: [],
    monthlyDeposits: [
      {
        month: '2025-09', label: '9월', depositedAt: '9.01',
        amount: 300000, carriedOver: 460000, carryForward: null,
        txns: [
          { id: 'ld9_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기', sub: '카드 결제 · 9.02', amount: 38000, sign: -1 },
          { id: 'ld9_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '편의점',      sub: '카드 결제 · 9.08', amount: 22000, sign: -1 },
        ],
      },
      {
        month: '2025-08', label: '8월', depositedAt: '8.01',
        amount: 300000, carriedOver: 360000, carryForward: 460000,
        txns: [
          { id: 'ld8_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 식료품', sub: '카드 결제 · 8.03', amount:  78000, sign: -1 },
          { id: 'ld8_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '외식',        sub: '카드 결제 · 8.15', amount:  42000, sign: -1 },
          { id: 'ld8_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '생필품',      sub: '카드 결제 · 8.20', amount:  55000, sign: -1 },
          { id: 'ld8_4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페·간식',   sub: '카드 결제 · 8.28', amount:  25000, sign: -1 },
        ],
      },
      {
        month: '2025-07', label: '7월', depositedAt: '7.01',
        amount: 300000, carriedOver: 200000, carryForward: 360000,
        txns: [
          { id: 'ld7_1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기', sub: '카드 결제 · 7.02', amount: 45000, sign: -1 },
          { id: 'ld7_2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '주방용품',    sub: '카드 결제 · 7.10', amount: 33000, sign: -1 },
          { id: 'ld7_3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '의류 구매',   sub: '카드 결제 · 7.22', amount: 62000, sign: -1 },
        ],
      },
    ],
    // 자동지급 전환 전 일회성 입금 이력
    preHistory: {
      label: '이전 내역',
      periodLabel: '5.10 ~ 6.30',
      depositAmount: 500000,
      depositDate:   '5.10',
      depositName:   '아빠 · 생활비 입금 (일회성)',
      carryForward:  200000,
      carryForwardLabel: '7월 자동지급으로 이월',
      txns: [
        { id: 'ph1', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 장보기',   sub: '카드 결제 · 5.11', amount:  38000, sign: -1 },
        { id: 'ph2', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '주방용품 구매', sub: '카드 결제 · 5.12', amount:  32000, sign: -1 },
        { id: 'ph3', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트',          sub: '카드 결제 · 6.10', amount:  95000, sign: -1 },
        { id: 'ph4', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '생필품 구매',   sub: '카드 결제 · 6.20', amount:  85000, sign: -1 },
        { id: 'ph5', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '카페',          sub: '카드 결제 · 6.28', amount:  50000, sign: -1 },
      ],
    },
  },
  // 개인→개인 빌려주기 tracker (이호준에게 빌려준 돈)
  lend_iho: {
    id: 'lend_iho', label: '이호준 · 빌려준 돈', sub: '대여금 합계',
    fund: 'lend', canWithdraw: false,
    balance: 850000, pendingAmount: 0,
    periodAmounts: { '이번달': 850000, '3개월': 850000, '6개월': 1000000, '1년': 1000000 },
    pendingItems: [],
    txns: [
      { id: 'iho1', period: '이번달', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이호준 · 1차 상환', sub: '차용증 기반 · 5.01', amount: 150000, sign: -1, type: '사용' },
      { id: 'iho2', period: '6개월', tag: '입금', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이호준 · 대여 집행', sub: '차용증 · 3.10', amount: 1000000, sign: 1, type: '입금' },
    ],
  },
  // ── 기업 전용 지갑 (userType === 'business' 일 때만 MyWallet에 노출) ────────
  // 분류 기준:
  //   기업→개인   : lend (대여금 tracker — 상환 추적)
  //   기업→사업자 : invest-biz (투자 tracker — 지분/현황 추적)
  //   기업이 받음 : invest (지원금 새 지갑 — MCC 제한 + 집행 시 발신자 알림)
  // 기업이 받은 자금지원 지갑 (창원진흥원으로부터)
  changwon: {
    id: 'changwon', label: '창원진흥원 · 창업자금', sub: '창업지원금 합계',
    fund: 'invest', canWithdraw: false,
    balance: 3300000, pendingAmount: 500000,
    periodAmounts: { '이번달': 3300000, '3개월': 4800000, '6개월': 5000000, '1년': 5000000 },
    pendingItems: [
      { id: 'cw_h1', holdType: 'APPROVAL_PENDING', name: '마케팅 집행 승인 대기', amount: 500000, scheduledAt: '5.20' },
    ],
    txns: [
      { id: 'cw1', period: '이번달', tag: '대기', tagColor: '#D97706', tagBg: '#FFFBEB', name: '마케팅 집행 승인 대기', sub: '승인대기 · 5.18', amount: 500000, sign: -1, type: '대기', holdType: 'APPROVAL_PENDING', scheduledAt: '5.20' },
      { id: 'cw2', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '인턴 인건비 지급', sub: '카드 결제 · 4.25', amount: 800000, sign: -1, type: '사용' },
      { id: 'cw3', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '사무용품 구매', sub: '카드 결제 · 4.10', amount: 320000, sign: -1, type: '사용' },
      { id: 'cw4', period: '6개월', tag: '입금', tagColor: '#0369A1', tagBg: '#E0F2FE', name: '창원진흥원 창업자금 지급', sub: '창원진흥원 · 2.01', amount: 5000000, sign: 1, type: '입금' },
    ],
  },
  // 기업→개인 대여금 tracker (박민준에게 빌려준 돈)
  lend_minjun_biz: {
    id: 'lend_minjun_biz', label: '박민준 · 대여금', sub: '대여금 추적 합계',
    fund: 'lend', canWithdraw: false,
    balance: 15000000, pendingAmount: 0,
    periodAmounts: { '이번달': 15000000, '3개월': 15000000, '6개월': 28000000, '1년': 30000000 },
    pendingItems: [],
    txns: [
      { id: 'mb1', period: '이번달', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '박민준 · 2차 상환', sub: '차용증 기반 · 5.10', amount: 5000000, sign: -1, type: '사용' },
      { id: 'mb2', period: '3개월', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '박민준 · 1차 상환', sub: '차용증 기반 · 4.10', amount: 10000000, sign: -1, type: '사용' },
      { id: 'mb3', period: '6개월', tag: '입금', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '박민준 · 대여금 집행', sub: '차용증 · 2.01', amount: 30000000, sign: 1, type: '입금' },
    ],
  },
  // 기업→사업자 투자 tracker (㈜스타트업A 시리즈A)
  invest_startup: {
    id: 'invest_startup', label: '㈜스타트업A · 투자금', sub: '투자 현황 합계',
    fund: 'invest-biz', canWithdraw: false,
    balance: 20000000, pendingAmount: 0,
    periodAmounts: { '이번달': 20000000, '3개월': 50000000, '6개월': 60000000, '1년': 60000000 },
    pendingItems: [],
    txns: [
      { id: 'is1', period: '3개월', tag: '사용', tagColor: '#8B5CF6', tagBg: '#EDE9FE', name: '3차 투자금 집행', sub: '시리즈A · 5.10', amount: 10000000, sign: -1, type: '사용' },
      { id: 'is2', period: '3개월', tag: '사용', tagColor: '#8B5CF6', tagBg: '#EDE9FE', name: '2차 투자금 집행', sub: '시리즈A · 4.20', amount: 20000000, sign: -1, type: '사용' },
      { id: 'is3', period: '6개월', tag: '사용', tagColor: '#8B5CF6', tagBg: '#EDE9FE', name: '1차 투자금 집행', sub: '시리즈A · 3.15', amount: 30000000, sign: -1, type: '사용' },
      { id: 'is4', period: '6개월', tag: '입금', tagColor: '#8B5CF6', tagBg: '#EDE9FE', name: '㈜스타트업A 투자 계약', sub: '계약 체결 · 3.01', amount: 60000000, sign: 1, type: '입금' },
    ],
  },
  // ── 완료된 지갑 (개인) ───────────────────────────────────────────────────────
  // completed: true 설정 시 헤더에 '완료' 뱃지, balance: 0 고정
  // CompletedWallets 화면의 "완료된 지갑" 목록에서 탭하면 이 상세 화면으로 연결
  c_living1: {
    id: 'c_living1', label: '엄마 · 4월 생활비', sub: '생활비 지갑 합계',
    fund: 'living', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 300000, '6개월': 300000, '1년': 300000 },
    pendingItems: [],
    txns: [
      { id: 'cl1t1', period: '3개월', tag: '입금', tagColor: '#0E7490', tagBg: '#E0F7FA', name: '생활비 입금', sub: '엄마 · 4.15', amount: 300000, sign: 1, type: '입금' },
      { id: 'cl1t2', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '마트 식료품', sub: '카드 결제 · 4.18', amount: 180000, sign: -1, type: '사용' },
      { id: 'cl1t3', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '약국', sub: '카드 결제 · 4.25', amount: 120000, sign: -1, type: '사용' },
    ],
  },
  c_iho: {
    id: 'c_iho', label: '이호준 · 상환 완료', sub: '대여금 합계',
    fund: 'lend', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 1000000, '6개월': 1000000, '1년': 1000000 },
    pendingItems: [],
    txns: [
      { id: 'ci1', period: '3개월', tag: '입금', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이호준 · 대여 집행', sub: '차용증 · 2.10', amount: 1000000, sign: 1, type: '입금' },
      { id: 'ci2', period: '3개월', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이호준 · 전액 상환', sub: '상환 완료 · 2.15', amount: 1000000, sign: -1, type: '사용' },
    ],
  },
  // ── 완료된 지갑 (기업) ───────────────────────────────────────────────────────
  bc1: {
    id: 'bc1', label: '서울시 · 스타트업 지원금', sub: '창업지원금 합계',
    fund: 'invest', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 2000000, '6개월': 2000000, '1년': 2000000 },
    pendingItems: [],
    txns: [
      { id: 'bc1t1', period: '3개월', tag: '입금', tagColor: '#0369A1', tagBg: '#E0F2FE', name: '서울시 스타트업 지원금', sub: '서울시 · 1.15', amount: 2000000, sign: 1, type: '입금' },
      { id: 'bc1t2', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '홍보물 제작', sub: '카드 결제 · 2.01', amount: 1200000, sign: -1, type: '사용' },
      { id: 'bc1t3', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '소모품 구매', sub: '카드 결제 · 3.10', amount: 800000, sign: -1, type: '사용' },
    ],
  },
  bc2: {
    id: 'bc2', label: '이영희 · 자금지원 완료', sub: '자금지원 합계',
    fund: 'lend', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 1000000, '6개월': 1000000, '1년': 1000000 },
    pendingItems: [],
    txns: [
      { id: 'bc2t1', period: '3개월', tag: '입금', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이영희 · 자금지원 집행', sub: '창업 초기 자금 · 2.20', amount: 1000000, sign: 1, type: '입금' },
      { id: 'bc2t2', period: '3개월', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '이영희 · 전액 집행 완료', sub: '집행 완료 · 4.15', amount: 1000000, sign: -1, type: '사용' },
    ],
  },
  bc3: {
    id: 'bc3', label: '정창업 · 대여금 상환', sub: '대여금 합계',
    fund: 'lend', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 5000000, '6개월': 5000000, '1년': 5000000 },
    pendingItems: [],
    txns: [
      { id: 'bc3t1', period: '3개월', tag: '입금', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '정창업 · 대여금 집행', sub: '차용증 · 2.01', amount: 5000000, sign: 1, type: '입금' },
      { id: 'bc3t2', period: '3개월', tag: '사용', tagColor: '#6366F1', tagBg: '#EEF2FF', name: '정창업 · 전액 상환', sub: '상환 완료 · 5.01', amount: 5000000, sign: -1, type: '사용' },
    ],
  },
  c1: {
    id: 'c1', label: '서울시 · 4월 교육비', sub: '교육비 지원 합계',
    fund: 'invest', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 300000, '6개월': 300000, '1년': 300000 },
    pendingItems: [],
    txns: [
      { id: 'c1t1', period: '3개월', tag: '입금', tagColor: '#0369A1', tagBg: '#E0F2FE', name: '서울시 교육바우처 지급', sub: '서울시 · 4.01', amount: 300000, sign:  1, type: '입금' },
      { id: 'c1t2', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '강남 수학학원 4월',    sub: '카드 결제 · 4.10', amount: 180000, sign: -1, type: '사용' },
      { id: 'c1t3', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '영어학원 4월',       sub: '카드 결제 · 4.20', amount: 120000, sign: -1, type: '사용' },
    ],
  },
  c2: {
    id: 'c2', label: '강남구 · 문화바우처', sub: '문화바우처 합계',
    fund: 'invest', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 120000, '6개월': 120000, '1년': 120000 },
    pendingItems: [],
    txns: [
      { id: 'c2t1', period: '3개월', tag: '입금', tagColor: '#0369A1', tagBg: '#E0F2FE', name: '강남구 문화바우처 지급', sub: '강남구 · 3.01', amount: 120000, sign:  1, type: '입금' },
      { id: 'c2t2', period: '3개월', tag: '사용', tagColor: '#DC2626', tagBg: '#FEE2E2', name: '도서 구매',           sub: '교보문고 · 3.15', amount: 120000, sign: -1, type: '사용' },
    ],
  },
  c3: {
    id: 'c3', label: '박민준 · 상환 완료', sub: '대여금 합계',
    fund: 'lend', canWithdraw: false, completed: true,
    balance: 0, pendingAmount: 0,
    periodAmounts: { '이번달': 0, '3개월': 1000000, '6개월': 1000000, '1년': 1000000 },
    pendingItems: [],
    txns: [
      { id: 'c3t1', period: '3개월', tag: '입금', tagColor: '#4F46E5', tagBg: '#EEF2FF', name: '박민준 · 대여 집행',  sub: '차용증 · 2.01', amount: 1000000, sign:  1, type: '입금' },
      { id: 'c3t2', period: '3개월', tag: '사용', tagColor: '#4F46E5', tagBg: '#EEF2FF', name: '박민준 · 전액 상환', sub: '상환 완료 · 2.15', amount: 1000000, sign: -1, type: '사용' },
    ],
  },
}

const PERIODS = ['이번달', '3개월', '6개월', '1년']
const PERIOD_RANGE = {
  '이번달': ['이번달'],
  '3개월':  ['이번달', '3개월'],
  '6개월':  ['이번달', '3개월', '6개월'],
  '1년':    ['이번달', '3개월', '6개월', '1년'],
}

export default function WalletDetail() {
  const navigate = useNavigate()
  const { id = 'my' } = useParams()
  const theme = getAccountTheme()
  const wallet = WALLET_DATA[id] || WALLET_DATA.my

  // 지갑 타입 판별
  const isMy     = wallet.canWithdraw === true   // MY 지갑 여부 (출금 탭 노출)
  const isLiving = wallet.fund === 'living'       // 생활비 지갑 여부 (별도 UI 분기)

  // MY 지갑만 '출금' 탭 추가
  const TABS = isMy
    ? ['전체', '사용', '입금', '출금', '대기']
    : ['전체', '사용', '입금', '대기']

  // 상태
  const [period, setPeriod]               = useState('이번달')   // 일반 지갑 기간 필터
  const [activeTab, setActiveTab]         = useState('전체')      // 거래 타입 필터
  const [showHoldSheet, setShowHoldSheet] = useState(false)       // 보류 금액 바텀시트
  const [selectedMonth, setSelectedMonth] = useState(0)
  // selectedMonth: 0 ~ monthlyDeposits.length-1 = 해당 월
  //                monthlyDeposits.length        = preHistory(이전 내역) 탭

  // 스크롤 감지 — hero 섹션이 뷰에서 사라지면 sticky nav에 탭 노출
  const [compact, setCompact] = useState(false)
  const scrollRef = useRef(null)
  const heroRef   = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      const hero = heroRef.current
      if (!hero) return
      setCompact(el.scrollTop >= hero.offsetHeight)
    }
    el.addEventListener('scroll', check, { passive: true })
    return () => el.removeEventListener('scroll', check)
  }, [])

  const accentColor     = FUND_COLOR[wallet.fund] || C.navy
  // 생활비 지갑은 기간과 무관하게 현재 총잔액 고정 표시
  const headerAmount    = isLiving ? wallet.balance : (wallet.periodAmounts?.[period] || 0)
  const availableAmount = wallet.balance - wallet.pendingAmount  // 실제 사용 가능 금액
  const hasPending      = wallet.pendingAmount > 0

  // ── 생활비 월별 계산 (isRecurring: true 일 때만 사용) ──────────────────────
  // livMD     : 현재 선택된 월의 monthlyDeposit 객체 (preHistory 탭 선택 시 null)
  // livAvail  : 해당 월 총 사용 가능액 (amount + carriedOver)
  // livSpent  : 해당 월 지출 합계
  // livLeft   : 진행 중 달이면 (livAvail - livSpent), 완료 달이면 carryForward
  // livIsCurrent : carryForward === null 인 달 = 현재 진행 중
  const livMD        = isLiving && wallet.monthlyDeposits ? wallet.monthlyDeposits[selectedMonth] : null
  const livAvail     = livMD ? livMD.amount + (livMD.carriedOver || 0) : 0
  const livSpent     = livMD ? livMD.txns.reduce((s, t) => s + t.amount, 0) : 0
  const livLeft      = livMD ? (livMD.carryForward !== null ? livMD.carryForward : livAvail - livSpent) : 0
  const livIsCurrent = livMD ? livMD.carryForward === null : false

  // ── 일반 지갑 거래 필터 (생활비가 아닐 때만 사용) ──────────────────────────
  const periodRanges = PERIOD_RANGE[period]
  const periodTxns   = (!isLiving && wallet.txns) ? wallet.txns.filter(t => periodRanges.includes(t.period)) : []
  const displayTxns  = activeTab === '전체'
    ? periodTxns
    : periodTxns.filter(t => t.type === activeTab)

  return (
    <PhoneShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Sticky Nav ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: theme.headerSolid, paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span style={{ fontSize: '16px', fontWeight: 700, color: C.white, letterSpacing: '-0.5px', flex: 1, marginLeft: '8px' }}>{wallet.label}</span>
              {wallet.completed && (
                <div style={{
                  fontSize: '10px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px', padding: '2px 8px',
                  marginRight: '4px', letterSpacing: '0.3px',
                }}>완료</div>
              )}
            </div>

            {/* ── Compact 탭 — hero 접혔을 때 슬라이드인 ── */}
            <div style={{
              overflow: 'hidden',
              maxHeight: compact ? '44px' : '0',
              opacity: compact ? 1 : 0,
              transition: 'max-height 0.22s ease, opacity 0.18s ease',
            }}>
              {/* 일반 지갑: 기간 칩 */}
              {!isLiving && (
                <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px' }}>
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      flex: 1, padding: '6px 0', borderRadius: '20px',
                      background: period === p ? 'rgba(255,255,255,0.22)' : 'transparent',
                      border: period === p ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid rgba(255,255,255,0.2)',
                      color: period === p ? C.white : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', fontWeight: period === p ? 700 : 400,
                      cursor: 'pointer', letterSpacing: '-0.2px',
                    }}>{p}</button>
                  ))}
                </div>
              )}
              {/* 생활비 지갑: 월별 탭 */}
              {isLiving && wallet.isRecurring && (
                <div style={{
                  display: 'flex', gap: '6px',
                  padding: '0 16px 10px',
                  overflowX: 'auto', scrollbarWidth: 'none',
                }}>
                  {wallet.monthlyDeposits?.map((m, i) => (
                    <button key={m.month} onClick={() => setSelectedMonth(i)} style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: '20px',
                      background: selectedMonth === i ? 'rgba(255,255,255,0.22)' : 'transparent',
                      border: selectedMonth === i ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid rgba(255,255,255,0.2)',
                      color: selectedMonth === i ? C.white : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', fontWeight: selectedMonth === i ? 700 : 400,
                      cursor: 'pointer',
                    }}>{m.label}</button>
                  ))}
                  {wallet.preHistory && (
                    <button onClick={() => setSelectedMonth(wallet.monthlyDeposits.length)} style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: '20px',
                      background: selectedMonth === wallet.monthlyDeposits?.length ? 'rgba(255,255,255,0.22)' : 'transparent',
                      border: selectedMonth === wallet.monthlyDeposits?.length ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid rgba(255,255,255,0.2)',
                      color: selectedMonth === wallet.monthlyDeposits?.length ? C.white : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', fontWeight: selectedMonth === wallet.monthlyDeposits?.length ? 700 : 400,
                      cursor: 'pointer',
                    }}>이전 내역</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Hero (scrolls away) ── */}
          <div ref={heroRef} style={{ background: theme.headerSolid, padding: '0 20px 20px' }}>

            {/* 기간 서브라벨 */}
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {isLiving ? '현재 잔액' : `${period} ${wallet.sub}`}
            </div>

            {/* 기간별 금액 — 실시간 변경 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: hasPending ? '10px' : '18px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: C.white, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {headerAmount.toLocaleString()}
              </span>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>원</span>
            </div>

            {/* 대기 금액 배너 (있을 때만) */}
            {hasPending && (
              <button
                onClick={() => setShowHoldSheet(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(217,119,6,0.18)', border: '1px solid rgba(217,119,6,0.4)',
                  borderRadius: '8px', padding: '7px 12px', marginBottom: '16px',
                  cursor: 'pointer', width: '100%',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="#D97706" strokeWidth="1.3"/>
                  <path d="M6.5 4v3l1.5 1.5" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '12px', color: '#FCD34D', fontWeight: 600, flex: 1, textAlign: 'left', letterSpacing: '-0.2px' }}>
                  대기 {wallet.pendingAmount.toLocaleString()}원 · {wallet.pendingItems.length}건 · 사용가능 {availableAmount.toLocaleString()}원
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#FCD34D" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Period chips / Living recurring info / Living one-time */}
            {isLiving && wallet.isRecurring ? (
              /* ── 정기 생활비: 자동 입금 안내 칩 ── */
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  fontSize: '11px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '20px', padding: '5px 11px',
                }}>
                  매월 {wallet.recurringDay}일 · {(wallet.recurringAmount / 10000).toFixed(0)}만원 자동 입금
                </div>
                <div style={{
                  fontSize: '11px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.55)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '20px', padding: '5px 11px',
                }}>
                  다음 입금 6.15 · D-32
                </div>
              </div>
            ) : isLiving ? (
              /* ── 일회성 생활비: 일회성 뱃지 + 기간 칩 ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '20px', padding: '4px 11px',
                  }}>
                    일회성 입금
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                    받은 금액에서 자유롭게 사용
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '7px' }}>
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      flex: 1, padding: '7px 0', borderRadius: '20px',
                      background: period === p ? 'rgba(255,255,255,0.22)' : 'transparent',
                      border: period === p ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid rgba(255,255,255,0.2)',
                      color: period === p ? C.white : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', fontWeight: period === p ? 700 : 400,
                      cursor: 'pointer', letterSpacing: '-0.2px',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── 일반 지갑: 기간 칩 ── */
              <div style={{ display: 'flex', gap: '7px' }}>
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    flex: 1, padding: '7px 0', borderRadius: '20px',
                    background: period === p ? 'rgba(255,255,255,0.22)' : 'transparent',
                    border: period === p ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid rgba(255,255,255,0.2)',
                    color: period === p ? C.white : 'rgba(255,255,255,0.5)',
                    fontSize: '12px', fontWeight: period === p ? 700 : 400,
                    cursor: 'pointer', letterSpacing: '-0.2px',
                  }}>{p}</button>
                ))}
              </div>
            )}
          </div>{/* Hero end */}

          {/* ── Body ── */}
          <div style={{ background: C.bg }}>

          {isLiving && wallet.isRecurring && wallet.preHistory && selectedMonth === wallet.monthlyDeposits?.length ? (
            /* ── 이전 내역 뷰 (일회성 → 자동지급 전환 전 기록) ── */
            (() => {
              const ph = wallet.preHistory
              const phSpent = ph.txns.reduce((s, t) => s + t.amount, 0)
              return (
                <>
                  {/* 요약 카드 */}
                  <div style={{ padding: '14px 16px 0' }}>
                    <div style={{
                      background: '#64748B10', border: '1px solid #64748B28',
                      borderRadius: '12px', padding: '14px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: C.slate, fontWeight: 700, marginBottom: '4px' }}>
                          일회성 입금 {ph.depositAmount.toLocaleString()}원 · {ph.periodLabel}
                        </div>
                        <div style={{ fontSize: '11px', color: C.slateL }}>
                          사용 {phSpent.toLocaleString()}원 · 자동지급 전환 시 이월
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: C.slateL, marginBottom: '2px' }}>이월된 잔액</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: C.slate, letterSpacing: '-0.8px' }}>
                          {ph.carryForward.toLocaleString()}
                          <span style={{ fontSize: '13px', fontWeight: 500, color: C.slateL, marginLeft: '3px' }}>원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 거래 목록 */}
                  <div style={{ padding: '12px 16px 0' }}>
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                      {/* 일회성 입금 행 */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '13px 16px', borderBottom: `1px solid ${C.bg}`,
                        background: `${accentColor}07`,
                      }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${accentColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: accentColor }}>입금</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '2px' }}>{ph.depositName}</div>
                          <div style={{ fontSize: '11px', color: C.slateL }}>{wallet.senderName} · {ph.depositDate} · 일회성</div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: accentColor }}>
                          +{ph.depositAmount.toLocaleString()}
                        </div>
                      </div>

                      {/* 사용 내역 */}
                      {ph.txns.map((t, i) => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '13px 16px',
                          borderBottom: `1px solid ${C.bg}`,
                        }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: t.tagBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: t.tagColor }}>{t.tag}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '2px' }}>{t.name}</div>
                            <div style={{ fontSize: '11px', color: C.slateL }}>{t.sub}</div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy }}>-{t.amount.toLocaleString()}</div>
                        </div>
                      ))}

                      {/* 자동지급 이월 행 */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '11px 16px',
                        background: C.bg, borderTop: `1px solid ${C.border}`,
                      }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7h9M8.5 4l3 3-3 3" stroke={C.slateL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: C.slateL, marginBottom: '1px' }}>{ph.carryForwardLabel}</div>
                          <div style={{ fontSize: '11px', color: C.slateL }}>7월 자동지급 시작 · 잔액 합산</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.slateL }}>
                          → {ph.carryForward.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 자동지급 전환 안내 배너 */}
                  <div style={{ padding: '10px 16px 40px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: `${accentColor}0C`, border: `1px solid ${accentColor}28`,
                      borderRadius: '10px', padding: '12px 14px',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M7.5 1.5A6 6 0 1 1 1.5 7.5" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M1.5 3.5v4h4" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: '11px', color: accentColor, fontWeight: 600, letterSpacing: '-0.2px' }}>
                        {wallet.recurringStartLabel} · 이후 내역은 월별 탭에서 확인하세요
                      </span>
                    </div>
                  </div>
                </>
              )
            })()
          ) : isLiving && wallet.isRecurring && livMD ? (
            <>
              {/* ── 월별 탭 (가로 스크롤) ── */}
              <div style={{
                background: C.white, borderBottom: `1px solid ${C.border}`,
                padding: '10px 16px', display: 'flex', gap: '7px',
                overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none',
              }}>
                {wallet.monthlyDeposits.map((m, i) => (
                  <button key={m.month} onClick={() => setSelectedMonth(i)} style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 14px', borderRadius: '20px',
                    background: selectedMonth === i ? accentColor : C.bg,
                    border: `1.5px solid ${selectedMonth === i ? accentColor : C.border}`,
                    color: selectedMonth === i ? C.white : C.slate,
                    fontSize: '13px', fontWeight: selectedMonth === i ? 700 : 500,
                    cursor: 'pointer', letterSpacing: '-0.2px',
                  }}>
                    {m.label}
                    {i === 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: selectedMonth === 0 ? 'rgba(255,255,255,0.75)' : accentColor,
                        background: selectedMonth === 0 ? 'rgba(255,255,255,0.2)' : `${accentColor}20`,
                        borderRadius: '4px', padding: '1px 4px',
                      }}>진행중</span>
                    )}
                  </button>
                ))}
                {/* 자동지급 전환 전 이전 내역 탭 */}
                {wallet.preHistory && (() => {
                  const isPreSel = selectedMonth === wallet.monthlyDeposits.length
                  return (
                    <button
                      onClick={() => setSelectedMonth(wallet.monthlyDeposits.length)}
                      style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '6px 14px', borderRadius: '20px',
                        background: isPreSel ? C.slate : C.bg,
                        border: `1.5px solid ${isPreSel ? C.slate : C.border}`,
                        color: isPreSel ? C.white : C.slateL,
                        fontSize: '13px', fontWeight: isPreSel ? 700 : 400,
                        cursor: 'pointer', letterSpacing: '-0.2px',
                      }}
                    >
                      이전 내역
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: isPreSel ? 'rgba(255,255,255,0.65)' : C.slateL,
                        background: isPreSel ? 'rgba(255,255,255,0.15)' : C.border,
                        borderRadius: '4px', padding: '1px 4px',
                      }}>일회성</span>
                    </button>
                  )
                })()}
              </div>

              {/* ── 월별 요약 카드 ── */}
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{
                  background: `${accentColor}10`, border: `1px solid ${accentColor}28`,
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: accentColor, fontWeight: 700, marginBottom: '4px' }}>
                      {livMD.label} 생활비 입금 {livMD.amount.toLocaleString()}원
                      {livMD.carriedOver > 0 && (
                        <span style={{ color: C.green }}> + 이월 {livMD.carriedOver.toLocaleString()}원</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: C.slateL }}>
                      사용 {livSpent.toLocaleString()}원 · 사용 가능 {livAvail.toLocaleString()}원
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: C.slateL, marginBottom: '2px' }}>
                      {livIsCurrent ? '현재 잔액' : (livLeft > 0 ? '이월된 잔액' : '전액 사용')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: accentColor, letterSpacing: '-0.8px' }}>
                      {livLeft.toLocaleString()}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: C.slateL, marginLeft: '3px' }}>원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 월별 거래 목록 ── */}
              <div style={{ padding: '12px 16px 40px' }}>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>

                  {/* 전월 이월 잔액 (있을 때만) */}
                  {livMD.carriedOver > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '13px 16px', borderBottom: `1px solid ${C.bg}`,
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>이월</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '2px' }}>전월 이월 잔액</div>
                        <div style={{ fontSize: '11px', color: C.slateL }}>
                          {wallet.monthlyDeposits[selectedMonth + 1]?.label || '전월'} 미사용 잔액 이월
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: C.green }}>
                        +{livMD.carriedOver.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* 입금 행 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px', borderBottom: `1px solid ${C.bg}`,
                    background: `${accentColor}07`,
                  }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${accentColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: accentColor }}>입금</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '2px' }}>
                        {livMD.label} 생활비 입금
                      </div>
                      <div style={{ fontSize: '11px', color: C.slateL }}>
                        {wallet.senderName} · {livMD.depositedAt} 자동 입금
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: accentColor }}>
                      +{livMD.amount.toLocaleString()}
                    </div>
                  </div>

                  {/* 사용 내역 */}
                  {livMD.txns.map((t, i) => {
                    const isLastTxn = i === livMD.txns.length - 1
                    const hasFooter = !livIsCurrent && livMD.carryForward >= 0
                    return (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '13px 16px',
                        borderBottom: (!isLastTxn || hasFooter) ? `1px solid ${C.bg}` : 'none',
                      }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: t.tagBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: t.tagColor }}>{t.tag}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: C.navy, marginBottom: '2px' }}>{t.name}</div>
                          <div style={{ fontSize: '11px', color: C.slateL }}>{t.sub}</div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy }}>
                          -{t.amount.toLocaleString()}
                        </div>
                      </div>
                    )
                  })}

                  {/* 다음달로 이월 (완료 월에 잔액이 있었을 때) */}
                  {!livIsCurrent && livMD.carryForward > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 16px',
                      background: C.bg, borderTop: `1px solid ${C.border}`,
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7h9M8.5 4l3 3-3 3" stroke={C.slateL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.slateL, marginBottom: '1px' }}>다음달로 이월</div>
                        <div style={{ fontSize: '11px', color: C.slateL }}>
                          {wallet.monthlyDeposits[selectedMonth - 1]?.label || '다음달'}로 이월됨
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.slateL }}>
                        → {livMD.carryForward.toLocaleString()}원
                      </div>
                    </div>
                  )}

                  {/* 전액 사용 (완료 월, 잔액 0) */}
                  {!livIsCurrent && livMD.carryForward === 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'center', padding: '10px 16px',
                      background: C.bg, borderTop: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: '11px', color: C.slateL }}>이달 생활비 전액 사용</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── 일반 지갑 Tabs ── */}
              <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '10px 16px' }}>
                <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      flex: 1, height: '32px', borderRadius: '8px',
                      background: activeTab === tab ? C.navy : 'transparent',
                      color: activeTab === tab ? C.white : C.slate,
                      border: 'none', fontSize: '12px',
                      fontWeight: activeTab === tab ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                      letterSpacing: '-0.2px',
                    }}>{tab}</button>
                  ))}
                </div>
              </div>

              {/* ── 일반 지갑 Transaction list ── */}
              <div style={{ padding: '16px 16px 40px' }}>
                {displayTxns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: C.slateL, fontSize: '13px' }}>
                    해당 거래 내역이 없습니다
                  </div>
                ) : (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                    {displayTxns.map((t, i) => {
                      const isPending = t.type === '대기'
                      return (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '13px 16px',
                          borderBottom: i < displayTxns.length - 1 ? `1px solid ${C.bg}` : 'none',
                          background: isPending ? C.amberBg : C.white,
                          borderLeft: isPending ? `3px solid ${C.amber}` : '3px solid transparent',
                        }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: t.tagBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isPending ? (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5.5" stroke={C.amber} strokeWidth="1.3"/>
                                <path d="M7 4.5V7l1.5 1.5" stroke={C.amber} strokeWidth="1.3" strokeLinecap="round"/>
                              </svg>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: t.tagColor }}>{t.tag}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: C.navy, letterSpacing: '-0.2px' }}>{t.name}</span>
                              {isPending && t.holdType && (
                                <span style={{
                                  fontSize: '9px', fontWeight: 700,
                                  color: HOLD_TYPE_COLOR[t.holdType]?.color || C.amber,
                                  background: HOLD_TYPE_COLOR[t.holdType]?.bg || C.amberBg,
                                  padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.2px',
                                }}>{HOLD_TYPE_LABEL[t.holdType] || '대기'}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: isPending ? C.amber : C.slateL }}>{t.sub}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: isPending ? C.amber : (t.sign > 0 ? C.green : C.navy), letterSpacing: '-0.5px' }}>
                              {t.sign > 0 ? '+' : '-'}{t.amount.toLocaleString()}
                            </div>
                            {isPending && t.scheduledAt && (
                              <div style={{ fontSize: '10px', color: C.amber, marginTop: '1px' }}>{t.scheduledAt} 예정</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>{/* scrollable wrapper */}

        {/* ── 대기 금액 Bottom Sheet ── */}
        {showHoldSheet && (
          <div
            onClick={() => setShowHoldSheet(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          >
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.white, borderRadius: '20px 20px 0 0', padding: '0 20px 36px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
                <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: C.border }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke={C.amber} strokeWidth="1.4"/>
                  <path d="M8 5v4l2 2" stroke={C.amber} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: '17px', fontWeight: 700, color: C.navy, letterSpacing: '-0.5px' }}>대기 금액</span>
              </div>
              <div style={{ fontSize: '12px', color: C.slateL, marginBottom: '20px', paddingLeft: '24px' }}>
                곧 지급될 예정인 금액 · 현재 사용 불가
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: C.amberBg, border: `1px solid ${C.amberBd}`,
                borderRadius: '12px', padding: '14px 18px', marginBottom: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.amber, fontWeight: 600, marginBottom: '3px' }}>총 대기 금액</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: C.navy, letterSpacing: '-0.8px' }}>
                    {wallet.pendingAmount.toLocaleString()}<span style={{ fontSize: '14px', fontWeight: 500, color: C.slate, marginLeft: '4px' }}>원</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: C.slateL, marginBottom: '3px' }}>사용 가능 잔액</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: C.slate }}>{availableAmount.toLocaleString()}원</div>
                </div>
              </div>
              {wallet.pendingItems.map((item, i) => {
                const hc = HOLD_TYPE_COLOR[item.holdType] || { color: C.amber, bg: C.amberBg }
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px', background: C.bg, borderRadius: '10px',
                    marginBottom: i < wallet.pendingItems.length - 1 ? '8px' : '0',
                  }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: hc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke={hc.color} strokeWidth="1.3"/>
                        <path d="M7 4.5V7l1.5 1.5" stroke={hc.color} strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.navy }}>{item.name}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: hc.color, background: hc.bg, padding: '1px 5px', borderRadius: '4px' }}>
                          {HOLD_TYPE_LABEL[item.holdType] || '대기'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: C.slateL }}>{item.scheduledAt} 예정</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: C.amber }}>
                      -{item.amount.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
