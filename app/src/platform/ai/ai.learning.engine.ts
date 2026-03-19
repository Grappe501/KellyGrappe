import { AISignal } from "./ai.types"

export class AILearningEngine {

  private memory:AISignal[] = []

  record(signal:AISignal){
    this.memory.push(signal)
  }

  getRecent(limit=50){
    return this.memory.slice(-limit)
  }

}

export const aiLearningEngine = new AILearningEngine()
