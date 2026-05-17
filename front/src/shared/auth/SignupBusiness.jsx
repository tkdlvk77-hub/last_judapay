import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Sbar = () => null

function BackRow({ title, onBack }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 16px 16px' }}>
      <button onClick={onBack} style={{ width:'32px', height:'32px', background:'none', border:'none', fontSize:'22px', color:'#9B9990', cursor:'pointer', padding:'0' }}>‹</button>
      <span style={{ fontSize:'15px', fontWeight:'700', color:'#111' }}>{title}</span>
    </div>
  )
}

function StepBar({ current, total }) {
  return (
    <div style={{ display:'flex', gap:'4px', marginBottom:'24px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: i < current ? '#0C447C' : '#E8E4DC' }} />
      ))}
    </div>
  )
}

export default function SignupBusiness() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [bizType, setBizType] = useState('individual') // individual | corporation
  const [authLoading, setAuthLoading] = useState(false)
  const [authDone, setAuthDone] = useState(false)

  const doAuth = () => {
    setAuthLoading(true)
    setTimeout(() => {
      setAuthLoading(false)
      setAuthDone(true)
      setTimeout(() => navigate('/signup/pin?type=business'), 600)
    }, 1800)
  }

  // 1단계 — 사업자 확인
  if (step === 1) return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <Sbar />
      <BackRow title="기업 가입" onBack={() => navigate('/')} />
      <div style={{ padding:'0 24px', flex:1, overflowY:'auto' }}>

        <div style={{ textAlign:'right', fontSize:'11px', color:'#C8C5BE', marginBottom:'4px' }}>1/2</div>
        <StepBar current={1} total={2} />

        {/* 기업 가입 뱃지 */}
        <div style={{ display:'inline-block', padding:'2px 8px', background:'#EDF3FA', color:'#0C447C', borderRadius:'6px', fontSize:'10px', fontWeight:'600', marginBottom:'8px' }}>
          기업 가입
        </div>

        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', lineHeight:'1.35', marginBottom:'6px' }}>
          사업자등록번호를<br />입력해주세요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', marginBottom:'20px' }}>
          국세청에서 자동으로 사업자 정보를 확인해요
        </div>

        {/* 개인/법인 선택 */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <button
            onClick={() => setBizType('individual')}
            style={{ flex:1, height:'44px', borderRadius:'12px', border: bizType === 'individual' ? '1.5px solid #0C447C' : '1px solid #E8E4DC', background: bizType === 'individual' ? '#EDF3FA' : '#F2EFE9', fontSize:'13px', fontWeight:'600', color: bizType === 'individual' ? '#0C447C' : '#9B9990', cursor:'pointer', fontFamily:'inherit' }}>
            개인사업자
          </button>
          <button
            onClick={() => setBizType('corporation')}
            style={{ flex:1, height:'44px', borderRadius:'12px', border: bizType === 'corporation' ? '1.5px solid #0C447C' : '1px solid #E8E4DC', background: bizType === 'corporation' ? '#EDF3FA' : '#F2EFE9', fontSize:'13px', fontWeight:'600', color: bizType === 'corporation' ? '#0C447C' : '#9B9990', cursor:'pointer', fontFamily:'inherit' }}>
            법인사업자
          </button>
        </div>

        {/* 사업자번호 입력 */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'#9B9990', fontWeight:'500', marginBottom:'5px' }}>사업자등록번호</div>
          <div style={{ height:'50px', border:'1.5px solid #111', borderRadius:'14px', padding:'0 16px', background:'#fff', display:'flex', alignItems:'center', fontSize:'17px', color:'#111', letterSpacing:'1px' }}>
            123-45-67890
          </div>
        </div>

        {/* 조회 완료 */}
        <div style={{ background:'#E6F5EF', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#085041', marginBottom:'12px' }}>
          ✓ 국세청 조회 완료 (쿠콘)<br />
          <span style={{ opacity:.85 }}>㈜주다컴퍼니 · 대표자 이호형 · 정상 영업 중</span>
        </div>

        {/* 조회 결과 카드 */}
        <div style={{ background:'#F2EFE9', borderRadius:'14px', padding:'14px 16px', marginBottom:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color:'#9B9990' }}>상호명</span>
            <span style={{ color:'#111', fontWeight:'500' }}>㈜주다컴퍼니</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color:'#9B9990' }}>대표자</span>
            <span style={{ color:'#111', fontWeight:'500' }}>이호형</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color:'#9B9990' }}>업태/업종</span>
            <span style={{ color:'#111', fontWeight:'500' }}>서비스업 / 소프트웨어</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
            <span style={{ color:'#9B9990' }}>사업자 상태</span>
            <span style={{ color:'#2A7D5E', fontWeight:'500' }}>정상</span>
          </div>
        </div>

        <div style={{ background:'#EDF3FA', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.6', marginBottom:'16px' }}>
          다음 단계에서 대표자 명의 휴대폰으로 인증합니다.<br />
          사업자 도용 방지를 위해 대표자 명의 휴대폰으로만 인증 가능합니다.
        </div>
      </div>

      <div style={{ padding:'12px 24px 32px' }}>
        <button onClick={() => setStep(2)}
          style={{ width:'100%', height:'52px', background:'#0C447C', color:'#FAF8F5', border:'none', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
          다음 — 대표자 인증
        </button>
      </div>
    </div>
  )

  // 2단계 — 대표자 인증
  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <Sbar />
      <BackRow title="기업 가입" onBack={() => setStep(1)} />
      <div style={{ padding:'0 24px', flex:1 }}>

        <div style={{ textAlign:'right', fontSize:'11px', color:'#C8C5BE', marginBottom:'4px' }}>2/2</div>
        <StepBar current={2} total={2} />

        <div style={{ display:'inline-block', padding:'2px 8px', background:'#EDF3FA', color:'#0C447C', borderRadius:'6px', fontSize:'10px', fontWeight:'600', marginBottom:'8px' }}>
          기업 가입
        </div>

        <div style={{ fontSize:'21px', fontWeight:'700', color:'#111', lineHeight:'1.35', marginBottom:'6px' }}>
          대표자 본인<br />인증이 필요해요
        </div>
        <div style={{ fontSize:'13px', color:'#9B9990', marginBottom:'20px' }}>
          사업자 도용 방지를 위해 대표자 명의 휴대폰으로 인증합니다
        </div>

        {/* 조회된 대표자 정보 */}
        <div style={{ background:'#F2EFE9', borderRadius:'14px', padding:'13px 16px', marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'#9B9990', fontWeight:'600', marginBottom:'8px' }}>조회된 대표자 정보</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px' }}>
            <span style={{ color:'#9B9990' }}>상호명</span>
            <span style={{ color:'#111', fontWeight:'500' }}>㈜주다컴퍼니</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
            <span style={{ color:'#9B9990' }}>대표자명</span>
            <span style={{ color:'#111', fontWeight:'500' }}>이호형</span>
          </div>
        </div>

        {/* 인증 버튼 */}
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
            marginBottom:'16px', opacity: authLoading ? 0.7 : 1,
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
              <span>대표자 휴대폰 본인인증 하기</span>
              <span style={{ color:'#C8C5BE', marginLeft:'auto' }}>→</span>
            </>
          )}
        </button>

        {/* 이메일 (선택) */}
        <div style={{ marginBottom:'12px' }}>
          <div style={{ fontSize:'11px', color:'#9B9990', fontWeight:'500', marginBottom:'5px' }}>사업자 이메일 (선택)</div>
          <div style={{ height:'48px', border:'1px solid #E8E4DC', borderRadius:'14px', padding:'0 16px', background:'#F2EFE9', display:'flex', alignItems:'center', fontSize:'14px', color:'#C8C5BE' }}>
            ceo@company.com
          </div>
          <div style={{ fontSize:'10px', color:'#C8C5BE', marginTop:'4px', paddingLeft:'2px' }}>
            입력 시 이메일로도 월간 보고서를 받을 수 있어요
          </div>
        </div>

        {/* 경고 */}
        <div style={{ background:'#FFF4E0', borderRadius:'12px', padding:'11px 14px', fontSize:'11px', color:'#C8821A', lineHeight:'1.6' }}>
          대표자 명의 휴대폰이 아니면 인증이 불가합니다.<br />
          타인의 사업자번호 도용은 전자금융거래법 위반입니다.
        </div>
      </div>
    </div>
  )
}
