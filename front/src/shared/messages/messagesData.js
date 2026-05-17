// ─── 정적 더미 데이터 ───────────────────────────────────────
// 서버 연동 시 이 파일을 API 호출로 교체
// ────────────────────────────────────────────────────────────

export const THREADS = [
  {
    id: 'approval', name: '처리센터 알림', initial: '📋', emoji: '📋',
    avatarBg: '#1E3A5F', avatarFg: '#FFFFFF',
    type: '처리센터', typeBg: '#EDF3FA', typeColor: '#2D6BB0',
    amount: 0, balance: 0,
    lastMsg: '박철수 님이 검수 승인하였습니다.',
    time: '15:30', unread: 3,
    status: 'normal', statusLabel: '정상', statusBg: '#E6F5EF', statusColor: '#2A7D5E',
    totalExecuted: 0, totalAmount: 1,
    role: '처리 내역 알림',
    msgCat: '내부', txCat: '내부',
  },
  {
    id: '1', name: '박철수', initial: '박', emoji: null,
    avatarBg: '#EF4444', avatarFg: '#FFFFFF',
    type: '외주비', typeBg: '#EDF3FA', typeColor: '#2D6BB0',
    amount: 5000000, balance: 3500000,
    lastMsg: '검수 확인 후 잔금 부탁드립니다',
    time: '14:22', unread: 2,
    status: 'warning', statusLabel: '검수 대기', statusBg: '#FFF4E0', statusColor: '#C8821A',
    totalExecuted: 1500000, totalAmount: 5000000,
    role: '외주 수급인',
    msgCat: '외부', txCat: '거래',
  },
  {
    id: '2', name: '이유진', initial: '이', emoji: '👧',
    avatarBg: '#FCD34D', avatarFg: '#92400E',
    type: '대여금', typeBg: '#FFF4E0', typeColor: '#C8821A',
    amount: 5000000, balance: 45000,
    lastMsg: '차용증 서명 완료했습니다',
    time: '어제', unread: 0,
    status: 'normal', statusLabel: '정상', statusBg: '#E6F5EF', statusColor: '#2A7D5E',
    totalExecuted: 5000000, totalAmount: 5000000,
    role: '가족 구성원 (딸)',
    msgCat: '외부', txCat: '대여',
  },
  {
    id: '3', name: 'ㄱ오로라', initial: 'ㄱ', emoji: null,
    avatarBg: '#1F2937', avatarFg: '#FFFFFF',
    type: '엔젤 투자', typeBg: '#E6F5EF', typeColor: '#2A7D5E',
    amount: 50000000, balance: 17600000,
    lastMsg: '4월 집행 내역 공유드립니다',
    time: '3일 전', unread: 0,
    status: 'warning', statusLabel: '소진 이상', statusBg: '#FCEBEB', statusColor: '#D94040',
    totalExecuted: 32400000, totalAmount: 50000000,
    role: '투자 수령인',
    msgCat: '기관', txCat: '기관',
  },
  {
    id: '4', name: '김창업', initial: '김', emoji: null,
    avatarBg: '#7C3AED', avatarFg: '#FFFFFF',
    type: '외주비', typeBg: '#EDF3FA', typeColor: '#2D6BB0',
    amount: 5000000, balance: 3500000,
    lastMsg: '계약서 확인 부탁드립니다',
    time: '5일 전', unread: 0,
    status: 'normal', statusLabel: '정상', statusBg: '#E6F5EF', statusColor: '#2A7D5E',
    totalExecuted: 1500000, totalAmount: 5000000,
    role: '외주 수급인',
    msgCat: '외부', txCat: '거래',
  },
  {
    id: '5', name: '박민준', initial: '박', emoji: null,
    avatarBg: '#0EA5E9', avatarFg: '#FFFFFF',
    type: '대여금', typeBg: '#FFF4E0', typeColor: '#C8821A',
    amount: 2000000, balance: 1800000,
    lastMsg: '이번 달 이자는 제때 납부할게요!',
    time: '오늘', unread: 1,
    status: 'normal', statusLabel: '정상', statusBg: '#E6F5EF', statusColor: '#2A7D5E',
    totalExecuted: 200000, totalAmount: 2000000,
    role: '지인 (대학 동기)',
    msgCat: '외부', txCat: '대여',
  },
  {
    id: '6', name: '이서현', initial: '이', emoji: '👶',
    avatarBg: '#F472B6', avatarFg: '#FFFFFF',
    type: '용돈선물', typeBg: '#FDF2F8', typeColor: '#BE185D',
    amount: 300000, balance: 0,
    lastMsg: '고마워요 언니! 잘 쓸게요 ☺️',
    time: '어제', unread: 0,
    status: 'normal', statusLabel: '완료', statusBg: '#E6F5EF', statusColor: '#2A7D5E',
    totalExecuted: 300000, totalAmount: 300000,
    role: '가족 구성원 (조카)',
    msgCat: '외부', txCat: '거래',
  },
  {
    id: '7', name: '최디자인', initial: '최', emoji: null,
    avatarBg: '#10B981', avatarFg: '#FFFFFF',
    type: '외주비', typeBg: '#EDF3FA', typeColor: '#2D6BB0',
    amount: 3500000, balance: 3500000,
    lastMsg: '브랜드 가이드라인 시안 공유드립니다 📎',
    time: '2시간 전', unread: 3,
    status: 'normal', statusLabel: '진행중', statusBg: '#EDF3FA', statusColor: '#2D6BB0',
    totalExecuted: 0, totalAmount: 3500000,
    role: '외주 수급인',
    msgCat: '외부', txCat: '거래',
  },
  {
    id: '8', name: '㈜한강부동산', initial: '한', emoji: null,
    avatarBg: '#374151', avatarFg: '#FFFFFF',
    type: '부동산', typeBg: '#EDF3FA', typeColor: '#1E5294',
    amount: 100000000, balance: 50000000,
    lastMsg: '잔금 납부 일정 조율 부탁드립니다',
    time: '3일 전', unread: 1,
    status: 'warning', statusLabel: '잔금 대기', statusBg: '#FFF4E0', statusColor: '#C8821A',
    totalExecuted: 50000000, totalAmount: 100000000,
    role: '부동산 중개사무소',
    msgCat: '기관', txCat: '거래',
  },
]

