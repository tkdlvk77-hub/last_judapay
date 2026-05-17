// ─── 기업 전용 액션시트 ───────────────────────────────────────
// 요청하기 (정산·증빙·상환·자료 전체) + 메모 + 자료제출
// ────────────────────────────────────────────────────────────

// Props:
//   actionSheet, closeSheet
//   requestType, setRequestType
//   settlementForm, setSettlementForm
//   evidenceForm,   setEvidenceForm
//   refundForm,     setRefundForm
//   dataReqForm,    setDataReqForm
//   submitForm,     setSubmitForm
//   selectedTx,     setSelectedTx
//   memoText,       setMemoText
//   memos,          setMemos
//   MOCK_TRANSACTIONS, MOCK_LOANS
//   pushLocalMsg
//   setLocalMsgs
//   thread
//   saveThreadMemo

import { saveThreadMemo } from './messagesData'

export default function ChatActionsBusiness({
  actionSheet, closeSheet,
  requestType, setRequestType,
  settlementForm, setSettlementForm,
  evidenceForm, setEvidenceForm,
  refundForm,   setRefundForm,
  dataReqForm,  setDataReqForm,
  submitForm,   setSubmitForm,
  selectedTx,   setSelectedTx,
  memoText,     setMemoText,
  memos,        setMemos,
  MOCK_TRANSACTIONS, MOCK_LOANS,
  pushLocalMsg,
  setLocalMsgs,
  thread,
}) {
  if (!actionSheet) return null

  const BIZ_SUBMIT_REQS = [
    { id:'r1', from:'김대표', type:'증빙 요청', label:'법인카드 영수증 제출 요청', deadline:'05.16', badge:'#7C3AED', badgeBg:'#F5F3FF' },
    { id:'r2', from:'재무팀', type:'자료 요청', label:'3월 견적서 재업로드 요청',  deadline:'05.18', badge:'#0891B2', badgeBg:'#ECFEFF' },
    { id:'r3', from:'김대표', type:'증빙 요청', label:'출장 교통비 영수증 첨부',    deadline:'05.20', badge:'#7C3AED', badgeBg:'#F5F3FF' },
  ]

  return (
    <div
      style={{
        position:'absolute', inset:0, zIndex:200,
        background:'rgba(15,20,35,0.45)',
        display:'flex', flexDirection:'column', justifyContent:'flex-end',
      }}
      onClick={closeSheet}
    >
      <div
        style={{
          background:'#fff',
          borderRadius:'20px 20px 0 0',
          padding:'0 0 32px',
          maxHeight:'90vh', overflowY:'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 시트 핸들 */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'#E4E6EA' }} />
        </div>

        {/* ── 요청하기 메인 메뉴 (기업: 4가지) ── */}
        {actionSheet === 'request' && !requestType && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'4px' }}>요청하기</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'20px' }}>상대방에게 정산·증빙·상환·자료를 요청합니다</div>
            {[
              { id:'settlement', emoji:'💰', label:'정산 요청', desc:'개인 지출 비용을 회사에 청구' },
              { id:'evidence',   emoji:'📋', label:'증빙 요청', desc:'영수증·세금계산서·사용사유 제출 요청' },
              { id:'refund',     emoji:'🔄', label:'상환 요청', desc:'대여금·선지급금 반환 요청' },
              { id:'data',       emoji:'📁', label:'자료 요청', desc:'계약서·견적서·결과물 등 파일 요청' },
            ].map(item => (
              <button key={item.id} onClick={() => setRequestType(item.id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:'14px',
                  padding:'14px 16px', marginBottom:'8px',
                  background:'#F9FAFB', border:'1px solid #F0F1F3',
                  borderRadius:'14px', cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                <span style={{ fontSize:'22px', flexShrink:0 }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>{item.label}</div>
                  <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>{item.desc}</div>
                </div>
                <svg style={{ marginLeft:'auto', flexShrink:0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* ── 정산 요청 폼 (기업 전용) ── */}
        {actionSheet === 'request' && requestType === 'settlement' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <button onClick={() => setRequestType(null)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>💰 정산 요청</span>
            </div>
            <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'20px', paddingLeft:'28px' }}>개인 지출한 업무 비용을 회사에 정산 요청합니다</div>

            <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
              {['📷 영수증 첨부', '🖼 사진 추가'].map(t => (
                <button key={t} style={{ flex:1, padding:'28px 0', background:'#F9FAFB', border:'2px dashed #E4E6EA', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit', fontSize:'11px', color:'#9CA3AF', fontWeight:600 }}>{t}</button>
              ))}
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>사용 목적</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
              {['출장비','식비','교통비','숙박비','사무용품','접대비','복리후생','기타'].map(p => (
                <button key={p}
                  onClick={() => setSettlementForm(f => ({ ...f, purpose: f.purpose === p ? '' : p }))}
                  style={{ padding:'5px 12px', borderRadius:'20px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                    background: settlementForm.purpose === p ? '#1D4ED8' : '#F9FAFB',
                    color:      settlementForm.purpose === p ? '#fff'    : '#6B7280',
                    borderColor: settlementForm.purpose === p ? '#1D4ED8' : '#E4E6EA',
                  }}>{p}</button>
              ))}
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>결제 수단</label>
            <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
              {['개인카드','개인계좌이체','현금','기타'].map(m => (
                <button key={m}
                  onClick={() => setSettlementForm(f => ({ ...f, method: m }))}
                  style={{ flex:1, padding:'6px 0', borderRadius:'10px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                    background:  settlementForm.method === m ? '#EFF6FF' : '#F9FAFB',
                    color:       settlementForm.method === m ? '#1D4ED8' : '#6B7280',
                    borderColor: settlementForm.method === m ? '#BFDBFE' : '#E4E6EA',
                  }}>{m}</button>
              ))}
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 메모</label>
            <textarea
              value={settlementForm.memo}
              onChange={e => setSettlementForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="추가 설명이 있으면 입력하세요" rows={3}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }}
            />
            <button
              onClick={() => {
                pushLocalMsg({ from:'me', type:'requestCard', card:{
                  emoji:'💰', title:'정산 요청', statusLabel:'전송됨',
                  headerGrad:'linear-gradient(135deg,#1D4ED8,#2563EB)',
                  borderColor:'#BFDBFE', txLabel: null,
                  fields:[
                    { label:'사용 목적', value: settlementForm.purpose || '미입력' },
                    { label:'결제 수단', value: settlementForm.method },
                    { label:'메모',     value: settlementForm.memo || '없음' },
                  ],
                }})
                closeSheet()
                setSettlementForm({ purpose:'', memo:'', method:'개인카드' })
              }}
              style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              정산 요청 전송
            </button>
          </div>
        )}

        {/* ── 증빙 요청 ── */}
        {actionSheet === 'request' && requestType === 'evidence' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <button onClick={() => { setRequestType(null); setSelectedTx(null) }} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>📋 증빙 요청</span>
            </div>
            {!selectedTx ? (
              <>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'14px', paddingLeft:'28px' }}>증빙을 요청할 거래 건을 선택하세요</div>
                {MOCK_TRANSACTIONS.map(tx => (
                  <button key={tx.id} onClick={() => setSelectedTx(tx)}
                    style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:'12px',
                      padding:'12px 14px', marginBottom:'8px', fontFamily:'inherit', cursor:'pointer',
                      background:'#F9FAFB', border:'1.5px solid #E4E6EA', borderRadius:'12px' }}>
                    <span style={{ padding:'3px 8px', borderRadius:'8px', background: tx.badgeBg, color: tx.badge, fontSize:'10px', fontWeight:700, flexShrink:0 }}>{tx.type}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111827' }}>{tx.label}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>{tx.amount} · {tx.date}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'16px', paddingLeft:'28px' }}>
                  <span style={{ padding:'2px 8px', borderRadius:'8px', background: selectedTx.badgeBg, color: selectedTx.badge, fontSize:'10px', fontWeight:700 }}>{selectedTx.type}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#374151' }}>{selectedTx.label}</span>
                  <button onClick={() => setSelectedTx(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'#9CA3AF', fontFamily:'inherit' }}>변경</button>
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>증빙 종류 선택 (복수 가능)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                  {['영수증','세금계산서','사용사유 작성','첨부파일 보완','자료 요청'].map(t => {
                    const isOn = evidenceForm.types.includes(t)
                    return (
                      <button key={t}
                        onClick={() => setEvidenceForm(f => ({ ...f, types: isOn ? f.types.filter(x => x!==t) : [...f.types, t] }))}
                        style={{ padding:'6px 12px', borderRadius:'20px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                          background:  isOn ? '#7C3AED' : '#F9FAFB',
                          color:       isOn ? '#fff'    : '#6B7280',
                          borderColor: isOn ? '#7C3AED' : '#E4E6EA' }}>{t}</button>
                    )
                  })}
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>제출 기한</label>
                <div style={{ width:'100%', overflow:'hidden', borderRadius:'10px', marginBottom:'14px' }}>
                  <input type="date" value={evidenceForm.deadline}
                    onChange={e => setEvidenceForm(f => ({ ...f, deadline: e.target.value }))}
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', WebkitAppearance:'none', appearance:'none' }} />
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 메시지</label>
                <textarea value={evidenceForm.message}
                  onChange={e => setEvidenceForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="요청 사유나 추가 안내를 입력하세요" rows={3}
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }} />
                <button
                  onClick={() => {
                    pushLocalMsg({ from:'me', type:'requestCard', card:{
                      emoji:'📋', title:'증빙 요청', statusLabel:'요청됨',
                      headerGrad:'linear-gradient(135deg,#7C3AED,#8B5CF6)',
                      borderColor:'#DDD6FE', txLabel: selectedTx.label,
                      fields:[
                        { label:'연결 거래', value: selectedTx.label + ' ' + selectedTx.amount },
                        { label:'증빙 종류', value: evidenceForm.types.length ? evidenceForm.types.join(', ') : '미선택' },
                        { label:'제출 기한', value: evidenceForm.deadline || '미지정' },
                        { label:'메시지',   value: evidenceForm.message || '없음' },
                      ],
                    }})
                    closeSheet()
                    setEvidenceForm({ types:[], deadline:'', reason:'', message:'' })
                  }}
                  style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#7C3AED,#8B5CF6)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  증빙 요청 전송
                </button>
              </>
            )}
          </div>
        )}

        {/* ── 상환 요청 ── */}
        {actionSheet === 'request' && requestType === 'refund' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <button onClick={() => { setRequestType(null); setSelectedTx(null) }} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>🔄 상환 요청</span>
            </div>
            {!selectedTx ? (
              <>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'14px', paddingLeft:'28px' }}>상환을 요청할 자금대여·대여금 건을 선택하세요</div>
                {MOCK_LOANS.map(tx => (
                  <button key={tx.id} onClick={() => setSelectedTx(tx)}
                    style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:'12px',
                      padding:'12px 14px', marginBottom:'8px', fontFamily:'inherit', cursor:'pointer',
                      background:'#F9FAFB', border:'1.5px solid #E4E6EA', borderRadius:'12px' }}>
                    <span style={{ padding:'3px 8px', borderRadius:'8px', background: tx.badgeBg, color: tx.badge, fontSize:'10px', fontWeight:700, flexShrink:0 }}>{tx.type}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111827' }}>{tx.label}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>{tx.amount} · {tx.date}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'16px', paddingLeft:'28px' }}>
                  <span style={{ padding:'2px 8px', borderRadius:'8px', background: selectedTx.badgeBg, color: selectedTx.badge, fontSize:'10px', fontWeight:700 }}>{selectedTx.type}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#374151' }}>{selectedTx.label} {selectedTx.amount}</span>
                  <button onClick={() => setSelectedTx(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'#9CA3AF', fontFamily:'inherit' }}>변경</button>
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>상환 요청 금액</label>
                <div style={{ position:'relative', marginBottom:'14px' }}>
                  <input type="number" value={refundForm.amount}
                    onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 44px 9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'15px', fontWeight:700, color:'#111827', fontFamily:'inherit', outline:'none' }} />
                  <span style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#9CA3AF', fontWeight:600 }}>원</span>
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>상환 기한</label>
                <div style={{ width:'100%', overflow:'hidden', borderRadius:'10px', marginBottom:'14px' }}>
                  <input type="date" value={refundForm.deadline}
                    onChange={e => setRefundForm(f => ({ ...f, deadline: e.target.value }))}
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', WebkitAppearance:'none', appearance:'none' }} />
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 사유</label>
                <textarea value={refundForm.reason}
                  onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="반환 사유를 입력하세요" rows={3}
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }} />
                <button
                  onClick={() => {
                    pushLocalMsg({ from:'me', type:'requestCard', card:{
                      emoji:'🔄', title:'상환 요청', statusLabel:'요청됨',
                      headerGrad:'linear-gradient(135deg,#DC2626,#EF4444)',
                      borderColor:'#FECACA', txLabel: selectedTx.label,
                      fields:[
                        { label:'원 거래',   value: selectedTx.label + ' ' + selectedTx.amount },
                        { label:'상환 금액', value: refundForm.amount ? Number(refundForm.amount).toLocaleString() + '원' : '미입력' },
                        { label:'상환 기한', value: refundForm.deadline || '미지정' },
                        { label:'사유',     value: refundForm.reason || '없음' },
                      ],
                    }})
                    closeSheet()
                    setRefundForm({ amount:'', deadline:'', reason:'' })
                  }}
                  style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#DC2626,#EF4444)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  상환 요청 전송
                </button>
              </>
            )}
          </div>
        )}

        {/* ── 자료 요청 (기업: 현황 패널 포함) ── */}
        {actionSheet === 'request' && requestType === 'data' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <button onClick={() => { setRequestType(null); setSelectedTx(null) }} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize:'15px', fontWeight:700, color:'#111827' }}>📁 자료 요청</span>
            </div>
            {!selectedTx ? (
              <>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'14px', paddingLeft:'28px' }}>자료를 요청할 거래·집행 건을 선택하세요</div>
                {MOCK_TRANSACTIONS.map(tx => (
                  <button key={tx.id} onClick={() => setSelectedTx(tx)}
                    style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:'12px',
                      padding:'12px 14px', marginBottom:'8px', fontFamily:'inherit', cursor:'pointer',
                      background:'#F9FAFB', border:'1.5px solid #E4E6EA', borderRadius:'12px' }}>
                    <span style={{ padding:'3px 8px', borderRadius:'8px', background: tx.badgeBg, color: tx.badge, fontSize:'10px', fontWeight:700, flexShrink:0 }}>{tx.type}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#111827' }}>{tx.label}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'1px' }}>{tx.amount} · {tx.date}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'12px', paddingLeft:'28px' }}>
                  <span style={{ padding:'2px 8px', borderRadius:'8px', background: selectedTx.badgeBg, color: selectedTx.badge, fontSize:'10px', fontWeight:700 }}>{selectedTx.type}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#374151' }}>{selectedTx.label}</span>
                  <button onClick={() => setSelectedTx(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'#9CA3AF', fontFamily:'inherit' }}>변경</button>
                </div>

                {/* 현재 자료 현황 (기업 전용) */}
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'10px', padding:'10px 12px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#92400E', marginBottom:'6px' }}>현재 자료 현황</div>
                  {[
                    { name:'계약서',       status:'등록완료' },
                    { name:'견적서',       status:'미등록' },
                    { name:'사업자등록증', status:'등록완료' },
                    { name:'통장사본',     status:'미등록' },
                    { name:'결과물 파일',  status:'제출대기' },
                  ].map(d => (
                    <div key={d.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 0' }}>
                      <span style={{ fontSize:'12px', color:'#78350F' }}>{d.name}</span>
                      <span style={{ fontSize:'10px', fontWeight:700,
                        color: d.status === '등록완료' ? '#059669' : d.status === '미등록' ? '#DC2626' : '#D97706' }}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>

                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 자료 선택 (복수 가능)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
                  {['계약서','견적서','결과물 파일','사업자등록증','통장사본','법인인감증명서','담당자 명함','기타 파일'].map(t => {
                    const isOn = dataReqForm.types.includes(t)
                    return (
                      <button key={t}
                        onClick={() => setDataReqForm(f => ({ ...f, types: isOn ? f.types.filter(x => x!==t) : [...f.types, t] }))}
                        style={{ padding:'6px 12px', borderRadius:'20px', border:'1px solid', fontFamily:'inherit', fontSize:'11px', fontWeight:600, cursor:'pointer',
                          background:  isOn ? '#0891B2' : '#F9FAFB',
                          color:       isOn ? '#fff'    : '#6B7280',
                          borderColor: isOn ? '#0891B2' : '#E4E6EA' }}>{t}</button>
                    )
                  })}
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>제출 기한</label>
                <div style={{ width:'100%', overflow:'hidden', borderRadius:'10px', marginBottom:'14px' }}>
                  <input type="date" value={dataReqForm.deadline}
                    onChange={e => setDataReqForm(f => ({ ...f, deadline: e.target.value }))}
                    style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', WebkitAppearance:'none', appearance:'none' }} />
                </div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 사유</label>
                <textarea value={dataReqForm.reason}
                  onChange={e => setDataReqForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="누락된 자료나 보완이 필요한 이유를 입력하세요" rows={2}
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }} />
                <button
                  onClick={() => {
                    pushLocalMsg({ from:'me', type:'requestCard', card:{
                      emoji:'📁', title:'자료 요청', statusLabel:'요청됨',
                      headerGrad:'linear-gradient(135deg,#0891B2,#06B6D4)',
                      borderColor:'#A5F3FC', txLabel: selectedTx.label,
                      fields:[
                        { label:'연결 거래', value: selectedTx.label + ' ' + selectedTx.amount },
                        { label:'요청 자료', value: dataReqForm.types.length ? dataReqForm.types.join(', ') : '미선택' },
                        { label:'제출 기한', value: dataReqForm.deadline || '미지정' },
                        { label:'사유',     value: dataReqForm.reason || '없음' },
                      ],
                    }})
                    closeSheet()
                    setDataReqForm({ types:[], deadline:'', reason:'' })
                  }}
                  style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#0891B2,#06B6D4)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  자료 요청 전송
                </button>
              </>
            )}
          </div>
        )}

        {/* ── 메모 시트 (기업 전용) ── */}
        {actionSheet === 'memo' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>📝 메모</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'14px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize:'11px', color:'#9CA3AF' }}>나만 볼 수 있는 메모입니다. 상대방에게 표시되지 않습니다.</span>
            </div>

            {/* 이전 메모 히스토리 — 가로 슬라이드 */}
            {memos.length > 0 && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', marginBottom:'8px' }}>
                  이전 메모 <span style={{ color:'#D97706' }}>{memos.length}개</span>
                </div>
                <div style={{
                  display:'flex', gap:'10px',
                  overflowX:'auto', paddingBottom:'6px',
                  scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
                }}>
                  {memos.map((m, mi) => (
                    <div key={mi} style={{
                      minWidth:'180px', maxWidth:'180px', flexShrink:0,
                      background:'#FFFDE7', border:'1px solid #FDE68A',
                      borderRadius:'12px', padding:'10px 12px',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ fontSize:'9px', fontWeight:700, color:'#D97706', marginBottom:'5px' }}>🔒 {m.time}</div>
                      <div style={{
                        fontSize:'12px', color:'#78350F', lineHeight:1.6, whiteSpace:'pre-wrap',
                        overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical',
                      }}>
                        {m.text}
                      </div>
                      {m.txLabel && (
                        <div style={{ fontSize:'10px', color:'#92400E', marginTop:'6px', fontWeight:600 }}>🔗 {m.txLabel}</div>
                      )}
                    </div>
                  ))}
                  <div style={{ minWidth:'20px', flexShrink:0 }} />
                </div>
              </div>
            )}

            <textarea value={memoText}
              onChange={e => setMemoText(e.target.value)}
              placeholder={"이 업체는 다음 지급 전에 계약서 확인 필요\n담당자와 통화 완료\n내부 확인 후 다시 연락 필요"} rows={4}
              style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'12px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.6 }}
            />

            <div style={{ fontSize:'10px', color:'#D97706', marginTop:'6px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'4px' }}>
              <span>🔒</span>
              <span>개인 메모 · 작성자 본인만 열람 가능</span>
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>거래 연결 (선택사항)</label>
            <select id="memo-tx-select"
              style={{ width:'100%', padding:'9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#6B7280', fontFamily:'inherit', outline:'none', marginBottom:'16px' }}>
              <option value="">거래 건 선택 안함</option>
              {MOCK_TRANSACTIONS.map(tx => (
                <option key={tx.id} value={tx.label}>{tx.type} | {tx.label} {tx.amount}</option>
              ))}
            </select>

            <button
              onClick={() => {
                if (!memoText.trim()) return
                const sel = document.getElementById('memo-tx-select')
                const txLabel = sel?.value || null
                const now = new Date()
                const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
                const memoMsgId = 'memo_' + Date.now()
                const newMemo = { id: memoMsgId, text: memoText.trim(), time: timeStr, txLabel }
                setMemos(prev => [...prev, newMemo])
                saveThreadMemo(thread.id, newMemo)
                setLocalMsgs(prev => [...prev, {
                  from:'me', type:'memo', text: memoText.trim(),
                  txLabel, id: memoMsgId, date:'오늘', time: timeStr,
                }])
                setMemoText('')
                closeSheet()
              }}
              style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#D97706,#F59E0B)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              메모 저장
            </button>
          </div>
        )}

        {/* ── 자료 제출 시트 ── */}
        {actionSheet === 'submit' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'4px' }}>📎 자료 제출</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>나에게 들어온 미처리 요청을 선택해서 자료를 제출합니다</div>
            {BIZ_SUBMIT_REQS.map(req => (
              <button key={req.id}
                onClick={() => setSubmitForm(f => ({ ...f, selectedReq: f.selectedReq === req.id ? null : req.id }))}
                style={{
                  width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:'12px',
                  padding:'12px 14px', marginBottom:'8px', fontFamily:'inherit', cursor:'pointer',
                  background: submitForm.selectedReq === req.id ? '#EFF6FF' : '#F9FAFB',
                  border: `1.5px solid ${submitForm.selectedReq === req.id ? '#93C5FD' : '#F0F1F3'}`,
                  borderRadius:'12px',
                }}>
                <div style={{ width:'20px', height:'20px', borderRadius:'50%',
                  border:`2px solid ${submitForm.selectedReq === req.id ? '#1D4ED8' : '#D1D5DB'}`,
                  background: submitForm.selectedReq === req.id ? '#1D4ED8' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {submitForm.selectedReq === req.id && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                    <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'6px', background: req.badgeBg, color: req.badge }}>{req.type}</span>
                    <span style={{ fontSize:'10px', color:'#D97706', fontWeight:700 }}>~ {req.deadline}</span>
                  </div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'#111827' }}>{req.label}</div>
                  <div style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'2px' }}>요청자: {req.from}</div>
                </div>
              </button>
            ))}

            {submitForm.selectedReq && (
              <div style={{ marginTop:'12px' }}>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>파일 첨부</label>
                <button style={{ width:'100%', padding:'24px 0', background:'#F9FAFB', border:'2px dashed #E4E6EA', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', color:'#9CA3AF', fontWeight:600, marginBottom:'10px' }}>
                  📎 파일 선택 (여러 개 가능)
                </button>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>내용 작성 (선택)</label>
                <textarea value={submitForm.message}
                  onChange={e => setSubmitForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="제출 관련 추가 설명을 입력하세요" rows={2}
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }} />
                <button
                  onClick={() => {
                    const req = BIZ_SUBMIT_REQS.find(r => r.id === submitForm.selectedReq)
                    pushLocalMsg({ from:'me', type:'requestCard', card:{
                      emoji:'📎', title:'자료 제출', statusLabel:'제출완료',
                      headerGrad:'linear-gradient(135deg,#059669,#10B981)',
                      borderColor:'#A7F3D0', txLabel: req?.label,
                      fields:[
                        { label:'제출 대상', value: req ? `[${req.type}] ${req.label}` : '미선택' },
                        { label:'요청자',   value: req?.from || '-' },
                        { label:'내용',     value: submitForm.message || '없음' },
                      ],
                    }})
                    closeSheet()
                    setSubmitForm({ selectedReq:null, message:'', files:[] })
                  }}
                  style={{ width:'100%', marginTop:'12px', padding:'14px', background:'linear-gradient(135deg,#059669,#10B981)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  제출 완료
                </button>
              </div>
            )}
            {!submitForm.selectedReq && (
              <div style={{ textAlign:'center', padding:'8px 0 4px', fontSize:'11px', color:'#D1D5DB' }}>위 목록에서 제출할 요청을 선택하세요</div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
