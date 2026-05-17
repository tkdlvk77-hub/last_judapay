import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'

const KEYS = [1,2,3,4,5,6,7,8,9,null,0,'del']
const SUB = {2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'}

function Sbar() { return null }

function Keypad({ onKey }) {
  return (
    <div className="keypad-safe" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', paddingLeft:'28px', paddingRight:'28px' }}>
      {KEYS.map((k, i) => (
        <button key={i} onClick={() => onKey(k)}
          style={{
            height:'58px', borderRadius:'16px',
            background: k === null ? 'transparent' : k === 'del' ? 'transparent' : '#F2EFE9',
            border:'none', fontSize:'22px', fontWeight:'500', color: k === 'del' ? '#9B9990' : '#111',
            cursor: k === null ? 'default' : 'pointer', fontFamily:'inherit',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px',
          }}>
          {k === 'del' ? '⌫' : k !== null ? (
            <>
              <span style={{ lineHeight:1 }}>{k}</span>
              {SUB[k] && <span style={{ fontSize:'9px', color:'#C8C5BE', letterSpacing:'1.5px' }}>{SUB[k]}</span>}
            </>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function Dots({ count, total = 6 }) {
  return (
    <div style={{ display:'flex', gap:'16px', margin:'28px 0 32px', justifyContent:'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:'14px', height:'14px', borderRadius:'50%',
          border: i < count ? '2px solid #111' : '2px solid #E8E4DC',
          background: i < count ? '#111' : 'transparent',
          transition:'all .15s',
        }} />
      ))}
    </div>
  )
}

export default function SignupPin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useUser()
  const userType = searchParams.get('type') === 'business' ? 'business' : 'personal'
  const [pin, setPin] = useState('')
  const [phase, setPhase] = useState('pin') // pin | faceid | done

  // 흰/cream 배경 화면 — 상태바 글자 검정으로
  useStatusBarStyle('dark')

  const handleKey = (k) => {
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    if (k === null) return
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) setTimeout(() => { setPin(''); setPhase('faceid') }, 400)
  }

  // Face ID
  if (phase === 'faceid') return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <Sbar />
      <div style={{ width:'100%', padding:'2px 20px 0', textAlign:'right', fontSize:'11px', color:'#C8C5BE' }}>PIN 설정 완료</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#FBE9E0', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px' }}>
          <svg width="36" height="36" viewBox="0 0 42 42" fill="none">
            <rect x="9" y="4" width="24" height="34" rx="5" stroke="#E8622A" strokeWidth="2"/>
            <circle cx="21" cy="21" r="6" stroke="#E8622A" strokeWidth="2"/>
            <circle cx="21" cy="21" r="2" fill="#E8622A"/>
          </svg>
        </div>
        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', textAlign:'center', lineHeight:'1.35', marginBottom:'8px' }}>
          Face ID로<br />더 빠르게 쓸게요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center', lineHeight:'1.65' }}>
          자금 집행 시 PIN 대신 사용할 수 있어요.<br />Face ID 정보는 기기에만 저장돼요.
        </div>
      </div>
      <div style={{ padding:'0 24px 40px', display:'flex', flexDirection:'column', gap:'10px' }}>
        <button onClick={() => setPhase('done')}
          style={{ width:'100%', height:'52px', background:'#E8622A', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
          Face ID 설정하기
        </button>
        <button onClick={() => setPhase('done')}
          style={{ width:'100%', height:'46px', background:'transparent', color:'#9B9990', border:'1px solid #E8E4DC', borderRadius:'16px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
          건너뛰기
        </button>
      </div>
    </div>
  )

  // 가입 완료
  if (phase === 'done') return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <Sbar />
      <div style={{ height:'3px', background:'#E8622A' }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 32px 0' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#FBE9E0', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'18px' }}>
          <svg width="32" height="28" viewBox="0 0 36 30">
            <path d="M2 15l11 11L34 2" stroke="#E8622A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:'22px', fontWeight:'700', color:'#111', textAlign:'center', marginBottom:'8px' }}>가입 완료!</div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center', lineHeight:'1.75', marginBottom:'24px' }}>
          이호형님, 환영해요.<br />이제 자금을 집행하고 끝까지 관리해보세요.
        </div>
        <div style={{ width:'100%', background:'#F2EFE9', borderRadius:'18px', padding:'16px 18px', marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'#9B9990', fontWeight:'600', marginBottom:'12px' }}>지금 할 수 있는 것 (KYC 2단계)</div>
          {['자금 집행 (외주비·대여금·부동산 등)', 'MY 지갑 충전 · 출금', '자금 받기 · 카드 결제'].map(item => (
            <div key={item} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', fontSize:'12px', color:'#333' }}>
              <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#FBE9E0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="8" height="7" viewBox="0 0 8 7">
                  <path d="M1 3.5l2 2L7 1" stroke="#E8622A" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {item}
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'#C8C5BE' }}>
            <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'#E8E4DC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'10px', color:'#C8C5BE' }}>+</div>
            사업자 인증 시 → 외주비 발신 가능
          </div>
        </div>
      </div>
      <div style={{ padding:'0 24px 44px' }}>
        <button onClick={() => {
            login(userType)
            navigate(userType === 'business' ? '/home-business' : '/home')
          }}
          style={{ width:'100%', height:'52px', background:'#E8622A', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
          시작하기
        </button>
      </div>
    </div>
  )

  // PIN 입력
  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>

      <div style={{ padding:'2px 20px 0', textAlign:'right', fontSize:'11px', color:'#C8C5BE' }}>가입 완료 · 마지막 단계</div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px 0' }}>
        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', textAlign:'center', lineHeight:'1.35', marginBottom:'6px' }}>
          PIN 6자리를<br />설정해주세요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', textAlign:'center' }}>자금 집행 시 사용하는 비밀번호예요</div>
        <Dots count={pin.length} />
      </div>

      <div style={{ flex:1 }} />
      <Keypad onKey={handleKey} />
    </div>
  )
}
