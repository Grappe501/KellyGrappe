export type AISignalType =
  | "user_action"
  | "system_event"
  | "data_update"
  | "telemetry"
  | "custom"

export interface AISignal {
  id: string
  type: AISignalType
  source: string
  payload?: Record<string, unknown>
  timestamp: string
}

export interface AIRecommendation {
  id: string
  type: string
  title: string
  message?: string
  priority: number
  action?: string
}

export interface AICommand {
  id: string
  name: string
  description?: string
  execute: (payload?: any) => Promise<any> | any
}
