import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * iOS swipe-back guard for multi-step screens.
 *
 * DESIGN:
 *  - First step  -> NO sentinel. iOS native swipe-back handles navigation cleanly.
 *  - Non-first   -> sentinel pushed. iOS swipe pops it; we call handleBack() then
 *                  decide (after React re-renders) whether to push a fresh sentinel.
 *
 * WHY NO SENTINEL ON FIRST STEP:
 *  The old approach pushed a sentinel on mount even for the first step, then called
 *  navigate(-1) from inside the popstate handler.  iOS Safari has a known bug where
 *  calling history.go(-1) synchronously inside a popstate handler "double-pops" -
 *  it compounds the in-flight sentinel pop with our go(-1) and skips an extra entry
 *  (e.g. SelectRecipient gets skipped).  Removing the first-step sentinel avoids the
 *  bug entirely: the native swipe just does the right thing.
 *
 * UI BACK-BUTTON (not swipe) on a non-first step:
 *  When the user taps the <- button the sentinel is NOT consumed by the swipe.
 *  We track this via hadSentinel and pop the orphaned sentinel with history.go(-1)
 *  so a subsequent swipe from the first step still navigates correctly.
 *
 * MULTI-LEVEL STEPS (e.g. pin -> confirm, both non-first):
 *  After handling a swipe we defer a firstRef check via setTimeout(0).  By then
 *  React has committed the state update and useLayoutEffect has run, so firstRef
 *  accurately reflects the new step.  If still non-first, push a fresh sentinel.
 *
 * @param {Function} handleBack      - back handler (same as your <- button)
 * @param {boolean}  isFirstStep    - true = first step (no sentinel; native swipe navigates back)
 * @param {boolean}  enabled        - false = skip entirely (e.g. screen redirects on mount)
 * @param {boolean}  skipCleanup    - true = do NOT call go(-1) to pop orphaned sentinel.
 *   Safe when useNoSwipeBack() is also active (e.g. Messages tab): the wall sentinel
 *   already prevents any future swipe from encountering the orphan.  Skipping go(-1)
 *   avoids a popstate that sets App.jsx's isBackRef=true, which would cause the next
 *   forward navigation (e.g. home tab click) to be misclassified as a back navigation.
 */
export function useStepHistory(handleBack, isFirstStep, enabled = true, skipCleanup = false) {
  const backRef     = useRef(handleBack)
  const firstRef    = useRef(isFirstStep)
  const hadSentinel = useRef(false)   // true while a live sentinel is in the history stack

  // Always-fresh refs - no stale closures
  useLayoutEffect(() => { backRef.current  = handleBack  })
  useLayoutEffect(() => { firstRef.current = isFirstStep })

  useEffect(() => {
    if (!enabled) return

    if (isFirstStep) {
      // No sentinel needed. But if the user navigated here via the UI back
      // button (not a swipe), the previous sentinel was never consumed.
      if (hadSentinel.current) {
        hadSentinel.current = false
        if (!skipCleanup) {
          // Pop the orphaned sentinel so a future swipe from this step still works.
          // NOTE: go(-1) fires a popstate which sets App.jsx's isBackRef=true.
          // If skipCleanup=true the caller opts out (e.g. Messages, which has
          // useNoSwipeBack() making the orphan harmless).
          window.history.go(-1)
        }
      }
      return
    }

    // Non-first step: push a sentinel so iOS swipe lands here instead of going back.
    window.history.pushState({ _sg: true }, '')
    hadSentinel.current = true

    const onPop = () => {
      hadSentinel.current = false
      backRef.current()

      // Defer: by the time setTimeout fires, React has committed the new step
      // state and useLayoutEffect has updated firstRef.
      setTimeout(() => {
        if (!firstRef.current) {
          window.history.pushState({ _sg: true }, '')
          hadSentinel.current = true
        }
      }, 0)
    }

    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [enabled, isFirstStep])
}
