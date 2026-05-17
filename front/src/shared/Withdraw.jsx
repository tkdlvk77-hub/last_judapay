import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useT } from '../design/i18n'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useStepHistory } from '../hooks/useStepHistory'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const MY_BALANCE = 1932000
const ACCOUNT = {
  bank:'국민은행', bankCode:'KB', bankColor:'#F9C906',
  num:'123-**-456', name:'이호형',
}

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

export default function Withdraw() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [step, setStep] = useState('main')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')

  const amtNum = parseInt(amount) || 0
  const amtFmt = fmt(amtNum)
  const remaining = MY_BALANCE - amtNum
  const overBalance = amtNum > MY_BALANCE

  const pinInput = (k) => {
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); setStep('done') }, 380)
  }

  const goBack = () => {
    if (step === 'main') navigate(-1)
    else if (step === 'confirm') setStep('main')
    else if (step === 'pin') setStep('confirm')
  }
  useStepHistory(goBack, step === 'main')

  const amountFontSize = amount.length <= 5 ? 46 : amount.length <= 7 ? 38 : amount.length <= 9 ? 30 : 24

  // ══════════════════════════════════════════════
  // STEP 1 — 금액 입력
  // ══════════════════════════════════════════════
  if (step === 'main') return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

        <BrandHeader title="출금" onBack={goBack} bg={theme.headerSolid} />

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
                출금 금액
              </span>
            </div>

            {/* 금액 표시 */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:'6px', marginBottom:'10px', minHeight:'58px',
            }}>
              <input
                type="number" inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/^0+/, ''))}
                placeholder="0"
                style={{
                  fontSize:`${amountFontSize}px`, fontWeight:700,
                  color: overBalance ? '#DC2626' : amount ? '#111827' : '#D1D5DB',
                  background:'transparent', border:'none', outline:'none',
                  textAlign:'right', fontFamily:'inherit',
                  width: Math.max(48, (amount.length || 1) * (amountFontSize * 0.6)) + 'px',
                  transition:'font-size 0.1s, width 0.1s, color 0.15s',
                  WebkitAppearance:'none', MozAppearance:'textfield',
                  letterSpacing:'-1.5px',
                }}
              />
              <span style={{
                fontSize: amountFontSize >= 38 ? '24px' : amountFontSize >= 30 ? '20px' : '16px',
                fontWeight:500,
                color: overBalance ? '#DC2626' : amount ? '#6B7280' : '#D1D5DB',
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
            <div style={{ textAlign:'center', marginBottom:'6px' }}>
              <span style={{ fontSize:'12px', color:'#9CA3AF' }}>
                MY 지갑 잔액{' '}
                <strong style={{ color:'#6B7280', fontWeight:600 }}>{fmt(MY_BALANCE)}원</strong>
              </span>
            </div>
            {overBalance && (
              <div style={{ textAlign:'center', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'#DC2626', fontWeight:600 }}>
                  잔액 초과 · 최대 {fmt(MY_BALANCE)}원
                </span>
              </div>
            )}
            <div style={{ marginBottom:'20px' }} />

            {/* 빠른 금액 */}
            <div style={{ display:'flex', gap:'6px' }}>
              {[
                { label:'+10만', val:100000 },
                { label:'+50만', val:500000 },
                { label:'전액',  val:'all' },
              ].map(b => (
                <button key={b.label}
                  onClick={() => setAmount(b.val === 'all' ? String(MY_BALANCE) : String(amtNum + b.val))}
                  style={{
                    flex:1, height:'36px',
                    background: b.val === 'all' ? '#111827' : '#F5F6F8',
                    border: b.val === 'all' ? 'none' : '1px solid #E5E7EB',
                    borderRadius:'10px',
                    fontSize:'12px', fontWeight:600,
                    color: b.val === 'all' ? '#fff' : '#374151',
                    cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* 입금 계좌 */}
          <div style={{ padding:'16px 16px 0' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'10px' }}>
              입금 계좌
            </div>
            <div style={{
              background:'#fff', borderRadius:'14px',
              border:'1px solid #EAECEF',
              padding:'13px 16px',
              display:'flex', alignItems:'center', gap:'12px',
            }}>
              <div style={{
                width:'38px', height:'38px', borderRadius:'11px',
                background: ACCOUNT.bankColor,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'11px', fontWeight:800, color:'#fff', flexShrink:0,
              }}>
                {ACCOUNT.bankCode}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>
                    {ACCOUNT.bank}
                  </span>
                  <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{ACCOUNT.num}</span>
                  <span style={{
                    padding:'2px 6px', borderRadius:'5px',
                    background:'#DCFCE7', color:'#166534',
                    fontSize:'9px', fontWeight:700, flexShrink:0,
                  }}>
                    인증
                  </span>
                </div>
                <div style={{ fontSize:'11px', color:'#9CA3AF' }}>{ACCOUNT.name}</div>
              </div>
              <button style={{
                fontSize:'12px', fontWeight:600, color:'#2563EB',
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                textDecoration:'underline', textDecorationColor:'rgba(37,99,235,0.3)',
              }}>
                변경 ›
              </button>
            </div>
          </div>

          {/* 요약 */}
          <div style={{ padding:'12px 16px 0' }}>
            <div style={{
              background:'#fff', borderRadius:'14px',
              border:'1px solid #EAECEF', overflow:'hidden',
            }}>
              {[
                { label:'출금 금액',       value: amtNum ? `${amtFmt}원` : '—' },
                { label:'수수료',          value: '무료', green:true },
                { label:'예상 입금 시간',  value: '즉시 (실시간)' },
                {
                  label:'출금 후 MY 잔액',
                  value: amtNum ? `${fmt(remaining)}원` : `${fmt(MY_BALANCE)}원`,
                  bold:true, danger: overBalance,
                },
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
                    color: row.danger ? '#DC2626' : row.green ? '#059669' : '#111827',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 자금 안내 */}
          <div style={{ padding:'12px 16px 24px' }}>
            <div style={{
              display:'flex', gap:'6px', alignItems:'flex-start',
              padding:'10px 13px', borderRadius:'11px',
              background:'#FFFBEB', border:'1px solid #FDE68A',
            }}>
              <span style={{ fontSize:'12px', color:'#92400E', flexShrink:0 }}>⚠</span>
              <span style={{ fontSize:'11px', color:'#92400E', lineHeight:1.65 }}>
                MY 지갑만 출금 가능합니다. 받은 지갑(권한 자금)은 카드 결제만 가능합니다.
              </span>
            </div>
          </div>
        </div>

        {/* 하단 CTA */}
        <div style={{
          padding:'12px 16px 28px', background:'#fff',
          borderTop:'1px solid #F0F1F3',
        }}>
          <button
            onClick={() => amtNum >= 1000 && !overBalance && setStep('confirm')}
            disabled={!(amtNum >= 1000 && !overBalance)}
            style={{
              width:'100%', height:'52px',
              background: overBalance ? '#FEE2E2'
                : amtNum >= 1000 ? '#111827'
                : '#F3F4F6',
              color: overBalance ? '#DC2626'
                : amtNum >= 1000 ? '#fff'
                : '#9CA3AF',
              border:'none', borderRadius:'14px',
              fontSize:'15px', fontWeight:700,
              cursor: amtNum >= 1000 && !overBalance ? 'pointer' : 'default',
              fontFamily:'inherit', transition:'all 0.2s',
            }}>
            {overBalance ? '잔액 초과' : amtNum >= 1000 ? `${amtFmt}원 출금하기` : '금액을 입력하세요'}
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
        <BrandHeader title="출금 확인" onBack={goBack} bg={theme.headerSolid} />

        <div style={{ flex:1, overflowY:'auto', background:'#F5F6F8' }}>

          {/* 금액 히어로 카드 */}
          <div style={{
            background:'#fff', margin:'16px 16px 0',
            borderRadius:'16px', border:'1px solid #EAECEF',
            padding:'28px 20px 24px', textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'8px', fontWeight:500 }}>
              출금 금액
            </div>
            <div style={{ fontSize:'36px', fontWeight:800, color:'#111827', letterSpacing:'-1.5px', marginBottom:'16px' }}>
              {amtFmt}원
            </div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'10px',
              padding:'8px 16px', borderRadius:'20px', background:'#F5F6F8',
            }}>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>MY 지갑</span>
              <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                <path d="M1 5h16M13 1l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>
                {ACCOUNT.bank} {ACCOUNT.num}
              </span>
            </div>
          </div>

          {/* 거래 상세 */}
          <div style={{ padding:'14px 16px 0' }}>
            <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #EAECEF', overflow:'hidden' }}>
              {[
                { label:'출금 금액',       value:`${amtFmt}원`,                      bold:true },
                { label:'입금 계좌',       value:`${ACCOUNT.bank} ${ACCOUNT.num}`,    sub:ACCOUNT.name },
                { label:'출금 지갑',       value:'MY 지갑' },
                { label:'수수료',          value:'무료',                              green:true },
                { label:'예상 입금 시간',  value:'즉시 (실시간)' },
                { label:'출금 후 MY 잔액', value:`${fmt(remaining)}원`,               accent:true },
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
                비밀번호 입력 후 즉시 처리됩니다. 본인 인증 계좌로만 출금 가능합니다.
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
            비밀번호 입력 후 출금
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

        <div style={{ background:'#fff', borderBottom:'1px solid #F0F1F3', padding:'12px 16px 14px' }}>
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'#F5F6F8', borderRadius:'12px', padding:'12px 16px',
          }}>
            <span style={{ fontSize:'12px', color:'#6B7280' }}>MY 지갑 → {ACCOUNT.bank}</span>
            <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>{amtFmt}원</span>
          </div>
        </div>

        <div style={{
          flex:1, display:'flex', flexDirection:'column',
          alignItems:'center', background:'#F5F6F8',
          paddingTop:'36px',
        }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'24px' }}>
            6자리 비밀번호를 입력하세요
          </div>
          <div style={{ display:'flex', gap:'14px', marginBottom:'28px' }}>
            {Array.from({ length:6 }).map((_, i) => (
              <div key={i} style={{
                width:'13px', height:'13px', borderRadius:'50%',
                background: i < pin.length ? '#111827' : 'transparent',
                border: i < pin.length ? '2px solid #111827' : '2px solid #D1D5DB',
                transition:'all .15s',
              }} />
            ))}
          </div>
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

        <div style={{
          background:'#fff', borderTop:'1px solid #F0F1F3',
          padding:'14px 24px 28px',
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {KEYS.map((k, i) => (
              <button key={i} onClick={() => pinInput(k)} style={{
                height:'56px', borderRadius:'14px',
                background: k === null ? 'transparent' : '#F5F6F8',
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
        <BrandHeader title="출금 완료" onBack={() => navigate(-1)} bg={theme.headerSolid} />

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
            <div style={{ fontSize:'13px', color:'#9CA3AF', marginBottom:'6px' }}>출금 완료</div>
            <div style={{ fontSize:'34px', fontWeight:800, color:'#111827', letterSpacing:'-1.5px', marginBottom:'4px' }}>
              {amtFmt}원
            </div>
            <div style={{ fontSize:'12px', color:'#9CA3AF' }}>
              {ACCOUNT.bank} 계좌로 입금되었습니다
            </div>
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
                { label:'출금 금액',  value:`-${amtFmt}원`, danger:true },
                { label:'입금 계좌',  value:`${ACCOUNT.bank} ****${ACCOUNT.num.slice(-3)}` },
                { label:'출금 후 잔액', value:`${fmt(remaining)}원`, bold:true },
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
                    color: row.danger ? '#DC2626' : '#111827',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MY 지갑 잔액 카드 */}
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
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'3px' }}>MY 지갑 잔액</div>
                <div style={{ fontSize:'18px', fontWeight:800, color:'#111827', letterSpacing:'-0.5px' }}>
                  {fmt(remaining)}원
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
            다시 출금하기
          </button>
        </div>
      </div>
    </PhoneShell>
  )
}
