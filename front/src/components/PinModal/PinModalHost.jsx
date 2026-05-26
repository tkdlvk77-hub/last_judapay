import { useEffect, useState, useCallback } from 'react'
import { _setSubscriber } from './pinBus'
import { COLORS, RADIUS } from '../../design/tokens'
import { stepUpWithPin } from '../../services/biometric'

// ─────────────────────────────────────────────────────────────
// PinModalHost — 화면 어디서든 한 번만 마운트되는 PIN 입력 모달.
//   pinBus 의 publish 를 받아서 큐에 쌓고 한 번에 하나씩 렌더.
//
//   사용자가 6자리 PIN 입력 → stepUpWithPin(pin) 호출 → 성공이면 req.resolve(),
//   실패면 에러 메시지 표시. "취소" 누르면 req.reject(new Error('cancelled')).
// ─────────────────────────────────────────────────────────────
export default function PinModalHost() {
  const [queue, setQueue] = useState([])
  const [pin, setPin]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

  const current = queue[0]

  useEffect(() => {
    _setSubscriber((req) => {
      setQueue((q) => [...q, req])
    })
    return () => _setSubscriber(null)
  }, [])

  // 새 요청이 큐 head 가 될 때 상태 초기화
  useEffect(() => {
    if (current) {
      setPin('')
      setErr('')
      setBusy(false)
    }
  }, [current?.id])

  const finish = useCallback((ok, error) => {
    setQueue((q) => {
      const [head, ...rest] = q
      try {
        if (ok) head?.resolve?.()
        else    head?.reject?.(error || new Error('cancelled'))
      } catch {}
      return rest
    })
  }, [])

  // PIN 6자리 완성 시 자동 제출
  useEffect(() => {
    if (!current || busy) return
    if (pin.length !== 6) return
    let aborted = false
    ;(async () => {
      setBusy(true)
      try {
        await stepUpWithPin(pin)
        if (!aborted) finish(true)
      } catch (e) {
        if (aborted) return
        setErr(e?.message || 'PIN 인증에 실패했어요.')
        setPin('')
        setBusy(false)
      }
    })()
    return () => { aborted = true }
  }, [pin, busy, current, finish])

  // ESC = 취소
  useEffect(() => {
    if (!current) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finish(false)
      } else if (/^\d$/.test(e.key)) {
        if (busy) return
        setPin((p) => (p.length < 6 ? p + e.key : p))
      } else if (e.key === 'Backspace') {
        if (busy) return
        setPin((p) => p.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, busy, finish])

  if (!current) return null

  const press = (k) => {
    if (busy) return
    if (k === 'del') { setPin((p) => p.slice(0, -1)); setErr(''); return }
    if (pin.length >= 6) return
    setPin((p) => p + k)
    setErr('')
  }

  return (
    <div
      role="dialog" aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        background: 'rgba(15, 18, 35, 0.6)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) finish(false)
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '340px',
          background: '#fff',
          borderRadius: RADIUS.lg,
          boxShadow: '0 16px 48px rgba(15, 18, 35, 0.28)',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: '22px 22px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.t1, marginBottom: '6px' }}>
            {current.title}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.t3, lineHeight: 1.55 }}>
            {current.message}
          </div>
        </div>

        {/* PIN dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:'14px', padding:'8px 0 18px' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{
              width: '12px', height: '12px', borderRadius:'50%',
              background: i < pin.length ? COLORS.t1 : COLORS.borderSoft,
              transition: 'background 0.12s',
            }}/>
          ))}
        </div>

        {/* 에러 / 진행 표시 */}
        <div style={{ minHeight:'18px', textAlign:'center',
                      fontSize:'12px', color: err ? '#DC2626' : COLORS.t4,
                      marginBottom:'6px' }}>
          {busy ? '인증 중…' : (err || '')}
        </div>

        {/* 키패드 */}
        <div style={{ padding:'0 14px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => {
            if (k === '') return <div key={i} />
            const label = k === 'del' ? '⌫' : k
            return (
              <button key={i} type="button"
                onClick={() => press(k)} disabled={busy}
                style={{
                  height:'48px', borderRadius:'12px',
                  background: '#F4F6FB', border:'none',
                  fontSize: k === 'del' ? '18px' : '20px', fontWeight: 600,
                  color: COLORS.t1, cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit', userSelect:'none',
                  opacity: busy ? 0.5 : 1,
                }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* 취소 */}
        <button
          onClick={() => finish(false)}
          disabled={busy}
          style={{
            width:'100%', padding:'14px',
            background:'#fff', border:'none',
            borderTop:`1px solid ${COLORS.borderSoft}`,
            color: COLORS.t3, fontSize:'14px', fontWeight:600,
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily:'inherit',
          }}>
          취소
        </button>
      </div>
    </div>
  )
}
