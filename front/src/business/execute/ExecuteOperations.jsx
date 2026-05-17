import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'

// ─── 운영비 카테고리 10종 ────────────────────────────────
const OPERATION_CATEGORIES = [
  {
    id: 'salary',
    title: '급여',
    sub: '직원 급여 매월 자동 지급',
    icon: '💰',
    iconBg: '#ECFDF5',
    path: '/execute/business/operations/salary',
  },
  {
    id: 'insurance4',
    title: '4대보험',
    sub: '국민연금 · 건강 · 고용 · 산재',
    icon: '🛡️',
    iconBg: '#DBEAFE',
    path: '/execute/business/operations/insurance4',
  },
  {
    id: 'rent',
    title: '임대료',
    sub: '사무실 · 창고 · 공장 임대',
    icon: '🏢',
    iconBg: '#EFF6FF',
    path: '/execute/business/operations/rent',
  },
  {
    id: 'rentlease',
    title: '렌트 & 리스',
    sub: '차량 · 장비 · 사무기기',
    icon: '🚗',
    iconBg: '#F0FDF4',
    path: '/execute/business/operations/rent-lease',
  },
  {
    id: 'subscription',
    title: '구독료',
    sub: 'SaaS · 클라우드 · 소프트웨어',
    icon: '🔌',
    iconBg: '#F5F3FF',
    path: '/execute/business/operations/subscription',
  },
  {
    id: 'telecom',
    title: '통신비',
    sub: '휴대폰 · 인터넷 · 유선전화',
    icon: '📱',
    iconBg: '#EFF6FF',
    path: '/execute/business/operations/telecom',
  },
  {
    id: 'utility',
    title: '공과금',
    sub: '전기 · 수도 · 가스 · 관리비',
    icon: '💡',
    iconBg: '#FEF3C7',
    path: '/execute/business/operations/utility',
  },
  {
    id: 'tax',
    title: '세금',
    sub: '법인세 · 부가세 · 원천징수',
    icon: '🧾',
    iconBg: '#FEE2E2',
    path: '/execute/business/operations/tax',
  },
  {
    id: 'insurance',
    title: '보험료',
    sub: '단체보험 · 화재보험 · 배상보험',
    icon: '🏥',
    iconBg: '#FDF4FF',
    path: '/execute/business/operations/insurance',
  },
  {
    id: 'misc',
    title: '기타 정기지출',
    sub: '세무자문료 · 법률고문료 · 자유 설정',
    icon: '📋',
    iconBg: '#F3F4F6',
    path: '/execute/business/operations/misc',
  },
]

export default function ExecuteOperations() {
  const navigate = useNavigate()
  const theme = getAccountTheme('business')

  // [권한] 자동지급 등록은 master/admin/accounting만 가능
  // staff는 자동이체 신규 등록 불가 (집행 요청 단계까지만)
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || 'viewer' : 'viewer'
  const AUTO_PAY_ALLOWED = ['master', 'admin', 'accounting']
  const canRegisterAutoPay = AUTO_PAY_ALLOWED.includes(bizRole)

  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

        {/* ── 다크 헤더 — 다른 집행 화면과 동일 패턴 ── */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 20px' }}>
            <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>운영비 / 자동지출</span>
          </div>

          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'28px', fontWeight:700, color:'#fff', lineHeight:1.25, letterSpacing:'-1px', marginBottom:'10px' }}>
              어떤 비용을<br/>집행할까요?
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              매월 반복되는 운영비를 자동으로 집행해요
            </div>
          </div>
        </div>

        {/* ── 라이트 영역 ── */}
        <div style={{ padding:'18px 16px 32px' }}>

          {/* 카테고리 카드 6개 — 심플 */}
          {/* staff 안내 배너 */}
          {!canRegisterAutoPay && (
            <div style={{ marginBottom:'12px', padding:'12px 14px', background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:'12px', display:'flex', alignItems:'flex-start', gap:'10px' }}>
              <span style={{ fontSize:'16px', flexShrink:0 }}>⚠️</span>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E', marginBottom:'2px' }}>자동이체 신규 등록 불가</div>
                <div style={{ fontSize:'11px', color:'#B45309', lineHeight:1.5 }}>일반구성원은 자동이체를 새로 등록할 수 없습니다.<br/>기존 자동이체 현황은 조회만 가능합니다.</div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {OPERATION_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => canRegisterAutoPay && navigate(cat.path)}
                style={{
                  width:'100%', padding:'16px',
                  background: canRegisterAutoPay ? COLORS.bgCard : '#F9FAFB',
                  border:`0.5px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  cursor: canRegisterAutoPay ? 'pointer' : 'not-allowed',
                  fontFamily:'inherit',
                  textAlign:'left',
                  display:'flex', alignItems:'center', gap:'14px',
                  transition:'all .15s',
                  opacity: canRegisterAutoPay ? 1 : 0.55,
                }}
              >
                {/* 아이콘 */}
                <div style={{ width:'48px', height:'48px', borderRadius:'13px', background: cat.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                  {cat.icon}
                </div>

                {/* 텍스트 */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'3px' }}>
                    {cat.title}
                  </div>
                  <div style={{ fontSize:'12px', color: COLORS.t3 }}>
                    {cat.sub}
                  </div>
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  )
}
