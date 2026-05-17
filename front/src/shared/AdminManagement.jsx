import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { useScrollRestore } from '../hooks/useScrollRestore'

// ═══════════════════════════════════════════════════════════
// ── 상수 ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
const ROLES = {
  master:   { id:'master',   label:'기관장',     color:'#7C3AED', bg:'#EDE9FE', desc:'모든 권한 · 최종 결재자',     icon:'👑' },
  director: { id:'director', label:'국장/부서장', color:'#1D4ED8', bg:'#DBEAFE', desc:'부서 최종 승인 · 고액 결재',  icon:'🏛️' },
  manager:  { id:'manager',  label:'팀장',        color:'#0891B2', bg:'#CFFAFE', desc:'1차 검토 및 승인',            icon:'📋' },
  finance:  { id:'finance',  label:'재무담당',    color:'#059669', bg:'#D1FAE5', desc:'회계·재무·세금계산서 검토',  icon:'💼' },
  audit:    { id:'audit',    label:'감사담당',    color:'#D97706', bg:'#FEF3C7', desc:'감사 목적 전체 이력 조회',    icon:'🔍' },
  staff:    { id:'staff',    label:'실무자',      color:'#6B7280', bg:'#F3F4F6', desc:'집행 요청 작성 및 등록',      icon:'✏️' },
  viewer:   { id:'viewer',   label:'조회자',      color:'#9CA3AF', bg:'#F9FAFB', desc:'거래 내역 조회만 가능',       icon:'👁️' },
}

const PERMISSIONS = [
  { id:'execute',   label:'자금 집행',   sub:'집행 요청 작성 및 등록' },
  { id:'approve',   label:'집행 승인',   sub:'집행 요청 승인·반려·수정 요청' },
  { id:'withdraw',  label:'출금 승인',   sub:'계좌 출금 최종 승인' },
  { id:'budget',    label:'예산 관리',   sub:'예산 코드 등록 및 한도 설정' },
  { id:'evidence',  label:'증빙 관리',   sub:'서류 첨부·검토·다운로드' },
  { id:'audit_log', label:'감사 로그',   sub:'전체 집행 이력 열람' },
  { id:'members',   label:'구성원 관리', sub:'구성원 초대 및 역할 변경' },
  { id:'settings',  label:'시스템 설정', sub:'결재라인·증빙규칙·에스컬레이션' },
]

const DEPT_LIST = ['총무팀','재무팀','기획팀','사업팀','운영팀','IT팀','홍보팀']

const EXEC_TYPES = [
  { id:'subscription', label:'구독료',     icon:'💻' },
  { id:'rent',         label:'임대료',     icon:'🏢' },
  { id:'service',      label:'용역·외주',  icon:'🤝' },
  { id:'goods',        label:'물품 구매',  icon:'📦' },
  { id:'salary',       label:'급여·수당',  icon:'💰' },
  { id:'construction', label:'공사·시설',  icon:'🏗️' },
  { id:'tax',          label:'세금·공과금',icon:'📃' },
  { id:'misc',         label:'기타 운영비',icon:'📋' },
]

const EVIDENCE_DOCS = [
  { id:'contract',   label:'계약서',     icon:'📝' },
  { id:'invoice',    label:'세금계산서', icon:'🧾' },
  { id:'estimate',   label:'견적서',     icon:'📊' },
  { id:'inspection', label:'검수확인서', icon:'✅' },
  { id:'resolution', label:'지출결의서', icon:'📋' },
  { id:'receipt',    label:'영수증',     icon:'🏧' },
  { id:'other',      label:'기타 증빙',  icon:'📎' },
]

// ═══════════════════════════════════════════════════════════
// ── 데모 데이터 ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
const DEMO_MEMBERS = [
  { id:'m1', name:'이호형',  role:'master',   phone:'010-1234-5678', email:'ceo@judacompany.com',     dept:'총무팀', joinDate:'2026.04.10', permissions:PERMISSIONS.map(p=>p.id), amountLimit:null,      approvalStep:null },
  { id:'m2', name:'김재무',  role:'finance',  phone:'010-2345-6789', email:'finance@judacompany.com', dept:'재무팀', joinDate:'2026.04.15', permissions:['execute','approve','evidence','audit_log'],      amountLimit:50000000,  approvalStep:3 },
  { id:'m3', name:'이부서장',role:'director', phone:'010-3456-7890', email:'dir@judacompany.com',     dept:'기획팀', joinDate:'2026.05.01', permissions:['execute','approve','evidence'],                   amountLimit:10000000,  approvalStep:2 },
  { id:'m4', name:'박팀장',  role:'manager',  phone:'010-4567-8901', email:'mgr@judacompany.com',     dept:'운영팀', joinDate:'2026.05.01', permissions:['execute','approve','evidence'],                   amountLimit:1000000,   approvalStep:1 },
  { id:'m5', name:'최실무',  role:'staff',    phone:'010-5678-9012', email:'staff@judacompany.com',   dept:'IT팀',   joinDate:'2026.05.03', permissions:['execute','evidence'],                            amountLimit:500000,    approvalStep:null },
  { id:'m6', name:'한감사',  role:'audit',    phone:'010-6789-0123', email:'audit@judacompany.com',   dept:'총무팀', joinDate:'2026.05.05', permissions:['audit_log'],                                     amountLimit:null,      approvalStep:null },
]

const DEMO_APPROVAL_AMOUNTS = [
  { id:'aa1', label:'50만원 이하',        maxAmount:500000,   minAmount:0,        steps:[{ step:1, roleId:'manager',  personName:'박팀장' }] },
  { id:'aa2', label:'50만원 ~ 500만원',   maxAmount:5000000,  minAmount:500000,   steps:[{ step:1, roleId:'manager',  personName:'박팀장' }, { step:2, roleId:'director', personName:'이부서장' }] },
  { id:'aa3', label:'500만원 ~ 5,000만원',maxAmount:50000000, minAmount:5000000,  steps:[{ step:1, roleId:'manager',  personName:'박팀장' }, { step:2, roleId:'director', personName:'이부서장' }, { step:3, roleId:'finance', personName:'김재무' }] },
  { id:'aa4', label:'5,000만원 초과',     maxAmount:null,     minAmount:50000000, steps:[{ step:1, roleId:'manager',  personName:'박팀장' }, { step:2, roleId:'director', personName:'이부서장' }, { step:3, roleId:'finance', personName:'김재무' }, { step:4, roleId:'master', personName:'이호형' }] },
]

const DEMO_APPROVAL_TYPES = [
  { id:'at1', typeId:'subscription', label:'구독료',    icon:'💻', steps:[{ step:1, roleId:'manager', personName:'박팀장' }] },
  { id:'at2', typeId:'service',      label:'용역·외주', icon:'🤝', steps:[{ step:1, roleId:'manager', personName:'박팀장' }, { step:2, roleId:'director', personName:'이부서장' }, { step:3, roleId:'finance', personName:'김재무' }] },
  { id:'at3', typeId:'construction', label:'공사·시설', icon:'🏗️', steps:[{ step:1, roleId:'manager', personName:'박팀장' }, { step:2, roleId:'director', personName:'이부서장' }, { step:3, roleId:'finance', personName:'김재무' }, { step:4, roleId:'master', personName:'이호형' }] },
  { id:'at4', typeId:'salary',       label:'급여·수당', icon:'💰', steps:[{ step:1, roleId:'director', personName:'이부서장' }, { step:2, roleId:'finance', personName:'김재무' }, { step:3, roleId:'master', personName:'이호형' }] },
]

const DEMO_BUDGET_CODES = [
  { id:'bc1', code:'100-01', name:'인건비·급여',   annual:120000000, used:52000000,  dept:'전체' },
  { id:'bc2', code:'200-01', name:'운영비·소모품', annual:30000000,  used:8400000,   dept:'전체' },
  { id:'bc3', code:'300-01', name:'사업비·용역',   annual:200000000, used:87000000,  dept:'기획팀' },
  { id:'bc4', code:'400-01', name:'시설·공사비',   annual:50000000,  used:12000000,  dept:'총무팀' },
  { id:'bc5', code:'500-01', name:'IT·구독비',     annual:24000000,  used:7200000,   dept:'IT팀' },
]

const DEMO_EVIDENCE_RULES = [
  { id:'er1', typeId:'subscription', label:'구독료',    icon:'💻', required:['receipt'],                           optional:['invoice','contract'] },
  { id:'er2', typeId:'service',      label:'용역·외주', icon:'🤝', required:['contract','invoice','inspection'],   optional:['estimate','resolution'] },
  { id:'er3', typeId:'goods',        label:'물품 구매', icon:'📦', required:['receipt','estimate'],                optional:['invoice','resolution'] },
  { id:'er4', typeId:'construction', label:'공사·시설', icon:'🏗️', required:['contract','invoice','inspection','resolution'], optional:['estimate'] },
  { id:'er5', typeId:'salary',       label:'급여·수당', icon:'💰', required:['resolution'],                        optional:['receipt'] },
]

