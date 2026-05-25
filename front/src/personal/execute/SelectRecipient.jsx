import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listRecentRecipients, lookupUser } from '../../services/recipient'
import { session } from '../../services/api'
import DarkHeader from '../../components/DarkHeader'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS, GRADIENTS, FUND_COLORS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { useT } from '../../design/i18n'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { useStepHistory } from '../../hooks/useStepHistory'

const RECENT_RECIPIENTS = [
  {
    id:1, name:'박철수', phone:'010-1***-**78', initial:'박',
    avatarBg:'#EF4444', avatarFg:'#FFFFFF',
    verified:true, freelancer:true, field:'디자인', kyc:'KYC 3단계',
    lastUsedFor:'freelance', lastUsedAt:'3일 전',
  },
  {
    id:2, name:'박민준', phone:'010-2***-**45', initial:'박',
    avatarBg:'#7C3AED', avatarFg:'#FFFFFF',
    verified:true, kyc:'KYC 2단계',
    lastUsedFor:'lend', lastUsedAt:'1주 전',
  },
  {
    id:3, name:'이유진', phone:'010-2345-6789', initial:'이', emoji:'👧',
    avatarBg:'#FCD34D', avatarFg:'#92400E',
    verified:true, kyc:'KYC 2단계',
    lastUsedFor:'gift', lastUsedAt:'2주 전',
  },
  {
    id:4, name:'김임대', phone:'010-3***-**21', initial:'김',
    avatarBg:'#10B981', avatarFg:'#FFFFFF',
    verified:true, kyc:'KYC 2단계',
    lastUsedFor:'realestate', lastUsedAt:'3주 전',
  },
  {
    id:5, name:'엄마', phone:'010-9***-**12', initial:'엄', emoji:'👩',
    avatarBg:'#EC4899', avatarFg:'#FFFFFF',
    verified:true, kyc:'KYC 2단계',
    lastUsedFor:'gift', lastUsedAt:'1개월 전',
  },
]

const PURPOSE_META = {
  gift:       { title:'용돈선물', route:'/execute/personal/gift',       fund:'gift' },
  living:     { title:'생활비',   route:'/execute/personal/living',     fund:'living' },
  lend:       { title:'빌려주기', route:'/execute/personal/lend',       fund:'lend' },
  freelance:  { title:'외주비',   route:'/execute/personal/freelance',  fund:'freelance' },
  realestate: { title:'부동산',   route:'/execute/personal/realestate', fund:'realestate' },
  invest:     { title:'자금 지원', route:'/execute/personal/invest',    fund:'invest' },
}

const PURPOSE_LABEL_MAP = {
  freelance:  '외주비',
  lend:       '빌려준 돈',
  gift:       '선물·용돈',
  living:     '생활비',
  realestate: '임대료·보증금',
  invest:     '자금 지원',
}

// overlay 공통 스타일 — list 위에 덮어씌우되 PhoneShell(overflow:clip) 안에서 클리핑됨
const OVERLAY_STYLE = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  background: COLORS.bg,
  zIndex: 5,
}

