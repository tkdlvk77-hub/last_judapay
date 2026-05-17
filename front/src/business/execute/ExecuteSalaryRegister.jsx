import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PhoneShell } from '../../design/components'
import { COLORS, RADIUS, SHADOWS } from '../../design/tokens'
import { getAccountTheme } from '../../design/accountTokens'
import DarkHeader from '../../components/DarkHeader'
import { useT } from '../../design/i18n'
import { dialog } from '../../components/Dialog'

const FREELANCE_RATE = 0.033  // 3.3%

function fmt(n) { return Number(n||0).toLocaleString('ko-KR') }
function calcNet(salary, type) {
  if (type === 'freelance') return Math.floor(salary * (1 - FREELANCE_RATE))
  return salary
}

export default function ExecuteSalaryRegister() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = getAccountTheme('business')
  // ── 권한 체크: staff/viewer 접근 차단 ──
  const _bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const canEdit  = !['viewer', 'staff'].includes(_bizRole)
  if (!canEdit) return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'32px 24px', background:'#F8F9FB', textAlign:'center' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'22px', background:'#FFF7ED', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px', fontSize:'32px' }}>🔒</div>
        <div style={{ fontSize:'18px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>설정 권한이 없습니다</div>
        <div style={{ fontSize:'13px', color:'#9CA3AF', lineHeight:1.7, marginBottom:'24px' }}>
          {_bizRole === 'staff' ? '일반구성원 권한으로는 급여 등록을 실행할 수 없습니다.' : '조회전용 권한으로는 이 화면에 접근할 수 없습니다.'}
        </div>
        <button onClick={() => navigate(-1)}
          style={{ width:'100%', maxWidth:'280px', height:'48px', background:'#111827', color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          뒤로가기
        </button>
      </div>
    </PhoneShell>
  )


  const recipients = location.state?.recipients || []

  // recipients 없으면 선택 화면으로 fallback
  useEffect(() => {
    if (!recipients || recipients.length === 0) {
      navigate('/execute/business/select-recipient?menu=salary', { replace: true })
    }
  }, [recipients, navigate])

  // 지급일
  const [payDay, setPayDay] = useState('25')

  // 직원별 입력값: { [id]: { salary, type } }
  const [fields, setFields] = useState(
    Object.fromEntries(recipients.map(r => [r.id, { salary: '', type: 'regular' }]))
  )

  const setField = (id, key, val) => {
    setFields(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }))
  }

  const allFilled = recipients.every(r => parseInt(fields[r.id]?.salary) > 0)
  const totalSalary = recipients.reduce((s, r) => s + (parseInt(fields[r.id]?.salary) || 0), 0)
  const totalNet = recipients.reduce((s, r) => {
    const sal = parseInt(fields[r.id]?.salary) || 0
    return s + calcNet(sal, fields[r.id]?.type)
  }, 0)

  const handleDone = () => {
    // 등록 완료 → 메인으로 돌아가기
    navigate('/execute/business/operations/salary', { replace: true })
  }

  if (!recipients || recipients.length === 0) return null

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', background: COLORS.bg }}>

          {/* 헤더 */}
          <DarkHeader
            smallTitle="급여 등록"
            bigTitle={`${recipients.length}명의 급여 정보를\n입력해주세요`}
            onBack={() => navigate(-1)}
          headerGrad={theme.headerGrad}
          />

          <div style={{ padding:'18px 16px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>

            {/* 공통 지급일 */}
            <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>지급일 (공통)</div>
                  <div style={{ fontSize:'12px', color: COLORS.t4 }}>매월 {payDay}일 자동 지급</div>
                </div>
                <button onClick={() => dialog.alert({ title: '지급일 변경', message: '추후 구현될 기능입니다.' })} style={{ padding:'6px 13px', background:`${theme.brandDark}10`, color: theme.brandDark, border:`1px solid ${theme.brandDark}20`, borderRadius:'8px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  변경
                </button>
              </div>
            </div>

            {/* 직원별 카드 */}
            {recipients.map((r, i) => {
              const f = fields[r.id] || { salary: '', type: 'regular' }
              const sal = parseInt(f.salary) || 0
              const net = calcNet(sal, f.type)
              const isFreelance = f.type === 'freelance'

              return (
                <div key={r.id} style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, overflow:'hidden' }}>

                  {/* 직원 정보 행 */}
                  <div style={{ padding:'13px 16px 10px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: r.avatarBg || '#EDF3FA', color: r.avatarFg || '#1E5294', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, flexShrink:0 }}>
                      {r.initial || r.name?.[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>{r.name}</div>
                      <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                        {r.phone || r.id}
                        {!r.verified && <span style={{ marginLeft:'6px', padding:'1px 6px', background:'#FEF3C7', color:'#92400E', borderRadius:'4px', fontSize:'10px', fontWeight:700 }}>미가입 · 링크 발송</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:'11px', color: COLORS.t4 }}>#{i+1}</div>
                  </div>

                  <div style={{ height:'1px', background: COLORS.borderSoft }} />

                  {/* 급여 입력 */}
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t2, marginBottom:'6px' }}>급여 (세전)</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', background: COLORS.bg, border:`1.5px solid ${sal > 0 ? theme.brandDark : COLORS.border}`, borderRadius:'10px', padding:'11px 14px', marginBottom:'14px' }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={f.salary}
                        onChange={e => setField(r.id, 'salary', e.target.value)}
                        style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:'16px', fontWeight:700, color: COLORS.t1, fontFamily:'inherit', textAlign:'right' }}
                      />
                      <span style={{ fontSize:'14px', fontWeight:600, color: COLORS.t3, flexShrink:0 }}>원</span>
                    </div>

                    {/* 고용 형태 */}
                    <div style={{ fontSize:'12px', fontWeight:600, color: COLORS.t2, marginBottom:'8px' }}>고용 형태 (원천징수)</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>

                      {/* 프리랜서 */}
                      <button
                        onClick={() => setField(r.id, 'type', 'freelance')}
                        style={{ padding:'12px 14px', background: isFreelance ? `${theme.brandDark}08` : COLORS.bg, border:`1.5px solid ${isFreelance ? theme.brandDark : COLORS.border}`, borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
                      >
                        <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${isFreelance ? theme.brandDark : COLORS.border}`, background: isFreelance ? theme.brandDark : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {isFreelance && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:700, color: isFreelance ? theme.brandDark : COLORS.t1 }}>프리랜서 / 외주</div>
                          <div style={{ fontSize:'11px', color: COLORS.t4 }}>3.3% 자동 공제 후 지급</div>
                        </div>
                        {isFreelance && sal > 0 && (
                          <div style={{ fontSize:'12px', fontWeight:700, color: theme.brandDark, flexShrink:0 }}>
                            {fmt(net)}원
                          </div>
                        )}
                      </button>

                      {/* 정규직 */}
                      <button
                        onClick={() => setField(r.id, 'type', 'regular')}
                        style={{ padding:'12px 14px', background: !isFreelance ? `${theme.brandDark}08` : COLORS.bg, border:`1.5px solid ${!isFreelance ? theme.brandDark : COLORS.border}`, borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
                      >
                        <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:`2px solid ${!isFreelance ? theme.brandDark : COLORS.border}`, background: !isFreelance ? theme.brandDark : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {!isFreelance && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff' }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:700, color: !isFreelance ? theme.brandDark : COLORS.t1 }}>정규직</div>
                          <div style={{ fontSize:'11px', color: COLORS.t4 }}>세전 지급 · 근로소득세는 세무사 처리</div>
                        </div>
                      </button>
                    </div>

                    {/* 미가입자 안내 */}
                    {!r.verified && (
                      <div style={{ marginTop:'12px', padding:'10px 12px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'9px', display:'flex', gap:'6px' }}>
                        <span style={{ fontSize:'12px' }}>📲</span>
                        <div style={{ fontSize:'11px', color:'#1E40AF', lineHeight:1.6 }}>
                          미가입자입니다. 등록 완료 시 외부 링크가 발송되며, 받는 분이 직접 계좌를 입력해서 받아갈 수 있어요.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* 합계 요약 */}
            {totalSalary > 0 && (
              <div style={{ background: COLORS.bgCard, borderRadius: RADIUS.lg, boxShadow: SHADOWS.card, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span style={{ fontSize:'12px', color: COLORS.t4 }}>세전 합계</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color: COLORS.t2 }}>{fmt(totalSalary)}원</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'8px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                  <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>실수령 합계</span>
                  <span style={{ fontSize:'15px', fontWeight:700, color: theme.brandDark }}>{fmt(totalNet)}원</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 하단 등록 완료 */}
        <div style={{ flexShrink:0, padding:'12px 16px 16px', background: COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}` }}>
          <button
            onClick={handleDone}
            disabled={!allFilled}
            style={{
              width:'100%', height:'52px',
              background: allFilled ? `linear-gradient(135deg, ${theme.brand}, ${theme.brandDark})` : COLORS.bgMuted,
              color: allFilled ? '#fff' : COLORS.t4,
              border:'none', borderRadius: RADIUS.md,
              fontSize:'15px', fontWeight:700,
              cursor: allFilled ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
              boxShadow: allFilled ? `0 4px 14px ${theme.brand}40` : 'none',
              transition:'all .15s',
            }}
          >
            {allFilled ? `${recipients.length}명 등록 완료` : '급여를 모두 입력해주세요'}
          </button>
        </div>

      </div>
    </PhoneShell>
  )
}
