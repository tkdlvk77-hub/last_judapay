import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useUser } from '../contexts/UserContext'
import MccBlock, { DEFAULT_MCC } from './execute/MccBlock'
import { useStepHistory } from '../hooks/useStepHistory'

// ─── MCC 설정 풀스크린 ────────────────────────────────────
function MCCScreen({ mccItems, onChange, onClose, exiting }) {
  const theme = getAccountTheme()
  const blockedCount = mccItems.filter(m => m.block).length
  return (
    <div
      className={exiting ? 'page-exit-right' : 'page-enter-right'}
      style={{ position:'absolute', inset:0, zIndex:100, display:'flex', flexDirection:'column', background: COLORS.bg }}
    >
      <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingBottom:'16px', paddingLeft:'16px', paddingRight:'16px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={onClose}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>MCC 차단 설정</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'3px' }}>
              {blockedCount > 0 ? `${blockedCount}개 카테고리 차단 중` : '차단 항목은 이 카드로 결제 불가합니다'}
            </div>
          </div>
          {blockedCount > 0 && (
            <span style={{ fontSize:'12px', fontWeight:700, color:'#FCA5A5', background:'rgba(239,68,68,0.2)', padding:'3px 10px', borderRadius:'8px' }}>
              {blockedCount}개 차단
            </span>
          )}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
        <MccBlock items={mccItems} onChange={onChange} showInfoBox={false} />
      </div>
      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard, display:'grid', gridTemplateColumns:'1fr 2fr', gap:'8px' }}>
        <button onClick={onClose}
          style={{ height:'52px', background: COLORS.bgMuted, color: COLORS.t2, border:'none', borderRadius: RADIUS.md, fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          취소
        </button>
        <button onClick={onClose}
          style={{ height:'52px', background: theme.brandDark, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.buttonBrand }}>
          저장
        </button>
      </div>
    </div>
  )
}

