import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { getBizGoalForReport } from './companyProfileStore'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useStepHistory } from '../hooks/useStepHistory'

// ─── 보고서 유형 ──────────────────────────────────────────
const TYPE_META = {
  invest: { label:'투자자용',  color:'#6366F1', bg:'#EEF2FF', icon:'📈' },
  tax:    { label:'세무사용',  color:'#059669', bg:'#ECFDF5', icon:'🧾' },
  gov:    { label:'기관제출용',color:'#D97706', bg:'#FFFBEB', icon:'🏛️' },
}

// ─── 상태 메타 ────────────────────────────────────────────
const STATUS_META = {
  scheduled: { label:'생성 예정', color:'#6B7280', bg:'#F3F4F6' },
  generating:{ label:'생성 중',   color:'#92400E', bg:'#FEF3C7' },
  review:    { label:'검토 필요', color:'#92400E', bg:'#FFEDD5' },
  sent:      { label:'전송 완료', color:'#047857', bg:'#D1FAE5' },
  failed:    { label:'전송 실패', color:'#B91C1C', bg:'#FEE2E2' },
  done:      { label:'보관 완료', color:'#1E40AF', bg:'#DBEAFE' },
}

// ─── 데이터 출처 뱃지 ─────────────────────────────────────
const SOURCE_BADGES = {
  internal: { label:'주다페이 내부', color:'#0369A1', bg:'#E0F2FE' },
  coocon:   { label:'쿠콘 연동',     color:'#7C3AED', bg:'#EDE9FE' },
  hometax:  { label:'홈택스 연동',   color:'#047857', bg:'#D1FAE5' },
  account:  { label:'계좌 연동',     color:'#0F766E', bg:'#CCFBF1' },
  card:     { label:'카드 연동',     color:'#B45309', bg:'#FEF3C7' },
  review:   { label:'검토 필요',     color:'#B91C1C', bg:'#FEE2E2' },
}

const TABS = [
  { key:'all',    label:'전체' },
  { key:'invest', label:'투자자용' },
  { key:'tax',    label:'세무사용' },
  { key:'gov',    label:'기관제출용' },
]

