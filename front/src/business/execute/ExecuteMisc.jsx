import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import { addTransaction } from '../../shared/transactionStore'

const PAY_DAYS = ['1','5','10','15','20','25','28','말일']
const CYCLE_OPTS = [
  { id:'monthly',   label:'매월' },
  { id:'quarterly', label:'분기' },
  { id:'annual',    label:'연간' },
]
const ICONS = ['📋','👨‍💼','⚖️','🏥','📚','🔧','🎨','🖥️','📊','🤝']

const INIT_ITEMS = [
  { id:'m1', icon:'👨‍💼', name:'세무사 자문료',   amount:330000, payDay:'25', cycle:'monthly', active:true,  lastPayStatus:'success' },
  { id:'m2', icon:'⚖️',  name:'법무법인 자문료', amount:500000, payDay:'25', cycle:'monthly', active:false, lastPayStatus:null },
]

const DEMO_LOGS = [
  { date:'2026.05.25', status:'success' },
  { date:'2026.04.25', status:'success' },
  { date:'2026.03.25', status:'fail', note:'잔액 부족 → 보류' },
  { date:'2026.02.25', status:'success' },
  { date:'2026.01.25', status:'success' },
]

function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }

const STATUS_MAP = {
  active:  { label:'자동지급 ON',  bg:'#D1FAE5', color:'#059669' },
  overdue: { label:'미납 중',      bg:'#FEF3C7', color:'#D97706' },
  paused:  { label:'자동지급 OFF', bg:'#F3F4F6', color:'#6B7280' },
}
function getComputedStatus(item) {
  if (!item.active) return 'paused'
  if (item.lastPayStatus === 'fail') return 'overdue'
  return 'active'
}
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active
  return <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'20px', background:s.bg, color:s.color }}>{s.label}</span>
}

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ width:'32px', height:'32px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)
const XBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ width:'32px', height:'32px', background:'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
)

