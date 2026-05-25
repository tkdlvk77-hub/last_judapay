import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { getAccountTheme } from '../design/accountTokens'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useWalletState, refreshWallets } from '../services/walletStore'
import { session } from '../services/api'

// 서버 Wallet → MyWallet 카드 형태로 변환
function adaptServerWallet(w) {
  return {
    id:        w.id,
    name:      w.name,
    label:     w.label || (w.kind === 'MY' ? '자유 사용' : w.purposeLabel || ''),
    amount:    Number(w.balance || 0),
    available: Number(w.balance || 0) - Number(w.pendingOut || 0),
    kind:      w.kind,
    purpose:   w.purpose,
    icon:      w.icon || (w.kind === 'MY' ? '💳' : '🎁'),
    avatarBg:  w.avatarBg || '#5B4FE8',
    avatarFg:  w.avatarFg || '#FFFFFF',
    senderName: w.senderName,
    allowedMcc: w.allowedMcc,
    blockedMcc: w.blockedMcc,
    dailyLimit: w.dailyLimit,
    singleLimit: w.singleLimit,
    expiresAt:  w.expiresAt,
    _fromServer: true,
  }
}

const C = {
  navy:   '#0F172A',
  navy2:  '#1E293B',
  navy3:  '#334155',
  slate:  '#64748B',
  slateL: '#94A3B8',
  border: '#E2E8F0',
  bg:     '#F8FAFC',
  white:  '#FFFFFF',
  green:  '#059669',
  red:    '#DC2626',
}

// userType 판별 — sessionStorage.bizType 기준
// 'business' 이면 기업 지갑 목록, 그 외 개인 지갑 목록 표시
// 로그인 시 bizType을 sessionStorage에 저장해야 함 (→ 로그인 로직 참고)
function getUserType() {
  const s = sessionStorage.getItem('bizType')
  return s === 'business' ? 'business' : 'personal'
}

const FUND_COLOR = {
  my:           '#0F172A',
  invest:       '#0EA5E9',
  gift:         '#F59E0B',
  lend:         '#6366F1',
  freelance:    '#10B981',
  living:       '#0E7490',
  'invest-biz': '#8B5CF6',
}

const FUND_LABEL = {
  my:           '내 지갑',
  invest:       '지원금',
  gift:         '선물',
  lend:         '대여금',
  freelance:    '외주비',
  living:       '생활비',
  'invest-biz': '투자',
}

// ─────────────────────────────────────────────────────────────────────────────
// 지갑 목록 데이터 구조
//
// [공통 필드]
//   id           : WalletDetail.jsx WALLET_DATA 키와 반드시 일치
//   fund         : FUND_COLOR / FUND_LABEL 키 (색상·라벨 자동 매핑)
//   amount       : 현재 잔액 (프로그레스 바 numerator)
//   totalAmount  : 총 수령액 또는 설정 한도 (프로그레스 바 denominator)
//   deadlineDays : 집행 만료까지 남은 일수, null이면 표시 안함 (D-N 뱃지)
//
// [지갑 분류 원칙]
//   개인→개인   : living(생활비), lend(빌려주기), gift(선물)
//   개인→사업자 : freelance(외주비), invest(자금지원)
//   기업→개인   : lend(대여금 tracker)
//   기업→사업자 : invest-biz(투자 tracker)
//   기업이 받음 : invest(지원금 새지갑 — MCC 제한 있음)
//
// [생활비 지갑 특이사항]
//   최초 입금 시 새 지갑 생성 → 이후 동일 지갑에 월별 누적
//   isRecurring: true 이면 WalletDetail에서 월별 탭 뷰로 렌더링
// ─────────────────────────────────────────────────────────────────────────────

