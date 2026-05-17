import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useStepHistory } from '../hooks/useStepHistory'
import { dialog } from '../components/Dialog'

// 단계 오버레이 공통 스타일
const STEP_STYLE = {
  position:'absolute', inset:0, zIndex:0,
  display:'flex', flexDirection:'column',
  background: COLORS.bg,
}

// ─── 분쟁 유형 ────────────────────────────────────────────
const DISPUTE_TYPES = [
  {
    id: 'freelance_quality',
    emoji: '🖥️',
    title: '외주 납품물 품질',
    sub: '결과물이 계약 스펙과 다름',
    color: '#7C3AED',
    bg: '#EDE9FE',
    checklist: [
      '계약서에 명시된 기능/디자인이 누락됨',
      '수정 요청을 기한 내 반영하지 않음',
      '계약 외 추가 비용을 요구함',
      '납품물 자체를 전달하지 않음',
    ],
    bizModel: {
      type: 'mediation',
      label: '⚖️ 중재 서비스 신청',
      desc: '주다페이 전문 중재인이 계약서와 납품물을 검토해 중재안을 제시해요.',
      fee: '분쟁 금액의 1% · 합의 시 환급',
    },
  },
  {
    id: 'freelance_nonpayment',
    emoji: '💸',
    title: '외주비 미지급 / 검수 거부',
    sub: '납품 완료 후 대금을 안 줌',
    color: '#DC2626',
    bg: '#FEE2E2',
    checklist: [
      '납품했으나 발주자가 검수를 계속 거부함',
      '검수 완료 후에도 자금 집행을 안 함',
      '연락이 두절됨',
      '계약을 일방적으로 파기함',
    ],
    bizModel: {
      type: 'mediation',
      label: '⚖️ 중재 서비스 신청',
      desc: '납품 증거 + 계약서로 중재안 제시. 자동 승인 타이머 일시 중지도 신청할 수 있어요.',
      fee: '분쟁 금액의 1% · 합의 시 환급',
    },
  },
  {
    id: 'lend_nonrepayment',
    emoji: '📋',
    title: '빌려준 돈 미상환',
    sub: '차용인이 이자/원금을 안 갚음',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    checklist: [
      '이자 납부일을 지키지 않음',
      '원금 만기일이 지났으나 상환하지 않음',
      '연락이 두절됨',
      '상환 의사를 명확히 거부함',
    ],
    bizModel: {
      type: 'attachment',
      label: '🔒 가압류 공탁 대행 신청',
      desc: '주다페이가 신탁예치금으로 공탁금을 대신 납부하고 가압류를 진행해드려요. 채권 회수 후 수수료를 정산합니다.',
      fee: '원금의 2~3% (성공 보수)',
      minAmount: 10000000,
    },
  },
  {
    id: 'realestate',
    emoji: '🏠',
    title: '부동산 보증금 분쟁',
    sub: '보증금 미반환 / 계약 위반',
    color: '#059669',
    bg: '#D1FAE5',
    checklist: [
      '계약 만료 후 보증금을 돌려주지 않음',
      '임대인이 계약을 일방 파기함',
      '월세 자동 차감 오류 발생',
      '등기부와 다른 조건으로 계약을 유도함',
    ],
    bizModel: {
      type: 'legal',
      label: '⚖️ 전문 법무법인 연결',
      desc: '부동산 전문 변호사와 연결해드려요. 주다페이 거래 증거가 자동 제공되어 선임 비용이 절감됩니다.',
      fee: '법무법인 선임료 기준 (레퍼럴)',
    },
  },
  {
    id: 'fund_misuse',
    emoji: '🎯',
    title: '자금 지원 / 권한 자금 오용',
    sub: '지정 목적 외 사용',
    color: '#D97706',
    bg: '#FEF3C7',
    checklist: [
      '지원 목적 외 카테고리에 지출함',
      'MCC 차단을 우회하려는 시도',
      '정기 보고서를 제출하지 않음',
      '연락이 두절됨',
    ],
    bizModel: null,
  },
  {
    id: 'card_fraud',
    emoji: '🚨',
    title: '카드 결제 도용 / 부정 결제',
    sub: '본인이 하지 않은 결제',
    color: '#B91C1C',
    bg: '#FEE2E2',
    checklist: [
      '본인이 하지 않은 결제가 발생함',
      '분실/도난 후 타인이 결제함',
      '가맹점 환불을 거부함',
    ],
    bizModel: null,
  },
]

