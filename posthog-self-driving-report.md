# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured with Session Replay, Error Tracking, Support, five native signal-source responders, a selective five-scout troop, and two Replay Vision monitors for project creation. Findings should start appearing in the [Self-driving inbox](https://eu.posthog.com/project/274417/inbox) within about 30 minutes; the Replay Vision monitors are armed now and will begin observing when matching recordings arrive.

## AI data processing

Organization-level AI data processing is **approved**.

## GitHub

The PostHog GitHub App was **already connected** before this setup. No GitHub Issues warehouse source or responder was enabled because no external connected tool was selected.

## Products enabled

| Product | Result | Notes |
|---|---|---|
| Session Replay | Already enabled | The web `posthog.init` configuration does not disable session recording. |
| Error Tracking | Already enabled | The web `posthog.init` configuration does not disable exception capture. |
| Support / Conversations | Enabled | Connect an inbound email, inbox, or Slack channel before support tickets can arrive. |

## Signal sources

| `source_product` | `source_type` | Action |
|---|---|---|
| `health_checks` | `health_issue` | Enabled; config `01a0a116-4bd5-77ee-b772-428c966fca32`. |
| `error_tracking` | `issue_created` | Enabled; config `01a0a116-4c71-7e09-90a7-aaf94e421d71`. |
| `error_tracking` | `issue_reopened` | Enabled; config `01a0a116-4ca5-783a-b1c0-f30928b1cd69`. |
| `error_tracking` | `issue_spiking` | Enabled; config `01a0a116-4c58-70d6-9908-8f10e99bf3f9`. |
| `conversations` | `ticket` | Enabled; config `01a0a116-4c6c-72bc-a1a8-0d8a61abcde1`. It remains idle until an inbound channel is connected. |
| `signals_scout` | `cross_source_issue` | On by default; no opt-out row was created. |
| `session_replay` | `session_analysis_cluster` | Skipped because this retired source is replaced by Replay Vision scanners. |
| `replay_vision` | — | No source row created; each scanner self-authorizes with `emits_signals: true`. |

All five created responder rows were listed again and verified enabled.

## Connected tools

The connected-tools selection was cancelled, which is treated as declining the offered tools. No external warehouse sources or dormant responders were created. Sentry was detected in the repository and surfaced first, followed by GitHub Issues, Linear, Jira, and Zendesk; all are recorded as **not used for this setup**.

The warehouse source inventory was checked and contained no sources.

## Scout troop

The canonical troop was materialized and verified. The enforced budget is **100 runs per day**; **0** runs had been used and **100** remained when configured. PostHog's announcement states: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

### Enabled scouts

| Scout | Why it is enabled |
|---|---|
| `signals-scout-general` | Watches cross-product correlations and surfaces without a dedicated enabled specialist. |
| `signals-scout-product-analytics` | Watches the product's core funnels, retention, lifecycle, stickiness, and paths. |
| `signals-scout-web-analytics` | Watches page traffic, acquisition attribution, landing-page health, and 404 steps. |
| `signals-scout-revenue-analytics` | Watches the Stripe-backed revenue surface for sync, capture, configuration, and goal regressions. |
| `signals-scout-logs` | Watches PostHog logs for emerging patterns, volume or severity shifts, and service silence. |

### Disabled scouts

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Error tracking is covered by native signal sources, avoiding duplicate reports. |
| `signals-scout-session-replay` | Replay is covered by the two Replay Vision scanners, avoiding duplicate reports. |
| `signals-scout-replay-vision` | No accumulated scanner observations exist yet; enable later for cross-observation trends. |
| `signals-scout-ai-observability` | The app uses AI, but PostHog `$ai_*` observability events were not confirmed. |
| `signals-scout-anomaly-detection` | The enabled product specialists provide more targeted initial coverage. |
| `signals-scout-apm` | No PostHog APM / OpenTelemetry span usage was confirmed. |
| `signals-scout-conversations` | Native support-ticket routing owns this surface. |
| `signals-scout-csp-violations` | No PostHog CSP reporting configuration was found. |
| `signals-scout-customer-analytics` | Group/account analytics usage was not confirmed. |
| `signals-scout-data-pipelines` | No CDP destination, batch export, or Hog flow usage was confirmed. |
| `signals-scout-data-warehouse` | No warehouse source is connected. |
| `signals-scout-experiments` | Active PostHog experiments were not confirmed. |
| `signals-scout-feature-flags` | Active PostHog feature-flag usage was not confirmed. |
| `signals-scout-health-checks` | Setup-health findings already enter through the native health source. |
| `signals-scout-inbox-validation` | This is a fresh setup with no shipped Self-driving fixes to validate yet. |
| `signals-scout-insight-alerts` | Existing insight alerts were not confirmed. |
| `signals-scout-mcp-tool-calls` | MCP telemetry is not a core product surface for this project. |
| `signals-scout-observability-gaps` | The selective product specialists take priority for the initial troop. |
| `signals-scout-skills-store` | Team-authored PostHog skill usage was not confirmed. |
| `signals-scout-surveys` | The project has no surveys. |
| `signals-scout-tasks` | PostHog Tasks usage was not confirmed. |
| `signals-scout-web-vitals` | `$web_vitals` collection was not confirmed. |

