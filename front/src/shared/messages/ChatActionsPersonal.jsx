// ─── 개인 전용 액션시트 ───────────────────────────────────────
// 메뉴 구조: 지급 요청 / 상환 요청 / 자료 요청 / 메모
// 정산 요청·자료제출·증빙 요청 없음 — 개인 금전 관계 중심
// ────────────────────────────────────────────────────────────

// Props:
//   actionSheet, closeSheet
//   paymentForm,  setPaymentForm
//   refundForm,   setRefundForm
//   dataReqForm,  setDataReqForm
//   selectedTx,   setSelectedTx
//   memoText,     setMemoText
//   memos,        setMemos
//   MOCK_LOANS
//   MOCK_TRANSACTIONS
//   pushLocalMsg
//   setLocalMsgs
//   thread

import { saveThreadMemo } from './messagesData'

export default function ChatActionsPersonal({
  actionSheet, closeSheet,
  paymentForm,  setPaymentForm,
  refundForm,   setRefundForm,
  dataReqForm,  setDataReqForm,
  selectedTx,   setSelectedTx,
  memoText,     setMemoText,
  memos,        setMemos,
  MOCK_LOANS,
  MOCK_TRANSACTIONS,
  pushLocalMsg,
  setLocalMsgs,
  thread,
}) {
  if (!actionSheet) return null

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

        {/* ── 지급 요청 ── */}
        {actionSheet === 'payment' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>💸 지급 요청</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'20px' }}>상대방에게 돈을 보내달라고 요청합니다</div>

            {/* 금액 입력 */}
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 금액</label>
            <div style={{ position:'relative', marginBottom:'16px' }}>
              <input
                type="number" value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                style={{ width:'100%', boxSizing:'border-box', padding:'12px 44px 12px 14px',
                  background:'#F9FAFB', border:'1.5px solid #E4E6EA', borderRadius:'12px',
                  fontSize:'20px', fontWeight:800, color:'#111827', fontFamily:'inherit', outline:'none' }}
              />
              <span style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#9CA3AF', fontWeight:600 }}>원</span>
            </div>

            {/* 목적 선택 */}
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'8px' }}>요청 목적</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px', marginBottom:'16px' }}>
              {[
                { id:'living',  emoji:'🏠', label:'생활비' },
                { id:'allowance', emoji:'💰', label:'용돈' },
                { id:'trade',   emoji:'🤝', label:'개인 거래' },
                { id:'other',   emoji:'📌', label:'기타' },
              ].map(p => {
                const isOn = paymentForm.purpose === p.id
                return (
                  <button key={p.id}
                    onClick={() => setPaymentForm(f => ({ ...f, purpose: isOn ? '' : p.id, purposeLabel: isOn ? '' : p.label }))}
                    style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'7px 13px',
                      borderRadius:'20px', border:'1.5px solid', fontFamily:'inherit', fontSize:'12px', fontWeight:600, cursor:'pointer',
                      background:  isOn ? '#EFF6FF' : '#F9FAFB',
                      color:       isOn ? '#1D4ED8' : '#6B7280',
                      borderColor: isOn ? '#93C5FD' : '#E4E6EA' }}>
                    <span>{p.emoji}</span>{p.label}
                  </button>
                )
              })}
            </div>

            {/* 메시지 */}
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>메시지 (선택)</label>
            <textarea value={paymentForm.message}
              onChange={e => setPaymentForm(f => ({ ...f, message: e.target.value }))}
              placeholder="추가로 전달할 내용을 입력하세요" rows={2}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB',
                border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827',
                fontFamily:'inherit', resize:'none', outline:'none' }}
            />

            <button
              onClick={() => {
                if (!paymentForm.amount) return
                pushLocalMsg({ from:'me', type:'requestCard', card:{
                  emoji:'💸', title:'지급 요청', statusLabel:'요청됨',
                  headerGrad:'linear-gradient(135deg,#1D4ED8,#2563EB)',
                  borderColor:'#BFDBFE', txLabel: null,
                  fields:[
                    { label:'요청 금액', value: Number(paymentForm.amount).toLocaleString() + '원' },
                    { label:'목적',     value: paymentForm.purposeLabel || '기타' },
                    { label:'메시지',   value: paymentForm.message || '없음' },
                  ],
                }})
                closeSheet()
                setPaymentForm({ amount:'', purpose:'', purposeLabel:'', message:'' })
              }}
              style={{ width:'100%', marginTop:'16px', padding:'14px',
                background:'linear-gradient(135deg,#1D4ED8,#2563EB)',
                color:'#fff', border:'none', borderRadius:'14px',
                fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              지급 요청 전송
            </button>
          </div>
        )}

        {/* ── 상환 요청 ── */}
        {actionSheet === 'refund' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>🔄 상환 요청</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>빌린 돈, 선입금, 보증금 등 반환을 요청합니다</div>

            {!selectedTx ? (
              <>
                <div style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'12px' }}>상환을 요청할 거래를 선택하세요</div>
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
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'16px' }}>
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

                <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>요청 사유 (선택)</label>
                <textarea value={refundForm.reason}
                  onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="반환 사유나 추가 내용을 입력하세요" rows={2}
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
                    setSelectedTx(null)
                    setRefundForm({ amount:'', deadline:'', reason:'' })
                  }}
                  style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#DC2626,#EF4444)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  상환 요청 전송
                </button>
              </>
            )}
          </div>
        )}

        {/* ── 자료 요청 (개인: 거래 안전·증거 확보 중심) ── */}
        {actionSheet === 'data' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>📁 자료 요청</div>
            <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'16px' }}>거래와 관련된 파일이나 확인 자료를 요청합니다</div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'8px' }}>요청 항목 선택 (복수 가능)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px', marginBottom:'16px' }}>
              {['계약서','영수증','결과물 파일','신분 확인 자료','사용 사유','기타 파일'].map(t => {
                const isOn = dataReqForm.types.includes(t)
                return (
                  <button key={t}
                    onClick={() => setDataReqForm(f => ({ ...f, types: isOn ? f.types.filter(x => x!==t) : [...f.types, t] }))}
                    style={{ padding:'7px 13px', borderRadius:'20px', border:'1.5px solid', fontFamily:'inherit', fontSize:'12px', fontWeight:600, cursor:'pointer',
                      background:  isOn ? '#EFF6FF' : '#F9FAFB',
                      color:       isOn ? '#0891B2' : '#6B7280',
                      borderColor: isOn ? '#7DD3FC' : '#E4E6EA' }}>{t}</button>
                )
              })}
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>제출 기한 (선택)</label>
            <div style={{ width:'100%', overflow:'hidden', borderRadius:'10px', marginBottom:'14px' }}>
              <input type="date" value={dataReqForm.deadline}
                onChange={e => setDataReqForm(f => ({ ...f, deadline: e.target.value }))}
                style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', outline:'none', WebkitAppearance:'none', appearance:'none' }} />
            </div>

            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'6px' }}>메시지 (선택)</label>
            <textarea value={dataReqForm.reason}
              onChange={e => setDataReqForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="요청 이유나 추가 안내를 입력하세요" rows={2}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', background:'#F9FAFB', border:'1px solid #E4E6EA', borderRadius:'10px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none' }} />

            <button
              onClick={() => {
                pushLocalMsg({ from:'me', type:'requestCard', card:{
                  emoji:'📁', title:'자료 요청', statusLabel:'요청됨',
                  headerGrad:'linear-gradient(135deg,#0891B2,#06B6D4)',
                  borderColor:'#A5F3FC', txLabel: null,
                  fields:[
                    { label:'요청 항목', value: dataReqForm.types.length ? dataReqForm.types.join(', ') : '미선택' },
                    { label:'제출 기한', value: dataReqForm.deadline || '미지정' },
                    { label:'메시지',   value: dataReqForm.reason || '없음' },
                  ],
                }})
                closeSheet()
                setDataReqForm({ types:[], deadline:'', reason:'' })
              }}
              style={{ width:'100%', marginTop:'16px', padding:'14px', background:'linear-gradient(135deg,#0891B2,#06B6D4)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              자료 요청 전송
            </button>
          </div>
        )}

        {/* ── 메모 시트 ── */}
        {actionSheet === 'memo' && (
          <div style={{ padding:'8px 20px 0' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>📝 메모</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'14px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize:'11px', color:'#9CA3AF' }}>나만 볼 수 있는 메모입니다. 상대방에게 표시되지 않습니다.</span>
            </div>

            {memos.length > 0 && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', marginBottom:'8px' }}>
                  이전 메모 <span style={{ color:'#D97706' }}>{memos.length}개</span>
                </div>
                <div style={{ display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'6px', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}>
                  {memos.map((m, mi) => (
                    <div key={mi} style={{ minWidth:'180px', maxWidth:'180px', flexShrink:0,
                      background:'#FFFDE7', border:'1px solid #FDE68A', borderRadius:'12px', padding:'10px 12px',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize:'9px', fontWeight:700, color:'#D97706', marginBottom:'5px' }}>🔒 {m.time}</div>
                      <div style={{ fontSize:'12px', color:'#78350F', lineHeight:1.6, whiteSpace:'pre-wrap',
                        overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical' }}>{m.text}</div>
                      {m.txLabel && <div style={{ fontSize:'10px', color:'#92400E', marginTop:'6px', fontWeight:600 }}>🔗 {m.txLabel}</div>}
                    </div>
                  ))}
                  <div style={{ minWidth:'20px', flexShrink:0 }} />
                </div>
              </div>
            )}

            <textarea value={memoText}
              onChange={e => setMemoText(e.target.value)}
              placeholder={"개인 메모를 입력하세요\n나만 볼 수 있습니다"} rows={4}
              style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'12px', fontSize:'13px', color:'#111827', fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.6 }}
            />

            <div style={{ fontSize:'10px', color:'#D97706', marginTop:'6px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'4px' }}>
              <span>🔒</span><span>개인 메모 · 작성자 본인만 열람 가능</span>
            </div>

            <button
              onClick={() => {
                if (!memoText.trim()) return
                const now = new Date()
                const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
                const memoMsgId = 'memo_' + Date.now()
                const newMemo = { id: memoMsgId, text: memoText.trim(), time: timeStr, txLabel: null }
                setMemos(prev => [...prev, newMemo])
                saveThreadMemo(thread.id, newMemo)
                setLocalMsgs(prev => [...prev, {
                  from:'me', type:'memo', text: memoText.trim(),
                  txLabel: null, id: memoMsgId, date:'오늘', time: timeStr,
                }])
                setMemoText('')
                closeSheet()
              }}
              style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#D97706,#F59E0B)', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              메모 저장
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
