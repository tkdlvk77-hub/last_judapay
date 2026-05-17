import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '../../design/tokens'
import { useT } from '../../design/i18n'
import { getAccountTheme } from '../../design/accountTokens'

// ─────────────────────────────────────────────────────────
// 5단계 확인 화면 — 자금 집행 흐름 공통 컴포넌트
//
// props:
//   smallTitle    — 헤더 작은 타이틀 (예: "집행 내용 확인")
//   step          — 현재 단계 번호 (예: 3)
//   totalSteps    — 전체 단계 수 (예: 3)
//   bigAmount     — 큰 금액 표시 (예: "5,000,000원")
//   sub           — 헤더 부제 (예: "㈜오로라에 투자 · 권한 자금")
//   onBack        — 뒤로 가기 핸들러
//   headerGrad    — 헤더 그라데이션 (theme.headerGrad)
//   exitTo        — X 버튼 누르면 갈 경로 (기본: '/home')
//
//   rows          — 상세 행 배열, 각 행:
//     { label, value, sub?, editStep?, editAction? }
//
//   autoActions   — 녹색 "자동으로 처리됩니다" 박스 항목 (string 배열, 옵션)
//
//   children      — 메뉴별 특수 시각화 슬롯 (예: 분할 지급 막대 / MCC 칩 / 카테고리 칩 등)
//                   rows 위에 표시됨. 자유 형식 가능.
//
//   footerNote    — 잔액 미리보기 등 하단 파란 박스 텍스트 (옵션)
//
//   primaryLabel  — 큰 버튼 라벨 (디폴트 "집행하기")
//   onPrimary     — 큰 버튼 핸들러 (보통 PIN으로 진입)
//   onCancel      — 취소 버튼 핸들러 (옵션, 있으면 표시)
// ─────────────────────────────────────────────────────────

function StepHeader({ smallTitle, step, totalSteps, bigAmount, sub, onBack, headerGrad, onClose }) {
  return (
    <div style={{
      background: headerGrad || GRADIENTS.header,
      paddingTop:'max(20px, env(safe-area-inset-top))',
      paddingBottom:'24px',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'4px 16px 18px',
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
          {smallTitle}
        </span>
        {step && totalSteps && (
          <span style={{
            fontSize:'11px', color:'rgba(255,255,255,0.55)', fontWeight:500,
          }}>
            {step} / {totalSteps}
          </span>
        )}
        <button onClick={onClose}
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
            }} />
          ))}
        </div>
      )}

      {/* 큰 금액 */}
      <div style={{ padding:'0 20px' }}>
        <div style={{
          fontSize:'34px', fontWeight:800, color:'#fff',
          letterSpacing:'-1.2px', lineHeight:1.1,
          marginBottom: sub ? '8px' : 0,
        }}>
          {bigAmount}
        </div>
        {sub && (
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.65)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// 종료 확인 모달 (DarkHeader와 동일 디자인)
function ExitConfirmModal({ onCancel, onConfirm }) {
  const t = useT()
  return (
    <div
      onClick={onCancel}
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
          <button onClick={onCancel}
            style={{
              flex:1, height:'46px',
              background: COLORS.bgMuted, color: COLORS.t2,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'14px', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}>
            {t('darkHeader.exit.cancel')}
          </button>
          <button onClick={onConfirm}
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
  )
}

export default function ConfirmStep({
  smallTitle = '집행 내용 확인',
  step,
  totalSteps,
  bigAmount,
  sub,
  onBack,
  rows = [],
  autoActions = [],
  footerNote,
  primaryLabel = '집행하기',
  onPrimary,
  onCancel,
  children,
  headerGrad,
  exitTo = '/home',
}) {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const [showExitModal, setShowExitModal] = useState(false)

  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <StepHeader
          smallTitle={smallTitle}
          step={step}
          totalSteps={totalSteps}
          bigAmount={bigAmount}
          sub={sub}
          onBack={onBack}
          headerGrad={headerGrad}
          onClose={() => setShowExitModal(true)}
        />

        <div style={{ padding:'18px 16px 24px' }}>

          {/* 메뉴별 특수 시각화 슬롯 (옵션) */}
          {children && (
            <div style={{ marginBottom:'12px' }}>
              {children}
            </div>
          )}

          {/* 상세 행 카드 */}
          {rows.length > 0 && (
            <div style={{
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              overflow:'hidden',
              marginBottom:'12px',
            }}>
              {rows.map((row, i) => (
                <div key={i} style={{
                  padding:'14px 16px',
                  borderBottom: i < rows.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px',
                }}>
                  <span style={{
                    fontSize:'12px', color: COLORS.t4,
                    flexShrink:0, paddingTop:'1px',
                  }}>
                    {row.label}
                  </span>
                  <div style={{ flex:1, display:'flex', justifyContent:'flex-end', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>
                        {row.value}
                      </div>
                      {row.sub && (
                        <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px', lineHeight:1.45 }}>
                          {row.sub}
                        </div>
                      )}
                    </div>
                    {(row.editStep != null || row.editAction) && (
                      <button
                        onClick={() => row.editAction ? row.editAction() : null}
                        style={{
                          fontSize:'11px', fontWeight:600,
                          color: theme.brand,
                          background:'none', border:'none',
                          cursor:'pointer', fontFamily:'inherit',
                          flexShrink:0, paddingTop:'1px',
                        }}>
                        {row.editAction ? '변경' : '수정'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 자동 처리 (녹색 박스) */}
          {autoActions.length > 0 && (
            <div style={{
              background:'#ECFDF5',
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              marginBottom:'12px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <div style={{
                  width:'18px', height:'18px', borderRadius:'50%',
                  background:'#10B981',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>
                  자동으로 처리됩니다
                </span>
              </div>
              {autoActions.map((text, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:'7px',
                  marginTop:'5px',
                  fontSize:'11px', color:'#047857',
                }}>
                  <svg width="9" height="8" viewBox="0 0 9 8" fill="none" style={{ flexShrink:0 }}>
                    <path d="M1 4l2.5 2.5L8 1" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {text}
                </div>
              ))}
            </div>
          )}

          {/* 잔액 미리보기 (파란 박스) */}
          {footerNote && (
            <div style={{
              padding:'12px 14px',
              background:'#EDF3FA',
              borderRadius: RADIUS.md,
              fontSize:'11px', color:'#1E5294', lineHeight:1.65,
            }}>
              {footerNote}
            </div>
          )}
        </div>
      </div>

      {/* 하단 sticky CTA */}
      <div style={{
        padding:'12px 16px 24px',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        background: COLORS.bgCard,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
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
        {onCancel && (
          <button onClick={onCancel}
            style={{
              width:'100%', height:'42px',
              background:'transparent', color: COLORS.t4,
              border:'none',
              fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
            }}>
            취소
          </button>
        )}
      </div>

      {showExitModal && (
        <ExitConfirmModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={() => { setShowExitModal(false); navigate(exitTo) }}
        />
      )}
    </PhoneShell>
  )
}
