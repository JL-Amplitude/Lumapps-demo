# Lumapps Intranet — Amplitude demo

A static, mobile-first employee intranet (news, AI Agent Hub, frontline shifts, micro-apps, integrations) instrumented with Amplitude. It is the companion site to the **Lumapps** demo dataset already loaded in Amplitude, so live sessions land on the same events, properties and account groups.

**Live site:** `https://jl-amplitude.github.io/Lumapps-demo/` (after GitHub Pages is enabled — see below).

## Demo story

Employees ask an AI agent to do something (PTO, IT ticket, expense, HR change). Before acting, the agent must be authorised on a connected system (Microsoft 365 / Google Workspace / SAP SuccessFactors / ServiceNow).

- **Desk worker** → sign in with *SSO* → **Allow** → task completes → rate the agent.
- **Frontline worker** → sign in with *SMS code / Badge QR / personal email link* (any 6-digit code) → the connector asks for a corporate account → **I don't have a corporate account** → `Connector Sign-In Prompt Dismissed` → **Abandon task**.

Funnel: `Intranet Home Viewed → Agent Hub Opened → Agent Task Started → Agent Action Authorized → Agent Task Completed`.

### Handy URL parameters

| Parameter | Effect |
|---|---|
| `?variant=treatment` | Shows the experiment treatment in the connector modal (“Authorise with your Lumapps frontline account”) and fires `$exposure` for flag `connector-sign-in-prompt-dismissed-reduction`. `?variant=control` switches back. |
| `?entry=email_digest_link` | Sets `entry_point` on `Login Page Viewed` (`email_digest_link`, `mobile_app`, `bookmark`, `teams_tab`). |
| `?utm_medium=social` | Sets the `utm_medium` user property on login. |

Put parameters before the hash, e.g. `https://jl-amplitude.github.io/Lumapps-demo/?variant=treatment#/login`.

The **Company** dropdown on the login page maps to the `account` group (Amplitude Accounts add-on). Northwind Retail, Polaris Software and Cobalt Chemicals are the disengaging accounts in the historical data.

## Tracking

Amplitude is loaded from the CDN in `index.html` (Analytics + Session Replay + Web Experiment + Guides & Surveys). All tracking goes through `src/lib/analytics.ts`, which adds `account_id` and `platform_channel` to every event. Login is client-side only: the user ID is `<name>_<demo#>_<yyyymmdd>`; `Login Page Viewed` fires anonymously and is merged into the user on `setUserId`.

Events: `Login Page Viewed`, `Login Completed`, `Intranet Home Viewed`, `Agent Hub Opened`, `Agent Task Started`, `Agent Action Authorized`, `Agent Task Completed`, `Connector Sign-In Prompt Dismissed`, `Agent Task Abandoned`, `Agent Response Rated`, `Knowledge Search Performed`, `News Feed Browsed`, `Leadership Announcement Viewed`, `Post Comments Viewed`, `Article Bookmarked`, `Recommended Content Clicked`, `Shift Schedule Viewed`, `session_ended`, plus site-only extras `Shift Swap Requested`, `Digital Form Submitted`, `Micro App Opened`, `Approval Submitted`, `Directory Searched`, `Employee Profile Viewed`.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (not *Deploy from a branch* — that publishes the raw source and the page loads blank with a 404 on `/src/main.tsx`).
2. Push to `main` (or run the *Deploy to GitHub Pages* workflow from the Actions tab).
3. Repo **Settings → Environments → github-pages → Deployment branches and tags**: make sure `main` is allowed (GitHub pins this to whichever branch was default when Pages was first enabled).

The build is fully static: `HashRouter` routes (`#/agents`), `base: "./"` in `vite.config.ts`, `.nojekyll` and a `404.html` fallback in `public/`.
