# AETHER Desktop — SP-4 #0: Design Language + App Shell (Design Spec)

> Spec thiết kế · 2026-06-28 · trạng thái: chờ user review → writing-plans.
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.
> Đầu việc #0 trong tracker SP-4: [docs/specs/2026-06-28-aether-sp4-ui-overhaul.md](./2026-06-28-aether-sp4-ui-overhaul.md) §4.
> Nền móng kế thừa: SP-0 cinematic [docs/specs/2026-06-26-aether-sp0-design.md](./2026-06-26-aether-sp0-design.md).
> Mockup (visual companion, local — `.superpowers/brainstorm/`): `orb-presence.html`, `light-direction.html`, `orb-morphology.html`, `summon-lifecycle.html`, `constellation-light-vs-dark.html`, `shell-chrome.html`.

## 1. Bối cảnh & mục tiêu

SP-0..SP-3 đã đóng trọn 16 màn về **chức năng**, nhưng chất lượng **thị giác/trải nghiệm** chưa đạt và **thiếu đồng bộ** (mỗi màn dựng slice-by-slice → drift). #0 là đầu việc **đầu tiên & nền tảng** của SP-4: chốt **design language north-star** cho toàn app và overhaul **app shell** — khung mà 19 màn còn lại bám theo.

**Phê bình shell hiện tại (ground-truth, đã verify):**
- **Nav-rail** ([nav-rail.tsx](../../apps/desktop/src/aether/ui/shell/nav-rail.tsx), [nav-items.tsx](../../apps/desktop/src/aether/ui/shell/nav-items.tsx)): 12 icon **phẳng, không phân cấp**; icon SVG vẽ tay "lifted from mockup"; **thiếu 7 màn** (Settings/Artifacts/Messaging/Profiles/Onboarding… chỉ vào qua ⌘K/route).
- **Vi phạm token rule** (gốc của "thiếu đồng bộ"): badge "B" hardcode + màu `#06283c`, gradient inline ([nav-rail.tsx:37,80](../../apps/desktop/src/aether/ui/shell/nav-rail.tsx#L37), [top-bar.tsx:33](../../apps/desktop/src/aether/ui/shell/top-bar.tsx#L33)); **avatar lặp 2 chỗ** (nav 32px `h-8 w-8` ≠ top-bar 34px) dù có token `--ae-avatar`.
- **Top-bar nghèo** ([top-bar.tsx](../../apps/desktop/src/aether/ui/shell/top-bar.tsx)): chỉ title + clock + badge; không search/⌘K; `TITLES` chỉ map 3 route.
- **Connection nhị phân**: chấm 7px + overlay "Mất kết nối" ad-hoc ([aether-shell.tsx:86](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L86)); không có "đang thử lại/degraded".
- **Overlay chưa thành hệ thống**: `OVERLAY_VIEWS` khai báo trong [routes.ts](../../apps/desktop/src/app/routes.ts) nhưng shell render như route thường; chưa có overlay/modal host.
- **Page-transition thô**: chỉ remount theo key replay `.ae-depth-enter`.
- **`/command-center` stub chết** ([aether-shell.tsx:69](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L69) `StubScreen`); HUD thật ở `/hud`.

**Mục tiêu #0:** dựng **north-star văn bản** + **hệ token đồng bộ** + **shell chrome** + **living engine (all-WebGL) chạy demo** + dọn stub. Là nền/khung, **không** nhồi nội dung màn HUD/Chat.

## 2. Ràng buộc kế thừa (hard-rules — bất khả xâm phạm)

- **Brand `#07397d`** (deep navy) qua token `--ae-*`/`--dt-*`; **không hardcode màu** ngoài hệ token.
- **Localization:** UI tiếng Việt; **KHÔNG dịch "Agent" → "Đại lý"**; platform "HYPERTEK - AGENT PLATFORM".
- **Prompt-cache safety:** màn non-chat **không** subscribe `message.delta`/`reasoning.delta`/`thinking.*`/tool-call stream; ngoại lệ Voice + Chat. → engine trên màn khác chỉ dùng `$orbState`/`$gatewayState`.
- **Motion gate SP-0 + `prefers-reduced-motion`** ở mọi transition/overlay/orb.
- **Layering SP-0:** `.ae-screen-bare`; content wrapper sở hữu **một** gutter `--ae-page-*`; padding bake qua `GlassSlab size`; `--ae-*` geometry mode-independent; chỉ color tokens fork dưới `[data-aether-mode]`.
- **Giữ test xanh + tsc sạch** mỗi slice: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`.

## 3. North-star: "AETHER là một sinh thể sống"

Toàn app xoay quanh **một sinh thể sống** — Living Orb là nhân vật chính, *visualize bộ máy agentic*. Con vật tồn tại ở **3 mức zoom của cùng một thực thể**:

| Mức zoom | Ở đâu | Vai trò |
|---|---|---|
| **Glyph thu nhỏ** | nav-rail (mọi màn) | luôn thở; mang vital-state; = nút Trang chủ |
| **Chòm sao standby** | Trang chủ / HUD (`/hud`) | lõi giữa toả tia ra các đích/agent (roster) |
| **Summon overlay** | trên màn đang dùng (live task) | graph phù du mọc cho 1 task rồi tan |

**Mô hình hiện diện = "C · Triệu hồi":** bình thường con vật là glyph trong rail; khi có việc agentic, graph **nở bung thành overlay layer phủ lên bản mờ/blur của màn hiện tại** (giữ ngữ cảnh), mọc ra từ glyph rail; xong **co lại về glyph**.

**Hình thái (morphology):**
- **Orb chính** — hữu cơ/phát quang sinh học; **nhân = đám mây hạt** (particle nucleus); vầng halo; thở.
- **Sub-orb** — 1 per sub-agent; sinh ra bằng **phân bào/mitosis** (tách qua cầu lỏng rồi khép tròn); hue xanh ngọc để phân biệt.
- **Node** — 1 per tool-call/nguồn; = **nụ** phát sáng, mọc rồi bị tỉa.
- **Link** — **tua cong** (tree-growth) có data chạy dọc.

**Ngữ pháp chuyển động (6 verbs) — ánh xạ cây-agent thật:**
`thở (idle)` → `vươn nhánh (think/reach)` → `phân bào (spawn sub-orb)` → `node/flow (làm việc)` → `hút (inhale/absorb về lõi)` → `kết tinh (crystallize → bật modal kết quả)`.

**State chung toàn app (màu/kiểu):** `online` = **azure** · `đang làm` = **hổ phách (energy)** · `ngủ/offline` = **viền nét đứt**.

**Canvas: LIGHT mode.** DNA navy `#07397d` + azure + sub-orb xanh ngọc + hổ phách energy, trên nền kính trắng frosted. Dark fork giữ trong code (`[data-aether-mode='dark']`) nhưng **không polish đợt này** (revisit sau SP-4).

> Tham chiếu cảm hứng: ảnh hệ thống tương tự (lõi + particle nucleus + chòm sao agent + circuit-trace + góc brief ambient) — adopt **cấu trúc**, **không** adopt lõi vàng/nền tối (giữ navy/azure + light).

## 4. Nền tảng / tokens (lớp "đồng bộ")

Chữa gốc bệnh "thiếu đồng bộ" — viết thành north-star reference mà cả 19 màn bám.

- **Light là mode chuẩn** của `--ae-*`; dark fork bất động (không xoá, không polish).
- **Token bổ sung (gom near-duplicate, khai trong `aether.css` dưới `[data-aether-theme='aether']`):**

| Nhóm | Token (đề xuất) | Ghi chú |
|---|---|---|
| Typography | `--ae-text-*`, `--ae-tracking-*`, `--ae-leading-*` | diệt literal `text-[17px]`/`tracking-[.01em]` ở top-bar… |
| Energy accent | `--ae-energy` (hổ phách) | state "đang làm"; **tách khỏi** `--ae-warn` (semantic) |
| Node states | `--ae-state-online` (=azure), `--ae-state-busy` (=energy), `--ae-state-dormant` | dùng chung node/agent/vital |
| Sinh thể | `--ae-particle`, `--ae-halo`, `--ae-suborb` (xanh ngọc) | nhân hạt / halo / sub-orb |
| Motion | `--ae-mo-breathe/reach/mitosis/flow/inhale/crystallize` (duration+easing) | 6 verbs |

- **Iconography:** thay bộ SVG vẽ tay bằng **một bộ icon nhất quán** (stroke-width/size theo token), phủ đủ 19 đích nav.
- **Diệt hardcode:** gỡ `#06283c` + gradient inline ([nav-rail.tsx:37,80](../../apps/desktop/src/aether/ui/shell/nav-rail.tsx#L37), [top-bar.tsx:33](../../apps/desktop/src/aether/ui/shell/top-bar.tsx#L33)); **1 avatar** dùng `--ae-avatar`, derive initial từ profile (hết hardcode "B", hết lặp 2 chỗ).
- **Geometry:** giữ quy tắc SP-0 (TS `geometry.ts` là nguồn số chân lý, CSS mirror, test pin CSS==TS); token mới cũng pin.

## 5. App shell chrome

### 5.1 Nav-rail "A · nở" (expand-on-hover)
- Nghỉ **62px** icon-only → hover/ghim **nở ~172px** hiện **group header + nhãn**.
- **Nhóm:** **Lõi** (Trang chủ · Trò chuyện · Brief) · **Trụ cột** (Dev · Inbox·CRM · Content · Vận hành) · **Hệ agent** (Agents · Skills · Memory · Cron) · **Kênh** (Messaging · Artifacts · Voice) · **System** (Profiles · Settings).
- **Glyph orb = nút Trang chủ** (collapsed-orb sống, vital-state). Badge số (vd Inbox "3") + chấm hổ phách "đang làm".
- Giữ **drag-region** + `--ae-titlebar-inset` + nav indicator/geometry của SP-0.

### 5.2 Top-bar
- Tiêu đề/breadcrumb (map đủ route, hết fallback 'AETHER').
- **Thanh ⌘K thật** — nối `openCommandPalette` ([store/command-palette](../../apps/desktop/src/store/command-palette.ts), `CommandPalette` đã có).
- **Vital-sign** (sparkline ECG): azure=trực tuyến · hổ phách nhanh=đang thử lại · phẳng đỏ=mất kết nối — **thay** chấm 7px **và** overlay "Mất kết nối" ad-hoc.
- **1 avatar** duy nhất.

### 5.3 Overlay/modal host (primitive mới)
- Host cấp-shell cho **summon overlay**, **result modal**, **connection/vital overlay**.
- Đồng bộ lại `OVERLAY_VIEWS` ([routes.ts](../../apps/desktop/src/app/routes.ts)) với cách render thật (hết mismatch khai-báo-vs-render).

### 5.4 Page-transition
- Giữ `.ae-depth-enter` nhưng tinh chỉnh theo ngôn ngữ sống; tôn trọng reduced-motion + motion gate SP-0.

### 5.5 Cleanup `/command-center`
- Gỡ `<Route … StubScreen>` ([aether-shell.tsx:69](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L69)) + const `COMMAND_CENTER_ROUTE` + bỏ `command-center` khỏi `OVERLAY_VIEWS` ([routes.ts](../../apps/desktop/src/app/routes.ts)); xoá file [stub-screen.tsx](../../apps/desktop/src/aether/ui/screens/stub-screen.tsx) nếu không dùng nơi khác. `/hud` là HUD thật.

## 6. Living engine (all-WebGL / R3F)

**Quyết định:** render orb + graph **toàn bộ trong Three.js** (R3F), tận dụng nền GLSL SP-0 — hướng "sống" nhất.

- **Kiến trúc tách đôi (bắt buộc để test + wire data):**
  - **(a) Lõi logic thuần** — `GraphSpec` model (orbs/nodes/links/states) + layout (constellation radial, summon) + **state machine 6-verb lifecycle**. **Test trong jsdom**.
  - **(b) View R3F mỏng** — đọc lõi logic, render. Guard-test (mount/unmount/dispose/frameloop).
- **Mở rộng shared `<AetherCanvas>` SP-0** ([aether-canvas.tsx](../../apps/desktop/src/aether/ui/motion/aether-canvas.tsx)); **không** thêm Canvas mới.
- **Render trong GL:** orb (organic + particle nucleus + glow), sub-orb (mitosis), node (bud), link (tendril + flow), constellation, summon overlay.
- **Nhãn text:** `troika-three-text` (SDF) để chữ sắc trong GL — **thêm dep** (`troika-three-text`); pin React/three theo dedupe SP-0.
- **Data contract:** engine ăn `GraphSpec`. **#0 chạy bằng data scripted/demo** + **route playground** (review được). **#3 Chat** mới feed event agent/tool **thật** vào cùng model (data-driven → prompt-cache safe).
- **⚠️ Fallback bắt buộc (hard-rule SP-0):** `reduced-motion` **HOẶC** GPU-off (`getRemoteDisplayReason()`) **HOẶC** webgl-probe fail → **không mount Canvas**, rớt về **bản tĩnh CSS/SVG** của orb + constellation. → all-WebGL = đường chính, **vẫn phải** kèm đường fallback.
- **a11y:** nav-rail (DOM) là nav chuẩn-truy-cập; constellation WebGL chỉ là enhancement (click qua raycast; keyboard dùng rail).
- **Perf (giữ budget SP-0):** instancing cho node, line-geometry cho link, points cho particle; `frameloop="demand"` + `invalidate()`; dispose khi unmount; DPR cap; pause khi `document.hidden`.
- **Orb-state:** dùng `$orbState`/`motion-store` ([domain/motion/motion-store.ts](../../apps/desktop/src/aether/domain/motion/motion-store.ts)); bổ sung state cho graph lifecycle (chỉ live data thật ở Chat/Voice).

## 7. Ranh giới scope

**#0 GIAO (Definition of Done):**
1. North-star văn bản (§3) + hệ token/typography/icon/motion (§4).
2. Shell chrome đầy đủ (§5): rail nở có nhóm, top-bar + ⌘K + vital-sign, overlay/modal host, 1 avatar.
3. Living engine all-WebGL (§6) + **fallback tĩnh** + **route playground** chạy demo scripted (constellation standby + vòng đời 6-verb cảnh "HSG").
4. **Glyph orb sống trong rail** (collapsed-orb, vital-state) = hiện diện shipped đầu tiên.
5. Cleanup `/command-center` (§5.5).

**#0 KHÔNG làm (để màn sau, tránh phình):**
- **HUD constellation thật** (đích/state thật + góc brief ambient) = **màn #2** (dùng lại engine #0).
- **Summon overlay wiring vào agent/tool thật** = **màn #3 Chat** (prompt-cache: chỉ Chat/Voice subscribe stream).
- Restyle nội dung từng màn = đầu việc #1–#19 tương ứng.
- Polish dark mode; multi-tenant/billing.

## 8. Cấu trúc file

**Sửa:**
```
apps/desktop/src/aether/ui/theme/aether.css           + typography/energy/node-state/sinh-thể/motion tokens; light là mode chuẩn
apps/desktop/src/aether/ui/theme/tokens.ts            mirror token mới
apps/desktop/src/aether/ui/theme/geometry.ts          (+ geometry mới nếu cần; giữ pin CSS==TS)
apps/desktop/src/aether/ui/shell/aether-shell.tsx     overlay/modal host; gỡ command-center; vital overlay thay paused ad-hoc
apps/desktop/src/aether/ui/shell/nav-rail.tsx         rail nở (62↔172), nhóm, glyph-orb home, badge/dot, gỡ hardcode
apps/desktop/src/aether/ui/shell/nav-items.tsx        19 đích + nhóm + bộ icon mới
apps/desktop/src/aether/ui/shell/top-bar.tsx          ⌘K search; vital-sign; 1 avatar; title map đủ; typography token
apps/desktop/src/aether/ui/shell/page-transition.tsx  tinh chỉnh theo ngôn ngữ sống
apps/desktop/src/aether/ui/motion/aether-canvas.tsx   host engine orb+graph (mở rộng, không thêm Canvas)
apps/desktop/src/app/routes.ts                        gỡ COMMAND_CENTER_ROUTE + khỏi OVERLAY_VIEWS
apps/desktop/DESIGN.md                                 ghi north-star sinh-thể + token mới + bridge points
apps/desktop/package.json                             + troika-three-text (pin theo dedupe SP-0)
```

**Tạo mới:**
```
apps/desktop/src/aether/ui/components/icon/*            bộ icon nhất quán
apps/desktop/src/aether/ui/components/avatar.tsx        avatar token-hoá, derive initial
apps/desktop/src/aether/ui/components/vital-sign.tsx    sparkline ECG 3 trạng thái
apps/desktop/src/aether/ui/shell/overlay-host.tsx       overlay/modal host primitive
apps/desktop/src/aether/domain/engine/graph-model.ts    GraphSpec + types (logic thuần)
apps/desktop/src/aether/domain/engine/layout.ts         constellation/summon layout (logic thuần)
apps/desktop/src/aether/domain/engine/lifecycle.ts      state machine 6-verb (logic thuần)
apps/desktop/src/aether/domain/engine/demo-script.ts    data scripted (cảnh HSG)
apps/desktop/src/aether/ui/motion/graph/*.tsx           R3F views: orb/sub-orb/node/link/constellation/summon
apps/desktop/src/aether/ui/motion/graph/fallback.tsx    bản tĩnh CSS/SVG (GPU-off/reduced-motion)
apps/desktop/src/aether/ui/motion/graph/labels.tsx      troika-three-text labels
apps/desktop/src/aether/ui/screens/playground-screen.tsx route dev exercise engine
+ test kề bên mỗi module
```

## 9. Testing

- **Gate mỗi slice:** `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit` xanh.
- **Unit (jsdom):**
  - State machine + lifecycle 6-verb (transition đúng theo event scripted).
  - Layout constellation/summon (toạ độ node ổn định, không chồng).
  - Token/geometry pins (CSS==TS cho token mới).
  - Shell chrome: nav grouping đủ 19 đích; rail nở 62↔172; vital-sign 3 trạng thái đúng `$gatewayState`; **1 avatar** (assert không còn 2 badge); title map đủ.
  - Cleanup: `/command-center` → redirect (không còn StubScreen).
  - Fallback gate: reduced-motion/GPU-off/probe-fail → **không** mount Canvas, có DOM fallback.
- **Guard (WebGL, jsdom không chạy GL):** mount/unmount/dispose; frameloop demand; troika text mount.
- **Thủ công (máy thật):** light đẹp; playground chạy đủ 6-verb; remote-display → fallback (không Canvas trắng); macOS traffic-light không đè glyph (regression SP-0).
- Mỗi bước TDD: đỏ → code → xanh → commit.

## 10. Rủi ro & giảm thiểu

- **All-WebGL ⇒ phải build 2 đường (GL + fallback)** → chấp nhận; lõi logic thuần dùng chung cho cả 2 đường, chỉ khác lớp render.
- **GPU-off/remote display** → gate `getRemoteDisplayReason()` + webgl-probe; fallback tĩnh (lỗ hổng lớn nhất nếu bỏ sót).
- **Text trong GL** → `troika-three-text` SDF; guard-test mount; pin deps theo dedupe SP-0.
- **a11y của canvas** → rail DOM là nav chuẩn; constellation chỉ enhancement.
- **Perf nhiều node/link/particle** → instancing + line-geometry + points + demand loop + dispose; budget FPS SP-0.
- **Scope creep (HUD/Chat)** → ranh giới §7 cứng; #0 chỉ engine + playground.
- **Drift token** → test pin CSS==TS; DESIGN.md ghi north-star.

## 11. Tham chiếu

- Tracker SP-4: [docs/specs/2026-06-28-aether-sp4-ui-overhaul.md](./2026-06-28-aether-sp4-ui-overhaul.md).
- SP-0 (token geometry, WebGL gate, fallback, layering): [docs/specs/2026-06-26-aether-sp0-design.md](./2026-06-26-aether-sp0-design.md).
- DESIGN.md (house rules token/primitive): [apps/desktop/DESIGN.md](../../apps/desktop/DESIGN.md).
- Mockup companion (local): `.superpowers/brainstorm/20726-1782640546/content/*.html`.
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`, `aether-sp4-ui-overhaul`.
```
