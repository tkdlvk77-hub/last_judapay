import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { getAccountTheme } from '../design/accountTokens'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─────────────────────────────────────────────────────────────────────────────
// CompletedWallets — 완료된 지갑 목록 화면
//
// [userType 분기]
//   sessionStorage.bizType === 'business' → BUSINESS_COMPLETED_WALLETS
//   그 외                                 → PERSONAL_COMPLETED_WALLETS
//   MyWallet.jsx, WalletDetail.jsx 와 동일한 getUserType() 패턴 사용
//
// [완료 지갑 데이터 필드]
//   id          : WalletDetail.jsx WALLET_DATA 키와 반드시 일치
//                 (탭하면 해당 상세 화면으로 navigate)
//   fund        : FUND_COLOR / FUND_LABEL 키 (색상·라벨 자동 매핑)
//   endDate     : 완료 일자 (sub 텍스트에 표시)
//   usedAmount  : 총 사용 금액 (현재 UI에서 미노출, 추후 확장용)
// ─────────────────────────────────────────────────────────────────────────────

// userType 판별 — sessionStorage.bizType 기준
function getUserType() {
  return sessionStorage.getItem('bizType') === 'business' ? 'business' : 'personal'
}

const C = {
  navy:   '#0F172A',
  slate:  '#64748B',
  slateL: '#94A3B8',
  border: '#E2E8F0',
  bg:     '#F8FAFC',
  white:  '#FFFFFF',
  green:  '#059669',
}

const FUND_COLOR = {
  invest:       '#0EA5E9',
  gift:         '#F59E0B',
  lend:         '#6366F1',
  freelance:    '#10B981',
  my:           '#0F172A',
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

// ── 개인 완료 지갑 (개인→개인 거래 기반) ────────────────────────────────────
const PERSONAL_COMPLETED_WALLETS = [
  { id: 'c_living1', label: '엄마 · 4월 생활비',   sub: '잔액 소진 · 2025.04.30',    fund: 'living',  endDate: '2025.04.30', usedAmount: 300000 },
  { id: 'c2',        label: '강남구 · 문화바우처', sub: '잔액 12만원 완료 · 2024.03.31', fund: 'invest',  endDate: '2024.03.31', usedAmount: 120000 },
  { id: 'c_iho',     label: '이호준 · 상환 완료',  sub: '차용금 전액 상환 · 2024.02.15', fund: 'lend',    endDate: '2024.02.15', usedAmount: 850000 },
]

// ── 기업 완료 지갑 (기업 발신/수신 거래 기반) ───────────────────────────────
const BUSINESS_COMPLETED_WALLETS = [
  { id: 'bc1', label: '서울시 · 스타트업 지원금', sub: '잔액 소진 · 2025.03.10',    fund: 'invest',  endDate: '2025.03.10', usedAmount: 2000000 },
  { id: 'bc2', label: '이영희 · 자금지원 완료',   sub: '전액 집행 완료 · 2025.04.15', fund: 'lend',    endDate: '2025.04.15', usedAmount: 1000000 },
  { id: 'bc3', label: '정창업 · 대여금 상환',      sub: '차용금 전액 상환 · 2025.05.01', fund: 'lend',    endDate: '2025.05.01', usedAmount: 5000000 },
]

function ChevronRight({ color = C.slateL }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3L9 7L5 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function CompletedWallets() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const userType = getUserType()
  const completed = userType === 'business' ? BUSINESS_COMPLETED_WALLETS : PERSONAL_COMPLETED_WALLETS

  return (
    <PhoneShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom: '24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <button onClick={() => navigate(-1)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.white, padding: '4px', display: 'flex',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span style={{
              flex: 1, textAlign: 'center', fontSize: '16px',
              fontWeight: 700, color: C.white, letterSpacing: '-0.5px',
            }}>완료된 지갑</span>
            <div style={{ width: '28px' }} />
          </div>

          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              총 완료
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: C.white, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {completed.length}
              </span>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>개</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: C.bg, padding: '20px 16px 40px' }}>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
            {completed.map((w, i) => {
              const accentColor = FUND_COLOR[w.fund] || C.slate
              return (
                <div
                  key={w.id}
                  onClick={() => navigate('/wallet/' + w.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '16px 18px',
                    borderBottom: i < completed.length - 1 ? `1px solid ${C.bg}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {/* 완료 아이콘 */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: C.bg, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke={C.slateL} strokeWidth="1.4"/>
                      <path d="M5 8l2.5 2.5L11 5.5" stroke={C.slateL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: C.slate, letterSpacing: '-0.2px' }}>
                        {w.label}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: accentColor, background: `${accentColor}18`,
                        padding: '1px 5px', borderRadius: '4px',
                      }}>
                        {FUND_LABEL[w.fund] || '지갑'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: C.slateL }}>{w.sub}</div>
                  </div>

                  {/* 완료 뱃지 + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, color: C.slateL,
                      background: C.bg, border: `1px solid ${C.border}`,
                      padding: '3px 8px', borderRadius: '6px',
                    }}>완료</div>
                    <ChevronRight />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 안내 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginTop: '16px', padding: '12px 16px',
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: '10px',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke={C.slateL} strokeWidth="1.2"/>
              <path d="M7 6v4M7 4.5v.5" stroke={C.slateL} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '11px', color: C.slateL }}>잠금·만료된 지갑은 충전과 출금이 제한됩니다</span>
            </div>
          </div>
        </div>
      <BottomTab />
    </PhoneShell>
  )
}
