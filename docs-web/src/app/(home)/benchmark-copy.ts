export const benchmarkCopy = {
  title: "Release Readiness Workspace",
  subtitle:
    "A single workspace for launch status, blockers, rollout notes, and decision support.",
  summary:
    "The release is on track, but the rollback path and support runbook still need explicit review before approval.",
  summaryStatus: "Ready with conditions",
  tabNames: {
    summary: "Summary",
    rollout: "Rollout",
    risks: "Risks",
  },
  checklist: [
    "Confirm rollback ownership before the launch window opens.",
    "Verify support runbook links are visible in the handoff artifact.",
    "Keep launch decisions readable outside the chat thread.",
  ],
  rolloutSteps: [
    "Freeze deploys for dependent services 30 minutes before release.",
    "Enable release flag for the internal cohort first.",
    "Watch error budget and support queue for the first 20 minutes.",
  ],
  risks: [
    {
      title: "Rollback path",
      body: "Rollback is documented, but the final owner acknowledgement is still missing.",
    },
    {
      title: "Support handoff",
      body: "The support runbook exists, but the escalation path should be surfaced in the artifact itself.",
    },
  ] as const,
  recommendation:
    "Approve release only after rollback owner and support lead both confirm readiness.",
  evidence: [
    ["QA coverage", "Complete"],
    ["Rollback owner", "Pending confirmation"],
    ["Support runbook", "Needs final sign-off"],
  ] as const,
} as const

export type BenchmarkCopy = typeof benchmarkCopy