export default function ExecuteMisc() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  // ── 권한 체크: staff/viewer는 조회 전용 — 이 화면 접근 차단 ──
  const _bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canEdit  = !['viewer', 'staff'].includes(_bizRole)
  if (!canEdit) return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'22px', background:'#FFF7ED', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px', fontSize:'32px' }}>🔒</div>
        <div style={{ fontSize:'18px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>설정 권한이 없습니다</div>
        <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'24px' }}>
          {_bizRole === 'staff' ? '일반구성원 권한으로는 자동지급 설정을 변경할 수 없습니다.\n관리자에게 설정 변경을 요청하세요.' : '조회전용 권한으로는 이 화면에 접근할 수 없습니다.'}
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 18px', borderRadius:'20px', background:'#FFF7ED', color:'#92400E', fontSize:'12px', fontWeight:700, marginBottom:'28px' }}>
          <span>{_bizRole === 'staff' ? '👤' : '👁️'}</span>
          <span>내 권한: {_bizRole === 'staff' ? '일반구성원' : '조회전용'}</span>
        </div>
        <button onClick={() => navigate(-1)}
          style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          뒤로가기
        </button>
      </div>
    </PhoneShell>
  )


  const [items, setItems] = useState(INIT_ITEMS)
  const [screen, setScreen] = useState('list')       // list | detail | log | addForm
  const [selectedItem, setSelectedItem] = useState(null)
  const [exitModal, setExitModal] = useState(false)
  const [form, setForm] = useState({ icon:'📋', name:'', amount:'', payDay:'25', cycle:'monthly' })
  const [selectedIcon, setSelectedIcon] = useState('📋')

  const [autoPay, setAutoPay] = useState(true)
  const [autoPayType, setAutoPayType] = useState('account')
  const [saved, setSaved] = useState(false)

  const totalActive = items.filter(i => i.active).reduce((s,i) => s + i.amount, 0)
  const activeCount = items.filter(i => i.active).length

  const toggleActive = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i))
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const submit = () => {
    if (!form.name || !form.amount || parseInt(form.amount) < 100) return
    setItems(prev => [{
      id: `m${Date.now()}`, icon: selectedIcon,
      name: form.name, amount: parseInt(form.amount),
      payDay: form.payDay, cycle: form.cycle,
      active: true, lastPayStatus: null,
    }, ...prev])
    addTransaction({
      type: 'misc',
      fromUserId: 'biz_juda', fromUserName: '㈜주다컴퍼니', fromUserType: 'business',
      recipient: { id: null, name: form.name, phone: '', verified: true, isBusiness: true },
      amount: parseInt(form.amount),
      reason: form.name,
      walletId: 'my', walletLabel: 'MY 지갑',
      payDateMode: 'immediate', status: 'completed',
      mainCat: '미분류', subCat: '미분류',
    })
    setScreen('list')
    setForm({ icon:'📋', name:'', amount:'', payDay:'25', cycle:'monthly' })
    setSelectedIcon('📋')
  }

  // ── 로그 화면 ─────────────────────────────────────────────
  if (screen === 'log' && selectedItem) return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'24px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <BackBtn onClick={() => setScreen('list')} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>납부내역보기</span>
            <XBtn onClick={() => navigate(-1)} />
          </div>
          <div style={{ padding:'0 20px' }}>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>{selectedItem.name}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', marginTop:'3px' }}>반복 지급 이력 · 매월 {fmt(selectedItem.amount)}원</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
          {DEMO_LOGS.map((log, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 0', borderBottom: i < DEMO_LOGS.length - 1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background: log.status === 'success' ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                {log.status === 'success' ? '✓' : '✕'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{log.date}</div>
                {log.note && <div style={{ fontSize:'11px', color:'#DC2626', marginTop:'2px' }}>{log.note}</div>}
              </div>
              <div style={{ textAlign:'right' }}>
                {log.status === 'success'
                  ? <span style={{ fontSize:'13px', fontWeight:700, color:'#059669' }}>{fmt(selectedItem.amount)}원</span>
                  : <span style={{ fontSize:'13px', color: COLORS.t4 }}>—</span>}
                <div style={{ fontSize:'10px', color: log.status === 'success' ? '#059669' : '#DC2626', marginTop:'2px' }}>
                  {log.status === 'success' ? '정상 지급' : '지급 실패'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  )

  // ── 항목 상세 화면 ─────────────────────────────────────────
  if (screen === 'detail' && selectedItem) return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 12px' }}>
            <BackBtn onClick={() => setScreen('list')} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>{selectedItem.name}</span>
            <XBtn onClick={() => navigate(-1)} />
          </div>
          <div style={{ margin:'0 16px 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginBottom:'4px' }}>월 지급액</div>
            <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
              {fmt(selectedItem.amount)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
            </div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', marginTop:'8px' }}>
              매월 {selectedItem.payDay}일 자동 지급
            </div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
          {/* 납부일 */}
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t3, marginBottom:'10px' }}>지급일</div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {PAY_DAYS.map(d => (
                <button key={d} onClick={() => {}}
                  style={{ padding:'7px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background: selectedItem.payDay === d ? theme.brand : COLORS.bgMuted, color: selectedItem.payDay === d ? '#fff' : COLORS.t3 }}>
                  {d === '말일' ? '말일' : `${d}일`}
                </button>
              ))}
            </div>
          </div>
          {/* 자동지급 토글 */}
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, overflow:'hidden', boxShadow: SHADOWS.card }}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>자동 지급</span>
                <button onClick={() => toggleActive(selectedItem.id)}
                  style={{ width:'40px', height:'22px', borderRadius:'11px', border:'none', cursor:'pointer', background: selectedItem.active ? '#059669' : COLORS.bgMuted, position:'relative', transition:'background 0.2s' }}>
                  <div style={{ position:'absolute', top:'3px', left: selectedItem.active ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                </button>
              </div>
            </div>
          </div>

          {/* ── 승인 및 통제 */}
          <div style={{ marginTop:'8px', padding:'11px 14px', background: COLORS.infoBg, borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
            <strong>ⓘ</strong> 승인 절차는 더보기 → 관리자 설정에서 설정 가능합니다.
          </div>
        </div>
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background: COLORS.bg, borderTop:`1px solid ${COLORS.borderSoft}` }}>
          <button onClick={handleSave} style={{ width:'100%', padding:'15px', background: saved ? '#059669' : (theme.activeBtnGrad || theme.brand), color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}>
            {saved ? '✓ 저장 완료' : '설정 저장'}
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ── 항목 추가 폼 ───────────────────────────────────────────
  if (screen === 'addForm') return (
    <PhoneShell>
      {exitModal && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'flex-end' }}>
          <div style={{ width:'100%', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px' }}>
            <div style={{ fontSize:'17px', fontWeight:700, color: COLORS.t1, marginBottom:'8px' }}>나가시겠어요?</div>
            <div style={{ fontSize:'13px', color: COLORS.t3, marginBottom:'20px' }}>입력한 내용이 저장되지 않습니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setExitModal(false)} style={{ flex:1, padding:'14px', borderRadius: RADIUS.md, border:`1px solid ${COLORS.border}`, background:'#fff', fontSize:'14px', fontWeight:600, color: COLORS.t2, cursor:'pointer', fontFamily:'inherit' }}>계속 입력</button>
              <button onClick={() => { setExitModal(false); setScreen('list') }} style={{ flex:1, padding:'14px', borderRadius: RADIUS.md, border:'none', background:'#EF4444', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>나가기</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px' }}>
            <BackBtn onClick={() => setScreen('list')} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>기타 지출 추가</span>
            <XBtn onClick={() => setExitModal(true)} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
          {/* 아이콘 선택 */}
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'10px' }}>아이콘</div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setSelectedIcon(ic)}
                  style={{ width:'38px', height:'38px', borderRadius:'10px', border: selectedIcon === ic ? `2px solid ${theme.brand}` : `1px solid ${COLORS.border}`, background: selectedIcon === ic ? `${theme.brand}15` : COLORS.bgMuted, fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'6px' }}>지출 항목명</div>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              placeholder="예) 세무사 자문료"
              style={{ width:'100%', border:'none', outline:'none', fontSize:'15px', fontWeight:600, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'6px' }}>금액</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
              <input type="number" inputMode="numeric" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                placeholder="0"
                style={{ flex:1, border:'none', outline:'none', fontSize:'20px', fontWeight:700, color: COLORS.t1, background:'transparent', fontFamily:'inherit' }}/>
              <span style={{ fontSize:'14px', color: COLORS.t3 }}>원</span>
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'10px' }}>지급일</div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {PAY_DAYS.map(d => (
                <button key={d} onClick={() => setForm(p => ({...p, payDay: d}))}
                  style={{ padding:'7px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background: form.payDay === d ? theme.brand : COLORS.bgMuted, color: form.payDay === d ? '#fff' : COLORS.t3 }}>
                  {d === '말일' ? '말일' : `${d}일`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card }}>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'10px' }}>지급 주기</div>
            <div style={{ display:'flex', gap:'8px' }}>
              {CYCLE_OPTS.map(c => (
                <button key={c.id} onClick={() => setForm(p => ({...p, cycle: c.id}))}
                  style={{ flex:1, padding:'10px', borderRadius:'8px', fontSize:'12px', fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit',
                    background: form.cycle === c.id ? theme.brand : COLORS.bgMuted, color: form.cycle === c.id ? '#fff' : COLORS.t3 }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flexShrink:0, padding:'12px 16px 20px', background: COLORS.bg, borderTop:`1px solid ${COLORS.borderSoft}` }}>
          <button onClick={submit} disabled={!form.name || !form.amount}
            style={{ width:'100%', padding:'15px', background: (!form.name || !form.amount) ? COLORS.bgMuted : (theme.activeBtnGrad || theme.brand), color: (!form.name || !form.amount) ? COLORS.t4 : '#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            추가
          </button>
        </div>
      </div>
    </PhoneShell>
  )

  // ── 목록 화면 ─────────────────────────────────────────────
  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>
        <div style={{ background: theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 16px 16px' }}>
            <BackBtn onClick={() => navigate(-1)} />
            <span style={{ flex:1, fontSize:'15px', fontWeight:600, color:'#fff' }}>기타 지출 자동 지급</span>
            <button onClick={() => { const t = selectedItem || items[0]; if (t) { setSelectedItem(t); setScreen('log') } }} style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginRight:'4px' }}>납부내역보기</button>
            <XBtn onClick={() => navigate(-1)} />
          </div>
          <div style={{ margin:'0 16px', padding:'16px 18px', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:'16px' }}>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginBottom:'4px' }}>월 지급 합계</div>
            <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-1px', lineHeight:1.1 }}>
              {fmt(totalActive)}<span style={{ fontSize:'15px', fontWeight:500, opacity:0.7 }}>원</span>
            </div>
            <div style={{ display:'flex', gap:'16px', marginTop:'12px' }}>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{activeCount}건</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>자동지급 ON</div>
              </div>
              <div style={{ width:'1px', background:'rgba(255,255,255,0.15)' }}/>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{items.length}건</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', marginTop:'2px' }}>전체</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {items.map(item => {
            const st = getComputedStatus(item)
            return (
              <button key={item.id}
                onClick={() => { setSelectedItem(item); setScreen('detail') }}
                style={{ width:'100%', background: COLORS.bgCard, borderRadius: RADIUS.lg, padding:'14px 16px', boxShadow: SHADOWS.card, border:`1px solid ${COLORS.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: COLORS.bgMuted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{item.name}</span>
                    <StatusBadge status={st} />
                  </div>
                  <div style={{ fontSize:'11px', color: COLORS.t4 }}>매월 {item.payDay}일 · {CYCLE_OPTS.find(c => c.id === item.cycle)?.label}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{fmt(item.amount)}원</div>
                </div>
              </button>
            )
          })}
        </div>
        </div>
      </div>
      <div style={{ flexShrink:0, padding:'12px 16px 20px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={() => setScreen('addForm')}
          style={{ width:'100%', padding:'15px', background:theme.activeBtnGrad || theme.brand, color:'#fff', border:'none', borderRadius: RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:theme.activeShadow }}>
          <span style={{ fontSize:'18px' }}>+</span> 지출 항목 추가
        </button>
      </div>
    </PhoneShell>
  )
}
