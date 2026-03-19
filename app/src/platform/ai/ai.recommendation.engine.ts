import { AISignal } from "./ai.types"
import { AIRecommendation } from "./ai.types"

export class AIRecommendationEngine {

  analyze(signal:AISignal):AIRecommendation[]{

    const recommendations:AIRecommendation[] = []

    if(signal.type === "user_action"){
      recommendations.push({
        id:"rec_"+Date.now(),
        type:"ui_suggestion",
        title:"Open related dashboard",
        message:"You may want to view related campaign metrics.",
        priority:5
      })
    }

    if(signal.type === "telemetry"){
      recommendations.push({
        id:"rec_"+Date.now(),
        type:"alert",
        title:"Telemetry spike detected",
        message:"Consider reviewing live system activity.",
        priority:8
      })
    }

    return recommendations
  }

}

export const aiRecommendationEngine = new AIRecommendationEngine()
