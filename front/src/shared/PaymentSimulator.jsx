// ─────────────────────────────────────────────────────────
// PaymentSimulator.jsx — 카드 결제 시뮬레이션 (개발/테스트용)
//
// 카드 발급/카드사 연동이 안 된 상태에서 결제 흐름을 테스트하는 화면.
// 가맹점 + MCC + 금액 선택 후 POST /api/v1/app/payments 호출.
// 서버는 cardId=null/orgId=null 인 개인 결제 경로로 처리 → MY 지갑 차감.
//
// 검증 가능한 시나리오:
//   1. 정상 결제 → 잔액 차감 + STOMP wallet/payment 알림
//   2. FDS 차단 (MCC 7993/7995/5813) → 차단됨 + 알림
//   3. 잔액 부족 → INSUFFICIENT_BALANCE 예외 + 알림
//   4. 1회 한도 초과 (1천만 원) → BLOCKED + 알림
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { executePayment } from '../services/payment'
import { stepUpWithPin } from '../services/biometric'
import { useWalletState, refreshWallets } from '../services/walletStore'
import { dialog } from '../components/Dialog'
import { listCards as apiListCards } from '../services/cards'

// 가맹점 프리셋 — 다양한 MCC 시뮬레이션
const MERCHANTS = [
  // 정상 결제
  { name:'스타벅스 강남점',   mcc:'5814', mccLabel:'카페',          tone:'normal' },
  { name:'이마트 역삼점',     mcc:'5411', mccLabel:'식료품/마트',   tone:'normal' },
  { name:'GS25 편의점',       mcc:'5411', mccLabel:'편의점',         tone:'normal' },
  { name:'AWS 클라우드',      mcc:'7372', mccLabel:'IT/소프트웨어',  tone:'normal' },
  { name:'CGV 강남',          mcc:'7832', mccLabel:'영화',           tone:'normal' },
  // FDS 차단 대상
  { name:'GS강남게임센터',    mcc:'7993', mccLabel:'오락실/게임',   tone:'blocked' },
  { name:'강남 카지노',       mcc:'7995', mccLabel:'카지노/도박',   tone:'blocked' },
  { name:'강남 룸살롱',       mcc:'5813', mccLabel:'유흥/주점',     tone:'blocked' },
]

const QUICK_AMOUNTS = [3000, 7500, 23000, 50000, 100000, 1000000]

