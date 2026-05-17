import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../../design/tokens'
import { useT } from '../../design/i18n'
import { getAccountTheme } from '../../design/accountTokens'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']

// ─────────────────────────────────────────────────────────
// 6단계 PIN 입력 화면 — 자금 집행 흐름 공통 컴포넌트
//
// props:
//   summaryLeft   — 거래 요약 미니 박스 좌측 (예: "㈜오로라에 투자")
//   summaryRight  — 거래 요약 미니 박스 우측 (예: "5,000,000원")
//   onBack        — 뒤로 가기 핸들러
//   onComplete    — PIN 6자리 완성 시 호출
//   onFaceID      — Face ID 버튼 핸들러 (옵션). 없으면 버튼 자체 숨김
//   headerGrad    — 헤더 그라데이션 (theme.headerGrad)
//   exitTo        — X 버튼 누르면 갈 경로 (기본: '/home')
// ─────────────────────────────────────────────────────────

export default function PinStep({
  summaryLeft,
  summaryRight,
  onBack,
  onComplete,
  onFaceID,
  headerGrad,
  exitTo = '/home',
}) {
  const navigate = useNavigate()
  const t = useT()
  const theme = getAccountTheme()
  const [pin, setPin] = useState('')
  const [showExitModal, setShowExitModal] = useState(false)

  // ── [안전 가드] 기업 사용자 중 집행 권한 없는 역할 차단 ─────
  // viewer / manager 가 직접 URL로 접근 시에도 PIN 입력 불가
  const bizType = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizType') : null
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') : null
  const BIZ_NO_EXECUTE = ['viewer', 'manager']
  if (bizType === 'business' && bizRole && BIZ_NO_EXECUTE.includes(bizRole)) {
    return (
      <PhoneShell>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'18px' }}>🔒</div>
          <div style={{ fontSize:'17px', fontWeight:700, color:'#111827', marginBottom:'8px' }}>집행 권한이 없습니다</div>
          <div style={{ fontSize:'12px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'28px' }}>
            {bizRole === 'manager' ? '승인자 권한은 집행을 직접 완료할 수 없습니다.' : '조회전용 권한으로는 자금 집행이 불가합니다.'}
          </div>
          <button onClick={() => navigate(exitTo)}
            style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            이전으로
          </button>
        </div>
      </PhoneShell>
    )
  }

  const pinInput = (k) => {
    if (k === null) return
    if (k === 'del') {
      setPin(p => p.slice(0, -1))
      return
    }
    setPin(p => {
      if (p.length >= 6) return p
      const next = p + String(k)
      if (next.length === 6) {
        setTimeout(() => {
          setPin('')
          onComplete?.()
        }, 400)
      }
      return next
    })
  }

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
        {/* 헤더 */}
        <div style={{
          background: headerGrad || GRADIENTS.header,
          paddingTop:'max(20px, env(safe-area-inset-top))',
          paddingBottom:'24px',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'8px',
            padding:'4px 16px 0',
          }}>
            <button onClick={onBack}
              style={{
                width:'32px', height:'32px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0, flexShrink:0,
                marginLeft:'-4px',
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <span style={{
              fontSize:'15px', fontWeight:600, color:'#fff', flex:1,
            }}>
              비밀번호 입력
            </span>
            <button onClick={() => setShowExitModal(true)}
              aria-label="Close"
              style={{
                width:'32px', height:'32px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', padding:0, flexShrink:0,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 24px 0' }}>
          {/* 거래 요약 미니 박스 */}
          {(summaryLeft || summaryRight) && (
            <div style={{
              width:'100%', maxWidth:'320px',
              padding:'12px 14px',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.md,
              display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom:'34px',
            }}>
              {summaryLeft && (
                <span style={{ fontSize:'12px', color: COLORS.t3 }}>
                  {summaryLeft}
                </span>
              )}
              {summaryRight && (
                <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
                  {summaryRight}
                </span>
              )}
            </div>
          )}

          <div style={{ fontSize:'13px', color: COLORS.t4, marginBottom:'20px' }}>
            6자리 비밀번호
          </div>

          {/* PIN 점 */}
          <div style={{ display:'flex', gap:'16px', marginBottom:'24px' }}>
            {Array.from({ length:6 }).map((_, i) => (
              <div key={i} style={{
                width:'14px', height:'14px',
                borderRadius:'50%',
                background: i < pin.length ? theme.brand : 'transparent',
                border: i < pin.length ? `2px solid ${theme.brand}` : `2px solid ${COLORS.border}`,
                transition:'all .15s',
              }} />
            ))}
          </div>

          {/* Face ID */}
          {onFaceID && (
            <button onClick={onFaceID}
              style={{
                background:'none', border:'none',
                display:'flex', alignItems:'center', gap:'5px',
                color: theme.brand,
                fontSize:'12px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              <svg width="14" height="14" viewBox="0 0 42 42" fill="none">
                <rect x="9" y="4" width="24" height="34" rx="5" stroke={theme.brand} strokeWidth="2"/>
                <circle cx="21" cy="21" r="6" stroke={theme.brand} strokeWidth="2"/>
                <circle cx="21" cy="21" r="2" fill={theme.brand}/>
              </svg>
              Face ID로 인증
            </button>
          )}
        </div>

        {/* 키패드 */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px',
          padding:'0 28px', marginBottom:'18px',
        }}>
          {KEYS.map((k, i) => (
            <button key={i} onClick={() => pinInput(k)}
              style={{
                height:'58px', borderRadius:'16px',
                background: k === null || k === 'del' ? 'transparent' : COLORS.bgCard,
                boxShadow: k === null || k === 'del' ? 'none' : SHADOWS.card,
                border:'none',
                fontSize:'22px', fontWeight:500,
                color: k === 'del' ? COLORS.t4 : COLORS.t1,
                cursor: k === null ? 'default' : 'pointer',
                fontFamily:'inherit',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
              }}>
              {k === 'del' ? '⌫' : k !== null ? (
                <>
                  <span style={{ lineHeight:1 }}>{k}</span>
                  {[2,3,4,5,6,7,8,9].includes(k) && (
                    <span style={{ fontSize:'9px', color: COLORS.t5, letterSpacing:'1.5px' }}>
                      {{2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}[k]}
                    </span>
                  )}
                </>
              ) : null}
            </button>
          ))}
        </div>

        <div style={{ paddingBottom:'24px', textAlign:'center', fontSize:'10px', color: COLORS.t5 }}>
          비밀번호 5회 오류 시 30분 잠금
        </div>
      </div>

      {showExitModal && (
        <div
          onClick={() => setShowExitModal(false)}
          style={{
            position:'absolute', inset:0,
            background:'rgba(0,0,0,0.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:'24px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              padding:'22px 20px 16px',
              width:'100%', maxWidth:'320px',
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
              <button onClick={() => { setShowExitModal(false); navigate(exitTo) }}
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
    </PhoneShell>
  )
}
