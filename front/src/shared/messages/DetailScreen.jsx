import { useState } from 'react'
import { COLORS, RADIUS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { DETAIL_DATA, STEP_STYLE, getThreadMemos, deleteThreadMemo } from './messagesData'

export default function DetailScreen({ thread, onBack }) {
  const theme = getAccountTheme()
  const [tab, setTab] = useState('거래')
  const [expandedTrade, setExpandedTrade] = useState(null)
  const [tick, setTick] = useState(0)  // 메모 갱신용
  const data = DETAIL_DATA[thread.id] || { trades:[], attachments:[], memos:[], userInfo:{} }
  const pct = Math.round((thread.totalExecuted / thread.totalAmount) * 100)

  // 동적 메모 (ChatRoom에서 저장된 것 + 정적 데이터)
  const dynamicMemos = getThreadMemos(thread.id)
  const allDetailMemos = [
    ...data.memos.map(m => ({ id:'static_'+m, text: m, time:null, txLabel:null })),
    ...dynamicMemos,
  ]

  const tabs = [
    { key:'거래',    icon:'📋', count: data.trades.length },
    { key:'첨부파일', icon:'📎', count: data.attachments.length },
    { key:'메모',    icon:'📄', count: allDetailMemos.length },
    { key:'상대정보', icon:'👤', count: 0 },
  ]

  // 금액 → 만원 단위 포맷
  const fmt만 = (n) => n >= 10000
    ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '만'
    : n.toLocaleString()

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#F4F5F7' }}>

      {/* ── 헤더 ── */}
      <div style={{ background: theme.headerGrad, paddingTop:'max(16px, env(safe-area-inset-top))', flexShrink:0 }}>

        {/* 네비 */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'4px 16px 16px',
        }}>
          <button onClick={onBack} style={{
            width:'32px', height:'32px',
            background:'rgba(255,255,255,0.12)', border:'none',
            borderRadius:'10px',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', padding:0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>상세 정보</span>
          <button style={{
            width:'32px', height:'32px',
            background:'rgba(255,255,255,0.12)', border:'none',
            borderRadius:'10px',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', padding:0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        {/* 아바타 + 인물 정보 */}
        <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'0 18px 16px' }}>
          {/* 큰 아바타 */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{
              width:'64px', height:'64px',
              borderRadius:'20px',
              background: thread.avatarBg, color: thread.avatarFg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: thread.emoji ? '32px' : '22px',
              fontWeight:700,
              boxShadow:'0 6px 20px rgba(0,0,0,0.25)',
            }}>
              {thread.emoji || thread.initial}
            </div>
            {/* KYC 뱃지 */}
            <div style={{
              position:'absolute', bottom:'-4px', right:'-4px',
              width:'20px', height:'20px', borderRadius:'50%',
              background:'#34D399',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'2px solid rgba(255,255,255,0.3)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>

          {/* 이름 + 역할 */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
              <span style={{ fontSize:'18px', fontWeight:800, color:'#fff' }}>{thread.name}</span>
              <span style={{
                padding:'2px 7px',
                background:'rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.9)',
                borderRadius:'6px', fontSize:'9px', fontWeight:700,
                border:'1px solid rgba(255,255,255,0.2)',
              }}>
                {thread.type}
              </span>
            </div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginBottom:'6px' }}>
              {thread.role}
            </div>
            {/* 상태 뱃지 */}
            <span style={{
              display:'inline-block',
              padding:'3px 9px',
              background: thread.status === 'normal' ? 'rgba(52,211,153,0.2)' : 'rgba(252,165,165,0.2)',
              color: thread.status === 'normal' ? '#6EE7B7' : '#FCA5A5',
              borderRadius:'6px', fontSize:'10px', fontWeight:700,
              border:`1px solid ${thread.status === 'normal' ? 'rgba(52,211,153,0.3)' : 'rgba(252,165,165,0.3)'}`,
            }}>
              {thread.status === 'normal' ? '● 정상' : `⚠ ${thread.statusLabel}`}
            </span>
          </div>
        </div>

        {/* 집행 현황 게이지 */}
        <div style={{ padding:'0 16px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
          {/* 원형 게이지 */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5.5"/>
              <circle cx="32" cy="32" r="24" fill="none"
                stroke={pct >= 80 ? '#FCA5A5' : '#34D399'}
                strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div style={{
              position:'absolute', inset:0,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ fontSize:'13px', fontWeight:800, color:'#fff', lineHeight:1 }}>{pct}%</span>
              <span style={{ fontSize:'7px', color:'rgba(255,255,255,0.5)', fontWeight:600, marginTop:'2px' }}>집행률</span>
            </div>
          </div>

          {/* 바 + 수치 */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ marginBottom:'10px' }}>
              <div style={{ height:'4px', background:'rgba(255,255,255,0.12)', borderRadius:'2px', overflow:'hidden' }}>
                <div style={{
                  width:`${pct}%`, height:'100%', borderRadius:'2px',
                  background: pct >= 80
                    ? 'linear-gradient(90deg,#FCA5A5,#EF4444)'
                    : 'linear-gradient(90deg,#34D399,#10B981)',
                }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.35)' }}>집행 {fmt만(thread.totalExecuted)}원</span>
                <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.35)' }}>총 {fmt만(thread.totalAmount)}원</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
              {[
                { label:'집행액', value: fmt만(thread.totalExecuted)+'원', alert: false },
                { label:'잔액', value: fmt만(thread.balance)+'원', alert: pct>=80 },
              ].map((item,i) => (
                <div key={i} style={{
                  background:'rgba(255,255,255,0.09)', borderRadius:'9px',
                  padding:'7px 10px',
                  border:'1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize:'8px', color:'rgba(255,255,255,0.4)', fontWeight:600, marginBottom:'2px' }}>{item.label}</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color: item.alert ? '#FCA5A5' : '#fff' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div style={{
        display:'flex',
        background:'#fff',
        borderBottom:`1px solid ${COLORS.borderSoft}`,
        flexShrink:0,
        padding:'0 8px',
      }}>
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex:1, padding:'12px 2px 11px',
                background:'none', border:'none',
                borderBottom: active ? `2.5px solid ${theme.brand}` : '2.5px solid transparent',
                cursor:'pointer', fontFamily:'inherit',
                display:'flex', flexDirection:'column', alignItems:'center', gap:'1px',
              }}>
              <span style={{ fontSize:'15px' }}>{t.icon}</span>
              <span style={{
                fontSize:'10px', fontWeight: active ? 700 : 500,
                color: active ? theme.brand : COLORS.t4,
                marginTop:'1px',
              }}>
                {t.key}{t.count > 0 ? ` ${t.count}` : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 24px' }}>

        {/* ─ 거래 탭 ─ */}
        {tab === '거래' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {data.trades.map(trade => {
              const isExpanded = expandedTrade === trade.id
              return (
                <div key={trade.id} style={{
                  background:'#fff',
                  borderRadius:'16px',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                  overflow:'hidden',
                }}>
                  <button
                    onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}
                    style={{
                      width:'100%', padding:'14px',
                      display:'flex', alignItems:'center', gap:'12px',
                      background:'none', border:'none',
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                    }}>
                    <div style={{
                      width:'42px', height:'42px', borderRadius:'13px',
                      background:`${theme.brand}14`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'20px', flexShrink:0,
                    }}>
                      {trade.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:'13px', fontWeight:700, color: COLORS.t1,
                        marginBottom:'3px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {trade.title}
                      </div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>{trade.date}</div>
                      {trade.amount && (
                        <div style={{ fontSize:'13px', fontWeight:700, color: theme.brand, marginTop:'2px' }}>
                          {trade.amount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', flexShrink:0 }}>
                      <span style={{
                        padding:'3px 9px',
                        background: trade.status === '완료' ? '#D1FAE5' : '#FEF3C7',
                        color: trade.status === '완료' ? '#047857' : '#854F0B',
                        borderRadius:'7px', fontSize:'10px', fontWeight:700,
                      }}>
                        {trade.status}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.2" strokeLinecap="round">
                        {isExpanded
                          ? <polyline points="18 15 12 9 6 15"/>
                          : <polyline points="6 9 12 15 18 9"/>
                        }
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                      {trade.detail.steps && (
                        <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'7px' }}>
                          <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t3, marginBottom:'2px' }}>지급 현황</div>
                          {trade.detail.steps.map((step, si) => {
                            const s = STEP_STYLE[step.status]
                            return (
                              <div key={si} style={{
                                display:'flex', alignItems:'center', gap:'10px',
                                padding:'10px 12px',
                                background:'#F8F9FB', borderRadius:'11px',
                              }}>
                                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: s.dot, flexShrink:0 }} />
                                <div style={{ flex:1 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                                    <span style={{ fontSize:'12px', fontWeight:700, color: COLORS.t1 }}>{step.label}</span>
                                    <span style={{ padding:'1px 6px', background: s.bg, color: s.color, borderRadius:'4px', fontSize:'9px', fontWeight:700 }}>
                                      {s.label}
                                    </span>
                                    {step.date && <span style={{ fontSize:'10px', color: COLORS.t4 }}>{step.date}</span>}
                                  </div>
                                  <span style={{ fontSize:'11px', color: COLORS.t3 }}>
                                    {step.amount.toLocaleString()}원 ({step.ratio})
                                  </span>
                                </div>
                                {step.action && (
                                  <button style={{
                                    padding:'6px 12px', background: theme.brand, color:'#fff',
                                    border:'none', borderRadius:'9px', fontSize:'11px', fontWeight:700,
                                    cursor:'pointer', flexShrink:0, fontFamily:'inherit',
                                  }}>
                                    {step.action} →
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {trade.detail.note && (
                        <div style={{
                          marginTop:'10px', padding:'10px 12px',
                          background:'#FFFBEB', border:'1px solid #FDE68A',
                          borderRadius:'10px', fontSize:'11px', color:'#854F0B', lineHeight:1.5,
                        }}>
                          {trade.detail.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─ 첨부파일 탭 ─ */}
        {tab === '첨부파일' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {data.attachments.length === 0 && (
              <div style={{ textAlign:'center', color: COLORS.t5, fontSize:'13px', paddingTop:'40px' }}>
                첨부파일 없음
              </div>
            )}
            {data.attachments.map((f, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'12px',
                padding:'13px 14px', background:'#fff',
                borderRadius:'14px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  width:'40px', height:'40px', borderRadius:'12px',
                  background:`${theme.brand}12`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:'13px', fontWeight:600, color: COLORS.t1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'2px' }}>{f.size} · {f.date}</div>
                </div>
                <div style={{ display:'flex', gap:'10px', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
              </div>
            ))}
            <button style={{
              width:'100%', padding:'14px',
              background:'#fff', border:`1.5px dashed ${COLORS.borderSoft}`,
              borderRadius:'14px', fontSize:'12px', color: COLORS.t4,
              cursor:'pointer', fontFamily:'inherit', fontWeight:600,
            }}>
              + 파일 첨부
            </button>
          </div>
        )}

        {/* ─ 메모 탭 ─ */}
        {tab === '메모' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {allDetailMemos.length === 0 && (
              <div style={{ textAlign:'center', color: COLORS.t5, fontSize:'13px', paddingTop:'40px' }}>
                메모 없음
              </div>
            )}
            {allDetailMemos.map((m, i) => (
              <div key={m.id || i} style={{
                padding:'14px 16px',
                background: m.time ? '#FFFDE7' : '#FFFBEB',
                border: m.time ? '1px solid #FDE68A' : '1px solid #FCD34D',
                borderRadius:'13px',
                fontSize:'12px', color:'#854F0B', lineHeight:1.65,
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                  <span style={{ fontSize:'14px', flexShrink:0 }}>{m.time ? '📝' : '📌'}</span>
                  <div style={{ flex:1 }}>
                    <div>{m.text}</div>
                    {m.txLabel && (
                      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'6px', padding:'3px 7px', background:'rgba(217,119,6,0.1)', borderRadius:'6px', width:'fit-content' }}>
                        <span style={{ fontSize:'10px' }}>🔗</span>
                        <span style={{ fontSize:'10px', fontWeight:700, color:'#92400E' }}>{m.txLabel}</span>
                      </div>
                    )}
                    {m.time && (
                      <div style={{ fontSize:'10px', color:'#B45309', marginTop:'4px', fontWeight:500 }}>🔒 나만 보임 · {m.time}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─ 상대정보 탭 ─ */}
        {tab === '상대정보' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {/* 상대방 카드 */}
            <div style={{
              background:'#fff', borderRadius:'16px',
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              overflow:'hidden',
            }}>
              {/* 카드 헤더 */}
              <div style={{
                padding:'12px 16px',
                background:`${theme.brand}08`,
                borderBottom:`1px solid ${theme.brand}15`,
                display:'flex', alignItems:'center', gap:'10px',
              }}>
                <div style={{
                  width:'36px', height:'36px', borderRadius:'11px',
                  background: thread.avatarBg, color: thread.avatarFg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: thread.emoji ? '18px' : '13px', fontWeight:700,
                }}>
                  {thread.emoji || thread.initial}
                </div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{data.userInfo.name}</div>
                  <div style={{ fontSize:'11px', color: COLORS.t4 }}>{data.userInfo.role}</div>
                </div>
                <div style={{ marginLeft:'auto' }}>
                  <span style={{
                    padding:'3px 9px',
                    background:'#D1FAE5', color:'#047857',
                    borderRadius:'7px', fontSize:'10px', fontWeight:700,
                  }}>
                    {data.userInfo.kyc}
                  </span>
                </div>
              </div>
              {/* 상세 항목 */}
              {[
                ['연락처', data.userInfo.phone],
                ['입금 계좌', data.userInfo.bank],
                ['거래 시작일', data.userInfo.joined],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'13px 16px',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>{k}</span>
                  <span style={{ fontSize:'13px', color: COLORS.t1, fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            {/* 빠른 액션 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'4px' }}>
              {[
                { icon:'📞', label:'전화 연결' },
                { icon:'💬', label:'문자 발송' },
                { icon:'📄', label:'계약서 보기' },
                { icon:'🔒', label:'거래 동결' },
              ].map(btn => (
                <button key={btn.label} style={{
                  padding:'12px 10px',
                  background:'#fff',
                  border:`1px solid ${COLORS.borderSoft}`,
                  borderRadius:'13px',
                  display:'flex', alignItems:'center', gap:'7px',
                  cursor:'pointer', fontFamily:'inherit',
                  fontSize:'12px', fontWeight:600, color: COLORS.t2,
                }}>
                  <span style={{ fontSize:'16px' }}>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}