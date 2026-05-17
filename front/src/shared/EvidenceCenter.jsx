import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import BottomTab from '../components/BottomTab'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ─────────────────────────────────────────────────────────
// ExecutionStats CATEGORY_GROUPS의 subs와 완전히 동일한 서브필터
// ─────────────────────────────────────────────────────────
const SUB_FILTERS = {
  인건비: ['전체', '급여', '외주비', '상여금', '경조사비', '기타소득', '4대보험'],
  운영비: ['전체', '임대료', '렌트&리스', '구독료', '통신비', '공과금', '보험료', '출장식대', '복리후생', '기타 정기지출', '개인사용'],
  사업비: ['전체', '마케팅비'],
  금융:   ['전체', '투자', '대여금'],
  세금:   ['전체', '세금'],
}

const TYPE_META = {
  인건비: { color: '#0D7750', bg: '#E6F6EF' },
  운영비: { color: '#1D4ED8', bg: '#EEF2FF' },
  사업비: { color: '#6D28D9', bg: '#F3EEFF' },
  금융:   { color: '#0369A1', bg: '#E0F2FE' },
  세금:   { color: '#92590A', bg: '#FEF3E0' },
}

const STATUS_META = {
  done:    { label: '완료',     color: '#0D7750', bg: '#E6F6EF' },
  review:  { label: '검토필요', color: '#92590A', bg: '#FEF3E0' },
  missing: { label: '누락',     color: '#C0392B', bg: '#FEE9E9' },
}

const PACKAGES = [
  {
    id: 'salary_2026_05',
    name: '2026년 5월 급여 증빙 패키지',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '인건비', subType: '급여',
    status: 'missing', total: 8, done: 6,
    missing: ['급여명세서 (3명)', '4대보험 영수증'],
    amount: 85000000, vendor: '', staff: '전직원', project: '', memo: '5월 정기 급여',
  },
  {
    id: 'salary_2026_04',
    name: '2026년 4월 급여 증빙 패키지',
    dateRange: '2026.04.01 ~ 2026.04.30',
    type: '인건비', subType: '급여',
    status: 'done', total: 8, done: 8,
    missing: [],
    amount: 82500000, vendor: '', staff: '전직원', project: '', memo: '4월 정기 급여',
  },
  {
    id: 'outsource_2026_05',
    name: '2026년 5월 외주비 증빙',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '인건비', subType: '외주비',
    status: 'review', total: 5, done: 3,
    missing: ['계약서 (2건)'],
    amount: 12000000, vendor: '(주)테크파트너', staff: '', project: '앱 리뉴얼', memo: '',
  },
  {
    id: 'rent_2026_05',
    name: '분당 펜타포트 5월 임대료',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '운영비', subType: '임대료',
    status: 'review', total: 3, done: 2,
    missing: ['영수증'],
    amount: 4500000, vendor: '펜타포트빌딩관리', staff: '', project: '', memo: '5회차 월세',
  },
  {
    id: 'telecom_2026_05',
    name: '5월 통신비 증빙',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '운영비', subType: '통신비',
    status: 'done', total: 4, done: 4,
    missing: [],
    amount: 850000, vendor: 'KT 비즈', staff: '', project: '', memo: '',
  },
  {
    id: 'subscription_2026_05',
    name: '5월 구독료 증빙',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '운영비', subType: '구독료',
    status: 'done', total: 3, done: 3,
    missing: [],
    amount: 553200, vendor: 'AWS · Adobe', staff: '', project: '', memo: '자동결제',
  },
  {
    id: 'marketing_q2',
    name: '2026년 Q2 마케팅비 집행 패키지',
    dateRange: '2026.04.01 ~ 2026.06.30',
    type: '사업비', subType: '마케팅비',
    status: 'review', total: 12, done: 9,
    missing: ['세금계산서 (2건)', '지출결의서'],
    amount: 23000000, vendor: '(주)애드파트너스', staff: '', project: '2026 브랜드캠페인', memo: 'SNS 광고 포함',
  },
  {
    id: 'invest_2026_04',
    name: '㈜스타트업A 투자 증빙',
    dateRange: '2026.04.01 ~ 2026.04.30',
    type: '금융', subType: '투자',
    status: 'done', total: 4, done: 4,
    missing: [],
    amount: 300000000, vendor: '㈜스타트업A', staff: '', project: '', memo: '시리즈A 2차',
  },
  {
    id: 'lend_2026_05',
    name: '기업대출 이자 납부 5월',
    dateRange: '2026.05.01 ~ 2026.05.31',
    type: '금융', subType: '대여금',
    status: 'done', total: 2, done: 2,
    missing: [],
    amount: 1250000, vendor: '신한은행', staff: '', project: '', memo: '운영자금 대출 이자',
  },
  {
    id: 'tax_2026_q1',
    name: '2026년 1분기 세금 신고 패키지',
    dateRange: '2026.01.01 ~ 2026.03.31',
    type: '세금', subType: '세금',
    status: 'done', total: 10, done: 10,
    missing: [],
    amount: 8750000, vendor: '', staff: '', project: '', memo: '세무사 제출 완료',
  },
  {
    id: 'tax_2026_04',
    name: '2026년 4월 원천세 납부',
    dateRange: '2026.04.01 ~ 2026.04.30',
    type: '세금', subType: '세금',
    status: 'missing', total: 4, done: 2,
    missing: ['납부확인서', '원천징수이행상황신고서'],
    amount: 5200000, vendor: '', staff: '', project: '', memo: '4월분 원천세',
  },
]