// ── 개인 지갑 예제 ───────────────────────────────────────────────────────────
// 개인→개인: 생활비(새지갑), 자금지원(새지갑), 빌려주기(tracker)
const PERSONAL_WALLETS = [
  { id: 'my',           label: '내 지갑',              sub: '충전 · 노동 대가 통합',              amount: 1932000,  totalAmount: 1932000,  fund: 'my',        deadlineDays: null },
  { id: 'living_mom',   label: '엄마 · 생활비',         sub: '매월 15일 자동입금 · 카드 결제만',  amount: 285000,   totalAmount: 300000,   fund: 'living',    deadlineDays: null },
  { id: 'living_dad',   label: '아빠 · 생활비',         sub: '매월 1일 자동입금 · 7월 전환',      amount: 700000,   totalAmount: 760000,   fund: 'living',    deadlineDays: null },
  { id: 'living_wife',  label: '배우자 · 생활비',       sub: '매월 25일 자동입금 · 카드 결제만',  amount: 420000,   totalAmount: 500000,   fund: 'living',    deadlineDays: null },
  { id: 'living_kid1',  label: '첫째 · 용돈',           sub: '매주 월요일 자동입금 · 편의점 제한',amount: 18000,    totalAmount: 30000,    fund: 'living',    deadlineDays: null },
  { id: 'living_kid2',  label: '둘째 · 용돈',           sub: '매주 월요일 자동입금',              amount: 12000,    totalAmount: 30000,    fund: 'living',    deadlineDays: null },
  { id: 'edu',          label: '서울시 · 자금지원',     sub: '교육 목적 MCC 제한 · D-56',         amount: 240000,   totalAmount: 300000,   fund: 'invest',    deadlineDays: 56   },
  { id: 'living_sister',label: '누나 · 생활비',         sub: '매월 10일 자동입금',                amount: 150000,   totalAmount: 200000,   fund: 'living',    deadlineDays: null },
  { id: 'lend_iho',     label: '이호준 · 빌려준 돈',    sub: '차용증 · 상환 진행 중',             amount: 850000,   totalAmount: 1000000,  fund: 'lend',      deadlineDays: null },
  { id: 'lend_park',    label: '박지수 · 빌려준 돈',    sub: '차용증 · D-120 만기',               amount: 500000,   totalAmount: 500000,   fund: 'lend',      deadlineDays: 120  },
  { id: 'invest_aurora',label: '㈜오로라 · 자금지원',   sub: '사업 목적 MCC 제한 · 집행 알림',    amount: 1800000,  totalAmount: 3000000,  fund: 'invest',    deadlineDays: null },
  { id: 'living_grandma',label: '할머니 · 용돈',        sub: '매월 1일 자동입금 · 생필품 전용',   amount: 95000,    totalAmount: 100000,   fund: 'living',    deadlineDays: null },
  { id: 'lend_choi',    label: '최민호 · 빌려준 돈',    sub: '차용증 · 3차 상환 대기',            amount: 1200000,  totalAmount: 2000000,  fund: 'lend',      deadlineDays: null },
  { id: 'living_friend',label: '김현수 · 선물',         sub: '일회성 · 생일 선물 지갑',           amount: 50000,    totalAmount: 50000,    fund: 'gift',      deadlineDays: null },
]

const PERSONAL_COMPLETED = [
  { id: 'c_living1',   label: '엄마 · 4월 생활비',    sub: '잔액 소진 · 4/30' },
  { id: 'c2',          label: '강남구 · 문화바우처',   sub: '잔액 12만원 완료 · 3/31' },
  { id: 'c_iho',       label: '이호준 · 상환 완료',    sub: '전액 상환 · 2.15' },
  { id: 'c_edu_prev',  label: '서울시 · 3월 교육비',   sub: '잔액 소진 · 3/31' },
  { id: 'c_gift_1',    label: '박민준 · 생일 선물',    sub: '전액 사용 · 1.20' },
  { id: 'c_lend_kim',  label: '김태양 · 상환 완료',    sub: '전액 상환 · 4.05' },
]

// ── 기업 지갑 예제 ───────────────────────────────────────────────────────────
// 기업→개인: 대여금 tracker / 기업→사업자: 투자 tracker
// 기업이 받은: 창원진흥원 자금지원(새지갑)
const BUSINESS_WALLETS = [
  { id: 'my',             label: '내 지갑',              sub: '운영 자금 통합',                        amount: 8430000,   totalAmount: 8430000,  fund: 'my',           deadlineDays: null },
  { id: 'changwon',       label: '창원진흥원 · 창업자금', sub: '사업 목적 MCC 제한 · 집행 시 진흥원 알림', amount: 3300000,  totalAmount: 5000000,  fund: 'invest',       deadlineDays: null },
  { id: 'lend_minjun_biz',label: '박민준 · 대여금',       sub: '대여금 추적 · 상환 진행 중',             amount: 15000000, totalAmount: 30000000, fund: 'lend',         deadlineDays: null },
  { id: 'invest_startup', label: '㈜스타트업A · 투자금',  sub: '시리즈A 투자 · 운영 현황 추적',          amount: 20000000, totalAmount: 60000000, fund: 'invest-biz',   deadlineDays: null },
]

