import { useEffect, useState, useCallback } from 'react'
import { _setSubscriber } from './dialogBus'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'

// ─────────────────────────────────────────────────────────────
// DialogHost — 화면 어디서든 한 번만 마운트되는 모달 호스트.
//   dialogBus 의 publish 를 받아서 큐에 쌓고 한 번에 하나씩 렌더.
// ─────────────────────────────────────────────────────────────
export default function DialogHost() {
  const theme = getAccountTheme()
  const [queue, setQueue] = useState([])
  const current = queue[0]

  useEffect(() => {
    _setSubscriber((req) => {
      setQueue((q) => [...q, req])
    })
    return () => _setSubscriber(null)
  }, [])

  const close = useCallback((result) => {
    setQueue((q) => {
      const [head, ...rest] = q
      try { head?.resolve?.(result) } catch {}
      return rest
    })
  }, [])

  // ESC = 취소 / Enter = 확인 키보드 단축키
  useEffect(() => {
    if (!current) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(current.kind === 'confirm' ? false : undefined)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        close(current.kind === 'confirm' ? true : undefined)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, close])

  if (!current) return null

  return (
    <div role="dialog" aria-modal="true"
         style={{
           position: 'fixed', inset: 0, zIndex: 9999,
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           padding: '24px',
           background: 'rgba(15, 18, 35, 0.55)',
           backdropFilter: 'blur(2px)',
           animation: 'judapay-dialog-fade 120ms ease-out',
         }}
         onClick={(e) => {
           // 백드롭 클릭으로 닫기 — alert 만 허용 (confirm 은 명시적 선택 필요)
           if (e.target === e.currentTarget && current.kind === 'alert') {
             close()
           }
         }}>
      {/* keyframes 한 번만 */}
      <style>{`
        @keyframes judapay-dialog-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes judapay-dialog-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '320px',
        background: '#fff',
        borderRadius: RADIUS.lg,
        boxShadow: '0 16px 48px rgba(15, 18, 35, 0.25), 0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        animation: 'judapay-dialog-pop 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        {/* 본문 */}
        <div style={{ padding: '24px 22px 20px' }}>
          <div style={{
            fontSize: '16px', fontWeight: 700, color: COLORS.t1,
            marginBottom: current.message ? '8px' : 0,
            letterSpacing: '-0.3px',
          }}>
            {current.title}
          </div>
          {current.message && (
            <div style={{
              fontSize: '13px', color: COLORS.t2,
              lineHeight: 1.55, whiteSpace: 'pre-wrap',
            }}>
              {current.message}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div style={{
          display: 'flex', borderTop: `1px solid ${COLORS.borderSoft}`,
        }}>
          {current.kind === 'confirm' && (
            <button onClick={() => close(false)}
                    style={{
                      flex: 1, padding: '14px 0',
                      background: 'transparent', border: 'none',
                      borderRight: `1px solid ${COLORS.borderSoft}`,
                      color: COLORS.t3, fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
              {current.cancelText}
            </button>
          )}
          <button onClick={() => close(current.kind === 'confirm' ? true : undefined)}
                  autoFocus
                  style={{
                    flex: 1, padding: '14px 0',
                    background: 'transparent', border: 'none',
                    color: current.destructive ? COLORS.danger : (theme.brandDark || COLORS.brandDark),
                    fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
            {current.okText}
          </button>
        </div>
      </div>
    </div>
  )
}
