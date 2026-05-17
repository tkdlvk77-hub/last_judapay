import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import BottomTab from '../components/BottomTab'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─── 데모 데이터 ──────────────────────────────────────────
const ALL_OTHER_PAYMENTS = [
  { id:'o1', name:'박민준',  category:'카페',     amount:4500,   meta:'방금 · 외주비 지갑',     fund:'외주비',   status:'normal'  },
  { id:'o2', name:'㈜오로라', category:'사무용품', amount:89000,  meta:'오늘 11:05 · 투자 자금', fund:'투자',     status:'normal'  },
  { id:'o3', name:'이민형',  category:'편의점',   amount:3200,   meta:'오늘 09:30 · 대여금',    fund:'대여금',   status:'normal'  },
  { id:'o4', name:'㈜오로라', category:'카지노',   amount:89000,  meta:'어제 23:11 · 투자 자금', fund:'투자',     status:'blocked' },
  { id:'o5', name:'박민준',  category:'마트',     amount:52000,  meta:'어제 18:44 · 외주비 지갑', fund:'외주비', status:'normal'  },
  { id:'o6', name:'서울시청', category:'의료',     amount:18000,  meta:'4.29 · 자금 지원',       fund:'자금 지원', status:'normal' },
  { id:'o7', name:'이민형',  category:'주류',     amount:34000,  meta:'4.28 · 대여금',          fund:'대여금',   status:'blocked' },
  { id:'o8', name:'㈜오로라', category:'장비',     amount:450000, meta:'4.27 · 투자 자금',       fund:'투자',     status:'normal'  },
]

const FUND_FILTERS = ['전체', '외주비', '투자', '대여금', '자금 지원']

function fmt(n) { return Number(n || 0).toLocaleString('ko-KR') }

export default function OtherPayments() {
  const navigate = useNavigate()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const [activeFilter, setActiveFilter] = useState('전체')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'blocked'

  const filtered = ALL_OTHER_PAYMENTS
    .filter(p => activeFilter === '전체' || p.fund === activeFilter)
    .filter(p => activeTab === 'blocked' ? p.status === 'blocked' : true)

  const blockedCount = ALL_OTHER_PAYMENTS.filter(p => p.status === 'blocked').length

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 14px' }}>
            <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#fff' }}>상대방 결제 알림</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'1px' }}>가맹점명은 보호됩니다 (단계형 공개)</div>
            </div>
            {blockedCount > 0 && (
              <span style={{ padding:'4px 10px', background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'20px', fontSize:'11px', fontWeight:700, color:'#FCA5A5' }}>
                🚫 차단 {blockedCount}건
              </span>
            )}
          </div>

          {/* 탭 — 전체 / 차단만 */}
          <div style={{ display:'flex', gap:'6px', padding:'0 16px', marginBottom:'2px' }}>
            {[['all','전체'], ['blocked','차단만']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding:'6px 14px', background: activeTab===key ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', border:'none', borderRadius:RADIUS.pill, fontSize:'12px', fontWeight:700, color: activeTab===key ? '#fff' : 'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:'inherit' }}>
                {label}
                {key==='blocked' && blockedCount > 0 && (
                  <span style={{ marginLeft:'4px', background:'#EF4444', color:'#fff', borderRadius:'8px', padding:'0 5px', fontSize:'10px' }}>{blockedCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 자금 종류 필터 */}
        <div style={{ background: COLORS.bgCard, borderBottom:`1px solid ${COLORS.borderSoft}`, padding:'10px 16px', display:'flex', gap:'6px', overflowX:'auto', flexShrink:0 }}>
          {FUND_FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ flexShrink:0, padding:'5px 13px', background: activeFilter===f ? theme.brandDark : COLORS.bgMuted, color: activeFilter===f ? '#fff' : COLORS.t3, border:'none', borderRadius:RADIUS.pill, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
              {f}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'60px 16px', textAlign:'center', color: COLORS.t4, fontSize:'14px' }}>
              해당 내역이 없어요
            </div>
          ) : (
            <div style={{ padding:'12px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
              {filtered.map(p => {
                const blocked = p.status === 'blocked'
                return (
                  <div key={p.id} style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding:'14px', display:'flex', alignItems:'center', gap:'12px', border: blocked ? '1px solid #FECACA' : 'none' }}>
                    {/* 아바타 */}
                    <div style={{ width:'40px', height:'40px', borderRadius:'12px', background: blocked ? '#FEE2E2' : `${theme.brandDark}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:800, color: blocked ? '#DC2626' : theme.brandDark, flexShrink:0 }}>
                      {p.name[0]}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* 이름 + 카테고리 칩 */}
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'14px', fontWeight:700, color: blocked ? '#DC2626' : COLORS.t1 }}>{p.name}</span>
                        <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'5px', background: blocked ? '#FEE2E2' : COLORS.bgMuted, color: blocked ? '#DC2626' : COLORS.t3, fontWeight:600 }}>
                          {blocked ? '🚫 ' : ''}{p.category}
                        </span>
                      </div>
                      {/* 자금 출처 + 시간 */}
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'4px', background:`${theme.brandDark}12`, color: theme.brandDark, fontWeight:600 }}>{p.fund}</span>
                        <span style={{ fontSize:'11px', color: COLORS.t4 }}>{p.meta.split(' · ').slice(0,1)}</span>
                      </div>
                    </div>

                    {/* 금액 or 차단 */}
                    {blocked ? (
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ padding:'3px 10px', borderRadius:'8px', background:'#FEE2E2', color:'#DC2626', fontSize:'11px', fontWeight:700, marginBottom:'2px' }}>차단됨</div>
                        <div style={{ fontSize:'11px', color:'#DC2626' }}>{fmt(p.amount)}원 시도</div>
                      </div>
                    ) : (
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'15px', fontWeight:700, color: COLORS.t1 }}>{fmt(p.amount)}원</div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 안내 */}
              <div style={{ background: COLORS.bgMuted, borderRadius: RADIUS.md, padding:'12px 14px', marginTop:'4px' }}>
                <div style={{ fontSize:'11px', color: COLORS.t4, lineHeight:1.6, textAlign:'center' }}>
                  🔒 상대방의 정확한 가맹점명은 단계형 공개 정책에 따라 보호됩니다.<br/>
                                  카테고리(카페, 마트 등)만 표시됩니다.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomTab />
    </PhoneShell>
  )
}
