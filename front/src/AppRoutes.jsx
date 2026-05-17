import { Routes, Route, Navigate } from 'react-router-dom'

// shared/auth
import Start from './shared/auth/Start'
import SignupPersonal from './shared/auth/SignupPersonal'
import SignupBusiness from './shared/auth/SignupBusiness'
import SignupPin from './shared/auth/SignupPin'
import Login from './shared/auth/Login'

// shared (공통 화면)
import Charge from './shared/Charge'
import Withdraw from './shared/Withdraw'
import Alerts from './shared/Alerts'
import TransactionDetail from './shared/TransactionDetail'
import PaymentDetail from './shared/PaymentDetail'
import PaymentLogs from './shared/PaymentLogs'
import CardPayment from './shared/CardPayment'
import OtherPayments from './shared/OtherPayments'
import PaymentAlerts from './shared/PaymentAlerts'
import EvidenceCenter from './shared/EvidenceCenter'
import MyWallet from './shared/MyWallet'
import WalletDetail from './shared/WalletDetail'
import CompletedWallets from './shared/CompletedWallets'
import SecuritySettings from './shared/SecuritySettings'
import Messages from './shared/Messages'
import ChatRoomPage from './shared/messages/ChatRoomPage'
import More from './shared/More'
import ExecutionStats from './shared/ExecutionStats'
import RecipientDetail from './shared/RecipientDetail'

// shared/execute (양쪽 공유 - Freelance, RealEstate 흐름)
import Execute from './shared/execute/Execute'
import ExecuteFreelance from './shared/execute/ExecuteFreelance'
import ExecuteRealEstate from './shared/execute/ExecuteRealEstate'

// personal
import HomePersonal from './personal/HomePersonal'
import PersonalProfile from './personal/PersonalProfile'
import ExecutePersonal from './personal/execute/ExecutePersonal'
import ExecuteToBusiness from './personal/execute/ExecuteToBusiness'
import ExecuteBusiness from './business/execute/ExecuteBusiness'
import SelectRecipient from './personal/execute/SelectRecipient'
import SelectBusiness from './personal/execute/SelectBusiness'
import ExecuteGift from './personal/execute/ExecuteGift'
import ExecuteLiving from './personal/execute/ExecuteLiving'
import ExecuteLend from './personal/execute/ExecuteLend'
import ExecuteInvest from './personal/execute/ExecuteInvest'
import ExecuteInvestBusiness from './personal/execute/ExecuteInvestBusiness'

// business
import HomeBusiness from './business/HomeBusiness'
import BusinessMenu from './business/BusinessMenu'
import ExecuteBusinessMenu from './business/execute/ExecuteBusinessMenu'
import ExecuteToPersonal from './business/execute/ExecuteToPersonal'
import ExecuteOperations from './business/execute/ExecuteOperations'
import ExecuteSalary from './business/execute/ExecuteSalary'
import ExecuteSalaryRegister from './business/execute/ExecuteSalaryRegister'
import ExecuteRent from './business/execute/ExecuteRent'
import ExecuteRentLease from './business/execute/ExecuteRentLease'
import ExecuteSubscription from './business/execute/ExecuteSubscription'
import ExecuteTelecom from './business/execute/ExecuteTelecom'
import ExecuteUtility from './business/execute/ExecuteUtility'
import ExecuteInsurance4 from './business/execute/ExecuteInsurance4'
import ExecuteTax from './business/execute/ExecuteTax'
import ExecuteInsurancePremium from './business/execute/ExecuteInsurancePremium'
import ExecuteOtherExpense from './business/execute/ExecuteOtherExpense'
import ExecuteAutoPayAll from './business/execute/ExecuteAutoPayAll'
import ExecuteFreelanceBusiness from './business/execute/ExecuteFreelanceBusiness'
import ExecuteBonusBusiness from './business/execute/ExecuteBonusBusiness'
import ExecuteCondolenceBusiness from './business/execute/ExecuteCondolenceBusiness'
import ExecuteOtherIncomeBusiness from './business/execute/ExecuteOtherIncomeBusiness'
import ExecuteLendBusiness from './business/execute/ExecuteLendBusiness'
import ExecuteSupportBusiness from './business/execute/ExecuteSupportBusiness'
import ExecuteVendorLoanBusiness from './business/execute/ExecuteVendorLoanBusiness'
import ExecuteVendorInvestBusiness from './business/execute/ExecuteVendorInvestBusiness'
import SelectRecipientBusiness from './business/execute/SelectRecipientBusiness'
import SelectVendor from './business/execute/SelectVendor'
import Support from './shared/Support'
import HelpFaq from './shared/HelpFaq'
import Notices from './shared/Notices'
import NoticeDetail from './shared/NoticeDetail'
import Refund from './shared/Refund'
import Dispute from './shared/Dispute'
import AccountManagement from './shared/AccountManagement'
import AdminManagement from './shared/AdminManagement'
import AdminManagementBiz from './shared/AdminManagementBiz'
import CompanyProfile from './shared/CompanyProfile'
import MonthlyReport from './shared/MonthlyReport'
import ApprovalCenter from './shared/ApprovalCenter'
import TaxAccountant from './shared/TaxAccountant'

