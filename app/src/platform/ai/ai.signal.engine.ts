import { AISignal } from "./ai.types"

function makeId(){
  return "signal_" + Date.now() + "_" + Math.random().toString(36).slice(2)
}

export class AISignalEngine {

  private subscribers: Function[] = []

  publish(input: Omit<AISignal,"id"|"timestamp">): AISignal {

    const signal: AISignal = {
      ...input,
      id: makeId(),
      timestamp: new Date().toISOString()
    }

    for(const sub of this.subscribers){
      sub(signal)
    }

    return signal
  }

  subscribe(callback:(signal:AISignal)=>void){

    this.subscribers.push(callback)

    return ()=>{
      this.subscribers =
        this.subscribers.filter(cb => cb !== callback)
    }
  }

}

export const aiSignalEngine = new AISignalEngine()