// ─── 보고서 데이터 ────────────────────────────────────────
const REPORTS = [
  // ── 2026년 5월 (생성 예정) ─────────────────────────────
  { id:'r202505-inv', month:'2026년 5월', type:'invest', status:'scheduled',
    genDate:'2026.06.01 자동 생성 예정', recipients:[] },
  { id:'r202505-tax', month:'2026년 5월', type:'tax', status:'scheduled',
    genDate:'2026.06.01 자동 생성 예정', recipients:[] },
  { id:'r202505-gov', month:'2026년 5월', type:'gov', status:'scheduled',
    genDate:'2026.06.01 자동 생성 예정', recipients:[] },

  // ── 2026년 4월 투자자용 ────────────────────────────────
  {
    id:'r202504-inv', month:'2026년 4월', type:'invest', status:'sent',
    genDate:'2026.05.01 생성', sentAt:'2026.05.01 09:00',
    recipients:[
      { role:'투자자', name:'ABC벤처스' },
      { role:'투자자', name:'XYZ파트너스' },
      { role:'대표',   name:'이재원' },
      { role:'이사',   name:'박지현' },
    ],
    // 1. 핵심 요약
    summary:{
      totalExec:124000000, confirmedRevenue:89000000, runway:14,
      payFailCount:1, unclassifiedCount:2, evidenceMissingCount:3,
      operationStatus:'정상',
      // highlights: 수치 기반 자동 생성 (수동 입력 없음)
      execVsPrev:+7,           // 전월 대비 집행 증감률 (%)  — 주다페이 내부
      revenueVsPrev:+15.6,     // 전월 대비 매출 증감률 (%)  — 쿠콘
      autoPayCount:12,         // 이번달 자동지급 실행 건수   — 주다페이 내부
    },
    // 런웨이 현황 (투자자용 전용 섹션)
    runway:{
      totalFunds:2700000000,
      avgMonthlyBurn:124000000, fixedBurn:87000000,
      runwayTotal:14, runwayFixed:31,
      note:'전체 지출 기준 약 14개월, 고정비 기준 약 31개월 운영 가능한 예상값입니다.',
    },
    // 3. 자금 흐름
    cashflow:{
      startBalance:2574000000, inflow:350000000, outflow:124000000,
      currentBalance:2700000000, estimatedMonthEnd:2650000000,
      scheduledAutoPayNext:87000000, burnRate:8.5, runway:14,
      wallets:[
        { name:'MY 지갑',  balance:500000000 },
        { name:'투자금',   balance:2000000000 },
        { name:'지원금',   balance:200000000 },
      ],
    },
    // 4. 카테고리별 집행
    categories:[
      { label:'인건비', amount:62000000, pct:50, color:'#6366F1', prev:58000000 },
      { label:'운영비', amount:22320000, pct:18, color:'#10B981', prev:20000000 },
      { label:'사업비', amount:18600000, pct:15, color:'#F59E0B', prev:16000000 },
      { label:'금융',   amount:12400000, pct:10, color:'#0EA5E9', prev:12000000 },
      { label:'세금',   amount:8680000,  pct:7,  color:'#8B5CF6', prev:9000000  },
    ],
    // 5. 매출 현황
    revenue:{
      total:89000000, prevTotal:77000000, growthRate:15.6,
      breakdown:[
        { type:'전자세금계산서', amount:52000000, source:'hometax' },
        { type:'카드매출',       amount:24000000, source:'card'    },
        { type:'현금영수증',     amount:8000000,  source:'coocon'  },
        { type:'계좌입금',       amount:5000000,  source:'account' },
      ],
    },
    // 6. 권한 자금
    authorizedFunds:[
      { name:'ABC벤처스 투자금', type:'투자', total:500000000, used:124000000, remaining:376000000, expiresAt:null },
      { name:'중기부 R&D 지원금', type:'지원', total:200000000, used:87000000, remaining:113000000, expiresAt:'2026.12.31' },
      { name:'대표 단기 대여금', type:'대여', total:50000000,  used:30000000, remaining:20000000,  repayBy:'2026.09.30' },
    ],
    // 7. 프로젝트
    projects:[
      { name:'주다페이 앱 고도화', progress:75, status:'진행중',  used:24000000 },
      { name:'PG 연동 테스트',     progress:40, status:'검수대기', used:8000000  },
      { name:'신규 파트너 계약',   progress:100,status:'완료',     used:5000000  },
    ],
    // 8. 운영 안정성
    stability:{
      payFailed:1, lowBalanceRisk:1, unclassified:2,
      scheduledAutoPay:12, cardLimitWarning:0, anomalyDetected:1,
      evidenceMissing:3, reviewPending:2, approvalPending:1,
    },
    // 9. 거래 지속성
    trustMetrics:{
      onTimePayRate:98, autoPayMaintainRate:100,
      reviewCompleteRate:92, evidenceSubmitRate:87,
      claimResponseRate:100, trustScore:94,
      repeatVendors:5, repeatMonths:3,
    },
    // 10. 인건비
    payroll:{
      headcount:8, total:62000000, bonus:0, otherIncome:0,
      taxWithheld:1860000, insurancePaid:4960000,
      breakdown:[
        { role:'개발', count:3, amount:28000000 },
        { role:'기획', count:2, amount:16000000 },
        { role:'운영', count:2, amount:12000000 },
        { role:'인턴', count:1, amount:6000000  },
      ],
    },
    // 11. 세무/보험
    tax:{
      vat:         { done:true,  date:'2026.04.25', source:'hometax' },
      corporateTax:{ done:false, date:null,          source:'hometax' },
      withholding: { done:true,  date:'2026.04.10', source:'hometax' },
      localTax:    { done:true,  date:'2026.04.25', source:'coocon'  },
      insurance:   { done:true,  amount:4960000, date:'2026.04.10', source:'coocon' },
      bizInsurance:{ name:'기업 배상책임보험', expiry:'2026.12.31' },
    },
    // 12. 증빙 상태
    evidence:{
      total:23, done:20, missing:3, reviewNeeded:2,
      sentToAccountant:true, sentAt:'2026.05.01 09:00',
      missingItems:['외주 계약서','카드 영수증 2건'],
    },
    // 13. 다음달 예상
    nextMonth:{
      salary:62000000, tax:8500000, autoPay:87000000,
      total:157500000,
      authorizedFundExpiry:['중기부 지원금 (2026.12.31 만료 예정)'],
      warnings:['잔액 부족 위험 1건 확인 필요','지원금 만료 예정 항목 확인'],
      items:[
        { label:'급여 자동지급',  amount:62000000 },
        { label:'세금 납부 예정', amount:8500000  },
        { label:'임대료',         amount:5800000  },
        { label:'구독료',         amount:876900   },
        { label:'4대보험',        amount:4960000  },
      ],
    },
  },

  // ── 2026년 4월 세무사용 ────────────────────────────────
  {
    id:'r202504-tax', month:'2026년 4월', type:'tax', status:'sent',
    genDate:'2026.05.01 생성', sentAt:'2026.05.01 09:05',
    recipients:[
      { role:'세무사', name:'김세무사 (삼일회계법인)' },
      { role:'경리',   name:'이경리 팀장' },
    ],
    summary:{
      totalExec:124000000, confirmedRevenue:89000000, runway:14,
      payFailCount:1, unclassifiedCount:2, evidenceMissingCount:3,
      operationStatus:'정상',
      execVsPrev:+7, revenueVsPrev:+15.6, autoPayCount:12,
    },
    categories:[
      { label:'인건비', amount:62000000, pct:50, color:'#6366F1', prev:58000000 },
      { label:'운영비', amount:22320000, pct:18, color:'#10B981', prev:20000000 },
      { label:'사업비', amount:18600000, pct:15, color:'#F59E0B', prev:16000000 },
      { label:'세금',   amount:8680000,  pct:7,  color:'#8B5CF6', prev:9000000  },
    ],
    payroll:{
      headcount:8, total:62000000, bonus:0, otherIncome:0,
      taxWithheld:1860000, insurancePaid:4960000,
      breakdown:[
        { role:'개발', count:3, amount:28000000 },
        { role:'기획', count:2, amount:16000000 },
        { role:'운영', count:2, amount:12000000 },
        { role:'인턴', count:1, amount:6000000  },
      ],
    },
    tax:{
      vat:         { done:true, date:'2026.04.25', source:'hometax' },
      corporateTax:{ done:false,date:null,          source:'hometax' },
      withholding: { done:true, date:'2026.04.10', source:'hometax' },
      localTax:    { done:true, date:'2026.04.25', source:'coocon'  },
      insurance:   { done:true, amount:4960000, date:'2026.04.10', source:'coocon' },
      bizInsurance:{ name:'기업 배상책임보험', expiry:'2026.12.31' },
    },
    evidence:{
      total:23, done:20, missing:3, reviewNeeded:2,
      sentToAccountant:true, sentAt:'2026.05.01 09:00',
      missingItems:['외주 계약서','카드 영수증 2건'],
    },
    nextMonth:{
      salary:62000000, tax:8500000, autoPay:87000000, total:157500000,
      authorizedFundExpiry:[], warnings:['5월 원천세 신고 준비','분기 부가세 준비'],
      items:[
        { label:'급여 자동지급', amount:62000000 },
        { label:'세금 납부 예정', amount:8500000 },
        { label:'4대보험', amount:4960000 },
      ],
    },
    // 세무사용 전용
    taxInvoice:{
      salesTotal:52000000, purchaseTotal:31000000,
      sales:[
        { vendor:'㈜테크파트너스', date:'2026.04.10', supply:20000000, vat:2000000 },
        { vendor:'스타트업코리아', date:'2026.04.18', supply:32000000, vat:3200000 },
      ],
      purchases:[
        { vendor:'AWS Korea', date:'2026.04.02', supply:1600000, vat:160000 },
        { vendor:'㈜엔터프라이즈솔루션', date:'2026.04.15', supply:15000000, vat:1500000 },
        { vendor:'한국사무기기', date:'2026.04.22', supply:14400000, vat:1440000 },
      ],
      missing:1,
    },
    cardUsage:{
      total:18500000,
      cards:[
        { name:'신한 법인카드 9234', amount:12000000, unclassified:1, anomaly:0 },
        { name:'국민 법인카드 5512', amount:6500000,  unclassified:1, anomaly:1 },
      ],
      items:[
        { date:'04.03', vendor:'AWS Korea', amount:1760000, purpose:'구독료', receipt:true, memo:false },
        { date:'04.07', vendor:'스타벅스 강남점', amount:85000, purpose:'출장식대', receipt:true, memo:false },
        { date:'04.14', vendor:'이케아 광명', amount:320000, purpose:'미분류', receipt:false, memo:false },
        { date:'04.21', vendor:'GS25 역삼점', amount:45000, purpose:'출장식대', receipt:true, memo:false },
        { date:'04.25', vendor:'비즈니스컨설팅㈜', amount:5500000, purpose:'사업비', receipt:false, memo:true },
      ],
    },
    insurance4:{
      health:    { amount:1240000, paid:true,  dueDate:'2026.04.10', paidDate:'2026.04.10', source:'coocon' },
      pension:   { amount:1480000, paid:true,  dueDate:'2026.04.10', paidDate:'2026.04.10', source:'coocon' },
      employment:{ amount:148000,  paid:true,  dueDate:'2026.04.10', paidDate:'2026.04.10', source:'coocon' },
      accident:  { amount:92000,   paid:true,  dueDate:'2026.04.10', paidDate:'2026.04.10', source:'coocon' },
      total:4960000,
    },
    taxPayment:{
      vat:         { amount:3800000, due:'2026.04.25', paid:true,  paidDate:'2026.04.25', source:'hometax' },
      corporateTax:{ amount:0,       due:null,          paid:false, paidDate:null,          source:'hometax', note:'연간 신고 예정' },
      withholding: { amount:1860000, due:'2026.04.10', paid:true,  paidDate:'2026.04.10', source:'hometax' },
      localTax:    { amount:186000,  due:'2026.04.25', paid:true,  paidDate:'2026.04.25', source:'coocon'  },
    },
    unclassifiedReview:{
      items:[
        { date:'04.14', vendor:'이케아 광명', amount:320000, issue:'카드 목적 미선택', type:'card' },
        { date:'04.21', vendor:'비즈니스컨설팅㈜', amount:5500000, issue:'증빙 누락', type:'evidence' },
        { date:'04.28', vendor:'미상 온라인결제', amount:129000, issue:'소명 필요', type:'anomaly' },
      ],
      total:3, unclassified:1, evidenceMissing:1, needsMemo:1,
    },
  },

  // ── 2026년 4월 기관제출용 ──────────────────────────────
  {
    id:'r202504-gov', month:'2026년 4월', type:'gov', status:'done',
    genDate:'2026.05.01 생성', sentAt:'2026.05.01 09:10',
    recipients:[
      { role:'서울시청', name:'자금지원팀' },
      { role:'중기부',   name:'스타트업육성과' },
    ],
    summary:{
      totalExec:124000000, confirmedRevenue:89000000, runway:14,
      payFailCount:1, unclassifiedCount:2, evidenceMissingCount:3,
      operationStatus:'정상',
      execVsPrev:+7, revenueVsPrev:+15.6, autoPayCount:12,
    },
    categories:[
      { label:'인건비', amount:62000000, pct:50, color:'#6366F1', prev:58000000 },
      { label:'운영비', amount:22320000, pct:18, color:'#10B981', prev:20000000 },
      { label:'사업비', amount:40920000, pct:33, color:'#F59E0B', prev:35000000 },
    ],
    authorizedFunds:[
      { name:'중기부 R&D 지원금', type:'지원', total:200000000, used:87000000, remaining:113000000, expiresAt:'2026.12.31' },
    ],
    projects:[
      { name:'주다페이 앱 고도화', progress:75, status:'진행중',  used:24000000 },
      { name:'PG 연동 테스트',     progress:40, status:'검수대기', used:8000000  },
      { name:'신규 파트너 계약',   progress:100,status:'완료',     used:5000000  },
    ],
    stability:{
      payFailed:1, lowBalanceRisk:1, unclassified:2,
      scheduledAutoPay:12, cardLimitWarning:0, anomalyDetected:1,
      evidenceMissing:3, reviewPending:2, approvalPending:1,
    },
    evidence:{
      total:23, done:20, missing:3, reviewNeeded:2,
      sentToAccountant:true, sentAt:'2026.05.01 09:00',
      missingItems:['외주 계약서','카드 영수증 2건'],
    },
    nextMonth:{
      salary:62000000, tax:8500000, autoPay:87000000, total:157500000,
      authorizedFundExpiry:['중기부 지원금 (2026.12.31 만료 예정)'],
      warnings:['지원금 만료 예정 확인 필요','5월 집행 계획 수립'],
      items:[
        { label:'사업비 예정 집행', amount:40000000 },
        { label:'인건비',           amount:62000000 },
        { label:'운영비',           amount:22320000 },
      ],
    },
    // 기관제출용 전용
    approvalHistory:[
      { type:'승인 완료',  target:'중기부 R&D 1차 집행',   handler:'김담당 (중기부)', date:'2026.04.08 14:32' },
      { type:'검수 완료',  target:'PG 연동 테스트 1차',     handler:'이검수 (자체)',   date:'2026.04.15 10:11' },
      { type:'보완 요청',  target:'외주비 증빙 자료',       handler:'박담당 (중기부)', date:'2026.04.19 09:45' },
      { type:'승인 완료',  target:'운영비 집행 건 (3건)',    handler:'이재원 (대표)',   date:'2026.04.22 16:00' },
    ],
    purposeCheck:{
      items:[
        { vendor:'이케아 광명',    amount:320000,  approved:'운영비',  actual:'미분류',  status:'확인 필요' },
        { vendor:'비즈니스컨설팅', amount:5500000, approved:'사업비',  actual:'사업비',  status:'일치' },
        { vendor:'미상 온라인결제',amount:129000,  approved:null,      actual:'미분류',  status:'소명 필요' },
      ],
      total:3, matched:1, needsCheck:1, needsMemo:1,
    },
    balanceExpiry:[
      { name:'중기부 R&D 지원금', total:200000000, used:87000000, remaining:113000000, expiresAt:'2026.12.31', urgency:'보통', pct:43 },
      { name:'서울시 창업지원금',  total:50000000,  used:48000000, remaining:2000000,   expiresAt:'2026.06.30', urgency:'만료 임박', pct:96 },
    ],
  },

  // ── 2026년 3월 (보관 완료) ─────────────────────────────
  {
    id:'r202503-inv', month:'2026년 3월', type:'invest', status:'done',
    genDate:'2026.04.01 생성', sentAt:'2026.04.01 09:00',
    recipients:[
      { role:'투자자', name:'ABC벤처스' },
      { role:'투자자', name:'XYZ파트너스' },
      { role:'대표',   name:'이재원' },
    ],
    summary:{
      totalExec:98000000, confirmedRevenue:77000000, runway:16,
      payFailCount:0, unclassifiedCount:1, evidenceMissingCount:2,
      operationStatus:'정상',
      execVsPrev:-3, revenueVsPrev:+10.0, autoPayCount:12,
    },
    cashflow:{ startBalance:2800000000, inflow:310000000, outflow:98000000, currentBalance:2800000000, estimatedMonthEnd:2750000000, scheduledAutoPayNext:80000000, burnRate:7.2, runway:16, wallets:[] },
    categories:[
      { label:'인건비', amount:49000000, pct:50, color:'#6366F1', prev:45000000 },
      { label:'운영비', amount:17640000, pct:18, color:'#10B981', prev:16000000 },
      { label:'사업비', amount:14700000, pct:15, color:'#F59E0B', prev:13000000 },
    ],
    revenue:{ total:77000000, prevTotal:70000000, growthRate:10.0, breakdown:[
      { type:'전자세금계산서', amount:44000000, source:'hometax' },
      { type:'카드매출',       amount:21000000, source:'card'    },
      { type:'현금영수증',     amount:8000000,  source:'coocon'  },
      { type:'계좌입금',       amount:4000000,  source:'account' },
    ]},
    authorizedFunds:[
      { name:'ABC벤처스 투자금', type:'투자', total:500000000, used:98000000, remaining:402000000, expiresAt:null },
    ],
    projects:[
      { name:'주다페이 앱 고도화', progress:55, status:'진행중', used:18000000 },
    ],
    stability:{ payFailed:0, lowBalanceRisk:0, unclassified:1, scheduledAutoPay:12, cardLimitWarning:0, anomalyDetected:0, evidenceMissing:2, reviewPending:1, approvalPending:0 },
    trustMetrics:{ onTimePayRate:100, autoPayMaintainRate:100, reviewCompleteRate:95, evidenceSubmitRate:90, claimResponseRate:100, trustScore:97, repeatVendors:5, repeatMonths:2 },
    payroll:{ headcount:8, total:49000000, bonus:0, otherIncome:0, taxWithheld:1470000, insurancePaid:3920000, breakdown:[{ role:'개발', count:3, amount:22000000 },{ role:'기획', count:2, amount:13000000 },{ role:'운영', count:2, amount:10000000 },{ role:'인턴', count:1, amount:4000000 }] },
    tax:{ vat:{ done:true, date:'2026.03.25', source:'hometax' }, corporateTax:{ done:false, date:null, source:'hometax' }, withholding:{ done:true, date:'2026.03.10', source:'hometax' }, localTax:{ done:true, date:'2026.03.25', source:'coocon' }, insurance:{ done:true, amount:3920000, date:'2026.03.10', source:'coocon' }, bizInsurance:{ name:'기업 배상책임보험', expiry:'2026.12.31' } },
    evidence:{ total:19, done:17, missing:2, reviewNeeded:1, sentToAccountant:true, sentAt:'2026.04.01 09:00', missingItems:['카드 영수증 2건'] },
    nextMonth:{ salary:62000000, tax:8500000, autoPay:87000000, total:157500000, authorizedFundExpiry:[], warnings:['4월 부가세 신고 준비'], items:[{ label:'급여', amount:62000000 },{ label:'세금', amount:8500000 }] },
  },
]

