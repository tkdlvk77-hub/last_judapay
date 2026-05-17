import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useT } from '../design/i18n'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { dialog } from '../components/Dialog'

// 로그인된 기기 (데모)
const INITIAL_DEVICES = [
  {
    id:'d1', name:'iPhone 15 Pro', model:'iphone',
    location:'서울', lastActive:'지금 활성',
    current:true,
  },
  {
    id:'d2', name:'iPad Pro 12.9', model:'ipad',
    location:'서울', lastActive:'2일 전 접속',
    current:false,
  },
  {
    id:'d3', name:'MacBook Pro', model:'macbook',
    location:'서울', lastActive:'5일 전 접속',
    current:false,
  },
]

const AUTO_LOCK_OPTIONS = [
  { value:30,  label:'30초 후' },
  { value:60,  label:'1분 후' },
  { value:300, label:'5분 후' },
  { value:600, label:'10분 후' },
  { value:0,   label:'사용 안 함' },
]

// ─── 표준 헤더 ──────────────────────────────────────────
function DarkHeader({ onBack }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'20px', paddingLeft:'16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>보안 · 인증 관리</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>PIN · 생체인증 · 기기 관리</div>
        </div>
      </div>
    </div>
  )
}

// ─── 토글 스위치 ─────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width:'44px', height:'26px',
        borderRadius:'13px',
        background: on ? '#10B981' : COLORS.border,
        border:'none',
        cursor:'pointer',
        position:'relative',
        transition:'background .15s',
        padding:0,
        flexShrink:0,
      }}>
      <div style={{
        position:'absolute',
        top:'3px',
        left: on ? '21px' : '3px',
        width:'20px', height:'20px',
        borderRadius:'50%',
        background:'#fff',
        transition:'left .15s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ─── 섹션 헤더 ─────────────────────────
function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize:'12px', fontWeight:700,
      color: COLORS.t3,
      marginBottom:'8px',
      marginTop:'18px',
      padding:'0 4px',
    }}>
      {children}
    </div>
  )
}

// ─── 기기 아이콘 ─────────────────────────
function DeviceIcon({ model }) {
  const theme = getAccountTheme()
  const common = {
    width:'40px', height:'40px',
    borderRadius: RADIUS.md,
    background: '#EDE9FE',
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  }
  if (model === 'iphone') {
    return (
      <div style={common}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2" width="12" height="20" rx="2"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      </div>
    )
  }
  if (model === 'ipad') {
    return (
      <div style={common}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
      </div>
    )
  }
  return (
    <div style={common}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="13" rx="2"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    </div>
  )
}

