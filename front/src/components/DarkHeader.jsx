import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GRADIENTS, RADIUS, COLORS, SHADOWS } from '../design/tokens'
import { useT } from '../design/i18n'

// ─────────────────────────────────────────────────────────
// 공용 DarkHeader — 자금집행 흐름 공통 헤더
//
// 기능:
//   - 다크 그라데이션 헤더 (계정별 색상 자동 분기, headerGrad prop)
//   - 좌측: ← 뒤로가기 + 작은 타이틀 + 배지 (옵션)
//   - 우측: 단계 표시 (N/M) + X 버튼
//   - 진행 막대 (step + totalSteps)
//   - 큰 타이틀 + 서브 (옵션)
//   - X 버튼 누르면 확인 모달 → exitTo 경로로 이동
//
// props:
//   smallTitle    좌측 작은 타이틀
//   bigTitle      큰 타이틀 (\n으로 줄바꿈 가능)
//   sub           큰 타이틀 아래 서브 설명
//   badge         배지 텍스트 (단일, 옵션)
//   badgeTone     'cashable' | 'permission' | 'ai' | null
//   badges        배지 배열 (옵션) — [{ text, bg, color }] 형식. 단일 badge 대신 사용
//   step          현재 단계 (1~N)
//   totalSteps    총 단계 수
//   onBack        뒤로가기 콜백
//   headerGrad    헤더 그라데이션 (theme.headerGrad)
//   exitTo        X 누르면 가는 경로 (기본: '/home')
//   isDirty       작성 중인 내용 있는지 (true면 모달 띄움, 기본: true)
// ─────────────────────────────────────────────────────────

export default function DarkHeader({
  smallTitle,
  bigTitle,
  sub,
  badge,
  badgeTone,
  badges,
  step,
  totalSteps,
  onBack,
  headerGrad,
  exitTo = '/home',
  isDirty = true,
}) {
  const navigate = useNavigate()
  const t = useT()
  const [showExitModal, setShowExitModal] = useState(false)

  const badgeStyle = {
    cashable:   { bg:'rgba(52,211,153,0.20)', color:'#34D399' },
    permission: { bg:'rgba(252,211,77,0.20)', color:'#FCD34D' },
    ai:         { bg:'rgba(167,139,250,0.25)', color:'#C4B5FD' },
  }[badgeTone] || { bg:'rgba(255,255,255,0.15)', color:'#fff' }

  const handleClose = () => {
    if (isDirty) {
      setShowExitModal(true)
    } else {
      navigate(exitTo)
    }
  }

  const confirmExit = () => {
    setShowExitModal(false)
    navigate(exitTo)
  }

  return (
    <>
      <div style={{
        background: headerGrad || GRADIENTS.header,
        paddingTop:'max(20px, env(safe-area-inset-top))',
        paddingBottom:'24px',
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'4px 16px 18px',
        }}>
          {/* 좌측: 뒤로가기 + 타이틀 + 배지(들) */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0, flexWrap:'wrap' }}>
            <button onClick={onBack}
              style={{
                width:'32px', height:'32px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0, flexShrink:0,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span style={{ fontSize:'15px', fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {smallTitle}
            </span>
            {/* 단일 배지 */}
            {badge && (
              <span style={{
                padding:'2px 8px',
                background: badgeStyle.bg,
                color: badgeStyle.color,
                borderRadius: RADIUS.pill,
                fontSize:'10px', fontWeight:700,
                flexShrink:0,
              }}>
                {badge}
              </span>
            )}
            {/* 배지 배열 (단일 배지와 같이 쓸 수도 있음) */}
            {badges && badges.length > 0 && badges.map((b, i) => (
              <span key={i} style={{
                padding:'2px 8px',
                background: b.bg || 'rgba(255,255,255,0.15)',
                color: b.color || '#fff',
                borderRadius: RADIUS.pill,
                fontSize:'10px', fontWeight:700,
                flexShrink:0,
              }}>
                {b.text}
              </span>
            ))}
          </div>

          {/* 우측: 단계 표시 + X 버튼 */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
            {step && totalSteps && (
              <span style={{
                fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500,
              }}>
                {step} / {totalSteps}
              </span>
            )}
            <button onClick={handleClose}
              aria-label="Close"
              style={{
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
          </div>
        </div>

        {/* 진행 막대 */}
        {step && totalSteps && (
          <div style={{
            display:'flex', gap:'4px',
            padding:'0 20px 18px',
          }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                flex:1, height:'3px',
                borderRadius: RADIUS.pill,
                background: i < step ? '#fff' : 'rgba(255,255,255,0.18)',
                transition:'all .25s',
              }} />
            ))}
          </div>
        )}

        {/* 큰 타이틀 + 서브 */}
        {bigTitle && (
          <div style={{ padding:'0 20px' }}>
            <div style={{
              fontSize:'28px', fontWeight:700, color:'#fff',
              lineHeight:1.25, letterSpacing:'-1px',
              marginBottom: sub ? '10px' : 0,
              whiteSpace:'pre-line',
            }}>
              {bigTitle}
            </div>
            {sub && (
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', lineHeight:1.55 }}>
                {sub}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 종료 확인 모달 */}
      {showExitModal && (
        <div
          onClick={() => setShowExitModal(false)}
          style={{
            position:'absolute', inset:0,
            background:'rgba(0,0,0,0.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000,
            padding:'24px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              padding:'22px 20px 16px',
              width:'100%',
              maxWidth:'320px',
              boxShadow: SHADOWS.card,
            }}>
            <div style={{
              fontSize:'17px', fontWeight:700, color: COLORS.t1,
              marginBottom:'8px', textAlign:'center',
            }}>
              {t('darkHeader.exit.title')}
            </div>
            <div style={{
              fontSize:'13px', color: COLORS.t3,
              lineHeight:1.55, marginBottom:'18px', textAlign:'center',
            }}>
              {t('darkHeader.exit.body')}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowExitModal(false)}
                style={{
                  flex:1, height:'46px',
                  background: COLORS.bgMuted, color: COLORS.t2,
                  border:'none', borderRadius: RADIUS.md,
                  fontSize:'14px', fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                {t('darkHeader.exit.cancel')}
              </button>
              <button onClick={confirmExit}
                style={{
                  flex:1, height:'46px',
                  background: COLORS.danger, color:'#fff',
                  border:'none', borderRadius: RADIUS.md,
                  fontSize:'14px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                {t('darkHeader.exit.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