// ─── 데모 거래 목록 ───────────────────────────────────────
const DEMO_TRANSACTIONS = [
  {
    id: 'txn_freelance_1',
    type: 'freelance',
    name: '㈜오로라 · 디자인 외주',
    amount: 500000,
    date: '2026.05.01',
    status: '검수 대기',
    hasContract: true,
    hasMessages: true,
  },
  {
    id: 'txn_lend_1',
    type: 'lend',
    name: '박민준 · 빌려준 돈',
    amount: 1000000,
    date: '2026.05.04',
    status: '상환 대기',
    hasContract: true,
    hasMessages: true,
  },
  {
    id: 'txn_invest_1',
    type: 'invest',
    name: '김스타트업 · 자금 지원',
    amount: 3000000,
    date: '2026.04.20',
    status: '집행 완료',
    hasContract: true,
    hasMessages: false,
  },
  {
    id: 'txn_realestate_1',
    type: 'realestate',
    name: '강남 역삼동 오피스텔 · 전세',
    amount: 150000000,
    date: '2026.04.01',
    status: '계약 중',
    hasContract: true,
    hasMessages: false,
  },
]

// ─── 공통 헤더 ────────────────────────────────────────────
function Header({ onBack, step, totalSteps, title, sub }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background: theme.headerSolid, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'16px', paddingLeft:'16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: step ? '14px' : '0' }}>
        <button onClick={onBack}
          style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>분쟁 신고</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>거래 분쟁 접수 및 관리</div>
        </div>
        {step && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{step} / {totalSteps}</span>}
      </div>
      {step && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < step ? '#fff' : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
      )}
      {title && (
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: '4px' }}>{title}</div>
          {sub && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{sub}</div>}
        </div>
      )}
    </div>
  )
}

