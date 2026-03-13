/**
 * training.circle.ts
 *
 * Training Circle definition
 *
 * This circle powers:
 * - learning paths
 * - certifications
 * - training analytics
 * - leadership development
 * - readiness tracking
 *
 * It is domain-aware through the System Mode layer.
 */

export const TrainingCircle = {
    key: "training",
    title: "Training & Development",
    description:
      "Learning, certification, skill development, and progression infrastructure.",
    dashboards: [
      "TrainingDashboard",
      "LearningPathsDashboard",
      "CertificationDashboard",
      "TrainingAnalyticsDashboard"
    ],
    pages: [
      "TrainingDashboard",
      "LearningPathsDashboard",
      "CertificationDashboard",
      "TrainingAnalyticsDashboard"
    ],
    capabilities: [
      "course_management",
      "learning_paths",
      "progress_tracking",
      "certifications",
      "skills_graph",
      "coaching",
      "manager_reporting",
      "follow_up_automation"
    ]
  }
  
  export default TrainingCircle
  