const DEMO_AUDIT_LOGS = [
  { id:'al1', date:'2026.05.09 14:32', actor:'김재무',  action:'approve',       target:'AWS 서버비 480,000원',     detail:'3차(재무) 승인 완료' },
  { id:'al2', date:'2026.05.09 13:10', actor:'이부서장',action:'approve',       target:'AWS 서버비 480,000원',     detail:'2차(부서장) 승인 완료' },
  { id:'al3', date:'2026.05.09 11:15', actor:'최실무',  action:'submit',        target:'ChatGPT Team 160,000원',   detail:'집행 요청 등록' },
  { id:'al4', date:'2026.05.08 16:44', actor:'이호형',  action:'final_approve', target:'사무용품비 230,000원',     detail:'최종 결재 완료 → 지급 실행' },
  { id:'al5', date:'2026.05.08 14:20', actor:'박팀장',  action:'reject',        target:'외주 개발비 5,500,000원',  detail:'반려 사유: 계약서 미첨부' },
  { id:'al6', date:'2026.05.07 09:30', actor:'시스템',  action:'escalate',      target:'임대료 1,200,000원',       detail:'24시간 미응답 → 이부서장 에스컬레이션' },
  { id:'al7', date:'2026.05.06 17:00', actor:'최실무',  action:'submit',        target:'용역비 3,300,000원',       detail:'집행 요청 등록' },
  { id:'al8', date:'2026.05.06 10:22', actor:'김재무',  action:'view',          target:'감사 로그 전체',           detail:'전체 로그 열람' },
]

// ── 역할별 기본 결재라인 단계 매핑 ───────────────────────
// null = 결재 권한 없음 (approvalStep 섹션 비노출)
const ROLE_DEFAULT_APPROVAL_STEP = {
  master:   4, // 최종 결재자
  director: 2, // 2차 승인자 (부서장)
  manager:  1, // 1차 승인자 (팀장)
  finance:  3, // 3차 승인자 (재무)
  audit:    null,
  staff:    null,
  viewer:   null,
}

// ── 역할별 기본 권한 매핑 ─────────────────────────────────
const ROLE_DEFAULT_PERMISSIONS = {
  master:   ['execute','approve','withdraw','budget','evidence','audit_log','members','settings'],
  director: ['execute','approve','evidence','audit_log'],
  manager:  ['execute','approve','evidence'],
  finance:  ['execute','approve','evidence','budget','audit_log'],
  audit:    ['audit_log'],
  staff:    ['execute','evidence'],
  viewer:   [],
}

// ── 권한 그룹 (Step3 세부 조정용) ────────────────────────
const PERMISSION_GROUPS = [
  { id:'exec',  label:'집행·결재',   icon:'💸', ids:['execute','approve','withdraw'] },
  { id:'doc',   label:'문서·증빙',   icon:'📎', ids:['evidence','budget'] },
  { id:'audit', label:'조회·감사',   icon:'🔍', ids:['audit_log'] },
  { id:'sys',   label:'시스템 관리', icon:'⚙️', ids:['members','settings'] },
]

// ── 구성원 검색 데모 데이터 (Step1용) ────────────────────
const DEMO_SEARCH_CONTACTS = [
  { id:'c1', name:'정민준', phone:'010-9012-3456', email:'jmj@judacompany.com',  registered:true,  dept:'마케팅팀' },
  { id:'c2', name:'서지수', phone:'010-8901-2345', email:'sjs@judacompany.com',  registered:true,  dept:'' },
  { id:'c3', name:'오태현', phone:'010-7890-1234', email:'oth@judacompany.com',  registered:false, dept:'' },
  { id:'c4', name:'강유진', phone:'010-6789-0123', email:'kyj@judacompany.com',  registered:false, dept:'' },
  { id:'c5', name:'임도현', phone:'010-5678-9012', email:'ldh@judacompany.com',  registered:true,  dept:'기획팀' },
]

// ═══════════════════════════════════════════════════════════
// ── 유틸 ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function fmt(n) { return Number(Math.floor(n||0)).toLocaleString('ko-KR') }
function pct(used, total) { return total > 0 ? Math.min(100, Math.round((used/total)*100)) : 0 }

// ═══════════════════════════════════════════════════════════
// ── 공통 컴포넌트 ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function Header({ onBack, title, sub, right }) {
  const theme = getAccountTheme()
  return (
    <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'18px', paddingLeft:'16px', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <button onClick={onBack}
          style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'19px', fontWeight:700, color:'#fff', letterSpacing:'-0.4px' }}>{title}</div>
          {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'2px' }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.viewer
  return (
    <span style={{ padding:'2px 8px', borderRadius:'20px', background:r.bg, color:r.color, fontSize:'10px', fontWeight:700, whiteSpace:'nowrap' }}>
      {r.icon} {r.label}
    </span>
  )
}

