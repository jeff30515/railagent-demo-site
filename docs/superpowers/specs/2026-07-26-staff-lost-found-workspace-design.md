# Station Lost-Found Workspace Design

## Goal

Give both Banqiao and Qingpu staff a Traditional-Chinese-only lost-found workspace that displays live tracked cases and current station found items without Demo task data or passenger friendly-transfer content.

## Boundary

The primary React application owns `#root`. The station workspace must not replace or mutate that root because doing so races React rendering and produces mixed unstyled content. A dedicated staff workspace is rendered in an isolated document layer only after the primary app is hidden for a signed-in staff account.

## Data flow

1. Resolve the staff account from `railagent.mobile.account` and use the shared `apiBaseUrl` configuration.
2. Call `POST /api/auth/demo-login`, then use its token for `GET /api/tasks` and `GET /api/lost-found/items?unitId=<staff unit>`.
3. Show only `lost_item` tasks with a `caseId` and `lostItem`; show the same live list in both 「優先任務」 and 「任務」.
4. Render newest station found items first, using the API's `foundAt` ordering.
5. Submit found items with the repository fields `itemType`, `color`, `brand`, `features`, `foundLocation`, `foundAt`, and `trainNumber`; append the staff station name server-side request payload.

## Presentation

- Chinese is forced through `document.documentElement.lang = 'zh-TW'` and all workspace copy is fixed Traditional Chinese.
- The workspace reuses `mobile-product` and `mp-*` classes, so it retains the existing mobile application visual system.
- It contains only: workspace heading, 優先任務, 任務, 本單位近期拾獲, and 登記拾獲物.
- It contains no Demo task labels, fake task rows, or friendly-transfer UI.

## Verification

- Static tests prove the isolated workspace is loaded only for the two staff accounts, uses all required API routes and fields, and uses Traditional Chinese copy.
- Local API tests continue to validate station scoping and CORS.
- External Tunnel checks validate both station accounts can read tasks and found items.
