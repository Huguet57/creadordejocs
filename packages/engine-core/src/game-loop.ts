export type UpdateCallback = (deltaMs: number) => void
export type DrawCallback = () => void

export type LoopContract = {
  update: UpdateCallback
  draw: DrawCallback
}

export type FixedTimestepLoop = {
  step: (deltaMs: number) => void
}

export function createFixedTimestepLoop(contract: LoopContract): FixedTimestepLoop {
  return {
    step(deltaMs) {
      contract.update(deltaMs)
      contract.draw()
    }
  }
}
