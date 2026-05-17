import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'

const KEYS = [1,2,3,4,5,6,7,8,9,'faceid',0,'del']
const SUB = {2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}

export default function Login() {
  const navigate = useNavigate()
  const { login, userType: existing } = useUser()
  const [pin, setPin] = useState('')

  // cream 배경 화면 — 상태바 글자 검정
  useStatusBarStyle('dark')

  const completeLogin = (type) => {
    login(type)
    // 기업 로그인 시 bizRole 저장 (데모 기본값: master/최고관리자)
    // 실제 개발 시: 백엔드 인증 응답의 role 값으로 교체
    if (type === 'business') {
      sessionStorage.setItem('bizRole', 'master')
    } else {
      sessionStorage.removeItem('bizRole')
    }
    navigate(type === 'business' ? '/home-business' : '/home')
  }

  const handleKey = (k) => {
    // Face ID: 기존 세션이 있으면 그 타입으로, 없으면 개인으로 (데모)
    if (k === 'faceid') { completeLogin(existing || 'personal'); return }
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      // 데모: PIN '999999'면 기업, 그 외엔 개인
      const type = next === '999999' ? 'business' : 'personal'
      setTimeout(() => completeLogin(type), 400)
    }
  }

  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'max(48px, calc(24px + env(safe-area-inset-top)))', paddingLeft:'24px', paddingRight:'24px', paddingBottom:0 }}>
        {/* 로고 */}
        <div style={{ width:'52px', height:'52px', background:'#111', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'14px' }}>
          <svg width="28" height="20" viewBox="0 0 38 26" fill="none">
            <rect x="1" y="1" width="36" height="24" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
            <rect x="1" y="7" width="36" height="6" fill="white" fillOpacity=".9"/>
            <circle cx="31" cy="19.5" r="4" fill="#E8622A"/>
            <circle cx="27" cy="19.5" r="4" fill="white" fillOpacity=".35"/>
          </svg>
        </div>
        <div style={{ fontSize:'18px', fontWeight:'700', color:'#111', marginBottom:'4px' }}>주다페이</div>
        <div style={{ fontSize:'13px', color:'#9B9990', marginBottom:'28px' }}>이호형님, 안녕하세요</div>

        {/* PIN 도트 */}
        <div style={{ display:'flex', gap:'16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              width:'14px', height:'14px', borderRadius:'50%',
              border: i < pin.length ? '2px solid #111' : '2px solid #E8E4DC',
              background: i < pin.length ? '#111' : 'transparent',
              transition:'all .15s',
            }} />
          ))}
        </div>
      </div>

      <div style={{ flex:1 }} />

      {/* 키패드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', padding:'20px 28px 16px', width:'100%' }}>
        {KEYS.map((k, i) => (
          <button key={i} onClick={() => handleKey(k)}
            style={{
              height:'58px', borderRadius:'16px',
              background: k === 'del' || k === 'faceid' ? 'transparent' : k === null ? 'transparent' : '#F2EFE9',
              border:'none',
              cursor: k === null ? 'default' : 'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
            }}>
            {k === 'del' ? (
              <span style={{ fontSize:'20px', color:'#9B9990' }}>⌫</span>
            ) : k === 'faceid' ? (
              <svg width="24" height="24" viewBox="0 0 42 42" fill="none">
                <rect x="9" y="4" width="24" height="34" rx="5" stroke="#E8622A" strokeWidth="2"/>
                <circle cx="21" cy="21" r="7" stroke="#E8622A" strokeWidth="2"/>
                <circle cx="21" cy="21" r="2" fill="#E8622A"/>
              </svg>
            ) : k !== null ? (
              <>
                <span style={{ fontSize:'22px', fontWeight:'500', color:'#111', lineHeight:1 }}>{k}</span>
                {SUB[k] && <span style={{ fontSize:'9px', color:'#C8C5BE', letterSpacing:'1.5px' }}>{SUB[k]}</span>}
              </>
            ) : null}
          </button>
        ))}
      </div>

      <div style={{ paddingBottom:'max(32px, env(safe-area-inset-bottom))', fontSize:'11px', color:'#2D6BB0', cursor:'pointer' }}>
        PIN 분실 · 로그인 문제
      </div>
    </div>
  )
}
