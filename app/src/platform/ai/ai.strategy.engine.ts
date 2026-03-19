import { AISignal } from "./ai.types"

export class AIStrategyEngine {

  analyzeSignals(signals:AISignal[]){

    const insights:string[] = []

    if(signals.length > 10){
      insights.push("High user activity detected")
    }

    const telemetrySignals =
      signals.filter(s => s.type === "telemetry")

    if(telemetrySignals.length > 5){
      insights.push("System telemetry spike")
    }

    return insights
  }

}

export const aiStrategyEngine = new AIStrategyEngine()