export default function SelectRecipient() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()   // list div에 항상 연결 → 스크롤 위치 유지
  const [searchParams] = useSearchParams()
  const purpose = searchParams.get('purpose') || 'gift'
  const meta = PURPOSE_META[purpose] || PURPOSE_META.gift
  const fundColor = FUND_COLORS[meta.fund]

  const [mode, setMode] = useState('list') // 'list' | 'phone' | 'judaid'
  const [query, setQuery] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [idInput, setIdInput] = useState('')
  const [idSearchResult, setIdSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)

  // ── 서버 최근 거래 (있으면 데모 위에 우선 표시) ──
  const [serverRecents, setServerRecents] = useState([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const items = await listRecentRecipients({ purpose })
        if (!cancelled) setServerRecents(Array.isArray(items) ? items : [])
      } catch (e) {
        console.warn('[SelectRecipient] listRecentRecipients failed', e?.message)
      }
    })()
    return () => { cancelled = true }
  }, [purpose])

  const handleBack = () => {
    if (mode !== 'list') {
      setMode('list')
      return
    }
    navigate('/execute/personal')
  }

  // phone / judaid 모드일 때 스와이프 백 → list 모드로 복귀
  useStepHistory(handleBack, mode === 'list')

  const handleSelect = (recipient) => {
    navigate(meta.route, { state: { recipient } })
  }

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0,3)}-${digits.slice(3)}`
    return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`
  }

  const phoneDigits = phoneInput.replace(/\D/g, '')
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11

  // ── 주다페이 ID 검색 — 서버 lookup ──
  const handleIdSearch = async () => {
    if (!idInput.trim() || searching) return
    setSearching(true)
    try {
      const res = await lookupUser({ handle: idInput.trim() })
      if (res?.found && res.user) {
        const u = res.user
        const handle = idInput.startsWith('@') ? idInput : `@${idInput}`
        setIdSearchResult({
          status: 'found',
          recipient: {
            id:       `id-${u.userId}`,
            userId:   u.userId,
            name:     u.name || idInput,
            handle,
            phone:    u.phone || handle,
            initial:  u.initial || (u.name?.charAt(0) ?? '@'),
            avatarBg: theme.brand,
            avatarFg: '#FFFFFF',
            verified: true,
            isBusiness: !!u.isBusiness,
            kyc:      'KYC 2단계',
          },
        })
      } else {
        setIdSearchResult({ status: 'notfound' })
      }
    } catch (e) {
      console.warn('[SelectRecipient] lookup by id failed', e?.message)
      setIdSearchResult({ status: 'notfound' })
    } finally {
      setSearching(false)
    }
  }

  // ── 휴대폰 번호로 — 가입자 자동 확인 후 진행 ──
  const handlePhoneNext = async () => {
    if (!phoneValid || searching) return
    setSearching(true)
    try {
      const res = await lookupUser({ phone: phoneInput })
      const u = res?.found ? res.user : null
      handleSelect({
        id:       u ? `id-${u.userId}` : `phone-${phoneInput}`,
        userId:   u?.userId || null,
        name:     u?.name || phoneInput,
        phone:    phoneInput,
        initial:  u?.initial || (u?.name?.charAt(0) ?? '?'),
        avatarBg: u ? theme.brand : COLORS.t4,
        avatarFg: '#FFFFFF',
        verified: !!u,
        isBusiness: !!u?.isBusiness,
        kyc:      u ? 'KYC 2단계' : '미가입 (확인 중)',
        isNew:    !u,
        via:      'phone',
      })
    } catch (e) {
      console.warn('[SelectRecipient] lookup by phone failed', e?.message)
      // 실패해도 비가입자 모드로 그대로 진행
      handleSelect({
        id:`phone-${phoneInput}`, name: phoneInput, phone: phoneInput,
        initial:'?', avatarBg: COLORS.t4, avatarFg:'#FFFFFF',
        verified:false, kyc:'미가입 (확인 중)', isNew:true, via:'phone',
      })
    } finally {
      setSearching(false)
    }
  }

  // ── 서버 카드 → 화면 카드 형태로 정규화 ──
  function normalizeServerRecipient(s) {
    return {
      id:           s.id || s.userId || `phone-${s.phone}`,
      userId:       s.userId || null,
      name:         s.name || '알 수 없음',
      phone:        s.phone || '',
      initial:      s.initial || (s.name?.charAt(0) ?? '?'),
      emoji:        null,
      avatarBg:     s.avatarBg || '#7C3AED',
      avatarFg:     s.avatarFg || '#FFFFFF',
      verified:     !!s.verified,
      isBusiness:   !!s.isBusiness,
      lastUsedFor:  s.lastUsedFor || 'gift',
      lastUsedAt:   formatRecentTime(s.lastUsedAt),
      kyc:          s.verified ? 'KYC 2단계' : '미가입',
      _fromServer:  true,
    }
  }

  function formatRecentTime(iso) {
    if (!iso) return ''
    const now = new Date()
    const then = new Date(iso)
    const diffDay = Math.floor((now - then) / 86400000)
    if (diffDay < 1) return '오늘'
    if (diffDay < 2) return '어제'
    if (diffDay < 7) return `${diffDay}일 전`
    if (diffDay < 30) return `${Math.floor(diffDay/7)}주 전`
    return `${Math.floor(diffDay/30)}개월 전`
  }

  // 서버 최근거래 + 데모 (로그인 시 데모는 숨김, 비로그인 시만 폴백)
  //   - 다른 화면(Alerts/Messages)과 동일 패턴: 로그인 = 실데이터만, 비로그인 = 데모 폴백
  const isAuthed = !!session.user
  const seen = new Set()
  const mergedRecents = [
    ...serverRecents.map(normalizeServerRecipient),
    ...(isAuthed ? [] : RECENT_RECIPIENTS),
  ].filter(r => {
    const key = r.userId || r.phone?.replace(/[^0-9*]/g, '')
    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const filtered = mergedRecents.filter(r => {
    if (!query.trim()) return true
    const q = query.replace(/[-\s]/g, '').toLowerCase()
    return r.name.toLowerCase().includes(q) || r.phone.replace(/[-*\s]/g, '').includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (a.lastUsedFor === purpose && b.lastUsedFor !== purpose) return -1
    if (a.lastUsedFor !== purpose && b.lastUsedFor === purpose) return 1
    return 0
  })

  return (
    <PhoneShell>

      {/* ── 목록 — 항상 마운트, 스크롤 위치 자동 유지 ── */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader
          smallTitle="받는 사람 선택"
          badge={meta.title}
          bigTitle="누구에게 보낼까요?"
          sub="자금을 받을 사람을 선택해주세요"
          onBack={handleBack}
                  exitTo="/home"
          headerGrad={theme.headerGrad}
/>

        {/* 검색창 */}
        <div style={{ padding:'18px 16px 12px' }}>
          <div style={{ position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="이름 또는 휴대폰 번호"
              style={{
                width:'100%', height:'48px',
                background: COLORS.bgCard,
                border:'none',
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                padding:'0 16px 0 40px',
                fontSize:'13px', color: COLORS.t1,
                outline:'none', fontFamily:'inherit',
                boxSizing:'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ padding:'0 16px 24px' }}>

          {sorted.length > 0 && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding:'0 4px' }}>
                <span style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3 }}>
                  {query.trim() ? '검색 결과' : '최근 거래'}
                </span>
                {!query.trim() && (
                  <span style={{ fontSize:'10px', color: COLORS.t4 }}>
                    ✓ {meta.title} 거래 우선 정렬
                  </span>
                )}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'18px' }}>
                {sorted.map(r => {
                  const isSamePurpose = r.lastUsedFor === purpose
                  return (
                    <button key={r.id}
                      onClick={() => handleSelect(r)}
                      style={{
                        width:'100%', padding:'12px 14px',
                        background: COLORS.bgCard,
                        boxShadow: SHADOWS.card,
                        borderRadius: RADIUS.lg,
                        border: 'none',
                        display:'flex', alignItems:'center', gap:'12px',
                        cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                      }}>
                      <div style={{
                        width:'42px', height:'42px',
                        borderRadius:'50%',
                        background: r.avatarBg, color: r.avatarFg,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize: r.emoji ? '22px' : '15px',
                        fontWeight:700,
                        flexShrink:0,
                      }}>
                        {r.emoji || r.initial}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
                            {r.name}
                          </span>
                          {r.verified && (
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" fill="#10B981"/>
                              <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {r.freelancer && (
                            <span style={{
                              padding:'1px 5px',
                              background: FUND_COLORS.freelance.bg,
                              color: FUND_COLORS.freelance.main,
                              borderRadius:'3px',
                              fontSize:'9px', fontWeight:700,
                            }}>
                              프리랜서
                            </span>
                          )}
                          {isSamePurpose && (
                            <span style={{
                              padding:'1px 5px',
                              background: fundColor.bg,
                              color: fundColor.main,
                              borderRadius:'3px',
                              fontSize:'9px', fontWeight:700,
                            }}>
                              {meta.title} 거래
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                          {PURPOSE_LABEL_MAP[r.lastUsedFor] || ''} · {r.phone} · {r.lastUsedAt}
                        </div>
                      </div>
                      <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {query.trim() && sorted.length === 0 && (
            <div style={{ padding:'32px 16px', textAlign:'center', marginBottom:'18px' }}>
              <div style={{ fontSize:'13px', color: COLORS.t3, marginBottom:'4px' }}>검색 결과가 없어요</div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>아래에서 새로 보내기로 진행하세요</div>
            </div>
          )}

          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'10px', padding:'0 4px' }}>
            새로 보내기
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'18px' }}>
            <button
              onClick={() => setMode('phone')}
              style={{
                width:'100%', padding:'14px',
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                border:'none',
                display:'flex', alignItems:'center', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
              <div style={{
                width:'40px', height:'40px',
                background: COLORS.bgMuted,
                borderRadius:'11px',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.t2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                  휴대폰 번호로 보내기
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                  미가입자도 가능 · SMS 받음
                </div>
              </div>
              <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
            </button>

            <button
              onClick={() => setMode('judaid')}
              style={{
                width:'100%', padding:'14px',
                background: COLORS.bgCard,
                boxShadow: SHADOWS.card,
                borderRadius: RADIUS.lg,
                border:'none',
                display:'flex', alignItems:'center', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
              <div style={{
                width:'40px', height:'40px',
                background: COLORS.bgMuted,
                borderRadius:'11px',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'18px', fontWeight:700,
                color: COLORS.t2,
                flexShrink:0,
              }}>
                @
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                  주다페이 ID로 검색
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                  가입자 직접 검색
                </div>
              </div>
              <span style={{ color: COLORS.t5, fontSize:'18px', flexShrink:0 }}>›</span>
            </button>
          </div>

          <div style={{
            padding:'12px 14px',
            background:'#EDF3FA',
            borderRadius: RADIUS.md,
            fontSize:'11px', color:'#1E5294', lineHeight:1.65,
          }}>
            주다페이 가입 회원을 ID로 직접 검색할 수 있어요. 미가입자는 휴대폰 번호로 보내세요.
          </div>
        </div>
      </div>

      {/* ── 휴대폰 번호 overlay — list 위에 슬라이드 인, list는 unmount 없이 살아있음 ── */}
      {mode === 'phone' && (
        <div className="page-enter-right" style={OVERLAY_STYLE}>
          <div style={{ flex:1, overflowY:'auto' }}>
            <DarkHeader
              smallTitle="휴대폰 번호로"
              bigTitle="번호를 입력해주세요"
              sub="가입자면 자동으로 받은 지갑으로 전달돼요"
              onBack={handleBack}
              exitTo="/home"
              headerGrad={theme.headerGrad}
            />

            <div style={{ padding:'20px 16px 24px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t3, marginBottom:'8px' }}>
                휴대폰 번호
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={phoneInput}
                onChange={e => setPhoneInput(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                autoFocus
                style={{
                  width:'100%', height:'56px',
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  padding:'0 18px',
                  fontSize:'18px', fontWeight:600, color: COLORS.t1,
                  outline:'none', fontFamily:'inherit',
                  marginBottom:'12px',
                  boxSizing:'border-box', letterSpacing:'0.5px',
                }}
              />

              {phoneInput && !phoneValid && (
                <div style={{ fontSize:'11px', color: COLORS.danger, marginBottom:'12px', paddingLeft:'4px' }}>
                  10~11자리 숫자를 입력해주세요
                </div>
              )}

              <div style={{
                background:'#EDF3FA', borderRadius: RADIUS.md,
                padding:'12px 14px', fontSize:'11px', color:'#1E5294', lineHeight:1.65,
                marginBottom:'12px',
              }}>
                <strong>가입 여부 자동 확인</strong><br />
                가입자면 받은 지갑에 입금. 미가입자면 SMS로 가입 안내가 발송되며, 7일 내 미가입 시 자동 환불됩니다.
              </div>

              <div style={{
                background:'#FFFBEB', borderRadius: RADIUS.md,
                padding:'12px 14px', fontSize:'11px', color:'#854F0B', lineHeight:1.65,
              }}>
                ⚠ 보내기 전 번호를 다시 확인하세요. 잘못 입력하면 자금이 다른 사람에게 갈 수 있어요.
              </div>
            </div>
          </div>

          <div style={{
            padding:'12px 16px 24px',
            borderTop: `1px solid ${COLORS.borderSoft}`,
            background: COLORS.bgCard,
          }}>
            <button
              onClick={handlePhoneNext}
              disabled={!phoneValid || searching}
              style={{
                width:'100%', height:'52px',
                background: (phoneValid && !searching) ? theme.brand : COLORS.bgMuted,
                color: (phoneValid && !searching) ? '#fff' : COLORS.t4,
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor: (phoneValid && !searching) ? 'pointer' : 'default',
                fontFamily:'inherit',
                boxShadow: (phoneValid && !searching) ? SHADOWS.buttonBrand : 'none',
              }}>
              {searching ? '가입 여부 확인 중…'
                : phoneValid ? '다음 (자금 집행)'
                : '휴대폰 번호를 입력하세요'}
            </button>
          </div>
        </div>
      )}

      {/* ── 주다페이 ID overlay — list 위에 슬라이드 인 ── */}
      {mode === 'judaid' && (
        <div className="page-enter-right" style={OVERLAY_STYLE}>
          <div style={{ flex:1, overflowY:'auto' }}>
            <DarkHeader
              smallTitle="주다페이 ID로"
              bigTitle="ID를 검색해보세요"
              sub="가입자만 검색 가능 · @ 없이 입력 가능"
              onBack={handleBack}
              exitTo="/home"
              headerGrad={theme.headerGrad}
            />

            <div style={{ padding:'20px 16px 24px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t3, marginBottom:'8px' }}>
                주다페이 ID
              </div>
              <div style={{ position:'relative', marginBottom:'12px' }}>
                <span style={{
                  position:'absolute', left:'18px', top:'50%', transform:'translateY(-50%)',
                  fontSize:'18px', fontWeight:600, color: COLORS.t4,
                  pointerEvents:'none',
                }}>@</span>
                <input
                  type="text"
                  value={idInput}
                  onChange={e => { setIdInput(e.target.value.replace('@', '')); setIdSearchResult(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleIdSearch()}
                  placeholder="hyungho_lee"
                  autoFocus
                  style={{
                    width:'100%', height:'56px',
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.lg,
                    padding:'0 18px 0 36px',
                    fontSize:'16px', fontWeight:500, color: COLORS.t1,
                    outline:'none', fontFamily:'inherit',
                    boxSizing:'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleIdSearch}
                disabled={!idInput.trim() || searching}
                style={{
                  width:'100%', height:'46px',
                  background: (idInput.trim() && !searching) ? theme.brand : COLORS.bgMuted,
                  color: (idInput.trim() && !searching) ? '#fff' : COLORS.t4,
                  border:'none', borderRadius: RADIUS.md,
                  fontSize:'13px', fontWeight:700,
                  cursor: (idInput.trim() && !searching) ? 'pointer' : 'default',
                  fontFamily:'inherit', marginBottom:'18px',
                  boxShadow: (idInput.trim() && !searching) ? SHADOWS.buttonBrand : 'none',
                }}>
                {searching ? '검색 중…' : '검색하기'}
              </button>

              {/* 검색 결과 — found */}
              {idSearchResult?.status === 'found' && (
                <button
                  onClick={() => handleSelect(idSearchResult.recipient)}
                  style={{
                    width:'100%', padding:'14px',
                    background: COLORS.bgCard,
                    border:`2px solid ${COLORS.success}`,
                    borderRadius: RADIUS.lg,
                    display:'flex', alignItems:'center', gap:'12px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    marginBottom:'14px',
                  }}>
                  <div style={{
                    width:'42px', height:'42px',
                    borderRadius:'50%',
                    background: theme.activeBtnGrad,
                    color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'17px', fontWeight:700,
                    flexShrink:0,
                  }}>
                    @
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px' }}>
                      <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
                        {idSearchResult.recipient.name}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" fill="#10B981"/>
                        <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                      {idSearchResult.recipient.handle} · {idSearchResult.recipient.kyc}
                    </div>
                  </div>
                  <span style={{ color: COLORS.success, fontSize:'18px', flexShrink:0, fontWeight:700 }}>›</span>
                </button>
              )}

              {/* 검색 결과 — notfound */}
              {idSearchResult?.status === 'notfound' && (
                <div style={{
                  background: COLORS.dangerBg,
                  border:`1px solid ${COLORS.danger}`,
                  borderRadius: RADIUS.md,
                  padding:'14px',
                  marginBottom:'14px',
                }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#B91C1C', marginBottom:'4px' }}>
                    가입자를 찾을 수 없어요
                  </div>
                  <div style={{ fontSize:'11px', color:'#B91C1C', lineHeight:1.55 }}>
                    ID를 다시 확인하거나, 휴대폰 번호로 보내기를 시도해보세요.
                  </div>
                  <button
                    onClick={() => { setMode('phone'); setIdSearchResult(null) }}
                    style={{
                      marginTop:'10px',
                      padding:'8px 12px',
                      background: COLORS.bgCard,
                      border:`1px solid ${COLORS.danger}`,
                      borderRadius:'8px',
                      fontSize:'11px', fontWeight:600,
                      color:'#B91C1C', cursor:'pointer', fontFamily:'inherit',
                    }}>
                    휴대폰 번호로 보내기 ›
                  </button>
                </div>
              )}

              {!idSearchResult && (
                <div style={{
                  background:'#EDF3FA',
                  borderRadius: RADIUS.md,
                  padding:'12px 14px',
                  fontSize:'11px', color:'#1E5294', lineHeight:1.65,
                }}>
                  <strong>주다페이 ID 검색</strong><br />
                  ID는 가입 시 사용자가 직접 설정한 고유 식별자예요. 친구의 프로필에서 확인할 수 있어요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </PhoneShell>
  )
}
