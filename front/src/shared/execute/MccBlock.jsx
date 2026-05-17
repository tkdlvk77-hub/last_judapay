import { useState, useRef } from 'react'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'

function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR')
}

// ─────────────────────────────────────────────────────────
// MCC 차단 카테고리 — 자금 집행 흐름 공통 컴포넌트
//
// 사용법:
//   const [mccItems, setMccItems] = useState(DEFAULT_MCC)
//   <MccBlock
//     items={mccItems}
//     onChange={setMccItems}
//     recipientName="박철수"  // optional, 안내 메시지에 사용
//   />
//
// 각 화면(ExecuteLend / ExecuteInvest / ExecuteInvestBusiness 등)에서
// 헤더(스텝)와 다음 버튼은 호출 측이 처리.
// 이 컴포넌트는 "차단 카테고리 리스트 + 추가/제거" 만 담당.
// ─────────────────────────────────────────────────────────

// 기본 차단 카테고리 (모든 화면 공유) — 디폴트 상태로 활용
export const DEFAULT_MCC = [
  { id:'gambling',  label:'유흥·도박',   block:true,  sub:'유흥주점·카지노·복권' },
  { id:'crypto',    label:'암호화폐',    block:true,  sub:'코인 거래소·ICO 결제' },
  { id:'overseas',  label:'해외 결제',   block:false, sub:'해외 가맹점·해외 송금' },
  { id:'luxury',    label:'명품',        block:false, sub:'백화점 명품관·고가 사치품' },
  { id:'gaming',    label:'게임 아이템', block:false, sub:'게임센터·인앱결제' },
]

// 추가 가능한 카테고리 풀
export const EXTRA_MCC_POOL = [
  { id:'tobacco',   label:'담배·주류',     sub:'담배·주류 판매점' },
  { id:'pawn',      label:'전당포·대부업', sub:'전당포·대부업소' },
  { id:'lottery',   label:'복권·경마',     sub:'복권판매소·경마장' },
  { id:'beauty',    label:'미용·성형',     sub:'성형외과·피부과' },
  { id:'travel',    label:'항공·여행',     sub:'항공권·여행사' },
  { id:'dining',    label:'고급 음식점',   sub:'1인 5만원 이상' },
]

