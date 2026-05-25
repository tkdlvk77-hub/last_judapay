import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PhoneShell } from '../design/components'
import { COLORS, RADIUS, SHADOWS } from '../design/tokens'
import { getAccountTheme } from '../design/accountTokens'
import { getLang } from '../design/i18n'
import BottomTab from '../components/BottomTab'
import {
  subscribe,
  getMsg, setMsg,
  getYearGoals, setYearGoals,
  getQuarterGoals, setQuarterGoals,
  getQuarterDone, toggleQuarterDone,
  getProjects, addProject, updateProjectStatus, removeProject,
  getVis, setVis,
  getCurrentQuarter,
  getCompanyActivityFeed,
  getOperationStability,
  getActivityContinuity,
  getTrustSignals,
  STATUS_CFG, CATEGORY_CFG, CATEGORY_STATUSES,
} from './companyProfileStore'
import { seedDemoTransactions } from './transactionStore'
import { useScrollRestore } from '../hooks/useScrollRestore'
import { useUser } from '../contexts/UserContext'

// 로그인 사용자의 실제 회사명 우선, 없으면 데모 COMPANY.name
function useLiveCompanyName() {
  const { currentUser } = useUser()
  return currentUser?.company || currentUser?.name || null
}

// 데모 데이터 초기화 (개발용)
seedDemoTransactions()

const S = {
  intro:      { ko: '소개',    en: 'About' },
  activity:   { ko: '활동',    en: 'Activity' },
  operation:  { ko: '운영',    en: 'Operations' },
  projects:   { ko: '프로젝트', en: 'Projects' },
  save:       { ko: '저장',    en: 'Save' },
  edit:       { ko: '수정',    en: 'Edit' },
}
const s = (key, lang) => S[key]?.[lang] || S[key]?.ko || key

// ─── 회사 기본 데이터 ─────────────────────────────────────
const COMPANY = {
  name: '㈜주다컴퍼니', status: '정상 운영 중', lastActive: '12분 전',
  location: '서울 강남구', founded: '2023.03', bizNo: '123-45-67890',
}

// ─── store 구독 훅 ────────────────────────────────────────
function useProfileStore() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const unsub = subscribe(() => forceUpdate(n => n + 1))
    return unsub
  }, [])
}

// 공개 설정
const VISIBILITY_OPTS = [
  { key:'public',  ko:'🌐 전체 공개' },
  { key:'bizOnly', ko:'🏢 기업만' },
  { key:'private', ko:'🔒 비공개' },
]
function VisBtn({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const cur = VISIBILITY_OPTS.find(o => o.key === value) || VISIBILITY_OPTS[0]
  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', background:COLORS.bgMuted, border:'none', fontSize:'11px', fontWeight:600, color:COLORS.t3, cursor:'pointer', fontFamily:'inherit' }}>
        {cur.ko}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={COLORS.t4} strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:'32px', background:'#fff', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, overflow:'hidden', minWidth:'120px' }}>
          {VISIBILITY_OPTS.map(opt => (
            <button key={opt.key} onClick={() => { onChange(opt.key); setOpen(false) }}
              style={{ width:'100%', padding:'10px 14px', display:'flex', alignItems:'center', gap:'8px', background:opt.key===value?COLORS.bg:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:opt.key===value?700:500, color:COLORS.t1 }}>
              {opt.ko}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SRow({ title, visKey, onVis, children }) {
  return (
    <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px', marginBottom:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t2 }}>{title}</span>
        <VisBtn value={visKey} onChange={onVis} />
      </div>
      {children}
    </div>
  )
}

// ─── 목표 입력 컴포넌트 ───────────────────────────────────
function GoalInput({ goals, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t4, width:'16px', flexShrink:0 }}>{i+1}.</span>
          <input value={goals[i] || ''} onChange={e => { const next=[...goals]; next[i]=e.target.value; onChange(next) }}
            placeholder={placeholder + (i+1)}
            style={{ flex:1, padding:'10px 12px', borderRadius:'10px', border:'1.5px solid '+COLORS.borderSoft, fontSize:'13px', fontFamily:'inherit', outline:'none' }} />
        </div>
      ))}
    </div>
  )
}