function filterByPeriod(packages, period, custom) {
  if (period === '직접선택') {
    if (!custom.start || !custom.end) return packages
    const s = new Date(custom.start), e = new Date(custom.end)
    return packages.filter(pkg => {
      const d = new Date(pkg.dateRange.split(' ~ ')[0].replace(/\./g, '-'))
      return d >= s && d <= e
    })
  }
  return packages.filter(pkg => {
    const d = new Date(pkg.dateRange.split(' ~ ')[0].replace(/\./g, '-'))
    const y = d.getFullYear(), m = d.getMonth()
    if (period === '이번달') return y === 2026 && m === 4
    if (period === '지난달') return y === 2026 && m === 3
    if (period === '3개월') {
      const cutoff = new Date(2026, 4, 12); cutoff.setMonth(cutoff.getMonth() - 3)
      return d >= cutoff
    }
    return true
  })
}

// ─────────────────────────────────────────────────────────
export default function EvidenceCenter() {
  const theme = getAccountTheme()
  const navigate = useNavigate()
  const scrollRef = useScrollRestore()

  const [period, setPeriod]                   = useState('이번달')
  const [customDate, setCustomDate]           = useState({ start: '', end: '' })
  const [showCustom, setShowCustom]           = useState(false)
  const [search, setSearch]                   = useState('')
  const [statusTab, setStatusTab]             = useState('전체')
  const [typeTab, setTypeTab]                 = useState('전체')
  const [subFilter, setSubFilter]             = useState('전체')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [zipModal, setZipModal]               = useState(false)
  const [selectedPkg, setSelectedPkg]         = useState(null)

  // ── [권한] 증빙 내보내기·전송 권한 ───────────────────────
  // master · admin · accounting 만 ZIP 생성/다운로드 및 세무사 전송 가능
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const EXPORT_ROLES = ['master', 'admin', 'accounting']
  const canExportEvidence = EXPORT_ROLES.includes(bizRole)

  const periodFiltered = filterByPeriod(PACKAGES, period, customDate)
  const filtered = periodFiltered.filter(pkg => {
    if (statusTab !== '전체') {
      const map = { '누락': 'missing', '검토필요': 'review', '완료': 'done' }
      if (pkg.status !== map[statusTab]) return false
    }
    if (typeTab !== '전체' && pkg.type !== typeTab) return false
    if (subFilter !== '전체' && pkg.subType !== subFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const s = [pkg.name, pkg.vendor, pkg.staff, pkg.project, pkg.memo,
                 pkg.type, pkg.subType, String(pkg.amount)].join(' ').toLowerCase()
      if (!s.includes(q)) return false
    }
    return true
  })

  const stats = {
    total:   PACKAGES.length,
    missing: PACKAGES.filter(p => p.status === 'missing').length,
    review:  PACKAGES.filter(p => p.status === 'review').length,
    done:    PACKAGES.filter(p => p.status === 'done').length,
  }

  const fmt = n => n >= 100000000
    ? `${(n / 100000000).toFixed(1)}억`
    : n >= 10000
    ? `${Math.floor(n / 10000).toLocaleString()}만`
    : n.toLocaleString()

  const subOptions = typeTab !== '전체' ? SUB_FILTERS[typeTab] : []

  return (
    <PhoneShell>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background: COLORS.bg,
        fontFamily:'Pretendard, sans-serif', position:'relative' }}>

        {/* ── 헤더 ── */}
        <div style={{ background: theme.headerSolid, paddingTop:'max(20px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'16px', paddingLeft:'16px', color:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
            <button onClick={() => navigate(-1)}
              style={{ width:'32px', height:'32px', background:'transparent', border:'none',
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'17px', fontWeight:700 }}>통합 증빙센터</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'1px' }}>증빙 패키지 관리 및 내보내기</div>
            </div>
            {/* [권한] ZIP: master · admin · accounting 전용 */}
            {canExportEvidence ? (
              <button onClick={() => { setSelectedPkg(null); setZipModal(true) }}
                style={{ background:'rgba(255,255,255,0.18)', border:'none', borderRadius:'10px',
                  padding:'7px 12px', fontSize:'12px', fontWeight:600, color:'#fff', cursor:'pointer', flexShrink:0 }}>
                ZIP
              </button>
            ) : (
              <div title="최고관리자·관리자·재무담당자만 가능"
                style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'10px',
                  padding:'7px 12px', fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.35)', flexShrink:0 }}>
                🔒 ZIP
              </div>
            )}
          </div>

          {/* 요약 4칸 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'7px' }}>
            {[
              { label:'전체',    value: stats.total,   col:'rgba(255,255,255,0.95)', key:'전체'    },
              { label:'누락',    value: stats.missing, col:'#FCA5A5',                key:'누락'    },
              { label:'검토필요', value: stats.review,  col:'#FCD34D',               key:'검토필요' },
              { label:'완료',    value: stats.done,    col:'#6EE7B7',                key:'완료'    },
            ].map(s => (
              <button key={s.key} onClick={() => setStatusTab(s.key)}
                style={{ background: statusTab===s.key ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
                  border: statusTab===s.key ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid transparent',
                  borderRadius:'10px', padding:'8px 4px', textAlign:'center', cursor:'pointer' }}>
                <div style={{ fontSize:'17px', fontWeight:700, color: s.col }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'1px' }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 스크롤 영역 ── */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'14px 14px 90px' }}>

          {/* 기간 필터 */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
            {['이번달','지난달','3개월','직접선택'].map(p => (
              <button key={p}
                onClick={() => { setPeriod(p); setShowCustom(p === '직접선택') }}
                style={{ padding:'6px 12px', borderRadius:'20px', border:'none', fontSize:'12px', fontWeight:600, cursor:'pointer',
                  background: period===p ? '#111827' : COLORS.bgCard,
                  color:      period===p ? '#fff'    : COLORS.t3,
                  boxShadow:  period===p ? 'none'    : '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                {p}
              </button>
            ))}
          </div>

          {/* 직접선택 날짜 */}
          {showCustom && (
            <div style={{ background: COLORS.bgCard, borderRadius:'12px', border:`1px solid ${COLORS.borderSoft}`,
              padding:'12px', marginBottom:'10px', display:'flex', gap:'8px', alignItems:'center' }}>
              <div style={{ flex:1, overflow:'hidden', borderRadius:'8px' }}>
                <input type="date" value={customDate.start}
                  onChange={e => setCustomDate(v => ({ ...v, start: e.target.value }))}
                  style={{ width:'100%', border:`1px solid ${COLORS.border}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', outline:'none', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance:'none', appearance:'none' }}/>
              </div>
              <span style={{ color: COLORS.t4, fontSize:'12px' }}>~</span>
              <div style={{ flex:1, overflow:'hidden', borderRadius:'8px' }}>
                <input type="date" value={customDate.end}
                  onChange={e => setCustomDate(v => ({ ...v, end: e.target.value }))}
                  style={{ width:'100%', border:`1px solid ${COLORS.border}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', outline:'none', boxSizing:'border-box', maxWidth:'100%', WebkitAppearance:'none', appearance:'none' }}/>
              </div>
            </div>
          )}

          {/* 검색창 */}
          <div style={{ position:'relative', marginBottom:'10px' }}>
            <svg style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="거래처·직원·항목·금액·메모 검색"
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 36px 10px 36px',
                borderRadius:'12px', border:`1px solid ${COLORS.borderSoft}`, background: COLORS.bgCard,
                fontSize:'13px', outline:'none', color: COLORS.t1 }}/>
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color: COLORS.t4, fontSize:'18px', lineHeight:1 }}>×</button>
            )}
          </div>

          {/* 유형 탭 */}
          <div style={{ display:'flex', gap:'5px', marginBottom:'10px', overflowX:'auto', paddingBottom:'2px' }}>
            {['전체','인건비','운영비','사업비','금융','세금'].map(t => {
              const meta = TYPE_META[t]
              const active = typeTab === t
              return (
                <button key={t}
                  onClick={() => { setTypeTab(t); setSubFilter('전체') }}
                  style={{ flexShrink:0, padding:'6px 14px', fontSize:'12px', fontWeight:600, cursor:'pointer', borderRadius:'20px',
                    background: active ? (meta ? meta.bg    : '#111827') : COLORS.bgCard,
                    color:      active ? (meta ? meta.color : '#fff'   ) : COLORS.t3,
                    border:     active && meta ? `1.5px solid ${meta.color}40` : `1px solid ${COLORS.borderSoft}`,
                  }}>
                  {t}
                </button>
              )
            })}
          </div>

          {/* ── 건수 + 필터 버튼 바 (ExecutionStats 완전 동일) ── */}
          {typeTab !== '전체' && (
            <div style={{ flexShrink:0, marginBottom:'10px', background: COLORS.bgCard, borderRadius:'14px',
              padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:`1px solid ${COLORS.borderSoft}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <span style={{ fontSize: subFilter !== '전체' ? '13px' : '20px', fontWeight:800,
                  color: subFilter !== '전체' ? COLORS.t3 : COLORS.t1, letterSpacing:'-0.5px' }}>
                  {filtered.length}
                </span>
                <span style={{ fontSize:'12px', fontWeight:500, color: COLORS.t3 }}>건</span>
                {subFilter !== '전체' && (
                  <span style={{ fontSize:'11px', color: theme.brandDark, fontWeight:700,
                    background:`${theme.brandDark}12`, padding:'2px 7px', borderRadius:'6px', marginLeft:'2px' }}>
                    {subFilter}
                  </span>
                )}
              </div>

              <button onClick={() => setShowFilterSheet(true)}
                style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', borderRadius:'20px',
                  background: subFilter !== '전체' ? theme.brandDark : COLORS.bgMuted,
                  border:'none', cursor:'pointer', fontFamily:'inherit', outline:'none',
                  boxShadow: subFilter !== '전체' ? `0 2px 10px ${theme.brandDark}40` : 'none',
                  transition:'all 0.15s' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={subFilter !== '전체' ? '#fff' : COLORS.t3}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                <span style={{ fontSize:'12px', fontWeight:700, color: subFilter !== '전체' ? '#fff' : COLORS.t3 }}>
                  {subFilter === '전체' ? '필터' : subFilter}
                </span>
                {subFilter !== '전체' && (
                  <span onClick={e => { e.stopPropagation(); setSubFilter('전체') }}
                    style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', fontWeight:700, marginLeft:'1px' }}>✕</span>
                )}
              </button>
            </div>
          )}

          {typeTab === '전체' && (
            <div style={{ fontSize:'12px', color: COLORS.t4, marginBottom:'10px' }}>
              {filtered.length}개 패키지
            </div>
          )}

          {/* 패키지 카드 */}
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color: COLORS.t4 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.t5}
                strokeWidth="1.5" style={{ margin:'0 auto 12px', display:'block' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <div style={{ fontSize:'14px', fontWeight:600 }}>해당 증빙 패키지 없음</div>
              <div style={{ fontSize:'12px', marginTop:'4px' }}>필터 조건을 변경해 보세요</div>
              {subFilter !== '전체' && (
                <button onClick={() => setSubFilter('전체')}
                  style={{ marginTop:'12px', padding:'8px 18px', borderRadius:'20px',
                    background: COLORS.bgMuted, border:'none', cursor:'pointer',
                    fontSize:'12px', fontWeight:600, color: COLORS.t3 }}>
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
              {filtered.map(pkg => {
                const tMeta = TYPE_META[pkg.type]     || {}
                const sMeta = STATUS_META[pkg.status] || {}
                const pct   = Math.round((pkg.done / pkg.total) * 100)
                return (
                  <div key={pkg.id}
                    style={{ background: COLORS.bgCard, borderRadius:'16px',
                      border:`1px solid ${COLORS.borderSoft}`, overflow:'hidden',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding:'14px 14px 0' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1, lineHeight:1.4 }}>{pkg.name}</div>
                          <div style={{ fontSize:'11px', color: COLORS.t4, marginTop:'3px' }}>{pkg.dateRange}</div>
                        </div>
                        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                          <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 8px', borderRadius:'20px',
                            background: tMeta.bg, color: tMeta.color }}>{pkg.type}</span>
                          <span style={{ fontSize:'10px', fontWeight:600, padding:'3px 8px', borderRadius:'20px',
                            background: sMeta.bg, color: sMeta.color }}>{sMeta.label}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px' }}>
                        <div style={{ fontSize:'15px', fontWeight:800, color: COLORS.t1, letterSpacing:'-0.5px' }}>{fmt(pkg.amount)}원</div>
                        <div style={{ fontSize:'12px', fontWeight:700, color: tMeta.color }}>
                          {pct}%
                          <span style={{ color: COLORS.t4, fontWeight:400, marginLeft:'4px' }}>({pkg.done}/{pkg.total})</span>
                        </div>
                      </div>
                      <div style={{ height:'4px', background: COLORS.bgMuted, borderRadius:'2px', marginTop:'6px', overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: tMeta.color, borderRadius:'2px' }}/>
                      </div>
                      {pkg.missing.length > 0 && (
                        <div style={{ marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'4px' }}>
                          {pkg.missing.map((m, i) => (
                            <span key={i} style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'20px',
                              background: COLORS.dangerBg, color: COLORS.danger, fontWeight:500 }}>! {m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', marginTop:'10px', borderTop:`1px solid ${COLORS.borderSoft}` }}>
                      <div style={{ display:'flex', gap:'10px', minWidth:0, overflow:'hidden' }}>
                        {pkg.vendor  && <span style={{ fontSize:'11px', color: COLORS.t3, whiteSpace:'nowrap' }}>🏢 {pkg.vendor}</span>}
                        {pkg.staff   && <span style={{ fontSize:'11px', color: COLORS.t3, whiteSpace:'nowrap' }}>👤 {pkg.staff}</span>}
                        {pkg.project && <span style={{ fontSize:'11px', color: COLORS.t3, whiteSpace:'nowrap' }}>📁 {pkg.project}</span>}
                        {!pkg.vendor && !pkg.staff && !pkg.project && pkg.memo &&
                          <span style={{ fontSize:'11px', color: COLORS.t4 }}>{pkg.memo}</span>}
                      </div>
                      <button onClick={() => { setSelectedPkg(pkg); setZipModal(true) }}
                        style={{ flexShrink:0, fontSize:'11px', fontWeight:600, color: tMeta.color,
                          background: tMeta.bg, border:'none', borderRadius:'8px', padding:'5px 12px', cursor:'pointer' }}>
                        패키지 보기
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 하단 내보내기 — [권한] master · admin · accounting 전용 */}
          <div style={{ background: COLORS.bgCard, borderRadius:'16px', border:`1px solid ${COLORS.borderSoft}`, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color: COLORS.t1 }}>증빙 내보내기</div>
              {!canExportEvidence && (
                <span style={{ fontSize:'10px', fontWeight:700, color:'#9CA3AF', background:'#F3F4F6', padding:'2px 8px', borderRadius:'6px' }}>🔒 권한 필요</span>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {canExportEvidence ? (
                <button onClick={() => { setSelectedPkg(null); setZipModal(true) }}
                  style={{ width:'100%', padding:'13px', background: COLORS.bgInverse, color:'#fff', border:'none',
                    borderRadius:'12px', fontSize:'13px', fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  전체 ZIP 생성
                </button>
              ) : (
                <div style={{ width:'100%', padding:'13px', background:'#F9FAFB', color:'#9CA3AF',
                  border:'1px solid #E5E7EB', borderRadius:'12px', fontSize:'13px', fontWeight:600, textAlign:'center' }}>
                  🔒 전체 ZIP 생성
                </div>
              )}
              {canExportEvidence ? (
                <button style={{ width:'100%', padding:'13px', background: COLORS.bgMuted, color: COLORS.t2,
                  border:`1px solid ${COLORS.borderSoft}`, borderRadius:'12px', fontSize:'13px', fontWeight:600, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  세무사 전송 설정
                </button>
              ) : (
                <div style={{ width:'100%', padding:'13px', background:'#F9FAFB', color:'#9CA3AF',
                  border:'1px solid #E5E7EB', borderRadius:'12px', fontSize:'13px', fontWeight:600, textAlign:'center' }}>
                  🔒 세무사 전송 설정
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 서브필터 바텀시트 — ExecutionStats와 완전 동일 ── */}
        {showFilterSheet && typeTab !== '전체' && (
          <div onClick={() => setShowFilterSheet(false)}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)',
              display:'flex', flexDirection:'column', justifyContent:'flex-end', zIndex:900 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px 16px 36px' }}>
              <div style={{ width:'36px', height:'4px', background:'#E5E7EB', borderRadius:'2px', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:'14px', fontWeight:700, color: COLORS.t1, marginBottom:'14px' }}>카테고리 필터</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {subOptions.map((opt, i, arr) => {
                  const isSelected = subFilter === opt
                  const isLast = i === arr.length - 1 && arr.length % 2 !== 0
                  return (
                    <button key={opt}
                      onClick={() => { setSubFilter(opt); setShowFilterSheet(false) }}
                      style={{ gridColumn: isLast ? 'span 2' : undefined,
                        padding:'12px', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit',
                        fontSize:'13px', fontWeight:600, border:'none', outline:'none', textAlign:'center',
                        background: isSelected ? theme.brandDark : COLORS.bgMuted,
                        color:      isSelected ? '#fff' : COLORS.t2,
                        boxShadow:  isSelected ? `0 2px 8px ${theme.brandDark}40` : 'none',
                        transition:'all 0.15s',
                      }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ZIP 모달 ── */}
        {zipModal && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
            display:'flex', alignItems:'flex-end', zIndex:200 }}
            onClick={() => setZipModal(false)}>
            <div style={{ width:'100%', background:'#0F172A', borderRadius:'20px 20px 0 0',
              padding:'24px 20px 44px', color:'#fff' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width:'36px', height:'4px', background:'rgba(255,255,255,0.2)', borderRadius:'2px', margin:'0 auto 20px' }}/>
              <div style={{ fontSize:'15px', fontWeight:700 }}>
                {selectedPkg ? selectedPkg.name : '전체 ZIP 생성'}
              </div>
              {selectedPkg && (
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)', marginTop:'3px', marginBottom:'14px' }}>
                  {selectedPkg.dateRange}
                </div>
              )}
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'12px', padding:'14px',
                marginTop: selectedPkg ? '0' : '14px', marginBottom:'20px',
                fontFamily:'monospace', fontSize:'11px', color:'rgba(255,255,255,0.7)', lineHeight:1.9 }}>
                {selectedPkg ? (
                  <>
                    <div>📁 {selectedPkg.name.replace(/\s/g, '_')}/</div>
                    <div style={{ paddingLeft:'16px' }}>✓ 이체확인서_묶음.pdf</div>
                    <div style={{ paddingLeft:'16px' }}>✓ {selectedPkg.type}_증빙서류.zip</div>
                    {selectedPkg.missing.map((m, i) => (
                      <div key={i} style={{ paddingLeft:'16px', color:'#FCA5A5' }}>⚠ [누락] {m}</div>
                    ))}
                  </>
                ) : (
                  <>
                    <div>📁 전체_증빙패키지_2026-05/</div>
                    {['인건비','운영비','사업비','금융','세금'].map(t => (
                      <div key={t} style={{ paddingLeft:'16px' }}>📂 {t}/</div>
                    ))}
                  </>
                )}
              </div>
              {canExportEvidence ? (
                <button style={{ width:'100%', padding:'15px',
                  background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
                  color:'#fff', border:'none', borderRadius:'14px',
                  fontSize:'14px', fontWeight:700, cursor:'pointer', marginBottom:'10px' }}>
                  ZIP 파일 생성 및 다운로드
                </button>
              ) : (
                <div style={{ width:'100%', padding:'15px',
                  background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.35)',
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px',
                  fontSize:'14px', fontWeight:600, textAlign:'center',
                  cursor:'not-allowed', marginBottom:'10px' }}>
                  🔒 ZIP 생성 권한 없음 (최고관리자·관리자·재무담당자만)
                </div>
              )}
              <button onClick={() => setZipModal(false)}
                style={{ width:'100%', padding:'13px', background:'rgba(255,255,255,0.08)',
                  color:'rgba(255,255,255,0.7)', border:'none', borderRadius:'14px',
                  fontSize:'14px', cursor:'pointer' }}>
                닫기
              </button>
            </div>
          </div>
      )}
      </div>
    </PhoneShell>
  )
}