const BUSINESS_COMPLETED = [
  { id: 'bc1', label: '서울시 · 스타트업 지원금', sub: '잔액 소진 · 3/31' },
  { id: 'bc2', label: '이영희 · 자금지원 완료',   sub: '전액 집행 · 4/15' },
  { id: 'bc3', label: '정창업 · 대여금 상환',     sub: '전액 상환 · 5.01' },
]

function ChevronRight({ color = C.slateL }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3L9 7L5 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function WalletCard({ wallet, onClick, isMy, navigate, theme, editMode, isTop, canWithdraw = true }) {
  const accentColor = FUND_COLOR[wallet.fund] || C.navy

  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        border: editMode
          ? isTop
            ? `2px solid ${C.navy}`
            : `1.5px dashed ${C.slateL}`
          : `1px solid ${C.border}`,
        borderRadius: '14px', overflow: 'hidden',
        cursor: editMode ? 'pointer' : 'pointer',
        transition: 'border .15s, box-shadow .15s',
        boxShadow: editMode && isTop ? '0 4px 16px rgba(15,23,42,0.12)' : 'none',
      }}
    >
      <div style={{ height: '3px', background: isTop && editMode ? C.navy : accentColor }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700,
                color: accentColor, letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                {FUND_LABEL[wallet.fund] || '지갑'}
                {wallet.deadlineDays && (
                  <span style={{ marginLeft: '8px', color: '#D97706', fontWeight: 700 }}>
                    D-{wallet.deadlineDays}
                  </span>
                )}
              </div>
              {/* 최상단 뱃지 */}
              {editMode && isTop && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  background: C.navy, borderRadius: '5px',
                  padding: '2px 7px',
                }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M4.5 1L5.8 3.7L8.8 4.1L6.65 6.2L7.1 9.1L4.5 7.7L1.9 9.1L2.35 6.2L0.2 4.1L3.2 3.7L4.5 1Z" fill="#fff"/>
                  </svg>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: C.white, letterSpacing: '0.3px' }}>최상단</span>
                </div>
              )}
              {/* 선택 유도 */}
              {editMode && !isTop && (
                <div style={{
                  fontSize: '9px', fontWeight: 600, color: C.slateL,
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: '5px', padding: '2px 7px', letterSpacing: '0.2px',
                }}>탭하면 최상단</div>
              )}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: editMode && !isTop ? C.slate : C.navy, letterSpacing: '-0.4px' }}>
              {wallet.label}
            </div>
            <div style={{ fontSize: '12px', color: C.slateL, marginTop: '2px' }}>{wallet.sub}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: editMode && !isTop ? C.slateL : C.navy, letterSpacing: '-0.7px' }}>
              {wallet.amount.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: C.slateL }}>원</div>
          </div>
        </div>

        {/* MY wallet action buttons — 일반 모드에서만 */}
        {isMy && !editMode && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {canWithdraw ? (
              <button
                onClick={e => { e.stopPropagation(); navigate('/withdraw') }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: '9px',
                  background: C.bg, color: C.navy2,
                  border: `1.5px solid ${C.border}`,
                  fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.3px',
                }}
              >출금</button>
            ) : (
              <div style={{
                flex: 1, padding: '11px 0', borderRadius: '9px',
                background: '#F9FAFB', color: '#9CA3AF',
                border: `1.5px solid #E5E7EB`,
                fontSize: '12px', fontWeight: 700,
                textAlign: 'center', letterSpacing: '-0.3px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}>
                🔒 출금
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); navigate('/charge') }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: '9px',
                background: theme ? theme.activeBtnGrad : C.navy,
                color: C.white, border: 'none',
                fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', letterSpacing: '-0.3px',
                boxShadow: theme ? theme.activeShadow : 'none',
              }}
            >충전</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyWallet() {
  const navigate  = useNavigate()
  const theme     = getAccountTheme()
  const scrollRef = useScrollRestore()
  const userType  = getUserType()
  const initList  = userType === 'business' ? BUSINESS_WALLETS : PERSONAL_WALLETS
  const completed = userType === 'business' ? BUSINESS_COMPLETED : PERSONAL_COMPLETED

  const [localWallets, setLocalWallets] = useState(initList)
  const [editMode, setEditMode] = useState(false)

  // ── 서버 지갑 (로그인 시 우선) ──
  const serverState = useWalletState()
  useEffect(() => { refreshWallets() }, [])
  const isAuthed = !!session.user
  const wallets = isAuthed && serverState.wallets.length > 0
    ? serverState.wallets.map(adaptServerWallet)
    : localWallets
  const setWallets = isAuthed ? () => {} : setLocalWallets   // 서버 모드에서는 reorder 비활성

  const total = wallets.reduce((s, w) => s + (w.amount || 0), 0)

  // [권한] 기업 기준 viewer 는 출금 버튼 비활성화
  const bizRole    = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canWithdraw = userType !== 'business' || bizRole !== 'viewer'

  // 선택한 지갑을 최상단으로 이동
  const moveToTop = idx => {
    if (idx === 0) return
    const next = [...wallets]
    const [picked] = next.splice(idx, 1)
    next.unshift(picked)
    setWallets(next)
  }

  const handleCardClick = (idx) => {
    if (editMode) {
      moveToTop(idx)
    } else {
      navigate('/wallet/' + wallets[idx].id)
    }
  }

  return (
    <PhoneShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Header ── */}
        <div style={{ background: theme.headerSolid, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 20px' }}>
            <button onClick={() => navigate(-1)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.white, padding: '4px', display: 'flex',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{
              flex: 1, fontSize: '16px',
              fontWeight: 700, color: C.white, letterSpacing: '-0.5px',
              marginLeft: '8px',
            }}>내 지갑</span>
          </div>

          <div style={{ padding: '0 20px' }}>
            <div style={{ fontSize: '11px', color: C.slateL, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px' }}>
              총 보유 자금
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: C.white, letterSpacing: '-2px', lineHeight: 1 }}>
                {total.toLocaleString()}
              </span>
              <span style={{ fontSize: '16px', color: C.slateL, fontWeight: 500 }}>원</span>
            </div>

            <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
              {[
                { label: '활성 지갑', value: wallets.length + '개' },
                { label: '출금 가능', value: wallets.find(w => w.id === 'my')?.amount.toLocaleString() + '원' },
                { label: '받은 지갑', value: (wallets.length - 1) + '개' },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: C.slateL, marginBottom: '3px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.white }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ background: C.bg, padding: '20px 16px 40px' }}>

          {/* Priority section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy, letterSpacing: '-0.4px' }}>
                  결제 우선순위
                </div>
                <div style={{ fontSize: '11px', color: C.slateL, marginTop: '2px' }}>
                  {editMode ? '지갑을 탭하면 최상단으로 이동' : '위에서부터 순서대로 사용'}
                </div>
              </div>

              <button
                onClick={() => setEditMode(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', borderRadius: '20px',
                  background: editMode ? C.navy : C.white,
                  border: `1.5px solid ${editMode ? C.navy : C.border}`,
                  color: editMode ? C.white : C.navy,
                  fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.2px',
                  transition: 'all .15s',
                }}
              >
                {editMode ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke={C.white} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    완료
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1.5L6 10.5M3 4.5L6 1.5L9 4.5" stroke={C.navy} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    순서편집
                  </>
                )}
              </button>
            </div>

            {wallets.map((w, i) => (
              <div
                key={w.id}
                style={{ marginBottom: '10px', transition: 'all .2s' }}
              >
                <WalletCard
                  wallet={w}
                  isMy={w.id === 'my'}
                  navigate={navigate}
                  theme={theme}
                  editMode={editMode}
                  isTop={i === 0}
                  onClick={() => handleCardClick(i)}
                  canWithdraw={canWithdraw}
                />
              </div>
            ))}
          </div>

          {/* Completed wallets */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy, letterSpacing: '-0.3px' }}>
                완료된 지갑
                <span style={{ color: C.slateL, fontWeight: 400, marginLeft: '4px' }}>({completed.length})</span>
              </span>
              <button
                onClick={() => navigate('/wallet/completed')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '2px',
                  fontSize: '12px', color: C.slate, fontFamily: 'inherit', fontWeight: 600,
                }}>전체 보기 <ChevronRight color={C.slate} /></button>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              {completed.map((w, i) => (
                <div key={w.id} onClick={() => navigate('/wallet/' + w.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 18px',
                  borderBottom: i < completed.length - 1 ? `1px solid ${C.bg}` : 'none',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: C.bg, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5L5 9.5L11 3.5" stroke={C.slateL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.slate, letterSpacing: '-0.2px' }}>{w.label}</div>
                    <div style={{ fontSize: '11px', color: C.slateL, marginTop: '1px' }}>{w.sub}</div>
                  </div>
                  <div style={{
                    fontSize: '10px', fontWeight: 700, color: C.slateL,
                    background: C.bg, border: `1px solid ${C.border}`,
                    padding: '2px 8px', borderRadius: '5px', letterSpacing: '0.3px',
                  }}>완료</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>{/* scrollable wrapper */}
      </div>
    </PhoneShell>
  )
}