// 가드: sessionStorage bizType 직접 확인 (Context 의존 제거)
function Protected({ children, requireType }) {
  const stored = sessionStorage.getItem('bizType')
  const userType = stored === 'business' ? 'business' : stored === 'personal' ? 'personal' : null
  if (!userType) return <Navigate to="/" replace />
  if (requireType && userType !== requireType) {
    return <Navigate to={userType === 'business' ? '/home-business' : '/home'} replace />
  }
  return children
}

// sessionStorage에서 직접 userType 읽는 헬퍼
function getUserType() {
  const s = sessionStorage.getItem('bizType')
  return s === 'business' ? 'business' : s === 'personal' ? 'personal' : null
}

// /execute/business 분기: 기업이면 4개 메뉴 진입, 개인이면 사업자에게 지급
function ExecuteBusinessRouter() {
  const userType = getUserType()
  if (userType === 'business') return <ExecuteBusiness />
  return <ExecuteToBusiness />
}

// 홈 분기
function PersonalHome() {
  const userType = getUserType()
  if (!userType) return <Navigate to="/" replace />
  if (userType === 'business') return <Navigate to="/home-business" replace />
  return <HomePersonal />
}

function BusinessHome() {
  const userType = getUserType()
  if (!userType) return <Navigate to="/" replace />
  if (userType === 'personal') return <Navigate to="/home" replace />
  return <HomeBusiness />
}

// 자금 집행 진입 분기: 개인 → Execute, 기업 → ExecuteBusinessMenu (replace로 히스토리 교체)
function ExecuteEntry() {
  const userType = getUserType()
  if (!userType) return <Navigate to="/" replace />
  if (userType === 'business') return <Navigate to="/execute/business-menu" replace />
  return <Execute />
}

/**
 * AppRoutes: 모든 라우트 정의
 * location prop을 받아 <Routes location={location}> 으로 렌더링
 */
