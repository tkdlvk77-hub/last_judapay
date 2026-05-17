import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'

// ─────────────────────────────────────────────────────────
// 7단계 완료 화면 — 자금 집행 흐름 공통 컴포넌트
//
// props:
//   tone          — 'success' (즉시 완료, 녹색 ✓) | 'waiting' (서명 대기, 노란 시계). 디폴트 'success'
//   title         — 큰 제목 (예: "집행 완료" / "㈜오로라 동의 대기 중")
//   description   — 부제 (string 또는 JSX)
//   summary       — 거래 요약 카드 행 [{ label, value, accent?, bold? }, ...] (옵션)
//   noteYellow    — 노란 박스 안내 문구 (옵션)
//   primaryLabel  — 큰 버튼 라벨 (디폴트 "홈으로")
//   onPrimary     — 큰 버튼 핸들러
//   secondaryLabel — 보조 버튼 라벨 (옵션)
//   onSecondary   — 보조 버튼 핸들러 (옵션)
//   timestamp     — 하단 타임스탬프 (옵션, 예: "2026.05.06 · 09:41")
//   headerGrad    — 헤더 그라데이션 (theme.headerGrad)
//   exitTo        — X 버튼 누르면 갈 경로 (기본: '/home')
//                  완료 화면이라 모달 없이 바로 이동 (단축키 역할)
// ─────────────────────────────────────────────────────────

const TONES = {
  success: {
    iconBg: 'rgba(52,211,153,0.20)',
    iconBorder: '#34D399',
    iconColor: '#34D399',
    accentColor: '#34D399',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  waiting: {
    iconBg: 'rgba(252,211,77,0.20)',
    iconBorder: '#FCD34D',
    iconColor: '#FCD34D',
    accentColor: '#FCD34D',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
}

export default function DoneStep({
  tone = 'success',
  title,
  description,
  summary,
  noteYellow,
  primaryLabel = '홈으로',
  onPrimary,
  secondaryLabel,
  onSecondary,
  timestamp,
  headerGrad,
  exitTo = '/home',
}) {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const T = TONES[tone] || TONES.success

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', background: COLORS.bg }}>
        {/* 다크 그라데이션 헤더 — 큰 아이콘 */}
        <div style={{
          position:'relative',
          background: headerGrad || GRADIENTS.header,
          paddingTop:'max(40px, env(safe-area-inset-top))',
          paddingBottom:'40px',
          textAlign:'center',
        }}>
          {/* 우측 상단 X 버튼 — 모달 없이 바로 exitTo로 (이미 완료된 상태) */}
          <button onClick={() => navigate(exitTo)}
            aria-label="Close"
            style={{
              position:'absolute', top:'12px', right:'12px',
              width:'32px', height:'32px',
              background:'transparent', border:'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', padding:0,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{
            width:'80px', height:'80px',
            borderRadius:'50%',
            background: T.iconBg,
            border: `2px solid ${T.iconBorder}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 18px',
          }}>
            {T.icon}
          </div>
          <div style={{
            fontSize:'24px', fontWeight:700, color:'#fff',
            marginBottom:'10px', letterSpacing:'-0.5px',
            padding:'0 24px',
          }}>
            {title}
          </div>
          {description && (
            <div style={{
              fontSize:'13px', color:'rgba(255,255,255,0.7)',
              lineHeight:1.7, padding:'0 24px',
            }}>
              {description}
            </div>
          )}
        </div>

        {/* 라이트 영역 */}
        <div style={{ padding:'18px 16px 24px' }}>
          {/* 거래 요약 카드 */}
          {summary && summary.length > 0 && (
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'12px',
            }}>
              {summary.map((row, i, arr) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between',
                  fontSize:'13px',
                  paddingBottom: i < arr.length-1 ? '10px' : 0,
                  marginBottom: i < arr.length-1 ? '10px' : 0,
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ color: COLORS.t4 }}>{row.label}</span>
                  <span style={{
                    fontWeight: row.bold ? 700 : 600,
                    color: row.accent ? theme.brand : COLORS.t1,
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 노란 안내 박스 */}
          {noteYellow && (
            <div style={{
              background:'#FFFBEB',
              borderRadius: RADIUS.md,
              padding:'12px 14px',
              fontSize:'11px', color:'#854F0B', lineHeight:1.65,
              marginBottom:'14px',
            }}>
              {noteYellow}
            </div>
          )}

          {/* 타임스탬프 */}
          {timestamp && (
            <div style={{ textAlign:'center', fontSize:'11px', color: COLORS.t5 }}>
              {timestamp}
            </div>
          )}
        </div>
      </div>

      {/* 하단 sticky 버튼 */}
      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
        {secondaryLabel && (
          <button onClick={onSecondary}
            style={{
              width:'100%', height:'46px',
              background: COLORS.bgMuted, color: COLORS.t2,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'13px', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            {secondaryLabel}
          </button>
        )}
        <button onClick={onPrimary}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow: SHADOWS.buttonBrand,
          }}>
          {primaryLabel}
        </button>
      </div>
    </PhoneShell>
  )
}