// ─── 메인 컴포넌트 ─────────────────────────────────────
export default function MccBlock({
  items,
  onChange,
  recipientName,
  showInfoBox = true,
  singleLimit,        // null | number — 1회 결제 한도 (null = 제한 없음)
  onLimitChange,      // (null | number) => void
}) {
  const [showAddMcc, setShowAddMcc] = useState(false)
  const [limitInput, setLimitInput] = useState(singleLimit ? String(singleLimit) : '')
  const limitInputRef = useRef(null)

  const limitActive = singleLimit !== null && singleLimit !== undefined
  const LIMIT_PRESETS = [30000, 50000, 100000, 300000]

  const handleLimitToggle = () => {
    if (!onLimitChange) return
    if (limitActive) {
      onLimitChange(null)
      setLimitInput('')
    } else {
      onLimitChange(100000)
      setLimitInput('100000')
      setTimeout(() => limitInputRef.current?.focus(), 50)
    }
  }

  const handleLimitInput = (val) => {
    const digits = val.replace(/\D/g, '')
    setLimitInput(digits)
    if (onLimitChange) onLimitChange(digits ? Number(digits) : null)
  }
  // 해외 결제 — 카테고리 목록에서 분리, 별도 토글로 표시
  const overseasItem = items.find(m => m.id === 'overseas')
  const mainItems = items.filter(m => m.id !== 'overseas')
  const blockedCount = items.filter(m => m.block).length
  const availablePool = EXTRA_MCC_POOL.filter(p => !items.find(m => m.id === p.id))

  const toggleMcc = (id) => {
    onChange(items.map(m =>
      m.id === id ? { ...m, block: !m.block } : m
    ))
  }

  const addMcc = (p) => {
    onChange([...items, { ...p, block: true }])
    setShowAddMcc(false)
  }

  const removeMcc = (id) => {
    onChange(items.filter(m => m.id !== id))
  }

  return (
    <>
      {/* 헤더 */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:'10px', padding:'0 4px',
      }}>
        <span style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3 }}>
          차단할 카테고리
        </span>
        <span style={{ fontSize:'11px', color: COLORS.t4 }}>
          {blockedCount}개 차단 중
        </span>
      </div>

      {/* 카테고리 목록 */}
      <div style={{
        background: COLORS.bgCard,
        boxShadow: SHADOWS.card,
        borderRadius: RADIUS.lg,
        overflow:'hidden',
        marginBottom:'10px',
      }}>
        {mainItems.map((opt, i) => {
          const isCustom = !DEFAULT_MCC.find(d => d.id === opt.id)
          return (
            <div key={opt.id}
              style={{
                width:'100%', padding:'14px 16px',
                display:'flex', alignItems:'center', gap:'12px',
                background: opt.block ? '#FEF2F2' : COLORS.bgCard,
                borderBottom: i < mainItems.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
              }}>
              <button onClick={() => toggleMcc(opt.id)}
                style={{
                  width:'22px', height:'22px',
                  borderRadius:'6px',
                  background: opt.block ? COLORS.danger : COLORS.bgCard,
                  border: opt.block ? 'none' : `1.5px solid ${COLORS.t5}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, cursor:'pointer', padding:0,
                }}>
                {opt.block && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <button onClick={() => toggleMcc(opt.id)}
                style={{
                  flex:1, background:'none', border:'none',
                  textAlign:'left', cursor:'pointer', padding:0, fontFamily:'inherit',
                }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color: opt.block ? '#B91C1C' : COLORS.t1 }}>
                    {opt.label}
                  </span>
                  {isCustom && (
                    <span style={{
                      padding:'1px 5px', background: COLORS.bgMuted, color: COLORS.t4,
                      borderRadius:'3px', fontSize:'9px', fontWeight:700,
                    }}>
                      추가됨
                    </span>
                  )}
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>{opt.sub}</div>
              </button>
              {isCustom && (
                <button onClick={() => removeMcc(opt.id)}
                  style={{
                    width:'22px', height:'22px',
                    background:'none', border:'none', cursor:'pointer', padding:0,
                    color: COLORS.t4, fontSize:'18px', flexShrink:0, lineHeight:1,
                  }}>×</button>
              )}
            </div>
          )
        })}
      </div>

      {/* 업종 추가 버튼 */}
      <button
        onClick={() => setShowAddMcc(true)}
        disabled={availablePool.length === 0}
        style={{
          width:'100%', padding:'12px',
          background: COLORS.bgCard,
          border: `1px dashed ${COLORS.t5}`,
          borderRadius: RADIUS.md,
          display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
          cursor: availablePool.length === 0 ? 'default' : 'pointer',
          fontFamily:'inherit', marginBottom:'18px',
          opacity: availablePool.length === 0 ? 0.5 : 1,
        }}>
        <span style={{ fontSize:'15px', color: COLORS.t3, lineHeight:1 }}>+</span>
        <span style={{ fontSize:'12px', color: COLORS.t3, fontWeight:600 }}>
          {availablePool.length === 0 ? '추가할 업종이 없어요' : '업종 추가'}
        </span>
      </button>

      {/* 해외 결제 제한 + 1회 결제 한도 */}
      <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, overflow:'hidden', marginBottom:'10px' }}>
        {/* 해외 결제 제한 토글 */}
        {overseasItem && (
          <button onClick={() => onChange(items.map(m => m.id==='overseas' ? {...m,block:!m.block} : m))}
            style={{ width:'100%', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px',
              background:'none', border:'none', borderBottom:`1px solid ${COLORS.borderSoft}`,
              cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>해외 결제 제한</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>해외 가맹점·해외 송금 차단</div>
            </div>
            <div style={{ width:'44px', height:'26px', borderRadius:'13px',
              background: overseasItem.block ? '#EF4444' : COLORS.t5,
              position:'relative', flexShrink:0, transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:'3px',
                left: overseasItem.block ? '21px' : '3px',
                width:'20px', height:'20px', borderRadius:'50%',
                background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left 0.2s' }} />
            </div>
          </button>
        )}

        {/* 1회 결제 한도 */}
        {onLimitChange && (
          <>
            <button onClick={handleLimitToggle}
              style={{ width:'100%', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px',
                background:'none', border:'none',
                borderBottom: limitActive ? `1px solid ${COLORS.borderSoft}` : 'none',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>1회 결제 한도</div>
                <div style={{ fontSize:'11px', color:COLORS.t4 }}>
                  {limitActive ? `결제 1건당 최대 ${fmt(singleLimit)}원` : '결제 1건당 최대 금액 제한 없음'}
                </div>
              </div>
              <div style={{ width:'44px', height:'26px', borderRadius:'13px',
                background: limitActive ? '#10B981' : COLORS.t5,
                position:'relative', flexShrink:0, transition:'background 0.2s' }}>
                <div style={{ position:'absolute', top:'3px',
                  left: limitActive ? '21px' : '3px',
                  width:'20px', height:'20px', borderRadius:'50%',
                  background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left 0.2s' }} />
              </div>
            </button>
            {limitActive && (
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
                  {LIMIT_PRESETS.map(v => {
                    const isActive = singleLimit === v
                    return (
                      <button key={v} onClick={() => { onLimitChange(v); setLimitInput(String(v)) }}
                        style={{ flex:1, height:'34px',
                          background: isActive ? '#10B981' : COLORS.bgMuted,
                          color: isActive ? '#fff' : COLORS.t2,
                          border:'none', borderRadius:'8px',
                          fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        {v >= 10000 ? `${v/10000}만` : fmt(v)}
                      </button>
                    )
                  })}
                </div>
                <div style={{ position:'relative' }}>
                  <input ref={limitInputRef} type='number' inputMode='numeric'
                    value={limitInput} onChange={e => handleLimitInput(e.target.value)}
                    placeholder='직접 입력'
                    style={{ width:'100%', height:'44px', background:COLORS.bg,
                      border:`1px solid ${COLORS.border}`, borderRadius:'10px',
                      padding:'0 40px 0 14px', fontSize:'14px', fontWeight:600, color:COLORS.t1,
                      outline:'none', fontFamily:'inherit', boxSizing:'border-box',
                      WebkitAppearance:'none', MozAppearance:'textfield' }} />
                  <span style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                    fontSize:'13px', fontWeight:600, color:COLORS.t4, pointerEvents:'none' }}>원</span>
                </div>
                {singleLimit && singleLimit < 1000 && (
                  <div style={{ fontSize:'11px', color:COLORS.danger, marginTop:'6px' }}>최소 1,000원 이상으로 설정해주세요</div>
                )}
              </div>
            )}
          </>
        )}
      </div>


      {/* 업종 추가 모달 */}
      {showAddMcc && (
        <div onClick={() => setShowAddMcc(false)}
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,.5)',
            display:'flex', alignItems:'flex-end', justifyContent:'center',
            zIndex:50,
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:'390px',
              background: COLORS.bgCard,
              borderRadius:'24px 24px 0 0',
              padding:'8px 20px 24px',
              maxHeight:'70vh', overflowY:'auto',
            }}>
            <div style={{
              width:'40px', height:'4px',
              background: COLORS.border, borderRadius:'2px',
              margin:'8px auto 18px',
            }} />
            <div style={{ fontSize:'18px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
              업종 추가
            </div>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'18px' }}>
              차단할 업종을 선택하세요
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {availablePool.map(p => (
                <button key={p.id} onClick={() => addMcc(p)}
                  style={{
                    width:'100%', padding:'14px',
                    background: COLORS.bgMuted, border:'none', borderRadius: RADIUS.md,
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>{p.sub}</div>
                  </div>
                  <span style={{ fontSize:'20px', color: COLORS.brand, fontWeight:700 }}>+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
