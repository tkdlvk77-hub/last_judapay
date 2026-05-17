import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../../design/tokens'

export default function Execute() {
  const navigate = useNavigate()

  return (
    <PhoneShell>
      <div style={{ flex: 1, overflowY: 'auto', background: COLORS.bg }}>

        {/* 다크 그라데이션 헤더 (좌우 꽉) */}
        <div style={{
          background: GRADIENTS.header,
          paddingTop:'20px',
          paddingBottom:'28px',
        }}>
          {/* 상단 네비 */}
          <div style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'4px 16px 20px',
          }}>
            <button onClick={() => navigate('/home')}
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
              자금 집행
            </span>
          </div>

          {/* 큰 타이틀 */}
          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom:'10px',
            }}>
              누구에게<br />보내나요?
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>
              받는 대상에 따라 다른 방식으로 처리됩니다
            </div>
          </div>
        </div>

        {/* 라이트 영역 — 2개 카드 */}
        <div style={{ padding:'18px 16px 24px', display:'flex', flexDirection:'column', gap:'10px' }}>

          {/* 개인에게 지급 */}
          <button
            onClick={() => navigate('/execute/personal')}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              border:'none',
              padding:'18px 16px',
              display:'flex', alignItems:'center', gap:'14px',
              cursor:'pointer', textAlign:'left',
              fontFamily:'inherit',
            }}>
            <div style={{
              width:'46px', height:'46px',
              background: GRADIENTS.brandSubtle,
              borderRadius:'13px',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
              boxShadow:'0 4px 12px rgba(91,79,232,0.35)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
                개인에게 지급
              </div>
              <div style={{ fontSize:'12px', color: COLORS.t4 }}>
                외주비 · 빌려주기 · 용돈선물 · 부동산 · 투자
              </div>
            </div>
            <span style={{ color: COLORS.t5, fontSize:'20px', flexShrink:0 }}>›</span>
          </button>

          {/* 사업자에게 지급 */}
          <button
            onClick={() => navigate('/execute/business')}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              boxShadow: SHADOWS.card,
              border:'none',
              padding:'18px 16px',
              display:'flex', alignItems:'center', gap:'14px',
              cursor:'pointer', textAlign:'left',
              fontFamily:'inherit',
            }}>
            <div style={{
              width:'46px', height:'46px',
              background:'linear-gradient(135deg, #3B82F6, #1E40AF)',
              borderRadius:'13px',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
              boxShadow:'0 4px 12px rgba(59,130,246,0.35)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
                사업자에게 지급
              </div>
              <div style={{ fontSize:'12px', color: COLORS.t4 }}>
                외주비 · 부동산 · 사업자 국세청 자동 조회
              </div>
            </div>
            <span style={{ color: COLORS.t5, fontSize:'20px', flexShrink:0 }}>›</span>
          </button>

          {/* 안내 박스 */}
          <div style={{
            marginTop:'8px',
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294',
            lineHeight:1.65,
          }}>
            <strong>ⓘ</strong> 모든 자금 집행은 자동 증빙 + 자금 흐름 추적이 됩니다. 사용자 통제(MCC 차단·만료일·카테고리 한도)는 자금 종류에 따라 자동 적용돼요.
          </div>
        </div>

      </div>
    </PhoneShell>
  )
}
