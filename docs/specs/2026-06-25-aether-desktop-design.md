# AETHER — Thiết kế lại Desktop (HYPERTEK - AGENT PLATFORM)

> Spec thiết kế · 2026-06-25 · trạng thái: đã chốt design, chờ review để chuyển sang implementation plan.
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.

## 1. Bối cảnh & Tầm nhìn

**AETHER** là bản viết lại desktop app của AETHER, một sản phẩm của **HyperTek** (thương hiệu nền tảng: **HYPERTEK - AGENT PLATFORM**).

Tầm nhìn: một **"AI chief-of-staff" cho công ty một người** — nhìn thấy toàn bộ hoạt động (dev/DevOps, kinh doanh & khách hàng, nội dung & marketing, vận hành & hành chính), chủ động chạy việc nền, và trình diện mọi thứ qua một **buồng lái điện ảnh** khiến người dùng cảm thấy đang điều khiển cả một tổ hợp dù chỉ có một mình.

**Định hướng kinh doanh:** *dùng-trước-bán-sau* (personal-first, productize-later). Lát đầu tiên tối ưu cho **một người dùng** (chủ sở hữu); kiến trúc giữ sạch để sau này có thể tách thành sản phẩm multi-tenant bán cho các solopreneur khác. **Không** over-engineer multi-tenant/billing/auth nhiều người ở giai đoạn này.

## 2. Nguyên tắc nền (kế thừa AETHER — không vi phạm)

- **Per-conversation prompt caching là bất khả xâm phạm.** Renderer chỉ là client; không làm gì khiến backend phải rebuild system prompt / swap toolset giữa hội thoại.
- **Core là eo thắt hẹp; năng lực ở rìa** (plugin/skill/CLI), không phình core. Mọi tính năng "company OS" mới ưu tiên hiện thực ở rìa (skill/cron/tool), renderer chỉ *trình bày* và *điều khiển*.

## 3. Quyết định kiến trúc

**Giữ nguyên (không đụng):** AETHER Python backend, Electron shell, gateway/dashboard API, protocol layer.
**Cách tiếp cận: HYBRID (đã chốt).** Viết mới phần "vỏ" — design system AETHER, app shell, 16 màn, Living Orb, hiệu ứng — trên canvas trắng; **tái dùng runtime đã tôi luyện** (gateway client, theme plumbing, chat streaming/tool-call, terminal, markdown, command palette, virtualization) bằng cách restyle thay vì viết lại. Đẹp như ý mà không phải giải lại bug streaming/tool-call. Chi tiết ở §3.3.

### 3.1 Mặt tiếp giáp backend ↔ renderer (đã khảo sát)

- **Khởi động backend:** Electron spawn `aether [--profile X] dashboard --no-open --host 127.0.0.1 --port 0` (port động đọc từ stdout). Logic ở `apps/desktop/electron/main.cjs` (`startAETHER`).
- **Transport:**
  - **WebSocket JSON-RPC 2.0** tại `/api/gateway?token=<token>` — dùng cho streaming/events.
  - **REST** tại `/api/*` — dùng cho mutation/config/list.
- **Client tái dùng nguyên:** `apps/shared/src/json-rpc-gateway.ts` (`JsonRpcGatewayClient`) — UI-agnostic, không phụ thuộc UI. Renderer mới **dùng lại class này**.
- **Preload bridge** `window.aetherDesktop` (`apps/desktop/electron/preload.cjs`): `getConnection/getGatewayWsUrl/api/terminal/openSessionWindow/readDir/...`. Renderer mới vẫn dùng cho connection-resolution, REST proxy, terminal (PTY), file/clipboard — **không hardcode business logic vào preload**.
- **Event types** (WS, server-initiated): `gateway.ready`, `session.info`, `message.start|delta|complete`, `thinking.delta`, `reasoning.delta|available`, `tool.start|progress|complete|generating`, `clarify.request`, `approval.request`, `sudo.request`, `secret.request`, `status.update`, `error`, `skin.changed`.
- **REST surfaces:** sessions (+search), config (+schema/defaults), model (info/set), skills (+toggle), tools/toolsets (+provider), env (+reveal), providers/oauth, messaging/platforms, memory/providers, cron/jobs (+runs/trigger/pause/resume), profiles, status, logs.

### 3.2 Kiến trúc renderer mới (3 lớp tách bạch)

