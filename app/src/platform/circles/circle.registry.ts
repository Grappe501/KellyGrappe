export type PlatformCircle = {
    key: string
    title: string
    description: string
  }
  
  class CircleRegistryClass {
  
    private circles: Record<string, PlatformCircle> = {}
  
    register(circle: PlatformCircle) {
      this.circles[circle.key] = circle
    }
  
    get(key: string): PlatformCircle | undefined {
      return this.circles[key]
    }
  
    getAll(): PlatformCircle[] {
      return Object.values(this.circles)
    }
  
  }
  
  export const CircleRegistry = new CircleRegistryClass()
  
  /* ------------------------------------------------
  REGISTER PLATFORM CIRCLES
  ------------------------------------------------ */
  
  CircleRegistry.register({
    key: "organization",
    title: "Organization",
    description: "Identity, doctrine, and leadership structure"
  })
  
  CircleRegistry.register({
    key: "people",
    title: "People",
    description: "Contacts, volunteers, members, and supporters"
  })
  
  CircleRegistry.register({
    key: "communication",
    title: "Communication",
    description: "Email, SMS, messaging, and announcements"
  })
  
  CircleRegistry.register({
    key: "operations",
    title: "Operations",
    description: "Tasks, projects, workflows, and events"
  })
  
  CircleRegistry.register({
    key: "field",
    title: "Field & Organizing",
    description: "Grassroots organizing, canvassing, coalitions"
  })
  
  CircleRegistry.register({
    key: "training",
    title: "Training & Development",
    description: "Courses, training programs, onboarding, analytics"
  })
  
  CircleRegistry.register({
    key: "finance",
    title: "Finance",
    description: "Fundraising, expenses, budgeting, compliance"
  })
  
  CircleRegistry.register({
    key: "intelligence",
    title: "Intelligence & Analytics",
    description: "Reports, analytics, and performance insights"
  })
  
  CircleRegistry.register({
    key: "ai",
    title: "AI & Automation",
    description: "AI tools, actions, automation, and workflows"
  })
  