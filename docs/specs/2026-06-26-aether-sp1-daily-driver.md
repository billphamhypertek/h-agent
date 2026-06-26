# AETHER Desktop — SP-1: Daily-Driver (Design Spec)

> Spec thiết kế · 2026-06-26 · trạng thái: đã chốt design, chờ review để chuyển sang implementation plan(s).
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.

## 1. Bối cảnh

SP-0 đã hoàn tất: 4 màn ổn định (Boot · HUD · Chat · Brief), nền móng WebGL (shared R3F `<Canvas>` + Living Orb + ambient field, multi-layer motion gate + CSS fallback), hệ `--ae-*` geometry/typography token, `$orbState` store, và chip ⌘K **inert** ("sắp ra mắt"). Mọi màn còn lại render `<StubScreen>`.

**SP-1 = "daily-driver":** biến 9 màn stub thành màn thật và nối dây ⌘K Command Palette đầy đủ — đủ để chủ sở hữu dùng AETHER Desktop hằng ngày để cấu hình, vận hành và quan sát hệ agent. SP-1 **không** build mới shell, **không** đụng Python backend, **không** viết lại runtime — chỉ dựng presentation AETHER mới trên nền SP-0 + REST/stores đã có.

Lộ trình tổng: **SP-0** (xong) → **SP-1 daily-driver** (spec này) → **SP-2 4 trụ cột kinh doanh** → **SP-3 Voice + Onboarding**. Mỗi sprint có spec→plan riêng. Xem [program-spec](./2026-06-25-aether-desktop-design.md) §5 (bản đồ 16 màn) và [sp0-design](./2026-06-26-aether-sp0-design.md) §2 (thứ tự sprint).

## 2. Mục tiêu & Phi-mục-tiêu

**Mục tiêu (SP-1):** 9 deliverable = **8 màn** (mỗi màn = 1 route trong `app/routes.ts`, thay `<StubScreen>` tương ứng, 1 màn / commit-slice) **+ ⌘K Command Palette** (overlay, không phải route).
- 8 màn thật thay thế stub tương ứng trong `aether-shell.tsx`.
- 6 màn **restyle** (logic reuse, presentation mới): Settings, Skills, Cron, Profiles, Messaging, Memory.
- 2 màn **read-only** dựng trên dữ liệu sẵn có (không backend mới): Agents, Artifacts.
- ⌘K Command Palette: **wire + restyle** palette cmdk đã tồn tại ở main shell, gỡ inert, mở rộng catalog cho 9 route AETHER.
- Mỗi màn ≥ 1 render test + 1 interaction test (vitest + jsdom), tuân prompt-cache guard.

**Phi-mục-tiêu (KHÔNG làm ở SP-1):**
- 4 trụ cột kinh doanh (Dev cockpit, Inbox+CRM, Content, Vận hành đầy đủ) — **SP-2**.
- Voice (orb state `listening`), Onboarding — **SP-3**.
- Agent CRUD/builder có backend, Artifacts store ở backend — chưa có endpoint; SP-1 chỉ read-only trên dữ liệu sẵn có. (Nếu cần backend → sub-project riêng sau.)
- Thêm/sửa REST endpoint trong `aether_cli/web_server.py` — **0 thay đổi Python**. Đúng nguyên tắc "core là eo thắt hẹp, năng lực ở rìa; renderer chỉ trình bày & điều khiển" ([program-spec](./2026-06-25-aether-desktop-design.md) §2).
- Multi-tenant, billing, auth nhiều người.

## 3. Ràng buộc kế thừa (hard rules — copy từ SP-0, không paraphrase)