1. **transport/** — bọc `JsonRpcGatewayClient` (WS) + một REST wrapper (qua `window.aetherDesktop.api`, profile-aware). Reconnect/backoff, "paused" overlay khi mất kết nối.
2. **domain/state/** — **nanostores** theo từng feature (sessions, chat stream, models, skills, cron, memory, server-vitals, briefing…). Render components subscribe bằng `useStore`; non-render đọc `$atom.get()`.
3. **ui/** — design system AETHER (tokens, theme, components) + các route/màn hình. Mỗi màn = 1 route, state riêng, file mỏng.

**Key files để nghiên cứu khi triển khai:** `apps/shared/src/json-rpc-gateway.ts`, `apps/desktop/electron/main.cjs` + `preload.cjs`, `apps/desktop/src/aether.ts` (REST patterns hiện có), `web/src/lib/api.ts`, `tui_gateway/server.py` (RPC dispatch).

### 3.3 Reuse vs Rebuild (đã chốt — hybrid)

| Phần | Quyết định | Ghi chú |
| --- | --- | --- |
| Chat (streaming, tool-call) | **Reuse + restyle** | `@assistant-ui` runtime + `use-gateway-request` đã chắc; thay className/theme, không viết lại logic. |
| Terminal | **Reuse** | xterm + node-pty (Electron); đổi ANSI palette sang brand. |
| Markdown / code | **Reuse** | streamdown / shiki / katex; đổi theme. |
| Command palette (⌘K) | **Reuse + restyle** | cmdk headless. |
| Theme system (`src/themes`) | **Reuse + thêm preset AETHER** | Token/CSS-var; thêm preset navy/azure + dark/light vào `presets.ts`. |
| Gateway client, virtualization, nanostores, dnd-kit | **Reuse** | Không dính UI. |
| Window/overlay infra (`floating-hud.ts`, `electron/session-windows.cjs`) | **Reuse** | Cho HUD / overlay / ⌘K / voice. |
| Living Orb + hiệu ứng cinematic | **Build mới** | Tái dùng pattern SVG parametric ở `components/ui/loader.tsx`; glassmorphism/glow thêm ở `styles.css` (`@layer utilities`). |
| App shell, layout, 16 màn | **Build mới** | Phần "đẹp mới". |

## 4. Design System (ĐÃ CHỐT)

### 4.1 Màu — thương hiệu HyperTek
- **Core brand:** `#07397d` (HSL 215°, deep navy) — màu chủ đạo: primary button, nhận diện, bề mặt brand.
- **Nền Dark dẫn xuất:** `#020c1d` (950), `#03152f` (900), panel `#082046` / `#0a2a5c`.
- **Accent glow (holographic):** azure `#4aa3ff`; light `#8fc0ff`; bright `#1659b5`. (Vì `#07397d` quá tối để tự phát sáng trên nền dark.)
- **Text:** `#e9f1ff` (ink), `#9fb6d6` (dim). Hairline: `rgba(120,180,255,.16)`.
- **Semantic:** ok `#3DE7A0` · warn `#FFB020` · error `#ff5d6c`.
- Quy tắc: **không hardcode màu lạ ngoài hệ này**; dựng CSS tokens, đổi một chỗ là toàn bộ kế thừa.

### 4.2 Theme — dual
- **Dark "Spatial Depth"** (mặc định): nền navy sâu + lưới sàn phối cảnh + bloom azure; glass slab 3D nhiều lớp.
- **Light "Arctic Glass"**: nền cool sáng, kính mờ trắng, chữ navy `#0c2444`, primary `#07397d`, accent `#1659b5`.
- Cùng layout/component, chỉ đảo palette qua tokens.

### 4.3 Typography
- **Orbitron** — wordmark + tiêu đề lớn (uppercase, letter-spacing ~.14em).
- **Be Vietnam Pro** — thân chữ / UI / heading (tròn, hiện đại, hỗ trợ tiếng Việt hoàn hảo).
- **JetBrains Mono** — dữ liệu/số/timestamp/log/code.

### 4.4 Aesthetic & components
- Glass slab nhiều lớp (drop-shadow + 1px top highlight, radius 14–18px), độ sâu 3D nhẹ; glow chỉ trên **dữ liệu chính**; line-work HUD tiết chế.
- **App shell:** left **nav rail** (~62px: brand glyph + icon các mục + active glow) + **top bar** (title + date/time mono + avatar). **Chấm online nhỏ** (xanh, pulse) ở góc brand glyph — **KHÔNG** dùng status pill to.
- **Living Orb** — "linh hồn" agent (presence/state).
- Glass card/tile, command bar (mic + `⌘K`), micro-viz (gauge/sparkline/ring).

### 4.5 Localization (quy tắc cứng)
- UI tiếng Việt. **KHÔNG dịch "Agent" → "Đại lý".** Giữ "Agent". "Trợ lý" dùng được cho mô tả.
- Platform name hiển thị: **"HYPERTEK - AGENT PLATFORM"**.

### 4.6 Motion & Transitions

**Đã chốt:**
- **Nav active-indicator trượt:** "focus background" (pill azure glow) **trượt** giữa các mục nav bằng spring easing (`cubic-bezier(.5,.05,.1,1)`, ~0.44s) — translate `translateY(index * itemHeight)`. Hover hiện một highlight mờ chạy theo con trỏ (~0.26s); click commit focus. Mép trái có thanh sáng glide theo.
- **Chuyển trang chính = "Depth":** trang mới `scale(1.04→1)` + `blur(6px→0)` + fade, ~0.5s, `cubic-bezier(.4,0,.2,1)`. Hợp theme "Spatial Depth" — cảm giác lùi/tiến trong chiều sâu. Có thể tái dùng cho overlay / Command Palette (⌘K).
- Control transitions tiết chế (~100–150ms; breathing orb). Implement bằng CSS keyframes/transition; JS chỉ toggle class + cập nhật transform của indicator. **Tôn trọng `prefers-reduced-motion`** (giảm về fade thuần hoặc tắt).

**Ambient motion — hướng ĐÃ KHOÁ, build sau:** lớp nền cinematic cao cấp dùng **WebGL/Three.js + shader (GLSL)** — fidelity kiểu [getlayers.ai](https://www.getlayers.ai) (3D/shader fluid "dòng chảy", KHÔNG phải CSS/canvas mô phỏng) — cho **Living Orb + background** ở Boot / nền HUD / Voice. **Không thuộc lát đầu**; đưa vào **sub-project "motion/cinematic" riêng** sau khi foundation chạy. Khi đó quyết **mua Layers** (phải kiểm tra license cho sản phẩm bán lại) **vs tự build** (`@react-three/fiber` + GLSL — sở hữu mã, brand-tuned). Desktop hiện CHƯA có Three.js → sẽ thêm lúc đó. Guard: chỉ vài màn, pause khi ẩn/idle, tôn trọng `prefers-reduced-motion`. **Lát đầu dùng orb SVG/CSS nhẹ** (pattern `components/ui/loader.tsx`).

## 5. Bản đồ 16 màn hình

Mockup tham chiếu: `.superpowers/brainstorm/21982-1782359469/content/09-all-screens.html`.

**Khung lõi**
1. **Boot Sequence** — khởi động điện ảnh (orb + rings + init checklist + tagline "HYPERTEK - AGENT PLATFORM"). Dữ liệu: trạng thái boot (preload `getBootProgress`).
2. **Command-Center HUD** (trang chủ) — buồng lái: orb, brief sáng tóm tắt, bento tiles (servers/deals/lịch/agents), command bar. Dữ liệu: tổng hợp nhiều nguồn (xem §7).
3. **Brief sáng** (focus) — briefing đầy đủ, ưu tiên trong ngày, đọc bằng giọng. *Proof pillar.*
4. **Chat** — hội thoại + streaming tool-call cards + orb presence + command bar. Dữ liệu: WS `message.*`/`tool.*`; REST sessions.

**4 trụ cột** (mockup xong, triển khai ở sub-project sau)
5. **Dev & DevOps cockpit** — server vitals (hypertekvn/h-workspace), deploy/log/incident.
6. **Inbox + CRM** — triage email, deal pipeline, draft reply theo giọng.
7. **Content engine** — calendar đa kênh, idea→nháp→lịch, repurpose.
8. **Vận hành & Tài chính** — lịch/task/finance/second-brain search.

**Hệ agent**
9. **Agents & Subagents** — mission control (BMad pipeline, subagent tree). Dữ liệu: subagents/sessions, status events.
10. **Skills** — thư viện skill tự cải tiến, skill mới tự sinh. REST `/skills`.
11. **Memory / Second Brain** — memory entries theo type, mô hình người dùng. REST memory.
12. **Cron / Automations** — job đã lên lịch, next-run, delivery channel. REST `/cron/jobs`.

**Hệ thống**
13. **Command Palette (⌘K)** — overlay tìm/chạy lệnh, điều hướng, skills.
14. **Settings** — provider/model, tools, voice, giao diện (theme+brand), kênh, bảo mật. REST config/model/tools/env/providers/messaging.
15. **Voice / Ambient** — orb lớn phản ứng giọng, transcript, hands-free.
16. **Onboarding** — chọn model/provider → kết nối kênh → giọng & tính cách → sẵn sàng.

## 6. Phạm vi LÁT ĐẦU TIÊN (sub-project #1)

Đây là phần đưa sang **writing-plans**. Các màn còn lại đã có mockup, triển khai ở các sub-project sau.

**Trong phạm vi:**
- **Foundation:** transport layer (reuse `JsonRpcGatewayClient` + REST wrapper + reconnect), theme system (dark+light tokens), app shell (nav rail + top bar + online dot), routing, **Living Orb** (bản SVG/CSS nhẹ — nâng cấp WebGL ở sub-project motion).
- **Màn:** Boot Sequence · Command-Center HUD · Chat (streaming + tool-call) · Brief sáng.
- **Proof pillar:** Vận hành / **Morning Briefing** (tổng hợp đa nguồn).

**Ngoài phạm vi lát đầu (roadmap sub-projects sau):** Dev cockpit, Inbox+CRM, Content, Vận hành đầy đủ, Agents, Skills, Memory, Cron, Command Palette, Settings đầy đủ, Voice, Onboarding.

**YAGNI (chưa làm):** multi-tenant, billing, auth nhiều người, motion "dòng chảy" cao cấp.

## 7. Data flow (lát đầu)

- **Boot:** Electron resolve connection → renderer connect WS (`getGatewayWsUrl`) + REST `/status` → hiển thị boot checklist từ event/`getBootProgress` → vào HUD.
- **HUD/Briefing (đã chốt cơ chế):** một skill `morning-briefing-aggregator` chạy bằng **cron** (vd 07:00) gọi các nguồn → ghi **artifact JSON có cấu trúc** → renderer đọc run mới nhất qua `/api/cron/jobs/<id>/runs` (hoặc thêm endpoint `/api/briefing/daily`). Nguồn **sẵn dùng**: email + lịch qua skill `google-workspace`; **server health** qua một skill mỏng bọc các skill có sẵn của user `hypertekvn-main-server-manage` / `h-workspace-server-manage` (xuất JSON); tasks + ngữ cảnh qua cron / `/api/sessions` / memory providers. **CRM/deals để sau** (AETHER chưa có native — chỉ Linear MCP). Cơ chế này cũng **an toàn prompt-cache** vì chạy trong session cron riêng.
- **Chat:** gửi message qua WS → nhận `message.delta` (stream) + `tool.start/progress/complete` (render tool-call cards) + xử lý `approval/clarify/secret.request`.

## 8. Error / edge handling

- Mất kết nối → reconnect backoff (shared client hỗ trợ) + overlay "paused"; remote/OAuth dùng `getGatewayWsUrl` mint ticket.
- Boot failure → ErrorState + link log (`AETHER_HOME/logs/desktop.log`).
- Interactive prompts (`approval/sudo/secret/clarify`) → modal/inline trong Chat.
- **An toàn prompt-cache (cứng):** HUD/Briefing **KHÔNG** subscribe `message.delta` và **KHÔNG** poll hội thoại live; chỉ đọc artifact cron + event không-thuộc-hội-thoại + REST `/status`. Tránh re-trigger LLM làm hỏng cache. `prefers-reduced-motion` đã được hệ hiện tại xử lý (Web Animations API) → tái dùng.

## 9. Testing

- **Unit (vitest + jsdom):** transport wrapper, nanostores actions, render component chính.
- **Visual:** mockup 16 màn làm "nguồn chân lý"; đối chiếu thủ công.
- **E2E desktop:** tái dùng harness electron test hiện có (`scripts/test-desktop.mjs`, các `electron/*.test.cjs`).
- Mỗi màn lát đầu có ít nhất: render test + một interaction test (vd Chat gửi message giả lập stream).

## 10. Rủi ro & câu hỏi mở

- **Ambient motion** — *hướng đã khoá* (WebGL/Three.js shader-grade, tham khảo getlayers.ai; §4.6). Build đưa vào **sub-project "motion/cinematic"** sau foundation; quyết **mua Layers vs tự build** khi đó. (Nav-slide + page transition "Depth" đã chốt.)
- ✅ **Nguồn dữ liệu Briefing — ĐÃ CHỐT** (§7): email/lịch (`google-workspace`), server health (bọc các skill server-manage sẵn có), tasks/ngữ cảnh (cron/sessions/memory) qua cơ chế cron-artifact. CRM/deals để sau.
- ✅ **Reuse vs rebuild — ĐÃ CHỐT** (§3.3): hybrid — reuse runtime (chat/terminal/markdown/⌘K/theme/gateway), build mới shell + 16 màn + orb + hiệu ứng.
- **CRM/deals** — chưa có native; sẽ thêm (MCP HubSpot/Pipedrive hoặc store JSON) ở sub-project sau.
- **Hiệu năng hiệu ứng điện ảnh** (glass blur, canvas, orb) trong Electron — đặt budget & guard, tôn trọng `prefers-reduced-motion`.

## 11. Tham chiếu

- Mockups: `09-all-screens.html` (16 màn), `07-design-system-final.html`, `05-hypertek-brand.html`, `06-typography.html`, `11-animations.html`, `12-loki-timeline.html` (trong `.superpowers/brainstorm/21982-1782359469/content/`).
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`.
- Reference HUD đã chốt: `.superpowers/brainstorm/21982-1782359469/_ref_hud_dark.html`.
