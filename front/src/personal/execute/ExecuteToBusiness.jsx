import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS } from '../../design/tokens'

const PURPOSES = [
  {
    id: 'freelance',
    emoji: '🧾',
    title: '외주비',
    sub: '인테리어·광고대행·디자인 에이전시 등',
    fundType: 'cashable',
    control: '계약서 양측 서명 + 검수 후 단계별 입금',
    iconBg: FUND_COLORS.freelance.bg,
  },
  {
    id: 'realestate',
    emoji: '🏠',
    title: '부동산',
    sub: '사업자 임대인 (부동산 법인) 보증금·임대료',
    fundType: 'cashable',
    control: '근저당 말소 + 잔금일 조건부 집행',
    iconBg: FUND_COLORS.realestate.bg,
  },
  {
    id: 'invest',
    emoji: '💎',
    title: '투자',
    sub: '엔젤 투자 · 지분·CB·SAFE · 스타트업 투자',
    fundType: 'permission',
    control: 'MCC 통제 + 정기 보고 + 자금 사용처 자동 추적',
    iconBg: FUND_COLORS.invest.bg,
  },
]

function FundTypeBadge({ type }) {
  const cfg = type === 'cashable'
    ? { bg:'#D1FAE5', color:'#047857', text:'출금 가능' }
    : { bg:'#FEF3C7', color:'#854F0B', text:'권한 자금' }
  return (
    <span style={{
      display:'inline-block', padding:'2px 7px',
      background: cfg.bg, color: cfg.color,
      borderRadius:'5px', fontSize:'10px', fontWeight:700,
    }}>
      {cfg.text}
    </span>
  )
}

export default function ExecuteToBusiness() {
  const navigate = useNavigate()

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* 다크 그라데이션 헤더 (좌우 꽉) */}
        <div style={{
          background: GRADIENTS.header,
          paddingTop:'20px',
          paddingBottom:'28px',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'4px 16px 20px',
          }}>
            <button onClick={() => navigate(-1)}
              style={{
                width:'32px', height:'32px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>
              사업자에게 지급
            </span>
          </div>

          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom:'10px',
            }}>
              어떤<br />거래인가요?
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              사업자등록번호로 상대를 조회하고 안전하게 거래해요
            </div>
          </div>
        </div>

        {/* 라이트 영역 — 거래 종류 카드 */}
        <div style={{ padding:'18px 16px 24px', display:'flex', flexDirection:'column', gap:'10px' }}>
          {PURPOSES.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/execute/business/select?purpose=${p.id}`)}
              style={{
                width:'100%',
                background: COLORS.bgCard,
                borderRadius: RADIUS.lg,
                boxShadow: SHADOWS.card,
                border:'none',
                padding:'14px',
                display:'flex', flexDirection:'column', gap:'10px',
                cursor:'pointer', textAlign:'left',
                fontFamily:'inherit',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{
                  width:'42px', height:'42px',
                  background: p.iconBg,
                  borderRadius:'12px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                  fontSize:'20px',
                }}>
                  {p.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>{p.title}</span>
                    <FundTypeBadge type={p.fundType} />
                  </div>
                  <div style={{ fontSize:'12px', color: COLORS.t4 }}>{p.sub}</div>
                </div>
                <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
              </div>

              <div style={{
                padding:'8px 12px',
                background: COLORS.bgMuted,
                borderRadius:'9px',
                display:'flex', alignItems:'center', gap:'7px',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink:0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.5 }}>{p.control}</span>
              </div>
            </button>
          ))}

          {/* 안내 박스 */}
          <div style={{
            marginTop:'8px',
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294',
            lineHeight:1.65,
          }}>
            <strong>사업자 거래 자동 처리</strong><br />
            국세청 사업자 등록 정보 자동 검증 · 세금계산서 자동 발행 · 증빙 자동 정리 + 세무사 자동 전송
          </div>
        </div>

      </div>
    </PhoneShell>
  )
}