export default function PaymentSimulator() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const wallet = useWalletState()

  // ── 마운트 시 + Pull-to-Refresh 가 없으므로 명시적으로 1회 fetch ──
  //   walletStore 는 STOMP 이벤트 기반이지만 첫 진입 시는 비어있을 수 있음.
  useEffect(() => { refreshWallets() }, [])

  // ── 첫 카드 1장 fetch — 결제 시 cardId 동봉용 (카드 MCC/한도 평가) ──
  const [primaryCardId, setPrimaryCardId] = useState(null)
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const resp = await apiListCards()
        const arr  = resp?.data || resp || []
        if (!aborted && arr.length > 0) setPrimaryCardId(arr[0].id)
      } catch (e) {
        console.debug('[PaymentSimulator] listCards failed', e?.message || e)
      }
    })()
    return () => { aborted = true }
  }, [])

  const [merchant, setMerchant] = useState(MERCHANTS[0])
  const [amount, setAmount]     = useState(7500)
  const [pin, setPin]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]     = useState(null)

  // ── 지갑 선택 — MY + 받은 권한자금들 ──
  const myWallet = (wallet?.wallets || []).find(w => w.kind === 'MY')
  const permissionWallets = (wallet?.wallets || []).filter(w => w.kind === 'PERMISSION')
  const allOptions = [myWallet, ...permissionWallets].filter(Boolean)
  const [selectedWalletId, setSelectedWalletId] = useState(null)

  // ── default 자동 선택 — 잔액 있는 지갑 우선 ──
  //   1) 사용자가 명시적으로 고른 게 있으면 그것
  //   2) 없으면 잔액 있는 지갑 중 첫 번째 (MY 가 0이면 PERMISSION 자동 선택)
  //   3) 그래도 없으면 MY
  const _explicit = allOptions.find(w => w.id === selectedWalletId)
  const _hasFunds = allOptions.find(w => (w.balance - (w.pendingOut || 0)) > 0)
  const selectedWallet = _explicit || _hasFunds || myWallet
  const balance = selectedWallet ? (selectedWallet.balance - (selectedWallet.pendingOut || 0)) : 0

  // PERMISSION 지갑 선택 시 허용 MCC 파싱
  let allowedMccList = null
  try {
    if (selectedWallet?.kind === 'PERMISSION' && selectedWallet.allowedMcc) {
      const arr = typeof selectedWallet.allowedMcc === 'string'
        ? JSON.parse(selectedWallet.allowedMcc)
        : selectedWallet.allowedMcc
      allowedMccList = Array.isArray(arr) && arr.length > 0 ? arr : null   // []=전체허용
    }
  } catch {}

  const handlePay = async () => {
    if (submitting) return
    if (!/^\d{6}$/.test(pin)) {
      await dialog.alert({ title:'PIN 필요', message:'6자리 PIN 을 입력해 주세요.', okText:'확인' })
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      // step-up 후 결제
      await stepUpWithPin(pin)
      const tx = await executePayment({
        amount,
        merchantName: merchant.name,
        merchantMcc:  merchant.mcc,
        walletId:     selectedWallet?.id || null,   // 선택한 지갑에서 차감
        cardId:       primaryCardId,                // 카드 MCC/한도 평가용
      }, { _skipStepUp: true })
      setResult({ ok: true, tx, wallet: selectedWallet })
    } catch (e) {
      setResult({ ok: false, error: e?.message || '결제 실패', code: e?.code })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PhoneShell>
      <div style={{ background: theme.headerSolid || '#1A1A2E',
        paddingTop:'max(20px, env(safe-area-inset-top))',
        paddingBottom:'18px', paddingLeft:'20px', paddingRight:'20px' }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'transparent', border:'none', color:'#fff', fontSize:'14px', cursor:'pointer', padding:0, marginBottom:'8px' }}>
          ← 뒤로
        </button>
        <div style={{ fontSize:'22px', fontWeight:800, color:'#fff' }}>결제 시뮬레이션</div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'4px' }}>
          {selectedWallet?.name || 'MY 지갑'} 잔액 {balance.toLocaleString()}원
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 80px', background: COLORS.bg }}>
        {/* 지갑 선택 */}
        <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px' }}>
          어느 지갑으로 결제할까요?
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'6px', marginBottom:'18px' }}>
          {allOptions.length === 0 && (
            <div style={{ padding:'14px', textAlign:'center', fontSize:'12px', color: COLORS.t3,
              border: `1px dashed ${COLORS.border}`, borderRadius: RADIUS.md }}>
              <div style={{ marginBottom:'6px' }}>지갑이 아직 없거나 로딩 중입니다.</div>
              <button onClick={() => refreshWallets()} style={{
                fontSize:'11px', padding:'6px 12px',
                background: theme.brandDark, color:'#fff', border:'none',
                borderRadius:'6px', cursor:'pointer', fontFamily:'inherit',
              }}>다시 불러오기</button>
              <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'8px', lineHeight:1.5 }}>
                • 자금집행을 받았는데 안 보이면 — 송신자가 가입된 휴대폰으로 보냈는지 확인<br/>
                • MY 지갑 잔액 0 이면 — /charge 에서 충전 필요
              </div>
            </div>
          )}
          {allOptions.map(w => {
            const active = selectedWallet?.id === w.id
            const isPerm = w.kind === 'PERMISSION'
            const wAvail = w.balance - (w.pendingOut || 0)
            return (
              <button key={w.id} onClick={() => setSelectedWalletId(w.id)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 14px',
                  background: active ? (isPerm ? '#FFF7E5' : '#EFF6FF') : COLORS.bgCard,
                  border: active
                    ? (isPerm ? '2px solid #C8821A' : `2px solid ${theme.brandDark}`)
                    : `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.md, cursor:'pointer', textAlign:'left',
                  fontFamily:'inherit',
                }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'20px' }}>{w.icon || (isPerm ? '🎁' : '💳')}</span>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{w.name}</div>
                    {isPerm && w.senderName && (
                      <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'2px' }}>
                        from {w.senderName}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'14px', fontWeight:800, color: COLORS.t1 }}>
                    {wAvail.toLocaleString()}원
                  </div>
                  {isPerm && (
                    <div style={{ fontSize:'10px', color:'#C8821A', fontWeight:600, marginTop:'2px' }}>권한자금</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 권한자금 MCC 안내 */}
        {selectedWallet?.kind === 'PERMISSION' && (
          <div style={{
            padding:'10px 12px', marginBottom:'18px',
            background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius: RADIUS.md,
          }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#854F0B', marginBottom:'4px' }}>
              ⚠ 권한자금 제한
            </div>
            <div style={{ fontSize:'11px', color:'#92400E', lineHeight:1.5 }}>
              {allowedMccList
                ? <>허용 MCC: <strong>{allowedMccList.join(', ')}</strong>만 결제 가능</>
                : '전체 MCC 허용'}
              {selectedWallet.singleLimit && (
                <> · 1회 한도 {selectedWallet.singleLimit.toLocaleString()}원</>
              )}
            </div>
          </div>
        )}

        {/* 가맹점 선택 */}
        <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px' }}>가맹점 선택</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'8px', marginBottom:'18px' }}>
          {MERCHANTS.map(m => {
            const active = merchant.name === m.name
            const blocked = m.tone === 'blocked'
            return (
              <button key={m.name} onClick={() => setMerchant(m)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 14px',
                  background: active ? (blocked ? '#FEF2F2' : '#EFF6FF') : COLORS.bgCard,
                  border: active
                    ? (blocked ? '2px solid #DC2626' : `2px solid ${theme.brandDark}`)
                    : `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.md, cursor:'pointer', textAlign:'left',
                  fontFamily:'inherit',
                }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:700, color: blocked ? '#DC2626' : COLORS.t1 }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'2px' }}>
                    MCC {m.mcc} · {m.mccLabel}
                  </div>
                </div>
                {blocked && (
                  <span style={{ fontSize:'10px', fontWeight:700,
                    background:'#FEE2E2', color:'#DC2626', padding:'3px 8px', borderRadius:'6px' }}>
                    FDS 차단
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 금액 */}
        <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px' }}>금액</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'6px', marginBottom:'10px' }}>
          {QUICK_AMOUNTS.map(v => (
            <button key={v} onClick={() => setAmount(v)}
              style={{
                padding:'10px 0', background: amount===v ? theme.brandDark : COLORS.bgCard,
                color: amount===v ? '#fff' : COLORS.t1,
                border: `1px solid ${amount===v ? theme.brandDark : COLORS.border}`,
                borderRadius: RADIUS.sm, fontSize:'13px', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
              {v.toLocaleString()}원
            </button>
          ))}
        </div>
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)}
          style={{
            width:'100%', padding:'12px 14px',
            background: COLORS.bgCard, border:`1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700,
            color: COLORS.t1, textAlign:'right', fontFamily:'inherit', marginBottom:'18px',
          }}
          placeholder="직접 입력" />

        {/* PIN */}
        <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t2, marginBottom:'8px' }}>PIN 6자리</div>
        <input type="password" inputMode="numeric" maxLength={6}
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,6))}
          style={{
            width:'100%', padding:'12px 14px',
            background: COLORS.bgCard, border:`1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md, fontSize:'18px', letterSpacing:'4px',
            color: COLORS.t1, textAlign:'center', fontFamily:'inherit', marginBottom:'20px',
          }}
          placeholder="● ● ● ● ● ●" />

        {/* 결과 */}
        {result && (
          <div style={{
            padding:'14px 16px', borderRadius: RADIUS.md, marginBottom:'18px',
            background: result.ok ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${result.ok ? '#A7F3D0' : '#FECACA'}`,
          }}>
            {result.ok ? (
              <>
                <div style={{ fontSize:'14px', fontWeight:700, color:'#047857' }}>
                  ✅ 결제 완료 {result.tx?.fdsStatus === 'BLOCKED' && '(BUT FDS BLOCKED)'}
                </div>
                <div style={{ fontSize:'11px', color:'#065F46', marginTop:'4px', fontFamily:'monospace' }}>
                  TX: {result.tx?.transactionNo || result.tx?.id}<br/>
                  Status: {result.tx?.status} · FDS: {result.tx?.fdsStatus} · Risk: {result.tx?.fdsRiskScore}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:'14px', fontWeight:700, color:'#DC2626' }}>
                  ❌ 결제 실패 {result.code && `(${result.code})`}
                </div>
                <div style={{ fontSize:'12px', color:'#991B1B', marginTop:'4px' }}>
                  {result.error}
                </div>
              </>
            )}
          </div>
        )}

        <button onClick={handlePay} disabled={submitting || amount <= 0}
          style={{
            width:'100%', padding:'16px 0',
            background: submitting || amount <= 0 ? COLORS.bgMuted : theme.brandDark,
            color: '#fff', border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700, cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily:'inherit', boxShadow: SHADOWS.buttonBrand,
          }}>
          {submitting ? '결제 중…' : `${amount.toLocaleString()}원 결제`}
        </button>

        <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'18px', lineHeight:1.6 }}>
          ※ 개발/테스트 전용 화면.<br/>
          실제 카드 발급 없이 MY 지갑에서 직접 차감하며, FDS 규칙(MCC 차단 / 1회 한도)이 적용됩니다.<br/>
          결제 후 BottomTab 배지 + Home 잔액 + Alerts 카드가 STOMP 로 즉시 갱신됩니다.
        </div>
      </div>
    </PhoneShell>
  )
}