- **Giữ runtime đã tôi luyện.** Không viết lại streaming/tool-call/terminal/gateway WS/cmdk core — restyle qua token/className.
- **Brand `#07397d`** (deep navy). Tokens, không literal. **Không hardcode màu ngoài hệ `--ae-*` / `--dt-*`.**
- **Localization (cứng):** UI tiếng Việt. **KHÔNG dịch "Agent" → "Đại lý".** Giữ "Agent". Platform name hiển thị: **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety (cứng):** màn non-chat **KHÔNG** subscribe `message.delta`/`reasoning.delta`/`thinking.*`, **KHÔNG** poll hội thoại live, **KHÔNG** gọi `appendAssistantDelta`. Chỉ đọc REST + event không-thuộc-hội-thoại + `/status`. Không re-trigger LLM.
- **Tôn trọng `prefers-reduced-motion`** + motion gate SP-0 ở mọi transition/overlay.
- **`--ae-*` geometry mode-independent**; chỉ color tokens fork dưới `[data-aether-mode='light']`. `--ae-*` chỉ resolve khi `[data-aether-theme='aether']`.
- **Layering SP-0:** màn dùng `.ae-screen-bare` (transparent, không tự pad, `min-w-0`); content wrapper sở hữu **một** gutter `--ae-page-*` duy nhất. Không double-pad. Padding bake qua `GlassSlab size`.
- **Geometry tokens:** chỉ tokenize arbitrary `[...]` Tailwind values; shorthand chuẩn (`mt-3`, `gap-1.5`) giữ nguyên.

## 4. Kiến trúc — pattern dùng chung cho mọi màn

SP-1 lặp lại một pattern 3-tầng cho từng feature (kế thừa kiến trúc renderer §3.2 program-spec):

```
ui/screens/<feature>-screen.tsx        presentation AETHER (.ae-screen-bare, GlassSlab, --ae-* tokens)
        │  subscribe (useStore)
domain/<feature>/<feature>-store.ts    nanostore: $<feature> + status + actions (load/toggle/save/...)
        │  gọi REST (await)
aether-api.ts methods (đã có)          window.aetherDesktop.api({ path, method, body, profile })
```

**Quy ước:**
- Màn = root `.ae-screen-bare flex h-full min-w-0 flex-col`; **không** `p-[...]`, **không** background riêng (shell-bg SP-0 đã lo). Card/section dùng `<GlassSlab size>`.
- Store mỗi feature: `$<feature>` (atom dữ liệu), `$<feature>Status` (`'idle'|'loading'|'ready'|'error'`), action `load<Feature>()` gọi REST và set atom. Non-render code đọc `$atom.get()`; component subscribe `useStore`.
- **REST-only, không mở socket riêng.** Live update bằng re-fetch (vd sau mutation, hoặc poll nhẹ cho cron run status). Không subscribe gateway delta.
- Loading/empty/error state: skeleton GlassSlab + thông điệp tiếng Việt; lỗi REST → inline error + nút thử lại.
- Stub→real: thay `<StubScreen title="…" />` trong [aether-shell.tsx](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx) bằng màn thật, **1 màn / slice**, giữ test xanh giữa các slice.

**Hạ tầng tái dùng nguyên (không sửa):** `app/routes.ts` (9 route đã định nghĩa: `SETTINGS_ROUTE`, `SKILLS_ROUTE`, `CRON_ROUTE`, `PROFILES_ROUTE`, `MESSAGING_ROUTE`, `MEMORY_ROUTE`, `AGENTS_ROUTE`, `ARTIFACTS_ROUTE` + `COMMAND_CENTER/HUD/BRIEF`), `nav-rail.tsx` + `nav-items.tsx`, PageTransition "Depth", motion gate, Living Orb, `GlassSlab`, `--ae-*` tokens.

## 5. Các màn — chi tiết

> Tên method dưới đây là method renderer đã có trong `aether-api.ts` (đã khảo sát). HTTP path tham chiếu trong bảng §3.1 program-spec / `aether_cli/web_server.py`. **Không** thêm method/endpoint mới trừ khi note rõ.

### 5.1 — 6 màn RESTYLE (logic reuse, presentation mới)

Viết component AETHER mới gọi **đúng** API method + store đã có. **Không** import UI web cũ (`web/src/pages/*`) để tránh kéo design system shadcn cũ vào. Tham khảo web component như "nguồn chân lý logic" (schema binding, OAuth flow, Telegram pairing…), không copy markup.