function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function fmtB(n) { if(n >= 100000000) return (n/100000000).toFixed(1)+'억'; if(n >= 10000) return Math.floor(n/10000)+'만'; return fmt(n) }

function SourceBadge({ source }) {
  const s = SOURCE_BADGES[source]
  if (!s) return null
  return (
    <span style={{ padding:'2px 7px', borderRadius:'6px', fontSize:'10px', fontWeight:700,
      background:s.bg, color:s.color, flexShrink:0 }}>{s.label}</span>
  )
}

function SectionCard({ title, emoji, sourceBadge, children }) {
  return (
    <div style={{ background:COLORS.bgCard, borderRadius:'18px', padding:'18px',
      boxShadow:'0 1px 6px rgba(0,0,0,0.06)', border:`1px solid ${COLORS.borderSoft}`,
      marginBottom:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1 }}>{emoji} {title}</div>
        {sourceBadge && <SourceBadge source={sourceBadge} />}
      </div>
      {children}
    </div>
  )
}

function Divider({ i, total }) {
  if (i >= total - 1) return null
  return <div style={{ height:'1px', background:COLORS.borderSoft, margin:'0' }} />
}

function Row({ label, value, valueColor, source, i, total }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ fontSize:'13px', color:COLORS.t2 }}>{label}</span>
          {source && <SourceBadge source={source} />}
        </div>
        <span style={{ fontSize:'13px', fontWeight:700, color:valueColor||COLORS.t1 }}>{value}</span>
      </div>
      <Divider i={i} total={total} />
    </div>
  )
}

function ProgressBar({ pct, color, height=8 }) {
  return (
    <div style={{ height:height+'px', borderRadius:'4px', background:COLORS.bgMuted, overflow:'hidden' }}>
      <div style={{ width:Math.min(pct,100)+'%', height:'100%', background:color, borderRadius:'4px', transition:'width .5s' }} />
    </div>
  )
}

// ─── 수신자 표시 라벨 ─────────────────────────────────────
function recipientLabel(recipients) {
  if (!recipients || recipients.length === 0) return null
  const first = recipients[0]
  const rest  = recipients.length - 1
  if (rest === 0) return `${first.role} · ${first.name}`
  return `${first.role} · ${first.name} 외 ${rest}명`
}