// ─── 탭: 소개 ─────────────────────────────────────────────
function IntroTab({ lang, theme, canEditProfile }) {
  useProfileStore()
  const liveName     = useLiveCompanyName() || COMPANY.name
  const msg          = getMsg()
  const yearGoals    = getYearGoals()
  const quarterGoals = getQuarterGoals()
  const quarterDone  = getQuarterDone()
  const vis          = getVis()

  const [editingMsg,  setEditingMsg]  = useState(false)
  const [editingYear, setEditingYear] = useState(false)
  const [editingQ,    setEditingQ]    = useState(false)
  const [activeQ,     setActiveQ]     = useState(getCurrentQuarter)
  // 수정 중 임시 상태
  const [draftMsg,       setDraftMsg]       = useState('')
  const [draftYearGoals, setDraftYearGoals] = useState([])
  const [draftQGoals,    setDraftQGoals]    = useState([])

  const startEditMsg  = () => { setDraftMsg(msg);                       setEditingMsg(true) }
  const saveMsg       = () => { setMsg(draftMsg);                        setEditingMsg(false) }
  const startEditYear = () => { setDraftYearGoals([...yearGoals]);       setEditingYear(true) }
  const saveYear      = () => { setYearGoals(draftYearGoals);            setEditingYear(false) }
  const startEditQ    = () => { setDraftQGoals([...(quarterGoals[activeQ]??[])]); setEditingQ(true) }
  const saveQ         = () => { setQuarterGoals(activeQ, draftQGoals);   setEditingQ(false) }

  const handleSetActiveQ = (q) => { setActiveQ(q); setEditingQ(false) }

  const curQGoals = quarterGoals[activeQ] ?? []
  const curQDone  = quarterDone[activeQ]  ?? []

  return (
    <div style={{ padding:'20px 16px 32px' }}>

      {/* 기본 정보 */}
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px', marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:theme.headerGrad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:800, color:'#fff', flexShrink:0 }}>
            {(liveName || COMPANY.name).charAt(1) || (liveName || COMPANY.name).charAt(0)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:COLORS.t1, marginBottom:'6px' }}>{liveName || COMPANY.name}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#10B981', flexShrink:0 }} />
                <span style={{ fontSize:'12px', color:'#047857', fontWeight:600 }}>{COMPANY.status}</span>
              </div>
              <span style={{ fontSize:'12px', color:COLORS.t4 }}>📍 {COMPANY.location}</span>
              <span style={{ fontSize:'12px', color:COLORS.t4 }}>🕐 최근 활동 {COMPANY.lastActive}</span>
              <span style={{ fontSize:'12px', color:COLORS.t4 }}>📅 {COMPANY.founded} 설립</span>
            </div>
          </div>
        </div>
      </div>

      {/* 대표 메시지 */}
      <SRow title="대표 메시지" visKey={vis.msg} onVis={v => setVis('msg', v)}>
        {editingMsg ? (
          <div>
            <textarea value={draftMsg} onChange={e => setDraftMsg(e.target.value)} maxLength={300}
              placeholder="5줄 내외로 현재 집중하고 있는 방향, 비전, 진행 상황을 입력해주세요."
              style={{ width:'100%', minHeight:'110px', padding:'12px', borderRadius:'12px', border:'1.5px solid '+COLORS.borderSoft, fontSize:'13px', color:COLORS.t1, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', lineHeight:1.7 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'8px' }}>
              <span style={{ fontSize:'11px', color:COLORS.t4 }}>{draftMsg.length}/300</span>
            </div>
            <button onClick={saveMsg}
              style={{ width:'100%', padding:'12px', background:theme.activeBtnGrad, border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
              저장
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize:'13px', color:COLORS.t2, lineHeight:1.8, whiteSpace:'pre-line', marginBottom:'12px' }}>{msg}</div>
            {canEditProfile ? (
              <button onClick={startEditMsg}
                style={{ padding:'7px 16px', background:theme.brandDark+'10', border:'1px solid '+theme.brandDark+'30', borderRadius:'20px', color:theme.brandDark, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ✏️ 수정
              </button>
            ) : (
              <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'5px 12px', background:'#F3F4F6', borderRadius:'20px' }}>
                <span style={{ fontSize:'12px' }}>🔒</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, fontWeight:600 }}>최고관리자·관리자만 수정 가능</span>
              </div>
            )}
          </div>
        )}
      </SRow>

      {/* 연간 목표 */}
      <SRow title={`${new Date().getFullYear()}년 연간 목표`} visKey={vis.year} onVis={v => setVis('year', v)}>
        {editingYear ? (
          <div>
            <GoalInput goals={draftYearGoals} onChange={setDraftYearGoals} placeholder="연간 목표 " />
            <button onClick={saveYear}
              style={{ marginTop:'12px', width:'100%', padding:'12px', background:theme.activeBtnGrad, border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
              저장
            </button>
          </div>
        ) : (
          <div>
            {yearGoals.filter(Boolean).map((g, i) => (
              <div key={i} style={{ display:'flex', gap:'8px', padding:'8px 0', borderBottom: i < yearGoals.filter(Boolean).length-1 ? '1px solid '+COLORS.borderSoft : 'none' }}>
                <span style={{ color:theme.brandDark, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                <span style={{ fontSize:'13px', color:COLORS.t1 }}>{g}</span>
              </div>
            ))}
            {canEditProfile ? (
              <button onClick={startEditYear}
                style={{ marginTop:'12px', padding:'7px 16px', background:theme.brandDark+'10', border:'1px solid '+theme.brandDark+'30', borderRadius:'20px', color:theme.brandDark, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ✏️ 수정
              </button>
            ) : (
              <div style={{ marginTop:'12px', display:'inline-flex', alignItems:'center', gap:'4px', padding:'5px 12px', background:'#F3F4F6', borderRadius:'20px' }}>
                <span style={{ fontSize:'12px' }}>🔒</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, fontWeight:600 }}>최고관리자·관리자만 수정 가능</span>
              </div>
            )}
          </div>
        )}
      </SRow>

      {/* 분기별 목표 */}
      <SRow title="분기별 목표" visKey={vis.quarter} onVis={v => setVis('quarter', v)}>
        <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
          {['Q1','Q2','Q3','Q4'].map(q => (
            <button key={q} onClick={() => handleSetActiveQ(q)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'10px', border:'1.5px solid '+(activeQ===q?theme.brandDark:COLORS.borderSoft), background:activeQ===q?theme.brandDark+'0E':COLORS.bgCard, color:activeQ===q?theme.brandDark:COLORS.t3, fontSize:'13px', fontWeight:activeQ===q?700:500, cursor:'pointer', fontFamily:'inherit' }}>
              {q}
            </button>
          ))}
        </div>

        {editingQ ? (
          <div>
            <GoalInput goals={draftQGoals} onChange={setDraftQGoals} placeholder={activeQ+" 목표 "} />
            <button onClick={saveQ}
              style={{ marginTop:'12px', width:'100%', padding:'12px', background:theme.activeBtnGrad, border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>
              저장
            </button>
          </div>
        ) : (
          <div>
            {curQGoals.filter(Boolean).map((g, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom: i < curQGoals.filter(Boolean).length-1 ? '1px solid '+COLORS.borderSoft : 'none' }}>
                <button onClick={() => toggleQuarterDone(activeQ, i)}
                  style={{ width:'20px', height:'20px', borderRadius:'6px', border:'2px solid '+(curQDone[i]?theme.brandDark:COLORS.borderSoft), background:curQDone[i]?theme.brandDark:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, padding:0 }}>
                  {curQDone[i] && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                <span style={{ flex:1, fontSize:'13px', color:curQDone[i]?COLORS.t4:COLORS.t1, textDecoration:curQDone[i]?'line-through':'none' }}>{g}</span>
                {curQDone[i] && <span style={{ fontSize:'10px', fontWeight:700, color:'#047857', flexShrink:0 }}>완료</span>}
              </div>
            ))}
            {canEditProfile ? (
              <button onClick={startEditQ}
                style={{ marginTop:'12px', padding:'7px 16px', background:theme.brandDark+'10', border:'1px solid '+theme.brandDark+'30', borderRadius:'20px', color:theme.brandDark, fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ✏️ {activeQ} 수정
              </button>
            ) : (
              <div style={{ marginTop:'12px', display:'inline-flex', alignItems:'center', gap:'4px', padding:'5px 12px', background:'#F3F4F6', borderRadius:'20px' }}>
                <span style={{ fontSize:'12px' }}>🔒</span>
                <span style={{ fontSize:'11px', color:COLORS.t4, fontWeight:600 }}>최고관리자·관리자만 수정 가능</span>
              </div>
            )}
          </div>
        )}
      </SRow>
    </div>
  )
}

// ─── 탭: 활동 ─────────────────────────────────────────────
function ActivityTab({ lang, theme }) {
  useProfileStore()
  const vis    = getVis()
  const [filter, setFilter] = useState('all')

  const FILTERS = [
    { key:'all',      ko:'전체' },
    { key:'payroll',  ko:'급여' },
    { key:'expense',  ko:'운영비' },
    { key:'contract', ko:'계약' },
    { key:'tax',      ko:'세금' },
  ]

  // transactionStore 기반 실제 활동 피드
  const feed     = getCompanyActivityFeed('biz_juda', 30)
  const filtered = filter === 'all' ? feed : feed.filter(a => a.category === filter)

  // 피드가 없을 때 안내 메시지
  const isEmpty = filtered.length === 0

  return (
    <div style={{ padding:'20px 16px 32px' }}>
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, overflow:'hidden' }}>
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>활동 피드</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>실제 운영 활동만 표시 · 금액/거래처 비공개</div>
            </div>
            <VisBtn value={vis.activity} onChange={v => setVis('activity', v)} />
          </div>
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'12px', scrollbarWidth:'none' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding:'5px 13px', borderRadius:'20px', border:'none', flexShrink:0, background:filter===f.key?theme.brandDark:COLORS.bgMuted, color:filter===f.key?'#fff':COLORS.t3, fontSize:'12px', fontWeight:filter===f.key?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                {f.ko}
              </button>
            ))}
          </div>
        </div>
        {isEmpty ? (
          <div style={{ padding:'32px 16px', textAlign:'center', color:COLORS.t4, fontSize:'13px' }}>
            해당 카테고리의 활동 내역이 없습니다.
          </div>
        ) : filtered.map((item, i) => (
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderTop:'1px solid '+COLORS.borderSoft }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'12px', background:theme.brandDark+'12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
              {item.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:COLORS.t1, marginBottom:'2px' }}>{item.text}</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>{item.time}</div>
            </div>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:i===0?theme.brandDark:COLORS.bgMuted, flexShrink:0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 탭: 운영 ─────────────────────────────────────────────
function OperationTab({ lang, theme }) {
  useProfileStore()
  const vis = getVis()

  // transactionStore 기반 실시간 계산 지표
  const stability  = getOperationStability('biz_juda')
  const continuity = getActivityContinuity('biz_juda')
  const trust      = getTrustSignals('biz_juda')

  const ListCard = ({ title, vk, onV, items }) => (
    <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'18px', marginBottom:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <span style={{ fontSize:'13px', fontWeight:700, color:COLORS.t2 }}>{title}</span>
        <VisBtn value={vk} onChange={onV} />
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:i<items.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
          <span style={{ fontSize:'16px', flexShrink:0 }}>{item.icon}</span>
          <span style={{ fontSize:'13px', color:item.ok===false?'#B45309':COLORS.t1, fontWeight:500 }}>{item.text}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ padding:'20px 16px 32px' }}>
      <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:'14px', padding:'12px 16px', marginBottom:'16px', display:'flex', gap:'10px' }}>
        <span style={{ fontSize:'16px', flexShrink:0 }}>💡</span>
        <span style={{ fontSize:'12px', color:'#92400E', lineHeight:1.6 }}>운영 탭은 점수/등급이 아닌 실제 활동 기반으로 표시됩니다.</span>
      </div>
      <ListCard title="운영 안정성"   vk={vis.stability}  onV={v => setVis('stability', v)}  items={stability} />
      <ListCard title="거래 지속성"   vk={vis.continuity} onV={v => setVis('continuity', v)} items={continuity} />
      <ListCard title="활동 신뢰 지표" vk={vis.trust}     onV={v => setVis('trust', v)}      items={trust} />
    </div>
  )
}

