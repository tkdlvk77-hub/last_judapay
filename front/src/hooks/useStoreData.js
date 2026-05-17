import { useState, useEffect } from 'react'
import { subscribe } from '../shared/transactionStore'

// ─────────────────────────────────────────────────────────
// useStoreData — transactionStore의 셀렉터 결과를 구독한다.
//
// 사용법:
//   const activities = useStoreData(() => getActivityFeed({ userId: 'biz_juda' }))
//
// store가 변경되면 (addTransaction, markAlertRead 등) 자동으로 리렌더됨.
//
// selector 의 의존성이 동적이면 외부에서 useMemo 등으로 안정화하거나
// deps 배열을 넘겨주면 된다.
// ─────────────────────────────────────────────────────────

export function useStoreData(selector, deps = []) {
  const [, setTick] = useState(0)

  useEffect(() => {
    // store 변경 시 강제 리렌더
    return subscribe(() => setTick(t => t + 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 매 렌더마다 selector 호출 — selector는 가벼운 셀렉터 함수여야 함
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return selector()
}
