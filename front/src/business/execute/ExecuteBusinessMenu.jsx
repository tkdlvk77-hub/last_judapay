import { useNavigate } from 'react-router-dom'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'

// ─── 역할별 집행 접근 레벨 ──────────────────────────────────────
// full → 직접 집행 가능 (master / admin / accounting)
// none → 집행 불가 (manager / staff / viewer)
function getBizExecuteLevel() {
  const role = sessionStorage.getItem('bizRole') || 'viewer'
  if (['master', 'admin', 'accounting'].includes(role)) return { level: 'full', role }
  return                                                        { level: 'none', role }
}

const ROLE_LABEL = {
  master: '최고관리자', admin: '관리자', accounting: '재무담당자',
  manager: '승인자', staff: '일반구성원', viewer: '조회전용',
}
const ROLE_ICON = { master:'👑', admin:'🛠️', accounting:'💼', manager:'✅', staff:'👤', viewer:'👁️' }

function ExecuteBlockedView({ role }) {
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const theme = getAccountTheme()
  const isManager = role === 'manager'
  const isStaff   = role === 'staff'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
      <div style={{ width:'72px', height:'72px', borderRadius:'22px', background: isManager ? '#E0F2FE' : isStaff ? '#FFF7ED' : '#FEE9E9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px', fontSize:'32px' }}>
        {isManager ? '✅' : isStaff ? '👤' : '🔒'}
      </div>
      <div style={{ fontSize:'18px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>집행 권한이 없습니다</div>
      <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'20px', whiteSpace:'pre-line' }}>
        {isManager
          ? '승인자 권한은 자금 집행을 직접 실행할 수 없습니다.\n집행 승인·반려는 승인센터에서 처리하세요.'
          : isStaff
          ? '일반구성원 권한으로는 자금 집행에 접근할 수 없습니다.\n집행이 필요하면 관리자에게 요청하세요.'
          : '조회전용 권한으로는 자금 집행에 접근할 수 없습니다.'}
      </div>
      <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 18px', borderRadius:'20px', background: isManager ? '#E0F2FE' : isStaff ? '#FFF7ED' : '#F3F4F6', color: isManager ? '#0369A1' : isStaff ? '#92400E' : '#6B7280', fontSize:'12px', fontWeight:700, marginBottom:'28px' }}>
        <span>{ROLE_ICON[role]}</span>
        <span>내 권한: {ROLE_LABEL[role]}</span>
      </div>
      {isManager && (
        <button onClick={() => navigate('/approval-center')}
          style={{ width:'100%', maxWidth:'280px', height:'48px', background: theme.brand, color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:'10px' }}>
          승인센터로 이동
        </button>
      )}
      <button onClick={() => navigate('/home-business')}
        style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        홈으로
      </button>
    </div>
  )
}

const MENUS = [
  { id:'personal',   emoji:'👤', title:'개인에게 지급',    sub:'직원·프리랜서·협력자에게',    control:'외주비 · 급여 · 경조사비 · 대여금',                         path:'/execute/business/to-personal' },
  { id:'vendor',     emoji:'🏢', title:'사업자에게 지급',  sub:'거래처·외주사·광고사·VC',      control:'외주비 · 부동산 · 자금 대여 · 투자',                         path:'/execute/business' },
  { id:'operations', emoji:'🔄', title:'운영비 / 자동지출', sub:'한 번 설정 → 매월 자동 실행', control:'급여 · 임대료 · 구독료 · 통신비 · 4대보험 · 세금', path:'/execute/business/operations', isAuto:true },
]

export default function ExecuteBusinessMenu() {
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const theme = getAccountTheme()

  const { level, role } = getBizExecuteLevel()
  if (level === 'none') {
    return <PhoneShell><ExecuteBlockedView role={role} /></PhoneShell>
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 20px' }}>
            <button onClick={() => navigate('/home-business')} style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>자금 집행</span>
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'28px', fontWeight:700, color:'#fff', lineHeight:1.25, letterSpacing:'-1px', marginBottom:'10px' }}>어떤 자금을<br/>집행할까요?</div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>목적별로 사용 통제 · 증빙 자동 생성</div>
          </div>
        </div>

        <div style={{ padding:'18px 16px 24px', display:'flex', flexDirection:'column', gap:'10px' }}>
          {MENUS.map(item => (
            <button key={item.id} onClick={() => navigate(item.path)}
              style={{ width:'100%', background: item.isAuto ? theme.brandDark+'08' : COLORS.bgCard, border: item.isAuto ? '1px solid '+theme.brandDark+'30' : 'none', borderRadius:RADIUS.lg, boxShadow:SHADOWS.card, padding:'14px', display:'flex', flexDirection:'column', gap:'10px', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'42px', height:'42px', background: item.isAuto ? theme.brandDark+'15' : theme.brandDark+'12', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'20px' }}>{item.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'15px', fontWeight:700, color: item.isAuto ? theme.brandDark : COLORS.t1 }}>{item.title}</span>
                    {item.isAuto && <span style={{ display:'inline-block', padding:'1px 6px', background:theme.brandDark, color:'#fff', borderRadius:'4px', fontSize:'9px', fontWeight:700 }}>매월 자동</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:COLORS.t4 }}>{item.sub}</div>
                </div>
                <span style={{ color: item.isAuto ? theme.brandDark : COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
              </div>
              <div style={{ padding:'8px 12px', background: item.isAuto ? '#fff' : COLORS.bgMuted, borderRadius:'9px', display:'flex', alignItems:'center', gap:'7px', border: item.isAuto ? '1px solid '+theme.brandDark+'20' : 'none' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={item.isAuto ? theme.brandDark : COLORS.t4} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize:'11px', color: item.isAuto ? theme.brandDark : COLORS.t3, lineHeight:1.5 }}>{item.control}</span>
              </div>
              {item.isAuto && (
                <div style={{ background:'#fff', borderRadius:'9px', padding:'8px 12px', display:'flex', justifyContent:'space-between', border:'1px solid '+theme.brandDark+'20' }}>
                  <span style={{ fontSize:'11px', color:COLORS.t3 }}>현재 활성</span>
                  <span style={{ fontSize:'12px', color:theme.brandDark, fontWeight:700 }}>12건 · 이번 달 24,800,000원</span>
                </div>
              )}
            </button>
          ))}
          <div style={{ marginTop:'8px', padding:'12px 14px', background:theme.brandDark+'0E', border:'1px solid '+theme.brandDark+'25', borderRadius:RADIUS.md, fontSize:'11px', color:theme.brandDark, lineHeight:1.65 }}>
            <strong>ⓘ</strong> 기업 지급은 모두 자동 증빙 + 세무사 자동 전송됩니다. 운영비는 매월 자동 회계 처리.
          </div>
        </div>
      </div>
    </PhoneShell>
  )
}
