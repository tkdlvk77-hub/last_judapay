import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useT } from '../design/i18n'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useStepHistory } from '../hooks/useStepHistory'
import { api } from '../services/api'
import { getWalletSummary, chargeWallet } from '../services/wallet'
import { stepUpWithPin } from '../services/biometric'
import { dialog } from '../components/Dialog'
import { hydrateHome } from '../services/hydrate'

// 데모 폴백 (서버 me 응답 전 잠시 보여줄 용도) — 실제로는 로그인 후 /me 에서 받음
const DEMO_ACCOUNTS = [
  { id:'demo', bank:'국민은행', bankCode:'KB', bankColor:'#F9C906', num:'***-**-****', name:'사용자', primary:true },
]

// 은행코드 → 표시명/색상 (서버 응답은 ISO 코드 '004'/'088' 같은 형태)
const BANK_META = {
  '004': { bank:'KB국민은행',  short:'KB', color:'#F9C906' },
  '088': { bank:'신한은행',    short:'신한', color:'#0048A3' },
  '020': { bank:'우리은행',    short:'우리', color:'#1968B1' },
  '081': { bank:'KEB하나은행', short:'하나', color:'#008587' },
  '003': { bank:'기업은행',    short:'IBK', color:'#00386A' },
  '011': { bank:'NH농협',      short:'NH', color:'#1DA462' },
  '090': { bank:'카카오뱅크',  short:'kakao', color:'#FEE500' },
  '089': { bank:'케이뱅크',    short:'K', color:'#3D2C7E' },
  '092': { bank:'토스뱅크',    short:'toss', color:'#0064FF' },
}
function bankMeta(code) {
  return BANK_META[code] || { bank: code, short: code, color:'#9CA3AF' }
}
function maskAccountTail(acc) {
  if (!acc) return '***-**-****'
  const tail = acc.slice(-4)
  const head = acc.slice(0, 3)
  return `${head}-**-${tail}`
}

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000]

function fmt(n) { return n ? Number(n).toLocaleString('ko-KR') : '0' }

