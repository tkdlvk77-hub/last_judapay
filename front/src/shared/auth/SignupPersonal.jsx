import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStatusBarStyle } from '../../native/useStatusBarStyle'

const S = { // 인라인 스타일 공통
  sbar: { display:'flex', justifyContent:'space-between', padding:'14px 22px 6px', fontSize:'12px', fontWeight:'600', color:'#111' },
  backRow: { display:'flex', alignItems:'center', gap:'4px', padding:'4px 16px 16px' },
  backBtn: { width:'32px', height:'32px', background:'none', border:'none', fontSize:'22px', color:'#9B9990', cursor:'pointer', padding:'0' },
  title: { fontSize:'21px', fontWeight:'700', color:'#111', lineHeight:'1.35', marginBottom:'6px' },
  sub: { fontSize:'13px', color:'#9B9990', marginBottom:'24px' },
  noticeInfo: { background:'#EDF3FA', borderRadius:'12px', padding:'12px 14px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65', marginBottom:'18px' },
  noticeSuccess: { background:'#E6F5EF', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#085041', marginBottom:'16px' },
  fieldLabel: { fontSize:'11px', color:'#9B9990', fontWeight:'500', marginBottom:'5px' },
  fieldBox: { height:'50px', border:'1.5px solid #111', borderRadius:'14px', padding:'0 16px', background:'#fff', display:'flex', alignItems:'center', fontSize:'15px', color:'#111' },
  btn: { width:'100%', height:'52px', background:'#111', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' },
}

function StepBar({ current, total, color = '#111' }) {
  return (
    <div style={{ display:'flex', gap:'4px', marginBottom:'24px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: i < current ? color : '#E8E4DC' }} />
      ))}
    </div>
  )
}

export default function SignupPersonal() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [authLoading, setAuthLoading] = useState(false)
  const [authDone, setAuthDone] = useState(false)

  // cream 배경 화면 — 상태바 글자 검정
  useStatusBarStyle('dark')

  const doAuth = () => {
    setAuthLoading(true)
    setTimeout(() => {
      setAuthLoading(false)
      setAuthDone(true)
      setTimeout(() => setStep(2), 600)
    }, 1800)
  }

  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={S.backRow}>
        <button style={S.backBtn} onClick={() => navigate('/')}>‹</button>
        <span style={{ fontSize:'15px', fontWeight:'700', color:'#111' }}>개인 가입</span>
      </div>

      <div style={{ padding:'0 24px', flex:1 }}>
        <div style={{ textAlign:'right', fontSize:'11px', color:'#C8C5BE', marginBottom:'4px' }}>{step}/3</div>
        <StepBar current={step} total={3} />

        {/* 1단계 - 본인확인 */}
        {step === 1 && <>
          <div style={S.title}>휴대폰으로<br />본인 확인을 해주세요</div>
          <div style={S.sub}>KCB 본인인증을 통해 안전하게 처리됩니다</div>
          <div style={S.noticeInfo}>
            아래 버튼을 누르면 KCB 인증 페이지가 열립니다.<br />인증 완료 후 자동으로 다음 단계로 넘어가요.
          </div>
          <button
            onClick={doAuth}
            disabled={authDone || authLoading}
            style={{
              width:'100%', height:'52px',
              background: authDone ? '#E6F5EF' : '#F2EFE9',
              border: authDone ? '1px solid #2A7D5E' : '1px solid #E8E4DC',
              borderRadius:'14px', fontSize:'14px', fontWeight:'500',
              color: authDone ? '#2A7D5E' : '#555550',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:'inherit',
              opacity: authLoading ? 0.7 : 1,
            }}>
            {authLoading ? (
              <span>인증 페이지 연결 중...</span>
            ) : authDone ? (
              <>
                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                  <path d="M1 6l4 4L13 1" stroke="#2A7D5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                인증 완료
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9B9990" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <circle cx="12" cy="17" r="1" fill="#9B9990"/>
                </svg>
                <span>휴대폰 본인인증 하기</span>
                <span style={{ color:'#C8C5BE', marginLeft:'auto' }}>→</span>
              </>
            )}
          </button>
          <div style={{ background:'#F2EFE9', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#9B9990', marginTop:'12px' }}>
            본인인증 정보는 저장되지 않으며, 인증 결과만 전달됩니다
          </div>
        </>}

        {/* 2단계 - 계좌연결 */}
        {step === 2 && <>
          <div style={S.title}>출금 계좌를<br />연결해주세요</div>
          <div style={S.sub}>1원 인증으로 본인 계좌를 확인해요</div>

          <div style={S.noticeSuccess}>
            ✓ &nbsp;본인인증 완료 &nbsp;·&nbsp; 이호형 · 010-1234-5678
          </div>

          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>은행</div>
            <div style={{ ...S.fieldBox, justifyContent:'space-between' }}>
              <span>국민은행</span><span style={{ color:'#C8C5BE', fontSize:'13px' }}>›</span>
            </div>
          </div>

          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>계좌번호</div>
            <div style={S.fieldBox}>123-45-678901</div>
          </div>

          <div style={{ background:'#E6F5EF', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#085041', marginBottom:'12px' }}>
            ✓ 예금주 이호형 확인 완료 · 입금자명 숫자: <strong>3729</strong>
          </div>

          <div>
            <div style={S.fieldLabel}>입금자명 숫자 4자리</div>
            <div style={{ height:'50px', border:'1.5px solid #E8622A', borderRadius:'14px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:'700', color:'#E8622A', letterSpacing:'10px' }}>
              3729
            </div>
          </div>
        </>}
      </div>

      {step === 2 && (
        <div style={{ padding:'12px 24px 32px' }}>
          <button onClick={() => navigate('/signup/pin?type=personal')} style={S.btn}>다음</button>
        </div>
      )}
    </div>
  )
}