// ─── 탭: 프로젝트 ─────────────────────────────────────────
function ProjectTab({ lang, theme, canEditProfile }) {
  useProfileStore()
  const projects = getProjects()
  const vis      = getVis()

  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newStatus,   setNewStatus]   = useState('dev')
  const [newCategory, setNewCategory] = useState('dev')

  const handleAdd = () => {
    if (!newName.trim()) return
    addProject({ name: newName.trim(), status: newStatus, category: newCategory })
    setNewName(''); setAdding(false)
  }

  return (
    <div style={{ padding:'20px 16px 32px', position:'relative' }}>
      <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, overflow:'hidden', marginBottom:'14px' }}>
        <div style={{ padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'2px' }}>진행 중인 프로젝트</div>
              <div style={{ fontSize:'11px', color:COLORS.t4 }}>{projects.length}개 프로젝트</div>
            </div>
            <VisBtn value={vis.projects} onChange={v => setVis('projects', v)} />
          </div>
          {projects.map((pr, i) => {
            const sc = STATUS_CFG[pr.status]
            return (
              <div key={pr.id} style={{ padding:'12px 0', borderBottom:i<projects.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'8px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'3px' }}>{pr.name}</div>
                    <span style={{ fontSize:'11px', color:COLORS.t4 }}>{CATEGORY_CFG[pr.category]?.ko || '기타'}</span>
                  </div>
                  {canEditProfile && (
                    <button onClick={() => removeProject(pr.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:COLORS.t4, fontSize:'18px', padding:'0 4px', flexShrink:0 }}>×</button>
                  )}
                </div>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  {(CATEGORY_STATUSES[pr.category]||CATEGORY_STATUSES.dev).map(key => {
                    const cfg = STATUS_CFG[key]
                    return (
                      <button key={key}
                        onClick={() => canEditProfile && updateProjectStatus(pr.id, key)}
                        style={{ padding:'3px 10px', borderRadius:'20px', border:'none', background:pr.status===key?cfg.bg:COLORS.bgMuted, color:pr.status===key?cfg.color:COLORS.t4, fontSize:'11px', fontWeight:pr.status===key?700:400, cursor:canEditProfile?'pointer':'default', fontFamily:'inherit', opacity:canEditProfile?1:0.7 }}>
                        {cfg.ko}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {canEditProfile ? (
        <button onClick={() => setAdding(true)}
          style={{ width:'100%', padding:'14px', background:COLORS.bgCard, border:'1.5px dashed '+theme.brandDark+'40', borderRadius:'18px', color:theme.brandDark, fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:SHADOWS.card }}>
          + 프로젝트 추가
        </button>
      ) : (
        <div style={{ width:'100%', padding:'14px', background:'#F9FAFB', border:'1.5px dashed '+COLORS.border, borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:SHADOWS.card }}>
          <span style={{ fontSize:'14px' }}>🔒</span>
          <span style={{ fontSize:'13px', color:COLORS.t4, fontWeight:600 }}>최고관리자·관리자만 추가 가능</span>
        </div>
      )}

      {adding && (
        <div style={{ position:'absolute', inset:0, zIndex:100, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div onClick={() => setAdding(false)} style={{ flex:1, background:'rgba(0,0,0,0.5)' }} />
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'12px 20px 40px', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:'#E5E7EB', margin:'0 auto 18px' }} />
            <div style={{ fontSize:'17px', fontWeight:700, color:COLORS.t1, marginBottom:'16px' }}>프로젝트 추가</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="프로젝트명을 입력하세요"
              style={{ width:'100%', padding:'13px 14px', borderRadius:'12px', border:'1.5px solid '+COLORS.borderSoft, fontSize:'14px', fontFamily:'inherit', outline:'none', boxSizing:'border-box', marginBottom:'16px' }} />
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>카테고리</div>
            <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', marginBottom:'16px' }}>
              {Object.entries(CATEGORY_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => { setNewCategory(key); setNewStatus((CATEGORY_STATUSES[key]||CATEGORY_STATUSES.dev)[0]) }}
                  style={{ padding:'7px 12px', borderRadius:'20px', border:'1.5px solid '+(newCategory===key?theme.brandDark+'50':COLORS.borderSoft), background:newCategory===key?theme.brandDark+'12':'#fff', color:newCategory===key?theme.brandDark:COLORS.t3, fontSize:'12px', fontWeight:newCategory===key?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                  {cfg.ko}
                </button>
              ))}
            </div>
            <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>상태</div>
            <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', marginBottom:'24px' }}>
              {(CATEGORY_STATUSES[newCategory]||CATEGORY_STATUSES.dev).map(key => {
                const cfg = STATUS_CFG[key]
                return (
                  <button key={key} onClick={() => setNewStatus(key)}
                    style={{ padding:'7px 12px', borderRadius:'20px', border:'none', background:newStatus===key?cfg.bg:COLORS.bgMuted, color:newStatus===key?cfg.color:COLORS.t4, fontSize:'12px', fontWeight:newStatus===key?700:500, cursor:'pointer', fontFamily:'inherit' }}>
                    {cfg.ko}
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setAdding(false)}
                style={{ flex:1, padding:'14px', background:COLORS.bgMuted, border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:600, color:COLORS.t2, cursor:'pointer', fontFamily:'inherit' }}>취소</button>
              <button onClick={handleAdd}
                style={{ flex:2, padding:'14px', background:theme.activeBtnGrad, border:'none', borderRadius:'14px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:theme.activeShadow }}>추가하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 외부 공개 미리보기 ───────────────────────────────────
function PublicPreview({ theme, onClose }) {
  const liveName = useLiveCompanyName() || COMPANY.name
  const MONTHS_DATA = [
    { m:'3월', total:28900000, revenue:77000000, growth:10.0, newBiz:8,  active:75, cashflow:{ inflow:310000000, outflow:28900000, remaining:2800000000, burn:7.2 } },
    { m:'4월', total:32400000, revenue:89000000, growth:15.6, newBiz:12, active:87, cashflow:{ inflow:350000000, outflow:32400000, remaining:2700000000, burn:8.5 } },
    { m:'5월', total:36200000, revenue:98000000, growth:10.1, newBiz:9,  active:96, cashflow:{ inflow:380000000, outflow:36200000, remaining:2650000000, burn:9.1 } },
  ]
  const CATS = [
    { label:'인건비',   pct:50, color:'#0EA5E9' },
    { label:'운영비',   pct:18, color:'#10B981' },
    { label:'마케팅',   pct:15, color:'#F59E0B' },
    { label:'개발비',   pct:10, color:'#6366F1' },
    { label:'외주비',   pct:5,  color:'#8B5CF6' },
    { label:'법률/세무', pct:2,  color:'#EC4899' },
  ]
  const CARD_SUMMARY = [
    { label:'SaaS / AI', pct:30, color:'#6366F1' },
    { label:'운영비',     pct:45, color:'#10B981' },
    { label:'마케팅',     pct:15, color:'#F59E0B' },
    { label:'교통/출장',  pct:10, color:'#9CA3AF' },
  ]
  const maxTotal = Math.max(...MONTHS_DATA.map(d => d.total))

  const Card = ({ title, children }) => (
    <div style={{ background:COLORS.bgCard, borderRadius:'18px', boxShadow:SHADOWS.card, padding:'16px', marginBottom:'12px' }}>
      <div style={{ fontSize:'14px', fontWeight:700, color:COLORS.t1, marginBottom:'12px' }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ position:'absolute', inset:0, zIndex:50, background:COLORS.bg, display:'flex', flexDirection:'column', overflow:'clip' }}>
      <div style={{ background:theme.headerGrad, paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'20px', paddingBottom:'20px', paddingLeft:'20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
          <button onClick={onClose}
            style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'17px', fontWeight:700, color:'#fff' }}>외부 공개 미리보기</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)' }}>투자자 · 파트너사에게 보이는 화면</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px', background:'rgba(52,211,153,0.2)', border:'1px solid rgba(52,211,153,0.4)', borderRadius:'20px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#34D399' }} />
            <span style={{ fontSize:'10px', color:'#6EE7B7', fontWeight:700 }}>공개중</span>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>

        {/* 1. 대표 메시지 */}
        <Card title="💬 대표 메시지">
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:theme.headerGrad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'#fff', flexShrink:0 }}>
              {(liveName || COMPANY.name).charAt(1) || (liveName || COMPANY.name).charAt(0)}
            </div>
            <div>
              <div style={{ fontSize:'15px', fontWeight:800, color:COLORS.t1 }}>{liveName || COMPANY.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10B981' }} />
                <span style={{ fontSize:'11px', color:'#047857', fontWeight:600 }}>정상 운영 중 · {COMPANY.lastActive}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:'13px', color:COLORS.t2, lineHeight:1.8, whiteSpace:'pre-line', padding:'12px', background:COLORS.bg, borderRadius:'12px' }}>
            {'이번 달은 기업 자금 자동화 기능 안정화에 집중하고 있습니다.\n\nPG 인프라 구축 및 기업 운영 시스템 연동을 진행 중입니다.\n\n실시간 기업 운영 데이터를 기반으로 자금 흐름 시스템을 개발하고 있습니다.'}
          </div>
        </Card>

        {/* 2. 연간 목표 / 분기 목표 */}
        <Card title="🎯 연간 목표 / 분기 목표">
          <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>2026년 연간 목표</div>
          {['PG 라이센스 취득','기업 운영 시스템 고도화','투자 연동 구조 구축','기업회원 200곳 확보'].map((g, i) => (
            <div key={i} style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:i<3?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ color:theme.brandDark, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
              <span style={{ fontSize:'13px', color:COLORS.t1 }}>{g}</span>
            </div>
          ))}
          <div style={{ height:'1px', background:COLORS.borderSoft, margin:'12px 0' }} />
          <div style={{ fontSize:'12px', fontWeight:700, color:COLORS.t3, marginBottom:'8px' }}>Q2 분기 목표</div>
          {['자동정산 시스템 구축','기업회원 확대','운영 안정화','투자자 데모데이'].map((g, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:i<3?'1px solid '+COLORS.borderSoft:'none' }}>
              <div style={{ width:'18px', height:'18px', borderRadius:'5px', border:'2px solid '+COLORS.borderSoft, background:'#fff', flexShrink:0 }} />
              <span style={{ fontSize:'13px', color:COLORS.t1 }}>{g}</span>
            </div>
          ))}
        </Card>

        {/* 3. 이번 달 핵심 요약 */}
        <Card title="📋 이번 달 핵심 요약">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
            {[
              { label:'총 집행액',    value:'3,640만원' },
              { label:'총 매출',      value:'9,800만원' },
              { label:'운영 가능 자금', value:'26.5억원' },
              { label:'활성 기업',    value:'96곳' },
            ].map((item, i) => (
              <div key={i} style={{ background:COLORS.bg, borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:COLORS.t4, marginBottom:'4px', fontWeight:600 }}>{item.label}</div>
                <div style={{ fontSize:'16px', fontWeight:800, color:COLORS.t1 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {['최근 90일 정상 운영 유지','최근 3개월 급여 지연 없음','외주 및 운영비 정상 처리 중'].map((t, i) => (
            <div key={i} style={{ display:'flex', gap:'8px', padding:'6px 0', borderBottom:i<2?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ color:'#047857', fontWeight:700, flexShrink:0 }}>✓</span>
              <span style={{ fontSize:'12px', color:COLORS.t2 }}>{t}</span>
            </div>
          ))}
        </Card>

        {/* 4. 최근 3개월 자금 흐름 */}
        <Card title="💰 최근 3개월 자금 흐름">
          <div style={{ overflowX:'auto', marginBottom:'12px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr>
                  {['항목','3월','4월','5월'].map((h,i) => (
                    <td key={i} style={{ padding:'6px 8px', color:COLORS.t4, fontWeight:700, borderBottom:'1px solid '+COLORS.borderSoft, textAlign:i===0?'left':'right' }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:'총 집행', fn: d => (d.total/10000).toFixed(0)+'만' },
                  { label:'총 매출', fn: d => (d.revenue/10000).toFixed(0)+'만' },
                  { label:'잔여 자금', fn: d => (d.cashflow.remaining/100000000).toFixed(1)+'억' },
                  { label:'소진율', fn: d => d.cashflow.burn+'%' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding:'8px', color:COLORS.t2, fontWeight:600, borderBottom:'1px solid '+COLORS.borderSoft }}>{row.label}</td>
                    {MONTHS_DATA.map((d, j) => (
                      <td key={j} style={{ padding:'8px', fontWeight:700, color:j===2?theme.brandDark:COLORS.t1, textAlign:'right', borderBottom:'1px solid '+COLORS.borderSoft }}>{row.fn(d)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'12px', background:COLORS.bg, borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'12px', color:COLORS.t3 }}>예상 운영 가능 기간</span>
            <span style={{ fontSize:'18px', fontWeight:800, color:'#047857' }}>약 14개월</span>
          </div>
        </Card>

        {/* 5. 최근 3개월 매출 및 성장 */}
        <Card title="📈 최근 3개월 매출 및 성장">
          <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'80px', marginBottom:'12px' }}>
            {MONTHS_DATA.map((d, i) => {
              const isLast = i===MONTHS_DATA.length-1
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ fontSize:'9px', color:isLast?theme.brandDark:COLORS.t4, fontWeight:isLast?700:400 }}>{(d.revenue/10000).toFixed(0)}만</div>
                  <div style={{ width:'100%', borderRadius:'4px 4px 0 0', height:Math.max(6, d.revenue/Math.max(...MONTHS_DATA.map(x=>x.revenue))*56)+'px', background:isLast?theme.activeBtnGrad:COLORS.bgMuted }} />
                  <div style={{ fontSize:'10px', color:isLast?theme.brandDark:COLORS.t4, fontWeight:isLast?700:400 }}>{d.m}</div>
                </div>
              )
            })}
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr>
                  {['항목','3월','4월','5월'].map((h,i) => (
                    <td key={i} style={{ padding:'6px 8px', color:COLORS.t4, fontWeight:700, borderBottom:'1px solid '+COLORS.borderSoft, textAlign:i===0?'left':'right' }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:'성장률',     fn: d => '+'+d.growth+'%' },
                  { label:'신규 기업',  fn: d => d.newBiz+'곳' },
                  { label:'활성 기업',  fn: d => d.active+'곳' },
                ].map((row, i, arr) => (
                  <tr key={i}>
                    <td style={{ padding:'8px', color:COLORS.t2, fontWeight:600, borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>{row.label}</td>
                    {MONTHS_DATA.map((d, j) => (
                      <td key={j} style={{ padding:'8px', fontWeight:700, color:j===2?theme.brandDark:COLORS.t1, textAlign:'right', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>{row.fn(d)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 6. 월 집행 현황 */}
        <Card title="📊 월 집행 현황 (카테고리별)">
          {CATS.map((cat, i) => (
            <div key={i} style={{ marginBottom:i<CATS.length-1?'10px':0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:cat.color }} />
                  <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{cat.label}</span>
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:cat.color }}>{cat.pct}%</span>
              </div>
              <div style={{ height:'6px', borderRadius:'3px', background:COLORS.bgMuted, overflow:'hidden' }}>
                <div style={{ width:cat.pct+'%', height:'100%', background:cat.color, borderRadius:'3px' }} />
              </div>
            </div>
          ))}
        </Card>

        {/* 7. 운영 안정성 */}
        <Card title="🛡️ 운영 안정성 현황">
          {['최근 3개월 급여 정상 지급','자동 운영비 정상 처리','세금 신고 정상 제출','외주 정산 지연 없음','운영 중단 기록 없음'].map((t, i, arr) => (
            <div key={i} style={{ display:'flex', gap:'8px', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ color:'#047857', fontWeight:700, flexShrink:0 }}>✅</span>
              <span style={{ fontSize:'13px', color:COLORS.t1 }}>{t}</span>
            </div>
          ))}
        </Card>

        {/* 8. 법인카드 사용 요약 */}
        <Card title="💳 법인카드 사용 요약">
          <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'10px' }}>카테고리 기반 · 상세 내역 비공개</div>
          {CARD_SUMMARY.map((c, i) => (
            <div key={i} style={{ marginBottom:i<CARD_SUMMARY.length-1?'8px':0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={{ fontSize:'12px', color:COLORS.t2 }}>{c.label}</span>
                <span style={{ fontSize:'12px', fontWeight:700, color:c.color }}>{c.pct}%</span>
              </div>
              <div style={{ height:'5px', borderRadius:'3px', background:COLORS.bgMuted, overflow:'hidden' }}>
                <div style={{ width:c.pct+'%', height:'100%', background:c.color, borderRadius:'3px' }} />
              </div>
            </div>
          ))}
        </Card>

        {/* 9. 인력 및 인건비 구조 */}
        <Card title="👥 인력 및 인건비 구조">
          <div style={{ fontSize:'11px', color:COLORS.t4, marginBottom:'10px' }}>실명 및 개별 급여 비공개</div>
          {[
            { role:'개발', count:3, pct:44 },
            { role:'기획', count:2, pct:26 },
            { role:'운영', count:2, pct:22 },
            { role:'인턴', count:1, pct:8 },
          ].map((b, i, arr) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:theme.brandDark+'12', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:theme.brandDark, flexShrink:0 }}>{b.count}명</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:COLORS.t1 }}>{b.role}</span>
                  <span style={{ fontSize:'11px', color:COLORS.t4 }}>{b.pct}%</span>
                </div>
                <div style={{ height:'4px', borderRadius:'2px', background:COLORS.bgMuted, overflow:'hidden' }}>
                  <div style={{ width:b.pct+'%', height:'100%', background:theme.brandDark, borderRadius:'2px' }} />
                </div>
              </div>
            </div>
          ))}
        </Card>

        {/* 10. 세무 / 보험 현황 */}
        <Card title="🧾 세무 / 보험 현황">
          {['부가세 신고 완료','원천세 신고 완료','4대보험 정상 납부 중','세무 정산 정상 처리 완료'].map((t, i, arr) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ fontSize:'13px', color:COLORS.t2 }}>{t}</span>
              <span style={{ fontSize:'12px', fontWeight:700, color:'#047857' }}>완료 ✓</span>
            </div>
          ))}
        </Card>

        {/* 11. 외부 금융 데이터 검증 */}
        <Card title="🔍 외부 금융 데이터 검증">
          <div style={{ padding:'12px', background:'#F0FDF4', borderRadius:'12px', marginBottom:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#047857', marginBottom:'4px' }}>✅ 외부 금융 데이터 검증 완료</div>
            <div style={{ fontSize:'12px', color:'#065F46' }}>쿠콘 API 기반 · 2026.05.01 검증</div>
          </div>
          {['실제 계좌 흐름 데이터 일치 확인','운영 자금 흐름 정상 검증 완료','수령인 매출 대조 일치 확인'].map((t, i, arr) => (
            <div key={i} style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ color:'#047857', fontWeight:700, flexShrink:0 }}>✓</span>
              <span style={{ fontSize:'12px', color:COLORS.t2 }}>{t}</span>
            </div>
          ))}
        </Card>

        {/* 12. 다음 달 계획 */}
        <Card title="🚀 다음 달 계획">
          {['PG 심사 준비 완료','자동정산 기능 개발 완료 예정','신규 기업회원 확보','기업 운영 리포트 기능 고도화'].map((t, i, arr) => (
            <div key={i} style={{ display:'flex', gap:'8px', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid '+COLORS.borderSoft:'none' }}>
              <span style={{ color:theme.brandDark, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
              <span style={{ fontSize:'13px', color:COLORS.t1 }}>{t}</span>
            </div>
          ))}
        </Card>

      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
export default function CompanyProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = getAccountTheme()
  const scrollRef = useScrollRestore()
  const [lang, setLang] = useState(getLang())
  const [tab, setTab] = useState(location.state?.tab || 'intro')
  const [showPreview, setShowPreview] = useState(false)

  // [권한] 기업 프로필 수정·프로젝트 추가/삭제는 master/admin만 가능
  const bizRole = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bizRole') || '' : ''
  const PROFILE_EDIT_ROLES = ['master', 'admin']
  const canEditProfile = PROFILE_EDIT_ROLES.includes(bizRole)

  useEffect(() => {
    const h = () => setLang(getLang())
    window.addEventListener('langchange', h)
    return () => window.removeEventListener('langchange', h)
  }, [])

  const TABS = [
    { key:'intro',     label:s('intro',lang) },
    { key:'activity',  label:s('activity',lang) },
    { key:'operation', label:s('operation',lang) },
    { key:'projects',  label:s('projects',lang) },
  ]

  return (
    <PhoneShell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>

          {/* 헤더 — 고정 */}
          <div style={{ background:theme.headerGrad, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'max(24px, env(safe-area-inset-top))', paddingRight:'16px', paddingBottom:'14px', paddingLeft:'16px' }}>
              <button onClick={() => navigate(-1)}
                style={{ width:'32px', height:'32px', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <span style={{ fontSize:'18px', fontWeight:700, color:'#fff', flex:1 }}>기업 프로필</span>
              <button onClick={() => setShowPreview(true)}
                style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 12px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#34D399' }} />
                <span style={{ fontSize:'11px', color:'#fff', fontWeight:600 }}>외부공개중</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <div style={{ display:'flex', padding:'0 16px' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex:1, padding:'10px 4px', background:'transparent', border:'none', borderBottom:tab===t.key?'2.5px solid #fff':'2.5px solid transparent', color:tab===t.key?'#fff':'rgba(255,255,255,0.55)', fontSize:'13px', fontWeight:tab===t.key?700:400, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

        {/* 탭 콘텐츠 — 스크롤 영역 */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background:'#F4F6FB', position:'relative' }}>
          {/* 외부공개 미리보기 오버레이 */}
          {showPreview && <PublicPreview theme={theme} onClose={() => setShowPreview(false)} />}

          {/* 탭별 콘텐츠 */}
          {tab === 'intro'     && <IntroTab     lang={lang} theme={theme} canEditProfile={canEditProfile} />}
          {tab === 'activity'  && <ActivityTab  lang={lang} theme={theme} />}
          {tab === 'operation' && <OperationTab lang={lang} theme={theme} />}
          {tab === 'projects'  && <ProjectTab   lang={lang} theme={theme} canEditProfile={canEditProfile} />}
        </div>
      </div>
      <BottomTab />
    </PhoneShell>
  )
}
