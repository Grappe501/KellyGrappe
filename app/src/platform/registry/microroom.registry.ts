type MicroRoomDefinition = {
    key: string
    dashboards: readonly string[]
  }
  
  const registry = new Map<string, MicroRoomDefinition>()
  
  export const MicroRoomRegistry = {
    register(room: MicroRoomDefinition) {
      registry.set(room.key, room)
    },
  
    get(key: string): MicroRoomDefinition | undefined {
      return registry.get(key)
    },
  
    getAll(): MicroRoomDefinition[] {
      return Array.from(registry.values())
    }
  }