// ─── 브랜드 헤더 ─────────────────────────────────────────
function BrandHeader({ title, onBack, bg }) {
  return (
    <div className="sticky-nav-safe" style={{
      background: bg,
      display:'flex', alignItems:'center',
      padding:'20px 16px 14px',
      gap:'4px', flexShrink:0,
    }}>
      <button onClick={onBack} style={{
        width:'36px', height:'36px', background:'transparent', border:'none',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', padding:0, flexShrink:0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span style={{ flex:1, fontSize:'16px', fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>
        {title}
      </span>
    </div>
  )
}

export default function Charge() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [step, setStep] = useState('main')
  const [amount, setAmount] = useState('')
  const [selectedAcc, setSelectedAcc] = useState(0)
  const [pin, setPin] = useState('')

  // ── 서버 데이터 ──────────────────────────────────────────
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS)
  const [myBalance, setMyBalance] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [completedTxId, setCompletedTxId] = useState(null)

  // 출금계좌(서버 /me) + 잔액(서버 /wallets/summary) 동시 fetch
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [me, summary] = await Promise.allSettled([
          api.get('/api/v1/app/me'),
          getWalletSummary(),
        ])
        if (cancelled) return
        if (me.status === 'fulfilled' && me.value?.bankAccount) {
          const a = me.value.bankAccount
          const meta = bankMeta(a.bankCode)
          setAccounts([{
            id:        a.bankCode + ':' + a.bankAccount,
            bankCode:  a.bankCode,
            bankAccount: a.bankAccount,
            bank:      meta.bank,
            bankShort: meta.short,
            bankColor: meta.color,
            num:       maskAccountTail(a.bankAccount),
            name:      a.holderName || me.value.name || '사용자',
            primary:   !!a.primary,
          }])
        }
        if (summary.status === 'fulfilled' && summary.value?.available != null) {
          setMyBalance(summary.value.available)
        }
      } catch (e) {
        console.warn('[Charge] init fetch failed', e?.message)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const amtNum = parseInt(amount) || 0
  const amtFmt = fmt(amtNum)
  const acc = accounts[selectedAcc] || accounts[0]

  const addAmount = (v) => setAmount(String(amtNum + v))

  /** PIN 6자리 완성 → step-up + charge 호출 */
  const submitCharge = async (finalPin) => {
    if (!acc?.bankCode || !acc?.bankAccount) {
      dialog.alert({ title: '충전 불가', message: '등록된 출금 계좌가 없습니다.' })
      setErrorMsg('등록된 출금 계좌가 없습니다.')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    try {
      // 1) step-up — jp_app_stepup 쿠키 발급 (5분 TTL)
      await stepUpWithPin(finalPin)
      // 2) 충전 — Idempotency-Key 로 중복 방어
      const result = await chargeWallet({
        amount:      amtNum,
        bankCode:    acc.bankCode,
        bankAccount: acc.bankAccount,
        idempotencyKey: 'charge-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      })
      setMyBalance(result.available ?? (myBalance + amtNum))
      setCompletedTxId(result.transactionId)
      setStep('done')
      // 홈에 머물러있는 컴포넌트가 잔액/결제 목록을 갱신할 수 있도록 트리거
      // hydrateHome 내부에서 'judapay:home-hydrated' 이벤트가 발행됨
      hydrateHome().catch(() => {})
    } catch (e) {
      const msg = e?.message || '충전에 실패했습니다.'
      // 서버에서 내려온 메시지로 alert + 화면 내 빨간 박스 동시 표시
      // (PIN 오류, MFA 실패, 잠금, rate limit 등 모두 여기서 사용자에게 명확히 안내)
      const isPinError = /PIN|비밀번호/i.test(msg)
      dialog.alert({
        title: isPinError ? 'PIN 오류' : '충전 실패',
        message: msg,
      })
      setErrorMsg(msg)
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  const pinInput = (k) => {
    if (submitting) return
    if (k === 'del') { setPin(p => p.slice(0, -1)); setErrorMsg(null); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      // 살짝 지연 — UX 적으로 6번째 점이 차오르는 게 보이도록
      setTimeout(() => submitCharge(next), 200)
    }
  }

  const goBack = () => {
    if (step === 'main') navigate(-1)
    else if (step === 'confirm') setStep('main')
    else if (step === 'pin') { setPin(''); setErrorMsg(null); setStep('confirm') }
  }
  useStepHistory(goBack, step === 'main')

  // 입력 박스에 보여줄 콤마 포함 문자열 (예: "750,000"). state amount 는 항상 순수 숫자 문자열.
  const displayAmount = amount ? Number(amount).toLocaleString('ko-KR') : ''
  // 폰트 크기는 콤마 포함 길이 기준으로 계산 (콤마 들어가면 1~2자리 더 늘어남)
  const amountFontSize = displayAmount.length <= 5 ? 46 : displayAmount.length <= 7 ? 38 : displayAmount.length <= 9 ? 30 : 24

  // ══════════════════════════════════════════════
  // STEP 1 — 금액 입력
  // ══════════════════════════════════════════════
  if (step === 'main') return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

        <BrandHeader title="충전" onBack={goBack} bg={theme.headerSolid} />

        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background:'#F5F6F8' }}>

          {/* 금액 입력 카드 */}
          <div style={{
            background:'#fff',
            margin:'16px 16px 0',
            borderRadius:'16px',
            border:'1px solid #EAECEF',
            padding:'22px 20px 20px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <span style={{ fontSize:'12px', fontWeight:600, color:'#9CA3AF', letterSpacing:'0.3px' }}>
                충전 금액
              </span>
            </div>

            {/* 금액 표시 */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:'6px', marginBottom:'10px', minHeight:'58px',
            }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                value={displayAmount}
                onChange={e => {
                  // 숫자만 추출 → state 는 항상 순수 숫자 문자열
                  const raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '')
                  setAmount(raw)
                }}
                placeholder="0"
                style={{
                  fontSize:`${amountFontSize}px`, fontWeight:700,
                  color: amount ? '#111827' : '#D1D5DB',
                  background:'transparent', border:'none', outline:'none',
                  textAlign:'right', fontFamily:'inherit',
                  width: Math.max(48, (displayAmount.length || 1) * (amountFontSize * 0.6)) + 'px',
                  transition:'font-size 0.1s, width 0.1s',
                  WebkitAppearance:'none', MozAppearance:'textfield',
                  letterSpacing:'-1.5px',
                }}
              />
              <span style={{
                fontSize: amountFontSize >= 38 ? '24px' : amountFontSize >= 30 ? '20px' : '16px',
                fontWeight:500, color: amount ? '#6B7280' : '#D1D5DB',
                lineHeight:1, flexShrink:0,
              }}>원</span>
              {amtNum > 0 && (
                <button onClick={() => setAmount('')} style={{
                  width:'22px', height:'22px', borderRadius:'50%', flexShrink:0,
                  background:'#F3F4F6', border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                    stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* 잔액 안내 */}
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <span style={{ fontSize:'12px', color:'#9CA3AF' }}>
                MY 지갑 잔액{' '}
                <strong style={{ color:'#6B7280', fontWeight:600 }}>{fmt(myBalance)}원</strong>
              </span>
            </div>

            {/* 빠른 금액 */}
            <div style={{ display:'flex', gap:'6px' }}>
              {QUICK_AMOUNTS.map(v => (
                <button key={v} onClick={() => addAmount(v)} style={{
                  flex:1, height:'36px',
                  background:'#F5F6F8',
                  border:'1px solid #E5E7EB',
                  borderRadius:'10px',
                  fontSize:'12px', fontWeight:600, color:'#374151',
                  cursor:'pointer', fontFamily:'inherit',
                  transition:'background 0.1s, border-color 0.1s',
                }}>
                  +{v >= 10000 ? `${v / 10000}만` : v}
                </button>
              ))}
            </div>
          </div>

          {/* 출금 계좌 */}
          <div style={{ padding:'20px 16px 0' }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:'10px',
            }}>
              <span style={{ fontSize:'13px', fontWeight:700, color:'#374151' }}>출금 계좌</span>
              <button style={{
                background:'none', border:'none', fontSize:'12px', fontWeight:600,
                color:'#2563EB', cursor:'pointer', fontFamily:'inherit', padding:0,
                textDecoration:'underline', textDecorationColor:'rgba(37,99,235,0.3)',
              }}>
                계좌 변경 ›
              </button>
            </div>

            <div style={{ borderRadius:'14px', overflow:'hidden', border:'1px solid #EAECEF', background:'#fff' }}>
              {accounts.map((a, i) => {
                const active = selectedAcc === a.id
                return (
                  <button key={a.id} onClick={() => setSelectedAcc(a.id)} style={{
                    width:'100%', padding:'13px 16px',
                    display:'flex', alignItems:'center', gap:'12px',
                    border:'none',
                    borderBottom: i < accounts.length - 1 ? '1px solid #F3F4F6' : 'none',
                    background: active ? '#F8FAFF' : '#fff',
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  }}>
                    <div style={{
                      width:'38px', height:'38px', borderRadius:'11px',
                      background: a.bankColor,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'11px', fontWeight:800, color:'#fff', flexShrink:0,
                      opacity: active ? 1 : 0.5,
                    }}>
                      {a.bankCode}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                        <span style={{ fontSize:'13px', fontWeight:700, color: active ? '#111827' : '#6B7280' }}>
                          {a.bank}
                        </span>
                        <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{a.num}</span>
                        {a.primary && (
                          <span style={{
                            padding:'2px 6px', borderRadius:'5px',
                            background:'#DCFCE7', color:'#166534',
                            fontSize:'9px', fontWeight:700, flexShrink:0,
                          }}>
                            인증
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{a.name}</div>
                    </div>
                    {active && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 요약 */}
          <div style={{ padding:'14px 16px 0' }}>
            <div style={{
              background:'#fff', borderRadius:'14px',
              border:'1px solid #EAECEF',
              overflow:'hidden',
            }}>
              {[
                { label:'충전 금액', value: amtNum ? `${amtFmt}원` : '—' },
                { label:'수수료',    value: '무료', green:true },
                { label:'충전 후 예상 잔액', value:`${fmt(myBalance + amtNum)}원`, bold:true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'12px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{row.label}</span>
                  <span style={{
                    fontSize: row.bold ? '14px' : '13px',
                    fontWeight: row.bold ? 700 : 600,
                    color: row.green ? '#059669' : row.bold ? '#111827' : '#374151',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 안내 */}
          <div style={{ padding:'12px 16px 24px' }}>
            <div style={{
              display:'flex', gap:'6px', alignItems:'flex-start',
              padding:'10px 13px', borderRadius:'11px',
              background:'#EFF6FF', border:'1px solid #BFDBFE',
            }}>
              <span style={{ fontSize:'12px', color:'#3B82F6', flexShrink:0 }}>ⓘ</span>
              <span style={{ fontSize:'11px', color:'#1D4ED8', lineHeight:1.65 }}>
                30만원 초과 충전 시 실명확인이 필요합니다. 이미 인증 완료되어 자동 처리됩니다.
              </span>
            </div>
          </div>
        </div>

        {/* 하단 CTA */}
        <div style={{
          padding:'12px 16px 28px', background:'#fff',
          borderTop:'1px solid #F0F1F3',
        }}>
          <button onClick={() => amtNum >= 1000 && setStep('confirm')}
            disabled={amtNum < 1000}
            style={{
              width:'100%', height:'52px',
              background: amtNum >= 1000 ? '#111827' : '#F3F4F6',
              color: amtNum >= 1000 ? '#fff' : '#9CA3AF',
              border:'none', borderRadius:'14px',
              fontSize:'15px', fontWeight:700,
              cursor: amtNum >= 1000 ? 'pointer' : 'default',
              fontFamily:'inherit',
              transition:'all 0.2s',
            }}>
            {amtNum >= 1000 ? `${amtFmt}원 충전하기` : '금액을 입력하세요'}
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ══════════════════════════════════════════════
  // STEP 2 — 최종 확인
  // ══════════════════════════════════════════════
  if (step === 'confirm') return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <BrandHeader title="충전 확인" onBack={goBack} bg={theme.headerSolid} />

        <div style={{ flex:1, overflowY:'auto', background:'#F5F6F8' }}>

          {/* 금액 히어로 카드 */}
          <div style={{
            background:'#fff', margin:'16px 16px 0',
            borderRadius:'16px', border:'1px solid #EAECEF',
            padding:'28px 20px 24px', textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'8px', fontWeight:500 }}>
              충전 금액
            </div>
            <div style={{ fontSize:'36px', fontWeight:800, color:'#111827', letterSpacing:'-1.5px', marginBottom:'16px' }}>
              {amtFmt}원
            </div>
            {/* 흐름 */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'10px',
              padding:'8px 16px', borderRadius:'20px', background:'#F5F6F8',
            }}>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>
                {acc.bank} {acc.num}
              </span>
              <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                <path d="M1 5h16M13 1l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>MY 지갑</span>
            </div>
          </div>

          {/* 거래 상세 */}
          <div style={{ padding:'14px 16px 0' }}>
            <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #EAECEF', overflow:'hidden' }}>
              {[
                { label:'충전 금액',       value:`${amtFmt}원`,                      bold:true },
                { label:'출금 계좌',       value:`${acc.bank} ${acc.num}`,            sub:acc.name },
                { label:'입금 지갑',       value:'MY 지갑' },
                { label:'수수료',          value:'무료',                              green:true },
                { label:'충전 후 예상 잔액', value:`${fmt(myBalance + amtNum)}원`,   accent:true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  padding:'13px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px',
                }}>
                  <span style={{ fontSize:'12px', color:'#9CA3AF', paddingTop:'1px', flexShrink:0 }}>{row.label}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{
                      fontSize: row.bold || row.accent ? '14px' : '13px',
                      fontWeight: row.bold || row.accent ? 700 : 600,
                      color: row.green ? '#059669' : row.accent ? '#2563EB' : '#111827',
                    }}>
                      {row.value}
                    </div>
                    {row.sub && (
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>{row.sub}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'12px 16px 24px' }}>
            <div style={{
              display:'flex', gap:'6px', alignItems:'flex-start',
              padding:'10px 13px', borderRadius:'11px',
              background:'#EFF6FF', border:'1px solid #BFDBFE',
            }}>
              <span style={{ fontSize:'12px', color:'#3B82F6', flexShrink:0 }}>ⓘ</span>
              <span style={{ fontSize:'11px', color:'#1D4ED8', lineHeight:1.65 }}>
                비밀번호 입력 후 즉시 처리됩니다. 본인 인증 계좌로만 충전 가능합니다.
              </span>
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 16px 28px', background:'#fff',
          borderTop:'1px solid #F0F1F3',
          display:'flex', flexDirection:'column', gap:'8px',
        }}>
          <button onClick={() => setStep('pin')} style={{
            width:'100%', height:'52px',
            background:'#111827', color:'#fff',
            border:'none', borderRadius:'14px',
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            비밀번호 입력 후 충전
          </button>
          <button onClick={goBack} style={{
            width:'100%', height:'40px',
            background:'transparent', color:'#9CA3AF',
            border:'none', fontSize:'13px',
            cursor:'pointer', fontFamily:'inherit',
          }}>
            수정하기
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ══════════════════════════════════════════════
  // STEP 3 — PIN 입력
  // ══════════════════════════════════════════════
  if (step === 'pin') return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <BrandHeader title="비밀번호 입력" onBack={goBack} bg={theme.headerSolid} />

        {/* 상단 요약 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #F0F1F3', padding:'12px 16px 14px' }}>
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'#F5F6F8', borderRadius:'12px', padding:'12px 16px',
          }}>
            <span style={{ fontSize:'12px', color:'#6B7280' }}>{acc.bank} → MY 지갑</span>
            <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>{amtFmt}원</span>
          </div>
        </div>

        {/* PIN 영역 */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column',
          alignItems:'center', background:'#F5F6F8',
          paddingTop:'36px',
        }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'24px' }}>
            {submitting ? '충전 처리 중...' : '6자리 비밀번호를 입력하세요'}
          </div>
          <div style={{ display:'flex', gap:'14px', marginBottom:'14px' }}>
            {Array.from({ length:6 }).map((_, i) => (
              <div key={i} style={{
                width:'13px', height:'13px', borderRadius:'50%',
                background: i < pin.length ? '#111827' : 'transparent',
                border: i < pin.length ? '2px solid #111827' : '2px solid #D1D5DB',
                transition:'all .15s',
                opacity: submitting ? 0.5 : 1,
              }} />
            ))}
          </div>
          {errorMsg && (
            <div style={{
              maxWidth:'320px',
              background:'#FEF2F2', color:'#DC2626',
              borderRadius:'10px', padding:'10px 14px',
              fontSize:'12px', textAlign:'center',
              marginBottom:'14px',
            }}>
              {errorMsg}
            </div>
          )}
          {!errorMsg && <div style={{ height:'14px' }} />}
          <button style={{
            display:'flex', alignItems:'center', gap:'5px',
            background:'none', border:'none',
            color:'#6B7280', fontSize:'12px', fontWeight:500,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            <svg width="14" height="14" viewBox="0 0 42 42" fill="none">
              <rect x="9" y="4" width="24" height="34" rx="5" stroke="#9CA3AF" strokeWidth="2"/>
              <circle cx="21" cy="21" r="6" stroke="#9CA3AF" strokeWidth="2"/>
              <circle cx="21" cy="21" r="2" fill="#9CA3AF"/>
            </svg>
            Face ID로 인증
          </button>
        </div>

        {/* 키패드 */}
        <div style={{
          background:'#fff', borderTop:'1px solid #F0F1F3',
          padding:'14px 24px 28px',
        }}>
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px',
            opacity: submitting ? 0.5 : 1, pointerEvents: submitting ? 'none' : 'auto',
          }}>
            {KEYS.map((k, i) => (
              <button key={i} onClick={() => pinInput(k)} style={{
                height:'56px', borderRadius:'14px',
                background: k === null ? 'transparent'
                  : k === 'del' ? '#F5F6F8'
                  : '#F5F6F8',
                border: k === null ? 'none' : '1px solid #EAECEF',
                fontSize:'22px', fontWeight:500,
                color: k === 'del' ? '#6B7280' : '#111827',
                cursor: k === null ? 'default' : 'pointer',
                fontFamily:'inherit',
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:'1px',
              }}>
                {k === 'del' ? (
                  <svg width="20" height="16" viewBox="0 0 24 18" fill="none"
                    stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 1H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L2 9z"/>
                    <line x1="12" y1="6" x2="18" y2="12"/>
                    <line x1="18" y1="6" x2="12" y2="12"/>
                  </svg>
                ) : k !== null ? (
                  <>
                    <span style={{ fontSize:'22px', fontWeight:500, lineHeight:1 }}>{k}</span>
                    {[2,3,4,5,6,7,8,9].includes(k) && (
                      <span style={{ fontSize:'8px', color:'#9CA3AF', letterSpacing:'1.5px', lineHeight:1 }}>
                        {{2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}[k]}
                      </span>
                    )}
                  </>
                ) : null}
              </button>
            ))}
          </div>
          <div style={{ textAlign:'center', fontSize:'10px', color:'#9CA3AF', marginTop:'12px' }}>
            비밀번호 5회 오류 시 30분 잠금
          </div>
        </div>
      </div>
    </PhoneShell>
  )

  // ══════════════════════════════════════════════
  // STEP 4 — 완료
  // ══════════════════════════════════════════════
  return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <BrandHeader title="충전 완료" onBack={() => navigate(-1)} bg={theme.headerSolid} />

        <div style={{ flex:1, overflowY:'auto', background:'#F5F6F8' }}>

          {/* 완료 히어로 */}
          <div style={{
            background:'#fff', margin:'16px 16px 0',
            borderRadius:'16px', border:'1px solid #EAECEF',
            padding:'32px 20px 28px', textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              width:'64px', height:'64px', borderRadius:'20px',
              background:'#F0FDF4', border:'1.5px solid #BBF7D0',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 18px',
            }}>
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                <path d="M2 11L10 19L26 2" stroke="#059669" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize:'13px', color:'#9CA3AF', marginBottom:'6px' }}>충전 완료</div>
            <div style={{ fontSize:'34px', fontWeight:800, color:'#111827', letterSpacing:'-1.5px', marginBottom:'4px' }}>
              {amtFmt}원
            </div>
            <div style={{ fontSize:'12px', color:'#9CA3AF' }}>MY 지갑에 충전되었습니다</div>
          </div>

          {/* 영수증 */}
          <div style={{ padding:'14px 16px 0' }}>
            <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #EAECEF', overflow:'hidden' }}>
              <div style={{
                padding:'11px 16px', background:'#F9FAFB',
                borderBottom:'1px solid #F3F4F6',
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ fontSize:'11px', fontWeight:700, color:'#6B7280' }}>거래 내역</span>
                <span style={{ fontSize:'11px', color:'#9CA3AF' }}>2026.05.12 · 14:32</span>
              </div>
              {[
                { label:'충전 금액',  value:`+${amtFmt}원`, green:true },
                { label:'출금 계좌',  value:`${acc.bank} ****${acc.num.slice(-3)}` },
                { label:'충전 후 잔액', value:`${fmt(myBalance + amtNum)}원`, bold:true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  padding:'13px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{row.label}</span>
                  <span style={{
                    fontSize: row.bold ? '15px' : '13px',
                    fontWeight: row.bold ? 700 : 600,
                    color: row.green ? '#059669' : '#111827',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 잔액 카드 */}
          <div style={{ padding:'12px 16px 24px' }}>
            <div style={{
              background:'#fff', borderRadius:'14px',
              border:'1px solid #EAECEF',
              padding:'14px 16px',
              display:'flex', alignItems:'center', gap:'12px',
            }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'12px',
                background:'#111827',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="3"/>
                  <path d="M16 12h.01"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'3px' }}>MY 지갑 현재 잔액</div>
                <div style={{ fontSize:'18px', fontWeight:800, color:'#111827', letterSpacing:'-0.5px' }}>
                  {fmt(myBalance + amtNum)}원
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 16px 28px', background:'#fff',
          borderTop:'1px solid #F0F1F3',
          display:'flex', flexDirection:'column', gap:'8px',
        }}>
          <button onClick={() => navigate('/home')} style={{
            width:'100%', height:'52px',
            background:'#111827', color:'#fff',
            border:'none', borderRadius:'14px',
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            홈으로
          </button>
          <button onClick={() => { setAmount(''); setStep('main') }} style={{
            width:'100%', height:'42px',
            background:'transparent', color:'#9CA3AF',
            border:'none', fontSize:'13px',
            cursor:'pointer', fontFamily:'inherit',
          }}>
            다시 충전하기
          </button>
        </div>
      </div>
    </PhoneShell>
  )
}
