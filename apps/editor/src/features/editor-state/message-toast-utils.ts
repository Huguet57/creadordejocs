export type RuntimeToast = {
  text: string
  remainingMs: number
}

export type RuntimeToastState = {
  activeToast: RuntimeToast | null
  queuedToasts: RuntimeToast[]
}

type EnqueueToastInput = {
  text: string
  durationMs: number
}

function normalizeDurationMs(durationMs: number): number {
  return Math.max(1, Math.round(durationMs))
}

function toRuntimeToast(input: EnqueueToastInput): RuntimeToast {
  return {
    text: input.text,
    remainingMs: normalizeDurationMs(input.durationMs)
  }
}

export function enqueueRuntimeToast<T extends RuntimeToastState>(state: T, input: EnqueueToastInput): T {
  const nextToast = toRuntimeToast(input)
  if (!state.activeToast) {
    return {
      ...state,
      activeToast: nextToast
    } as T
  }
  return {
    ...state,
    queuedToasts: [...state.queuedToasts, nextToast]
  } as T
}

export function advanceRuntimeToastQueue<T extends RuntimeToastState>(state: T, elapsedMs: number): T {
  if (!state.activeToast || elapsedMs <= 0) {
    return state
  }
  let remainingBudget = elapsedMs
  let activeToast: RuntimeToast | null = { ...state.activeToast }
  let queuedToasts = [...state.queuedToasts]
  while (activeToast && remainingBudget > 0) {
    if (remainingBudget < activeToast.remainingMs) {
      activeToast = {
        ...activeToast,
        remainingMs: activeToast.remainingMs - remainingBudget
      }
      remainingBudget = 0
      break
    }
    remainingBudget -= activeToast.remainingMs
    activeToast = queuedToasts[0] ?? null
    queuedToasts = queuedToasts.slice(1)
  }
  return {
    ...state,
    activeToast,
    queuedToasts
  } as T
}