// ─── 1단계: 분쟁 유형 선택 ───────────────────────────────
function Step1({ onSelect, onBack }) {
  return (
    <>
      <Header onBack={onBack} step={1} totalSteps={4}
        title="어떤 분쟁인가요?" sub="유형을 선택하면 맞춤 절차로 안내해드려요" />
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
        {DISPUTE_TYPES.map(t => (
          <button key={t.id} onClick={() => onSelect(t)}
            style={{
              width:'100%', background: COLORS.bgCard, boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg, padding:'14px 16px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:'10px',
            }}>
            <div style={{
              width:'42px', height:'42px', borderRadius: RADIUS.md,
              background: t.bg, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px',
            }}>
              {t.emoji}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'2px' }}>{t.title}</div>
              <div style={{ fontSize:'11px', color: COLORS.t3 }}>{t.sub}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>
    </>
  )
}

// ─── 2단계: 거래 선택 ────────────────────────────────────
function Step2({ type, onBack, onNext }) {
  const theme = getAccountTheme()
  const [selectedId, setSelectedId] = useState(null)

  // 유형과 관련된 거래만 필터 (실제로는 type별로 필터링)
  const relevantTxns = DEMO_TRANSACTIONS

  return (
    <>
      <Header onBack={onBack} step={2} totalSteps={4}
        title="관련 거래를 선택하세요" sub="선택한 거래의 계약서·메시지·결제 내역이 자동 첨부됩니다" />
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 0' }}>

        {/* 자동 첨부 안내 */}
        <div style={{
          padding:'12px 14px', background:'#EDF3FA',
          borderRadius: RADIUS.md, marginBottom:'16px',
          fontSize:'11px', color:'#1E5294', lineHeight:1.6,
        }}>
          🔒 주다페이는 모든 거래 증거를 자동 보관해요. 별도 캡처 없이 자동 첨부됩니다.
        </div>

        {relevantTxns.map(txn => (
          <button key={txn.id} onClick={() => setSelectedId(txn.id)}
            style={{
              width:'100%', background: COLORS.bgCard,
              border: selectedId === txn.id ? `1.5px solid ${theme.brand}` : `1.5px solid transparent`,
              boxShadow: SHADOWS.card,
              borderRadius: RADIUS.lg, padding:'14px 16px',
              display:'flex', alignItems:'center', gap:'12px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:'10px',
            }}>
            <div style={{
              width:'20px', height:'20px', borderRadius:'50%',
              border: selectedId === txn.id ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`,
              background: COLORS.bgCard, flexShrink:0, transition:'all .15s',
            }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
                <span style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>{txn.name}</span>
                <span style={{ fontSize:'13px', fontWeight:700, color: theme.brand }}>
                  {txn.amount.toLocaleString()}원
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'10px', color: COLORS.t4 }}>
                <span>{txn.date}</span>
                <span>·</span>
                <span>{txn.status}</span>
              </div>
              {/* 자동 첨부 배지 */}
              <div style={{ display:'flex', gap:'4px', marginTop:'6px', flexWrap:'wrap' }}>
                {txn.hasContract && (
                  <span style={{ padding:'2px 7px', background:'#D1FAE5', color:'#047857', borderRadius:'4px', fontSize:'9px', fontWeight:700 }}>✓ 계약서</span>
                )}
                <span style={{ padding:'2px 7px', background:'#D1FAE5', color:'#047857', borderRadius:'4px', fontSize:'9px', fontWeight:700 }}>✓ 거래 원장</span>
                {txn.hasMessages && (
                  <span style={{ padding:'2px 7px', background:'#D1FAE5', color:'#047857', borderRadius:'4px', fontSize:'9px', fontWeight:700 }}>✓ 메시지</span>
                )}
              </div>
            </div>
          </button>
        ))}

        <div style={{ fontSize:'11px', color: COLORS.t4, textAlign:'center', padding:'8px 0 24px' }}>
          목록에 없는 거래라면 고객센터에 문의해주세요
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard }}>
        <button onClick={() => selectedId && onNext(relevantTxns.find(t => t.id === selectedId))}
          disabled={!selectedId}
          style={{
            width:'100%', height:'52px',
            background: selectedId ? theme.brand : COLORS.bgMuted,
            color: selectedId ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: selectedId ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: selectedId ? SHADOWS.buttonBrand : 'none',
          }}>
          다음 (내용 작성)
        </button>
      </div>
    </>
  )
}

// ─── 3단계: 내용 작성 ────────────────────────────────────
function Step3({ type, txn, onBack, onNext }) {
  const theme = getAccountTheme()
  const [checked, setChecked] = useState([])
  const [desc, setDesc] = useState('')
  const [wantFreeze, setWantFreeze] = useState(false)
  const [files, setFiles] = useState([])

  const toggle = (item) => setChecked(c => c.includes(item) ? c.filter(x => x !== item) : [...c, item])
  const valid = desc.trim().length > 0

  // 자금 동결 표시 조건 (검수 대기 + 외주 관련)
  const showFreezeOption = txn.status === '검수 대기' ||
    type.id === 'lend_nonrepayment' || type.id === 'realestate'

  return (
    <>
      <Header onBack={onBack} step={3} totalSteps={4}
        title="분쟁 내용을 알려주세요" sub="해당하는 항목을 모두 선택하세요" />
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>

        {/* 체크리스트 */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'10px', padding:'0 4px' }}>
            해당 항목 (복수 선택 가능)
          </div>
          <div style={{
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg, overflow:'hidden',
          }}>
            {type.checklist.map((item, i, arr) => (
              <button key={i} onClick={() => toggle(item)}
                style={{
                  width:'100%', padding:'13px 16px',
                  background: checked.includes(item) ? `${type.bg}` : COLORS.bgCard,
                  border:'none',
                  borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
                  display:'flex', alignItems:'center', gap:'12px',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                <div style={{
                  width:'20px', height:'20px', borderRadius:'4px', flexShrink:0,
                  background: checked.includes(item) ? type.color : 'transparent',
                  border: checked.includes(item) ? `2px solid ${type.color}` : `2px solid ${COLORS.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .15s',
                }}>
                  {checked.includes(item) && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize:'13px', color: COLORS.t1, lineHeight:1.4 }}>{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 자유 입력 */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            상세 내용 <span style={{ color: COLORS.danger }}>*</span>
          </div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="구체적인 상황을 설명해주세요. 날짜, 금액, 상대방 발언 등 최대한 상세히 적을수록 처리에 도움이 됩니다."
            rows={5}
            style={{
              width:'100%', padding:'12px 14px',
              background: COLORS.bgCard, boxShadow: SHADOWS.card,
              border:'none', borderRadius: RADIUS.lg,
              fontSize:'13px', color: COLORS.t1, lineHeight:1.6,
              outline:'none', fontFamily:'inherit', resize:'none',
              boxSizing:'border-box',
            }}
          />
          <div style={{ textAlign:'right', fontSize:'10px', color: COLORS.t4, marginTop:'4px', paddingRight:'4px' }}>
            {desc.length}자
          </div>
        </div>

        {/* 추가 파일 첨부 */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color: COLORS.t3, marginBottom:'8px', padding:'0 4px' }}>
            추가 첨부 (선택)
          </div>
          <button style={{
            width:'100%', height:'48px',
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            border:`1.5px dashed ${COLORS.border}`, borderRadius: RADIUS.lg,
            fontSize:'12px', color: COLORS.t3, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            사진 · 영상 · 문서 추가
          </button>
          <div style={{ fontSize:'10px', color: COLORS.t4, marginTop:'4px', padding:'0 4px' }}>
            주다페이 자동 첨부 외에 추가 증거가 있으면 첨부하세요
          </div>
        </div>

        {/* 자금 동결 신청 옵션 */}
        {showFreezeOption && (
          <div style={{
            background: COLORS.bgCard, boxShadow: SHADOWS.card,
            borderRadius: RADIUS.lg, padding:'14px 16px', marginBottom:'18px',
          }}>
            <button onClick={() => setWantFreeze(f => !f)}
              style={{
                width:'100%', background:'transparent', border:'none',
                display:'flex', alignItems:'flex-start', gap:'12px',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
              <div style={{
                width:'22px', height:'22px', borderRadius:'4px', flexShrink:0, marginTop:'1px',
                background: wantFreeze ? '#DC2626' : 'transparent',
                border: wantFreeze ? '2px solid #DC2626' : `2px solid ${COLORS.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all .15s',
              }}>
                {wantFreeze && (
                  <svg width="12" height="10" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, marginBottom:'3px' }}>
                  자금 일시 동결 신청
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t3, lineHeight:1.5 }}>
                  분쟁 처리 중 자금이 인출되지 않도록 요청해요.<br />
                  양측 동의 또는 법원 명령 시 처리됩니다.
                </div>
              </div>
            </button>
            {wantFreeze && (
              <div style={{
                marginTop:'10px', padding:'10px 12px',
                background:'#FEF2F2', borderRadius: RADIUS.sm,
                fontSize:'11px', color:'#B91C1C', lineHeight:1.5,
              }}>
                ⚠ 동결 신청은 상대방에게 즉시 알림이 발송됩니다. 허위 신청 시 법적 책임이 발생할 수 있어요.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard }}>
        <button onClick={() => valid && onNext({ checked, desc, wantFreeze })}
          disabled={!valid}
          style={{
            width:'100%', height:'52px',
            background: valid ? theme.brand : COLORS.bgMuted,
            color: valid ? '#fff' : COLORS.t4,
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor: valid ? 'pointer' : 'default',
            fontFamily:'inherit',
            boxShadow: valid ? SHADOWS.buttonBrand : 'none',
          }}>
          다음 (증거 확인)
        </button>
      </div>
    </>
  )
}

// ─── 4단계: 증거 패키지 확인 + 비즈니스 모델 진입점 ──────
function Step4({ type, txn, content, onBack, onSubmit }) {
  const theme = getAccountTheme()
  const [showBizModel, setShowBizModel] = useState(false)

  const autoEvidence = [
    { label:'거래 원장', detail:'금액·일시·상태 타임스탬프', icon:'📊' },
    ...(txn.hasContract ? [{ label:'계약서 원본', detail:'모두싸인 서명 포함', icon:'📄' }] : []),
    ...(txn.hasMessages ? [{ label:'앱 내 메시지', detail:'전체 대화 이력', icon:'💬' }] : []),
    { label:'MCC 결제 로그', detail:'차단/승인 내역 전체', icon:'🔍' },
    ...(content.wantFreeze ? [{ label:'자금 동결 신청서', detail:'자동 생성', icon:'🔒' }] : []),
  ]

  return (
    <>
      <Header onBack={onBack} step={4} totalSteps={4}
        title="증거 패키지 확인" sub="아래 자료가 자동으로 첨부됩니다" />
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>

        {/* 자동 첨부 증거 */}
        <div style={{
          background: COLORS.bgCard, boxShadow: SHADOWS.card,
          borderRadius: RADIUS.lg, overflow:'hidden', marginBottom:'14px',
        }}>
          <div style={{
            padding:'12px 16px',
            background:'#ECFDF5',
            borderBottom:`1px solid ${COLORS.borderSoft}`,
            fontSize:'12px', fontWeight:700, color:'#047857',
            display:'flex', alignItems:'center', gap:'6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            자동 첨부 증거 {autoEvidence.length}건
          </div>
          {autoEvidence.map((e, i, arr) => (
            <div key={i} style={{
              padding:'12px 16px',
              borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
              display:'flex', alignItems:'center', gap:'12px',
            }}>
              <span style={{ fontSize:'18px' }}>{e.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color: COLORS.t1 }}>{e.label}</div>
                <div style={{ fontSize:'10px', color: COLORS.t4 }}>{e.detail}</div>
              </div>
              <span style={{ fontSize:'10px', color:'#047857', fontWeight:700 }}>자동 첨부</span>
            </div>
          ))}
        </div>

        {/* 선택한 분쟁 내용 요약 */}
        <div style={{
          background: COLORS.bgCard, boxShadow: SHADOWS.card,
          borderRadius: RADIUS.lg, padding:'14px 16px', marginBottom:'14px',
        }}>
          <div style={{ fontSize:'11px', fontWeight:700, color: COLORS.t4, marginBottom:'10px' }}>신고 내용 요약</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color: COLORS.t4 }}>분쟁 유형</span>
            <span style={{ color: COLORS.t1, fontWeight:600 }}>{type.title}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color: COLORS.t4 }}>관련 거래</span>
            <span style={{ color: COLORS.t1, fontWeight:600 }}>{txn.name}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
            <span style={{ color: COLORS.t4 }}>금액</span>
            <span style={{ color: theme.brand, fontWeight:700 }}>{txn.amount.toLocaleString()}원</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
            <span style={{ color: COLORS.t4 }}>선택 항목</span>
            <span style={{ color: COLORS.t1, fontWeight:600 }}>{content.checked.length}개</span>
          </div>
          {content.wantFreeze && (
            <div style={{
              marginTop:'10px', padding:'7px 10px',
              background:'#FEE2E2', borderRadius: RADIUS.sm,
              fontSize:'11px', color:'#B91C1C', fontWeight:600,
            }}>
              🔒 자금 동결 신청 포함
            </div>
          )}
        </div>

        {/* 비즈니스 모델 진입점 */}
        {type.bizModel && (
          <div style={{
            background: type.bg,
            borderRadius: RADIUS.lg,
            padding:'14px 16px', marginBottom:'14px',
            border: `1px solid ${type.color}30`,
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px', marginBottom:'8px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: type.color, marginBottom:'4px' }}>
                  {type.bizModel.label}
                </div>
                <div style={{ fontSize:'11px', color: COLORS.t2, lineHeight:1.55 }}>
                  {type.bizModel.desc}
                </div>
              </div>
            </div>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              paddingTop:'8px', borderTop:`1px solid ${type.color}20`,
            }}>
              <span style={{ fontSize:'11px', color: type.color, fontWeight:600 }}>
                💰 {type.bizModel.fee}
              </span>
              <button onClick={() => setShowBizModel(true)}
                style={{
                  padding:'6px 14px',
                  background: type.color, color:'#fff',
                  border:'none', borderRadius: RADIUS.md,
                  fontSize:'12px', fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                신청하기
              </button>
            </div>
            {type.bizModel.minAmount && txn.amount < type.bizModel.minAmount && (
              <div style={{
                marginTop:'8px', fontSize:'10px', color: COLORS.t4,
                padding:'6px 10px', background:'rgba(255,255,255,0.6)', borderRadius: RADIUS.sm,
              }}>
                ⓘ 가압류 공탁 대행은 1천만원 이상 거래에 해당합니다 (현재 거래 {txn.amount.toLocaleString()}원)
              </div>
            )}
          </div>
        )}

        {/* 법적 고지 */}
        <div style={{
          padding:'12px 14px', background:'#FFFBEB',
          borderRadius: RADIUS.md, marginBottom:'8px',
          fontSize:'11px', color:'#854F0B', lineHeight:1.65,
        }}>
          허위 분쟁 신고는 전자금융거래법 및 정보통신망법에 따라 법적 제재를 받을 수 있습니다. 모든 신고는 기록·보관됩니다.
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard, display:'flex', flexDirection:'column', gap:'8px' }}>
        <button onClick={onSubmit}
          style={{
            width:'100%', height:'52px',
            background: '#DC2626', color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>
          분쟁 신고 접수
        </button>
        <button onClick={onBack}
          style={{
            width:'100%', height:'42px',
            background:'transparent', color: COLORS.t4,
            border:'none', fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
          }}>
          취소
        </button>
      </div>

      {/* 비즈니스 모델 바텀시트 */}
      {showBizModel && type.bizModel && (
        <div onClick={() => setShowBizModel(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:'390px', background:'#fff',
              borderTopLeftRadius:'24px', borderTopRightRadius:'24px',
              padding:'8px 20px 36px',
            }}>
            <div style={{ width:'40px', height:'4px', background: COLORS.border, borderRadius:'2px', margin:'8px auto 20px' }} />
            <div style={{ fontSize:'16px', fontWeight:700, color: COLORS.t1, marginBottom:'4px' }}>
              {type.bizModel.label}
            </div>
            <div style={{ fontSize:'12px', color: COLORS.t3, lineHeight:1.6, marginBottom:'16px' }}>
              {type.bizModel.desc}
            </div>

            {type.bizModel.type === 'attachment' && (
              <div style={{
                background:'#EDE9FE', borderRadius: RADIUS.lg,
                padding:'14px 16px', marginBottom:'16px',
              }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#5B21B6', marginBottom:'8px' }}>가압류 공탁 대행 절차</div>
                {[
                  '분쟁 신고 접수 + 차용증 확인',
                  '주다페이 신탁예치금으로 공탁금 대납',
                  '법무법인 파트너가 가압류 신청',
                  '채권 회수 완료 시 수수료 정산',
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:'8px', fontSize:'11px', color:'#5B21B6', marginBottom:'5px' }}>
                    <span style={{
                      width:'18px', height:'18px', borderRadius:'50%',
                      background:'#7C3AED', color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'9px', fontWeight:700, flexShrink:0,
                    }}>{i+1}</span>
                    {s}
                  </div>
                ))}
              </div>
            )}

            {type.bizModel.type === 'mediation' && (
              <div style={{
                background:'#EDE9FE', borderRadius: RADIUS.lg,
                padding:'14px 16px', marginBottom:'16px',
              }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#5B21B6', marginBottom:'8px' }}>중재 절차</div>
                {[
                  '중재 신청 + 수수료 선납',
                  '양측에 중재 개시 통보',
                  '전문 중재인이 계약서·납품물 검토 (3~5 영업일)',
                  '중재안 제시 → 양측 수락 시 합의 처리',
                  '합의 성립 시 수수료 환급',
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:'8px', fontSize:'11px', color:'#5B21B6', marginBottom:'5px' }}>
                    <span style={{
                      width:'18px', height:'18px', borderRadius:'50%',
                      background:'#7C3AED', color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'9px', fontWeight:700, flexShrink:0,
                    }}>{i+1}</span>
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              padding:'12px 14px', background:'#FEF3C7',
              borderRadius: RADIUS.md, marginBottom:'16px',
              fontSize:'11px', color:'#854F0B',
            }}>
              💰 수수료: <strong>{type.bizModel.fee}</strong>
            </div>

            <button onClick={() => { setShowBizModel(false); dialog.alert({ title:'신청 완료', message:'고객센터에서 연락드립니다.' }) }}
              style={{
                width:'100%', height:'52px',
                background: theme.brand, color:'#fff',
                border:'none', borderRadius: RADIUS.md,
                fontSize:'15px', fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                boxShadow: SHADOWS.buttonBrand,
                marginBottom:'10px',
              }}>
              신청 완료
            </button>
            <button onClick={() => setShowBizModel(false)}
              style={{
                width:'100%', height:'42px',
                background:'transparent', color: COLORS.t4,
                border:'none', fontSize:'13px', cursor:'pointer', fontFamily:'inherit',
              }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 완료 화면 ────────────────────────────────────────────
function Done({ type, txn, navigate }) {
  const theme = getAccountTheme()
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', background: COLORS.bg }}>
      <div style={{
        background: theme.headerSolid,
        paddingTop:'max(50px, env(safe-area-inset-top))', paddingBottom:'40px', textAlign:'center',
      }}>
        <div style={{
          width:'80px', height:'80px', borderRadius:'50%',
          background:'rgba(239,68,68,0.2)', border:'2px solid #EF4444',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 18px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={{ fontSize:'22px', fontWeight:700, color:'#fff', marginBottom:'10px' }}>
          분쟁 신고 접수 완료
        </div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.7)', lineHeight:1.7, padding:'0 24px' }}>
          고객센터에서 영업일 기준 1~2일 내에<br />연락드립니다.
        </div>
      </div>

      <div style={{ padding:'20px 16px 32px' }}>
        <div style={{ background: COLORS.bgCard, boxShadow: SHADOWS.card, borderRadius: RADIUS.lg, padding:'14px 16px', marginBottom:'12px' }}>
          {[
            { label:'접수 번호', value:`DSP-${Date.now().toString().slice(-8)}` },
            { label:'분쟁 유형', value: type.title },
            { label:'관련 거래', value: txn.name },
            { label:'접수 일시', value:'2026.05.07 · 지금' },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between', fontSize:'12px',
              paddingBottom: i < arr.length-1 ? '8px' : 0,
              marginBottom: i < arr.length-1 ? '8px' : 0,
              borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none',
            }}>
              <span style={{ color: COLORS.t4 }}>{r.label}</span>
              <span style={{ color: COLORS.t1, fontWeight:600 }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ padding:'12px 14px', background:'#EDF3FA', borderRadius: RADIUS.md, fontSize:'11px', color:'#1E5294', lineHeight:1.65 }}>
          분쟁 처리 현황은 알림센터에서 확인할 수 있어요. 추가 자료가 필요하면 고객센터에서 요청드릴 수 있습니다.
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'12px 16px 24px', borderTop:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard, display:'flex', flexDirection:'column', gap:'8px' }}>
        <button onClick={() => navigate('/more')}
          style={{
            width:'100%', height:'52px',
            background: theme.brand, color:'#fff',
            border:'none', borderRadius: RADIUS.md,
            fontSize:'15px', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit', boxShadow: SHADOWS.buttonBrand,
          }}>
          확인
        </button>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function Dispute() {
  const navigate = useNavigate()
  const theme    = getAccountTheme()

  const [step,         setStep]         = useState(1)
  const [mountedSteps, setMountedSteps] = useState(new Set([1]))
  const [exitingStep,  setExitingStep]  = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [selectedTxn,  setSelectedTxn]  = useState(null)
  const [content,      setContent]      = useState(null)

  // 다음 단계 — 슬라이드 인
  const goForward = (nextStep) => {
    setMountedSteps(prev => new Set([...prev, nextStep]))
    setStep(nextStep)
  }

  // 이전 단계 — 슬라이드 아웃 후 unmount (스크롤 위치 보존)
  const goBack = () => {
    if (exitingStep !== null) return   // 애니메이션 중 중복 호출 방지
    if (step === 1) { navigate(-1); return }
    const current = step
    setExitingStep(current)
    setTimeout(() => {
      setMountedSteps(prev => { const s = new Set(prev); s.delete(current); return s })
      setExitingStep(null)
      setStep(prev => (typeof prev === 'number' ? prev - 1 : prev))
    }, 320)
  }

  useStepHistory(goBack, step === 1)

  if (step === 'done') {
    return (
      <PhoneShell>
        <Done type={selectedType} txn={selectedTxn} navigate={navigate} />
      </PhoneShell>
    )
  }

  return (
    <PhoneShell>
      {/* 오버레이 스택: 각 단계가 absolute로 쌓이며 이전 단계 스크롤 보존 */}
      <div style={{ flex:1, position:'relative', overflow:'clip' }}>

        {/* 단계 1 — 기본 레이어 (항상 마운트, 애니메이션 없음) */}
        {mountedSteps.has(1) && (
          <div style={{ ...STEP_STYLE, zIndex:10 }}>
            <Step1
              onBack={() => navigate(-1)}
              onSelect={(type) => { setSelectedType(type); goForward(2) }}
            />
          </div>
        )}

        {/* 단계 2 */}
        {mountedSteps.has(2) && (
          <div
            className={exitingStep === 2 ? 'page-exit-right' : 'page-enter-right'}
            style={{ ...STEP_STYLE, zIndex:20 }}
          >
            <Step2
              type={selectedType}
              onBack={goBack}
              onNext={(txn) => { setSelectedTxn(txn); goForward(3) }}
            />
          </div>
        )}

        {/* 단계 3 */}
        {mountedSteps.has(3) && (
          <div
            className={exitingStep === 3 ? 'page-exit-right' : 'page-enter-right'}
            style={{ ...STEP_STYLE, zIndex:30 }}
          >
            <Step3
              type={selectedType}
              txn={selectedTxn}
              onBack={goBack}
              onNext={(c) => { setContent(c); goForward(4) }}
            />
          </div>
        )}

        {/* 단계 4 */}
        {mountedSteps.has(4) && (
          <div
            className={exitingStep === 4 ? 'page-exit-right' : 'page-enter-right'}
            style={{ ...STEP_STYLE, zIndex:40 }}
          >
            <Step4
              type={selectedType}
              txn={selectedTxn}
              content={content}
              onBack={goBack}
              onSubmit={() => setStep('done')}
            />
          </div>
        )}

      </div>
    </PhoneShell>
  )
}
