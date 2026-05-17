import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { StatusBar, ExecuteHeader } from '../../components/ExecuteHeader'
import { dialog } from '../../components/Dialog'

// 최근 거래 사업자 (실제는 백엔드)
const RECENT_BUSINESSES = [
  {
    id:'b1', name:'(주)오로라', initial:'오',
    bizNumber:'123-45-67890', representative:'김대표',
    industry:'정보통신업', address:'서울 강남구',
    establishedAt:'2018.03.15', taxType:'일반과세자',
    status:'normal', lastUsedFor:'freelance', lastUsedAt:'3일 전',
  },
  {
    id:'b2', name:'(주)벨라부동산중개', initial:'벨',
    bizNumber:'456-78-90123', representative:'박벨라',
    industry:'부동산 임대', address:'서울 강남구',
    establishedAt:'2020.06.01', taxType:'일반과세자',
    status:'normal', lastUsedFor:'realestate', lastUsedAt:'2주 전',
  },
  {
    id:'b3', name:'파스타하우스 강남점', initial:'파',
    bizNumber:'789-01-23456', representative:'정파스',
    industry:'음식점업', address:'서울 강남구',
    establishedAt:'2022.11.20', taxType:'간이과세자',
    status:'normal', lastUsedFor:'freelance', lastUsedAt:'1개월 전',
  },
]

const PURPOSE_META = {
  freelance:  { title:'외주비',   route:'/execute/personal/freelance',  badge:'출금 가능', badgeColor:'green' },
  realestate: { title:'부동산',   route:'/execute/personal/realestate', badge:'출금 가능', badgeColor:'green' },
}

const PURPOSE_LABEL_MAP = {
  freelance:  '외주비',
  realestate: '임대료·보증금',
}