**Settings** (`SETTINGS_ROUTE`)
- Tabs (glass slab, nav nội bộ): **Model** · **Providers/OAuth** · **Env keys** · **Tools/Toolsets** · **Appearance**.
- Model: `getGlobalModelInfo()`, `getGlobalModelOptions({refresh})`, `setGlobalModel(provider, model, scope)`, `getAuxiliaryModels()`.
- Providers/OAuth: `listOAuthProviders()`, `startOAuthLogin(id)`, `submitOAuthCode(id, sessionId, code)`, `pollOAuthSession(id, sessionId)`, `disconnectOAuthProvider(id)`, `cancelOAuthSession(sessionId)`.
- Env keys: `getEnvVars()`, `setEnvVar(key, value)`, `deleteEnvVar(key)`, `revealEnvVar(key)`, `validateProviderCredential(provider, key)`. Password field masked, reveal qua endpoint.
- Tools/Toolsets: `getToolsets()`, `toggleToolset(name, enabled)`, `getToolsetConfig(name)`, `getComputerUseStatus()`, `grantComputerUsePermissions()`.
- Appearance: theme/skin/color-mode (qua theme store hiện có) — giữ skin `aether` mặc định.
- Config schema-driven: `getAetherConfigSchema()` → render field theo type; `getAetherConfig()` / `saveAetherConfig(config)`.

**Skills** (`SKILLS_ROUTE`)
- List + enable/disable: `getSkills()`, `toggleSkill(name, enabled)`. Card glass + provider/category badge.
- Hub: search/install/update (REST `/api/skills/hub/*`).
- Inline editor: đọc/ghi nội dung skill (`/api/skills/content` GET/PUT).

**Cron** (`CRON_ROUTE`)
- Job list + next-run + trạng thái: `getCronJobs()`, `getCronJob(id)`.
- CRUD + control: `createCronJob(body)`, `updateCronJob(id, updates)`, `deleteCronJob(id)`, `pauseCronJob(id)`, `resumeCronJob(id)`, `triggerCronJob(id)`.
- Schedule builder (cron expression UI) + delivery target selector (`/api/cron/delivery-targets`).
- Run history: `getCronJobRuns(id, limit)` (trả `SessionInfo[]` — chỉ list/metadata, KHÔNG mở stream hội thoại → an toàn prompt-cache).

**Profiles** (`PROFILES_ROUTE`)
- List/create/rename/delete: `getProfiles()`, `createProfile(body)`, `renameProfile(name, newName)`, `deleteProfile(name)`.
- Soul (context) editor: `getProfileSoul(name)`, `updateProfileSoul(name, content)`.
- Per-profile model: `/api/profiles/{name}/model` PUT (qua api wrapper). Active profile: `/api/profiles/active` GET/POST.
- Setup command: `getProfileSetupCommand(name)`.

**Messaging** (`MESSAGING_ROUTE`)
- Platform list + status badge: `getMessagingPlatforms()`.
- Config per-platform + env: `updateMessagingPlatform(id, updates)`.
- Test connection: `testMessagingPlatform(id)`.
- Telegram pairing flow (QR/onboarding): REST `/api/messaging/telegram/onboarding/*`.

**Memory** (`MEMORY_ROUTE`)
- **Tách riêng** thành màn độc lập (web hiện gộp trong PluginsPage).
- Provider selector + config fields + reset: `getMemoryProviderConfig(provider)`, `saveMemoryProviderConfig(provider, values)`, provider switch (`/api/memory/provider` PUT), reset (`/api/memory/reset` POST).
- Provider OAuth (nếu provider cần): `startMemoryProviderOAuth(provider)`, `getMemoryProviderOAuthStatus(provider)`.
- Hiển thị memory entries/context hiện tại (`/api/memory` GET) — read display, không poll hội thoại.

### 5.2 — 2 màn READ-ONLY (dựng trên dữ liệu sẵn có, 0 backend mới)