function SecLabel({ label, color }) {
  const theme = getAccountTheme()
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px', marginBottom:'10px' }}>
      <div style={{ width:'3px', height:'14px', borderRadius:'2px', background: color || theme.brand, flexShrink:0 }}/>
      <span style={{ fontSize:'11px', fontWeight:700, color: color || theme.brandDark, letterSpacing:'0.6px', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

function Toggle({ on, onChange, brand }) {
  return (
    <button onClick={onChange}
      style={{ width:'46px', height:'26px', borderRadius:'13px', border:'none', cursor:'pointer', background: on ? brand : COLORS.bgMuted, position:'relative', transition:'background 0.2s', padding:0, flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left: on ? '23px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
    </button>
  )
}

// 결재 체인 시각화 (세로형)
function ApprovalChain({ steps, brand }) {
  const arrow = (color='#10B981') => (
    <div style={{ paddingLeft:'15px', margin:'3px 0' }}>
      <svg width="14" height="16" viewBox="0 0 14 20" fill="none">
        <line x1="7" y1="0" x2="7" y2="14" stroke={color} strokeWidth="1.8"/>
        <polyline points="3,10 7,14 11,10" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
  return (
    <div style={{ padding:'14px 16px', background:`${brand}06`, borderRadius:'12px', margin:'2px 0 10px' }}>
      {/* 집행 요청 */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>📋</div>
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:COLORS.t3 }}>집행 요청</div>
          <div style={{ fontSize:'10px', color:COLORS.t4 }}>실무자 등록</div>
        </div>
      </div>

      {steps.map((s, i) => {
        const r = ROLES[s.roleId] || ROLES.viewer
        return (
          <div key={i}>
            {arrow(brand)}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>{r.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:r.color }}>{s.step}차 · {r.label}</div>
                <div style={{ fontSize:'10px', color:COLORS.t3 }}>{s.personName}</div>
              </div>
              <span style={{ fontSize:'9px', padding:'2px 7px', background:r.bg, color:r.color, borderRadius:'10px', fontWeight:700 }}>
                {s.step === steps.length ? '최종' : `${s.step}차`}
              </span>
            </div>
          </div>
        )
      })}

      {arrow('#10B981')}
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>✅</div>
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#047857' }}>지급 실행</div>
          <div style={{ fontSize:'10px', color:COLORS.t4 }}>승인 완료 → 자동 집행</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 1. 메인 허브 ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function MainHub({ members, onNav, onInvite }) {
  const theme = getAccountTheme()
  const navigate = useNavigate()

  const stats = [
    { label:'전체 구성원', value:`${members.length}명`, color:theme.brand },
    { label:'승인 대기',   value:'3건',                 color:'#D97706' },
    { label:'이번달 집행', value:'12건',                color:'#059669' },
  ]

  const modules = [
    { id:'approval',  icon:'🔀', label:'결재라인 설정',   sub:'금액·유형·부서별 설정',   color:'#7C3AED', bg:'#EDE9FE' },
    { id:'members',   icon:'👥', label:'구성원 관리',      sub:`${members.length}명 등록됨`,color:'#1D4ED8', bg:'#DBEAFE' },
    { id:'budget',    icon:'📊', label:'예산 코드 관리',   sub:'예산 항목 및 한도',        color:'#059669', bg:'#D1FAE5' },
    { id:'evidence',  icon:'📎', label:'증빙 규칙 설정',   sub:'필수 서류 기준 관리',      color:'#D97706', bg:'#FEF3C7' },
    { id:'auditlog',  icon:'🔍', label:'감사 로그',         sub:'전체 집행 이력 추적',      color:'#374151', bg:'#F3F4F6' },
    { id:'escalation',icon:'⏱️', label:'에스컬레이션',     sub:'미응답 자동 상향 처리',    color:'#DC2626', bg:'#FEE2E2' },
  ]

  return (
    <>
      <div style={{ background:theme.headerGrad, paddingTop:'max(20px, env(safe-area-inset-top))', paddingBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'4px 16px 14px' }}>
          <button onClick={() => navigate(-1)} style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'19px', fontWeight:700, color:'#fff', letterSpacing:'-0.4px' }}>관리자 관리</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'2px' }}>결재·구성원·예산·증빙·감사 통합 설정</div>
          </div>
          <button onClick={onInvite}
            style={{ padding:'6px 13px', background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.35)', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            구성원 초대
          </button>
        </div>

        {/* 요약 stats */}
        <div style={{ display:'flex', gap:'8px', padding:'0 16px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ flex:1, background:'rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>{s.value}</div>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.65)', marginTop:'2px', fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 16px 36px' }}>
        {/* 승인 대기 배너 */}
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'14px', padding:'12px 16px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>⏳</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#92400E', marginBottom:'1px' }}>승인 대기 3건</div>
            <div style={{ fontSize:'11px', color:'#B45309' }}>가장 오래된 건: AWS 서버비 (14시간 경과)</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* 6개 모듈 그리드 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {modules.map(mod => (
            <button key={mod.id} onClick={() => onNav(mod.id)}
              style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'16px', padding:'16px 14px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', boxShadow:SHADOWS.card, display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:mod.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{mod.icon}</div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>{mod.label}</div>
                <div style={{ fontSize:'10px', color:COLORS.t4, lineHeight:1.4 }}>{mod.sub}</div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={mod.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 2. 구성원 관리 ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function MemberListView({ members, onMember, onBack, onAdd }) {
  const theme = getAccountTheme()
  const roleCounts = Object.keys(ROLES).map(r => ({ ...ROLES[r], count: members.filter(m => m.role === r).length })).filter(r => r.count > 0)

  return (
    <>
      <Header onBack={onBack} title="구성원 관리" sub={`총 ${members.length}명 등록`}
        right={
          <button onClick={onAdd}
            style={{ padding:'6px 13px', background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.35)', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            추가
          </button>
        }
      />
      <div style={{ padding:'16px 16px 36px' }}>
        {/* 역할별 현황 */}
        <div style={{ display:'flex', gap:'7px', marginBottom:'18px', overflowX:'auto', paddingBottom:'2px' }}>
          {roleCounts.map(r => (
            <div key={r.id} style={{ flexShrink:0, background:r.bg, borderRadius:'12px', padding:'10px 14px', textAlign:'center', minWidth:'64px' }}>
              <div style={{ fontSize:'11px', marginBottom:'2px' }}>{r.icon}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:r.color }}>{r.count}</div>
              <div style={{ fontSize:'9px', fontWeight:700, color:r.color, marginTop:'1px' }}>{r.label}</div>
            </div>
          ))}
        </div>

        <SecLabel label="구성원 목록" />
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {members.map(m => {
            const r = ROLES[m.role] || ROLES.viewer
            const isMaster = m.role === 'master'
            return (
              <button key={m.id} onClick={() => !isMaster && onMember(m)}
                style={{ width:'100%', background:COLORS.bgCard, boxShadow:SHADOWS.card, border:`1px solid ${COLORS.borderSoft}`, borderRadius:'14px', padding:'13px 16px', display:'flex', alignItems:'center', gap:'12px', cursor: isMaster ? 'default' : 'pointer', fontFamily:'inherit', textAlign:'left' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:r.color, flexShrink:0 }}>
                  {m.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1 }}>{m.name}</span>
                    <RoleBadge role={m.role} />
                  </div>
                  <div style={{ fontSize:'11px', color:COLORS.t3, marginBottom:'1px' }}>{m.dept} · {m.email}</div>
                  {m.amountLimit && (
                    <div style={{ fontSize:'10px', color:COLORS.t4 }}>집행 한도 {fmt(m.amountLimit)}원 이하</div>
                  )}
                </div>
                {!isMaster && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function MemberDetailView({ member, onBack, onSave, onRemove }) {
  const theme = getAccountTheme()
  const [role, setRole]             = useState(member.role)
  const [permissions, setPermissions] = useState(member.permissions)
  const [amountLimit, setAmountLimit] = useState(member.amountLimit ? String(member.amountLimit) : '')
  const [approvalStep, setApprovalStep] = useState(member.approvalStep ?? 1)
  const [dept, setDept]             = useState(member.dept || '')
  const [showRemove, setShowRemove] = useState(false)

  const togglePerm = (id) =>
    setPermissions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const editableRoles = ['master','director','manager','finance','audit','staff','viewer']

  return (
    <>
      <Header onBack={onBack} title="구성원 설정" sub={member.name}
        right={
          <button onClick={() => setShowRemove(true)}
            style={{ padding:'6px 12px', background:'rgba(239,68,68,0.15)', color:'#FCA5A5', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            내보내기
          </button>
        }
      />
      <div style={{ padding:'16px 16px 100px' }}>
        {/* 구성원 카드 */}
        <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, padding:'16px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:ROLES[member.role].bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, color:ROLES[member.role].color, flexShrink:0 }}>
            {member.name[0]}
          </div>
          <div>
            <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>{member.name}</div>
            <div style={{ fontSize:'11px', color:COLORS.t3, marginBottom:'1px' }}>{member.email}</div>
            <div style={{ fontSize:'10px', color:COLORS.t4 }}>{member.phone} · 가입 {member.joinDate}</div>
          </div>
        </div>

        {/* 부서 */}
        <SecLabel label="소속 부서" />
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'16px' }}>
          {DEPT_LIST.map(d => (
            <button key={d} onClick={() => setDept(d)}
              style={{ padding:'6px 13px', borderRadius:'20px', border:`1.5px solid ${dept === d ? theme.brand : COLORS.borderSoft}`, background: dept === d ? theme.brand : '#fff', color: dept === d ? '#fff' : COLORS.t3, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
              {d}
            </button>
          ))}
        </div>

        {/* 역할 */}
        <SecLabel label="역할 설정" />
        <div style={{ display:'flex', flexDirection:'column', gap:'7px', marginBottom:'16px' }}>
          {editableRoles.map(r => {
            const info = ROLES[r]
            const active = role === r
            return (
              <button key={r} onClick={() => setRole(r)}
                style={{ width:'100%', background: active ? info.bg : COLORS.bgCard, border:`1.5px solid ${active ? info.color : COLORS.borderSoft}`, borderRadius:'12px', padding:'11px 14px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ width:'20px', height:'20px', borderRadius:'50%', border: active ? `7px solid ${info.color}` : `2px solid ${COLORS.t5}`, background:COLORS.bgCard, flexShrink:0, transition:'all .15s' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color: active ? info.color : COLORS.t1, marginBottom:'1px' }}>{info.icon} {info.label}</div>
                  <div style={{ fontSize:'10px', color:COLORS.t4 }}>{info.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 세부 권한 */}
        {(role === 'director' || role === 'manager' || role === 'finance') && (
          <>
            <SecLabel label="세부 권한" />
            <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, overflow:'hidden', marginBottom:'16px' }}>
              {PERMISSIONS.map((perm, i, arr) => {
                const on = permissions.includes(perm.id)
                return (
                  <button key={perm.id} onClick={() => togglePerm(perm.id)}
                    style={{ width:'100%', padding:'12px 16px', background: on ? `${theme.brand}08` : COLORS.bgCard, border:'none', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0, background: on ? theme.brand : 'transparent', border: on ? `2px solid ${theme.brand}` : `2px solid ${COLORS.borderSoft}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                      {on && <svg width="12" height="10" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color: on ? COLORS.t1 : COLORS.t2, marginBottom:'1px' }}>{perm.label}</div>
                      <div style={{ fontSize:'10px', color:COLORS.t4 }}>{perm.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* 집행 한도 */}
        {permissions.includes('execute') && (
          <>
            <SecLabel label="집행 금액 한도" />
            <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, padding:'14px 16px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
              <input type="number" value={amountLimit} onChange={e => setAmountLimit(e.target.value)} placeholder="한도 없음"
                style={{ flex:1, fontSize:'17px', fontWeight:700, color:COLORS.t1, background:'transparent', border:'none', outline:'none', fontFamily:'inherit' }}/>
              <span style={{ fontSize:'14px', color:COLORS.t3, fontWeight:600 }}>원 이하</span>
            </div>
            <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'16px', padding:'0 4px' }}>비워두면 한도 없음 · 한도 초과 시 승인 요청으로 자동 전환</div>
          </>
        )}

        {/* 승인 단계 */}
        {permissions.includes('approve') && (
          <>
            <SecLabel label="결재라인 단계" />
            <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, overflow:'hidden', marginBottom:'16px' }}>
              {[
                { step:1, label:'1차 승인자', sub:'첫 번째 검토 단계' },
                { step:2, label:'2차 승인자', sub:'1차 승인 후 검토' },
                { step:3, label:'3차 승인자', sub:'고액 집행 단계' },
                { step:4, label:'최종 결재자', sub:'결재라인 마지막 단계' },
              ].map((s, i, arr) => (
                <button key={s.step} onClick={() => setApprovalStep(s.step)}
                  style={{ width:'100%', padding:'12px 14px', background: approvalStep === s.step ? `${theme.brand}08` : COLORS.bgCard, border:'none', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  <div style={{ width:'20px', height:'20px', borderRadius:'50%', border: approvalStep === s.step ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`, background:COLORS.bgCard, flexShrink:0, transition:'all .15s' }}/>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, marginBottom:'1px' }}>{s.label}</div>
                    <div style={{ fontSize:'10px', color:COLORS.t4 }}>{s.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={() => onSave({ ...member, role, permissions, dept, amountLimit: amountLimit ? Number(amountLimit) : null, approvalStep })}
          style={{ width:'100%', height:'50px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
          저장
        </button>
      </div>

      {showRemove && (
        <div onClick={() => setShowRemove(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:'320px', background:'#fff', borderRadius:RADIUS.lg, padding:'24px 20px' }}>
            <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, marginBottom:'8px' }}>{member.name}을 내보낼까요?</div>
            <div style={{ fontSize:'12px', color:COLORS.t3, lineHeight:1.6, marginBottom:'20px' }}>내보내면 모든 권한이 즉시 해제됩니다. 진행 중인 집행·승인 요청은 마스터에게 자동 이관됩니다.</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setShowRemove(false)} style={{ flex:1, height:'44px', background:COLORS.bgMuted, color:COLORS.t2, border:'none', borderRadius:RADIUS.md, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
              <button onClick={() => onRemove(member.id)} style={{ flex:1, height:'44px', background:'#DC2626', color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>내보내기</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 3. 결재라인 설정 ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function ApprovalLineView({ onBack }) {
  const theme = getAccountTheme()
  const [tab, setTab]               = useState('amount') // amount | type | dept
  const [amountLines, setAmountLines] = useState(DEMO_APPROVAL_AMOUNTS)
  const [typeLines, setTypeLines]   = useState(DEMO_APPROVAL_TYPES)
  const [expanded, setExpanded]     = useState(null)

  const tabs = [
    { id:'amount', label:'금액별' },
    { id:'type',   label:'유형별' },
    { id:'dept',   label:'부서별' },
  ]

  const stepCountBadge = (steps) => {
    const colors = ['','#059669','#1D4ED8','#D97706','#7C3AED']
    const bgs    = ['','#D1FAE5','#DBEAFE','#FEF3C7','#EDE9FE']
    const n = steps.length
    return (
      <span style={{ padding:'2px 8px', borderRadius:'20px', background: bgs[Math.min(n,4)], color: colors[Math.min(n,4)], fontSize:'10px', fontWeight:700 }}>
        {n}단계
      </span>
    )
  }

  return (
    <>
      <Header onBack={onBack} title="결재라인 설정" sub="집행 유형별 승인 구조 설정" />
      <div style={{ padding:'16px 16px 36px' }}>
        {/* 탭 */}
        <div style={{ display:'flex', background:COLORS.bgMuted, borderRadius:'12px', padding:'3px', gap:'2px', marginBottom:'18px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setExpanded(null) }}
              style={{ flex:1, padding:'9px 4px', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', border:'none', fontSize:'12px', fontWeight:700, transition:'all 0.15s', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? theme.brand : COLORS.t4, boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 금액별 탭 */}
        {tab === 'amount' && (
          <div>
            <SecLabel label="금액 구간별 결재라인" />
            <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'12px', lineHeight:1.5 }}>
              집행 금액에 따라 자동으로 결재 단계가 결정됩니다. 각 구간을 눌러 상세 설정을 확인하세요.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {amountLines.map((line) => (
                <div key={line.id} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
                  <button onClick={() => setExpanded(expanded === line.id ? null : line.id)}
                    style={{ width:'100%', padding:'14px 16px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'4px' }}>{line.label}</div>
                      <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                        {stepCountBadge(line.steps)}
                        <span style={{ fontSize:'10px', color:COLORS.t4 }}>
                          {line.steps.map(s => ROLES[s.roleId]?.label || '').join(' → ')}
                        </span>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: expanded === line.id ? 'rotate(90deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  {expanded === line.id && (
                    <div style={{ borderTop:`1px solid ${COLORS.borderSoft}` }}>
                      <ApprovalChain steps={line.steps} brand={theme.brand} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop:'12px', padding:'12px 14px', background:'#EFF6FF', borderRadius:'12px', fontSize:'11px', color:'#1D4ED8', lineHeight:1.6 }}>
              ℹ️ 50만원 이하는 팀장 단독 승인 가능. 5,000만원 초과는 기관장 최종 결재 필수.
            </div>
          </div>
        )}

        {/* 유형별 탭 */}
        {tab === 'type' && (
          <div>
            <SecLabel label="집행 유형별 결재라인" />
            <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'12px', lineHeight:1.5 }}>
              집행 유형마다 다른 결재라인을 적용할 수 있습니다. 금액 기준보다 유형 기준이 우선 적용됩니다.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {EXEC_TYPES.map(et => {
                const typeLine = typeLines.find(tl => tl.typeId === et.id)
                const hasCustom = !!typeLine
                return (
                  <div key={et.id} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
                    <button onClick={() => hasCustom && setExpanded(expanded === et.id ? null : et.id)}
                      style={{ width:'100%', padding:'13px 16px', background:'transparent', border:'none', display:'flex', alignItems:'center', gap:'12px', cursor: hasCustom ? 'pointer' : 'default', fontFamily:'inherit', textAlign:'left' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{et.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'3px' }}>{et.label}</div>
                        {hasCustom
                          ? <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>{stepCountBadge(typeLine.steps)}<span style={{ fontSize:'10px', color:COLORS.t4 }}>{typeLine.steps.map(s => ROLES[s.roleId]?.label||'').join(' → ')}</span></div>
                          : <span style={{ fontSize:'10px', padding:'2px 7px', background:'#F3F4F6', color:'#6B7280', borderRadius:'10px', fontWeight:600 }}>금액 기준 기본 적용</span>
                        }
                      </div>
                      {hasCustom && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: expanded === et.id ? 'rotate(90deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      )}
                    </button>
                    {hasCustom && expanded === et.id && (
                      <div style={{ borderTop:`1px solid ${COLORS.borderSoft}` }}>
                        <ApprovalChain steps={typeLine.steps} brand={theme.brand} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 부서별 탭 */}
        {tab === 'dept' && (
          <div>
            <SecLabel label="부서별 결재라인" />
            <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'14px', lineHeight:1.5 }}>
              부서마다 다른 승인 라인을 지정할 수 있습니다. 설정이 없는 부서는 기본 결재라인을 따릅니다.
            </div>
            {DEPT_LIST.map(dept => (
              <div key={dept} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, padding:'13px 16px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>🏢</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>{dept}</div>
                  <span style={{ fontSize:'10px', padding:'2px 7px', background:'#F3F4F6', color:'#6B7280', borderRadius:'10px', fontWeight:600 }}>기본 결재라인 적용 중</span>
                </div>
                <button style={{ fontSize:'11px', fontWeight:600, color:theme.brand, background:`${theme.brand}12`, border:'none', borderRadius:'8px', padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>설정</button>
              </div>
            ))}
            <div style={{ padding:'12px 14px', background:'#FFFBEB', borderRadius:'12px', fontSize:'11px', color:'#854F0B', lineHeight:1.6, marginTop:'4px' }}>
              ⓘ 부서별 라인은 유형별 라인보다 우선 적용됩니다.
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 4. 예산 코드 관리 ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function BudgetCodeView({ onBack }) {
  const theme = getAccountTheme()
  const [codes, setCodes] = useState(DEMO_BUDGET_CODES)
  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState({ code:'', name:'', annual:'', dept:'' })

  const totalAnnual = codes.reduce((s, c) => s + c.annual, 0)
  const totalUsed   = codes.reduce((s, c) => s + c.used, 0)

  const pctColor = (p) => p >= 90 ? '#DC2626' : p >= 70 ? '#D97706' : '#059669'
  const pctBg    = (p) => p >= 90 ? '#FEE2E2' : p >= 70 ? '#FEF3C7' : '#D1FAE5'

  return (
    <>
      <Header onBack={onBack} title="예산 코드 관리" sub="예산 항목 및 집행 한도 설정" />
      <div style={{ padding:'16px 16px 36px' }}>
        {/* 전체 요약 */}
        <div style={{ background:`linear-gradient(135deg, ${theme.brand}14, ${theme.brand}08)`, border:`1px solid ${theme.brand}22`, borderRadius:'16px', padding:'16px', marginBottom:'18px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, marginBottom:'10px', letterSpacing:'0.4px' }}>연간 예산 총괄</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'5px' }}>
            <span>총 예산</span><span style={{ fontWeight:700 }}>{fmt(totalAnnual)}원</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:COLORS.t3, marginBottom:'10px' }}>
            <span>집행액</span><span style={{ fontWeight:700, color:'#D97706' }}>{fmt(totalUsed)}원</span>
          </div>
          <div style={{ height:'8px', background:`${theme.brand}20`, borderRadius:'4px', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:'4px', background:theme.brand, width:`${pct(totalUsed,totalAnnual)}%`, transition:'width 0.5s' }}/>
          </div>
          <div style={{ fontSize:'10px', color:theme.brandDark, marginTop:'6px', fontWeight:600 }}>집행률 {pct(totalUsed,totalAnnual)}%</div>
        </div>

        <SecLabel label="예산 항목" />
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px' }}>
          {codes.map(code => {
            const p = pct(code.used, code.annual)
            return (
              <div key={code.id} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'9px', fontWeight:700, color:COLORS.t4, background:COLORS.bgMuted, padding:'2px 6px', borderRadius:'5px' }}>{code.code}</span>
                      <span style={{ fontSize:'10px', color:COLORS.t4 }}>{code.dept}</span>
                    </div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1 }}>{code.name}</div>
                  </div>
                  <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'10px', background:pctBg(p), color:pctColor(p), flexShrink:0 }}>{p}%</span>
                </div>
                {/* 프로그레스 바 */}
                <div style={{ height:'6px', background:COLORS.bgMuted, borderRadius:'3px', overflow:'hidden', marginBottom:'8px' }}>
                  <div style={{ height:'100%', borderRadius:'3px', background:pctColor(p), width:`${p}%`, transition:'width 0.4s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}>
                  <span style={{ color:COLORS.t4 }}>집행 {fmt(code.used)}원</span>
                  <span style={{ color:COLORS.t3, fontWeight:600 }}>잔액 {fmt(code.annual - code.used)}원</span>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={() => setShowAdd(true)}
          style={{ width:'100%', padding:'14px', background: theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:theme.activeShadow }}>
          <span style={{ fontSize:'18px' }}>+</span> 예산 항목 추가
        </button>

        {/* 추가 모달 */}
        {showAdd && (
          <div onClick={() => setShowAdd(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
            <div onClick={e => e.stopPropagation()} style={{ width:'100%', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px' }}>
              <div style={{ fontSize:'16px', fontWeight:700, color:COLORS.t1, marginBottom:'16px' }}>예산 항목 추가</div>
              {[
                { label:'예산 코드', key:'code', placeholder:'예: 600-01' },
                { label:'항목명',   key:'name', placeholder:'예: 교육·훈련비' },
                { label:'연간 예산',key:'annual',placeholder:'금액 입력 (원)' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'5px' }}>{f.label}</div>
                  <input value={newCode[f.key]} onChange={e => setNewCode(p => ({ ...p, [f.key]:e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', border:`1px solid ${COLORS.borderSoft}`, borderRadius:'10px', padding:'11px 14px', fontSize:'14px', color:COLORS.t1, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
                </div>
              ))}
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'8px' }}>담당 부서</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {['전체',...DEPT_LIST].map(d => (
                    <button key={d} onClick={() => setNewCode(p => ({ ...p, dept:d }))}
                      style={{ padding:'5px 11px', borderRadius:'20px', border:`1px solid ${newCode.dept === d ? theme.brand : COLORS.borderSoft}`, background: newCode.dept === d ? theme.brand : '#fff', color: newCode.dept === d ? '#fff' : COLORS.t3, fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setShowAdd(false)} style={{ flex:1, height:'48px', background:COLORS.bgMuted, color:COLORS.t2, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
                <button onClick={() => {
                  if (!newCode.code || !newCode.name || !newCode.annual) return
                  setCodes(p => [...p, { id:`bc${Date.now()}`, code:newCode.code, name:newCode.name, annual:parseInt(newCode.annual)||0, used:0, dept:newCode.dept||'전체' }])
                  setShowAdd(false); setNewCode({ code:'', name:'', annual:'', dept:'' })
                }} style={{ flex:1, height:'48px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>추가</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 5. 증빙 규칙 설정 ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function EvidenceRuleView({ onBack }) {
  const theme = getAccountTheme()
  const [rules, setRules] = useState(DEMO_EVIDENCE_RULES)
  const [expanded, setExpanded] = useState(null)

  const toggleDoc = (ruleId, docId, kind) => {
    setRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r
      if (kind === 'required') {
        const isReq = r.required.includes(docId)
        return { ...r, required: isReq ? r.required.filter(d => d !== docId) : [...r.required, docId], optional: r.optional.filter(d => d !== docId) }
      } else {
        const isOpt = r.optional.includes(docId)
        return { ...r, optional: isOpt ? r.optional.filter(d => d !== docId) : [...r.optional, docId], required: r.required.filter(d => d !== docId) }
      }
    }))
  }

  return (
    <>
      <Header onBack={onBack} title="증빙 규칙 설정" sub="집행 유형별 필수 서류 기준" />
      <div style={{ padding:'16px 16px 36px' }}>
        <div style={{ fontSize:'12px', color:COLORS.t4, marginBottom:'14px', lineHeight:1.6, padding:'12px 14px', background:'#F0FDF4', borderRadius:'12px', border:'1px solid #D1FAE5' }}>
          ✅ 필수 서류가 첨부되지 않으면 다음 결재 단계로 진행이 차단됩니다. 선택 서류는 권장 사항입니다.
        </div>

        <SecLabel label="유형별 필수 서류" />
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
              <button onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}
                style={{ width:'100%', padding:'14px 16px', background:'transparent', border:'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${theme.brand}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{rule.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1, marginBottom:'4px' }}>{rule.label}</div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                    {rule.required.map(d => (
                      <span key={d} style={{ fontSize:'9px', padding:'2px 6px', background:'#FEE2E2', color:'#DC2626', borderRadius:'5px', fontWeight:600 }}>
                        필수 {EVIDENCE_DOCS.find(e => e.id === d)?.label}
                      </span>
                    ))}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expanded === rule.id ? 'rotate(90deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              {expanded === rule.id && (
                <div style={{ borderTop:`1px solid ${COLORS.borderSoft}`, padding:'14px 16px' }}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t3, marginBottom:'10px' }}>서류별 설정</div>
                  {EVIDENCE_DOCS.map(doc => {
                    const isReq = rule.required.includes(doc.id)
                    const isOpt = rule.optional.includes(doc.id)
                    return (
                      <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
                        <span style={{ fontSize:'16px', width:'20px', textAlign:'center', flexShrink:0 }}>{doc.icon}</span>
                        <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1, flex:1 }}>{doc.label}</span>
                        <div style={{ display:'flex', gap:'5px' }}>
                          <button onClick={() => toggleDoc(rule.id, doc.id, 'required')}
                            style={{ padding:'4px 9px', borderRadius:'8px', border:`1.5px solid ${isReq ? '#DC2626' : COLORS.borderSoft}`, background: isReq ? '#FEE2E2' : '#fff', color: isReq ? '#DC2626' : COLORS.t4, fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                            필수
                          </button>
                          <button onClick={() => toggleDoc(rule.id, doc.id, 'optional')}
                            style={{ padding:'4px 9px', borderRadius:'8px', border:`1.5px solid ${isOpt ? '#D97706' : COLORS.borderSoft}`, background: isOpt ? '#FEF3C7' : '#fff', color: isOpt ? '#D97706' : COLORS.t4, fontSize:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                            선택
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 6. 감사 로그 ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function AuditLogView({ onBack }) {
  const theme = getAccountTheme()
  const [filter, setFilter] = useState('all') // all | approve | reject | submit | escalate

  const ACTION_META = {
    approve:       { label:'승인',    bg:'#D1FAE5', color:'#059669', icon:'✅' },
    final_approve: { label:'최종결재',bg:'#EDE9FE', color:'#7C3AED', icon:'👑' },
    reject:        { label:'반려',    bg:'#FEE2E2', color:'#DC2626', icon:'❌' },
    submit:        { label:'등록',    bg:'#DBEAFE', color:'#1D4ED8', icon:'📋' },
    escalate:      { label:'에스컬',  bg:'#FEF3C7', color:'#D97706', icon:'⏱️' },
    view:          { label:'조회',    bg:'#F3F4F6', color:'#6B7280', icon:'👁️' },
  }

  const tabs = [
    { id:'all',      label:'전체' },
    { id:'approve',  label:'승인' },
    { id:'reject',   label:'반려' },
    { id:'submit',   label:'등록' },
    { id:'escalate', label:'에스컬' },
  ]

  const filtered = filter === 'all'
    ? DEMO_AUDIT_LOGS
    : DEMO_AUDIT_LOGS.filter(l => l.action === filter || (filter === 'approve' && l.action === 'final_approve'))

  return (
    <>
      <Header onBack={onBack} title="감사 로그" sub="전체 집행 이력 추적" />
      <div style={{ padding:'12px 16px 36px' }}>
        {/* 필터 탭 */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'16px', overflowX:'auto', paddingBottom:'2px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ flexShrink:0, padding:'6px 13px', borderRadius:'20px', border:`1.5px solid ${filter === t.id ? theme.brand : COLORS.borderSoft}`, background: filter === t.id ? theme.brand : '#fff', color: filter === t.id ? '#fff' : COLORS.t3, fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 로그 목록 */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(log => {
            const meta = ACTION_META[log.action] || ACTION_META.view
            return (
              <div key={log.id} style={{ background:COLORS.bgCard, borderRadius:'14px', boxShadow:SHADOWS.card, padding:'13px 16px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                  {meta.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t1 }}>{log.actor}</span>
                    <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 7px', background:meta.bg, color:meta.color, borderRadius:'10px' }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize:'11px', fontWeight:600, color:COLORS.t2, marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.target}</div>
                  <div style={{ fontSize:'10px', color:COLORS.t4 }}>{log.detail}</div>
                  <div style={{ fontSize:'10px', color:COLORS.t4, marginTop:'3px' }}>🕐 {log.date}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop:'12px', padding:'11px 14px', background:'#F0FDF4', borderRadius:'12px', fontSize:'11px', color:'#059669', lineHeight:1.5 }}>
          ✅ 모든 이력은 영구 보존됩니다. 감사 대응 시 기간·사용자·유형별 필터 후 내보내기 가능합니다.
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 7. 에스컬레이션 설정 ──────────────────────────────────
// ═══════════════════════════════════════════════════════════
function EscalationView({ onBack }) {
  const theme = getAccountTheme()
  const [escalationOn, setEscalationOn]   = useState(true)
  const [hours1, setHours1]               = useState('24')
  const [hours2, setHours2]               = useState('48')
  const [finalHours, setFinalHours]       = useState('72')
  const [autoExecute, setAutoExecute]     = useState(false)
  const [notifyMaster, setNotifyMaster]   = useState(true)

  const steps = [
    { label:'1차 승인자 미응답',  hours:hours1,    setter:setHours1,   desc:'→ 2차 승인자로 자동 이관',         color:'#1D4ED8' },
    { label:'2차 승인자 미응답',  hours:hours2,    setter:setHours2,   desc:'→ 다음 단계 또는 부서장으로 이관', color:'#D97706' },
    { label:'최종 결재자 미응답', hours:finalHours,setter:setFinalHours,desc:'→ 아래 설정에 따라 처리',         color:'#DC2626' },
  ]

  return (
    <>
      <Header onBack={onBack} title="에스컬레이션 설정" sub="미응답 시 자동 상향 처리 규칙" />
      <div style={{ padding:'16px 16px 100px' }}>
        {/* 에스컬레이션 ON/OFF */}
        <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, padding:'16px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>⏱️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>자동 에스컬레이션</div>
            <div style={{ fontSize:'11px', color:COLORS.t4 }}>미응답 시 자동으로 다음 승인자에게 이관</div>
          </div>
          <Toggle on={escalationOn} onChange={() => setEscalationOn(!escalationOn)} brand={theme.brand} />
        </div>

        {escalationOn && (
          <>
            <SecLabel label="단계별 미응답 기준 시간" />
            <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden', marginBottom:'16px' }}>
              {steps.map((s, i, arr) => (
                <div key={s.label} style={{ padding:'14px 16px', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                    <div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:s.color, marginBottom:'1px' }}>{s.label}</div>
                      <div style={{ fontSize:'10px', color:COLORS.t4 }}>{s.desc}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', background:COLORS.bgMuted, borderRadius:'10px', padding:'6px 12px' }}>
                      <input type="number" value={s.hours} onChange={e => s.setter(e.target.value)} min="1" max="168"
                        style={{ width:'36px', border:'none', outline:'none', fontSize:'16px', fontWeight:800, color:s.color, background:'transparent', fontFamily:'inherit', textAlign:'center' }}/>
                      <span style={{ fontSize:'11px', color:COLORS.t3, fontWeight:600 }}>시간</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SecLabel label="최종 미응답 처리" />
            <div style={{ background:COLORS.bgCard, borderRadius:'16px', boxShadow:SHADOWS.card, overflow:'hidden', marginBottom:'16px' }}>
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', borderBottom:`1px solid ${COLORS.borderSoft}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'1px' }}>자동 집행</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>최종 미응답 시 자동으로 지급 실행 (공공기관 비권장)</div>
                </div>
                <Toggle on={autoExecute} onChange={() => setAutoExecute(!autoExecute)} brand={theme.brand} />
              </div>
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'1px' }}>기관장 즉시 알림</div>
                  <div style={{ fontSize:'11px', color:COLORS.t4 }}>미응답 에스컬레이션 발생 시 기관장에게 즉시 알림</div>
                </div>
                <Toggle on={notifyMaster} onChange={() => setNotifyMaster(!notifyMaster)} brand={theme.brand} />
              </div>
            </div>

            <div style={{ padding:'12px 14px', background:'#EFF6FF', borderRadius:'12px', fontSize:'11px', color:'#1D4ED8', lineHeight:1.65 }}>
              ℹ️ 공공기관 권장: 자동 집행 OFF + 기관장 즉시 알림 ON. 미응답 발생 시 수동 처리 후 감사 로그에 사유 기록 권장.
            </div>
          </>
        )}
      </div>

      <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={onBack}
          style={{ width:'100%', height:'50px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
          저장
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 8. 구성원 초대 ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function InviteView({ onBack, onDone }) {
  const theme = getAccountTheme()
  const [method, setMethod] = useState('phone')
  const [input, setInput]   = useState('')
  const [role, setRole]     = useState('staff')
  const [dept, setDept]     = useState('')
  const [sent, setSent]     = useState(false)

  const METHODS = [
    { id:'phone',   label:'휴대폰', placeholder:'010-0000-0000',      icon:'📱' },
    { id:'judapay', label:'검색',   placeholder:'이름 또는 이메일',   icon:'🔍' },
    { id:'email',   label:'이메일', placeholder:'example@email.com',  icon:'✉️' },
  ]

  if (sent) return (
    <>
      <Header onBack={onBack} title="구성원 초대" />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', textAlign:'center' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#D1FAE5', border:'2px solid #10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'32px' }}>✅</div>
        <div style={{ fontSize:'20px', fontWeight:700, color:COLORS.t1, marginBottom:'8px' }}>초대 발송 완료</div>
        <div style={{ fontSize:'12px', color:COLORS.t3, lineHeight:1.65, marginBottom:'32px' }}>
          <strong>{input}</strong>에게 초대 링크를 발송했어요.<br/>
          수락 시 <strong>{ROLES[role]?.label}</strong> · {dept || '부서 미지정'}으로 등록됩니다.
        </div>
        <button onClick={onDone}
          style={{ width:'100%', height:'52px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
          완료
        </button>
      </div>
    </>
  )

  return (
    <>
      <Header onBack={onBack} title="구성원 초대" sub="새 구성원에게 초대 링크 발송" />
      <div style={{ padding:'16px 16px 100px' }}>
        {/* 초대 방식 */}
        <SecLabel label="초대 방식" />
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          {METHODS.map(m => (
            <button key={m.id} onClick={() => { setMethod(m.id); setInput('') }}
              style={{ flex:1, height:'56px', background: method === m.id ? theme.brand : COLORS.bgCard, boxShadow: method === m.id ? theme.activeShadow : SHADOWS.card, color: method === m.id ? '#fff' : COLORS.t2, border:'none', borderRadius:RADIUS.md, fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', transition:'all 0.15s' }}>
              <span style={{ fontSize:'18px' }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <input type={method === 'email' ? 'email' : 'text'} value={input} onChange={e => setInput(e.target.value)}
          placeholder={METHODS.find(m => m.id === method)?.placeholder}
          style={{ width:'100%', height:'50px', background:COLORS.bgCard, boxShadow:SHADOWS.card, border:'none', borderRadius:RADIUS.lg, padding:'0 16px', fontSize:'14px', color:COLORS.t1, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:'16px' }}/>

        {/* 역할 */}
        <SecLabel label="부여할 역할" />
        <div style={{ display:'flex', flexDirection:'column', gap:'7px', marginBottom:'16px' }}>
          {['master','director','manager','finance','audit','staff','viewer'].map(r => {
            const info = ROLES[r]
            const active = role === r
            return (
              <button key={r} onClick={() => setRole(r)}
                style={{ width:'100%', background: active ? info.bg : COLORS.bgCard, border:`1.5px solid ${active ? info.color : COLORS.borderSoft}`, borderRadius:'12px', padding:'11px 14px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ width:'20px', height:'20px', borderRadius:'50%', border: active ? `7px solid ${info.color}` : `2px solid ${COLORS.t5}`, background:COLORS.bgCard, flexShrink:0, transition:'all .15s' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color: active ? info.color : COLORS.t1, marginBottom:'1px' }}>{info.icon} {info.label}</div>
                  <div style={{ fontSize:'10px', color:COLORS.t4 }}>{info.desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 부서 */}
        <SecLabel label="소속 부서" />
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
          {DEPT_LIST.map(d => (
            <button key={d} onClick={() => setDept(prev => prev === d ? '' : d)}
              style={{ padding:'6px 13px', borderRadius:'20px', border:`1.5px solid ${dept === d ? theme.brand : COLORS.borderSoft}`, background: dept === d ? theme.brand : '#fff', color: dept === d ? '#fff' : COLORS.t3, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={() => input.trim() && setSent(true)} disabled={!input.trim()}
          style={{ width:'100%', height:'50px', background: input.trim() ? theme.activeBtnGrad : COLORS.bgMuted, color: input.trim() ? '#fff' : COLORS.t4, border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor: input.trim() ? 'pointer' : 'default', fontFamily:'inherit', boxShadow: input.trim() ? theme.activeShadow : 'none', transition:'all 0.2s' }}>
          초대 발송
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// ── 8. 구성원 추가 플로우 (3단계) ────────────────────────
// ═══════════════════════════════════════════════════════════
function MemberAddFlow({ onBack, onDone }) {
  const theme = getAccountTheme()
  const [step, setStep]                 = useState(1)  // 1 | 2 | 3
  const [query, setQuery]               = useState('')
  const [person, setPerson]             = useState(null)
  const [role, setRole]                 = useState('')
  const [dept, setDept]                 = useState('')
  const [permissions, setPermissions]   = useState([])
  const [amountLimit, setAmountLimit]   = useState('')
  const [approvalStep, setApprovalStep] = useState(1)

  // ─── 파생 계산
  const permsByGroup = PERMISSION_GROUPS.map(g => ({
    ...g,
    perms: g.ids.map(id => PERMISSIONS.find(p => p.id === id)).filter(Boolean),
  }))

  const filteredContacts = DEMO_SEARCH_CONTACTS.filter(c =>
    !query.trim() ||
    c.name.includes(query.trim()) ||
    c.phone.includes(query.trim()) ||
    c.email.toLowerCase().includes(query.trim().toLowerCase())
  )

  const selectRole = (r) => {
    setRole(r)
    setPermissions([...(ROLE_DEFAULT_PERMISSIONS[r] || [])])
    const defaultStep = ROLE_DEFAULT_APPROVAL_STEP[r]
    setApprovalStep(defaultStep ?? 1)
  }

  const togglePerm = (id) =>
    setPermissions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  // ─── 진행 표시바
  const ProgressBar = () => (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'14px 16px 0' }}>
      {[1,2,3].map((s) => {
        const done    = s < step
        const active  = s === step
        return (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:'6px', flex: s < 3 ? 'auto' : 'initial' }}>
            <div style={{
              width:'26px', height:'26px', borderRadius:'50%', flexShrink:0,
              background: done ? theme.brand : active ? theme.brand : COLORS.bgMuted,
              border: `2px solid ${done || active ? theme.brand : COLORS.borderSoft}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'11px', fontWeight:800, color: done || active ? '#fff' : COLORS.t4,
              transition:'all 0.2s',
            }}>
              {done ? '✓' : s}
            </div>
            <div style={{ fontSize:'10px', fontWeight: active ? 700 : 500, color: active ? theme.brand : COLORS.t4, whiteSpace:'nowrap' }}>
              {s === 1 ? '사람 찾기' : s === 2 ? '역할·부서' : '권한 조정'}
            </div>
            {s < 3 && <div style={{ flex:1, height:'2px', background: done ? theme.brand : COLORS.borderSoft, borderRadius:'2px', minWidth:'12px', transition:'background 0.3s' }}/>}
          </div>
        )
      })}
    </div>
  )

  // ══════════════════════════
  // STEP 1 — 사람 찾기
  // ══════════════════════════
  const Step1 = () => (
    <>
      <Header onBack={onBack} title="구성원 추가" sub="1단계 · 사람 찾기" />
      <ProgressBar />
      <div style={{ padding:'16px 16px 100px' }}>
        {/* 검색 */}
        <div style={{ position:'relative', marginBottom:'16px' }}>
          <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름 · 전화번호 · 이메일 검색"
            style={{ width:'100%', height:'48px', background:COLORS.bgCard, border:`1.5px solid ${COLORS.borderSoft}`, borderRadius:RADIUS.lg, padding:'0 14px 0 40px', fontSize:'14px', color:COLORS.t1, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
          />
        </div>

        <SecLabel label="검색 결과" />

        {filteredContacts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:COLORS.t4, fontSize:'13px' }}>
            <div style={{ fontSize:'32px', marginBottom:'10px' }}>🔍</div>
            검색 결과가 없습니다
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filteredContacts.map(c => {
              const selected = person?.id === c.id
              return (
                <button key={c.id} onClick={() => setPerson(c)}
                  style={{
                    width:'100%', background: selected ? `${theme.brand}0E` : COLORS.bgCard,
                    boxShadow: SHADOWS.card,
                    border: `1.5px solid ${selected ? theme.brand : COLORS.borderSoft}`,
                    borderRadius:'14px', padding:'13px 16px',
                    display:'flex', alignItems:'center', gap:'12px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background: selected ? theme.brand : COLORS.bgMuted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:700, color: selected ? '#fff' : COLORS.t2, flexShrink:0, transition:'all 0.15s' }}>
                    {c.name[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1 }}>{c.name}</span>
                      <span style={{ padding:'2px 7px', borderRadius:'20px', fontSize:'9px', fontWeight:700, background: c.registered ? '#D1FAE5' : '#FEF3C7', color: c.registered ? '#059669' : '#D97706' }}>
                        {c.registered ? '가입됨' : '미가입'}
                      </span>
                    </div>
                    <div style={{ fontSize:'11px', color:COLORS.t3, marginBottom:'1px' }}>{c.phone}</div>
                    <div style={{ fontSize:'10px', color:COLORS.t4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</div>
                  </div>
                  <div style={{ width:'20px', height:'20px', borderRadius:'50%', border: selected ? `7px solid ${theme.brand}` : `2px solid ${COLORS.borderSoft}`, flexShrink:0, transition:'all .15s' }}/>
                </button>
              )
            })}
          </div>
        )}

        {/* 직접 초대 */}
        <div style={{ marginTop:'20px', padding:'14px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:RADIUS.lg, display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ fontSize:'20px', flexShrink:0 }}>📧</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#1D4ED8', marginBottom:'2px' }}>직접 초대</div>
            <div style={{ fontSize:'10px', color:'#3B82F6', lineHeight:1.5 }}>가입하지 않은 분께 이메일로 초대장을 보낼 수 있습니다</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)' }}>
        <button onClick={() => person && setStep(2)} disabled={!person}
          style={{ width:'100%', height:'50px', background: person ? theme.activeBtnGrad : COLORS.bgMuted, color: person ? '#fff' : COLORS.t4, border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor: person ? 'pointer' : 'default', fontFamily:'inherit', boxShadow: person ? theme.activeShadow : 'none', transition:'all 0.2s' }}>
          {person ? `${person.name} 선택 · 다음` : '구성원을 선택하세요'}
        </button>
      </div>
    </>
  )

  // ══════════════════════════
  // STEP 2 — 역할 + 부서 설정
  // ══════════════════════════
  const Step2 = () => {
    const roleKeys = ['master','director','manager','finance','audit','staff','viewer']
    return (
      <>
        <Header onBack={() => setStep(1)} title="구성원 추가" sub="2단계 · 역할 및 부서 설정" />
        <ProgressBar />
        <div style={{ padding:'16px 16px 100px' }}>

          {/* 선택된 사람 요약 카드 */}
          {person && (
            <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, border:`1px solid ${COLORS.borderSoft}`, borderRadius:RADIUS.lg, padding:'14px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:theme.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#fff', flexShrink:0 }}>
                {person.name[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>{person.name}</div>
                <div style={{ fontSize:'11px', color:COLORS.t3 }}>{person.phone} · {person.email}</div>
              </div>
              <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'10px', fontWeight:700, background: person.registered ? '#D1FAE5' : '#FEF3C7', color: person.registered ? '#059669' : '#D97706' }}>
                {person.registered ? '가입됨' : '초대 예정'}
              </span>
            </div>
          )}

          {/* 역할 선택 — 2열 카드 그리드 */}
          <SecLabel label="역할 선택" />
          <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'12px', lineHeight:1.5 }}>
            역할 선택 시 기본 권한이 자동으로 설정됩니다. 다음 단계에서 세부 조정 가능합니다.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
            {roleKeys.map(r => {
              const info   = ROLES[r]
              const active = role === r
              const defPerms = ROLE_DEFAULT_PERMISSIONS[r] || []
              return (
                <button key={r} onClick={() => selectRole(r)}
                  style={{
                    background: active ? info.bg : COLORS.bgCard,
                    border: `2px solid ${active ? info.color : COLORS.borderSoft}`,
                    borderRadius:'16px', padding:'14px 12px',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    boxShadow: active ? `0 4px 16px ${info.color}30` : SHADOWS.card,
                    transition:'all 0.15s', display:'flex', flexDirection:'column', gap:'8px',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: active ? info.color : info.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', transition:'all 0.15s' }}>
                      {info.icon}
                    </div>
                    {active && (
                      <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:info.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: active ? info.color : COLORS.t1, marginBottom:'2px' }}>{info.label}</div>
                    <div style={{ fontSize:'9px', color:COLORS.t4, lineHeight:1.5 }}>{info.desc}</div>
                  </div>
                  {/* 기본 권한 프리뷰 태그 */}
                  {defPerms.length > 0 ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'3px' }}>
                      {defPerms.slice(0,3).map(pid => {
                        const pinfo = PERMISSIONS.find(p => p.id === pid)
                        return pinfo ? (
                          <span key={pid} style={{ padding:'2px 5px', borderRadius:'6px', background: active ? `${info.color}20` : COLORS.bgMuted, color: active ? info.color : COLORS.t4, fontSize:'9px', fontWeight:600 }}>
                            {pinfo.label}
                          </span>
                        ) : null
                      })}
                      {defPerms.length > 3 && (
                        <span style={{ padding:'2px 5px', borderRadius:'6px', background:COLORS.bgMuted, color:COLORS.t4, fontSize:'9px', fontWeight:600 }}>
                          +{defPerms.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize:'9px', color:COLORS.t5 }}>권한 없음 (조회 전용)</div>
                  )}
                  {/* 결재 단계 뱃지 */}
                  {ROLE_DEFAULT_APPROVAL_STEP[r] !== null && (
                    <div style={{ display:'flex', alignItems:'center', gap:'3px', marginTop:'1px' }}>
                      <span style={{ fontSize:'8px', padding:'2px 6px', borderRadius:'6px', background: active ? `${info.color}30` : '#F3F4F6', color: active ? info.color : COLORS.t4, fontWeight:700 }}>
                        🔀 {ROLE_DEFAULT_APPROVAL_STEP[r]}차 승인자
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 역할 선택됐을 때 권한 요약 배너 */}
          {role && (
            <div style={{ background:`${ROLES[role].color}0E`, border:`1px solid ${ROLES[role].color}30`, borderRadius:RADIUS.lg, padding:'12px 14px', marginBottom:'20px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <div style={{ fontSize:'18px', flexShrink:0 }}>{ROLES[role].icon}</div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:ROLES[role].color, marginBottom:'4px' }}>
                  {ROLES[role].label} 기본 권한 {ROLE_DEFAULT_PERMISSIONS[role].length}개 적용 예정
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {ROLE_DEFAULT_PERMISSIONS[role].length === 0
                    ? <span style={{ fontSize:'10px', color:COLORS.t4 }}>기본 권한 없음 · 3단계에서 직접 추가 가능</span>
                    : ROLE_DEFAULT_PERMISSIONS[role].map(pid => {
                        const pinfo = PERMISSIONS.find(p => p.id === pid)
                        return pinfo ? (
                          <span key={pid} style={{ padding:'2px 8px', borderRadius:'8px', background:ROLES[role].bg, color:ROLES[role].color, fontSize:'10px', fontWeight:600 }}>
                            {pinfo.label}
                          </span>
                        ) : null
                      })
                  }
                </div>
              </div>
            </div>
          )}

          {/* 소속 부서 */}
          <SecLabel label="소속 부서" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
            {DEPT_LIST.map(d => (
              <button key={d} onClick={() => setDept(prev => prev === d ? '' : d)}
                style={{ padding:'7px 14px', borderRadius:'20px', border:`1.5px solid ${dept === d ? theme.brand : COLORS.borderSoft}`, background: dept === d ? theme.brand : '#fff', color: dept === d ? '#fff' : COLORS.t3, fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)', display:'flex', gap:'8px' }}>
          <button onClick={() => setStep(1)}
            style={{ width:'80px', height:'50px', background:COLORS.bgMuted, color:COLORS.t2, border:'none', borderRadius:RADIUS.md, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            이전
          </button>
          <button onClick={() => role && setStep(3)} disabled={!role}
            style={{ flex:1, height:'50px', background: role ? theme.activeBtnGrad : COLORS.bgMuted, color: role ? '#fff' : COLORS.t4, border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor: role ? 'pointer' : 'default', fontFamily:'inherit', boxShadow: role ? theme.activeShadow : 'none', transition:'all 0.2s' }}>
            {role ? `${ROLES[role].label} 선택 · 다음` : '역할을 선택하세요'}
          </button>
        </div>
      </>
    )
  }

  // ══════════════════════════
  // STEP 3 — 권한 세부 조정
  // ══════════════════════════
  const Step3 = () => {
    const roleInfo = ROLES[role] || ROLES.viewer
    const hasPerm  = (id) => permissions.includes(id)
    return (
      <>
        <Header onBack={() => setStep(2)} title="구성원 추가" sub="3단계 · 권한 세부 조정" />
        <ProgressBar />
        <div style={{ padding:'16px 16px 100px' }}>

          {/* 역할 적용 배너 */}
          <div style={{ background:roleInfo.bg, border:`1px solid ${roleInfo.color}40`, borderRadius:RADIUS.lg, padding:'12px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ fontSize:'24px' }}>{roleInfo.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:roleInfo.color, marginBottom:'1px' }}>
                {roleInfo.label} 기본값 적용됨
              </div>
              <div style={{ fontSize:'10px', color:COLORS.t3 }}>각 항목을 눌러 권한을 추가·제거할 수 있습니다</div>
            </div>
            <button onClick={() => setPermissions([...(ROLE_DEFAULT_PERMISSIONS[role]||[])])}
              style={{ padding:'5px 10px', background:'rgba(255,255,255,0.7)', border:`1px solid ${roleInfo.color}50`, borderRadius:'10px', fontSize:'10px', fontWeight:700, color:roleInfo.color, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              초기화
            </button>
          </div>

          {/* 그룹별 권한 토글 */}
          {permsByGroup.map(g => (
            <div key={g.id} style={{ marginBottom:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px' }}>
                <span style={{ fontSize:'14px' }}>{g.icon}</span>
                <span style={{ fontSize:'11px', fontWeight:700, color:COLORS.t3, letterSpacing:'0.5px', textTransform:'uppercase' }}>{g.label}</span>
              </div>
              <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, overflow:'hidden' }}>
                {g.perms.map((perm, i, arr) => {
                  const on = hasPerm(perm.id)
                  return (
                    <button key={perm.id} onClick={() => togglePerm(perm.id)}
                      style={{ width:'100%', padding:'12px 16px', background: on ? `${theme.brand}08` : COLORS.bgCard, border:'none', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.15s' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0, background: on ? theme.brand : 'transparent', border: on ? `2px solid ${theme.brand}` : `2px solid ${COLORS.borderSoft}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                        {on && <svg width="12" height="10" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'12px', fontWeight:600, color: on ? COLORS.t1 : COLORS.t3, marginBottom:'1px' }}>{perm.label}</div>
                        <div style={{ fontSize:'10px', color:COLORS.t4 }}>{perm.sub}</div>
                      </div>
                      {on && <span style={{ fontSize:'9px', padding:'2px 7px', background:`${theme.brand}18`, color:theme.brand, borderRadius:'10px', fontWeight:700, flexShrink:0 }}>활성</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* 집행 금액 한도 */}
          {hasPerm('execute') && (
            <>
              <SecLabel label="집행 금액 한도" />
              <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, padding:'14px 16px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'10px' }}>
                <input type="number" value={amountLimit} onChange={e => setAmountLimit(e.target.value)} placeholder="한도 없음"
                  style={{ flex:1, fontSize:'17px', fontWeight:700, color:COLORS.t1, background:'transparent', border:'none', outline:'none', fontFamily:'inherit' }}/>
                <span style={{ fontSize:'14px', color:COLORS.t3, fontWeight:600 }}>원 이하</span>
              </div>
              <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'20px', padding:'0 4px' }}>
                비워두면 한도 없음 · 한도 초과 시 상위 결재자 승인 자동 요청
              </div>
            </>
          )}

          {/* 결재라인 단계 */}
          {hasPerm('approve') && (
            <>
              <SecLabel label="결재라인 단계" />
              <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'10px', lineHeight:1.5 }}>
                이 구성원이 결재 체인에서 몇 번째 승인자 역할을 맡는지 설정합니다.
              </div>
              <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, borderRadius:RADIUS.lg, overflow:'hidden', marginBottom:'20px' }}>
                {[
                  { step:1, label:'1차 승인자', sub:'첫 번째 검토 단계 (주로 팀장)' },
                  { step:2, label:'2차 승인자', sub:'1차 승인 후 검토 (주로 부서장)' },
                  { step:3, label:'3차 승인자', sub:'고액 집행 전 검토 (주로 재무)' },
                  { step:4, label:'최종 결재자', sub:'결재라인 마지막 단계 (기관장 등)' },
                ].map((s, i, arr) => (
                  <button key={s.step} onClick={() => setApprovalStep(s.step)}
                    style={{ width:'100%', padding:'12px 14px', background: approvalStep === s.step ? `${theme.brand}08` : COLORS.bgCard, border:'none', borderBottom: i < arr.length-1 ? `1px solid ${COLORS.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.15s' }}>
                    <div style={{ width:'20px', height:'20px', borderRadius:'50%', border: approvalStep === s.step ? `7px solid ${theme.brand}` : `2px solid ${COLORS.t5}`, background:COLORS.bgCard, flexShrink:0, transition:'all .15s' }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color: approvalStep === s.step ? theme.brand : COLORS.t1, marginBottom:'1px' }}>{s.label}</div>
                      <div style={{ fontSize:'10px', color:COLORS.t4 }}>{s.sub}</div>
                    </div>
                    {approvalStep === s.step && (
                      <span style={{ fontSize:'9px', padding:'2px 7px', background:`${theme.brand}18`, color:theme.brand, borderRadius:'10px', fontWeight:700, flexShrink:0 }}>선택됨</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 최종 요약 카드 */}
          <div style={{ background:COLORS.bgCard, boxShadow:SHADOWS.card, border:`1.5px solid ${theme.brand}30`, borderRadius:RADIUS.lg, padding:'16px', marginTop:'4px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:theme.brandDark, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'12px' }}>📋 추가 요약</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[
                { label:'구성원',     value: person?.name || '-' },
                { label:'역할',       value: `${roleInfo.icon} ${roleInfo.label}` },
                { label:'부서',       value: dept || '미지정' },
                { label:'권한',       value: permissions.length > 0 ? `${permissions.length}개 활성` : '없음' },
                { label:'집행 한도',  value: amountLimit ? `${fmt(Number(amountLimit))}원 이하` : '한도 없음' },
                ...(permissions.includes('approve')
                  ? [{ label:'결재 단계', value: `${approvalStep}차 승인자` }]
                  : []),
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:COLORS.t4 }}>{row.label}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position:'sticky', bottom:0, padding:'12px 16px 24px', background:COLORS.bgCard, borderTop:`1px solid ${COLORS.borderSoft}`, boxShadow:'0 -4px 16px rgba(0,0,0,0.06)', display:'flex', gap:'8px' }}>
          <button onClick={() => setStep(2)}
            style={{ width:'80px', height:'50px', background:COLORS.bgMuted, color:COLORS.t2, border:'none', borderRadius:RADIUS.md, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            이전
          </button>
          <button onClick={() => {
            if (!person || !role) return
            onDone({
              id: `m${Date.now()}`,
              name: person.name, phone: person.phone, email: person.email,
              role, dept: dept || '미지정',
              joinDate: new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\. /g,'.').replace('.',''),
              permissions,
              amountLimit: amountLimit ? Number(amountLimit) : null,
              approvalStep: permissions.includes('approve') ? approvalStep : null,
            })
          }}
            style={{ flex:1, height:'50px', background:theme.activeBtnGrad, color:'#fff', border:'none', borderRadius:RADIUS.md, fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
            {person?.registered ? '구성원 등록' : `${person?.name}에게 초대 발송`}
          </button>
        </div>
      </>
    )
  }

  if (step === 1) return <Step1 />
  if (step === 2) return <Step2 />
  return <Step3 />
}

// ═══════════════════════════════════════════════════════════
// ── 메인 ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function AdminManagement() {
  const [view, setView]                 = useState('main')
  const [members, setMembers]           = useState(DEMO_MEMBERS)
  const [selectedMember, setSelectedMember] = useState(null)
  const scrollRef = useScrollRestore()

  // view: main | members | member_detail | add_member | approval | budget | evidence | auditlog | escalation | invite

  const handleSave = (updated) => {
    setMembers(ms => ms.map(m => m.id === updated.id ? updated : m))
    setView('members')
  }
  const handleRemove = (id) => {
    setMembers(ms => ms.filter(m => m.id !== id))
    setView('members')
  }
  const handleAddDone = (newMember) => {
    setMembers(ms => [...ms, newMember])
    setView('members')
  }

  const renderView = () => {
    switch (view) {
      case 'members':
        return <MemberListView members={members} onMember={m => { setSelectedMember(m); setView('member_detail') }} onBack={() => setView('main')} onAdd={() => setView('add_member')} />
      case 'member_detail':
        return selectedMember ? <MemberDetailView member={selectedMember} onBack={() => setView('members')} onSave={handleSave} onRemove={handleRemove} /> : null
      case 'add_member':
        return <MemberAddFlow onBack={() => setView('members')} onDone={handleAddDone} />
      case 'approval':
        return <ApprovalLineView onBack={() => setView('main')} />
      case 'budget':
        return <BudgetCodeView onBack={() => setView('main')} />
      case 'evidence':
        return <EvidenceRuleView onBack={() => setView('main')} />
      case 'auditlog':
        return <AuditLogView onBack={() => setView('main')} />
      case 'escalation':
        return <EscalationView onBack={() => setView('main')} />
      case 'invite':
        return <InviteView onBack={() => setView('main')} onDone={() => setView('main')} />
      default:
        return <MainHub members={members} onNav={v => setView(v)} onInvite={() => setView('invite')} />
    }
  }

  return (
    <PhoneShell>
    </PhoneShell>
  )
}