// ─── 목록 카드 ────────────────────────────────────────────
function ReportItem({ r, theme, onPress }) {
  const st    = STATUS_META[r.status] || STATUS_META.scheduled
  const meta  = TYPE_META[r.type]
  const isDone= ['sent','done','review'].includes(r.status)
  const recLabel = recipientLabel(r.recipients)

  return (
    <button onClick={() => isDone && onPress(r)}
      style={{ width:'100%', background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`,
        borderRadius:'16px', padding:'16px', marginBottom:'10px', textAlign:'left',
        cursor: isDone ? 'pointer' : 'default', fontFamily:'inherit',
        boxShadow:'0 1px 5px rgba(0,0,0,0.04)', display:'block' }}>

      {/* 유형 + 상태 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ padding:'3px 9px', borderRadius:'20px', background:meta.bg, color:meta.color,
            fontSize:'11px', fontWeight:700 }}>{meta.icon} {meta.label}</span>
          <span style={{ padding:'3px 9px', borderRadius:'20px', background:st.bg, color:st.color,
            fontSize:'11px', fontWeight:700 }}>{st.label}</span>
        </div>
        {isDone && <span style={{ fontSize:'12px', color:theme.brandDark, fontWeight:700 }}>PDF ›</span>}
      </div>

      {/* 제목 + 날짜 */}
      <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, marginBottom:'3px', letterSpacing:'-0.3px' }}>
        {r.month} 보고서
      </div>
      <div style={{ fontSize:'12px', color:COLORS.t3, marginBottom: recLabel ? '10px' : 0 }}>
        {r.genDate}
      </div>

      {/* 수신자 */}
      {recLabel && (
        <div style={{ display:'flex', alignItems:'center', gap:'6px',
          padding:'8px 10px', background:COLORS.bg, borderRadius:'10px',
          marginBottom: isDone && r.summary ? '10px' : 0 }}>
          <span style={{ fontSize:'12px' }}>📨</span>
          <span style={{ fontSize:'12px', color:COLORS.t2 }}>
            수신: <span style={{ fontWeight:700, color:COLORS.t1 }}>{recLabel}</span>
          </span>
        </div>
      )}

      {/* 핵심 지표 */}
      {isDone && r.summary && (
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {[
            '집행 ' + fmtB(r.summary.totalExec),
            '확인매출 ' + fmtB(r.summary.confirmedRevenue),
            r.summary.runway ? '런웨이 ' + r.summary.runway + '개월' : null,
          ].filter(Boolean).map((tag,i) => (
            <span key={i} style={{ padding:'3px 9px', borderRadius:'8px',
              background:COLORS.bgMuted, color:COLORS.t3, fontSize:'11px', fontWeight:600 }}>{tag}</span>
          ))}
          {r.summary.evidenceMissingCount > 0 && (
            <span style={{ padding:'3px 9px', borderRadius:'8px',
              background:'#FEE2E2', color:'#B91C1C', fontSize:'11px', fontWeight:600 }}>
              증빙누락 {r.summary.evidenceMissingCount}건
            </span>
          )}
        </div>
      )}
    </button>
  )
}

function MonthHeader({ month }) {
  return (
    <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t4, letterSpacing:'0.5px',
      paddingBottom:'8px', marginTop:'8px', marginBottom:'4px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
      {month}
    </div>
  )
}

// ─── 보고서 상세 ──────────────────────────────────────────
function ReportDetail({ r, theme, onClose, canExportReport, isExiting }) {
  const [notifSent, setNotifSent] = useState(false)
  const meta = TYPE_META[r.type]

  // 유형별 섹션 표시 여부
  const inv = r.type === 'invest'
  const tax = r.type === 'tax'
  const gov = r.type === 'gov'
  // companyProfileStore에서 기업목표 읽기 (투자자용 전용)
  const bizGoalData = inv ? getBizGoalForReport() : null

  const show = {
    // 투자자용
    summary:        true,
    bizGoal:        inv && !!bizGoalData?.ceoMessage,
    revenue:        inv && !!r.revenue,
    cashflow:       inv && !!r.cashflow,
    runway:         inv && !!r.runway,
    categories:     true,
    authFunds:      (inv || gov) && !!r.authorizedFunds,
    projects:       (inv || gov) && !!r.projects,
    trust:          inv && !!r.trustMetrics,
    stability:      (inv || gov) && !!r.stability,
    nextMonth:      (inv || tax),
    // 세무사용 전용
    taxInvoice:     tax && !!r.taxInvoice,
    cardUsage:      tax && !!r.cardUsage,
    payroll:        tax && !!r.payroll,
    insurance4:     tax && !!r.insurance4,
    taxPayment:     tax && !!r.taxPayment,
    evidence:       tax || gov,
    unclassified:   tax && !!r.unclassifiedReview,
    taxPackage:     tax,
    // 기관제출용 전용
    govCategories:  gov,
    approvalHistory:gov && !!r.approvalHistory,
    purposeCheck:   gov && !!r.purposeCheck,
    balanceExpiry:  gov && !!r.balanceExpiry,
    govPackage:     gov,
  }

  return (
    <div className={isExiting ? 'page-exit-right' : 'page-enter-right'}
      style={{ position:'absolute', inset:0, background:COLORS.bg, zIndex:20,
        display:'flex', flexDirection:'column', overflow:'clip' }}>

      {/* ① Sticky 네비 바 */}
      <div className="sticky-nav-safe" style={{
        flexShrink:0,
        background: theme.headerSolid,
        display:'flex', alignItems:'center', gap:'10px',
        padding:'0 16px 12px',
      }}>
        <button onClick={onClose}
          style={{ width:'32px', height:'32px', background:'transparent', border:'none',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:'#fff',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {r.month} 보고서
            </span>
            <span style={{ flexShrink:0, padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:700,
              background:'rgba(255,255,255,0.2)', color:'#fff' }}>{meta.icon} {meta.label}</span>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>

        {/* ② Hero — 스크롤 시 접혀 사라짐 */}
        <div style={{ background: theme.headerSolid, padding:'4px 16px 20px' }}>
          <div style={{ fontSize:'26px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.2, marginBottom:'4px' }}>
            {r.month} 보고서
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', marginBottom:'16px' }}>{r.genDate}</div>

          {/* 수신자 */}
          {r.recipients && r.recipients.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:'12px',
              padding:'10px 14px', marginBottom:'14px', display:'flex', alignItems:'flex-start', gap:'8px' }}>
              <span style={{ fontSize:'14px', marginTop:'1px' }}>📨</span>
              <div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginBottom:'5px' }}>수신</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {r.recipients.map((rec, i) => (
                    <span key={i} style={{ fontSize:'11px', fontWeight:600, color:'#fff',
                      background:'rgba(255,255,255,0.18)', borderRadius:'20px', padding:'2px 9px' }}>
                      {rec.role} · {rec.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KPI — 유형별 */}
          {r.summary && (() => {
            const kpis = r.type === 'tax'
              ? [
                  { label:'총 집행',    value:fmtB(r.summary.totalExec) },
                  { label:'증빙 완료',  value:r.evidence ? r.evidence.done+'건' : '-' },
                  { label:'증빙 누락',  value:r.evidence ? r.evidence.missing+'건' : '-' },
                ]
              : r.type === 'gov'
              ? [
                  { label:'총 집행',    value:fmtB(r.summary.totalExec) },
                  { label:'증빙 완료율', value:r.evidence ? Math.round(r.evidence.done/r.evidence.total*100)+'%' : '-' },
                  { label:'목적 확인',  value: r.purposeCheck ? (r.purposeCheck.needsCheck + r.purposeCheck.needsMemo)+'건' : '-' },
                ]
              : [
                  { label:'총 집행',   value:fmtB(r.summary.totalExec) },
                  { label:'확인 매출', value:fmtB(r.summary.confirmedRevenue) },
                  { label:'런웨이',    value: r.summary.runway ? r.summary.runway+'개월' : '-' },
                ]
            return (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                {kpis.map((item, i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,0.12)',
                    border:'1px solid rgba(255,255,255,0.18)',
                    borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.65)', marginBottom:'4px', fontWeight:600 }}>{item.label}</div>
                    <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        <div style={{ padding:'16px' }}>

        {/* 1. 핵심 요약 */}
        {show.summary && r.summary && (
          <SectionCard
            title={r.type==='tax' ? '이번달 세무 요약' : r.type==='gov' ? '이번달 기관 제출 요약' : '이번달 핵심 요약'}
            emoji="📋" sourceBadge="internal">
            <div style={{ padding:'12px', background:'#F0FDF4', borderRadius:'12px',
              display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#10B981', flexShrink:0 }} />
              <span style={{ fontSize:'13px', fontWeight:600, color:'#047857' }}>
                운영 상태: {r.summary.operationStatus} · 정상 운영 중
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'지급 실패',   value:r.summary.payFailCount+'건',         color: r.summary.payFailCount > 0 ? '#B91C1C' : '#047857' },
                { label:'미분류 결제', value:r.summary.unclassifiedCount+'건',    color: r.summary.unclassifiedCount > 0 ? '#92400E' : '#047857' },
                { label:'증빙 누락',   value:r.summary.evidenceMissingCount+'건', color: r.summary.evidenceMissingCount > 0 ? '#B91C1C' : '#047857' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* 수치 기반 자동 생성 요약 — 주다페이 내부 + 쿠콘 데이터 */}
            {[
              r.summary.execVsPrev != null && {
                text: `전월 대비 집행 ${r.summary.execVsPrev >= 0 ? '+' : ''}${r.summary.execVsPrev}%`,
                ok: r.summary.execVsPrev <= 10,
              },
              r.summary.revenueVsPrev != null && {
                text: `전월 대비 확인 매출 ${r.summary.revenueVsPrev >= 0 ? '+' : ''}${r.summary.revenueVsPrev}%`,
                ok: r.summary.revenueVsPrev >= 0,
              },
              r.summary.autoPayCount != null && {
                text: `자동지급 ${r.summary.autoPayCount}건 정상 처리`,
                ok: true,
              },
            ].filter(Boolean).map((item, i, arr) => (
              <div key={i}>
                <div style={{ display:'flex', gap:'8px', padding:'9px 0', alignItems:'center' }}>
                  <span style={{ fontSize:'12px', color: item.ok ? '#047857' : '#D97706', flexShrink:0 }}>
                    {item.ok ? '✓' : '⚠'}
                  </span>
                  <span style={{ fontSize:'13px', color:COLORS.t1 }}>{item.text}</span>
                </div>
                <Divider i={i} total={arr.length} />
              </div>
            ))}
          </SectionCard>
        )}


        {/* 2-B. 기업 목표 (투자자용 — companyProfileStore) */}
        {show.bizGoal && bizGoalData && (
          <SectionCard title="기업 목표" emoji="🎯" sourceBadge="internal">
            <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'10px' }}>
              기업 프로필에서 설정한 목표 · 직접 입력값
            </div>

            {/* 대표 메시지 */}
            {bizGoalData.ceoMessage && (
              <div style={{ padding:'12px', background:COLORS.bg, borderRadius:'12px', marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t4, marginBottom:'6px' }}>💬 대표 메시지</div>
                <div style={{ fontSize:'13px', color:COLORS.t2, lineHeight:1.8, whiteSpace:'pre-line' }}>
                  {bizGoalData.ceoMessage}
                </div>
              </div>
            )}

            {/* 연간 목표 */}
            {bizGoalData.annualGoal?.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>
                  {bizGoalData.year}년 연간 목표
                </div>
                {bizGoalData.annualGoal.map((g, i) => (
                  <div key={i} style={{ display:'flex', gap:'8px', padding:'8px 0',
                    borderBottom: i < bizGoalData.annualGoal.length-1 ? '1px solid '+COLORS.borderSoft : 'none' }}>
                    <span style={{ color:COLORS.t3, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                    <span style={{ fontSize:'13px', color:COLORS.t1 }}>{g}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 분기별 목표 */}
            {bizGoalData.quarterGoal?.length > 0 && (
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>
                  {bizGoalData.currentQ} 분기 목표
                </div>
                {bizGoalData.quarterGoal.map((g, i) => {
                  const done = bizGoalData.quarterDone?.[i] ?? false
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0',
                      borderBottom: i < bizGoalData.quarterGoal.length-1 ? '1px solid '+COLORS.borderSoft : 'none' }}>
                      <div style={{ width:'18px', height:'18px', borderRadius:'5px', flexShrink:0,
                        border:'2px solid '+(done ? '#10B981' : COLORS.borderSoft),
                        background:done ? '#10B981' : '#fff',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize:'13px', flex:1,
                        color: done ? COLORS.t4 : COLORS.t1,
                        textDecoration: done ? 'line-through' : 'none' }}>
                        {g}
                      </span>
                      {done && <span style={{ fontSize:'10px', fontWeight:700, color:'#047857', flexShrink:0 }}>완료</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* 3. 매출 현황 (투자자용) */}
        {show.revenue && r.revenue && (
          <SectionCard title="매출 현황" emoji="📈">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="hometax" /><SourceBadge source="card" /><SourceBadge source="coocon" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'이번달 확인 매출', value:fmtB(r.revenue.total)+'원', color:COLORS.t1 },
                { label:'전월 대비',        value:'+'+r.revenue.growthRate+'%', color:'#047857' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'4px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t4, marginBottom:'8px' }}>매출 출처별</div>
            {r.revenue.breakdown.map((b, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'13px', color:COLORS.t2 }}>{b.type}</span>
                    <SourceBadge source={b.source} />
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(b.amount)}원</span>
                </div>
                <Divider i={i} total={r.revenue.breakdown.length} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* 4. 자금 흐름 현황 (투자자용) */}
        {show.cashflow && r.cashflow && (
          <SectionCard title="자금 흐름 현황" emoji="💰">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="internal" /><SourceBadge source="account" />
            </div>
            {[
              { label:'시작 잔액',          value:fmtB(r.cashflow.startBalance)+'원',          source:null },
              { label:'총 입금액',          value:'+'+fmtB(r.cashflow.inflow)+'원',            source:'account' },
              { label:'총 출금액',          value:'-'+fmtB(r.cashflow.outflow)+'원',           source:'internal' },
              { label:'현재 잔액',          value:fmtB(r.cashflow.currentBalance)+'원',         source:null, color:theme.brandDark },
              { label:'월말 예상 잔액',     value:fmtB(r.cashflow.estimatedMonthEnd)+'원',      source:null },
              { label:'자동지급 예정 금액', value:fmtB(r.cashflow.scheduledAutoPayNext)+'원',   source:'internal' },
            ].map((item, i, arr) => (
              <Row key={i} label={item.label} value={item.value} valueColor={item.color} source={item.source} i={i} total={arr.length} />
            ))}
            {r.cashflow.wallets && r.cashflow.wallets.length > 0 && (
              <>
                <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t4, marginTop:'14px', marginBottom:'8px' }}>지갑별 잔액</div>
                {r.cashflow.wallets.map((w, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                      <span style={{ fontSize:'13px', color:COLORS.t2 }}>{w.name}</span>
                      <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(w.balance)}원</span>
                    </div>
                    <Divider i={i} total={r.cashflow.wallets.length} />
                  </div>
                ))}
              </>
            )}
          </SectionCard>
        )}

        {/* 5. 런웨이 현황 (투자자용) */}
        {show.runway && r.runway && (
          <SectionCard title="런웨이 현황" emoji="⏱️">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="internal" /><SourceBadge source="account" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              <div style={{ background:'#F0FDF4', borderRadius:'14px', padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#047857', fontWeight:700, marginBottom:'4px' }}>전체 지출 기준</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:'#047857' }}>
                  약 {r.runway.runwayTotal}개월
                </div>
              </div>
              <div style={{ background:'#EFF6FF', borderRadius:'14px', padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#1E40AF', fontWeight:700, marginBottom:'4px' }}>고정비 기준</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:'#1E40AF' }}>
                  약 {r.runway.runwayFixed}개월
                </div>
              </div>
            </div>
            {[
              { label:'사용 가능 자금',      value:fmtB(r.runway.totalFunds)+'원',         source:null },
              { label:'월평균 집행 (최근)',   value:fmtB(r.runway.avgMonthlyBurn)+'원',     source:'internal' },
              { label:'고정비 월 기준',       value:fmtB(r.runway.fixedBurn)+'원',          source:'internal' },
            ].map((item, i, arr) => (
              <Row key={i} label={item.label} value={item.value} source={item.source} i={i} total={arr.length} />
            ))}
            <div style={{ marginTop:'12px', padding:'10px 12px', background:'#FFFBEB',
              borderRadius:'10px', fontSize:'12px', color:'#92400E', lineHeight:1.7 }}>
              ⚠ {r.runway.note}
            </div>
          </SectionCard>
        )}

        {/* 4. 카테고리별 집행 */}
        {r.categories && (
          <SectionCard title="카테고리별 집행 현황" emoji="📊" sourceBadge="internal">
            {r.categories.map((cat, i) => {
              const diff = cat.amount - cat.prev
              return (
                <div key={i} style={{ marginBottom: i < r.categories.length - 1 ? '14px' : 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:cat.color }} />
                      <span style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{cat.label}</span>
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'10px', fontWeight:600,
                        color: diff >= 0 ? '#B91C1C' : '#047857' }}>
                        {diff >= 0 ? '▲' : '▼'} {fmtB(Math.abs(diff))}
                      </span>
                      <span style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{fmtB(cat.amount)}원</span>
                      <span style={{ fontSize:'11px', fontWeight:700, color:cat.color, width:'28px', textAlign:'right' }}>{cat.pct}%</span>
                    </div>
                  </div>
                  <ProgressBar pct={cat.pct} color={cat.color} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 기관제출용: 목적별 집행 현황 */}
        {show.govCategories && r.categories && (
          <SectionCard title="목적별 집행 현황" emoji="🎯" sourceBadge="internal">
            {r.categories.map((cat, i) => (
              <div key={i} style={{ marginBottom: i < r.categories.length - 1 ? '14px' : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:cat.color }} />
                    <span style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{cat.label}</span>
                    <span style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'6px',
                      background:'#D1FAE5', color:'#047857', fontWeight:700 }}>목적 일치</span>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{fmtB(cat.amount)}원</span>
                    <span style={{ fontSize:'11px', fontWeight:700, color:cat.color, width:'28px', textAlign:'right' }}>{cat.pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={cat.pct} color={cat.color} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* 6. 권한 자금 */}
        {show.authFunds && r.authorizedFunds && (
          <SectionCard title="권한 자금 현황" emoji="🏦" sourceBadge="internal">
            {r.authorizedFunds.map((f, i) => {
              const usePct = Math.round(f.used / f.total * 100)
              return (
                <div key={i} style={{ marginBottom: i < r.authorizedFunds.length - 1 ? '16px' : 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{f.name}</div>
                      <div style={{ fontSize:'11px', color:COLORS.t4, marginTop:'1px' }}>
                        {f.type} · 집행률 {usePct}%
                        {f.expiresAt && <span style={{ color:'#D97706', marginLeft:'6px' }}>만료 {f.expiresAt}</span>}
                        {f.repayBy && <span style={{ color:'#D97706', marginLeft:'6px' }}>상환 {f.repayBy}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:theme.brandDark }}>{fmtB(f.remaining)}원 잔여</div>
                      <div style={{ fontSize:'11px', color:COLORS.t4 }}>/ {fmtB(f.total)}원</div>
                    </div>
                  </div>
                  <ProgressBar pct={usePct} color={theme.brandDark} />
                  {i < r.authorizedFunds.length - 1 && <div style={{ height:'1px', background:COLORS.borderSoft, marginTop:'16px' }} />}
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 7. 프로젝트 */}
        {show.projects && r.projects && (
          <SectionCard title="프로젝트 진행 현황" emoji="🚧" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'진행 중', value:r.projects.filter(p=>p.status==='진행중').length+'건', color:theme.brandDark },
                { label:'검수 대기', value:r.projects.filter(p=>p.status==='검수대기').length+'건', color:'#D97706' },
                { label:'완료',  value:r.projects.filter(p=>p.status==='완료').length+'건', color:'#047857' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {r.projects.map((p, i) => {
              const statusColor = p.status==='완료' ? '#047857' : p.status==='검수대기' ? '#D97706' : theme.brandDark
              return (
                <div key={i}>
                  <div style={{ padding:'10px 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                      <span style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1 }}>{p.name}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'11px', fontWeight:700, color:statusColor }}>{p.status}</span>
                        <span style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{fmtB(p.used)}원</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ flex:1 }}><ProgressBar pct={p.progress} color={statusColor} height={5} /></div>
                      <span style={{ fontSize:'11px', fontWeight:700, color:statusColor, flexShrink:0 }}>{p.progress}%</span>
                    </div>
                  </div>
                  <Divider i={i} total={r.projects.length} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 8. 운영 안정성 */}
        {show.stability && r.stability && (
          <SectionCard title="운영 안정성 현황" emoji="🛡️" sourceBadge="internal">
            {[
              { label:'지급 실패',    value:r.stability.payFailed+'건',       warn: r.stability.payFailed > 0 },
              { label:'잔액 부족 위험', value:r.stability.lowBalanceRisk+'건', warn: r.stability.lowBalanceRisk > 0 },
              { label:'미분류 결제',  value:r.stability.unclassified+'건',    warn: r.stability.unclassified > 0 },
              { label:'이상 거래 감지', value:r.stability.anomalyDetected+'건',warn: r.stability.anomalyDetected > 0 },
              { label:'증빙 누락',    value:r.stability.evidenceMissing+'건', warn: r.stability.evidenceMissing > 0 },
              { label:'검수 대기',    value:r.stability.reviewPending+'건',   warn: false },
              { label:'승인 대기',    value:r.stability.approvalPending+'건', warn: false },
            ].map((item, i, arr) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
                  <span style={{ fontSize:'13px', color:COLORS.t2 }}>{item.label}</span>
                  <span style={{ fontSize:'12px', fontWeight:700,
                    color: item.warn ? '#B91C1C' : '#047857' }}>{item.value}</span>
                </div>
                <Divider i={i} total={arr.length} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* 9. 거래 지속성 지표 */}
        {show.trust && r.trustMetrics && (
          <SectionCard title="거래 지속성 및 활동 신뢰 지표" emoji="📊" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              <div style={{ background:COLORS.bg, borderRadius:'12px', padding:'12px', textAlign:'center', gridColumn:'span 2' }}>
                <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'4px', fontWeight:600 }}>활동 신뢰 점수</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:theme.brandDark }}>{r.trustMetrics.trustScore}</div>
                <div style={{ fontSize:'11px', color:COLORS.t4, marginTop:'2px' }}>/ 100점</div>
              </div>
              {[
                { label:'정시 지급률',     value:r.trustMetrics.onTimePayRate+'%' },
                { label:'자동지급 유지율', value:r.trustMetrics.autoPayMaintainRate+'%' },
                { label:'검수 완료율',     value:r.trustMetrics.reviewCompleteRate+'%' },
                { label:'증빙 제출률',     value:r.trustMetrics.evidenceSubmitRate+'%' },
                { label:'소명 응답률',     value:r.trustMetrics.claimResponseRate+'%' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'15px', fontWeight:800, color:COLORS.t1 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:'10px 12px', background:`${theme.brandDark}0D`, borderRadius:'10px',
              fontSize:'12px', color:COLORS.t2, lineHeight:1.7 }}>
              반복 거래처 {r.trustMetrics.repeatVendors}곳과 {r.trustMetrics.repeatMonths}개월 이상 거래가 지속되고 있습니다.
            </div>
          </SectionCard>
        )}

        {/* ── 세무사용 전용 섹션들 ── */}

        {/* 세무사용: 세금계산서 현황 */}
        {show.taxInvoice && r.taxInvoice && (
          <SectionCard title="세금계산서 현황" emoji="🧾">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="hometax" /><SourceBadge source="coocon" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
              <div style={{ background:'#F0FDF4', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#047857', fontWeight:700, marginBottom:'4px' }}>매출 세금계산서</div>
                <div style={{ fontSize:'16px', fontWeight:800, color:'#047857' }}>{fmtB(r.taxInvoice.salesTotal)}원</div>
              </div>
              <div style={{ background:'#EFF6FF', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#1E40AF', fontWeight:700, marginBottom:'4px' }}>매입 세금계산서</div>
                <div style={{ fontSize:'16px', fontWeight:800, color:'#1E40AF' }}>{fmtB(r.taxInvoice.purchaseTotal)}원</div>
              </div>
            </div>
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t4, marginBottom:'8px' }}>매출 발행</div>
            {r.taxInvoice.sales.map((s, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{s.vendor}</div>
                    <div style={{ fontSize:'11px', color:COLORS.t4 }}>{s.date} · 공급가 {fmtB(s.supply)}원</div>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>부가세 {fmtB(s.vat)}원</span>
                </div>
                <Divider i={i} total={r.taxInvoice.sales.length} />
              </div>
            ))}
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t4, margin:'12px 0 8px' }}>매입 수취</div>
            {r.taxInvoice.purchases.map((p, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{p.vendor}</div>
                    <div style={{ fontSize:'11px', color:COLORS.t4 }}>{p.date} · 공급가 {fmtB(p.supply)}원</div>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#1E40AF' }}>부가세 {fmtB(p.vat)}원</span>
                </div>
                <Divider i={i} total={r.taxInvoice.purchases.length} />
              </div>
            ))}
            {r.taxInvoice.missing > 0 && (
              <div style={{ marginTop:'12px', padding:'10px 12px', background:'#FEF2F2',
                border:'1px solid #FECACA', borderRadius:'10px',
                fontSize:'12px', fontWeight:700, color:'#B91C1C' }}>
                ⚠ 누락 세금계산서 {r.taxInvoice.missing}건 확인 필요
              </div>
            )}
          </SectionCard>
        )}

        {/* 세무사용: 카드 사용 내역 */}
        {show.cardUsage && r.cardUsage && (
          <SectionCard title="카드 사용 내역" emoji="💳">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="card" /><SourceBadge source="internal" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {r.cardUsage.cards.map((c, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, fontWeight:600, marginBottom:'4px' }}>{c.name}</div>
                  <div style={{ fontSize:'14px', fontWeight:800, color:COLORS.t1 }}>{fmtB(c.amount)}원</div>
                  {c.unclassified > 0 && (
                    <div style={{ fontSize:'10px', color:'#D97706', marginTop:'2px' }}>미분류 {c.unclassified}건</div>
                  )}
                  {c.anomaly > 0 && (
                    <div style={{ fontSize:'10px', color:'#B91C1C', marginTop:'1px' }}>이상거래 {c.anomaly}건</div>
                  )}
                </div>
              ))}
            </div>
            {r.cardUsage.items.map((item, i) => {
              const isIssue = item.purpose === '미분류' || !item.receipt
              return (
                <div key={i}>
                  <div style={{ padding:'9px 0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                          <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{item.vendor}</span>
                          <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'5px',
                            background: isIssue ? '#FEF2F2' : '#F0FDF4',
                            color: isIssue ? '#B91C1C' : '#047857', fontWeight:700 }}>
                            {item.purpose}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <span style={{ fontSize:'11px', color:COLORS.t4 }}>{item.date}</span>
                          {!item.receipt && <span style={{ fontSize:'10px', color:'#D97706', fontWeight:600 }}>영수증 없음</span>}
                          {item.memo && <span style={{ fontSize:'10px', color:'#7C3AED', fontWeight:600 }}>소명 첨부</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(item.amount)}원</span>
                    </div>
                  </div>
                  <Divider i={i} total={r.cardUsage.items.length} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 세무사용: 급여/인건비 내역 */}
        {show.payroll && r.payroll && (
          <SectionCard title="급여 / 인건비 내역" emoji="👥" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'직원 수',   value:r.payroll.headcount+'명' },
                { label:'총 인건비', value:fmtB(r.payroll.total) },
                { label:'원천징수',  value:fmtB(r.payroll.taxWithheld) },
                { label:'4대보험',   value:fmtB(r.payroll.insurancePaid) },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{item.value}</div>
                </div>
              ))}
            </div>
            {r.payroll.breakdown && r.payroll.breakdown.map((b, i) => {
              const pct = Math.round(b.amount / r.payroll.total * 100)
              return (
                <div key={i}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px',
                      background:`${theme.brandDark}12`, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:'10px', fontWeight:700,
                      color:theme.brandDark, flexShrink:0 }}>{b.count}명</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{b.role}</span>
                        <span style={{ fontSize:'12px', fontWeight:700, color:COLORS.t1 }}>{fmtB(b.amount)}원</span>
                      </div>
                      <ProgressBar pct={pct} color={theme.brandDark} height={4} />
                    </div>
                  </div>
                  <Divider i={i} total={r.payroll.breakdown.length} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 세무사용: 4대보험 현황 */}
        {show.insurance4 && r.insurance4 && (
          <SectionCard title="4대보험 현황" emoji="🏥" sourceBadge="coocon">
            <div style={{ padding:'10px 12px', background:'#F0FDF4', borderRadius:'10px',
              display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#047857' }}>이번달 납부 총액</span>
              <span style={{ fontSize:'18px', fontWeight:800, color:'#047857' }}>{fmtB(r.insurance4.total)}원</span>
            </div>
            {[
              { label:'건강보험', data:r.insurance4.health },
              { label:'국민연금', data:r.insurance4.pension },
              { label:'고용보험', data:r.insurance4.employment },
              { label:'산재보험', data:r.insurance4.accident },
            ].map((item, i, arr) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'13px', color:COLORS.t2 }}>{item.label}</span>
                    <SourceBadge source={item.data.source} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'13px', fontWeight:700,
                      color: item.data.paid ? '#047857' : '#B91C1C' }}>
                      {item.data.paid ? '납부완료' : '미납'} · {fmtB(item.data.amount)}원
                    </div>
                    {item.data.paid && <div style={{ fontSize:'10px', color:COLORS.t4 }}>{item.data.paidDate}</div>}
                  </div>
                </div>
                <Divider i={i} total={arr.length} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* 세무사용: 세금 납부 현황 */}
        {show.taxPayment && r.taxPayment && (
          <SectionCard title="세금 납부 현황" emoji="🏛️">
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'14px' }}>
              <SourceBadge source="hometax" /><SourceBadge source="coocon" />
            </div>
            {[
              { label:'부가가치세', data:r.taxPayment.vat },
              { label:'법인세',     data:r.taxPayment.corporateTax },
              { label:'원천세',     data:r.taxPayment.withholding },
              { label:'지방소득세', data:r.taxPayment.localTax },
            ].map((item, i, arr) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'13px', color:COLORS.t2 }}>{item.label}</span>
                    <SourceBadge source={item.data.source} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {item.data.paid ? (
                      <>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                          납부완료 · {fmtB(item.data.amount)}원
                        </div>
                        <div style={{ fontSize:'10px', color:COLORS.t4 }}>{item.data.paidDate}</div>
                      </>
                    ) : (
                      <div style={{ fontSize:'12px', fontWeight:700,
                        color: item.data.note ? COLORS.t4 : '#B91C1C' }}>
                        {item.data.note || '미납'}
                      </div>
                    )}
                  </div>
                </div>
                <Divider i={i} total={arr.length} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* 증빙 상태 (세무사용 + 기관제출용) */}
        {show.evidence && r.evidence && (
          <SectionCard title="증빙 상태" emoji="📁" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'전체',    value:r.evidence.total+'건',        color:COLORS.t1 },
                { label:'완료',    value:r.evidence.done+'건',         color:'#047857' },
                { label:'누락',    value:r.evidence.missing+'건',      color:'#B91C1C' },
                { label:'검토필요', value:r.evidence.reviewNeeded+'건', color:'#D97706' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'15px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {r.evidence.sentToAccountant && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 12px',
                background:'#F0FDF4', borderRadius:'10px', marginBottom:'12px' }}>
                <span style={{ fontSize:'14px' }}>✅</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>전송 완료</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>{r.evidence.sentAt}</div>
                </div>
              </div>
            )}
            {r.evidence.missingItems && r.evidence.missingItems.length > 0 && (
              <div style={{ padding:'10px 12px', background:'#FEF2F2', borderRadius:'10px',
                border:'1px solid #FECACA' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#B91C1C', marginBottom:'6px' }}>
                  누락 증빙 항목
                </div>
                {r.evidence.missingItems.map((item, i) => (
                  <div key={i} style={{ fontSize:'12px', color:'#991B1B', padding:'2px 0' }}>· {item}</div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* 세무사용: 미분류 / 검토 필요 항목 */}
        {show.unclassified && r.unclassifiedReview && (
          <SectionCard title="미분류 / 검토 필요 항목" emoji="⚠️" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'미분류',   value:r.unclassifiedReview.unclassified+'건', color:'#D97706' },
                { label:'증빙누락', value:r.unclassifiedReview.evidenceMissing+'건', color:'#B91C1C' },
                { label:'소명필요', value:r.unclassifiedReview.needsMemo+'건', color:'#7C3AED' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {r.unclassifiedReview.items.map((item, i) => {
              const typeColor = item.type==='card' ? '#D97706' : item.type==='evidence' ? '#B91C1C' : '#7C3AED'
              const typeLabel = item.type==='card' ? '카드 미분류' : item.type==='evidence' ? '증빙 누락' : '이상 거래'
              return (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{item.vendor}</span>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'5px',
                          background:`${typeColor}18`, color:typeColor, fontWeight:700 }}>{typeLabel}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:COLORS.t4 }}>{item.date} · {item.issue}</div>
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(item.amount)}원</span>
                  </div>
                  <Divider i={i} total={r.unclassifiedReview.items.length} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 세무사용: 세무사 전달 패키지 */}
        {show.taxPackage && (
          <SectionCard title="세무사 전달 패키지" emoji="📦" sourceBadge="internal">
            <div style={{ fontSize:'12px', color:COLORS.t3, lineHeight:1.8, marginBottom:'14px' }}>
              {['월간 집행 내역', '카드 사용 내역', '세금계산서 자료', '급여대장',
                '4대보험 자료', '증빙 파일', '누락 항목 리스트'].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'4px 0' }}>
                  <span style={{ color:'#047857', fontSize:'12px' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {/* [권한] 다운로드·전송: master · admin · accounting 전용 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {canExportReport ? (
                <button style={{ padding:'13px', background:COLORS.bg, border:`1.5px solid ${COLORS.borderSoft}`,
                  borderRadius:'12px', fontSize:'13px', fontWeight:700, color:COLORS.t1,
                  cursor:'pointer', fontFamily:'inherit' }}>ZIP 다운로드</button>
              ) : (
                <div style={{ padding:'13px', background:'#F9FAFB', border:'1.5px solid #E5E7EB',
                  borderRadius:'12px', fontSize:'12px', fontWeight:600, color:'#9CA3AF',
                  textAlign:'center' }}>🔒 ZIP</div>
              )}
              {canExportReport ? (
                <button style={{ padding:'13px', background:theme.brandDark, border:'none',
                  borderRadius:'12px', fontSize:'13px', fontWeight:700, color:'#fff',
                  cursor:'pointer', fontFamily:'inherit' }}>세무사 자동 전송</button>
              ) : (
                <div style={{ padding:'13px', background:'#F9FAFB', border:'1.5px solid #E5E7EB',
                  borderRadius:'12px', fontSize:'12px', fontWeight:600, color:'#9CA3AF',
                  textAlign:'center' }}>🔒 전송</div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── 기관제출용 전용 섹션들 ── */}

        {/* 기관제출용: 검수 / 승인 이력 */}
        {show.approvalHistory && r.approvalHistory && (
          <SectionCard title="검수 / 승인 이력" emoji="✅" sourceBadge="internal">
            {r.approvalHistory.map((item, i) => {
              const isApproved = item.type.includes('완료')
              const isRequest  = item.type.includes('보완') || item.type.includes('요청')
              const color = isApproved ? '#047857' : isRequest ? '#D97706' : COLORS.t2
              const bg    = isApproved ? '#F0FDF4' : isRequest ? '#FFFBEB' : COLORS.bg
              return (
                <div key={i}>
                  <div style={{ display:'flex', gap:'10px', padding:'10px 0', alignItems:'flex-start' }}>
                    <div style={{ padding:'4px 8px', borderRadius:'8px', background:bg,
                      fontSize:'11px', fontWeight:700, color, flexShrink:0 }}>{item.type}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>{item.target}</div>
                      <div style={{ fontSize:'11px', color:COLORS.t4 }}>{item.handler} · {item.date}</div>
                    </div>
                  </div>
                  <Divider i={i} total={r.approvalHistory.length} />
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 기관제출용: 목적 외 사용 점검 */}
        {show.purposeCheck && r.purposeCheck && (
          <SectionCard title="목적 외 사용 점검" emoji="🔍" sourceBadge="internal">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'전체',    value:r.purposeCheck.total+'건',   color:COLORS.t1 },
                { label:'목적 일치', value:r.purposeCheck.matched+'건', color:'#047857' },
                { label:'확인 필요', value:(r.purposeCheck.needsCheck+r.purposeCheck.needsMemo)+'건', color:'#D97706' },
              ].map((item, i) => (
                <div key={i} style={{ background:COLORS.bg, borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:COLORS.t4, marginBottom:'3px', fontWeight:600 }}>{item.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {r.purposeCheck.items.map((item, i) => {
              const isOk = item.status === '일치'
              return (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{item.vendor}</span>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'5px', fontWeight:700,
                          background: isOk ? '#D1FAE5' : '#FFFBEB',
                          color: isOk ? '#047857' : '#D97706' }}>{item.status}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:COLORS.t4 }}>
                        승인: {item.approved || '미설정'} → 실제: {item.actual}
                      </div>
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(item.amount)}원</span>
                  </div>
                  <Divider i={i} total={r.purposeCheck.items.length} />
                </div>
              )
            })}
            <div style={{ marginTop:'12px', padding:'10px 12px', background:'#FFFBEB',
              borderRadius:'10px', fontSize:'12px', color:'#92400E', lineHeight:1.7 }}>
              ⚠ "목적 외 사용" 단정 없이 확인 필요 항목으로 표시합니다.
            </div>
          </SectionCard>
        )}

        {/* 기관제출용: 잔액 및 만료일 현황 */}
        {show.balanceExpiry && r.balanceExpiry && (
          <SectionCard title="잔액 및 만료일 현황" emoji="📅" sourceBadge="internal">
            {r.balanceExpiry.map((fund, i) => {
              const isUrgent = fund.urgency === '만료 임박'
              return (
                <div key={i} style={{ marginBottom: i < r.balanceExpiry.length-1 ? '16px' : 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>{fund.name}</div>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <span style={{ fontSize:'11px', color:COLORS.t4 }}>만료 {fund.expiresAt}</span>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'5px', fontWeight:700,
                          background: isUrgent ? '#FEF2F2' : '#F3F4F6',
                          color: isUrgent ? '#B91C1C' : COLORS.t4 }}>{fund.urgency}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'14px', fontWeight:800, color: isUrgent ? '#B91C1C' : theme.brandDark }}>
                        {fmtB(fund.remaining)}원
                      </div>
                      <div style={{ fontSize:'11px', color:COLORS.t4 }}>잔여 / {fmtB(fund.total)}원</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ flex:1 }}><ProgressBar pct={fund.pct} color={isUrgent ? '#B91C1C' : theme.brandDark} /></div>
                    <span style={{ fontSize:'11px', fontWeight:700,
                      color: isUrgent ? '#B91C1C' : theme.brandDark, flexShrink:0 }}>
                      집행률 {fund.pct}%
                    </span>
                  </div>
                  {i < r.balanceExpiry.length-1 && <div style={{ height:'1px', background:COLORS.borderSoft, marginTop:'16px' }} />}
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* 기관제출용: 기관 제출 패키지 */}
        {show.govPackage && (
          <SectionCard title="기관 제출 패키지" emoji="📦" sourceBadge="internal">
            <div style={{ fontSize:'12px', color:COLORS.t3, lineHeight:1.8, marginBottom:'14px' }}>
              {['지원금 사용 내역', '목적별 집행 내역', '프로젝트 진행 자료', '증빙 파일',
                '검수/승인 이력', '잔액 현황', '목적 확인 필요 항목'].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'4px 0' }}>
                  <span style={{ color:'#047857', fontSize:'12px' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {/* [권한] 다운로드·전송: master · admin · accounting 전용 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {canExportReport ? (
                <button style={{ padding:'13px', background:COLORS.bg, border:`1.5px solid ${COLORS.borderSoft}`,
                  borderRadius:'12px', fontSize:'13px', fontWeight:700, color:COLORS.t1,
                  cursor:'pointer', fontFamily:'inherit' }}>ZIP 다운로드</button>
              ) : (
                <div style={{ padding:'13px', background:'#F9FAFB', border:'1.5px solid #E5E7EB',
                  borderRadius:'12px', fontSize:'12px', fontWeight:600, color:'#9CA3AF',
                  textAlign:'center' }}>🔒 ZIP</div>
              )}
              {canExportReport ? (
                <button style={{ padding:'13px', background:theme.brandDark, border:'none',
                  borderRadius:'12px', fontSize:'13px', fontWeight:700, color:'#fff',
                  cursor:'pointer', fontFamily:'inherit' }}>기관 담당자 전송</button>
              ) : (
                <div style={{ padding:'13px', background:'#F9FAFB', border:'1.5px solid #E5E7EB',
                  borderRadius:'12px', fontSize:'12px', fontWeight:600, color:'#9CA3AF',
                  textAlign:'center' }}>🔒 전송</div>
              )}
            </div>
          </SectionCard>
        )}

        {/* 다음달 예상 운영 항목 (투자자용 + 세무사용) */}
        {show.nextMonth && r.nextMonth && (
          <SectionCard title="다음달 예상 운영 항목" emoji="🗓️" sourceBadge="internal">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px', background:`${theme.brandDark}0D`, borderRadius:'12px', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:COLORS.t2 }}>예상 총 집행</span>
              <span style={{ fontSize:'20px', fontWeight:800, color:theme.brandDark }}>{fmtB(r.nextMonth.total)}원</span>
            </div>
            {r.nextMonth.items.map((item, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0' }}>
                  <span style={{ fontSize:'13px', color:COLORS.t2 }}>{item.label}</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{fmtB(item.amount)}원</span>
                </div>
                <Divider i={i} total={r.nextMonth.items.length} />
              </div>
            ))}
            {r.nextMonth.warnings && r.nextMonth.warnings.length > 0 && (
              <div style={{ marginTop:'12px', padding:'12px', background:'#FFFBEB',
                border:'1px solid #FDE68A', borderRadius:'10px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'6px' }}>⚠ 확인 필요</div>
                {r.nextMonth.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize:'12px', color:'#92400E', padding:'2px 0' }}>· {w}</div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* 알림 발송 */}
        <div style={{ background:COLORS.bgCard, borderRadius:'16px', padding:'16px',
          boxShadow:SHADOWS.card, marginBottom:'32px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'6px' }}>
            💬 수신자에게 알림 발송
          </div>
          <div style={{ fontSize:'12px', color:COLORS.t4, lineHeight:1.7, marginBottom:'14px' }}>
            {r.recipients && r.recipients.length > 0
              ? `${recipientLabel(r.recipients)}에게 이번 달 보고서를 발송합니다.`
              : '수신자를 설정하면 보고서를 자동 발송할 수 있습니다.'}
          </div>
          {notifSent ? (
            <div style={{ padding:'14px', background:'#D1FAE5', borderRadius:'12px',
              textAlign:'center', color:'#047857', fontWeight:700 }}>
              ✓ 수신자에게 발송 완료
            </div>
          ) : canExportReport ? (
            <button onClick={() => setNotifSent(true)}
              style={{ width:'100%', padding:'14px',
                background: theme.activeBtnGrad || theme.brandDark,
                border:'none', borderRadius:'12px', color:'#fff',
                fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              📢 보고서 알림 발송
            </button>
          ) : (
            /* [권한] 보고서 알림 발송: master · admin · accounting 전용 */
            <div style={{ width:'100%', padding:'14px', background:'#F9FAFB',
              border:'1.5px solid #E5E7EB', borderRadius:'12px', color:'#9CA3AF',
              fontSize:'13px', fontWeight:600, textAlign:'center' }}>
              🔒 보고서 알림 발송 (권한 없음)
            </div>
          )}
        </div>

        </div>{/* end padding:16px content */}
      </div>{/* end flex:1 overflowY:auto scroll container */}

      <div style={{ padding:'12px 16px 20px', background:COLORS.bgCard,
        boxShadow:'0 -4px 20px rgba(0,0,0,0.06)', flexShrink:0 }}>
        {/* [권한] PDF 다운로드: master · admin · accounting 전용 */}
        {canExportReport ? (
          <button style={{ width:'100%', padding:'15px',
            background: theme.activeBtnGrad || theme.brandDark,
            border:'none', borderRadius:'14px', color:'#fff',
            fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            PDF 다운로드
          </button>
        ) : (
          <div style={{ width:'100%', padding:'15px', background:'#F3F4F6',
            border:'1.5px solid #E5E7EB', borderRadius:'14px', color:'#9CA3AF',
            fontSize:'14px', fontWeight:600, textAlign:'center' }}>
            🔒 PDF 다운로드 (최고관리자·관리자·재무담당자 전용)
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function MonthlyReport() {
  const navigate  = useNavigate()
  const theme     = getAccountTheme()
  const scrollRef = useScrollRestore()
  const [activeTab,     setActiveTab]     = useState('all')
  const [selected,      setSelected]      = useState(null)
  const [detailExiting, setDetailExiting] = useState(false)
  const lastSelectedRef = useRef(null)   // exit 애니메이션 중에도 마지막 report 유지

  // 상세 열기
  const openDetail = useCallback((r) => {
    lastSelectedRef.current = r
    setSelected(r)
    setDetailExiting(false)
  }, [])

  // 상세 닫기 — 슬라이드 아웃 후 unmount
  const closeDetail = useCallback(() => {
    setDetailExiting(true)
    setTimeout(() => {
      setSelected(null)
      setDetailExiting(false)
      lastSelectedRef.current = null
    }, 320)
  }, [])

  // 스와이프 백 / 기기 뒤로가기 — 상세가 열려있으면 상세 닫기
  useStepHistory(closeDetail, selected === null)

  // ── [권한] 보고서 다운로드·전송 권한 ─────────────────────
  // master · admin · accounting 만 다운로드 및 전송 가능
  // manager · staff · viewer 는 열람만 가능
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const EXPORT_ROLES = ['master', 'admin', 'accounting']
  const canExportReport = EXPORT_ROLES.includes(bizRole)

  const filtered = REPORTS.filter(r => activeTab === 'all' || r.type === activeTab)

  const grouped = (() => {
    if (activeTab !== 'all') return null
    const map = {}
    filtered.forEach(r => { if (!map[r.month]) map[r.month] = []; map[r.month].push(r) })
    return Object.entries(map)
  })()

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>
        {/* 상세 오버레이 — 리스트 div는 항상 마운트, 스크롤 위치 자동 유지 */}
        {(selected || detailExiting) && lastSelectedRef.current && (
          <ReportDetail
            r={lastSelectedRef.current}
            theme={theme}
            onClose={closeDetail}
            canExportReport={canExportReport}
            isExiting={detailExiting}
          />
        )}

        <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>

          {/* ① Sticky 블록: 네비 바 + 탭 바 — 하나의 div로 묶어 흰 선/갭 제거 */}
          <div className="sticky-nav-safe" style={{
            position:'sticky', top:0, zIndex:10,
            background: theme.headerSolid,
            overflow:'hidden',
          }}>
            {/* 네비 행 */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0 16px 10px' }}>
              <button onClick={() => navigate(-1)}
                style={{ width:'32px', height:'32px', background:'transparent', border:'none',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>월간 보고서</span>
            </div>

            {/* 탭 행 */}
            <div style={{ display:'flex', gap:'6px', padding:'0 16px 12px', overflowX:'auto' }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.key
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      flexShrink:0, padding:'7px 14px',
                      background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                      border: isActive ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid transparent',
                      borderRadius:'10px',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontSize:'13px', fontWeight: isActive ? 700 : 500,
                      cursor:'pointer', fontFamily:'inherit',
                      whiteSpace:'nowrap',
                    }}>
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ② Hero — 스크롤 시 접혀 사라짐 */}
          <div style={{ background: theme.headerSolid, padding:'4px 20px 22px' }}>
            <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.15, marginBottom:'6px' }}>
              월간 보고서
            </div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)' }}>
              매월 1일 자동 생성 · 주다페이 + 쿠콘 데이터 기반
            </div>
          </div>

          <div style={{ padding:'16px' }}>
            {grouped ? (
              grouped.map(([month, reports]) => (
                <div key={month}>
                  <MonthHeader month={month} />
                  {reports.map(r => <ReportItem key={r.id} r={r} theme={theme} onPress={openDetail} />)}
                </div>
              ))
            ) : (
              filtered.map(r => <ReportItem key={r.id} r={r} theme={theme} onPress={openDetail} />)
            )}
          </div>

          <div style={{ margin:'0 16px', padding:'14px 16px',
            background:`${theme.brandDark}0E`, border:`1px solid ${theme.brandDark}25`,
            borderRadius:'14px', display:'flex', gap:'10px', marginBottom:'16px' }}>
            <span style={{ fontSize:'16px', flexShrink:0 }}>📋</span>
            <span style={{ fontSize:'12px', color:COLORS.t2, lineHeight:1.7 }}>
              투자자용 · 세무사용 · 기관제출용 보고서가 매월 1일 자동 생성됩니다.
              보고서와 증빙 파일은 5년간 보관됩니다.
            </span>
          </div>

          <div style={{ padding:'0 16px 32px' }}>
            {/* [권한] 전체 다운로드: master · admin · accounting 전용 */}
            {canExportReport ? (
              <button style={{ width:'100%', padding:'14px', background:COLORS.bgCard,
                border:`1.5px solid ${COLORS.borderSoft}`, borderRadius:'14px',
                color:COLORS.t2, fontSize:'14px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit', boxShadow:SHADOWS.card }}>
                전체 다운로드 (ZIP)
              </button>
            ) : (
              <div style={{ width:'100%', padding:'14px', background:'#F9FAFB',
                border:'1.5px solid #E5E7EB', borderRadius:'14px',
                color:'#9CA3AF', fontSize:'13px', fontWeight:600, textAlign:'center' }}>
                🔒 전체 다운로드 (최고관리자·관리자·재무담당자 전용)
                          </div>
            )}
          </div>
        </div>
      </div>
    </PhoneShell>
  )
}