**Agents** (`AGENTS_ROUTE`) — "mission control" read-only
- Không có REST agent endpoint, không có backend agent CRUD. Tổng hợp nguồn đã có thành view quan sát:
  - **Sessions/subagents:** `listSessions(...)`, `listAllProfileSessions(...)` → cây/tile "agent/session nào đang/đã chạy".
  - **Trạng thái live:** `$gatewayState`, `$busy`, `$orbState` (đã có) cho indicator presence; subagent events **chỉ khi session-keyed** (`subagent.*` bắt buộc có `session_id`, nếu không bị drop — xem `lib/gateway-events.ts`).
  - **Lịch:** `getCronJobs()` (agent chạy theo cron).
  - **Năng lực:** `getSkills()` (skill = năng lực agent).
- UI: gắn nhãn rõ **read-only** ("xem", không "tạo/sửa agent"). Không dead chrome nút CRUD.
- Prompt-cache: chỉ list/metadata + event không-thuộc-hội-thoại; không stream message.

**Artifacts** (`ARTIFACTS_ROUTE`) — thư viện read-only
- Không có artifact store backend. Bọc dữ liệu sẵn có:
  - **Sessions như artifact:** `searchSessions(query)`, `listSessions(...)`, `getSession(id)` cho list + search + preview metadata.
  - **File outputs** (nếu cần): qua `window.aetherDesktop.readDir` (đã có ở preload) cho thư mục output đã biết.
- Mở/preview ở chế độ đọc; **không** mở stream hội thoại live (preview = metadata/nội dung tĩnh, không subscribe delta).
- Gắn nhãn read-only; không nút lưu/sửa artifact (chưa có backend).

### 5.3 — ⌘K Command Palette (`COMMAND_PALETTE` overlay)

- **Wire + restyle** palette cmdk đã tồn tại đầy đủ tại `app/command-palette/index.tsx` (fuzzy multi-term, nested pages, catalog nav/settings/sessions, keybind hints). Tái dùng store `$commandPaletteOpen` / `$commandPalettePage` + keybind action `command-palette:toggle`.
- **Gỡ inert:** chip ⌘K trong [command-bar.tsx](../../apps/desktop/src/aether/ui/components/command-bar.tsx) bỏ `aria-disabled`/title "sắp ra mắt"; nối `onActivate`/`onCommandPalette` (hiện no-op ở `aether-shell.tsx`) để mở palette.
- **Restyle:** áp `--ae-*` token + Depth transition (`scale/blur/fade`) cho overlay; tôn trọng `prefers-reduced-motion`.
- **Mở rộng catalog:** thêm 9 route AETHER (Settings/Skills/Cron/Profiles/Messaging/Memory/Agents/Artifacts/HUD-Brief-Chat) + action chính mỗi màn (vd "Skills: bật/tắt…", "Cron: tạo job", "Settings: đổi model").
- Không trùng lặp: dùng lại registry/filter/keybind đã có, chỉ bổ sung item + theme. (Nếu phát hiện coupling chặt với main shell khiến reuse trực tiếp khó, fallback: trích cmdk core + dựng registry AETHER cùng pattern — quyết ở writing-plans, mặc định reuse.)

## 6. Data flow & prompt-cache

- Mọi màn SP-1 đọc qua **REST** (`window.aetherDesktop.api`) + store nanostore; mutation → re-fetch để refresh.
- **Tuyệt đối không** subscribe `message.delta`/`reasoning.delta`/`thinking.*` ở 9 màn này; không gọi `appendAssistantDelta`. Chỉ Chat (SP-0) được phép stream.
- Live status (cron run, messaging connection) dùng re-fetch / poll nhẹ có guard, không mở socket hội thoại.
- Reconnect/paused overlay: kế thừa hành vi shell SP-0 (`$gatewayState`).

## 7. Error / edge handling

- Lỗi REST mỗi màn → inline error trong GlassSlab + nút "Thử lại"; không crash shell.
- Loading → skeleton GlassSlab; empty → empty-state tiếng Việt.
- OAuth/Telegram pairing: state machine (start→poll→done/cancel) hiển thị tiến trình; timeout → error rõ ràng.
- Mất kết nối gateway → paused overlay SP-0; màn config vẫn đọc REST được nếu backend còn sống.

