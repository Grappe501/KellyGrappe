export interface CardDefinition<TData = unknown, TFilters = unknown> {

    key: string
  
    title: string
    subtitle?: string
  
    category: CardCategory
    version: number
  
    description?: string
    icon?: string
  
    defaultWidth: CardWidth
    defaultHeight?: CardHeight
  
    defaultDisplayMode?: CardDisplayMode
  
    featureKey?: FeatureKey
  
    allowedRoles?: UserRole[]
  
    tags?: string[]
  
    /* 🔹 NEW */
    componentLoader: () => Promise<{
      default: React.ComponentType<BaseCardProps<TData, TFilters>>
    }>
  
  }