export default function SecuritySettings() {
  const theme = getAccountTheme()
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [faceID, setFaceID] = useState(true)
  const [autoLock, setAutoLock] = useState(60) // 1분
  const [devices, setDevices] = useState(INITIAL_DEVICES)
  const [newDeviceAlert, setNewDeviceAlert] = useState(true)
  const [showLockPicker, setShowLockPicker] = useState(false)

  const autoLockLabel = AUTO_LOCK_OPTIONS.find(o => o.value === autoLock)?.label || '1분 후'

  const handleDeviceLogout = async (id) => {
    const ok = await dialog.confirm({
      title: '기기 로그아웃',
      message: '이 기기에서 로그아웃할까요?',
      okText: '로그아웃',
      destructive: true,
    })
    if (ok) setDevices(prev => prev.filter(d => d.id !== id))
  }

  const handleLogoutAll = async () => {
    const ok = await dialog.confirm({
      title: '다른 기기 모두 로그아웃',
      message: '현재 기기를 제외한 모든 기기에서 로그아웃합니다.\n다른 기기의 세션이 즉시 종료됩니다.',
      okText: '모두 로그아웃',
      destructive: true,
    })
    if (ok) setDevices(prev => prev.filter(d => d.current))
  }

  return (
    <PhoneShell>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto' }}>
        <DarkHeader onBack={() => navigate('/more')} />

        <div style={{ padding:'12px 16px 24px' }}>

          {/* ─── 로그인 보안 ─── */}
          <SectionHeader>로그인 보안</SectionHeader>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
          }}>
            {/* PIN 변경 */}
            <button
              onClick={() => dialog.alert({ title: 'PIN 변경', message: '추후 구현될 기능입니다.' })}
              style={{
                width:'100%',
                padding:'14px 16px',
                background:'transparent', border:'none',
                borderBottom: `1px solid ${COLORS.borderSoft}`,
                display:'flex', alignItems:'center', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
              <div style={{
                width:'36px', height:'36px',
                borderRadius: RADIUS.md,
                background:'#EDE9FE',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <circle cx="8" cy="12" r="1.5" fill={theme.brand}/>
                  <circle cx="12" cy="12" r="1.5" fill={theme.brand}/>
                  <circle cx="16" cy="12" r="1.5" fill={theme.brand}/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                  PIN 변경
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                  6자리 · 마지막 변경 30일 전
                </div>
              </div>
              <span style={{ fontSize:'18px', color: COLORS.t5, fontWeight:300 }}>›</span>
            </button>

            {/* Face ID */}
            <div style={{
              padding:'14px 16px',
              borderBottom: `1px solid ${COLORS.borderSoft}`,
              display:'flex', alignItems:'center', gap:'12px',
            }}>
              <div style={{
                width:'36px', height:'36px',
                borderRadius: RADIUS.md,
                background:'#FEF3C7',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="9" cy="10" r="1" fill="#854F0B"/>
                  <circle cx="15" cy="10" r="1" fill="#854F0B"/>
                  <path d="M9 16c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                  Face ID
                </div>
                <div style={{ fontSize:'11px', color:'#047857', fontWeight:600 }}>
                  활성 · 집행 시 PIN 대체
                </div>
              </div>
              <Toggle on={faceID} onChange={setFaceID} />
            </div>

            {/* 자동 잠금 */}
            <button
              onClick={() => setShowLockPicker(true)}
              style={{
                width:'100%',
                padding:'14px 16px',
                background:'transparent', border:'none',
                display:'flex', alignItems:'center', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
              <div style={{
                width:'36px', height:'36px',
                borderRadius: RADIUS.md,
                background:'#E0E7FF',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                  자동 잠금
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                  {autoLockLabel.includes('사용 안 함') ? '꺼짐' : `${autoLockLabel} 자동 잠금`}
                </div>
              </div>
              <span style={{ fontSize:'13px', color: theme.brand, fontWeight:700, marginRight:'6px' }}>
                {autoLockLabel}
              </span>
              <span style={{ fontSize:'18px', color: COLORS.t5, fontWeight:300 }}>›</span>
            </button>
          </div>

          {/* ─── 로그인된 기기 ─── */}
          <SectionHeader>로그인된 기기</SectionHeader>
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            overflow:'hidden',
          }}>
            {devices.map((d, i, arr) => (
              <div key={d.id} style={{
                padding:'14px 16px',
                borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                display:'flex', alignItems:'center', gap:'12px',
              }}>
                <DeviceIcon model={d.model} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'2px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1 }}>
                      {d.name}
                    </span>
                    {d.current && (
                      <span style={{
                        padding:'1px 6px',
                        background:'#D1FAE5', color:'#047857',
                        borderRadius:'4px',
                        fontSize:'9px', fontWeight:700,
                      }}>
                        현재 기기
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                    {d.location} · {d.lastActive}
                  </div>
                </div>
                {!d.current && (
                  <button
                    onClick={() => handleDeviceLogout(d.id)}
                    style={{
                      padding:'6px 12px',
                      background: COLORS.dangerBg,
                      color:'#B91C1C',
                      border:'none', borderRadius: RADIUS.pill,
                      fontSize:'11px', fontWeight:700,
                      cursor:'pointer', fontFamily:'inherit',
                      flexShrink:0,
                    }}>
                    로그아웃
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ─── 새 기기 로그인 알림 ─── */}
          <div style={{
            background: COLORS.bgCard,
            boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg,
            padding:'14px 16px',
            display:'flex', alignItems:'center', gap:'12px',
            marginTop:'18px',
          }}>
            <div style={{
              width:'36px', height:'36px',
              borderRadius: RADIUS.md,
              background:'#FEF3C7',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>
                새 기기 로그인 알림
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                새 기기에서 접속 시 즉시 알림
              </div>
            </div>
            <Toggle on={newDeviceAlert} onChange={setNewDeviceAlert} />
          </div>

          {/* ─── 전체 기기 로그아웃 ─── */}
          <button
            onClick={handleLogoutAll}
            style={{
              width:'100%',
              background: COLORS.bgCard,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg,
              padding:'14px 16px',
              display:'flex', alignItems:'center', gap:'12px',
              border:'none',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              marginTop:'8px',
            }}>
            <div style={{
              width:'36px', height:'36px',
              borderRadius: RADIUS.md,
              background: COLORS.dangerBg,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.danger, marginBottom:'2px' }}>
                전체 기기 로그아웃
              </div>
              <div style={{ fontSize:'11px', color: COLORS.t4 }}>
                현재 기기 제외 전체
              </div>
            </div>
            <span style={{ fontSize:'18px', color: COLORS.t5, fontWeight:300 }}>›</span>
          </button>

          {/* ─── PIN 5회 오류 안내 (회색 박스) ─── */}
          <div style={{ marginTop:'24px' }}>
            <div style={{
              fontSize:'12px', fontWeight:700,
              color: COLORS.t3,
              marginBottom:'8px',
              padding:'0 4px',
            }}>
              PIN 5회 오류 시
            </div>
            <div style={{
              padding:'14px 16px',
              background: COLORS.bgMuted,
              borderRadius: RADIUS.md,
              fontSize:'12px',
              color: COLORS.t3,
              lineHeight:1.7,
            }}>
              PIN 5회 연속 오류 시 계정이 자동 잠금됩니다. 해제는 본인 인증 (KCB)으로 가능합니다.
            </div>
          </div>
        </div>
      </div>

      {/* ─── 자동 잠금 시간 선택 바텀시트 ─── */}
      {showLockPicker && (
        <div
          onClick={() => setShowLockPicker(false)}
          style={{
            position:'fixed',
            inset:0,
            background:'rgba(0,0,0,0.5)',
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
              background: COLORS.border,
              borderRadius:'2px',
              margin:'8px auto 18px',
            }} />
            <div style={{ fontSize:'18px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
              자동 잠금
            </div>
            <div style={{ fontSize:'12px', color: COLORS.t3, marginBottom:'18px' }}>
              일정 시간 동안 사용하지 않으면 자동으로 잠겨요
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {AUTO_LOCK_OPTIONS.map(opt => {
                const active = autoLock === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => {
                      setAutoLock(opt.value)
                      setShowLockPicker(false)
                    }}
                    style={{
                      width:'100%',
                      padding:'14px 16px',
                      background: active ? '#F5F3FF' : 'transparent',
                      border:'none',
                      borderRadius: RADIUS.md,
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    }}>
                    <span style={{
                      fontSize:'14px',
                      fontWeight: active ? 700 : 500,
                      color: active ? theme.brand : COLORS.t1,
                    }}>
                      {opt.label}
                    </span>
                    {active && (
                      <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                        <path d="M1 7l5 5L17 1" stroke={theme.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
            </div>
          </div>
        )}
    </PhoneShell>
  )
}
