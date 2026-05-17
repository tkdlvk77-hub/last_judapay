import { useState, useMemo } from 'react'
import { useUser } from '../contexts/UserContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { getAccountTheme } from '../design/accountTokens'
import { pushApprovalMsg } from './approvalMessageBus'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { dialog } from '../components/Dialog'

// ─── 유형 메타 ────────────────────────────────────────────
const TYPE_META = {
  execute:      { label: '자금 집행',   color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  card:         { label: '카드 결제',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  mcc:          { label: 'MCC 허용',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  claim:        { label: '소명 응답',   color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
  review:       { label: '검수 대기',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  wallet:       { label: '지갑 변경',   color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
  evidence:     { label: '증빙 요청',   color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  evidenceIn:   { label: '내역증빙요청', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  dataRequest:  { label: '자료요청',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  refund:       { label: '상환요청',    color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
}

// 처리기한 기준 긴급 여부 — deadline이 오늘 기준 3일 이내면 긴급
function isUrgent(item) {
  if (!item.deadline || item.status === 'done') return false
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(item.deadline.replace(/\./g, '-')); d.setHours(0,0,0,0)
  const diffDays = Math.floor((d - today) / 86400000)
  return diffDays <= 3
}

// type → 상위 카테고리 (카드 좌측 상단 첫 번째 배지)
const CATEGORY_META = {
  execute:     { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  card:        { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  mcc:         { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  wallet:      { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  evidence:    { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  evidenceIn:  { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  dataRequest: { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  refund:      { label: '승인필요',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  review:      { label: '검수확인',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  claim:       { label: '사용내역확인', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
}

// item → 현재 처리 상태 배지 (카테고리 바로 우측)
function getStatusBadge(item) {
  if (item.status === 'done') {
    if (item.doneType === 'rejected') return { label: '반려',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
    return                                   { label: '승인완료', color: '#047857', bg: '#F0FDF4', border: '#BBF7D0' }
  }
  if (item.status === 'inprogress') {
    return { label: '진행중', color: '#C8821A', bg: '#FFFBEB', border: '#FDE68A' }
  }
  // pending
  if (item.type === 'review') return { label: '검수대기', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' }
  return { label: '승인대기', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' }
}

const RISK_META = {
  high: { label: '위험', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  mid:  { label: '주의', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  low:  { label: '안전', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
}

const DONE_META = {
  approved: { label: '승인 완료', color: '#047857', bg: '#F0FDF4', border: '#BBF7D0', icon: '✓' },
  rejected: { label: '반려',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '✕' },
  requested:{ label: '추가 요청', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '↑' },
}

const TYPE_FILTER_TYPES = {
  approval: ['execute', 'card', 'mcc', 'wallet'],
  claim:    ['claim'],
  evidence: ['evidence'],
}

// ─── 카테고리 체계 (대카테고리 → 중카테고리) ──────────────
const CATEGORY_MAP = {
  // 인건비
  '급여':           { main:'인건비', icon:'💰', color:'#0369A1', bg:'#F0F9FF', border:'#BAE6FD' },
  '외주비':         { main:'인건비', icon:'💼', color:'#0369A1', bg:'#F0F9FF', border:'#BAE6FD' },
  '외주비 (프리랜서/외주)': { main:'인건비', icon:'💼', color:'#0369A1', bg:'#F0F9FF', border:'#BAE6FD' },
  '4대보험':        { main:'인건비', icon:'🛡️', color:'#0369A1', bg:'#F0F9FF', border:'#BAE6FD' },
  '상여금':         { main:'인건비', icon:'🎁', color:'#0369A1', bg:'#F0F9FF', border:'#BAE6FD' },
  // 운영비
  '임대료':         { main:'운영비', icon:'🏢', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '임대료 (자동 지출)': { main:'운영비', icon:'🏢', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '임차료':         { main:'운영비', icon:'🔑', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '구독료':         { main:'운영비', icon:'💻', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '통신비':         { main:'운영비', icon:'📱', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '공과금':         { main:'운영비', icon:'⚡', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '보험료':         { main:'운영비', icon:'🏥', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '세금':           { main:'운영비', icon:'🧾', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  '기타 정기지출':  { main:'운영비', icon:'💡', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  // 마케팅
  '광고비':         { main:'마케팅', icon:'📣', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  '홍보비':         { main:'마케팅', icon:'📢', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  '콘텐츠 제작':    { main:'마케팅', icon:'🎬', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  // 경비
  '접대비':         { main:'경비', icon:'🍽️', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  '출장비':         { main:'경비', icon:'✈️', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  '교통비':         { main:'경비', icon:'🚌', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  '복리후생':       { main:'경비', icon:'☕', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  // 자산
  '비품':           { main:'자산', icon:'📦', color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
  '장비':           { main:'자산', icon:'🖥️', color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
  '차량':           { main:'자산', icon:'🚗', color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
  '부동산':         { main:'자산', icon:'🏠', color:'#059669', bg:'#F0FDF4', border:'#BBF7D0' },
}
function getCatMeta(category) {
  if (!category) return null
  return CATEGORY_MAP[category] || { main:'기타', icon:'📂', color:'#6B7280', bg:'#F4F5F7', border:'#E9EAEC' }
}

// ─────────────────────────────────────────────────────────
// 유형 가이드 (Judapay 시스템 기준)
//  execute  : 자금 집행 승인 — 급여/외주비/임대료/렌트리스/구독료/
//             통신비/공과금/보험료/기타정기지출/보너스/지원금 등
//             → 금액이 임계값 초과하거나 신규 수신 계좌일 때 승인 요청
//  card     : 법인카드 결제 승인 — 한도 초과 or 이상 MCC 결제
//  mcc      : 카드 MCC 업종 허용/차단 변경 요청
//  claim    : 법인카드 사용 소명 — 업무 연관성 소명 요청
//  review   : 결과물 검수 — 외주비/마케팅비/부동산(근저당 해지)만 해당
//  evidence : 영수증·서류 증빙 제출 요청
// ─────────────────────────────────────────────────────────
// 승인 권한 단계: 1=승인자(팀장급), 2=관리자(본부장급), 3=최고관리자/대표
// 실제 값은 컴포넌트 내부에서 currentUser.role로 동적 계산됨
const ROLE_TO_AUTHORITY = {
  master:     'super',  // 최고관리자: 모든 단계·모든 항목 승인 가능
  admin:      2,        // 관리자: 2차 승인
  accounting: 1,        // 재무담당자: 1차 승인
  manager:    1,        // 승인자: 1차 승인
  staff:      null,     // 일반구성원: 승인 권한 없음
  viewer:     null,     // 조회전용: 승인 권한 없음
}

const INIT_APPROVALS = [
  // ── 진행 중 / 승인 대기 (pending) ─────────────────────

  // [자금집행] 외주비 — 신규 수신 계좌라 위험도 높음
  {
    id:'a1', status:'pending', direction:'outgoing', type:'execute', approvalStage:2, has2ndStage:true, nextApprover:'이대표 (최고관리자)',
    requester:'박철수', requestedAt:'10분 전', deadline:'2026.05.14',
    title:'5월 웹개발 외주비 집행',
    desc:'외주비 지갑 → ㈜오로라 이체',
    amount:3500000,
    keyPoint:'이 지갑에서 ㈜오로라로 보내는 첫 이체 · 신규 수신 계좌 등록 7일 미경과',
    riskLevel:'high', canApprove:true, txId:'tx_a1',
    executionData:{
      recipientName:'㈜오로라',
      recipientAccount:'기업은행 041-123456-78-901',
      wallet:'외주비 지갑',
      category:'외주비 (프리랜서/외주)',
      taxInvoice:'세금계산서 수취 예정',
      scheduledDate:'2025.05.15 즉시',
      memo:'5월 쇼핑몰 리뉴얼 — 프론트엔드 개발',
      attachments:['외주계약서_오로라.pdf','견적서.pdf'],
    },
    history:[{ action:'집행 요청', actor:'박철수', time:'05.11 09:20', note:'계약서 첨부' }],
  },

  // [자금집행] 임대료 자동 지출 — 금액 크지만 정기 패턴
  {
    id:'a2', status:'pending', direction:'outgoing', type:'execute', approvalStage:1, has2ndStage:true, nextApprover:'김관리 (관리자)',
    requester:'자동 지출', requestedAt:'오늘 09:00',
    title:'5월 사무실 임대료 납부',
    desc:'운영비 지갑 → 한강부동산관리㈜',
    amount:4200000,
    keyPoint:'월 임계 금액(300만원) 초과 · 자동 지출 승인 필요',
    riskLevel:'low', canApprove:true, txId:'tx_a2',
    executionData:{
      recipientName:'한강부동산관리㈜',
      recipientAccount:'신한은행 140-013-234567',
      wallet:'운영비 지갑',
      category:'임대료 (자동 지출)',
      taxInvoice:'계산서 미발행 (면세)',
      scheduledDate:'2025.05.11 자동',
      memo:'강남구 테헤란로 사무실 5월분',
      attachments:['임대차_계약서.pdf'],
    },
    history:[{ action:'자동 지출 승인 요청', actor:'시스템', time:'05.11 09:00', note:'월 임계 금액 초과 감지' }],
  },

  // [자금집행] 보너스 지급 — 대상자 다수
  {
    id:'a3', status:'pending', direction:'outgoing', type:'execute', approvalStage:2,
    requester:'이유진', requestedAt:'2시간 전',
    title:'1분기 성과급 지급',
    desc:'급여 지갑 → 구성원 5명 계좌',
    amount:12500000,
    keyPoint:'1인당 250만원 · 5명 일괄 지급 · 급여 지갑 잔액 확인 필요',
    riskLevel:'mid', canApprove:true, txId:'tx_a3',
    executionData:{
      recipientName:'구성원 5명 (김철수·이영희·박지훈·최민아·정태현)',
      wallet:'급여 지갑',
      category:'보너스 (성과급)',
      payPeriod:'2025년 1분기',
      scheduledDate:'2025.05.15 예약',
      memo:'1분기 매출 목표 120% 달성 성과급',
      attachments:['성과급_지급_명세서.xlsx'],
    },
    history:[{ action:'집행 요청', actor:'이유진', time:'05.11 08:30', note:'성과급 명세서 첨부' }],
  },

  // [카드결제] 법인카드 한도 초과 결제
  {
    id:'a4', status:'pending', direction:'outgoing', type:'card', approvalStage:1,
    requester:'이민형', requestedAt:'1시간 전', deadline:'2026.05.15',
    title:'법인카드 호텔 결제 한도 초과',
    desc:'운영비 카드 · MCC 7011(숙박업) · 건당 한도 초과',
    amount:480000,
    keyPoint:'건당 결제 한도(30만원) 초과 · 숙박업 첫 결제 · 평균 대비 4배 금액',
    riskLevel:'mid', canApprove:true, txId:'tx_a4',
    executionData:{
      merchant:'그랜드 인터컨티넨탈 서울 파르나스',
      mccCode:'7011',
      mccLabel:'숙박업',
      card:'운영비 카드 (KB국민 ****1234)',
      wallet:'운영비 지갑',
      receiptStatus:'영수증 미첨부',
      memo:'해외 투자사 대표 방문 숙박비',
      attachments:[],
    },
    history:[{ action:'한도 초과 결제 승인 요청', actor:'시스템', time:'05.11 10:40', note:'이민형 요청' }],
  },

  // [MCC 허용] 게임업종 — 권한 없음
  {
    id:'a5', status:'pending', direction:'outgoing', type:'mcc', approvalStage:3,
    requester:'김지수', requestedAt:'2시간 전', deadline:'2026.05.15',
    title:'게임/오락(7993) 업종 임시 허용 요청',
    desc:'법인카드 · 차단 업종 해제 요청',
    amount:null,
    keyPoint:'동일 업종 반복 요청 3회 · 기존 차단 정책 위반 이력',
    riskLevel:'high', canApprove:false,
    noAuthReason:'상위 관리자 승인 필요',
    txId:'tx_a5',
    executionData:{
      mccCode:'7993',
      mccLabel:'비디오 게임 / 오락실',
      card:'법인카드 (신한 ****5678)',
      requestType:'임시 허용 (30일)',
      currentStatus:'차단',
      reason:'게임 앱 QA 테스트 — 실제 결제 환경 필요',
      previousRequests:'3회 (전부 반려)',
      attachments:['업무확인서.pdf'],
    },
    history:[{ action:'MCC 허용 요청', actor:'김지수', time:'05.11 09:55', note:'업무 필요성 확인서 첨부' }],
  },

  // [검수] 외주 개발 결과물 검수 — 중도금 단계 검수 대기
  {
    id:'a6', status:'pending', direction:'incoming', type:'review',
    requester:'박철수', requestedAt:'30분 전', deadline:'2026.05.13',
    title:'앱 기능 개발 외주 결과물 검수',
    desc:'㈜테크솔루션 · 결제 모듈 개발 1차 완료 보고',
    amount:1120000,
    keyPoint:'납기 D+2 지연 납품 · 알림 모듈 미구현 항목 존재 · 중도금 검수 후 자동 입금',
    riskLevel:'high', canApprove:true, txId:'tx_a6',
    executionData:{
      vendor:'㈜테크솔루션',
      subject:'결제 모듈 개발',
      contractPeriod:'2026.04.01 ~ 2026.06.30',
      contractAmount:2800000,
      stages:[
        { label:'선금', pct:30, amount:840000, status:'paid',
          paidAt:'04.01 16:09', note:'계약 서명 완료 · 본인 계좌로 자동 입금됨' },
        { label:'중도금', pct:40, amount:1120000, status:'review',
          dueDate:'2026.05.31', note:'1차 기능 개발 완료 보고 · 검수 승인 후 자동 입금 예정' },
        { label:'잔금', pct:30, amount:840000, status:'pending',
          dueDate:'2026.06.30', note:'최종 작업물 컨펌 시 자동 입금' },
      ],
      currentStageIdx:1,
      resultFiles:['결과물_GitHub_링크.txt','기능_명세서_비교표.pdf','납품확인서.pdf'],
      note:'알림 모듈 미구현 — 계약 범위 내 추가 수정 요청 필요 여부 판단 필요',
    },
    history:[
      { action:'계약서 발송', actor:'시스템', time:'04.01 16:00', note:'계약서 서명 완료' },
      { action:'선금 1,500,000원 자동 입금', actor:'시스템', time:'04.01 16:09', note:'선금 30% 자동 집행' },
      { action:'1차 작업물 제출', actor:'박철수', time:'05.11 10:55', note:'GitHub 링크 · 명세서 첨부 — 검수 요청' },
    ],
  },

  // [검수] 부동산 근저당 해지 서류 검수 (단계 없는 문서 검수)
  {
    id:'a7', status:'pending', direction:'incoming', type:'review',
    requester:'이유진', requestedAt:'1시간 전',
    title:'사무실 근저당 해지 완료 서류 검수',
    desc:'부동산 실행 완료 · 해지 서류 3건 첨부',
    amount:null,
    keyPoint:'말소등기 접수 번호 · 채권자 확인서 · 등기부등본 3건 일치 여부 확인 필요',
    riskLevel:'mid', canApprove:true, txId:'tx_a7',
    executionData:{
      vendor:'한강부동산관리㈜',
      subject:'사무실 근저당 해지 서류 검수',
      contractPeriod:null,
      contractAmount:null,
      stages:null,
      resultFiles:['근저당_해지확인서.pdf','말소등기_접수증.pdf','등기부등본_최신.pdf'],
      note:'근저당 설정 금액 5억원 해지 완료 — 말소 등기 접수 확인 후 최종 승인',
    },
    history:[
      { action:'근저당 해지 실행', actor:'이유진', time:'05.11 09:00', note:'등기 신청 완료' },
      { action:'서류 검수 요청', actor:'이유진', time:'05.11 10:00', note:'해지 서류 3건 첨부' },
    ],
  },

  // [소명] 법인카드 마트 결제 소명
  {
    id:'a8', status:'pending', direction:'outgoing', type:'claim',
    requester:'홍길동', requestedAt:'3시간 전',
    title:'법인카드 마트 결제 업무 소명',
    desc:'이마트 결제 · MCC 5411(식료품) · 업무 연관성 확인',
    amount:87000,
    keyPoint:'식료품 마트 결제 · 업무 연관 물품 여부 확인 필요 · 영수증 품목 확인 요망',
    riskLevel:'mid', canApprove:true, txId:'tx_a8',
    executionData:{
      expenseType:'법인카드 사용 소명',
      date:'2025.05.09 (금) 19:22',
      items:[
        { name:'식료품/음료 (영수증 참조)', amount:87000 },
      ],
      paymentMethod:'법인카드 (KB국민 ****1234)',
      memo:'팀 회식 전 간식 구매 주장',
      attachments:['영수증_이마트.jpg'],
    },
    history:[{ action:'소명 요청', actor:'시스템', time:'05.11 09:00', note:'이상 결제 자동 감지' }],
  },

  // [증빙] 법인카드 월간 영수증 제출
  {
    id:'a9', status:'pending', direction:'outgoing', type:'evidence',
    requester:'김지수', requestedAt:'오늘 08:00',
    title:'5월 법인카드 영수증 증빙 제출',
    desc:'5월 1~10일 결제 건 영수증 미제출 3건',
    amount:234000,
    keyPoint:'마감 기한 5.15 · 미제출 3건 중 교통비(택시) 영수증 없음',
    riskLevel:'low', canApprove:true, txId:'tx_a9',
    executionData:{
      period:'2025년 5월 1~10일',
      totalAmount:234000,
      items:[
        { name:'주유비 (GS칼텍스)', amount:85000, status:'영수증 첨부됨' },
        { name:'식대 (팀 점심)', amount:62000, status:'영수증 첨부됨' },
        { name:'택시 (야근 귀가)', amount:38000, status:'미제출' },
        { name:'문구류 (사무용품)', amount:49000, status:'미제출' },
      ],
      attachments:['영수증_주유비.jpg','영수증_식대.jpg'],
    },
    history:[{ action:'증빙 제출 요청', actor:'시스템', time:'05.11 08:00', note:'월 마감 증빙 요청' }],
  },

  // ── 진행 중 (inprogress — 추가 서류 요청 후 대기) ─────

  // [자금집행] 급여 선지급 — 근로계약서 추가 요청 중
  {
    id:'a10', status:'inprogress', direction:'outgoing', type:'execute', approvalStage:1,
    requester:'홍길동', requestedAt:'어제',
    title:'5월 급여 선지급 요청',
    desc:'급여 지갑 → 홍길동 개인 계좌',
    amount:2500000,
    keyPoint:'근로계약서 재제출 대기 중 · 이전 버전 계약서 기간 만료 확인',
    riskLevel:'mid', canApprove:true, txId:'tx_a10',
    executionData:{
      recipientName:'홍길동',
      recipientAccount:'카카오뱅크 3333-01-1234567',
      wallet:'급여 지갑',
      category:'급여 선지급',
      payPeriod:'2025년 5월분',
      scheduledDate:'2025.05.12 즉시',
      memo:'가정 사정으로 인한 조기 지급 요청',
      attachments:['선지급신청서.pdf'],
    },
    history:[
      { action:'집행 요청', actor:'홍길동', time:'05.10 11:00', note:'선지급 신청서 첨부' },
      { action:'추가 서류 요청', actor:'나', time:'05.10 14:30', note:'최신 근로계약서 제출 요청' },
      { action:'재제출 예정', actor:'홍길동', time:'05.10 18:00', note:'내일 오전 제출 예정' },
    ],
  },

  // [소명] 법인카드 야근 식대 재확인 중
  {
    id:'a11', status:'inprogress', direction:'outgoing', type:'claim',
    requester:'이유진', requestedAt:'어제',
    title:'법인카드 야근 식대 소명 재확인',
    desc:'배달 영수증 날짜 불일치 — 수정본 제출 대기',
    amount:52000,
    keyPoint:'영수증 주문 날짜와 카드 결제일 1일 차이 — 재확인 응답 대기',
    riskLevel:'low', canApprove:true, txId:'tx_a11',
    executionData:{
      expenseType:'야근 식대',
      date:'2025.05.07 (화) 21:40',
      items:[
        { name:'배달의민족 — 치킨 주문', amount:52000 },
      ],
      paymentMethod:'법인카드 (신한 ****9012)',
      memo:'야근 식대 (오후 9시 이후)',
      attachments:['영수증_수정본.jpg'],
    },
    history:[
      { action:'소명 요청', actor:'시스템', time:'05.09 09:00', note:'이상 결제 감지' },
      { action:'추가 확인 요청', actor:'나', time:'05.10 10:00', note:'영수증 날짜 재확인 요청' },
      { action:'수정본 제출', actor:'이유진', time:'05.10 14:30', note:'수정 영수증 재첨부' },
    ],
  },

  // ── 완료 (approved) ────────────────────────────────────

  // [자금집행] 구독료 — 승인 완료
  {
    id:'a12', status:'done', doneType:'approved', direction:'outgoing', type:'execute', approvalStage:1,
    requester:'자동 지출', requestedAt:'3일 전',
    title:'Slack 구독료 자동 납부',
    desc:'운영비 지갑 → Slack Technologies',
    amount:890000,
    keyPoint:'정기 구독 패턴 일치 · 전월 대비 금액 동일',
    riskLevel:'low', canApprove:true, txId:'tx_a12',
    executionData:{
      recipientName:'Slack Technologies Inc.',
      recipientAccount:'해외 카드 결제 (USD 630.00)',
      wallet:'운영비 지갑',
      category:'구독료 (자동 지출)',
      taxInvoice:'해외 영수증 자동 발행',
      scheduledDate:'2025.05.08 자동',
      memo:'Business+ 플랜 · 30석',
      attachments:['Slack_Invoice_May2025.pdf'],
    },
    history:[
      { action:'자동 지출 승인 요청', actor:'시스템', time:'05.08 09:00', note:'월 임계 금액 초과' },
      { action:'내역 확인', actor:'나', time:'05.08 09:10', note:'전월 동일 금액 확인' },
      { action:'승인 완료', actor:'나', time:'05.08 09:12', note:'정기 구독 정상 처리' },
    ],
  },

  // [검수] 마케팅 외주 결과물 검수 완료
  {
    id:'a13', status:'done', doneType:'approved', direction:'incoming', type:'review',
    requester:'이민형', requestedAt:'2일 전',
    title:'SNS 마케팅 캠페인 결과물 검수',
    desc:'㈜애드캠프 · 4월 SNS 광고 집행 결과 보고',
    amount:1500000,
    keyPoint:'KPI 달성 여부 · 리포트 수치 광고 플랫폼 실수치와 대조 확인',
    riskLevel:'low', canApprove:true, txId:'tx_a13',
    executionData:{
      vendor:'㈜애드캠프',
      subject:'4월 SNS 광고 집행',
      contractPeriod:'2026.04.01 ~ 2026.04.30',
      contractAmount:1500000,
      stages:[
        { label:'선금', pct:30, amount:450000, status:'paid',
          paidAt:'04.01', note:'계약 서명 완료 · 자동 입금됨' },
        { label:'중도금', pct:40, amount:600000, status:'paid',
          paidAt:'04.15', note:'중간 보고서 검수 완료 · 자동 입금됨' },
        { label:'잔금', pct:30, amount:450000, status:'paid',
          paidAt:'05.09', note:'최종 결과물 검수 완료 · 자동 입금됨' },
      ],
      currentStageIdx:2,
      resultFiles:['캠페인_성과리포트.pdf','광고계정_스크린샷.png','세금계산서.pdf'],
      note:'인스타그램 노출 120만 · 전환율 3.2% — 계약 KPI 초과 달성',
    },
    history:[
      { action:'계약서 발송', actor:'시스템', time:'04.01 10:00', note:'계약 서명 완료' },
      { action:'선금 450,000원 자동 입금', actor:'시스템', time:'04.01 10:05', note:'선금 30% 집행' },
      { action:'중간 보고서 검수 요청', actor:'이민형', time:'04.15 13:00', note:'중간 집행 현황 보고서 첨부' },
      { action:'중도금 600,000원 자동 입금', actor:'시스템', time:'04.15 13:20', note:'중도금 40% 집행' },
      { action:'결과물 검수 요청', actor:'이민형', time:'05.09 14:00', note:'성과 리포트 첨부' },
      { action:'수치 대조 확인', actor:'나', time:'05.09 15:00', note:'광고 플랫폼 데이터 일치' },
      { action:'검수 승인 완료', actor:'나', time:'05.09 15:10', note:'KPI 달성 확인 · 잔금 자동 집행' },
      { action:'잔금 450,000원 자동 입금', actor:'시스템', time:'05.09 15:11', note:'잔금 30% 집행 완료' },
    ],
  },

  // ── 반려 (rejected) ────────────────────────────────────

  // [MCC 허용] 카지노 업종 — 반려
  {
    id:'a14', status:'done', doneType:'rejected', direction:'outgoing', type:'mcc', approvalStage:3,
    requester:'김지수', requestedAt:'4일 전',
    title:'카지노/도박(7995) 업종 영구 허용 요청',
    desc:'법인카드 · 영구 차단 업종 해제 요청',
    amount:null,
    keyPoint:'도박성 업종 · 회사 카드 정책 위반 · 업무 목적 불명확',
    riskLevel:'high', canApprove:true, txId:'tx_a14',
    executionData:{
      mccCode:'7995',
      mccLabel:'카지노 / 복권 / 도박',
      card:'법인카드 (신한 ****5678)',
      requestType:'영구 허용',
      currentStatus:'영구 차단',
      reason:'해외 파트너사 접대 목적',
      previousRequests:'1회 (이전 반려)',
      attachments:[],
    },
    history:[
      { action:'MCC 허용 요청', actor:'김지수', time:'05.07 14:00', note:'접대 목적 주장' },
      { action:'정책 검토', actor:'나', time:'05.07 15:30', note:'카드 정책 위반 확인' },
      { action:'반려', actor:'나', time:'05.07 15:40', note:'도박성 업종 영구 차단 — 접대비 사용 불가 업종' },
    ],
  },

  // [자금집행] 해외 이체 — 규정 미충족 반려
  {
    id:'a15', status:'done', doneType:'rejected', direction:'outgoing', type:'execute', approvalStage:2,
    requester:'이민형', requestedAt:'6일 전',
    title:'해외 법인 계좌 이체',
    desc:'운영비 지갑 → 미국 법인 계좌',
    amount:5000000,
    keyPoint:'해외 이체 사전 인가 없음 · 외환거래법 검토 미완료',
    riskLevel:'high', canApprove:true, txId:'tx_a15',
    executionData:{
      recipientName:'Orora Global LLC',
      recipientAccount:'Citibank USA — ACCT 1234567890 / SWIFT CITIUS33',
      wallet:'운영비 지갑',
      category:'해외 법인 이체',
      taxInvoice:'해당 없음 (해외 송금)',
      scheduledDate:'2025.05.05 즉시',
      memo:'미국 법인 초기 운영자금 송금',
      attachments:['해외법인_설립서류.pdf','송금_신청서.pdf'],
    },
    history:[
      { action:'집행 요청', actor:'이민형', time:'05.05 10:00', note:'법인 서류 첨부' },
      { action:'규정 검토', actor:'나', time:'05.05 14:00', note:'외환거래법 사전 인가 미확인' },
      { action:'반려', actor:'나', time:'05.05 14:30', note:'법무팀 외환 인가 취득 후 재신청 요망' },
    ],
  },

  // [소명] 법인카드 편의점 결제 소명 — 반려
  {
    id:'a16', status:'done', doneType:'rejected', direction:'outgoing', type:'claim',
    requester:'박철수', requestedAt:'1주 전',
    title:'법인카드 편의점 결제 소명',
    desc:'CU 편의점 결제 · 업무 연관성 소명',
    amount:34000,
    keyPoint:'편의점 영수증 품목 — 라면·과자·음료 등 개인 물품으로 판단',
    riskLevel:'low', canApprove:true, txId:'tx_a16',
    executionData:{
      expenseType:'법인카드 사용 소명',
      date:'2025.05.04 (토) 14:15',
      items:[
        { name:'라면·과자·음료 등 (영수증 참조)', amount:34000 },
      ],
      paymentMethod:'법인카드 (KB국민 ****1234)',
      memo:'야근 간식 구매 (주장)',
      attachments:['영수증_CU.jpg'],
    },
    history:[
      { action:'소명 요청', actor:'시스템', time:'05.05 09:00', note:'주말 편의점 결제 감지' },
      { action:'소명 제출', actor:'박철수', time:'05.05 10:00', note:'야근 간식 주장' },
      { action:'반려', actor:'나', time:'05.05 11:00', note:'주말 근무 기록 없음 · 개인비용 처리' },
    ],
  },

  // ════════════════════════════════════════
  // ── 관리자 승인 설정에서 연동된 집행 요청
  // ════════════════════════════════════════

  // [자금집행] 사무용품 구매 — 1차 승인 대기
  {
    id:'a17', status:'pending', direction:'outgoing', type:'execute', approvalStage:1, has2ndStage:false, nextApprover:null,
    requester:'최직원', requestedAt:'2026.05.11',
    title:'사무용품 구매',
    desc:'운영비 지갑 → 오피스디포',
    amount:245000,
    keyPoint:'비품 카테고리 · 1차 승인 대기 · 박승인 검토 필요',
    riskLevel:'low', canApprove:true, txId:'tx_a17',
    executionData:{
      recipientName:'오피스디포',
      recipientAccount:'',
      wallet:'운영비 지갑',
      category:'비품',
      purpose:'프린터 토너 교체',
      scheduledDate:'2026.05.14',
      receiptStatus:'영수증 첨부 완료',
      memo:'프린터 토너 교체 — 소모품',
      attachments:['영수증_사무용품.jpg'],
    },
    history:[
      { action:'집행 요청', actor:'최직원', time:'05.11 09:00', note:'영수증 첨부 완료' },
    ],
  },

  // [자금집행] 외주 개발비 — 1차 완료, 2차 승인 대기
  {
    id:'a18', status:'inprogress', direction:'outgoing', type:'execute', approvalStage:2, has2ndStage:true, nextApprover:'이대표 (최고관리자)',
    requester:'박승인', requestedAt:'2026.05.10',
    title:'외주 개발비',
    desc:'외주비 지갑 → ㈜디자인랩',
    amount:5800000,
    keyPoint:'외주비 카테고리 · 1차 승인 완료 · 2차 검토 대기 (500만원 이상)',
    riskLevel:'mid', canApprove:true, txId:'tx_a18',
    executionData:{
      recipientName:'㈜디자인랩',
      recipientAccount:'기업은행 179-012345-67-890',
      wallet:'외주비 지갑',
      category:'외주비',
      purpose:'앱 UI 리뉴얼 개발',
      scheduledDate:'2026.05.20',
      receiptStatus:'계약서 첨부 완료',
      memo:'앱 UI 리뉴얼 — 외주 개발비 (1차 계약)',
      attachments:['외주계약서_디자인랩.pdf','견적서.pdf'],
    },
    history:[
      { action:'집행 요청', actor:'박승인', time:'05.10 10:00', note:'계약서 첨부' },
      { action:'1차 승인', actor:'박승인', time:'05.10 14:30', note:'내용 검토 후 승인 — 2차 검토 필요 (외주 고액)' },
    ],
  },

  // [자금집행] 법인 접대비 — 2차 승인 대기, 증빙 없음
  {
    id:'a19', status:'pending', direction:'outgoing', type:'execute', approvalStage:2, has2ndStage:true, nextApprover:'이대표 (최고관리자)',
    requester:'김관리', requestedAt:'2026.05.09', deadline:'2026.05.14',
    title:'법인 접대비',
    desc:'운영비 지갑 → 강남그릴',
    amount:1240000,
    keyPoint:'접대비 카테고리 · 증빙 미첨부 · 2차 조건 충족으로 2차 대기',
    riskLevel:'high', canApprove:true, txId:'tx_a19',
    executionData:{
      recipientName:'강남그릴',
      recipientAccount:'',
      wallet:'운영비 지갑',
      category:'접대비',
      purpose:'거래처 저녁 식사',
      scheduledDate:'2026.05.12',
      receiptStatus:'영수증 미첨부 ⚠️',
      memo:'주요 거래처 방문 — 저녁 식사',
      attachments:[],
    },
    history:[
      { action:'집행 요청', actor:'김관리', time:'05.09 17:30', note:'증빙 첨부 없이 제출' },
      { action:'증빙 요청', actor:'시스템', time:'05.09 17:31', note:'접대비 영수증 첨부 필요 — 자동 플래그' },
    ],
  },

  // [자금집행] 마케팅 광고비 — 추가 서류 요청 중
  {
    id:'a20', status:'inprogress', direction:'outgoing', type:'execute', approvalStage:1, has2ndStage:true, nextApprover:'이대표 (최고관리자)',
    requester:'최직원', requestedAt:'2026.05.08',
    title:'마케팅 광고비',
    desc:'마케팅 지갑 → 메타코리아',
    amount:3200000,
    keyPoint:'SNS 광고 집행 · 추가 서류 요청 중 (광고 집행 계획서)',
    riskLevel:'mid', canApprove:true, txId:'tx_a20',
    executionData:{
      recipientName:'메타코리아',
      recipientAccount:'',
      wallet:'마케팅 지갑',
      category:'광고비',
      purpose:'SNS 광고 집행',
      scheduledDate:'2026.05.15',
      receiptStatus:'광고 인보이스 첨부',
      memo:'인스타그램·페이스북 광고 — 5월 캠페인',
      attachments:['광고_인보이스.pdf'],
    },
    history:[
      { action:'집행 요청', actor:'최직원', time:'05.08 11:00', note:'인보이스 첨부' },
      { action:'추가 서류 요청', actor:'박승인', time:'05.08 15:00', note:'광고 집행 계획서 및 기대 성과 제출 요청' },
    ],
  },

  // [자금집행] 서버 장비 구매 — 최종 승인 완료
  {
    id:'a21', status:'done', doneType:'approved', direction:'outgoing', type:'execute', approvalStage:3,
    requester:'박승인', requestedAt:'2026.05.07',
    title:'서버 장비 구매',
    desc:'인프라 지갑 → 삼성SDS',
    amount:12000000,
    keyPoint:'고액 비품 · 1차+2차+대표 최종 승인 완료 · 집행 예정 2026.05.25',
    riskLevel:'mid', canApprove:true, txId:'tx_a21',
    executionData:{
      recipientName:'삼성SDS',
      recipientAccount:'기업은행 080-000000-00-000',
      wallet:'인프라 지갑',
      category:'비품',
      purpose:'서버 장비 교체',
      scheduledDate:'2026.05.25',
      receiptStatus:'견적서 첨부 완료',
      memo:'노후 서버 장비 전면 교체 — 3년 보증',
      attachments:['견적서_삼성SDS.pdf','장비_사양서.pdf'],
    },
    history:[
      { action:'집행 요청', actor:'박승인', time:'05.07 09:00', note:'견적서·사양서 첨부' },
      { action:'1차 승인', actor:'박승인', time:'05.07 11:00', note:'필요성 확인' },
      { action:'2차 승인', actor:'김관리', time:'05.08 09:30', note:'예산 적합성 검토 완료' },
      { action:'최종 승인', actor:'이대표', time:'05.09 10:00', note:'고액 승인 — 집행 예약' },
    ],
  },

  // ════════════════════════════════════════
  // ── 받은 요청 (incoming) ─────────────────
  // ════════════════════════════════════════

  // [증빙요청] 세무사 증빙자료 요청
  {
    id:'a22', status:'pending', direction:'incoming', type:'evidenceIn',
    requester:'세무법인 하나', requestedAt:'1시간 전', deadline:'2026.05.16',
    title:'5월 부가세 신고 증빙자료 요청',
    desc:'세무사 → 우리 회사 · 5월 법인카드 매입 세금계산서 제출 요청',
    amount:null,
    keyPoint:'부가세 신고 마감 D-5 · 세금계산서 8건 미제출 · 기한 내 제출 필요',
    riskLevel:'mid', canApprove:true, txId:'tx_a22',
    executionData:{
      expenseType:'세무 증빙 제출',
      period:'2026년 5월 (부가세 신고용)',
      requiredDocs:'법인카드 매입 세금계산서 8건',
      deadline:'2026.05.25',
      memo:'부가세 신고를 위한 매입 세금계산서 제출 요청',
      attachments:[],
    },
    history:[
      { action:'증빙자료 요청', actor:'세무법인 하나', time:'05.12 09:00', note:'부가세 신고 기한 D-5 · 서류 취합 요청' },
    ],
  },

  // [자료요청] 거래처 계약서 재요청
  {
    id:'a23', status:'pending', direction:'incoming', type:'dataRequest',
    requester:'㈜파트너솔루션', requestedAt:'3시간 전',
    title:'계약서 원본 재발송 요청',
    desc:'거래처 → 우리 회사 · 계약서 원본 PDF 재발송 요청',
    amount:null,
    keyPoint:'담당자 변경으로 기존 계약서 분실 · 원본 스캔본 또는 공인전자문서 제출 필요',
    riskLevel:'low', canApprove:true, txId:'tx_a23',
    executionData:{
      expenseType:'계약 서류 제출',
      requester:'㈜파트너솔루션 구매팀',
      requiredDocs:'서비스 계약서 원본 (2026.03 체결)',
      deadline:'2026.05.20',
      memo:'담당자 변경으로 계약서 재발송 요청 — 공인전자문서 또는 PDF 스캔본 제출',
      attachments:[],
    },
    history:[
      { action:'계약서 재발송 요청', actor:'㈜파트너솔루션', time:'05.12 10:30', note:'기존 담당자 퇴직 · 계약서 분실 · 재발송 요청' },
    ],
  },

  // [상환요청] 직원 출장비 상환 요청
  {
    id:'a24', status:'pending', direction:'incoming', type:'refund',
    requester:'김출장 (영업팀)', requestedAt:'어제',
    title:'출장비 상환 요청',
    desc:'직원 선지출 → 회사 상환 · KTX + 숙박 + 식대',
    amount:178000,
    keyPoint:'영수증 3건 첨부 완료 · 출장보고서 미제출 · 상환 전 보고서 확인 필요',
    riskLevel:'low', canApprove:true, txId:'tx_a24',
    executionData:{
      expenseType:'출장비 상환',
      tripPeriod:'2026.05.09 ~ 2026.05.10 (1박 2일)',
      destination:'부산 (거래처 방문)',
      items:[
        { name:'KTX 왕복', amount:98000, status:'영수증 첨부됨' },
        { name:'숙박 (비즈니스호텔)', amount:62000, status:'영수증 첨부됨' },
        { name:'식대 (1박 2일)', amount:18000, status:'영수증 첨부됨' },
      ],
      memo:'부산 거래처 방문 출장 · 개인카드 선지출 후 상환 요청',
      attachments:['영수증_KTX.jpg','영수증_숙박.jpg','영수증_식대.jpg'],
    },
    history:[
      { action:'상환 요청', actor:'김출장', time:'05.11 18:00', note:'영수증 3건 첨부 · 출장보고서 미제출' },
    ],
  },

  // ── 일반구성원 채팅 요청 (조회 전용) ─────────────────────

  // [정산요청] 채팅에서 요청한 정산
  {
    id:'a25', status:'pending', direction:'outgoing', type:'wallet',
    requester:'나 (일반구성원)', requestedAt:'2시간 전',
    title:'프리랜서 디자이너 정산 요청',
    desc:'채팅에서 요청 · 프리랜서 디자인 비용 정산',
    amount:450000,
    keyPoint:'계약서 첨부 완료 · 1차 승인 대기 중',
    riskLevel:'low', canApprove:false, staffRequested:true,
    wallet:'운영비 지갑',
    executionData:{
      expenseType:'외주 용역비',
      recipient:'박디자인 (프리랜서)',
      account:'카카오뱅크 333-123456-789',
      amount:450000,
      memo:'랜딩페이지 디자인 작업비 — 1차 결과물 납품 완료',
      attachments:['계약서.pdf','작업산출물.zip'],
    },
    history:[
      { action:'정산 요청', actor:'나 (일반구성원)', time:'05.15 10:00', note:'채팅에서 정산 요청 전송' },
    ],
  },

  // [상환요청] 채팅에서 요청한 상환
  {
    id:'a26', status:'inprogress', direction:'outgoing', type:'refund',
    requester:'나 (일반구성원)', requestedAt:'어제',
    title:'업무용 소모품 구매 상환 요청',
    desc:'채팅에서 요청 · 개인카드 선지출 후 상환',
    amount:32000,
    keyPoint:'영수증 첨부 완료 · 처리 중',
    riskLevel:'low', canApprove:false, staffRequested:true,
    executionData:{
      expenseType:'소모품비',
      items:[
        { name:'A4 용지 2박스', amount:24000, status:'영수증 첨부됨' },
        { name:'볼펜 세트', amount:8000, status:'영수증 첨부됨' },
      ],
      memo:'팀 사무용품 긴급 구매 · 개인카드 결제 후 상환 요청',
      attachments:['영수증_소모품.jpg'],
    },
    history:[
      { action:'상환 요청', actor:'나 (일반구성원)', time:'05.14 16:30', note:'채팅에서 상환 요청 전송' },
      { action:'1차 검토 중', actor:'김관리 (관리자)', time:'05.14 17:00', note:'내용 확인 중' },
    ],
  },

  // [자료요청] 채팅에서 요청한 자료
  {
    id:'a27', status:'done', doneType:'approved', direction:'outgoing', type:'dataRequest',
    requester:'나 (일반구성원)', requestedAt:'3일 전',
    title:'세금계산서 발행 요청',
    desc:'채팅에서 요청 · 거래처 세금계산서 발행 요청',
    amount:null,
    keyPoint:'발행 완료',
    riskLevel:'low', canApprove:false, staffRequested:true,
    executionData:{
      expenseType:'세금계산서',
      requester:'㈜테스트컴퍼니',
      requiredDocs:'세금계산서 원본 (공급가액 1,200,000원)',
      deadline:'2026.05.13',
      memo:'5월 용역 계약 세금계산서 발행 요청',
      attachments:[],
    },
    history:[
      { action:'자료 요청', actor:'나 (일반구성원)', time:'05.12 09:00', note:'채팅에서 자료 요청 전송' },
      { action:'세금계산서 발행 완료', actor:'김관리 (관리자)', time:'05.12 14:00', note:'발행 완료 · PDF 첨부' },
    ],
  },
]

// ─── 필터 헬퍼 ────────────────────────────────────────────
function matchStatus(a, tab) {
  if (tab === 'all')        return true
  if (tab === 'inprogress') return a.status === 'pending' || a.status === 'inprogress'
  if (tab === 'rejected')   return a.status === 'done' && a.doneType === 'rejected'
  if (tab === 'done')       return a.status === 'done' && a.doneType !== 'rejected'
  return false
}
function matchType(a, tf, authority) {
  const isSuperAdmin = authority === 'super'
  if (tf === 'all') return isSuperAdmin ? true : a.canApprove
  // usageCheck = evidence + claim 통합
  if (tf === 'usageCheck') {
    if (!isSuperAdmin && !a.canApprove) return false
    return ['evidence', 'claim'].includes(a.type)
  }
  // 받은 요청 카테고리 — direction:'incoming' 아이템만
  if (tf === 'evidenceIn') return a.type === 'evidenceIn'
  if (tf === 'reviewReq')   return a.type === 'review'
  if (tf === 'dataRequest') return a.type === 'dataRequest'
  if (tf === 'refund') return a.type === 'refund'
  if (tf === 'settlement')  return a.type === 'wallet'
  if (tf === 'refundReq')   return a.type === 'refund'
  if (tf === 'dataReq')     return a.type === 'dataRequest'
  const types = TYPE_FILTER_TYPES[tf]
  if (!isSuperAdmin && (!a.canApprove || !types || !types.includes(a.type))) return false
  if (isSuperAdmin && (!types || !types.includes(a.type))) return false
  // 승인요청: 최고관리자는 모든 단계, 나머지는 내 단계만
  if (tf === 'approval') {
    if (isSuperAdmin) return true
    return !a.approvalStage || a.approvalStage === authority
  }
  return true
}
function fmt(n) { return n == null ? null : Number(n).toLocaleString('ko-KR') }

// ─── 뱃지 ─────────────────────────────────────────────────
function RiskBadge({ level }) {
  const m = RISK_META[level]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'3px',
      padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
      color:m.color, background:m.bg, border:`1px solid ${m.border}` }}>
      {level==='high'?'⚠':level==='mid'?'!':'✓'} {m.label}
    </span>
  )
}
function TypeBadge({ type }) {
  const m = TYPE_META[type]
  return (
    <span style={{ display:'inline-flex', alignItems:'center',
      padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
      color:m.color, background:m.bg, border:`1px solid ${m.border}` }}>
      {m.label}
    </span>
  )
}

// ─── 처리 이력 타임라인 ───────────────────────────────────
function HistoryTimeline({ history, large, brandColor }) {
  if (large) {
    // TransactionDetail 스타일 타임라인
    return (
      <div>
        {history.map((h, i) => {
          const isLast  = i === history.length - 1
          const isPending = h.action?.includes('예정') || h.status === 'pending'
          const dotColor = isPending ? null
            : i === 0 ? (brandColor || '#4F46E5')
            : '#10B981'
          return (
            <div key={i} style={{ display:'flex', gap:'12px', position:'relative' }}>
              <div style={{ width:'14px', display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, paddingTop:'3px' }}>
                <div style={{ width:'9px', height:'9px', borderRadius:'50%', zIndex:1, flexShrink:0,
                  background: isPending ? '#fff' : dotColor,
                  border: isPending ? '1.5px solid #D1D5DB' : 'none' }} />
                {!isLast && (
                  <div style={{ flex:1, width:'1.5px', background:'#F0F1F3', marginTop:'3px', minHeight:'22px' }} />
                )}
              </div>
              <div style={{ flex:1, paddingBottom: isLast ? 0 : '16px' }}>
                <div style={{ fontSize:'12px', fontWeight:600,
                  color: isPending ? '#9CA3AF' : '#111827', marginBottom:'2px' }}>
                  {h.action}
                  {h.actor && h.actor !== '시스템' && h.actor !== '나' && (
                    <span style={{ fontWeight:500, color:'#6B7280' }}> · {h.actor}</span>
                  )}
                </div>
                <div style={{ fontSize:'10px', color:'#9CA3AF' }}>{h.time}</div>
                {h.note && (
                  <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'4px', lineHeight:1.5,
                    padding:'5px 8px', background:'#F8FAFB', borderRadius:'7px' }}>{h.note}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  // 카드 내 인라인 미니 타임라인
  return (
    <div style={{ padding:'10px 12px', background:'#F8FAFF',
      border:'1px solid #E0E7FF', borderRadius:'10px', marginBottom:'10px' }}>
      <div style={{ fontSize:'10px', fontWeight:700, color:'#4338CA',
        marginBottom:'8px', letterSpacing:'0.3px' }}>처리 이력</div>
      {history.map((h, i) => {
        const dotColor = h.action?.includes('반려') ? '#DC2626'
          : h.action?.includes('최종 승인') ? '#059669'
          : h.action?.includes('승인') ? '#4F46E5' : '#D1D5DB'
        const textColor = h.action?.includes('반려') ? '#DC2626'
          : h.action?.includes('최종 승인') ? '#047857' : '#374151'
        return (
          <div key={i} style={{ display:'flex', gap:'8px', marginBottom: i<history.length-1?'7px':0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', marginTop:'3px',
                background: dotColor, flexShrink:0 }} />
              {i < history.length-1 && (
                <div style={{ width:'1px', flex:1, background:'#E5E7EB', marginTop:'2px', minHeight:'12px' }} />
              )}
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:'11px', fontWeight:600, color:textColor }}>{h.action}</span>
              <span style={{ fontSize:'10px', color:'#9CA3AF' }}> · {h.time}</span>
              {h.note && (
                <div style={{ fontSize:'10px', color:'#6B7280', lineHeight:1.4, marginTop:'1px' }}>{h.note}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 집행 내용 섹션 ───────────────────────────────────────
function ExecutionDataSection({ item }) {
  const { type, executionData: d } = item
  if (!d) return null

  const Row = ({ label, value, last, highlight }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      paddingBottom: last?0:'10px', marginBottom: last?0:'10px',
      borderBottom: last?'none':'1px solid #F4F5F7' }}>
      <span style={{ fontSize:'12px', fontWeight:500, color:'#9CA3AF', flexShrink:0, marginRight:'16px', lineHeight:1.5 }}>{label}</span>
      <span style={{ fontSize:'12px', fontWeight: highlight?700:600, color: highlight?'#111827':'#374151',
        textAlign:'right', wordBreak:'break-all', lineHeight:1.5 }}>{value}</span>
    </div>
  )

  const Attachments = ({ files }) => (
    files && files.length > 0 ? (
      <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #F4F5F7' }}>
        <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', marginBottom:'7px', letterSpacing:'0.3px' }}>
          첨부 파일
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {files.map((f, i) => (
            <span key={i} style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
              background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE',
              display:'flex', alignItems:'center', gap:'4px' }}>
              📎 {f}
            </span>
          ))}
        </div>
      </div>
    ) : (
      <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #F4F5F7',
        fontSize:'11px', color:'#D1D5DB' }}>첨부 파일 없음</div>
    )
  )

  const cardStyle = { background:'#fff', borderRadius:'14px', padding:'14px 16px',
    boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'10px' }
  const secLabel = (t) => (
    <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF',
      marginBottom:'12px', letterSpacing:'0.5px' }}>{t}</div>
  )

  // ── execute ──
  if (type === 'execute') {
    const catMeta = getCatMeta(d.category)
    const rows = [
      { label:'받는 분',   value: d.recipientName, highlight:true },
      d.recipientAccount && { label:'받는 계좌', value: d.recipientAccount },
      { label:'출금 지갑', value: d.wallet },
      { label:'대카테고리', value: catMeta ? catMeta.main : '기타' },
      { label:'중카테고리', value: d.category
          ? (catMeta ? `${catMeta.icon} ${d.category}` : d.category)
          : '-' },
      d.purpose && { label:'집행 목적', value: d.purpose },
      d.receiptStatus && { label:'증빙 상태', value: d.receiptStatus },
      d.payPeriod && { label:'지급 기간', value: d.payPeriod },
      d.taxInvoice && { label:'세금계산서', value: d.taxInvoice },
      { label:'집행 예정일', value: d.scheduledDate },
      d.memo && { label:'메모', value: d.memo },
    ].filter(Boolean)
    return (
      <div style={cardStyle}>
        {secLabel('집행 내용')}
        {rows.map((r, i) => <Row key={i} {...r} last={i===rows.length-1 && !(d.attachments)} />)}
        <Attachments files={d.attachments} />
      </div>
    )
  }

  // ── card ──
  if (type === 'card') {
    const rows = [
      { label:'가맹점',   value: d.merchant, highlight:true },
      { label:'MCC 코드', value: `${d.mccCode} · ${d.mccLabel}` },
      { label:'결제 카드', value: d.card },
      { label:'출금 지갑', value: d.wallet },
      { label:'영수증',   value: d.receiptStatus },
      d.memo && { label:'메모', value: d.memo },
    ].filter(Boolean)
    return (
      <div style={cardStyle}>
        {secLabel('카드 결제 내용')}
        {rows.map((r, i) => <Row key={i} {...r} last={i===rows.length-1 && !(d.attachments)} />)}
        <Attachments files={d.attachments} />
      </div>
    )
  }

  // ── mcc ──
  if (type === 'mcc') {
    const rows = [
      { label:'MCC 코드',    value: `${d.mccCode} · ${d.mccLabel}`, highlight:true },
      { label:'대상 카드',   value: d.card },
      { label:'요청 유형',   value: d.requestType },
      { label:'현재 상태',   value: d.currentStatus },
      { label:'신청 사유',   value: d.reason },
      d.previousRequests && { label:'이전 요청', value: d.previousRequests },
    ].filter(Boolean)
    return (
      <div style={cardStyle}>
        {secLabel('MCC 허용 요청 내용')}
        {rows.map((r, i) => <Row key={i} {...r} last={i===rows.length-1} />)}
      </div>
    )
  }

  // ── review (TransactionDetail 스타일 카드) ──
  if (type === 'review') {
    return (
      <div style={{ marginBottom:'10px' }}>

        {/* 계약 헤더 카드 */}
        <div style={{ background:'#fff', borderRadius:'14px', padding:'14px 16px',
          boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'8px' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF',
            marginBottom:'8px', letterSpacing:'0.5px' }}>검수 요청 내용</div>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>{d.vendor}</div>
          <div style={{ fontSize:'12px', color:'#6B7280', marginTop:'2px' }}>
            {d.subject}{d.contractPeriod ? ` · ${d.contractPeriod}` : ''}
          </div>
          {d.contractAmount != null && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #F4F5F7' }}>
              <span style={{ fontSize:'12px', color:'#6B7280' }}>총 계약 금액</span>
              <span style={{ fontSize:'16px', fontWeight:800, color:'#1D4ED8' }}>{fmt(d.contractAmount)}원</span>
            </div>
          )}
        </div>

        {/* 단계별 진행 */}
        {d.stages && (
          <>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#111827',
              marginBottom:'8px', padding:'2px 4px' }}>단계별 진행</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'10px' }}>
              {d.stages.map((s, i) => (
                <div key={i} style={{
                  background:'#fff', borderRadius:'14px',
                  boxShadow:'0 1px 6px rgba(0,0,0,0.06)',
                  border: s.status === 'review' ? '1px solid #FCD34D' : 'none',
                  padding:'14px',
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                    {/* 서클 인디케이터 */}
                    <div style={{
                      width:'26px', height:'26px', borderRadius:'50%', flexShrink:0, marginTop:'1px',
                      background: s.status === 'paid' ? '#10B981' : s.status === 'review' ? '#F59E0B' : '#fff',
                      color: s.status === 'pending' ? '#9CA3AF' : '#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'11px', fontWeight:700,
                      border: s.status === 'pending' ? '1.5px solid #E9EAEC' : 'none',
                    }}>
                      {s.status === 'paid' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : i + 1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        marginBottom:'3px', gap:'8px' }}>
                        <span style={{ fontSize:'13px', fontWeight:700,
                          color: s.status === 'pending' ? '#9CA3AF' : '#111827' }}>
                          {s.label} {s.pct}%
                        </span>
                        <span style={{ fontSize:'14px', fontWeight:700, flexShrink:0,
                          color: s.status === 'paid' ? '#047857' : s.status === 'review' ? '#D97706' : '#9CA3AF' }}>
                          {fmt(s.amount)}원
                        </span>
                      </div>
                      <div style={{ fontSize:'11px', color:'#6B7280', lineHeight:1.5 }}>
                        {s.paidAt ? `${s.paidAt} · ` : ''}{s.note}
                      </div>
                      {s.dueDate && s.status !== 'paid' && (
                        <div style={{ fontSize:'11px', marginTop:'4px', fontWeight:600,
                          color: s.status === 'review' ? '#D97706' : '#9CA3AF' }}>
                          마감 {s.dueDate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 제출된 결과물 */}
        {d.resultFiles && d.resultFiles.length > 0 && (
          <div style={{ background:'#fff', borderRadius:'14px', padding:'14px 16px',
            boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'8px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'10px' }}>
              제출된 결과물
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {d.resultFiles.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px',
                  padding:'9px 12px', borderRadius:'10px',
                  background:'#F8F9FF', border:'1px solid #E0E7FF' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'9px',
                    background:'rgba(79,70,229,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#374151', flex:1 }}>{f}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C6CA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 비고 */}
        {d.note && (
          <div style={{ background:'#FFFBEB', borderRadius:'12px', padding:'11px 14px',
            border:'1px solid #FDE68A' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#92400E', marginBottom:'4px', letterSpacing:'0.3px' }}>비고</div>
            <div style={{ fontSize:'11px', color:'#78350F', lineHeight:1.6 }}>{d.note}</div>
          </div>
        )}
      </div>
    )
  }

  // ── claim ──
  if (type === 'claim') {
    return (
      <div style={cardStyle}>
        {secLabel('소명 내용')}
        <Row label='지출 유형'  value={d.expenseType} highlight />
        <Row label='지출 일시'  value={d.date} />
        {d.items ? (
          <>
            <div style={{ marginBottom:'9px', paddingBottom:'9px', borderBottom:'1px solid #F4F5F7' }}>
              <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'6px' }}>지출 항목</div>
              {d.items.map((it, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'5px 0', borderBottom: i<d.items.length-1?'1px solid #F9FAFB':'none' }}>
                  <span style={{ fontSize:'12px', color:'#374151' }}>{it.name}</span>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#111827' }}>{fmt(it.amount)}원</span>
                </div>
              ))}
            </div>
          </>
        ) : d.merchant ? (
          <Row label='가맹점' value={d.merchant} />
        ) : null}
        <Row label='결제 수단' value={d.paymentMethod} />
        {d.memo && <Row label='메모' value={d.memo} last={!(d.attachments)} />}
        <Attachments files={d.attachments} />
      </div>
    )
  }

  // ── evidence ──
  if (type === 'evidence') {
    return (
      <div style={cardStyle}>
        {secLabel('증빙 내용')}
        <Row label='대상 기간' value={d.period} />
        <Row label='총 금액'   value={`${fmt(d.totalAmount)}원`} highlight />
        {d.items && (
          <div style={{ marginBottom:'4px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', marginBottom:'7px', letterSpacing:'0.3px' }}>지출 항목</div>
            {d.items.map((it, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'6px 0', borderBottom: i<d.items.length-1?'1px solid #F9FAFB':'none' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#374151' }}>{it.name}</div>
                  {it.status && (
                    <div style={{ fontSize:'10px', marginTop:'1px',
                      color: it.status==='미제출' ? '#DC2626' : '#059669',
                      fontWeight:600 }}>{it.status}</div>
                  )}
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#111827' }}>{fmt(it.amount)}원</span>
              </div>
            ))}
          </div>
        )}
        <Attachments files={d.attachments} />
      </div>
    )
  }

  return null
}

// ─── 상세 화면 ────────────────────────────────────────────
function DetailSheet({ item, theme, onClose, onApprove, onReject, onRequest }) {
  const tm = TYPE_META[item.type]
  const rm = RISK_META[item.riskLevel]
  const dm = item.doneType ? DONE_META[item.doneType] : null
  const isDone       = item.status === 'done'
  const isInProgress = item.status === 'inprogress'

  const detailTitle = item.type === 'review'  ? '검수 상세'
    : item.type === 'execute' ? '집행 상세'
    : item.type === 'card'    ? '카드 결제 상세'
    : item.type === 'mcc'     ? 'MCC 허용 상세'
    : item.type === 'claim'   ? '소명 상세'
    : item.type === 'evidence'? '증빙 상세'
    : '상세'

  return (
    <div style={{ position:'absolute', inset:0, zIndex:500,
      display:'flex', flexDirection:'column', background:'#F2F3F6' }}>

      {/* ── 헤더 ── */}
      <div style={{ background: theme.headerGrad, paddingTop:'max(28px, env(safe-area-inset-top))', paddingBottom:'20px', flexShrink:0 }}>
        {/* 네비 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 16px 18px' }}>
          <button onClick={onClose}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>{detailTitle}</span>
          <div style={{ width:'32px' }} />
        </div>

        {/* 요청자 + 상태 */}
        <div style={{ padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'11px', marginBottom:'14px' }}>
            <div style={{ width:'42px', height:'42px', borderRadius:'50%',
              background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'16px', fontWeight:700, color:'#fff', flexShrink:0 }}>
              {item.requester?.[0] || '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>
                {item.requester}
              </div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>
                {item.requestedAt}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0 }}>
              <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                color:tm.color, background:'rgba(255,255,255,0.92)', border:`1px solid ${tm.border}` }}>
                {tm.label}
              </span>
              <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                color:rm.color, background:'rgba(255,255,255,0.92)', border:`1px solid ${rm.border}` }}>
                {item.riskLevel==='high'?'⚠ ':item.riskLevel==='mid'?'! ':''}{rm.label}
              </span>
            </div>
          </div>

          {/* 진행 바 (review + stages) */}
          {item.type === 'review' && item.executionData?.stages && (() => {
            const paid = item.executionData.stages.filter(s => s.status === 'paid').length
            const total = item.executionData.stages.length
            const pct = Math.round((paid / total) * 100)
            const paidAmt = item.executionData.stages.filter(s=>s.status==='paid').reduce((a,s)=>a+s.amount,0)
            const totalAmt = item.executionData.contractAmount
            return (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:'5px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'26px', fontWeight:700, color:'#fff', letterSpacing:'-1px' }}>
                    {fmt(paidAmt)}
                  </span>
                  <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)' }}>/ {fmt(totalAmt)}원</span>
                  <span style={{ marginLeft:'auto', padding:'5px 11px', borderRadius:'20px', fontSize:'11px',
                    fontWeight:700, background:'rgba(255,255,255,0.15)', color:'#fff' }}>{pct}%</span>
                </div>
                <div style={{ height:'4px', background:'rgba(255,255,255,0.2)', borderRadius:'99px', overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'rgba(255,255,255,0.85)', borderRadius:'99px' }} />
                </div>
              </div>
            )
          })()}

          {/* 금액 + 제목 (review 아닌 경우) */}
          {item.type !== 'review' && item.amount != null && (
            <div style={{ display:'flex', alignItems:'baseline', gap:'5px', marginBottom:'6px' }}>
              <span style={{ fontSize:'28px', fontWeight:700, color:'#fff', letterSpacing:'-1px' }}>
                {fmt(item.amount)}
              </span>
              <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.55)' }}>원</span>
            </div>
          )}
          <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>{item.title}</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)' }}>{item.desc}</div>

          {/* 상태 태그 */}
          <div style={{ display:'flex', gap:'6px', marginTop:'12px', flexWrap:'wrap' }}>
            {dm && (
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                color:dm.color, background:'rgba(255,255,255,0.95)', border:`1px solid ${dm.border}` }}>
                {dm.icon} {dm.label}
              </span>
            )}
            {isInProgress && !dm && (
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                color:'#92400E', background:'rgba(255,255,255,0.95)', border:'1px solid #FDE68A' }}>
                응답 대기 중
              </span>
            )}
            {!isDone && !isInProgress && isUrgent(item) && (
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                color:'#DC2626', background:'rgba(255,255,255,0.95)', border:'1px solid #FECACA' }}>
                긴급 처리
              </span>
            )}
            {item.approvalStage && (
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                color:'#1D4ED8', background:'rgba(255,255,255,0.95)', border:'1px solid #BFDBFE' }}>
                {item.approvalStage}차 승인 단계
              </span>
            )}
            {item.executionData?.category && (() => {
              const cm = getCatMeta(item.executionData.category)
              return cm ? (
                <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                  color:cm.color, background:'rgba(255,255,255,0.95)', border:`1px solid ${cm.border}` }}>
                  {cm.icon} {cm.main} · {item.executionData.category}
                </span>
              ) : null
            })()}
            {item.nextApprover && !isDone && (
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                color:'#7C3AED', background:'rgba(255,255,255,0.95)', border:'1px solid #DDD6FE' }}>
                다음 승인 → {item.nextApprover}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 스크롤 바디 ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 36px' }}>

        {/* 확인 포인트 */}
        <div style={{ background:'#fff', borderRadius:'14px', padding:'13px 16px',
          boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'10px',
          borderLeft:'3px solid #4F46E5' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#4338CA',
            marginBottom:'5px', letterSpacing:'0.3px' }}>확인 포인트</div>
          <div style={{ fontSize:'12px', fontWeight:500, color:'#374151', lineHeight:1.65 }}>{item.keyPoint}</div>
        </div>

        {/* 승인 단계 현황 (execute 타입 + approvalStage 있을 때) */}
        {item.type === 'execute' && item.approvalStage != null && (
          <div style={{ background:'#fff', borderRadius:'14px', padding:'13px 16px',
            boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'10px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF',
              marginBottom:'12px', letterSpacing:'0.5px' }}>승인 단계 현황</div>

            {/* 단계 진행 바 */}
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'12px' }}>
              {[1, 2, 3].map((s, i) => {
                const isActive = s === item.approvalStage
                const isPast   = s < item.approvalStage || item.status === 'done'
                const stageLabels = { 1:'1차 승인', 2:'2차 승인', 3:'최종 승인' }
                const stageActors = { 1:'승인자', 2:'관리자', 3:'최고관리자' }
                return (
                  <div key={s} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 'none' : 1 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', minWidth:'54px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:'12px', fontWeight:700,
                        background: isPast ? '#10B981' : isActive ? theme.brandDark : '#F4F5F7',
                        color: isPast || isActive ? '#fff' : '#9CA3AF',
                        border: isActive ? `2px solid ${theme.brandDark}` : isPast ? '2px solid #10B981' : '2px solid #E9EAEC' }}>
                        {isPast ? '✓' : s}
                      </div>
                      <div style={{ fontSize:'9px', fontWeight:600, textAlign:'center',
                        color: isPast ? '#059669' : isActive ? theme.brandDark : '#C4C6CA' }}>
                        {stageLabels[s]}
                      </div>
                      <div style={{ fontSize:'8px', color: isPast ? '#6EE7B7' : isActive ? '#93C5FD' : '#D1D5DB' }}>
                        {stageActors[s]}
                      </div>
                    </div>
                    {i < 2 && (
                      <div style={{ flex:1, height:'2px', margin:'0 3px',
                        background: s < item.approvalStage ? '#10B981' : '#E9EAEC',
                        borderRadius:'99px', minWidth:'16px' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* 현재 단계 요약 행 */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              paddingTop:'10px', borderTop:'1px solid #F4F5F7' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'2px' }}>
                  현재 단계: {item.approvalStage}차 승인
                  {item.status === 'done' ? ' (완료)' : item.status === 'inprogress' ? ' 대기 중' : ' 검토 중'}
                </div>
                <div style={{ fontSize:'10px', color:'#9CA3AF' }}>요청자: {item.requester}</div>
              </div>
              {item.nextApprover && item.status !== 'done' && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'10px', color:'#9CA3AF', marginBottom:'2px' }}>다음 승인자</div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#7C3AED' }}>{item.nextApprover}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 집행 내용 */}
        <ExecutionDataSection item={item} />

        {/* 활동 타임라인 */}
        <div style={{ fontSize:'13px', fontWeight:700, color:'#111827',
          marginBottom:'8px', padding:'2px 4px' }}>활동 타임라인</div>
        <div style={{ background:'#fff', borderRadius:'14px', padding:'16px',
          boxShadow:'0 1px 6px rgba(0,0,0,0.06)', marginBottom:'14px' }}>
          <HistoryTimeline history={item.history} large brandColor={theme.brandDark} />
        </div>

        {/* 액션 버튼 */}
        {!isDone && item.canApprove && !item.staffCanView && (
          <>
            {/* review: 검수 승인 시 입금 안내 */}
            {item.type === 'review' && item.executionData?.stages && (() => {
              const cur = item.executionData.stages.find(s => s.status === 'review')
              return cur ? (
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'14px',
                  padding:'12px 16px', marginBottom:'10px',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E' }}>검수 승인 시 자동 입금</div>
                    <div style={{ fontSize:'11px', color:'#B45309', marginTop:'2px' }}>{cur.label} {cur.pct}% 단계 · 승인 즉시 집행</div>
                  </div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:'#D97706' }}>{fmt(cur.amount)}원</div>
                </div>
              ) : null
            })()}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
              <button onClick={() => onRequest(item)}
                style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:600,
                  background:'#fff', color:'#374151', border:'1px solid #E9EAEC',
                  cursor:'pointer', fontFamily:'inherit',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                추가 요청
              </button>
              <button onClick={() => { onReject(item); onClose() }}
                style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:700,
                  background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA',
                  cursor:'pointer', fontFamily:'inherit' }}>
                반려
              </button>
              <button onClick={() => { onApprove(item); onClose() }}
                style={{ height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:700,
                  background: theme.activeBtnGrad || theme.brandDark,
                  color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit',
                  boxShadow: theme.activeShadow || '0 2px 8px rgba(0,0,0,0.18)' }}>
                {item.type === 'review' ? '검수 승인' : '승인'}
              </button>
            </div>
          </>
        )}

        {/* 완료 시 닫기 */}
        {isDone && (
          <button onClick={onClose}
            style={{ width:'100%', height:'46px', borderRadius:'13px', fontSize:'13px', fontWeight:600,
              background:'#fff', color:'#374151', border:'1px solid #E9EAEC',
              cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            닫기
          </button>
        )}
      </div>
    </div>
  )
}

// ─── 개별 카드 ────────────────────────────────────────────
function ApprovalCard({ item, theme, onApprove, onReject, onRequest, onDetail }) {
  const [showHistory, setShowHistory] = useState(false)
  const locked       = !item.canApprove   // canApprove=false면 잠금 (staffViewOnly 포함)
  const staffViewOnly = item.staffCanView === true
  const isDone       = item.status === 'done'
  const isInProgress = item.status === 'inprogress'
  const doneMeta     = isDone ? DONE_META[item.doneType] : null
  const reviewStages = item.type === 'review' && item.executionData?.stages

  // 좌측 액센트 컬러
  const accentColor = isUrgent(item) && !isDone ? '#EF4444'
    : isInProgress ? '#F59E0B'
    : isDone && item.doneType === 'rejected' ? '#EF4444'
    : isDone ? '#10B981'
    : 'transparent'

  return (
    <div style={{
      background:'#fff', borderRadius:'16px', marginBottom:'10px',
      boxShadow:'0 1px 8px rgba(0,0,0,0.07)',
      borderLeft: `3px solid ${accentColor}`,
      opacity: locked && !staffViewOnly ? 0.72 : 1,
    }}>
      <div style={{ padding:'14px 16px' }}>

        {/* ── 1행: 카테고리 + 처리상태 + 긴급여부 + 시간 ── */}
        {(() => {
          const cm = CATEGORY_META[item.type] || { label:'승인필요', color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE' }
          const sb = getStatusBadge(item)
          return (
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px', flexWrap:'wrap' }}>
              {/* 카테고리 배지 */}
              <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                color:cm.color, background:cm.bg, border:`1px solid ${cm.border}` }}>
                {cm.label}
              </span>
              {/* 처리 상태 배지 */}
              <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                color:sb.color, background:sb.bg, border:`1px solid ${sb.border}` }}>
                {sb.label}
              </span>
              {/* 긴급 */}
              {!isDone && !isInProgress && isUrgent(item) && (
                <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                  color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA' }}>🔴 긴급</span>
              )}
              {/* 일반구성원 조회 전용 배지 */}
              {staffViewOnly && (
                <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                  color:'#059669', background:'#F0FDF4', border:'1px solid #BBF7D0' }}>👤 내가 요청</span>
              )}
              {/* 사용내역 추가 상태 */}
              {item.claimStatus === 'completed' && (
                <span style={{ padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                  color:'#047857', background:'#DCFCE7', border:'1px solid #BBF7D0' }}>내역제출완료</span>
              )}
              {item.evidenceStatus === 'completed' && (
                <span style={{ padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                  color:'#0E7490', background:'#CFFAFE', border:'1px solid #A5F3FC' }}>첨부완료</span>
              )}
              <span style={{ marginLeft:'auto', fontSize:'11px', color:'#C4C6CA', flexShrink:0 }}>
                {item.requestedAt}
              </span>
            </div>
          )
        })()}

        {/* ── 2행: 제목 + 금액 ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'3px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', lineHeight:1.4 }}>{item.title}</div>
          {item.amount != null && (
            <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', flexShrink:0, letterSpacing:'-0.5px' }}>
              {fmt(item.amount)}원
            </div>
          )}
        </div>
        <div style={{ fontSize:'12px', fontWeight:500, color:'#9CA3AF', marginBottom:'10px' }}>
          {item.requester} · {item.desc}
        </div>

        {/* ── review: 미니 단계 진행 바 ── */}
        {reviewStages && (
          <div style={{ display:'flex', gap:'5px', marginBottom:'10px' }}>
            {item.executionData.stages.map((s, i) => (
              <div key={i} style={{ flex:1 }}>
                <div style={{ height:'3px', borderRadius:'99px', marginBottom:'4px',
                  background: s.status === 'paid' ? '#10B981'
                    : s.status === 'review' ? '#F59E0B' : '#E9EAEC' }} />
                <div style={{ fontSize:'9px', fontWeight:600, textAlign:'center',
                  color: s.status === 'paid' ? '#059669'
                    : s.status === 'review' ? '#D97706' : '#C4C6CA' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 승인 단계 진행 배너 ── */}
        {item.status === 'inprogress' && item.history?.some(h => h.action?.includes('차 승인 완료')) && (
          <div style={{ background:'linear-gradient(135deg,#F0FDF4,#F0F9FF)', borderRadius:'10px',
            padding:'8px 12px', marginBottom:'8px', border:'1px solid #BBF7D0',
            display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'14px' }}>✓</span>
            <div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#047857', marginBottom:'1px' }}>
                {item.history.filter(h=>h.action?.includes('차 승인 완료')).slice(-1)[0]?.action}
              </div>
              {item.nextApprover && (
                <div style={{ fontSize:'10px', color:'#6B7280' }}>다음 승인자: {item.nextApprover}</div>
              )}
            </div>
          </div>
        )}

        {/* ── 확인 포인트 ── */}
        <div style={{ background:'#F8F9FF', borderRadius:'10px',
          padding:'9px 12px', marginBottom:'10px', borderLeft:'2.5px solid #818CF8' }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'#4338CA',
            marginBottom:'3px', letterSpacing:'0.3px' }}>확인 포인트</div>
          <div style={{ fontSize:'11px', fontWeight:500, color:'#374151', lineHeight:1.6 }}>{item.keyPoint}</div>
        </div>

        {/* ── 집행 정보 미니 행: category, scheduledDate, nextApprover ── */}
        {(item.executionData?.scheduledDate || item.executionData?.category || item.nextApprover) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'10px' }}>
            {item.executionData?.category && (() => {
              const cm = getCatMeta(item.executionData.category)
              return cm ? (
                <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                  background:cm.bg, color:cm.color, border:`1px solid ${cm.border}` }}>
                  {cm.icon} {cm.main} · {item.executionData.category}
                </span>
              ) : null
            })()}
            {item.executionData?.scheduledDate && (
              <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                background:'#F0FDF4', color:'#15803D', border:'1px solid #BBF7D0' }}>
                📅 {item.executionData.scheduledDate}
              </span>
            )}
            {item.nextApprover && !isDone && (
              <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'10px', fontWeight:600,
                background:'#FDF4FF', color:'#7C3AED', border:'1px solid #E9D5FF' }}>
                다음 승인 → {item.nextApprover}
              </span>
            )}
          </div>
        )}

        {/* ── staffCanView: 조회 전용 안내 배너 ── */}
        {staffViewOnly && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px',
            borderRadius:'9px', background:'#F0FDF4', marginBottom:'10px', border:'1px solid #BBF7D0' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <span style={{ fontSize:'11px', fontWeight:600, color:'#047857' }}>내가 채팅에서 요청한 항목 — 조회 전용</span>
          </div>
        )}
        {/* ── 권한 외 안내 ── */}
        {locked && !staffViewOnly && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 10px',
            borderRadius:'9px', background:'#F5F3FF', marginBottom:'10px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize:'11px', fontWeight:600, color:'#5B21B6' }}>{item.noAuthReason}</span>
          </div>
        )}

        {/* ── 처리 이력 토글 ── */}
        <button onClick={() => setShowHistory(v => !v)}
          style={{ width:'100%', background:'transparent', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:'5px', padding:'0 0 8px',
            fontFamily:'inherit', textAlign:'left' }}>
          <span style={{ fontSize:'11px', fontWeight:600, color:'#9CA3AF' }}>처리 이력 {item.history.length}건</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C4C6CA" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showHistory?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showHistory && <HistoryTimeline history={item.history} />}

        {/* ── 구분선 ── */}
        {!isDone && <div style={{ height:'1px', background:'#F4F5F7', marginBottom:'12px' }} />}

        {/* ── 액션 버튼: 미완료 + 권한 있음 ── */}
        {!isDone && !locked && !staffViewOnly && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'6px' }}>
            <button onClick={() => onDetail(item)}
              style={{ height:'36px', borderRadius:'10px', fontSize:'11px', fontWeight:600,
                background:'#F4F5F7', color:'#374151', border:'none',
                cursor:'pointer', fontFamily:'inherit' }}>
              상세보기
            </button>
            <button onClick={() => onRequest(item)}
              style={{ height:'36px', borderRadius:'10px', fontSize:'11px', fontWeight:600,
                background:'transparent', color:'#9CA3AF', border:'1px solid #E9EAEC',
                cursor:'pointer', fontFamily:'inherit' }}>
              추가요청
            </button>
            <button onClick={() => onReject(item)}
              style={{ height:'36px', borderRadius:'10px', fontSize:'11px', fontWeight:700,
                background:'transparent', color:'#DC2626', border:'1px solid #FECACA',
                cursor:'pointer', fontFamily:'inherit' }}>
              반려
            </button>
            <button onClick={() => onApprove(item)}
              style={{ height:'36px', borderRadius:'10px', fontSize:'11px', fontWeight:700,
                background: theme.activeBtnGrad || theme.brandDark,
                color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit',
                boxShadow: theme.activeShadow || '0 2px 8px rgba(0,0,0,0.18)' }}>
              {item.type === 'review' ? '검수 승인'
                : item.approvalStage ? `${item.approvalStage}차 승인`
                : '승인'}
            </button>
          </div>
        )}

        {/* ── staffCanView: 조회 전용 버튼 ── */}
        {!isDone && staffViewOnly && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => onDetail(item)}
              style={{ height:'36px', padding:'0 18px', borderRadius:'10px', fontSize:'11px', fontWeight:600,
                background:'#F0FDF4', color:'#047857', border:'1px solid #BBF7D0',
                cursor:'pointer', fontFamily:'inherit' }}>상세보기</button>
          </div>
        )}
        {/* ── 미완료 + 권한 외 ── */}
        {!isDone && locked && !staffViewOnly && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => onDetail(item)}
              style={{ flex:1, height:'36px', borderRadius:'10px', fontSize:'12px', fontWeight:600,
                background:'#F4F5F7', color:'#374151', border:'none',
                cursor:'pointer', fontFamily:'inherit' }}>상세보기</button>
            <button onClick={() => dialog.alert({ title: '처리 요청 전달', message: '상위 관리자에게 처리 요청을 전달합니다.' })}
              style={{ flex:1, height:'36px', borderRadius:'10px', fontSize:'12px', fontWeight:600,
                background:'#F5F3FF', color:'#5B21B6', border:'none',
                cursor:'pointer', fontFamily:'inherit' }}>처리 요청</button>
          </div>
        )}

        {/* ── 완료: 상세보기 ── */}
        {isDone && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => onDetail(item)}
              style={{ height:'32px', padding:'0 16px', borderRadius:'9px', fontSize:'11px', fontWeight:600,
                background:'#F4F5F7', color:'#6B7280', border:'none',
                cursor:'pointer', fontFamily:'inherit' }}>
              상세보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 유형 섹션 헤더 ──────────────────────────────────────
function TypeSectionHeader({ type, count, canBulk, onBulkApprove }) {
  const m = TYPE_META[type]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'7px',
      padding:'4px 2px', marginBottom:'7px', marginTop:'6px' }}>
      <span style={{ fontSize:'12px', fontWeight:700, color:'#111827' }}>{m.label}</span>
      <span style={{ fontSize:'11px', fontWeight:600, background:'#F3F4F6', color:'#6B7280',
        padding:'1px 8px', borderRadius:'20px' }}>{count}건</span>
      <div style={{ flex:1 }} />
      {canBulk && (
        <button onClick={onBulkApprove}
          style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700,
            background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE',
            cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'3px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          일괄 승인
        </button>
      )}
    </div>
  )
}

// ─── 확인 모달 ────────────────────────────────────────────
function ConfirmModal({ mode, item, onConfirm, onCancel, theme }) {
  const [reason, setReason]           = useState('')
  // ── 검수 요청 전용 상태 ──
  const [reworkReq, setReworkReq]     = useState(true)
  const [deadlineExt, setDeadlineExt] = useState(false)
  const [newDeadline, setNewDeadline] = useState('')
  const [reviewMsg, setReviewMsg]     = useState('결과물을 다시 제출해주세요.')
  const [reviewMsgEdited, setReviewMsgEdited] = useState(false)
  // ── 승인 요청 추가 서류 전용 상태 ──
  const [targetPerson, setTargetPerson] = useState('requester')   // 'requester'|'manager1'|'manager2'
  const [resubmitReq, setResubmitReq]   = useState(false)
  const [deadlineReq, setDeadlineReq]   = useState(false)
  const [deadlineDate, setDeadlineDate] = useState('')
  const [attachReq, setAttachReq]       = useState(false)
  const [suppleMsg, setSuppleMsg]       = useState('')
  // ── 증빙·소명 추가요청 전용 상태 ──
  const [claimReq, setClaimReq]   = useState(false)
  const [evidReq, setEvidReq]     = useState(false)
  const [message, setMessage]     = useState('')
  const [msgEdited, setMsgEdited] = useState(false)

  const isBulk      = mode === 'bulk'
  const isReject    = mode === 'reject'
  const isRequest   = mode === 'request'
  const isReview    = item?.type === 'review'
  const isEvidence  = item?.type === 'evidence'
  const isClaim     = item?.type === 'claim'
  const isEvidClaim = isEvidence || isClaim
  const title       = isBulk ? '일괄 승인' : isReject ? '반려' : isRequest ? '추가 서류 요청' : '승인'
  const desc        = isBulk
    ? `안전 등급 항목 ${item?.count}건을 일괄 승인합니다.`
    : `"${item?.title}"을(를) ${isReject ? '반려' : isRequest ? '추가 요청' : '승인'}합니다.`

  const autoMsg = (c, e) =>
    c && e ? '소명 및 영수증 증빙 부탁드립니다.'
    : c ? '소명 부탁드립니다.'
    : e ? '영수증 증빙 부탁드립니다.'
    : ''

  const toggleClaim = () => {
    const next = !claimReq
    setClaimReq(next)
    if (!msgEdited) setMessage(autoMsg(next, evidReq))
  }
  const toggleEvid = () => {
    const next = !evidReq
    setEvidReq(next)
    if (!msgEdited) setMessage(autoMsg(claimReq, next))
  }
  const toggleRework = () => {
    const next = !reworkReq
    setReworkReq(next)
    if (!reviewMsgEdited) setReviewMsg(next ? '결과물을 다시 제출해주세요.' : deadlineExt ? '마감일을 연장합니다.' : '')
  }
  const toggleDeadline = () => {
    const next = !deadlineExt
    setDeadlineExt(next)
    if (!next) setNewDeadline('')
    if (!reviewMsgEdited) setReviewMsg(reworkReq ? '결과물을 다시 제출해주세요.' : next ? '마감일을 연장합니다.' : '')
  }

  const canConfirmReview  = (reworkReq || deadlineExt) && (!deadlineExt || newDeadline) && reviewMsg.trim().length > 0
  const canConfirmApproval = (resubmitReq || deadlineReq || attachReq) && (!deadlineReq || deadlineDate) && suppleMsg.trim().length > 0
  const canConfirmEvidClaim = (claimReq || evidReq) && message.trim().length > 0
  const canConfirmRequest = isReview ? canConfirmReview : isEvidClaim ? canConfirmEvidClaim : canConfirmApproval
  const canConfirm = isRequest ? canConfirmRequest : (!isReject || reason.trim().length >= 5)

  // ── Toggle 컴포넌트 ──
  const Toggle = ({ on, color }) => (
    <div style={{ width:'40px', height:'22px', borderRadius:'11px',
      background: on ? color : '#D1D5DB', position:'relative',
      transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#fff',
        position:'absolute', top:'2px', left: on ? '20px' : '2px',
        transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )

  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
      zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#fff', borderRadius:'18px', padding:'22px 20px', width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'5px' }}>{title}</div>
        <div style={{ fontSize:'12px', color:'#6B7280', marginBottom:'14px', lineHeight:1.5 }}>{desc}</div>

        {/* ── 검수 요청 전용 UI ── */}
        {isRequest && isReview && (
          <>
            {/* 결과물 재요청 토글 */}
            <div onClick={toggleRework}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom:'8px', cursor:'pointer',
                background: reworkReq ? '#F5F3FF' : '#F9FAFB',
                border: `1.5px solid ${reworkReq ? '#C4B5FD' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700,
                  color: reworkReq ? '#6D28D9' : '#374151' }}>결과물 재요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>
                  수정된 결과물 재제출 요청
                </div>
              </div>
              <Toggle on={reworkReq} color="#7C3AED" />
            </div>

            {/* 마감일 연장 토글 */}
            <div onClick={toggleDeadline}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom: deadlineExt ? '8px' : '14px', cursor:'pointer',
                background: deadlineExt ? '#FFFBEB' : '#F9FAFB',
                border: `1.5px solid ${deadlineExt ? '#FDE68A' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700,
                  color: deadlineExt ? '#92400E' : '#374151' }}>마감일 연장</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>
                  새 마감일 지정 후 전달
                </div>
              </div>
              <Toggle on={deadlineExt} color="#D97706" />
            </div>

            {/* 날짜 입력 (마감일 연장 ON) */}
            {deadlineExt && (
              <div style={{ marginBottom:'14px', padding:'10px 13px', borderRadius:'12px',
                background:'#FFFBEB', border:'1.5px solid #FDE68A' }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'#92400E', marginBottom:'6px' }}>
                  새 마감일
                </div>
                <div style={{ width:'100%', overflow:'hidden', borderRadius:'8px' }}>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                    style={{ width:'100%', border:'1.5px solid #FCD34D', borderRadius:'8px',
                      padding:'8px 12px', fontSize:'13px', fontWeight:700, color:'#92400E',
                      fontFamily:'inherit', outline:'none', background:'#fff',
                      boxSizing:'border-box', WebkitAppearance:'none', appearance:'none' }}
                  />
                </div>
              </div>
            )}

            {/* 수정 메시지 */}
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151',
              marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              수정 메시지
              <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:400 }}>(직접 수정 가능)</span>
            </div>
            <textarea value={reviewMsg}
              onChange={e => { setReviewMsgEdited(true); setReviewMsg(e.target.value) }}
              rows={3}
              placeholder="수정 사항을 입력하세요"
              style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                resize:'none', outline:'none', background:'#F8F9FF', marginBottom:'12px',
                boxSizing:'border-box', lineHeight:1.6 }} />
          </>
        )}

        {/* ── 증빙·소명 추가 요청 UI ── */}
        {isRequest && isEvidClaim && (
          <>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>
              추가 요청 항목
            </div>

            {/* 소명요청 토글 */}
            <div onClick={toggleClaim}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom:'8px', cursor:'pointer',
                background: claimReq ? '#F0FDF4' : '#F9FAFB',
                border: `1.5px solid ${claimReq ? '#BBF7D0' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: claimReq ? '#047857' : '#374151' }}>소명요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>업무 연관성 · 사용 목적 소명 요구</div>
              </div>
              <Toggle on={claimReq} color="#059669" />
            </div>

            {/* 증빙요청 토글 */}
            <div onClick={toggleEvid}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom:'14px', cursor:'pointer',
                background: evidReq ? '#ECFEFF' : '#F9FAFB',
                border: `1.5px solid ${evidReq ? '#67E8F9' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: evidReq ? '#0E7490' : '#374151' }}>증빙요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>영수증 · 계약서 등 서류 첨부 요구</div>
              </div>
              <Toggle on={evidReq} color="#0891B2" />
            </div>

            {/* 전송 메시지 */}
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'6px',
              display:'flex', alignItems:'center', gap:'5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              전송 메시지
              <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:400 }}>(직접 수정 가능)</span>
            </div>
            <textarea value={message}
              onChange={e => { setMsgEdited(true); setMessage(e.target.value) }}
              rows={3} placeholder="요청 내용을 입력하세요"
              style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                resize:'none', outline:'none', background:'#F0FDF4', marginBottom:'12px',
                boxSizing:'border-box', lineHeight:1.6 }} />
          </>
        )}

        {/* ── 승인 요청 추가 서류 요청 UI ── */}
        {isRequest && !isReview && !isEvidClaim && (
          <>
            {/* 요청 대상자 선택 */}
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'7px' }}>
                요청 대상자
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                {(() => {
                  // 동적 대상자 목록: approvalStage + has2ndStage 기반
                  const stage = item?.approvalStage || 0
                  const has2nd = item?.has2ndStage
                  const allOpts = [
                    { id:'requester', label:'최초 요청자', subLabel: item?.requester || '', icon:'👤' },
                    { id:'manager1',  label:'1차 담당자',  subLabel: stage >= 1 ? '승인자' : '', icon:'👔' },
                    { id:'manager2',  label:'2차 담당자',  subLabel: stage >= 2 ? '관리자' : '', icon:'🏢' },
                  ]
                  // 보여줄 옵션 결정
                  let visibleOpts = [allOpts[0]] // 최초 요청자는 항상
                  if (stage >= 1) visibleOpts.push(allOpts[1]) // 1차 이상이면 1차 담당자
                  if (stage >= 2) visibleOpts.push(allOpts[2]) // 2차 이상이면 2차 담당자
                  return visibleOpts.map(opt => {
                    const on = targetPerson === opt.id
                    return (
                      <button key={opt.id} onClick={() => setTargetPerson(opt.id)}
                        style={{ flex:1, padding:'8px 4px', borderRadius:'10px', border:'none',
                          cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                          background: on ? theme.brand : '#F3F4F6',
                          boxShadow: on ? `0 2px 8px ${theme.brand}40` : 'none' }}>
                        <div style={{ fontSize:'15px', marginBottom:'3px' }}>{opt.icon}</div>
                        <div style={{ fontSize:'10px', fontWeight:700, color: on ? '#fff' : '#6B7280', lineHeight:1.3 }}>
                          {opt.label}
                        </div>
                        {opt.subLabel ? (
                          <div style={{ fontSize:'9px', color: on ? 'rgba(255,255,255,0.75)' : '#9CA3AF', marginTop:'1px' }}>
                            {opt.subLabel}
                          </div>
                        ) : null}
                      </button>
                    )
                  })
                })()}
              </div>
            </div>

            {/* 재제출 요청 토글 */}
            <div onClick={() => setResubmitReq(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 13px', borderRadius:'12px', marginBottom:'7px', cursor:'pointer',
                background: resubmitReq ? '#EEF2FF' : '#F9FAFB',
                border: `1.5px solid ${resubmitReq ? '#A5B4FC' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: resubmitReq ? '#3730A3' : '#374151' }}>재제출 요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>서류·양식 재작성 후 재제출</div>
              </div>
              <Toggle on={resubmitReq} color="#4F46E5" />
            </div>

            {/* 요청 기한 토글 */}
            <div onClick={() => { setDeadlineReq(v => !v); if (deadlineReq) setDeadlineDate('') }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 13px', borderRadius:'12px', marginBottom: deadlineReq ? '7px' : '7px', cursor:'pointer',
                background: deadlineReq ? '#FFFBEB' : '#F9FAFB',
                border: `1.5px solid ${deadlineReq ? '#FDE68A' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: deadlineReq ? '#92400E' : '#374151' }}>요청 기한</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>처리 마감일 지정</div>
              </div>
              <Toggle on={deadlineReq} color="#D97706" />
            </div>

            {/* 날짜 입력 (요청 기한 ON) */}
            {deadlineReq && (
              <div style={{ marginBottom:'7px', padding:'9px 13px', borderRadius:'10px',
                background:'#FFFBEB', border:'1.5px solid #FDE68A' }}>
                <div style={{ fontSize:'10px', fontWeight:600, color:'#92400E', marginBottom:'5px' }}>마감일</div>
                <div style={{ width:'100%', overflow:'hidden', borderRadius:'8px' }}>
                  <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                    style={{ width:'100%', border:'1.5px solid #FCD34D', borderRadius:'8px',
                      padding:'7px 11px', fontSize:'13px', fontWeight:700, color:'#92400E',
                      fontFamily:'inherit', outline:'none', background:'#fff', boxSizing:'border-box',
                      WebkitAppearance:'none', appearance:'none' }} />
                </div>
              </div>
            )}

            {/* 첨부 파일 요청 토글 */}
            <div onClick={() => setAttachReq(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 13px', borderRadius:'12px', marginBottom:'12px', cursor:'pointer',
                background: attachReq ? '#ECFEFF' : '#F9FAFB',
                border: `1.5px solid ${attachReq ? '#67E8F9' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: attachReq ? '#0E7490' : '#374151' }}>첨부 파일 요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>영수증·증빙·계약서 등 파일 첨부</div>
              </div>
              <Toggle on={attachReq} color="#0891B2" />
            </div>

            {/* 보완 요청 메시지 */}
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151',
              marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              보완 요청 메시지
            </div>
            <textarea value={suppleMsg} onChange={e => setSuppleMsg(e.target.value)}
              rows={3} placeholder="보완이 필요한 사항을 입력하세요"
              style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                resize:'none', outline:'none', background:'#F8F9FF', marginBottom:'12px',
                boxSizing:'border-box', lineHeight:1.6 }} />
          </>
        )}

        {/* ── 반려 사유 ── */}
        {isReject && (
          <>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', marginBottom:'7px' }}>빠른 사유 선택</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
              {[
                '금액 확인 필요',
                '증빙 부족',
                '계약서 확인 필요',
                '지급 목적 불일치',
                '수신자 정보 확인 필요',
                '출금 지갑 확인 필요',
                '기타',
              ].map(preset => (
                <button key={preset}
                  onClick={() => setReason(prev => prev ? prev + ' / ' + preset : preset)}
                  style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600,
                    background: reason.includes(preset) ? '#FEE2E2' : '#F4F5F7',
                    color: reason.includes(preset) ? '#DC2626' : '#6B7280',
                    border: reason.includes(preset) ? '1px solid #FECACA' : '1px solid #E9EAEC',
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                  {preset}
                </button>
              ))}
            </div>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder='반려 사유를 입력하세요 (5자 이상)'
              rows={3}
              style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                resize:'none', outline:'none', background:'#F9FAFB', marginBottom:'12px',
                boxSizing:'border-box' }} />
          </>
        )}

        {/* ── 승인 / 일괄 승인 ── */}
        {!isReject && !isRequest && (
          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'10px',
            padding:'9px 12px', marginBottom:'12px', fontSize:'11px', color:'#047857', lineHeight:1.5 }}>
            {isBulk
              ? '✓ 선택 항목을 일괄 승인합니다. 이 작업은 취소할 수 없습니다.'
              : item?.has2ndStage
                ? `✓ ${item?.approvalStage}차 승인 처리 후 다음 승인자에게 전달됩니다.`
                : '✓ 최종 승인 즉시 집행 처리됩니다. 이 작업은 취소할 수 없습니다.'
            }
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <button onClick={onCancel}
            style={{ height:'44px', borderRadius:'12px', fontSize:'13px', fontWeight:600,
              background:'#F4F5F7', color:'#374151', border:'1px solid #E9EAEC',
              cursor:'pointer', fontFamily:'inherit' }}>취소</button>
          <button
            onClick={() => isRequest
              ? isReview
                ? onConfirm({ message: reviewMsg, reworkRequest: reworkReq, deadlineExtension: deadlineExt, newDeadline })
                : isEvidClaim
                  ? onConfirm({ message, claimRequest: claimReq, evidenceRequest: evidReq })
                  : onConfirm({ message: suppleMsg, targetPerson, resubmitRequest: resubmitReq, deadlineRequest: deadlineReq, deadlineDate, attachmentRequest: attachReq })
              : onConfirm(reason)
            }
            disabled={!canConfirm}
            style={{ height:'44px', borderRadius:'12px', fontSize:'13px', fontWeight:700,
              background: isReject ? '#DC2626' : (theme.activeBtnGrad || theme.brandDark),
              color:'#fff', border:'none', cursor: canConfirm?'pointer':'default',
              fontFamily:'inherit', opacity: canConfirm?1:0.45,
              boxShadow: isReject?'none':(theme.activeShadow||'none') }}>
            {isRequest ? '💬 메시지로 전송' : title}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
const STATUS_TABS = [
  { id:'all',        label:'전체'   },
  { id:'inprogress', label:'진행 중' },
  { id:'rejected',   label:'반려'   },
  { id:'done',       label:'완료'   },
]

// 내부 검토 카테고리 탭 — 8개 슬라이드 스크롤
const OUTGOING_CHIPS = [
  { id:'all',         label:'전체',   activeBg: '#111827',  activeColor:'#fff' },
  { id:'approval',    label:'승인필요', activeBg:'#1D4ED8',  activeColor:'#fff' },
  { id:'usageCheck',  label:'내역확인', activeBg:'#D97706',  activeColor:'#fff' },
  { id:'settlement',  label:'정산요청', activeBg:'#059669',  activeColor:'#fff' },
  { id:'refundReq',   label:'상환요청', activeBg:'#DC2626',  activeColor:'#fff' },
  { id:'dataReq',     label:'자료요청', activeBg:'#6D28D9',  activeColor:'#fff' },
]
// 받은 요청 카테고리 칩
const INCOMING_CHIPS = [
  { id:'all',         label:'전체',       activeBg:'#111827', activeColor:'#fff' },
  { id:'evidenceIn',  label:'내역증빙',   activeBg:'#0891B2', activeColor:'#fff' },
  { id:'reviewReq',   label:'검수요청',   activeBg:'#7C3AED', activeColor:'#fff' },
  { id:'dataRequest', label:'자료요청',   activeBg:'#6D28D9', activeColor:'#fff' },
  { id:'refund',      label:'상환요청',   activeBg:'#DC2626', activeColor:'#fff' },
]

export default function ApprovalCenter() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = getAccountTheme()
  const { currentUser } = useUser()
  const scrollRef = useScrollRestore()

  // 현재 로그인 사용자의 승인 권한 동적 계산
  const myAuthority = useMemo(() => {
    const ssRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
    const role = ssRole || currentUser?.role || ''
    const auth = ROLE_TO_AUTHORITY[role]
    return auth !== undefined ? auth : 0
  }, [currentUser])
  const isSuperAdmin = myAuthority === 'super'

  const [reqDir, setReqDir]             = useState((location.state?.reqDir) || 'outgoing')  // 'outgoing'=내부 검토 | 'incoming'=받은 요청
  const [activeStatus, setActiveStatus] = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [approvals, setApprovals]       = useState(INIT_APPROVALS)
  const [modal, setModal]               = useState(null)
  const [toast, setToast]               = useState(null)
  const [detailItem, setDetailItem]     = useState(null)
  const [stageFilter, setStageFilter]   = useState('all')  // 최고관리자는 전체, 나머지는 첫 렌더 후 조정

  // 일반구성원: 채팅에서 본인이 요청한 항목만 조회 가능
  const STAFF_VIEWABLE_TYPES = ['wallet', 'refund', 'dataRequest']
  const isStaff = !isSuperAdmin && myAuthority === null &&
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : '') === 'staff'

  // 최고관리자는 모든 항목 canApprove 처리
  const effectiveApprovals = useMemo(() => {
    if (isSuperAdmin)
      return approvals.map(a => ({ ...a, canApprove: true }))
    if (isStaff) {
      // staff: 승인 권한 없음, 단 본인이 채팅에서 요청한 타입(outgoing)은 staffCanView=true
      return approvals.map(a => ({
        ...a,
        canApprove: false,
        staffCanView: a.staffRequested === true &&
          STAFF_VIEWABLE_TYPES.includes(a.type) &&
          (a.direction || 'outgoing') === 'outgoing',
      }))
    }
    if (!myAuthority)  // null(viewer) 또는 0
      return approvals.map(a => ({ ...a, canApprove: false }))
    // accounting(1)/manager(1): 1단계만 · admin(2): 1~2단계
    return approvals.map(a => ({
      ...a,
      canApprove: a.canApprove && (!a.approvalStage || a.approvalStage <= myAuthority),
    }))
  }, [approvals, isSuperAdmin, myAuthority, isStaff])

  const myItems = effectiveApprovals.filter(a =>
    (a.canApprove || a.staffCanView) && (a.direction || 'outgoing') === reqDir
  )
  const tabCounts = {
    all:        myItems.length,
    inprogress: myItems.filter(a => a.status==='pending' || a.status==='inprogress').length,
    rejected:   myItems.filter(a => a.status==='done' && a.doneType==='rejected').length,
    done:       myItems.filter(a => a.status==='done' && a.doneType!=='rejected').length,
  }
  const urgentCount = effectiveApprovals.filter(a => a.status==='pending' && a.urgent && a.canApprove).length

  const filtered = effectiveApprovals.filter(a => {
    if ((a.direction || 'outgoing') !== reqDir) return false
    // staff 조회 전용 항목: 방향만 맞으면 전체 탭 + 해당 타입 탭에서 표시
    if (a.staffCanView) {
      if (!matchStatus(a, activeStatus)) return false
      if (typeFilter === 'all') return true
      if (typeFilter === 'settlement'  && a.type === 'wallet')      return true
      if (typeFilter === 'refundReq'   && a.type === 'refund')      return true
      if (typeFilter === 'dataReq'     && a.type === 'dataRequest') return true
      return false
    }
    if (!matchStatus(a, activeStatus)) return false
    if (!matchType(a, typeFilter, myAuthority)) return false
    if (typeFilter === 'approval' && stageFilter !== 'all' && a.approvalStage) {
      if (a.approvalStage !== stageFilter) return false
    }
    return true
  })

  const typeOrder = ['review','execute','card','mcc','claim','evidence','wallet']
  const grouped = filtered.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})
  const orderedTypes = typeOrder.filter(t => grouped[t])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  const handleApprove = (item) => setModal({ mode:'approve', item })
  const handleReject  = (item) => setModal({ mode:'reject',  item })
  const handleRequest = (item) => setModal({ mode:'request', item })
  const handleDetail  = (item) => setDetailItem(item)

  const handleBulkApprove = (type) => {
    const items = (grouped[type]||[]).filter(i => (isSuperAdmin || i.canApprove) && i.riskLevel==='low')
    setModal({ mode:'bulk', item:{ count:items.length, type, ids:items.map(i=>i.id) } })
  }

  const handleConfirm = (data) => {
    const { mode, item } = modal
    const now = new Date()
    const ts = `${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const reason = typeof data === 'string' ? data : ''

    if (mode === 'approve') {
      const needs2nd = item.has2ndStage === true
      const stageLabel = item.approvalStage === 1 ? '1차' : item.approvalStage === 2 ? '2차' : '최종'
      const histAction = needs2nd ? `${stageLabel} 승인 완료` : '최종 승인 완료'
      const toastMsg = needs2nd
        ? `✓ ${stageLabel} 승인 완료 · 다음 승인자에게 전달됨`
        : '✓ 최종 승인 완료 · 집행 진행'
      setApprovals(prev => prev.map(a => a.id !== item.id ? a : {
        ...a,
        status: needs2nd ? 'inprogress' : 'done',
        ...(needs2nd
          ? { approvalStage: a.approvalStage + 1, has2ndStage: false }
          : { doneType: 'approved' }
        ),
        history: [...a.history, { action: histAction, actor: '나', time: ts, note: reason || '정상 처리' }]
      }))
      pushApprovalMsg({
        action: needs2nd ? 'approved' : 'approved',
        actor: '나',
        itemTitle: `${item.title || item.requester || ''} — ${(item.amount||0).toLocaleString()}원`,
        note: reason || null,
        requesterId: item.requester,
      })
      showToast(toastMsg)
      setActiveStatus(needs2nd ? 'inprogress' : 'done')
    } else if (mode === 'reject') {
      setApprovals(prev => prev.map(a => a.id!==item.id ? a : {
        ...a, status:'done', doneType:'rejected',
        history:[...a.history,{ action:'반려', actor:'나', time:ts, note:reason }]
      }))
      pushApprovalMsg({
        action: 'inspection_rejected',
        actor: '나',
        itemTitle: `${item.title || item.requester || ''} — ${(item.amount||0).toLocaleString()}원`,
        note: reason || null,
        requesterId: item.requester,
      })
      showToast('반려 처리 완료 · 사유 전달됨'); setActiveStatus('rejected')
    } else if (mode === 'request') {
      if (item.type === 'evidence' || item.type === 'claim') {
        // ── 증빙·소명 추가 요청 처리 ──
        const { message: msg, claimRequest, evidenceRequest } = data
        const parts = [claimRequest && '소명 요청', evidenceRequest && '증빙 요청'].filter(Boolean)
        const reqLabel = parts.join(' + ') || '추가 요청'
        const newHistEntry = { action:`${reqLabel} 전송`, actor:'나', time:ts, note:msg }
        setApprovals(prev => prev.map(a => a.id!==item.id ? a : {
          ...a, status:'inprogress',
          history:[...a.history, newHistEntry]
        }))
        if (detailItem?.id === item.id) {
          setDetailItem(prev => ({ ...prev, status:'inprogress', history:[...prev.history, newHistEntry] }))
        }
        pushApprovalMsg({
          action: 'extra_docs',
          actor: '나',
          itemTitle: `${item.title || item.requester || ''} — ${reqLabel}`,
          note: data.message || null,
          requesterId: item.requester,
        })
        showToast('💬 추가 요청이 전달됐습니다'); setActiveStatus('inprogress')
      } else if (item.type === 'review') {
        // ── 검수 요청 전용 처리 ──
        const { message, reworkRequest, deadlineExtension, newDeadline } = data
        const parts = []
        if (reworkRequest)    parts.push('결과물 재요청')
        if (deadlineExtension) parts.push(`마감일 연장${newDeadline ? ` (${newDeadline})` : ''}`)
        const reqLabel = parts.join(' + ') || '추가 요청'
        const newHistEntry = { action:`${reqLabel} 전송`, actor:'나', time:ts, note:message }
        setApprovals(prev => prev.map(a => a.id!==item.id ? a : {
          ...a, status:'inprogress',
          history:[...a.history, newHistEntry]
        }))
        if (detailItem?.id === item.id) {
          setDetailItem(prev => ({ ...prev, status:'inprogress', history:[...prev.history, newHistEntry] }))
        }
        pushApprovalMsg({
          action: 'inspection_approved',
          actor: '나',
          itemTitle: `${item.title || item.requester || ''} — ${reqLabel}`,
          note: message || null,
          requestedDocs: reworkRequest ? ['결과물 재제출'] : null,
          requesterId: item.requester,
        })
        showToast('💬 검수 요청 전달 완료'); setActiveStatus('inprogress')
        setTimeout(() => navigate('/messages', { state: { threadId: '1' } }), 600)
      } else {
        // ── 일반 추가 서류 요청 처리 ──
        const { message, targetPerson, resubmitRequest, deadlineRequest, deadlineDate, attachmentRequest } = data
        const targetLabel = targetPerson === 'requester' ? '최초 요청자' : targetPerson === 'manager1' ? '1차 담당자' : '2차 담당자'
        const reqParts = [
          resubmitRequest && '재제출 요청',
          deadlineRequest && `기한(${deadlineDate})`,
          attachmentRequest && '첨부 파일 요청',
        ].filter(Boolean)
        const reqLabel = reqParts.length ? `보완 요청 (${reqParts.join(' · ')})` : '보완 요청'
        const newHistEntry = { action:`${reqLabel} → ${targetLabel}`, actor:'나', time:ts, note:message }
        setApprovals(prev => prev.map(a => a.id!==item.id ? a : {
          ...a, status:'inprogress',
          history:[...a.history, newHistEntry]
        }))
        if (detailItem?.id === item.id) {
          setDetailItem(prev => ({
            ...prev, status:'inprogress',
            history:[...prev.history, newHistEntry]
          }))
        }
        pushApprovalMsg({
          action: 'extra_docs',
          actor: '나',
          itemTitle: `${item.title || item.requester || ''} → ${targetLabel}`,
          note: message || null,
          requestedDocs: reqParts.length ? reqParts : null,
          requesterId: item.requester,
        })
        showToast('💬 메시지로 전달 완료'); setActiveStatus('inprogress')
      }
    } else if (mode === 'bulk') {
      setApprovals(prev => prev.map(a =>
        !(item.ids||[]).includes(a.id) ? a : {
          ...a, status:'done', doneType:'approved',
          history:[...a.history,{ action:'일괄 승인', actor:'나', time:ts, note:'일괄 처리' }]
        }
      ))
      pushApprovalMsg({
        action: 'approved',
        actor: '나',
        itemTitle: `${item.type} 유형 ${item.count}건 일괄 승인`,
        note: '일괄 처리',
        requesterId: null,
      })
      showToast(`✓ ${item.count}건 일괄 승인 완료`); setActiveStatus('done')
    }
    setModal(null)
  }

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>

        {/* ── 헤더 ── */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(28px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'0', paddingLeft:'16px', flexShrink:0 }}>

          {/* ── 1행: 뒤로가기 · 타이틀 · 배지 ── */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <button onClick={() => navigate(-1)}
              style={{ width:'34px', height:'34px', borderRadius:'10px', background:'transparent',
                border:'none', display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', letterSpacing:'-0.2px' }}>처리 센터</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>
                {reqDir === 'outgoing'
                  ? (activeStatus==='all' ? '내부 검토 전체' : activeStatus==='inprogress' ? '진행 중인 항목' : activeStatus==='rejected' ? '반려된 항목' : '처리 완료')
                  : '받은 요청 · 메시지 연동 예정'}
              </div>
            </div>
            <div style={{ display:'flex', gap:'6px', flexShrink:0, alignItems:'center' }}>
              {urgentCount > 0 && (
                <span style={{ padding:'4px 9px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
                  color:'#FCA5A5', background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.4)',
                  display:'flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#EF4444', display:'inline-block' }} />
                  긴급 {urgentCount}
                </span>
              )}
              {isSuperAdmin && (
                <span style={{ padding:'4px 9px', borderRadius:'20px', background:'rgba(237,233,254,0.9)',
                  color:'#7C3AED', fontSize:'10px', fontWeight:800, whiteSpace:'nowrap' }}>
                  👑 최고관리자
                </span>
              )}
            </div>
          </div>

          {/* ── 2행: 내부 검토 / 받은 요청 세그먼트 토글 ── */}
          <div style={{ display:'flex', gap:'0', marginBottom:'14px',
            background:'rgba(0,0,0,0.18)', borderRadius:'14px', padding:'3px' }}>
            {[
              { id:'outgoing', label:'내부 검토', emoji:'📤' },
              { id:'incoming', label:'받은 요청', emoji:'📥' },
            ].map(d => {
              const isOn = reqDir === d.id
              return (
                <button key={d.id}
                  onClick={() => { setReqDir(d.id); setTypeFilter('all'); setActiveStatus('all') }}
                  style={{ flex:1, height:'38px', borderRadius:'11px',
                    background: isOn ? 'rgba(255,255,255,0.95)' : 'transparent',
                    color: isOn ? theme.brandDark : 'rgba(255,255,255,0.65)',
                    border:'none', cursor:'pointer', fontFamily:'inherit',
                    fontSize:'13px', fontWeight: isOn ? 700 : 500,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                    transition:'all 0.18s',
                    boxShadow: isOn ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>
                  <span style={{ fontSize:'14px' }}>{d.emoji}</span>
                  <span>{d.label}</span>
                  {d.id === 'outgoing' && (
                    <span style={{ fontSize:'10px', fontWeight:700,
                      background: isOn ? theme.brandDark : 'rgba(255,255,255,0.2)',
                      color: isOn ? '#fff' : 'rgba(255,255,255,0.8)',
                      padding:'1px 6px', borderRadius:'10px', lineHeight:'16px' }}>
                      {tabCounts.all}
                    </span>
                  )}
                  {d.id === 'incoming' && (
                    <span style={{ fontSize:'10px', fontWeight:700,
                      background: isOn ? '#E9EAEC' : 'rgba(255,255,255,0.2)',
                      color: isOn ? '#9CA3AF' : 'rgba(255,255,255,0.7)',
                      padding:'1px 6px', borderRadius:'10px', lineHeight:'16px' }}>
                      준비중
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── 3행: 상태 탭 (전체/진행중/반려/완료) — 항상 표시 ── */}
          <div style={{ display:'flex', gap:'3px' }}>
            {STATUS_TABS.map(tab => {
              const isActive = activeStatus === tab.id
              const activeColor = tab.id === 'rejected' ? '#DC2626' : theme.brandDark
              return (
                <button key={tab.id} onClick={() => setActiveStatus(tab.id)}
                  style={{ flex:1, height:'44px', borderRadius:'12px 12px 0 0',
                    background: isActive ? '#fff' : 'rgba(255,255,255,0.1)',
                    color: isActive ? activeColor : 'rgba(255,255,255,0.65)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    borderBottom:'none', fontSize:'12px', fontWeight: isActive?700:500,
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2px' }}>
                  <span style={{ fontSize:'12px', fontWeight: isActive?700:500 }}>{tab.label}</span>
                  <span style={{ fontSize:'10px', fontWeight:700, opacity: isActive?1:0.6 }}>{tabCounts[tab.id]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 카테고리 탭 — 가로 슬라이드 스크롤 ── */}
        {(() => {
          const chips = reqDir === 'outgoing' ? OUTGOING_CHIPS : INCOMING_CHIPS
          const showStageBorder = reqDir === 'outgoing' && typeFilter === 'approval'
          return (
            <div style={{
              position:'relative', flexShrink:0,
              background:'#fff',
              borderBottom: showStageBorder ? 'none' : '1px solid #EEEFF2',
            }}>
              {/* 스크롤 트랙 — 오른쪽에 반쪽짜리 탭이 걸쳐 보이도록 paddingRight 없음 */}
              <div style={{
                overflowX:'auto', display:'flex', alignItems:'center',
                gap:'6px',
                paddingTop:'10px', paddingBottom:'10px', paddingLeft:'16px', paddingRight:'0px',
                scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
                scrollSnapType:'x mandatory',
              }}>
                {chips.map((f, idx) => {
                  const isActive = typeFilter === f.id
                  const isLast = idx === chips.length - 1
                  return (
                    <button key={f.id}
                      onClick={() => {
                        setTypeFilter(f.id)
                        if (reqDir === 'outgoing') setStageFilter(isSuperAdmin ? 'all' : myAuthority)
                      }}
                      style={{
                        flexShrink:0, whiteSpace:'nowrap',
                        scrollSnapAlign:'start',
                        minWidth:'80px',
                        padding:'5px 14px',
                        borderRadius:'20px',
                        fontSize:'12px', fontWeight: isActive ? 700 : 500,
                        cursor:'pointer', fontFamily:'inherit',
                        transition:'all 0.2s cubic-bezier(.4,0,.2,1)',
                        border: isActive ? 'none' : '1px solid #E4E6EA',
                        background: isActive ? f.activeBg : '#F7F8FA',
                        color: isActive ? f.activeColor : '#6B7280',
                        boxShadow: isActive ? `0 2px 10px ${f.activeBg}44` : 'none',
                        transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                        textAlign:'center',
                      }}>
                      {f.label}
                    </button>
                  )
                })}
                {/* 반쪽 피킹용 — 마지막 다음 탭 미리보기 효과를 위한 여백 */}
                <div style={{ minWidth:'40px', flexShrink:0 }} />
              </div>
              {/* 우측 엣지 인너 섀도 — 스크롤 가능 암시 */}
              <div style={{
                position:'absolute', right:0, top:0, bottom:0, width:'40px',
                background:'linear-gradient(to right, transparent, rgba(240,241,243,0.95))',
                pointerEvents:'none',
                display:'flex', alignItems:'center', justifyContent:'flex-end',
                paddingRight:'6px',
              }}>
                <span style={{
                  fontSize:'14px', color:'#9CA3AF', lineHeight:1,
                  textShadow:'0 0 4px rgba(240,241,243,1)',
                }}>›</span>
              </div>
            </div>
          )
        })()}

        {/* ── 승인 단계 서브칩 (승인필요 탭에서만) ── */}
        {reqDir === 'outgoing' && typeFilter === 'approval' && (
          <div style={{ background:'#fff', borderBottom:'1px solid #F0F1F3', flexShrink:0,
            padding:'10px 14px 12px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'11px', fontWeight:700, color:'#9CA3AF', flexShrink:0 }}>
              승인 단계
            </span>
            {[
              { stage:'all', label:'전체', color: theme.brandDark },
              { stage:1, label:'1차', color:'#1D4ED8' },
              { stage:2, label:'2차', color:'#7C3AED' },
              { stage:3, label:'3차', color:'#DC2626' },
            ].map(s => {
              const isOn = stageFilter === s.stage
              const isMine = isSuperAdmin ? s.stage === 'all' : s.stage === myAuthority
              return (
                <button key={s.stage}
                  onClick={() => setStageFilter(s.stage)}
                  style={{ padding:'4px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:700,
                    flexShrink:0, whiteSpace:'nowrap',
                    background: isOn ? s.color : '#F4F5F7',
                    color: isOn ? '#fff' : isMine ? s.color : '#6B7280',
                    border: isOn ? 'none' : isMine ? `2px solid ${s.color}` : '1px solid #E9EAEC',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  {isMine ? `● ${s.label}` : s.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── 콘텐츠 ── */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background:'#F4F5F7', padding:'12px 14px 32px' }}>

          {/* staff 조회 전용 안내 배너 */}
          {isStaff && reqDir === 'outgoing' && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px',
              borderRadius:'13px', background:'#F0FDF4', border:'1px solid #BBF7D0', marginBottom:'12px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:'#D1FAE5',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#047857', marginBottom:'2px' }}>
                  일반구성원 — 조회 전용
                </div>
                <div style={{ fontSize:'11px', color:'#6B7280', lineHeight:1.5 }}>
                  채팅에서 요청한 정산·상환·자료 항목을 확인할 수 있습니다.
                </div>
              </div>
            </div>
          )}

          {/* 받은 요청 — 아이템 있으면 리스트, 없으면 빈 상태 */}
          {reqDir === 'incoming' && (filtered.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
              padding:'52px 24px', textAlign:'center' }}>
              <div style={{ width:'72px', height:'72px', borderRadius:'22px', marginBottom:'18px',
                background:'linear-gradient(135deg,#EDE9FE,#DBEAFE)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>
                📥
              </div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'8px' }}>
                받은 요청 없음
              </div>
              <div style={{ fontSize:'12px', color:'#9CA3AF', lineHeight:1.7, maxWidth:'240px' }}>
                내역증빙 · 자료 · 상환 요청 등<br/>
                들어온 요청이 없습니다.
              </div>
            </div>
          ) : (
            filtered.map(item => (
              <ApprovalCard key={item.id} item={item} theme={theme}
                onApprove={handleApprove} onReject={handleReject}
                onRequest={handleRequest} onDetail={handleDetail} />
            ))
          ))}

          {reqDir === 'outgoing' && (orderedTypes.length === 0 ? (
            <div style={{ padding:'52px 0 40px', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'20px', marginBottom:'16px',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: activeStatus==='rejected'?'#FEF2F2':activeStatus==='done'?'#F0FDF4':'#EFF6FF',
                border:`1.5px solid ${activeStatus==='rejected'?'#FECACA':activeStatus==='done'?'#BBF7D0':'#BFDBFE'}` }}>
                {activeStatus==='rejected' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                ) : activeStatus==='done' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : activeStatus==='inprogress' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>
                {activeStatus==='rejected'?'반려 내역이 없습니다'
                  :activeStatus==='done'?'완료된 항목이 없습니다'
                  :activeStatus==='inprogress'?'진행 중인 항목이 없습니다'
                  :typeFilter!=='all'?'해당 유형의 요청이 없습니다'
                  :'처리 대기 항목이 없습니다'}
              </div>
              <div style={{ fontSize:'12px', color:'#9CA3AF', lineHeight:1.8, textAlign:'center', maxWidth:'220px' }}>
                {activeStatus==='rejected'?'처리된 반려 이력이 생기면\n여기에 표시됩니다.'
                  :activeStatus==='done'?'승인이 완료된 항목이\n여기에 표시됩니다.'
                  :activeStatus==='inprogress'?'추가 서류 요청 후\n응답 대기 항목이 표시됩니다.'
                  :typeFilter!=='all'?'다른 유형을 선택하거나\n전체 탭을 확인해 보세요.'
                  :isStaff?'채팅 메시지에서 정산·상환·자료 요청을\n보내면 여기에 표시됩니다.'
                  :'모든 요청이 처리됐거나\n아직 접수된 요청이 없습니다.'}
              </div>
            </div>
          ) : (
filtered.map(item => (
                <ApprovalCard key={item.id} item={item} theme={theme}
                  onApprove={handleApprove} onReject={handleReject}
                  onRequest={handleRequest} onDetail={handleDetail} />
              ))
          ))}
        </div>

        {/* ── 상세 화면 ── */}
        {detailItem && (
          <DetailSheet item={detailItem} theme={theme} onClose={() => setDetailItem(null)}
            onApprove={(item) => { setDetailItem(null); handleApprove(item) }}
            onReject={(item) => { setDetailItem(null); handleReject(item) }}
            onRequest={(item) => { handleRequest(item) }} />
        )}

        {/* ── 확인 모달 ── */}
        {modal && (
          <ConfirmModal mode={modal.mode} item={modal.item} theme={theme}
            onConfirm={handleConfirm} onCancel={() => setModal(null)} />
        )}

        {/* ── 토스트 ── */}
        {toast && (
          <div style={{ position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)',
            background:'#111827', color:'#fff', padding:'9px 18px', borderRadius:'20px',
            fontSize:'12px', fontWeight:600, whiteSpace:'nowrap', zIndex:400,
            boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
          }}>
            {toast}
          </div>
        )}
      </div>
    </PhoneShell>
  )
}