## 8. Testing

- **Unit (vitest + jsdom):** mỗi store có test action (load/toggle/save mock REST). Mỗi màn ≥ 1 render test + 1 interaction test (mock `window.aetherDesktop.api`).
- **Prompt-cache guard test (cứng):** mỗi màn non-chat có test khẳng định **không** subscribe delta / **không** gọi `appendAssistantDelta` (mount màn, assert handler stream không được gọi).
- **⌘K:** test mở/đóng qua keybind + chip; test catalog chứa route AETHER; test điều hướng item gọi navigate đúng route.
- **E2E desktop:** tái dùng harness `scripts/test-desktop.mjs` + `electron/*.test.cjs` cho smoke mỗi route render được trong shell thật.
- Giữ test xanh giữa mỗi slice màn (stub→real từng cái).

## 9. Decomposition → plans

Spec này phủ cả 9 deliverable (8 màn + ⌘K) nhưng **quá lớn cho một implementation plan**. writing-plans sẽ tách thành chuỗi plan độc lập, **1 plan / màn** (⌘K là 1 plan riêng), theo thứ tự đề xuất (từ [sp0-design](./2026-06-26-aether-sp0-design.md) §2, có điều chỉnh phụ thuộc):

1. **Settings** — nền tảng config/model/env, nhiều màn khác phụ thuộc provider/key đã cấu hình.
2. **⌘K Command Palette** — wire sớm để điều hướng nhanh giữa các màn mới.
3. **Agents** — read-only, dùng sessions/cron/skills (có thể song song nhóm sau).
4. **Skills** — restyle, độc lập.
5. **Cron** — restyle, độc lập (dùng delivery target).
6. **Profiles** — restyle, độc lập.
7. **Memory** — extract + restyle.
8. **Messaging** — restyle (Telegram pairing).
9. **Artifacts** — read-only trên sessions, làm cuối (ít phụ thuộc, ít rủi ro).

Mỗi plan: tạo `domain/<feature>/*-store.ts` (+test) → tạo `ui/screens/<feature>-screen.tsx` (+render/interaction test) → thay stub trong `aether-shell.tsx` → cập nhật nav/⌘K catalog nếu cần → commit.

## 10. Self-Review (đối chiếu mục tiêu)

- **9 deliverable (8 màn + ⌘K):** §5.1 (6 restyle: Settings/Skills/Cron/Profiles/Messaging/Memory) + §5.2 (2 read-only: Agents/Artifacts) + §5.3 (⌘K) — đủ. ✓
- **0 thay đổi Python backend:** mọi màn chỉ gọi REST method đã có; Agents/Artifacts read-only trên dữ liệu sẵn có. ✓
- **Reuse logic, presentation mới:** §4 pattern 3-tầng; §5.1 cấm import UI web cũ, tham khảo logic. ✓
- **Prompt-cache (cứng):** §6 + §8 guard test cho mọi màn non-chat. ✓
- **Brand/token/localization/layering:** §3 ràng buộc kế thừa SP-0. ✓
- **Decomposition:** §9 — 1 plan/màn, thứ tự có phụ thuộc. ✓
- **Non-goals rõ:** §2 — 4 trụ cột (SP-2), Voice/Onboarding (SP-3), agent CRUD backend. ✓

## 11. Tham chiếu

- SP-0 (nền móng): [docs/specs/2026-06-26-aether-sp0-design.md](./2026-06-26-aether-sp0-design.md); plan: [docs/plans/2026-06-26-aether-sp0-cinematic.md](../plans/2026-06-26-aether-sp0-cinematic.md).
- Program-spec (16 màn, kiến trúc, reuse-vs-rebuild): [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md).
- Runtime: `apps/desktop/src/aether/`, `aether-api.ts`, `app/routes.ts`, `app/command-palette/index.tsx`, `lib/gateway-events.ts`, `store/`, `aether/domain/`.
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`.