export const CHATS = {
  'approval': {
    messages: [
      { id:1, from:'system', type:'approvalAction', time:'10:05', date:'2026.05.10',
        approvalAction: { action:'approved', actor:'박철수', itemTitle:'5월 임금 지급 요청 — 3,200,000원', note:null } },
      { id:2, from:'system', type:'approvalAction', time:'11:22', date:'2026.05.10',
        approvalAction: { action:'inspection_approved', actor:'김재무', itemTitle:'4월 외주비 정산 — 박철수 1,500,000원', note:null } },
      { id:3, from:'system', type:'approvalAction', time:'14:10', date:'2026.05.11',
        approvalAction: { action:'inspection_rejected', actor:'이대표', itemTitle:'영업팀 법인카드 이용 내역 검수', note:'4월 27일 GS강남게임센터 결제 건 소명 필요' } },
      { id:4, from:'system', type:'approvalAction', time:'09:33', date:'2026.05.12',
        approvalAction: { action:'extra_docs', actor:'박철수', itemTitle:'거래처 접대비 지출 승인 요청', note:'세금계산서 또는 영수증 원본 제출 요청', requestedDocs:['세금계산서 원본','사업자 등록증 사본'] } },
      { id:5, from:'system', type:'approvalAction', time:'15:30', date:'2026.05.12',
        approvalAction: { action:'usage_confirmed', actor:'김재무', itemTitle:'앱 기능 개발 외주 결과물 — 사용내역확인', note:'내부 검토 완료. 지출 내역 이상 없음.' } },
    ],
    fdsAlert: null,
  },
  '1': {
    messages: [
      { id:1, from:'system', type:'contract', time:'10:00', date:'2026.04.25',
        contract: { title:'자금 집행 계약', executor:'㈜주다컴퍼니', recipient:'박철수', amount:5000000, type:'외주비',
          mccAllowed:['IT/소프트웨어','디자인/크리에이티브'], mccBlocked:['유흥/오락','도박','명품'], expires:'2026.08.06',
          milestones:[{ text:'UI 시안 1차 납품', done:true, date:'2026.05.15' },{ text:'수정 및 최종본', done:false, date:'2026.06.15' },{ text:'최종 납품 완료', done:false, date:'2026.07.15' }],
          signed:true } },
      { id:2, from:'other', text:'안녕하세요! 앱 디자인 작업 시작하겠습니다.', time:'10:05', date:'2026.04.25' },
      { id:3, from:'me', text:'네 잘 부탁드립니다. 선금 집행 완료했어요.', time:'10:10', date:'2026.04.25' },
      { id:4, from:'system', type:'payment', time:'10:10', date:'2026.04.25',
        payment:{ merchant:'선금 집행', amount:1500000, status:'done', mcc:'외주비', code:'EX_002' } },
      { id:5, from:'system', type:'blocked', time:'23:41', date:'2026.04.27',
        blocked:{ merchant:'GS강남게임센터', amount:89000, mcc:'MCC-7993 (유흥/오락)', code:'AL_001' } },
      { id:6, from:'system', type:'usageCheck', time:'23:50', date:'2026.04.27',
        usageCheck:{ merchant:'GS강남게임센터', amount:89000, deadline:'2026.04.30', status:'pending', code:'UC_001',
          requestTypes:['사용내역요청','첨부파일요청'], note:'MCC 7993 허용 외 업종 결제 내역 확인 필요' } },
      { id:7, from:'other', text:'메인 5종 1차 시안 완료했습니다. 검수 부탁드립니다.', time:'13:40', date:'2026.05.06' },
      { id:8, from:'system', type:'milestone', time:'13:40', date:'2026.05.06',
        milestone:{ text:'UI 시안 1차 납품', done:true, code:'SC_001' } },
      { id:9, from:'other', text:'검수 확인 후 잔금 부탁드립니다', time:'14:22', date:'2026.05.06' },
      { id:10, from:'system', type:'reviewRequest', time:'15:30', date:'2026.05.12',
        reviewRequest:{ resubmitRequest:true, deadline:'2026.05.30', attachmentRequest:true,
          message:'알림 모듈 미구현 항목을 수정하여 재제출해 주세요. 완성된 소스코드와 납품 확인서를 첨부해 주세요.',
          itemTitle:'앱 기능 개발 외주 결과물 검수' } },
    ],
    fdsAlert:{ text:'박철수 · GS강남게임센터 결제 시도 차단됨 · MCC 7993', level:'block' },
  },
  '2': {
    messages: [
      { id:1, from:'me', text:'안녕하세요. 대여금 계약서 확인 후 서명 부탁드립니다.', time:'09:00', date:'2026.05.12' },
      { id:2, from:'system', type:'contract', time:'09:01', date:'2026.05.12',
        contract:{ title:'대여금 집행 계약', executor:'㈜주다컴퍼니', recipient:'이호형', amount:3000000, type:'개인 대여',
          mccAllowed:[], mccBlocked:[], expires:'2026.11.12',
          milestones:[{ text:'대여금 지급', done:false, date:'2026.05.15' },{ text:'중간 상환 (50%)', done:false, date:'2026.08.15' },{ text:'잔금 상환 완료', done:false, date:'2026.11.12' }],
          signed:false } },
      { id:3, from:'other', text:'확인했습니다. 검토 후 서명할게요.', time:'09:15', date:'2026.05.12' },
    ],
    fdsAlert: null,
  },
  '3': {
    messages: [
      { id:1, from:'other', text:'4월 집행 내역 공유드립니다', time:'11:00', date:'2026.05.03' },
      { id:2, from:'me', text:'소진 속도가 빨라서 확인 중입니다.', time:'11:30', date:'2026.05.03' },
    ],
    fdsAlert:{ text:'소진 속도 전월 대비 40% 증가 · 이상 감지', level:'warning' },
  },
  '4': {
    messages: [
      { id:1, from:'other', text:'계약서 확인 부탁드립니다', time:'14:00', date:'2026.05.01' },
      { id:2, from:'me', text:'확인하겠습니다.', time:'14:30', date:'2026.05.01' },
    ],
    fdsAlert: null,
  },
  '5': {
    messages: [
      { id:1, from:'me', text:'민준아 안녕, 빌려줄 수 있어. 금액이랑 기간 알려줘.', time:'14:00', date:'2026.04.01' },
      { id:2, from:'other', text:'200만원, 6개월이면 돼. 연 6% 이자로 부탁해.', time:'14:15', date:'2026.04.01' },
      { id:3, from:'me', text:'알겠어. 주다페이로 차용증 만들게, 아래 계약서 확인해줘.', time:'14:20', date:'2026.04.01' },
      { id:4, from:'system', type:'contract', time:'14:21', date:'2026.04.01',
        contract:{ title:'개인 대여 계약', executor:'나', recipient:'박민준', amount:2000000, type:'개인 대여',
          mccAllowed:[], mccBlocked:[], expires:'2026.10.01',
          milestones:[
            { text:'대여금 송금', done:true, date:'2026.04.01' },
            { text:'3개월 이자 납부', done:true, date:'2026.07.01' },
            { text:'원금+잔여이자 상환', done:false, date:'2026.10.01' },
          ],
          signed:true } },
      { id:5, from:'other', text:'서명 완료! 고마워 ㅠㅠ 진짜 도움 됐어.', time:'14:35', date:'2026.04.01' },
      { id:6, from:'system', type:'payment', time:'14:36', date:'2026.04.01',
        payment:{ merchant:'대여금 송금', amount:2000000, status:'done', mcc:'개인 대여', code:'LN_001' } },
      { id:7, from:'other', text:'7월 이자 50,000원 납부했어!', time:'10:00', date:'2026.07.01' },
      { id:8, from:'me', text:'확인했어! 잘 지내?', time:'10:30', date:'2026.07.01' },
      { id:9, from:'other', text:'응 덕분에 잘 지내고 있어 ㅎㅎ', time:'10:31', date:'2026.07.01' },
      { id:10, from:'other', text:'이번 달 이자는 제때 납부할게요!', time:'09:00', date:'2026.05.16' },
    ],
    fdsAlert: null,
  },
  '6': {
    messages: [
      { id:1, from:'me', text:'서현아 생일 축하해🎂 용돈 보낼게!', time:'08:00', date:'2026.05.10' },
      { id:2, from:'system', type:'payment', time:'08:01', date:'2026.05.10',
        payment:{ merchant:'생일 용돈 선물', amount:300000, status:'done', mcc:'용돈선물', code:'GF_001' } },
      { id:3, from:'other', text:'언니!! 감사해요 완전 깜짝이야 🥹', time:'08:15', date:'2026.05.10' },
      { id:4, from:'me', text:'맛있는 거 먹어~', time:'08:20', date:'2026.05.10' },
      { id:5, from:'other', text:'네!! 친구들이랑 맛집 가려고요 ㅎㅎ', time:'08:22', date:'2026.05.10' },
      { id:6, from:'other', text:'고마워요 언니! 잘 쓸게요 ☺️', time:'12:05', date:'2026.05.10' },
    ],
    fdsAlert: null,
  },
  '7': {
    messages: [
      { id:1, from:'me', text:'안녕하세요. 브랜드 아이덴티티 작업 계약서 공유드립니다.', time:'10:00', date:'2026.05.01' },
      { id:2, from:'system', type:'contract', time:'10:01', date:'2026.05.01',
        contract:{ title:'자금 집행 계약', executor:'나', recipient:'최디자인', amount:3500000, type:'외주비',
          mccAllowed:['디자인/크리에이티브','IT/소프트웨어'], mccBlocked:['유흥/오락','명품'],
          expires:'2026.07.31',
          milestones:[
            { text:'브랜드 가이드라인 초안', done:false, date:'2026.05.20' },
            { text:'수정 및 확정', done:false, date:'2026.06.10' },
            { text:'최종 파일 납품', done:false, date:'2026.06.30' },
          ],
          signed:true } },
      { id:3, from:'other', text:'감사합니다! 열심히 작업하겠습니다 :)', time:'10:20', date:'2026.05.01' },
      { id:4, from:'me', text:'잘 부탁드려요. 궁금한 점 있으면 편하게 물어봐 주세요.', time:'10:25', date:'2026.05.01' },
      { id:5, from:'other', text:'로고 콘셉트 방향 두 가지 잡았어요. 어느 쪽이 마음에 드세요?', time:'14:00', date:'2026.05.08' },
      { id:6, from:'other', text:'A안: 미니멀+모던 / B안: 볼드+활기차게', time:'14:01', date:'2026.05.08' },
      { id:7, from:'me', text:'A안이 더 좋을 것 같아요! 깔끔한 게 저희 서비스 방향과 맞네요.', time:'14:45', date:'2026.05.08' },
      { id:8, from:'other', text:'네! A안으로 진행할게요. 이번 주 안에 가이드라인 초안 드릴게요.', time:'14:50', date:'2026.05.08' },
      { id:9, from:'other', text:'안녕하세요! 브랜드 가이드라인 시안 공유드립니다 📎', time:'10:00', date:'2026.05.16' },
      { id:10, from:'other', text:'컬러 팔레트, 타이포그래피, 로고 사용 규정 포함했습니다.', time:'10:01', date:'2026.05.16' },
    ],
    fdsAlert: null,
  },
  '8': {
    messages: [
      { id:1, from:'system', type:'contract', time:'09:00', date:'2026.03.15',
        contract:{ title:'부동산 거래 계약', executor:'나', recipient:'㈜한강부동산', amount:100000000, type:'부동산',
          mccAllowed:['부동산/법무'], mccBlocked:[],
          expires:'2026.06.30',
          milestones:[
            { text:'계약금 납부 (10%)', done:true, date:'2026.03.15' },
            { text:'중도금 납부 (40%)', done:true, date:'2026.04.30' },
            { text:'잔금 납부 (50%)', done:false, date:'2026.05.30' },
          ],
          signed:true } },
      { id:2, from:'other', text:'안녕하세요. 계약금 10,000,000원 정상 수령 확인했습니다.', time:'09:30', date:'2026.03.15' },
      { id:3, from:'system', type:'payment', time:'09:01', date:'2026.03.15',
        payment:{ merchant:'계약금 납부', amount:10000000, status:'done', mcc:'부동산', code:'RE_001' } },
      { id:4, from:'me', text:'감사합니다. 잔금 일정은 말씀드린 대로 5월 말 예정입니다.', time:'09:45', date:'2026.03.15' },
      { id:5, from:'system', type:'payment', time:'10:00', date:'2026.04.30',
        payment:{ merchant:'중도금 납부', amount:40000000, status:'done', mcc:'부동산', code:'RE_002' } },
      { id:6, from:'other', text:'중도금 40,000,000원 수령 완료입니다. 잔금 일정 확정되면 연락 주세요.', time:'10:20', date:'2026.04.30' },
      { id:7, from:'me', text:'네, 5월 28일에 잔금 납부 예정입니다. 등기 서류 준비해 주세요.', time:'10:35', date:'2026.04.30' },
      { id:8, from:'other', text:'알겠습니다. 홈택스 취득세 신고 완료 후 서류 전달드릴게요.', time:'10:40', date:'2026.04.30' },
      { id:9, from:'other', text:'잔금 납부 일정 조율 부탁드립니다', time:'09:00', date:'2026.05.13' },
      { id:10, from:'other', text:'등기 이전 위해 법무사 일정도 함께 맞춰야 해서요.', time:'09:01', date:'2026.05.13' },
    ],
    fdsAlert: null,
  },
}