export default function AppRoutes({ location }) {
  return (
    <Routes location={location}>
      {/* 공개 라우트 */}
      <Route path="/" element={<Start />} />
      <Route path="/signup/personal" element={<SignupPersonal />} />
      <Route path="/signup/business" element={<SignupBusiness />} />
      <Route path="/signup/pin" element={<SignupPin />} />
      <Route path="/login" element={<Login />} />

      {/* 홈 — 사용자 타입에 따라 자동 분기 */}
      <Route path="/home" element={<PersonalHome />} />
      <Route path="/home-business" element={<BusinessHome />} />

      {/* 자금 집행 진입 — 권한별 메뉴 자동 분기 */}
      <Route path="/execute" element={<ExecuteEntry />} />

      {/* 기업 전용 ERP */}
      <Route path="/business-menu" element={
        <Protected requireType="business"><BusinessMenu /></Protected>
      } />

      {/* 기업 자금집행 메뉴 (어떤 자금을 집행할까요?) */}
      <Route path="/execute/business-menu" element={
        <Protected requireType="business"><ExecuteBusinessMenu /></Protected>
      } />

      {/* 기업 자금 집행 하위 */}
      <Route path="/execute/business/to-personal" element={
        <Protected requireType="business"><ExecuteToPersonal /></Protected>
      } />
      <Route path="/execute/business/operations" element={
        <Protected requireType="business"><ExecuteOperations /></Protected>
      } />
      <Route path="/execute/business/operations/salary" element={
        <Protected requireType="business"><ExecuteSalary /></Protected>
      } />
      <Route path="/execute/business/operations/salary/register" element={
        <Protected requireType="business"><ExecuteSalaryRegister /></Protected>
      } />
      <Route path="/execute/business/operations/rent" element={
        <Protected requireType="business"><ExecuteRent /></Protected>
      } />
      <Route path="/execute/business/operations/rent-lease" element={
        <Protected requireType="business"><ExecuteRentLease /></Protected>
      } />
      <Route path="/execute/business/operations/subscription" element={
        <Protected requireType="business"><ExecuteSubscription /></Protected>
      } />
      <Route path="/execute/business/operations/telecom" element={
        <Protected requireType="business"><ExecuteTelecom /></Protected>
      } />
      <Route path="/execute/business/operations/utility" element={
        <Protected requireType="business"><ExecuteUtility /></Protected>
      } />
      <Route path="/execute/business/operations/insurance4" element={
        <Protected requireType="business"><ExecuteInsurance4 /></Protected>
      } />
      <Route path="/execute/business/operations/tax" element={
        <Protected requireType="business"><ExecuteTax /></Protected>
      } />
      <Route path="/execute/business/operations/insurance" element={
        <Protected requireType="business"><ExecuteInsurancePremium /></Protected>
      } />
      <Route path="/execute/business/operations/misc" element={
        <Protected requireType="business"><ExecuteOtherExpense /></Protected>
      } />
      <Route path="/execute/business/operations/auto-pay-all" element={
        <Protected requireType="business"><ExecuteAutoPayAll /></Protected>
      } />
      <Route path="/execute/business/select-recipient" element={
        <Protected requireType="business"><SelectRecipientBusiness /></Protected>
      } />
      <Route path="/execute/business/select-vendor" element={
        <Protected requireType="business"><SelectVendor /></Protected>
      } />
      <Route path="/execute/business/freelance" element={
        <Protected requireType="business"><ExecuteFreelanceBusiness /></Protected>
      } />
      <Route path="/execute/business/bonus" element={
        <Protected requireType="business"><ExecuteBonusBusiness /></Protected>
      } />
      <Route path="/execute/business/condolence" element={
        <Protected requireType="business"><ExecuteCondolenceBusiness /></Protected>
      } />
      <Route path="/execute/business/other-income" element={
        <Protected requireType="business"><ExecuteOtherIncomeBusiness /></Protected>
      } />
      <Route path="/execute/business/lend" element={
        <Protected requireType="business"><ExecuteLendBusiness /></Protected>
      } />
      <Route path="/execute/business/support" element={
        <Protected requireType="business"><ExecuteSupportBusiness /></Protected>
      } />
      <Route path="/execute/business/vendor-loan" element={
        <Protected requireType="business"><ExecuteVendorLoanBusiness /></Protected>
      } />
      <Route path="/execute/business/vendor-invest" element={
        <Protected requireType="business"><ExecuteVendorInvestBusiness /></Protected>
      } />

      {/* 개인 자금 집행 하위 */}
      <Route path="/execute/personal" element={
        <Protected requireType="personal"><ExecutePersonal /></Protected>
      } />
      <Route path="/execute/personal/select" element={
        <Protected requireType="personal"><SelectRecipient /></Protected>
      } />
      <Route path="/execute/personal/gift" element={
        <Protected requireType="personal"><ExecuteGift /></Protected>
      } />
      <Route path="/execute/personal/living" element={
        <Protected requireType="personal"><ExecuteLiving /></Protected>
      } />
      <Route path="/execute/personal/lend" element={
        <Protected requireType="personal"><ExecuteLend /></Protected>
      } />
      <Route path="/execute/personal/invest" element={
        <Protected requireType="personal"><ExecuteInvest /></Protected>
      } />
      <Route path="/execute/business/invest" element={
        <Protected requireType="personal"><ExecuteInvestBusiness /></Protected>
      } />

      {/* /execute/business — userType에 따라 분기:
          기업 → ExecuteBusiness (4개 메뉴 진입)
          개인 → ExecuteToBusiness (개인이 사업자에게 지급) */}
      <Route path="/execute/business" element={
        <Protected><ExecuteBusinessRouter /></Protected>
      } />
      <Route path="/execute/business/select" element={
        <Protected requireType="personal"><SelectBusiness /></Protected>
      } />

      {/* 외주비/부동산 — 양쪽 공유 */}
      <Route path="/execute/personal/freelance" element={<Protected><ExecuteFreelance /></Protected>} />
      <Route path="/execute/personal/realestate" element={<Protected><ExecuteRealEstate /></Protected>} />

      {/* 공통 (로그인 필요) */}
      <Route path="/charge" element={<Protected><Charge /></Protected>} />
      <Route path="/withdraw" element={<Protected><Withdraw /></Protected>} />
      <Route path="/messages" element={<Protected><Messages /></Protected>} />
      <Route path="/chat/:threadId" element={<Protected><ChatRoomPage /></Protected>} />
      <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
      <Route path="/transactions/:id" element={<Protected><TransactionDetail /></Protected>} />
      <Route path="/payments" element={<Protected><PaymentLogs /></Protected>} />
      <Route path="/payments/:id" element={<Protected><PaymentDetail /></Protected>} />
      <Route path="/card-payment" element={<Protected><CardPayment /></Protected>} />
      <Route path="/other-payments" element={<Protected><OtherPayments /></Protected>} />
      <Route path="/payment-alerts" element={<Protected><PaymentAlerts /></Protected>} />
      <Route path="/wallet" element={<Protected><MyWallet /></Protected>} />
      <Route path="/wallet/completed" element={<Protected><CompletedWallets /></Protected>} />
      <Route path="/wallet/:id" element={<Protected><WalletDetail /></Protected>} />
      <Route path="/evidence-center" element={<Protected><EvidenceCenter /></Protected>} />
      <Route path="/stats" element={<Protected><ExecutionStats /></Protected>} />
      <Route path="/monthly-report" element={<Protected><MonthlyReport /></Protected>} />
      <Route path="/more" element={<Protected><More /></Protected>} />
      <Route path="/security" element={<Protected><SecuritySettings /></Protected>} />
      <Route path="/accounts" element={<Protected><AccountManagement /></Protected>} />
      <Route path="/admin-management" element={<Protected><AdminManagement /></Protected>} />
      <Route path="/admin-management-biz" element={<Protected><AdminManagementBiz /></Protected>} />
      <Route path="/company-profile" element={<Protected><CompanyProfile /></Protected>} />
      <Route path="/personal-profile" element={<Protected><PersonalProfile /></Protected>} />
      <Route path="/notices" element={<Protected><Notices /></Protected>} />
      <Route path="/notices/:id" element={<Protected><NoticeDetail /></Protected>} />
      <Route path="/refund" element={<Protected><Refund /></Protected>} />
      <Route path="/dispute" element={<Protected><Dispute /></Protected>} />
      <Route path="/support" element={<Protected><Support /></Protected>} />
      <Route path="/help-faq" element={<Protected><HelpFaq /></Protected>} />
      <Route path="/control-center/recipient/:id" element={<Protected><RecipientDetail /></Protected>} />
      <Route path="/approval-center" element={<Protected><ApprovalCenter /></Protected>} />
      <Route path="/tax-accountant" element={<Protected><TaxAccountant /></Protected>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