The final troop has **5 enabled** and **22 disabled** built-in scouts, leaving room for future custom scouts while staying below the ten-scout quality ceiling.

## Custom scouts

No custom scouts were created. Two product-specific candidates were proposed and declined:

- **First-project journey:** would have watched entry volume and route-specific completion from the home page through manual or AI-assisted project creation. It partly overlaps product analytics on conversion, but would add entry-volume and route-liveness discrimination.
- **AI project prefill:** would have watched the explicit success-versus-failure result of AI-assisted project setup, including user-visible soft failures that exception tracking may not catch. It partly overlaps logs and product analytics.

Other surfaces were ruled out as follows:

- Generic conversion regressions are already covered by `signals-scout-product-analytics`.
- Stripe lifecycle health is already covered by `signals-scout-revenue-analytics`.
- Exceptions are covered by native error responders.
- On-screen breakage and frustration are covered by Replay Vision scanners.
- Planned pilot features without active instrumentation were not watchable yet.

If a future custom scout is noisy, set `emit: false` on its config in PostHog to switch it to dry-run.

## Replay Vision scanners

A Replay Vision scanner is an LLM that watches individual session recordings on a schedule and pushes eligible findings to the Self-driving inbox. Scanners are the only part of this setup that spends Replay Vision quota. Each finding arrives at half weight, so an issue needs independent corroboration before promotion into a report.

At setup time the organization had **2,500 credits remaining**, was not exhausted, and both scanner estimates were **0 observations / 0 credits per month** because no matching recordings existed in the sampled window.

| Monitor | Result | What it watches | Query scope | Sampling | Estimate |
|---|---|---|---|---:|---:|
| Project creation breakage | Created and enabled | Visible AI-generation failures, upload/import failures, saves that fail, unresolved loading, or a saved project page that never appears. | Sessions containing `/novo`; this is the product's project-creation flow and leads to the saved `/projeto/:slug` page. | 50% | 0 observations / 0 credits monthly |
| Project creation frustration | Created and enabled | Repeated retries, unresponsive actions, route switching, upload retries, AI reruns, save hammering, or account/setup loops. | Sessions containing `$rageclick`, with no URL filter so it remains on the action axis. | 100% | 0 observations / 0 credits monthly |

Both monitors use `gemini-3-flash-preview`, have `emits_signals: true`, and were verified by listing the signal-emitting scanner inventory. They are armed and begin working when recordings match. Rating their future results thumbs up or down in Replay Vision produces scanner configuration recommendations for review.

## Files created

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created with this setup record and follow-ups. |
| `.claude/skills/replay-vision-scanners-core/` | Installed the shared scanner mechanics used by this run. |
| `.claude/skills/replay-vision-scanner-broken-experiences/` | Installed the locked breakage-monitor brief. |
| `.claude/skills/replay-vision-scanner-user-frustration/` | Installed the locked frustration-monitor brief. |

No application source files or environment files were modified.

## Follow-ups

- [ ] Connect an inbound Support / Conversations channel (email, inbox, or Slack) so support tickets begin reaching Self-driving.
- [ ] Let matching Session Replay recordings arrive, then review and rate the two Replay Vision monitors' first observations.
- [ ] If AI observability is wanted later, instrument PostHog `$ai_*` events and then consider enabling `signals-scout-ai-observability`.
- [ ] Revisit the two declined custom-scout proposals if entry-volume collapse or AI soft failures need dedicated scheduled monitoring.

## What happens next

The scout coordinator should pick up the fresh configuration within about 30 minutes. Scout runs draw from the project's verified 100-runs-per-day budget, findings cluster into reports in the [Self-driving inbox](https://eu.posthog.com/project/274417/inbox), and immediately actionable reports can start coding tasks.