// 사업자번호 정규화 (123-45-67890 형식)
const formatBizNumber = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0,3)}-${digits.slice(3)}`
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
}

export default function SelectBusiness() {
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()
  const [searchParams] = useSearchParams()
  const purpose = searchParams.get('purpose') || 'freelance'
  const meta = PURPOSE_META[purpose] || PURPOSE_META.freelance

  // mode: 'input' | 'result'
  const [mode, setMode] = useState('input')
  const [bizInput, setBizInput] = useState('')
  const [lookupResult, setLookupResult] = useState(null) // { status:'normal'|'risk', business }

  const bizDigits = bizInput.replace(/\D/g, '')
  const bizValid = bizDigits.length === 10

  const handleBack = () => {
    if (mode === 'result') {
      setMode('input')
      setLookupResult(null)
      return
    }
    navigate('/execute/business')
  }

  const handleClose = async () => {
    const ok = await dialog.confirm({
      title: '나가시겠어요?',
      message: '조회를 멈추고 홈으로 돌아갑니다.',
      okText: '나가기',
      cancelText: '계속 조회',
      destructive: true,
    })
    if (ok) navigate('/home')
  }

  // 사업자 조회 시뮬레이션
  const handleLookup = () => {
    if (!bizValid) return

    // 데모: '234-56-78901'은 폐업 (위험), 그 외는 정상
    if (bizDigits === '2345678901') {
      setLookupResult({
        status: 'risk',
        business: {
          id:`biz-${bizDigits}`,
          name:'(주)한빛홀딩스', initial:'한',
          bizNumber: bizInput,
          representative:'박홀딩',
          industry:'서비스업',
          status:'closed',
          closedAt:'2025.08.31',
          monthsClosed: 8,
          isBusiness: true,
          riskAccepted: false,
        },
      })
    } else {
      // 정상 — 입력값 기반으로 회사 정보 모의
      setLookupResult({
        status: 'normal',
        business: {
          id:`biz-${bizDigits}`,
          name:'(주)오로라', initial:'오',
          bizNumber: bizInput,
          representative:'김대표',
          industry:'정보통신업',
          address:'서울 강남구',
          establishedAt:'2018.03.15',
          taxType:'일반과세자',
          status:'normal',
          isBusiness: true,
          verified: true,
          kyc:'국세청 검증 ✓',
          phone:'02-1234-5678',
        },
      })
    }
    setMode('result')
  }

  // 최근 사업자 클릭 — 정상 가정
  const handleSelectRecent = (biz) => {
    const recipient = {
      ...biz,
      isBusiness: true,
      verified: true,
      kyc:'국세청 검증 ✓',
      phone: biz.phone || '02-0000-0000',
    }
    navigate(meta.route, { state: { recipient } })
  }

  // 결과에서 진행
  const handleProceed = () => {
    if (!lookupResult) return
    const recipient = {
      ...lookupResult.business,
      isBusiness: true,
      verified: lookupResult.status === 'normal',
      riskAccepted: lookupResult.status === 'risk',
      kyc: lookupResult.status === 'normal' ? '국세청 검증 ✓' : '폐업 사업자 (위험 감수)',
      phone: lookupResult.business.phone || '02-0000-0000',
    }
    navigate(meta.route, { state: { recipient } })
  }

  // ──────────────────────────────
  // 결과 화면 — 정상
  // ──────────────────────────────
  if (mode === 'result' && lookupResult?.status === 'normal') {
    const b = lookupResult.business
    return (
      <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
        <StatusBar />
        <ExecuteHeader
          title="사업자 조회 결과"
          onBack={handleBack}
          onClose={handleClose}
        />

        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'0 16px 24px' }}>

          {/* 정상 사업자 카드 */}
          <div style={{ background:'#E6F5EF', border:'1px solid #B5DDC8', borderRadius:'16px', padding:'16px', marginBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" fill="#2A7D5E"/>
                <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:'12px', fontWeight:'700', color:'#085041' }}>정상 사업자 · 국세청 확인</span>
            </div>
            <div style={{ fontSize:'22px', fontWeight:'700', color:'#111', marginBottom:'4px' }}>{b.name}</div>
            <div style={{ fontSize:'13px', color:'#085041' }}>{b.bizNumber}</div>
          </div>

          {/* 회사 정보 */}
          <div style={{ background:'#fff', borderRadius:'16px', border:'0.5px solid #E8E4DC', overflow:'hidden', marginBottom:'14px' }}>
            {[
              { label:'대표자', value: b.representative },
              { label:'업종',   value: b.industry },
              { label:'소재지', value: b.address },
              { label:'개업일', value: b.establishedAt },
              { label:'과세 유형', value: b.taxType },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                padding:'13px 16px', display:'flex', justifyContent:'space-between',
                borderBottom: i < arr.length-1 ? '0.5px solid #E8E4DC' : 'none',
              }}>
                <span style={{ fontSize:'13px', color:'#9B9990' }}>{row.label}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color:'#111' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 자동 처리 */}
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:'600', color:'#555550', marginBottom:'8px' }}>자동 처리</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[
                '세금계산서 자동 발행 가능',
                '증빙 자동 정리 + 세무사 전송',
              ].map(text => (
                <div key={text} style={{
                  background:'#fff', border:'0.5px solid #E8E4DC',
                  borderRadius:'12px', padding:'12px 14px',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
                    <circle cx="7" cy="7" r="6" fill="#2A7D5E"/>
                    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize:'13px', color:'#111', fontWeight:'500' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'11px 14px', background:'#EDF3FA', borderRadius:'12px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65' }}>
            국세청 사업자등록 정보(쿠콘 연동)와 일치 · 부가세 별도 처리 + 자동 증빙 보관
          </div>
        </div>

        <div style={{ padding:'12px 16px 32px', borderTop:'0.5px solid #E8E4DC', background:'#FAF8F5' }}>
          <button onClick={handleProceed}
            style={{ width:'100%', height:'52px', background:'#fff', color:'#111', border:'1.5px solid #111', borderRadius:'16px', fontSize:'15px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
            이 사업자에게 보내기
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────
  // 결과 화면 — 위험 (폐업)
  // ──────────────────────────────
  if (mode === 'result' && lookupResult?.status === 'risk') {
    const b = lookupResult.business
    return (
      <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
        <StatusBar />
        <ExecuteHeader
          title="사업자 조회 결과"
          onBack={handleBack}
          onClose={handleClose}
        />

        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'0 16px 24px' }}>

          {/* 폐업 경고 */}
          <div style={{ background:'#FDECEC', border:'1px solid #F0B8B8', borderRadius:'16px', padding:'16px', marginBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <span style={{ display:'inline-flex', width:'18px', height:'18px', borderRadius:'50%', background:'#D94040', color:'#fff', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700' }}>!</span>
              <span style={{ fontSize:'12px', fontWeight:'700', color:'#A02929' }}>폐업 사업자 · 거래 시 위험</span>
            </div>
            <div style={{ fontSize:'22px', fontWeight:'700', color:'#111', marginBottom:'4px' }}>{b.name}</div>
            <div style={{ fontSize:'12px', color:'#A02929' }}>{b.bizNumber} · {b.closedAt} 폐업</div>
          </div>

          {/* 사업자 정보 */}
          <div style={{ background:'#fff', borderRadius:'16px', border:'0.5px solid #E8E4DC', overflow:'hidden', marginBottom:'14px' }}>
            {[
              { label:'대표자', value: b.representative },
              { label:'업종',   value: b.industry },
              { label:'상태',   value:`폐업 · ${b.monthsClosed}개월 경과`, red:true },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                padding:'13px 16px', display:'flex', justifyContent:'space-between',
                borderBottom: i < arr.length-1 ? '0.5px solid #E8E4DC' : 'none',
              }}>
                <span style={{ fontSize:'13px', color:'#9B9990' }}>{row.label}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color: row.red ? '#D94040' : '#111' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 위험 안내 */}
          <div style={{ background:'#FFF4E0', border:'1px solid #F7D98A', borderRadius:'14px', padding:'14px 16px', marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:'700', color:'#854F0B', marginBottom:'8px' }}>위험 안내</div>
            {[
              '세금계산서 발행 불가',
              '증빙 처리 어려움',
              '사기·자금세탁 의심 거래로 분류될 수 있음',
              '분쟁 발생 시 회수 어려움',
            ].map(text => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:'7px', marginTop:'4px', fontSize:'11px', color:'#854F0B' }}>
                <span style={{ display:'inline-block', width:'3px', height:'3px', background:'#854F0B', borderRadius:'50%', flexShrink:0 }} />
                {text}
              </div>
            ))}
          </div>

          <div style={{ padding:'11px 14px', background:'#EDF3FA', borderRadius:'12px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65' }}>
            <strong style={{ color:'#1E5294' }}>ⓘ</strong> 진행 시 본 거래는 자동으로 모니터링 대상에 등록됩니다. 사업자번호를 다시 확인해주세요.
          </div>
        </div>

        <div style={{ padding:'12px 16px 32px', display:'flex', gap:'8px', borderTop:'0.5px solid #E8E4DC', background:'#FAF8F5' }}>
          <button onClick={handleBack}
            style={{ flex:1, height:'52px', background:'#fff', color:'#555550', border:'0.5px solid #E8E4DC', borderRadius:'16px', fontSize:'14px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit' }}>
            다시 입력
          </button>
          <button onClick={handleProceed}
            style={{ flex:1, height:'52px', background:'#fff', color:'#D94040', border:'1.5px solid #D94040', borderRadius:'16px', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
            위험 감수하고 진행
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────
  // 입력 화면 (디폴트)
  // ──────────────────────────────
  return (
    <div className="phone flex flex-col" style={{ background:'#FAF8F5', paddingTop:'env(safe-area-inset-top)' }}>
      <StatusBar />
      <ExecuteHeader
        title="사업자에게"
        badge={meta.title}
        badgeColor={meta.badgeColor}
        sub="받는 사업자를 조회해주세요"
        onBack={handleBack}
        onClose={handleClose}
      />

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'0 16px 24px' }}>

        {/* 사업자번호 입력 카드 */}
        <div style={{ background:'#fff', border:'0.5px solid #E8E4DC', borderRadius:'16px', padding:'16px', marginBottom:'10px' }}>
          <div style={{ fontSize:'11px', color:'#9B9990', marginBottom:'8px', fontWeight:'500' }}>사업자등록번호</div>
          <input
            type="tel"
            inputMode="numeric"
            value={bizInput}
            onChange={e => setBizInput(formatBizNumber(e.target.value))}
            placeholder="123 - 45 - 67 | 000"
            style={{
              width:'100%', fontSize:'24px', fontWeight:'700', color:'#111',
              background:'transparent', border:'none', outline:'none',
              fontFamily:'inherit', padding:'0', letterSpacing:'1px',
              marginBottom:'4px',
            }}
          />
          <div style={{ fontSize:'11px', color:'#9B9990' }}>
            10자리 입력 ({bizDigits.length}/10)
          </div>
        </div>

        <div style={{ padding:'10px 14px', background:'#EDF3FA', borderRadius:'12px', fontSize:'11px', color:'#2D6BB0', lineHeight:'1.65', marginBottom:'18px' }}>
          <strong style={{ color:'#1E5294' }}>ⓘ</strong> 국세청 사업자등록 정보를 통해 진위와 상태를 실시간 확인합니다 (쿠콘 연동)
        </div>

        {/* 최근 거래 사업자 */}
        <div style={{ fontSize:'11px', fontWeight:'600', color:'#9B9990', marginBottom:'8px' }}>최근 거래 사업자</div>
        <div style={{ background:'#fff', borderRadius:'14px', border:'0.5px solid #E8E4DC', overflow:'hidden', marginBottom:'14px' }}>
          {RECENT_BUSINESSES.map((b, i) => {
            const isSamePurpose = b.lastUsedFor === purpose
            return (
              <button key={b.id}
                onClick={() => handleSelectRecent(b)}
                style={{
                  width:'100%', padding:'14px 14px',
                  background:'#fff', border:'none',
                  borderBottom: i < RECENT_BUSINESSES.length-1 ? '0.5px solid #E8E4DC' : 'none',
                  display:'flex', alignItems:'center', gap:'12px',
                  cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'9px', background:'#E6F5EF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'#085041', flexShrink:0 }}>
                  {b.initial}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'3px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'14px', fontWeight:'700', color:'#111' }}>{b.name}</span>
                    {isSamePurpose && (
                      <span style={{ display:'inline-block', padding:'1px 5px', background:'#E6F5EF', color:'#085041', borderRadius:'3px', fontSize:'9px', fontWeight:'700' }}>
                        {meta.title} 거래
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'11px', color:'#9B9990' }}>
                    {b.bizNumber} · {b.industry}
                  </div>
                </div>
                <span style={{ fontSize:'11px', color:'#C8C5BE', flexShrink:0 }}>{b.lastUsedAt}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding:'12px 16px 32px', borderTop:'0.5px solid #E8E4DC', background:'#FAF8F5' }}>
        <button
          onClick={handleLookup}
          disabled={!bizValid}
          style={{
            width:'100%', height:'52px',
            background: bizValid ? '#111' : '#E8E4DC',
            color:'#FAF8F5', border:'none', borderRadius:'16px',
            fontSize:'15px', fontWeight:'600',
            cursor: bizValid ? 'pointer' : 'default',
            fontFamily:'inherit',
          }}>
          {bizValid ? '조회하기' : '사업자번호 10자리를 입력하세요'}
        </button>
      </div>
    </div>
  )
}