// ─── 데모 데이터 ──────────────────────────────────────────
const PAYMENTS = {
  p1: {
    id:'p1', status:'normal', amount:32000,
    merchant:'이마트 역삼점', mcc:'5411 · 식료품/마트', mccCode:'5411',
    mccBlocked:false, timestamp:'2026.05.05 14:32',
    walletLabel:'서울시 · 4월 교육비', walletSub:'만료 D-3 · 우선순위 1위',
    receiver:'이유진', category:null, categoryAuto:false,
    allowedMcc:[
      { code:'식료품 5411', num:'5411', allowed:true },
      { code:'교육 8299',   num:'8299', allowed:true },
      { code:'의료 8099',   num:'8099', allowed:true },
      { code:'게임 7993',   num:'7993', allowed:false },
    ],
  },
  p2: {
    id:'p2', status:'blocked', amount:150000,
    merchant:'GS강남게임센터', mcc:'7993 · 오락/게임', mccCode:'7993',
    mccBlocked:true, timestamp:'2026.04.28 22:14',
    walletLabel:'박철수 · 운영비 지갑', walletSub:'MCC 차단으로 미차감',
    receiver:'박철수', category:null, categoryAuto:false,
    blockReason:'박철수 지갑의 허용 MCC 목록에 오락/게임(7993)이 포함되지 않아 자동 차단됐습니다.',
    blockRecord:'발신자(서울시)에게 자동 통보됨 · 기록 5년 보관',
    allowedMcc:[
      { code:'식료품 5411', num:'5411', allowed:true },
      { code:'교통 4111',   num:'4111', allowed:true },
      { code:'의료 8099',   num:'8099', allowed:true },
      { code:'게임 7993',   num:'7993', allowed:false },
    ],
  },
  a1: {
    id:'a1', status:'blocked', amount:85000,
    merchant:'㈜오로라 · MCC 차단', mcc:'9999 · 미분류', mccCode:'9999',
    mccBlocked:true, timestamp:'2026.05.11 방금',
    walletLabel:'투자 자금 · 오로라', walletSub:'MCC 차단으로 미차감',
    receiver:'㈜오로라', category:null, categoryAuto:false,
    blockReason:'투자 자금 지갑의 허용 MCC 목록에 해당 업종(9999)이 포함되지 않아 자동 차단됐습니다.',
    blockRecord:'발신자에게 자동 통보됨 · 기록 5년 보관',
    allowedMcc:[
      { code:'제조 3559',   num:'3559', allowed:true },
      { code:'서비스 7389', num:'7389', allowed:true },
      { code:'미분류 9999', num:'9999', allowed:false },
    ],
  },
  a2: {
    id:'a2', status:'done', amount:5800000,
    merchant:'강남 임대료', mcc:'6513 · 임대/부동산', mccCode:'6513',
    mccBlocked:false, timestamp:'2026.05.11 09:00',
    walletLabel:'법인 자금', walletSub:'자동 지급 완료',
    receiver:'강남빌딩 관리사무소', category:'임대료', categoryAuto:true,
    allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }],
  },
  a3: {
    id:'a3', status:'blocked', amount:45000,
    merchant:'GS강남게임센터', mcc:'7993 · 오락/게임', mccCode:'7993',
    mccBlocked:true, timestamp:'2026.04.28 주 카드',
    walletLabel:'주 카드 · 운영비', walletSub:'MCC 차단으로 미차감',
    receiver:'GS강남게임센터', category:null, categoryAuto:false,
    blockReason:'주 카드 지갑의 허용 MCC 목록에 오락/게임(7993)이 포함되지 않아 자동 차단됐습니다.',
    blockRecord:'이용자에게 자동 통보됨 · 기록 5년 보관',
    allowedMcc:[
      { code:'식료품 5411', num:'5411', allowed:true },
      { code:'카페 5814',   num:'5814', allowed:true },
      { code:'게임 7993',   num:'7993', allowed:false },
    ],
  },
  // ── ㈜오로라 집행 로그 항목들 ──
  e1: { id:'e1', status:'normal', amount:340000, merchant:'어도비 코리아', mcc:'7372 · 소프트웨어', mccCode:'7372', mccBlocked:false, timestamp:'2026.05.06 14:22', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'집행 완료', receiver:'㈜오로라', category:'구독료', categoryAuto:true, allowedMcc:[{ code:'IT/소프트웨어 7372', num:'7372', allowed:true },{ code:'디자인 7336', num:'7336', allowed:true }] },
  e2: { id:'e2', status:'normal', amount:60000, merchant:'피그마 구독', mcc:'7372 · 소프트웨어', mccCode:'7372', mccBlocked:false, timestamp:'2026.05.02 10:15', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'집행 완료', receiver:'㈜오로라', category:'구독료', categoryAuto:true, allowedMcc:[{ code:'IT/소프트웨어 7372', num:'7372', allowed:true }] },
  e3: { id:'e3', status:'blocked', amount:89000, merchant:'강남 룸살롱', mcc:'5813 · 유흥/주점', mccCode:'5813', mccBlocked:true, timestamp:'2026.04.22 09:30', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'MCC 차단으로 미차감', receiver:'㈜오로라', category:null, categoryAuto:false, blockReason:'외주비 지갑의 허용 MCC 목록에 유흥/주점(5813)이 포함되지 않아 자동 차단됐습니다.', blockRecord:'발신자(㈜오로라)에게 자동 통보됨 · 기록 5년 보관', allowedMcc:[{ code:'IT/소프트웨어 7372', num:'7372', allowed:true },{ code:'디자인 7336', num:'7336', allowed:true },{ code:'유흥 5813', num:'5813', allowed:false }] },
  e4: { id:'e4', status:'normal', amount:155000, merchant:'무신사 스토어', mcc:'5651 · 패션/의류', mccCode:'5651', mccBlocked:false, timestamp:'2026.04.15 16:00', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'집행 완료', receiver:'㈜오로라', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  e5: { id:'e5', status:'normal', amount:280000, merchant:'AWS 코리아', mcc:'7372 · 소프트웨어', mccCode:'7372', mccBlocked:false, timestamp:'2026.04.08 11:20', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'집행 완료', receiver:'㈜오로라', category:'외주비/프리랜서', categoryAuto:true, allowedMcc:[{ code:'IT/소프트웨어 7372', num:'7372', allowed:true }] },
  e6: { id:'e6', status:'blocked', amount:230000, merchant:'강남 카지노', mcc:'7995 · 도박/카지노', mccCode:'7995', mccBlocked:true, timestamp:'2026.03.20 21:45', walletLabel:'외주비 지갑 · ㈜오로라', walletSub:'MCC 차단으로 미차감', receiver:'㈜오로라', category:null, categoryAuto:false, blockReason:'외주비 지갑의 허용 MCC 목록에 도박/카지노(7995)가 포함되지 않아 자동 차단됐습니다. 항상 차단 업종입니다.', blockRecord:'발신자(㈜오로라)에게 자동 통보됨 · 보안팀 리포트 생성됨 · 기록 5년 보관', allowedMcc:[{ code:'IT/소프트웨어 7372', num:'7372', allowed:true },{ code:'카지노 7995', num:'7995', allowed:false }] },
  // 기존 데이터 유지
  l1: { id:'l1', status:'normal', amount:4500, merchant:'스타벅스 강남점', mcc:'5814 · 카페/패스트푸드', mccCode:'5814', mccBlocked:false, timestamp:'2026.05.06 09:12', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:'카페', categoryAuto:true, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  l2: { id:'l2', status:'incoming', amount:200000, merchant:'서울시 교육비 지원', mcc:'정부 지원금', mccCode:'-', mccBlocked:false, timestamp:'2026.05.05 14:00', walletLabel:'서울시 · 4월 교육비', walletSub:'권한 자금 · MCC 교육 한정', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'교육 8299', num:'8299', allowed:true },{ code:'식료품 5411', num:'5411', allowed:true },{ code:'의료 8099', num:'8099', allowed:true },{ code:'게임 7993', num:'7993', allowed:false }] },
  log_today_2: { id:'log_today_2', status:'normal', amount:3200, merchant:'CU 역삼점', mcc:'5411 · 편의점', mccCode:'5411', mccBlocked:false, timestamp:'2026.05.06 07:45', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_y_3: { id:'log_y_3', status:'normal', amount:12500, merchant:'택시 카드결제', mcc:'4111 · 교통', mccCode:'4111', mccBlocked:false, timestamp:'2026.05.05 08:20', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:'교통비', categoryAuto:true, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_w_1: { id:'log_w_1', status:'normal', amount:1000000, merchant:'박민준에게 빌려줌', mcc:'개인 송금 · 빌려주기', mccCode:'-', mccBlocked:false, timestamp:'2026.05.04 16:30', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'박민준', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_w_2: { id:'log_w_2', status:'normal', amount:28900, merchant:'올리브영 강남점', mcc:'5912 · 생활/뷰티', mccCode:'5912', mccBlocked:false, timestamp:'2026.05.03 19:12', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:'생활비', categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_lw_2: { id:'log_lw_2', status:'normal', amount:29900, merchant:'쿠팡 정기결제', mcc:'5732 · 쇼핑/구독', mccCode:'5732', mccBlocked:false, timestamp:'2026.04.27 03:00', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:'구독료', categoryAuto:true, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_old_1: { id:'log_old_1', status:'incoming', amount:1500000, merchant:'박철수 외주비 입금', mcc:'외주비 · 검수 완료', mccCode:'-', mccBlocked:false, timestamp:'2026.04.20 14:00', walletLabel:'MY 지갑', walletSub:'외주비 · 검수 후 자동 출금', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  log_old_2: { id:'log_old_2', status:'normal', amount:50000, merchant:'이호형에게 송금', mcc:'개인 송금 · 선물', mccCode:'-', mccBlocked:false, timestamp:'2026.04.18 21:05', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_my_1: { id:'txn_my_1', status:'incoming', amount:500000, merchant:'(주)오로라 디자인 외주', mcc:'외주비 · 사업자 발신', mccCode:'-', mccBlocked:false, timestamp:'2026.05.06 10분 전', walletLabel:'MY 지갑', walletSub:'사업자 발신 · 검수 후 출금', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_my_3: { id:'txn_my_3', status:'normal', amount:450000, merchant:'국민은행 1234***5678', mcc:'본인 명의 계좌 출금', mccCode:'-', mccBlocked:false, timestamp:'2026.05.05 18:42', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_my_4: { id:'txn_my_4', status:'incoming', amount:1200000, merchant:'(주)오로라 11월 급여', mcc:'급여 · 정기 입금', mccCode:'-', mccBlocked:false, timestamp:'2026.05.05 09:00', walletLabel:'MY 지갑', walletSub:'사업자 발신 · 정기', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_my_5: { id:'txn_my_5', status:'incoming', amount:432000, merchant:'카카오뱅크 충전', mcc:'본인 명의 충전', mccCode:'-', mccBlocked:false, timestamp:'2026.05.01 15:00', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_edu_4: { id:'txn_edu_4', status:'normal', amount:18000, merchant:'예스24 인터넷서점', mcc:'5942 · 서적/교육', mccCode:'5942', mccBlocked:false, timestamp:'2026.05.03 11:00', walletLabel:'서울시 · 교육비 지원', walletSub:'학원·서점 MCC 전용', receiver:'이호형', category:'교육비', categoryAuto:true, allowedMcc:[{ code:'교육 8299', num:'8299', allowed:true },{ code:'서적 5942', num:'5942', allowed:true },{ code:'식료품 5411', num:'5411', allowed:true },{ code:'게임 7993', num:'7993', allowed:false }] },
  txn_mom_1: { id:'txn_mom_1', status:'normal', amount:8500, merchant:'스타벅스 강남점', mcc:'5814 · 카페', mccCode:'5814', mccBlocked:false, timestamp:'2026.05.04 15:20', walletLabel:'엄마 · 용돈', walletSub:'카드 결제만', receiver:'이호형', category:'카페', categoryAuto:true, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_mom_2: { id:'txn_mom_2', status:'normal', amount:15000, merchant:'CGV 강남', mcc:'7832 · 영화', mccCode:'7832', mccBlocked:false, timestamp:'2026.05.02 19:30', walletLabel:'엄마 · 용돈', walletSub:'카드 결제만', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_mom_3: { id:'txn_mom_3', status:'incoming', amount:200000, merchant:'엄마 용돈', mcc:'선물 · 가족', mccCode:'-', mccBlocked:false, timestamp:'2026.05.01 10:00', walletLabel:'엄마 · 용돈', walletSub:'선물 · 카드 결제만', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_lent_1: { id:'txn_lent_1', status:'normal', amount:300000, merchant:'농협 ATM 출금', mcc:'박민준 카드 사용', mccCode:'-', mccBlocked:false, timestamp:'2026.05.05 14:20', walletLabel:'박민준 · 빌려준 돈', walletSub:'대여 자금 · 차용증', receiver:'박민준', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_lent_2: { id:'txn_lent_2', status:'incoming', amount:1000000, merchant:'박민준 빌려주기', mcc:'대여 · 차용증', mccCode:'-', mccBlocked:false, timestamp:'2026.05.01 16:30', walletLabel:'박민준 · 빌려준 돈', walletSub:'차용증 모두싸인 완료', receiver:'박민준', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  txn_fl_1: { id:'txn_fl_1', status:'incoming', amount:1500000, merchant:'박철수 외주 의뢰 입금', mcc:'외주비 · 검수 대기', mccCode:'-', mccBlocked:false, timestamp:'2026.04.28 10:00', walletLabel:'박철수 · 외주비', walletSub:'검수 대기 중', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
  p_card_1: { id:'p_card_1', status:'normal', amount:32000, merchant:'이마트 역삼점', mcc:'5411 · 식료품/마트', mccCode:'5411', mccBlocked:false, timestamp:'2026.05.05 14:32', walletLabel:'서울시 · 4월 교육비', walletSub:'만료 D-3 · 우선순위 1위', receiver:'이호형', category:null, categoryAuto:false, allowedMcc:[{ code:'식료품 5411', num:'5411', allowed:true },{ code:'교육 8299', num:'8299', allowed:true },{ code:'의료 8099', num:'8099', allowed:true },{ code:'게임 7993', num:'7993', allowed:false }] },
  p_card_2: { id:'p_card_2', status:'normal', amount:7500, merchant:'스타벅스 강남점', mcc:'5814 · 카페', mccCode:'5814', mccBlocked:false, timestamp:'2026.05.05 09:15', walletLabel:'엄마 · 용돈', walletSub:'식비·마트 결제 가능', receiver:'이호형', category:'카페', categoryAuto:true, allowedMcc:[{ code:'식료품 5411', num:'5411', allowed:true },{ code:'카페 5814', num:'5814', allowed:true },{ code:'음식점 5812', num:'5812', allowed:true }] },
  p_card_4: { id:'p_card_4', status:'normal', amount:23000, merchant:'올리브영 강남점', mcc:'5912 · 생활/뷰티', mccCode:'5912', mccBlocked:false, timestamp:'2026.04.27 16:44', walletLabel:'MY 지갑', walletSub:'자유 사용', receiver:'이호형', category:'생활비', categoryAuto:false, allowedMcc:[{ code:'전체 허용', num:'*', allowed:true }] },
}

// ─── 공통 카드 스타일 ──────────────────────────────────────
const CARD = {
  background:'#FFFFFF',
  borderRadius:'14px',
  border:'1px solid #E9EAEC',
  overflow:'hidden',
}

const PURPOSE_OPTIONS = ['운영', '출장식대', '복리후생', '기타', '개인사용']

// ─── 정보 행 ──────────────────────────────────────────────
function InfoRow({ label, value, sub, valueColor, last }) {
  return (
    <div style={{
      padding:'13px 16px',
      borderBottom: last ? 'none' : '1px solid #F0F1F3',
      display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px',
    }}>
      <span style={{ fontSize:'12px', color:'#9CA3AF', paddingTop:'1px', flexShrink:0 }}>{label}</span>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color: valueColor || '#111827' }}>{value}</div>
        {sub && <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function PaymentDetail() {
  const theme = getAccountTheme()
  const { id } = useParams()
  const navigate = useNavigate()
  const _pdRole  = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const isViewer = _pdRole === 'viewer'
  const location = useLocation()
  const { userType } = useUser()
  const payment = PAYMENTS[id] || PAYMENTS.p1

  const isBlocked  = payment.status === 'blocked'
  const isIncoming = payment.status === 'incoming'
  const isDone     = payment.status === 'done'

  // PaymentAlerts에서 navigate 시 state로 넘어온 결제 타입으로 판별
  const paymentType       = location.state?.paymentType ?? null
  const isPersonal        = userType === 'personal'
  const isMinePayment     = isPersonal && paymentType === 'mine'
  const isExternalPayment = isPersonal && paymentType === 'external'

  const [tempAllowed, setTempAllowed] = useState(false)
  const [showMCC, setShowMCC] = useState(false)
  const [mccExiting, setMccExiting] = useState(false)
  const [mccItems, setMccItems] = useState(DEFAULT_MCC.map(m => ({ ...m })))

  const closeMCC = () => {
    setMccExiting(true)
    setTimeout(() => { setShowMCC(false); setMccExiting(false) }, 320)
  }

  useStepHistory(closeMCC, !showMCC)

  // ── 결제 목적 분류 상태 ──
  const [purposeOverride, setPurposeOverride] = useState(null)
  const [showClassify, setShowClassify] = useState(false)

  const effectiveCategory = purposeOverride ?? payment.category
  const effectiveCategoryAuto = purposeOverride ? false : payment.categoryAuto
  const showCategory = !isBlocked && !isIncoming

  // ── 추가 서류 요청 모달 상태 ──
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimReq, setClaimReq]   = useState(true)
  const [evidReq, setEvidReq]     = useState(false)
  const [claimMsg, setClaimMsg]   = useState('소명 부탁드립니다.')
  const [msgEdited, setMsgEdited] = useState(false)
  const [toast, setToast]         = useState(null)

  const autoMsg = (c, e) =>
    c && e ? '소명 및 영수증 증빙 부탁드립니다.'
    : c ? '소명 부탁드립니다.'
    : e ? '영수증 증빙 부탁드립니다.'
    : ''

  const toggleClaim = () => {
    const next = !claimReq; setClaimReq(next)
    if (!msgEdited) setClaimMsg(autoMsg(next, evidReq))
  }
  const toggleEvid = () => {
    const next = !evidReq; setEvidReq(next)
    if (!msgEdited) setClaimMsg(autoMsg(claimReq, next))
  }
  const handleClaimSend = () => {
    setShowClaimModal(false)
    setToast('💬 메시지로 전달 완료')
    setTimeout(() => setToast(null), 2400)
    // 모달 초기화
    setClaimReq(true); setEvidReq(false)
    setClaimMsg('소명 부탁드립니다.'); setMsgEdited(false)
  }
  const canSend = (claimReq || evidReq) && claimMsg.trim().length > 0

  // 상태별 색상 토큰
  const statusToken = isBlocked
    ? { label:'차단됨', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444' }
    : isIncoming
    ? { label:'입금 완료', color:'#047857', bg:'#F0FDF4', border:'#BBF7D0', dot:'#10B981' }
    : isDone
    ? { label:'지급 완료', color:'#047857', bg:'#F0FDF4', border:'#BBF7D0', dot:'#10B981' }
    : { label:'정상', color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE', dot:'#3B82F6' }

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', background:'#F4F5F7' }}>

          {/* ── 헤더 ── */}
          <div style={{
            background: theme.headerSolid,
            paddingTop:'max(20px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'18px', paddingLeft:'16px',
            display:'flex', alignItems:'center', gap:'10px',
          }}>
            <button onClick={() => navigate(-1)}
              style={{ width:'34px', height:'34px', borderRadius:'10px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#fff' }}>결제 상세</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>{payment.timestamp}</div>
            </div>
            {/* 상태 뱃지 */}
            <span style={{
              padding:'4px 12px', borderRadius:'20px',
              fontSize:'11px', fontWeight:700,
              color: isBlocked ? '#FCA5A5' : isIncoming || isDone ? '#6EE7B7' : 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              {statusToken.label}
            </span>
          </div>

          <div style={{ padding:'14px 14px 32px', display:'flex', flexDirection:'column', gap:'10px' }}>

            {/* ── 금액 히어로 ── */}
            <div style={{ ...CARD, padding:'24px 20px', textAlign:'center' }}>
              {/* 가맹점명 */}
              <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'8px', fontWeight:500 }}>
                {payment.merchant}
              </div>
              {/* 금액 */}
              <div style={{
                fontSize:'36px', fontWeight:800, letterSpacing:'-1.5px',
                color: isBlocked ? '#DC2626' : isIncoming || isDone ? '#047857' : '#111827',
                marginBottom:'14px',
              }}>
                {isIncoming || isDone ? '+' : isBlocked ? '' : '-'}
                {payment.amount.toLocaleString()}
                <span style={{ fontSize:'20px', fontWeight:700 }}>원</span>
              </div>
              {/* 지갑 뱃지 */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                padding:'6px 14px', borderRadius:'20px',
                background: statusToken.bg, border:`1px solid ${statusToken.border}`,
              }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: statusToken.dot }} />
                <span style={{ fontSize:'12px', fontWeight:600, color: statusToken.color }}>
                  {payment.walletLabel}
                </span>
              </div>
              {payment.walletSub && (
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'8px' }}>{payment.walletSub}</div>
              )}
            </div>

            {/* ── 거래 정보 ── */}
            <div style={CARD}>
              <div style={{ padding:'13px 16px 10px', borderBottom:'1px solid #F0F1F3' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.8px' }}>DETAILS</div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginTop:'3px' }}>거래 정보</div>
              </div>
              <InfoRow label="가맹점" value={payment.merchant} />
              <InfoRow label="MCC" value={payment.mcc}
                valueColor={payment.mccBlocked ? '#DC2626' : '#111827'} />
              <InfoRow label="일시" value={payment.timestamp} />
              {payment.receiver && (
                <InfoRow label="수령인" value={payment.receiver} last={!showCategory} />
              )}
              {/* 결제 목적 분류 */}
              {showCategory && (
                <div style={{ padding:'13px 16px', display:'flex',
                  justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'12px', color:'#9CA3AF' }}>결제 목적</span>
                  {effectiveCategory === null ? (
                    <button onClick={() => setShowClassify(true)}
                      style={{ display:'inline-flex', alignItems:'center', gap:'4px',
                        padding:'4px 10px', borderRadius:'6px',
                        background:'#FFFBEB', border:'1px solid #FDE68A',
                        fontSize:'11px', fontWeight:700, color:'#92400E',
                        cursor:'pointer', fontFamily:'inherit' }}>
                      ⚠ 미분류 · 분류하기
                    </button>
                  ) : effectiveCategoryAuto ? (
                    <button onClick={() => setShowClassify(true)}
                      style={{ display:'inline-flex', alignItems:'center', gap:'4px',
                        padding:'4px 10px', borderRadius:'6px',
                        background:'#F0FDF4', border:'1px solid #BBF7D0',
                        fontSize:'11px', fontWeight:700, color:'#047857',
                        cursor:'pointer', fontFamily:'inherit' }}>
                      ✦ {effectiveCategory} · 자동
                    </button>
                  ) : (
                    <button onClick={() => setShowClassify(true)}
                      style={{ display:'inline-flex', alignItems:'center', gap:'4px',
                        padding:'4px 10px', borderRadius:'6px',
                        background:'#EFF6FF', border:'1px solid #BFDBFE',
                        fontSize:'11px', fontWeight:700, color:'#1D4ED8',
                        cursor:'pointer', fontFamily:'inherit' }}>
                      ✓ {effectiveCategory}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── 차단 사유 (차단된 경우만) ── */}
            {isBlocked && (
              <div style={CARD}>
                <div style={{ padding:'13px 16px 10px', borderBottom:'1px solid #F0F1F3', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#EF4444', letterSpacing:'0.8px' }}>BLOCKED</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginTop:'3px' }}>차단 사유</div>
                  </div>
                  {/* 임시 허용 버튼 */}
                  {tempAllowed ? (
                    <span style={{
                      padding:'5px 12px', borderRadius:'8px',
                      fontSize:'11px', fontWeight:700,
                      background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#047857',
                    }}>
                      ✓ 임시 허용됨
                    </span>
                  ) : (
                    <button onClick={() => setTempAllowed(true)}
                      style={{
                        padding:'5px 12px', borderRadius:'8px',
                        fontSize:'11px', fontWeight:700,
                        background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E',
                        cursor:'pointer', fontFamily:'inherit',
                      }}>
                      임시 허용
                    </button>
                  )}
                </div>

                {/* 차단된 MCC */}
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #F0F1F3', display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'#FEF2F2',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#DC2626' }}>
                      MCC {payment.mccCode} · {payment.mcc.split(' · ')[1] || payment.mcc}
                    </div>
                    <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'3px' }}>허용 목록 미포함 업종</div>
                  </div>
                </div>

                {/* 차단 이유 설명 */}
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #F0F1F3' }}>
                  <div style={{ fontSize:'12px', color:'#4B5563', lineHeight:1.7 }}>{payment.blockReason}</div>
                </div>

                {/* 임시 허용 안내 */}
                {tempAllowed && (
                  <div style={{ padding:'12px 16px', background:'#FFFBEB', borderTop:'1px solid #FDE68A' }}>
                    <div style={{ fontSize:'11px', color:'#92400E', lineHeight:1.6, fontWeight:500 }}>
                      MCC {payment.mccCode}이 임시 허용 목록에 추가됐습니다.<br/>
                      MCC 설정에서 영구 허용 여부를 관리하세요.
                    </div>
                  </div>
                )}

                {/* 차단 기록 */}
                <div style={{ padding:'12px 16px' }}>
                  <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{payment.blockRecord}</div>
                </div>
              </div>
            )}

            {/* ── MCC 허용 정책 ── */}
            <div style={CARD}>
              <div style={{ padding:'13px 16px 10px', borderBottom:'1px solid #F0F1F3' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', letterSpacing:'0.8px' }}>POLICY</div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginTop:'3px' }}>
                  {isBlocked ? `${payment.receiver} 허용 MCC` : 'MCC 허용 정책'}
                </div>
              </div>
              {payment.allowedMcc.map((m, i, arr) => (
                <div key={m.code} style={{
                  padding:'11px 16px',
                  borderBottom: i < arr.length-1 ? '1px solid #F0F1F3' : 'none',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                  <div style={{
                    width:'20px', height:'20px', borderRadius:'6px', flexShrink:0,
                    background: m.allowed ? '#F0FDF4' : '#FEF2F2',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {m.allowed
                      ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="3" y1="3" x2="9" y2="9" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="3" x2="3" y2="9" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    }
                  </div>
                  <span style={{
                    fontSize:'13px', fontWeight:500,
                    color: m.allowed ? '#111827' : '#9CA3AF',
                    textDecoration: m.allowed ? 'none' : 'line-through',
                  }}>
                    {m.code}
                  </span>
                  {!m.allowed && (
                    <span style={{
                      marginLeft:'auto', fontSize:'10px', fontWeight:600,
                      color:'#EF4444', background:'#FEF2F2',
                      padding:'2px 7px', borderRadius:'4px',
                    }}>차단</span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── 하단 버튼 ── */}
        <div style={{
          padding:'12px 14px 28px',
          borderTop:'1px solid #E9EAEC',
          background:'#FFFFFF',
          display:'grid',
          gridTemplateColumns: (isPersonal && isMinePayment) ? '1fr' : '1fr 1fr',
          gap:'8px',
        }}>
          {/* 개인 + 내 결제 → 닫기 버튼만 */}
          {isPersonal && isMinePayment ? (
            <button onClick={() => navigate(-1)}
              style={{
                height:'50px', background:'#F4F5F7', color:'#374151',
                border:'1px solid #E9EAEC', borderRadius:'12px',
                fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              닫기
            </button>
          ) : (
            <>
              {/* 소명 요청 — viewer는 잠금 */}
              <button
                onClick={() => {
                  if (isExternalPayment) {
                    !isViewer && navigate('/messages', { state: { prefillMsg: '해당 내역 소명 부탁드립니다.' } })
                  } else {
                    setShowClaimModal(true)
                  }
                }}
                style={{
                  height:'50px', background:'#F4F5F7', color:'#374151',
                  border:'1px solid #E9EAEC', borderRadius:'12px',
                  fontSize:'13px', fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {isViewer ? '🔒 소명 요청' : '소명 요청'}
              </button>
              {/* MCC 설정 */}
              <button onClick={() => !isViewer && setShowMCC(true)} disabled={isViewer} title={isViewer ? "조회 전용 권한" : undefined}
                style={{
                  height:'50px',
                  background: theme.activeBtnGrad || theme.headerGrad || '#1D4ED8',
                  color:'#fff',
                  border:'none', borderRadius:'12px',
                  fontSize:'13px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                  boxShadow: theme.activeShadow || 'none',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                MCC 설정
              </button>
            </>
          )}
        </div>
      </div>
      {/* ── MCC 설정 풀스크린 ── */}
      {showMCC && (
        <MCCScreen
          mccItems={mccItems}
          onChange={setMccItems}
          onClose={closeMCC}
          exiting={mccExiting}
        />
      )}

      {/* ── 추가 서류 요청 모달 ── */}
      {showClaimModal && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
          zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#fff', borderRadius:'18px', padding:'22px 20px', width:'100%' }}>

            {/* 제목 */}
            <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'4px' }}>
              추가 서류 요청
            </div>
            <div style={{ fontSize:'12px', color:'#6B7280', marginBottom:'16px', lineHeight:1.5 }}>
              "{payment.merchant}"에 대한 추가 요청을 전송합니다.
            </div>

            {/* 소명 요청 토글 */}
            <div onClick={toggleClaim}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom:'8px', cursor:'pointer',
                background: claimReq ? '#F0FDF4' : '#F9FAFB',
                border: `1.5px solid ${claimReq ? '#6EE7B7' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700,
                  color: claimReq ? '#047857' : '#374151' }}>소명 요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>
                  업무 목적 소명 요청 — 메시지로 전달
                </div>
              </div>
              {/* Toggle */}
              <div style={{ width:'40px', height:'22px', borderRadius:'11px', flexShrink:0,
                background: claimReq ? '#10B981' : '#D1D5DB', position:'relative', transition:'background 0.2s' }}>
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#fff',
                  position:'absolute', top:'2px', left: claimReq ? '20px' : '2px',
                  transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* 증빙 요청 토글 */}
            <div onClick={toggleEvid}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:'12px', marginBottom:'16px', cursor:'pointer',
                background: evidReq ? '#ECFEFF' : '#F9FAFB',
                border: `1.5px solid ${evidReq ? '#67E8F9' : '#E9EAEC'}`,
                transition:'all 0.15s' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700,
                  color: evidReq ? '#0E7490' : '#374151' }}>증빙 요청</div>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>
                  영수증·서류 첨부 요청 — 메시지로 전달
                </div>
              </div>
              {/* Toggle */}
              <div style={{ width:'40px', height:'22px', borderRadius:'11px', flexShrink:0,
                background: evidReq ? '#0891B2' : '#D1D5DB', position:'relative', transition:'background 0.2s' }}>
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#fff',
                  position:'absolute', top:'2px', left: evidReq ? '20px' : '2px',
                  transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* 전송 메시지 */}
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151',
              marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              전송 메시지
              <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:400 }}>(직접 수정 가능)</span>
            </div>
            <textarea value={claimMsg}
              onChange={e => { setMsgEdited(true); setClaimMsg(e.target.value) }}
              rows={3}
              style={{ width:'100%', borderRadius:'10px', border:'1px solid #E9EAEC',
                padding:'10px 12px', fontSize:'12px', color:'#111827', fontFamily:'inherit',
                resize:'none', outline:'none', background:'#F8F9FF', marginBottom:'14px',
                boxSizing:'border-box', lineHeight:1.6 }} />

            {/* 버튼 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <button onClick={() => setShowClaimModal(false)}
                style={{ height:'44px', borderRadius:'12px', fontSize:'13px', fontWeight:600,
                  background:'#F4F5F7', color:'#374151', border:'1px solid #E9EAEC',
                  cursor:'pointer', fontFamily:'inherit' }}>취소</button>
              <button onClick={handleClaimSend} disabled={!canSend}
                style={{ height:'44px', borderRadius:'12px', fontSize:'13px', fontWeight:700,
                  background: canSend ? (theme.activeBtnGrad || theme.brandDark || '#4F46E5') : '#E9EAEC',
                  color: canSend ? '#fff' : '#9CA3AF', border:'none',
                  cursor: canSend ? 'pointer' : 'default', fontFamily:'inherit',
                  boxShadow: canSend ? (theme.activeShadow || 'none') : 'none',
                  opacity: canSend ? 1 : 0.6 }}>
                💬 메시지로 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 결제 목적 분류 바텀시트 ── */}
      {showClassify && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400,
          display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={() => setShowClassify(false)}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0',
            padding:'20px 16px 36px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:'36px', height:'4px', background:'#E9EAEC',
              borderRadius:'2px', margin:'0 auto 18px' }} />
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'4px' }}>
              결제 목적 분류
            </div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>
              {payment.merchant}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px' }}>
              {PURPOSE_OPTIONS.map((opt, i) => (
                <button key={opt}
                  onClick={() => { setPurposeOverride(opt); setShowClassify(false) }}
                  style={{ padding:'14px 0', borderRadius:'10px', fontSize:'14px', fontWeight:600,
                    cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                    background: effectiveCategory === opt ? theme.brandDark : '#F4F5F7',
                    color: effectiveCategory === opt ? '#fff' : '#374151',
                    border: effectiveCategory === opt ? 'none' : '1px solid #E9EAEC',
                    gridColumn: i === PURPOSE_OPTIONS.length - 1 && PURPOSE_OPTIONS.length % 2 === 1 ? 'span 2' : undefined }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div style={{ position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          background:'#111827', color:'#fff', padding:'9px 18px', borderRadius:'20px',
          fontSize:'12px', fontWeight:600, whiteSpace:'nowrap', zIndex:400,
          boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

    </PhoneShell>
  )
}