export const DETAIL_DATA = {
  '1': {
    trades: [
      { id:1, icon:'📋', title:'앱 디자인 메인 5종 계약서', date:'2026.04.20', amount:5000000, status:'진행중',
        detail:{ steps:[
          { label:'선금', amount:1500000, ratio:'30%', status:'done', date:'2026.04.25' },
          { label:'중도금', amount:2000000, ratio:'40%', status:'waiting', date:null, action:'검수하기' },
          { label:'잔금', amount:1500000, ratio:'30%', status:'pending', date:null },
        ], note:'납품일: 2026.07.31 · 계약서 서명 완료' } },
      { id:2, icon:'📄', title:'1차 시안 납품 확인서', date:'2026.05.06', amount:null, status:'완료',
        detail:{ note:'메인 5종 1차 시안 납품 확인 · 검수 대기 중', steps:null } },
    ],
    attachments:[{ name:'계약서_박철수_20260420.pdf', size:'2.1MB', date:'2026.04.20' },{ name:'1차시안_메인5종.zip', size:'48MB', date:'2026.05.06' }],
    memos:['검수 기준: 피그마 완성도 85% 이상','잔금 지급 전 반드시 확인 필요'],
    userInfo:{ name:'박철수', role:'외주 수급인', phone:'010-1234-5678', bank:'국민 ****-901', kyc:'KYC 2단계', joined:'2026.04.20' },
  },
  '2': {
    trades: [
      { id:1, icon:'📋', title:'금전소비대차 계약서', date:'2026.04.01', amount:5000000, status:'진행중',
        detail:{ note:'상환일: 2027.05.05 · 연 4.6% · 만기 일시상환', steps:null } },
      { id:2, icon:'🧾', title:'월 대여료 이자 납부 확인서', date:'2026.03.15', amount:13750, status:'완료',
        detail:{ note:'3월 이자 납부 완료 · 13,750원', steps:null } },
      { id:3, icon:'📝', title:'긴급 지원금 신청서', date:'2026.02.20', amount:300000, status:'완료',
        detail:{ note:'긴급 생활비 지원 · 300,000원', steps:null } },
    ],
    attachments:[{ name:'차용증_이유진_20260401.pdf', size:'1.2MB', date:'2026.04.01' }],
    memos:['상환일 1개월 전 자동 알림 설정됨'],
    userInfo:{ name:'이유진', role:'가족 구성원 (딸)', phone:'010-9876-5432', bank:'신한 ****-789', kyc:'KYC 2단계', joined:'2026.02.15' },
  },
  '3': {
    trades: [
      { id:1, icon:'📋', title:'엔젤 투자 계약서', date:'2026.02.15', amount:50000000, status:'진행중',
        detail:{ steps:[
          { label:'1차 집행', amount:20000000, ratio:'40%', status:'done', date:'2026.02.20' },
          { label:'2차 집행', amount:12400000, ratio:'25%', status:'done', date:'2026.04.01' },
          { label:'3차 집행', amount:17600000, ratio:'35%', status:'pending', date:null },
        ], note:'MCC 통제 · IT·개발 허용 · 월 1회 보고' } },
    ],
    attachments:[{ name:'투자계약서_오로라_20260215.pdf', size:'3.8MB', date:'2026.02.15' },{ name:'4월_집행내역보고서.pdf', size:'0.9MB', date:'2026.05.01' }],
    memos:['소진 속도 이상 → 5월 추가 확인 필요','쿠폰 API 매출 대조 진행 중'],
    userInfo:{ name:'ㄱ오로라 (법인)', role:'투자 수령인', phone:'02-1234-5678', bank:'기업 ****-456', kyc:'기업 인증 완료', joined:'2026.02.15' },
  },
  '4': {
    trades: [
      { id:1, icon:'📋', title:'UI 컴포넌트 라이브러리 계약서', date:'2026.05.01', amount:5000000, status:'진행중',
        detail:{ steps:[
          { label:'선금', amount:1500000, ratio:'30%', status:'done', date:'2026.05.03' },
          { label:'중도금', amount:2000000, ratio:'40%', status:'pending', date:null },
          { label:'잔금', amount:1500000, ratio:'30%', status:'pending', date:null },
        ], note:'납품일: 2026.09.30' } },
    ],
    attachments:[{ name:'계약서_김창업_20260501.pdf', size:'1.9MB', date:'2026.05.01' }],
    memos:[],
    userInfo:{ name:'김창업', role:'외주 수급인', phone:'010-5555-1234', bank:'카카오뱅크 ****-321', kyc:'KYC 2단계', joined:'2026.05.01' },
  },
  '5': {
    trades: [
      { id:1, icon:'📋', title:'금전소비대차 계약서', date:'2026.04.01', amount:2000000, status:'진행중',
        detail:{ steps:[
          { label:'대여금 송금', amount:2000000, ratio:'100%', status:'done', date:'2026.04.01' },
          { label:'이자 납부 (6개월분)', amount:60000, ratio:'연 6%', status:'waiting', date:'2026.10.01', action:'상환 확인' },
          { label:'원금 상환', amount:2000000, ratio:'만기', status:'pending', date:null },
        ], note:'만기일: 2026.10.01 · 연 6% · 원금 일시상환' } },
    ],
    attachments:[{ name:'차용증_박민준_20260401.pdf', size:'0.8MB', date:'2026.04.01' }],
    memos:['친구 대여 — 연체 시 연락 먼저','이자 입금 계좌 확인 필요'],
    userInfo:{ name:'박민준', role:'지인 (대학 동기)', phone:'010-7777-2222', bank:'국민 ****-512', kyc:'KYC 1단계', joined:'2026.04.01' },
  },
  '6': {
    trades: [
      { id:1, icon:'🎁', title:'생일 용돈 선물', date:'2026.05.10', amount:300000, status:'완료',
        detail:{ note:'생일 축하 용돈 · 즉시 수령 완료', steps:null } },
    ],
    attachments:[],
    memos:['생일: 5월 10일'],
    userInfo:{ name:'이서현', role:'가족 구성원 (조카)', phone:'010-3333-4444', bank:'토스뱅크 ****-888', kyc:'KYC 1단계', joined:'2026.05.10' },
  },
  '7': {
    trades: [
      { id:1, icon:'📋', title:'브랜드 아이덴티티 계약서', date:'2026.05.01', amount:3500000, status:'진행중',
        detail:{ steps:[
          { label:'계약금', amount:1050000, ratio:'30%', status:'done', date:'2026.05.03' },
          { label:'시안 납품 후', amount:1400000, ratio:'40%', status:'pending', date:null },
          { label:'최종 납품 후', amount:1050000, ratio:'30%', status:'pending', date:null },
        ], note:'납품일: 2026.06.30' } },
    ],
    attachments:[{ name:'계약서_최디자인_20260501.pdf', size:'1.4MB', date:'2026.05.01' }],
    memos:['시안 확정 후 SNS 프로필도 요청 예정'],
    userInfo:{ name:'최디자인', role:'외주 수급인', phone:'010-8888-7777', bank:'신한 ****-666', kyc:'KYC 2단계', joined:'2026.05.01' },
  },
  '8': {
    trades: [
      { id:1, icon:'🏠', title:'역삼동 빌라 매매 계약서', date:'2026.03.15', amount:100000000, status:'진행중',
        detail:{ steps:[
          { label:'계약금 (10%)', amount:10000000, ratio:'10%', status:'done', date:'2026.03.15' },
          { label:'중도금 (40%)', amount:40000000, ratio:'40%', status:'done', date:'2026.04.30' },
          { label:'잔금 (50%)', amount:50000000, ratio:'50%', status:'waiting', date:'2026.05.30', action:'잔금 납부' },
        ], note:'소유권 이전 등기: 잔금 납부 후 진행' } },
    ],
    attachments:[
      { name:'매매계약서_20260315.pdf', size:'4.2MB', date:'2026.03.15' },
      { name:'등기부등본_20260315.pdf', size:'0.5MB', date:'2026.03.15' },
      { name:'취득세납부확인서.pdf', size:'0.3MB', date:'2026.04.10' },
    ],
    memos:['법무사: 김법무 010-9999-0000','잔금일 전날 은행 방문 필요 (한도 확인)'],
    userInfo:{ name:'㈜한강부동산', role:'부동산 중개사무소', phone:'02-555-1234', bank:'하나 ****-789', kyc:'기업 인증 완료', joined:'2026.03.15' },
  },
}

export const STEP_STYLE = {
  done:    { dot:'#2A7D5E', label:'완료',      color:'#2A7D5E', bg:'#E6F5EF' },
  waiting: { dot:'#C8821A', label:'검수 대기', color:'#C8821A', bg:'#FFF4E0' },
  upload:  { dot:'#D94040', label:'파일 필요', color:'#D94040', bg:'#FCEBEB' },
  pending: { dot:'#C8C5BE', label:'대기',      color:'#C8C5BE', bg:'#F2EFE9' },
}

// ─── 메모 저장소 (ChatRoom ↔ DetailScreen 공유) ───
const _threadMemosStore = {}

export function saveThreadMemo(threadId, memo) {
  if (!_threadMemosStore[threadId]) _threadMemosStore[threadId] = []
  _threadMemosStore[threadId].push(memo)
}

export function deleteThreadMemo(threadId, memoId) {
  if (_threadMemosStore[threadId])
    _threadMemosStore[threadId] = _threadMemosStore[threadId].filter(m => m.id !== memoId)
}

export function getThreadMemos(threadId) {
  return _threadMemosStore[threadId] || []
}
