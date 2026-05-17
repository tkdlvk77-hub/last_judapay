// 공통 헤더 — 모든 자금 집행 화면 + Select 화면에서 사용
// 레이아웃:
//   [상태바]
//   ← 타이틀 [배지]                 X
//   ─────────  (프로그레스바, 단계 있을 때만)                  N/M
//   서브타이틀

import { useNavigate } from 'react-router-dom'
import { dialog } from './Dialog'

export function StatusBar() {
  return null
}

export function ExecuteHeader({
  title,
  badge,
  badgeColor = 'orange', // 'orange' | 'green' | 'gray'
  sub,
  step,        // 현재 단계 (1~N) — 없으면 프로그레스바 숨김
  totalSteps,  // 총 단계
  onBack,
  onClose,     // 없으면 X 버튼 숨김
  closeConfirmMessage = '작성 중인 내용은 저장되지 않습니다.',
}) {
  const navigate = useNavigate()

  const handleClose = async () => {
    if (onClose) {
      onClose()
      return
    }
    const ok = await dialog.confirm({
      title: '나가시겠어요?',
      message: closeConfirmMessage,
      okText: '나가기',
      cancelText: '계속 작성',
      destructive: true,
    })
    if (ok) navigate('/home')
  }

  const badgeCfg = {
    orange: { bg:'#FBE9E0', color:'#C25018' },
    green:  { bg:'#E6F5EF', color:'#085041' },
    gray:   { bg:'#F2EFE9', color:'#9B9990' },
  }[badgeColor] || { bg:'#FBE9E0', color:'#C25018' }

  return (
    <>
      {/* 1행: ← 타이틀 [배지]      X */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingTop:'max(4px, env(safe-area-inset-top))', paddingRight:'12px', paddingBottom:'4px', paddingLeft:'8px', gap:'6px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', flex:1, minWidth:0 }}>
          {onBack && (
            <button onClick={onBack}
              style={{ width:'32px', height:'32px', background:'none', border:'none', fontSize:'22px', color:'#9B9990', cursor:'pointer', padding:'0', flexShrink:0 }}>
              ‹
            </button>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'7px', flex:1, minWidth:0 }}>
            <span style={{ fontSize:'17px', fontWeight:'700', color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {title}
            </span>
            {badge && (
              <span style={{
                display:'inline-block', padding:'2px 7px',
                background: badgeCfg.bg, color: badgeCfg.color,
                borderRadius:'5px', fontSize:'10px', fontWeight:'600',
                flexShrink:0,
              }}>
                {badge}
              </span>
            )}
          </div>
        </div>

        <button onClick={handleClose}
          style={{ width:'32px', height:'32px', background:'none', border:'none', fontSize:'18px', color:'#9B9990', cursor:'pointer', padding:'0', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="#9B9990" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* 2행: 프로그레스바 + N/M */}
      {step && totalSteps && (
        <div style={{ padding:'4px 16px 8px' }}>
          <div style={{ display:'flex', gap:'4px' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                flex:1, height:'3px', borderRadius:'2px',
                background: i < step ? '#111' : '#E8E4DC',
                transition:'background .2s',
              }} />
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', fontSize:'11px', color:'#9B9990', marginTop:'4px' }}>
            {step}/{totalSteps}
          </div>
        </div>
      )}

      {/* 3행: 서브타이틀 */}
      {sub && (
        <div style={{ padding: step ? '0 16px 12px' : '4px 16px 12px' }}>
          <div style={{ fontSize:'13px', color:'#9B9990', lineHeight:'1.5' }}>{sub}</div>
        </div>
      )}

      {/* step만 있고 sub 없을 때 하단 여백 보장 */}
      {step && !sub && <div style={{ height:'4px' }} />}
    </>
  )
}
