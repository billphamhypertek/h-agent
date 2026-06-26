# AETHER Desktop — SP-0: Ổn định & Nền móng Cinematic (Design Spec)

> Spec thiết kế · 2026-06-26 · trạng thái: chờ user review → writing-plans.
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.
> Spec chương trình (tầm nhìn 16 màn): [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md).
> Plan first-slice đã thực thi: [docs/plans/2026-06-25-aether-desktop-foundation.md](../plans/2026-06-25-aether-desktop-foundation.md).
> Spec này đã qua 1 vòng recon ground-truth + 1 vòng review phản biện đa-agent (kết quả nhúng trong §4–§5).

## 1. Bối cảnh

Bản redesign AETHER mới ship **"lát đầu tiên"** (Boot · HUD · Chat · Brief) và đã được đặt làm renderer mặc định (commit `9934396cd`). Vấn đề người dùng báo:

1. **Trông như "vỏ" rỗng** — 4/16 màn chạy thật; 9 màn còn lại là `StubScreen` ("Sắp ra mắt") ở [aether-shell.tsx:46-54](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L46-L54), + Command Palette (⌘K) chưa nối dây ([aether-shell.tsx:44](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L44) — `onCommandPalette` no-op).
2. **Traffic-light macOS đè logo app.**
3. **Padding/margin "thò ra thụt vào"** — bố cục lệch.

Spec này **chỉ** giải quyết SP-0 (ổn định 4 màn hiện có + dựng nền móng để xây 12 màn còn lại). 12 màn là SP-1/2/3, mỗi cái có spec→plan riêng.

## 2. Quyết định đã khóa (toàn chương trình)

Chốt với chủ sở hữu ngày 2026-06-26:

| Trục | Quyết định |
| --- | --- |
| Phạm vi tổng | Dựng lại **toàn bộ 16 màn** native cinematic AETHER (không tái dùng UI màn cũ) |
| Runtime lõi | **Giữ nguyên động cơ đã tôi luyện** (message streaming, tool-call cards, terminal xterm, gateway WS, ⌘K cmdk) — chỉ restyle qua token/className |
| Motion | **WebGL/shader ngay** đợt này, **tự build** `@react-three/fiber` + GLSL (sở hữu IP, an toàn license bán lại — KHÔNG mua Layers) |
| Thứ tự | **SP-0** (spec này) → **SP-1 daily-driver** (Settings → ⌘K → Agents → Skills → Cron → Profiles/Memory/Artifacts/Messaging) → **SP-2 4 trụ cột** → **SP-3 Voice + Onboarding** |

> ⚠️ **OVERRIDE đã ghi nhận:** quyết định "WebGL ngay trong SP-0" **OVERRIDE** program-spec [§4.6](./2026-06-25-aether-desktop-design.md) & §10 (vốn khóa ambient motion là "KHÔNG thuộc lát đầu", đẩy sang sub-project "motion/cinematic" *sau* foundation, và để mở build-vs-buy). Chủ sở hữu nay chốt: **build WebGL tự làm, ngay**. Khi merge SP-0, back-annotate §4.6/§10 program-spec trỏ tới override này.

Kế thừa bất khả xâm phạm: **prompt-cache safety** (HUD/Brief không subscribe `message.delta`, không poll hội thoại), **brand color** `#07397d`, **localization** (UI tiếng Việt; KHÔNG dịch "Agent"→"Đại lý"; platform = "HYPERTEK - AGENT PLATFORM"), **không hardcode màu ngoài hệ token**.

## 3. Mục tiêu & Phi-mục-tiêu (SP-0)

**Mục tiêu:**
- Hết hẳn lỗi traffic-light đè logo trên macOS (kể cả fullscreen), né overlay phải trên Windows/Linux.
- Dựng **tầng token hình học `--ae-*`** (radius/spacing/size/nav/avatar/orb) làm nguồn chân lý → diệt "thò ra thụt vào".
- 4 màn Boot/HUD/Chat/Brief canh chỉnh chuẩn, nhất quán gutter & padding.
- Nền móng **WebGL (R3F + GLSL)**: 1 Canvas chia sẻ, Living Orb + ambient background, **gate đa lớp** (reduced-motion **và** GPU availability **và** visibility/idle) + fallback CSS — sẵn sàng cho mọi màn SP-1/2/3.

**Phi-mục-tiêu (KHÔNG làm ở SP-0):**
- 9 màn stub (Settings, Agents, Skills, Cron, Memory, Messaging, Profiles, Artifacts) + Command Palette ⌘K đầy đủ — thuộc SP-1. Ở SP-0, **chip ⌘K được đánh dấu inert** (tooltip "sắp ra mắt" / disabled), KHÔNG ship "dead chrome" trông như nối dây nhưng bấm không ra gì.
- 4 trụ cột kinh doanh, Voice (orb `listening`), Onboarding — SP-2/3.
- Mua/đánh giá Layers. Multi-tenant/billing/auth.

## 4. SP-0a — Cầm máu

### 4.1 Sửa traffic-light đè logo *(landing kèm token đầu tiên của §4.2 — không hardcode rồi token hóa lại)*

**Sự thật (đã verify):**
- `titleBarStyle: 'hidden'` + `trafficLightPosition: {x:24, y:10}` + `titleBarOverlay: {height:34}` ([main.cjs:5391-5393](../../apps/desktop/electron/main.cjs#L5391-L5393), [main.cjs:506-526](../../apps/desktop/electron/main.cjs#L506-L526)).
- Hằng số: `TITLEBAR_HEIGHT=34`, `WINDOW_BUTTON_POSITION={x:24, y:10}`, `NATIVE_OVERLAY_BUTTON_WIDTH=144` ([main.cjs:379-392](../../apps/desktop/electron/main.cjs#L379-L392)). Helper renderer: [titlebar.ts](../../apps/desktop/src/app/shell/titlebar.ts) (`TITLEBAR_HEIGHT`, `TITLEBAR_CONTROL_OFFSET_X=74`, `titlebarControlsPosition()`).
- Traffic-light dọc `y:10→24` (nằm trong dải 34px trên), ngang `x:24→~76`. Nav rail AETHER rộng **62px**, brand glyph sát đỉnh → 3 nút macOS rơi lên glyph. Shell cũ né bằng `titlebarContentInset = leftEdgePaneOpen ? 0 : titlebarControls.left + TITLEBAR_HEIGHT + round(TITLEBAR_HEIGHT/2)` = **149px** trên macOS ([app-shell.tsx:106-111](../../apps/desktop/src/app/shell/app-shell.tsx#L106-L111)) + vùng kéo `[-webkit-app-region:drag]` ([app-shell.tsx:178-182](../../apps/desktop/src/app/shell/app-shell.tsx#L178-L182)). Shell AETHER **không có gì** ([aether-shell.tsx:35-37](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L35-L37)).
- **Đã kiểm hình học:** với layout nav-rail của AETHER (rail là phần tử trái nhất), chỉ cần `padding-top = TITLEBAR_HEIGHT (34px)` lên rail là brand glyph bắt đầu ở `y=34`, **dưới** band traffic-light (`y:10→24`) → thoát theo chiều dọc. Phần cluster tràn ngang 14px qua mép rail rơi vào band trống/kéo được — vô hại. (Đây là lý do AETHER dùng 34px chứ không phải 149px của shell cũ vốn cho layout có titlebar-header chứa control.)

**Thiết kế sửa:**
- Token `--ae-titlebar-inset` (token **đầu tiên** của tầng §4.2). Hook `useTitlebarInset()` (mới):
  - **mac-ness** = `connection.windowButtonPosition != null` (KHÔNG có field `IS_MAC` trên `connection`; `getWindowButtonPosition()` trả null khi `!IS_MAC` — [main.cjs:3576-3585](../../apps/desktop/electron/main.cjs#L3576). Nếu cần `IS_MAC` tường minh, import từ [`@/lib/keybinds/combo`](../../apps/desktop/src/lib/keybinds/combo.ts), KHÔNG đọc từ `connection`).
  - **fullscreen** = `connection.isFullscreen` (macOS fullscreen ẩn traffic-light nhưng `windowButtonPosition` **vẫn non-null**) + fallback viewport như shell cũ ([app-shell.tsx:51-83](../../apps/desktop/src/app/shell/app-shell.tsx#L51-L83)).
  - **Subscribe `window.aetherDesktop.onWindowStateChanged`** để inset re-derive khi vào/ra fullscreen runtime (không đọc one-shot từ `$connection`).
  - `--ae-titlebar-inset` = `(windowButtonPosition != null && !isFullscreen) ? TITLEBAR_HEIGHT : 0`. Giá trị số `TITLEBAR_HEIGHT` **import từ titlebar.ts** (bridge-pin, không tự gõ lại 34 — xem §4.2 quy tắc bridge).
- Áp `--ae-titlebar-inset` làm **`padding-top` của nav rail**. Band 34px trên cùng (rail + top bar) đặt `[-webkit-app-region:drag]`; control tương tác (nav button, avatar, clock) đặt `[-webkit-app-region:no-drag]`.
- **Windows/Linux:** top bar chừa `padding-right` = `connection.nativeOverlayWidth` (đã có trên `AetherConnection`, mặc định khớp `NATIVE_OVERLAY_BUTTON_WIDTH=144`) để cụm phải không chui dưới nút native.

### 4.2 Tầng token hình học `--ae-*`

**Gốc rễ "thò ra thụt vào":** [aether.css](../../apps/desktop/src/aether/ui/theme/aether.css) chỉ có token màu/font + **đúng 2 token hình học ad-hoc** (`--ae-orb-size` [:103], `--ae-nav-item-h` [:170]); **không có thang hình học hệ thống**. 53 literal padding/radius/size/gap rải rác, mâu thuẫn. Vi phạm [DESIGN.md](../../apps/desktop/DESIGN.md) Nguyên tắc 4 ("tokens, not literals") & 5 ("style sống trong primitive; call-site truyền variant/size").

**Thang token (gom near-duplicate), khai báo trong `aether.css` dưới `[data-aether-theme='aether']`:**

| Nhóm | Token | Giá trị | Thay cho |
| --- | --- | --- | --- |
| Radius | `--ae-radius-xs` | 6px | boot check tile / `.ae-gauge` / `.ae-bar` / `.ae-nav-edge` |
| | `--ae-radius-sm` | 9px | kbd chip |
| | `--ae-radius-md` | 11px | nav item / `.ae-nav-indicator` / mic / priority row / rail glyph(10) |
| | `--ae-radius-lg` | 14px | `.ae-slab`(16) / `.ae-cmd`(15) / brief play btn(13) |
| | `--ae-radius-full` | 9999px | mọi `rounded-full` |
| Gutter trang | `--ae-page-x/t/b` | 22/16/18 px | shell gutter + screen self-pad |
| Gutter cột | `--ae-gap-col` / `--ae-gap-grid` | 13px / 18px | left sub-column ×4 vs main grid (18px) — **tách 2 token, không gộp nhầm** |
| Slab padding | `--ae-slab-pad-sm/md/lg` | `10px 13px` / `13px 15px` / `16px 18px` | bake **vào** `.ae-slab` qua `size` prop của `GlassSlab` |
| Avatar/Control | `--ae-avatar` / `--ae-control` | 34px / 38px | nav(32)/top-bar(34)→34; mic(38)→control |
| Nav geometry | `--ae-nav-w/item/gap` | 62/38/5 px | `ITEM_H`/`GAP` JS + `--ae-nav-item-h` CSS + `h-[38px]` đọc **chung** |
| Orb | `--ae-orb-sm/md/lg` | 42/170/300 px | magic `size={42/170/300}` |
| Spacing | `--ae-space-1..6` | 4/6/8/11/13/18 px | **chỉ** các arbitrary `gap-[N]`/`p-[N]` |
| Typography | `--ae-text-*`/`--ae-tracking-*`/`--ae-leading-*` | (thang từ cluster) | literal `text-[Npx]`/`tracking-[…em]`/`leading-[…]` |
| Hairline | `--ae-hairline` | `1px var(--ae-line)` | border inline rải rác |

**Quy tắc thực thi (đã chỉnh theo review):**
- **Bake padding/radius mặc định VÀO primitive.** `GlassSlab` nhận `size?: 'sm'|'md'|'lg'` → `--ae-slab-pad-*`; `.ae-slab` có default (md). `.ae-cmd` tương tự.
- **Migration ATOMIC per-primitive (chống double-pad):** vì `GlassSlab` truyền padding qua `className p-[...]` ở **mọi** call-site, bake-vào-primitive và **gỡ tất cả `p-[...]` call-site phải cùng 1 commit**. Enumerate đầy đủ call-site: command-center ×8 ([:31,36,39,47,70,77,85,90](../../apps/desktop/src/aether/ui/screens/command-center.tsx#L31)), morning-brief ×3 ([:82,115,137](../../apps/desktop/src/aether/ui/screens/morning-brief.tsx#L82)), stub-screen ([:5](../../apps/desktop/src/aether/ui/screens/stub-screen.tsx#L5)), boot-sequence error ([:64](../../apps/desktop/src/aether/ui/screens/boot-sequence.tsx#L64)), aether-shell paused overlay ([:62](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L62)).
- **Nav single-source:** TS const trong `geometry.ts` là **nguồn số chân lý** (hardcoded constants, KHÔNG `getComputedStyle` — jsdom rỗng + token bị gate theo skin). CSS `--ae-nav-*` mirror; test pin "CSS == TS".
- **Bridge-pin các giá trị cross-source (giải mối lo "two sources" của DESIGN.md):** `--ae-titlebar-inset` lấy số từ [titlebar.ts](../../apps/desktop/src/app/shell/titlebar.ts) `TITLEBAR_HEIGHT`; `--ae-page-*` đối chiếu [layout-constants.ts](../../apps/desktop/src/app/layout-constants.ts) `PAGE_INSET_X`; `--ae-nav-w` ↔ `main.cjs`. Đây là **những** giá trị cross-source duy nhất, **test pin** để không drift.
- **Ranh giới migration:** chỉ token hóa **arbitrary `[...]` values**; Tailwind shorthand mặc định (`mt-3`, `gap-1.5`, `py-3.5`…) được phép giữ (là thang Tailwind chuẩn) — ghi rõ để không mơ hồ "nguồn chân lý".
- **Mode:** `--ae-*` hình học **mode-independent**; chỉ token **màu** fork dưới `[data-aether-mode='light']`. Không có geometry override cho light.
- **Tiền đề resolve:** `--ae-*` chỉ resolve khi skin `aether` active (`[data-aether-theme='aether']` set bởi [themes/context.tsx](../../apps/desktop/src/themes/context.tsx)) — AETHER renderer đã mặc định skin này.
- Ghi DESIGN.md: `aether/` là **subtree cinematic biệt lập được phê chuẩn** với thang `--ae-*` riêng (không vi phạm "one source per concern"); bridge points test-pinned như trên.

### 4.3 Sở hữu nền & gutter (giải mâu thuẫn layering) + polish 4 màn

**Vấn đề review bắt:** "shell sở hữu gutter" + "screen edge-to-edge" bất khả thi vì mỗi screen root mang `.ae-screen` = nền **opaque** navy + `overflow:hidden; isolation:isolate` ([aether.css:26-35](../../apps/desktop/src/aether/ui/theme/aether.css#L26-L35)) → Canvas chia sẻ sau screen sẽ bị **che + cắt**.

**Giải (chốt mô hình layering):**
- **Shell root sở hữu nền cinematic full-bleed** (CSS gradient hoặc WebGL Canvas), trải toàn cửa sổ **sau** nav rail + content. `<AetherCanvas>`/nền đặt `position:absolute inset-0 z-0`.
- **Content wrapper** (phải nav rail) sở hữu **một** gutter `--ae-page-*`. **Screen roots trong suốt** (bỏ nền opaque `.ae-screen`; dùng biến thể `.ae-screen-bare` không nền/không clip ở root), **không self-pad**. Cụm từ "edge-to-edge" thay bằng: *screen lấp đầy content area đã pad; nền cinematic mới là phần bleed toàn cửa sổ.*
- **Z-order:** shell root → `z0` Canvas/CSS background (full-bleed) → `z1` nav rail + content (topbar + screen, nền trong suốt). Boot là overlay pre-shell ([aether-shell.tsx:29](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx#L29)) — giữ nền riêng.
- Gỡ self-pad ở [command-center.tsx:23](../../apps/desktop/src/aether/ui/screens/command-center.tsx#L23) (`p-[18px_22px]`) và [morning-brief.tsx:19](../../apps/desktop/src/aether/ui/screens/morning-brief.tsx#L19) (`p-[16px_22px_18px]` — double-pad).
- Polish: `min-w-0` các flex/grid track chống tràn; thống nhất gutter cột = `--ae-gap-col`/`--ae-gap-grid`; canh command bar.

## 5. SP-0b — Nền móng WebGL (R3F + GLSL tự build)

**Sự thật (đã verify, citation đã sửa):**
- `three`/`@react-three/fiber`/`drei` **CHƯA có** trong [package.json](../../apps/desktop/package.json) (lưu ý `leva@^0.10.1` — debug GUI của pmndrs — đã có, nên hệ R3F đã có chỗ bám). React **^19.2.5**.
- **webPreferences cửa sổ chính** (KHÔNG phải OAuth window ở main.cjs:4162) đến từ `chatWindowWebPreferences()` ([session-windows.cjs:24-34](../../apps/desktop/electron/session-windows.cjs#L24-L34)) dùng tại [main.cjs:5405](../../apps/desktop/electron/main.cjs#L5405)/5612: `{ contextIsolation:true, sandbox:true, nodeIntegration:false, webviewTag:true, backgroundThrottling:false, devTools:true }` (`webSecurity` mặc định true). WebGL **không bị chặn**.
- **Không có CSP** ([index.html](../../apps/desktop/index.html) lẫn session header) → shader nội tuyến OK. Three.js không dùng `eval`.
- Vite single-chunk (rolldown `codeSplitting:false`, `chunkSizeWarningLimit:25000`) + `dedupe:['react','react-dom']` ([vite.config.ts](../../apps/desktop/vite.config.ts)).
- ⚠️ **GPU bị TẮT trên remote display:** `detectRemoteDisplay()` (SSH/X11/VNC/RDP) hoặc env `AETHER_DESKTOP_DISABLE_GPU` → `app.disableHardwareAcceleration()` + `disable-gpu-compositing` ([main.cjs:163-171](../../apps/desktop/electron/main.cjs#L163-L171)); IPC `aether:get-remote-display-reason` ([main.cjs:3608](../../apps/desktop/electron/main.cjs#L3608)) + bridge `getRemoteDisplayReason()`. WebGL khi đó rớt SwiftShader/lỗi → **phải có fallback theo GPU, không chỉ reduced-motion**.

| Hạng mục | Quyết định |
| --- | --- |
| **Deps thêm** | `three`, `@react-three/fiber@^9`, `@types/three` (dev). Bloom **trong-shader** (không `postprocessing`). |
| **Pin React (chống vỡ peer R3F v9)** | R3F v9 peer `react >=19 <19.3`; repo `^19.2.5` trôi lên 19.3+ → **pin `react`/`react-dom` về `>=19.2.5 <19.3`** (hoặc exact 19.2.x) trước khi thêm R3F. Thêm `three` vào `dedupe` cạnh react. |
| **Gate motion (đa lớp, cứng)** | `motionEnabled = prefers-reduced-motion:no-preference` **AND** `!getRemoteDisplayReason()` **AND** WebGL context probe OK. Hook `use-motion-enabled.ts`. **False → KHÔNG mount Canvas**, fallback orb CSS/`.ae-bloom`. |
| **Kiến trúc** | **1 `<Canvas>` chia sẻ** mount ở **shell root** (§4.3 `z0` full-bleed). Living Orb = mesh + GLSL; ambient = full-screen shader plane (navy/azure). |
| **Perf guards runtime** | `frameloop="demand"` + `invalidate()`; `dpr={[1,1.75]}`; **pause khi `document.hidden`/idle** — *bắt buộc tự lái vì `backgroundThrottling:false` không tự throttle*; FPS cap; **dispose GL khi unmount**; 1 canvas, KHÔNG per-screen. |
| **Wiring orb-state** (bảng map, mới) | xem dưới |
| **Shader source** | template-string trong `.ts` (không `vite-plugin-glsl`). |
| **React instance** | R3F dùng đúng React qua `dedupe`; smoke test chống double-React. |

**Bảng map orb-state (giải "wiring chưa định nghĩa"):** `motion-store.ts` derive `$orbState` từ store runtime sẵn có; per-call-site `state=` literal **bị thay** bằng subscribe `$orbState` (trừ Boot dùng boot-store riêng).

| Orb state | Nguồn | Trong SP-0? |
| --- | --- | --- |
| `thinking` | `$busy === true` ([store/session.ts:219](../../apps/desktop/src/store/session.ts#L219)) | ✅ |
| `idle` | `$gatewayState==='online'` ([session.ts:173](../../apps/desktop/src/store/session.ts#L173)) & `!$busy` | ✅ |
| `paused/offline` (dim) | `$gatewayState !== 'online'` | ✅ |
| `listening` | voice — **không set ở SP-0** (SP-3) | ❌ |

## 6. Cấu trúc file

**Sửa:**
```
apps/desktop/src/aether/ui/theme/aether.css          + tầng token --ae-* hình học/typography; .ae-screen-bare (nền trong suốt); bake padding vào .ae-slab/.ae-cmd
apps/desktop/src/aether/ui/shell/aether-shell.tsx    nền cinematic + Canvas ở shell root (z0); content wrapper sở hữu 1 gutter; screen trong suốt; áp --ae-titlebar-inset
apps/desktop/src/aether/ui/shell/nav-rail.tsx        đọc geometry token; padding-top inset; drag region; gap 5px nhất quán
apps/desktop/src/aether/ui/shell/top-bar.tsx         avatar token; right-pad = nativeOverlayWidth (win/linux); no-drag controls
apps/desktop/src/aether/ui/shell/nav-items.tsx       geometry sang token (lưu ý .tsx, KHÔNG .ts)
apps/desktop/src/aether/ui/shell/use-nav-indicator.ts  (giữ pure) — nhận const từ geometry.ts
apps/desktop/src/aether/ui/components/command-bar.tsx  control/kbd token; chip ⌘K đánh dấu inert
apps/desktop/src/aether/ui/components/glass-slab.tsx   + size?: 'sm'|'md'|'lg' → --ae-slab-pad-*
apps/desktop/src/aether/ui/orb/living-orb.tsx        nhận orb size token; subscribe $orbState; hợp tác WebGL layer
apps/desktop/src/aether/ui/screens/*.tsx             gỡ self-pad + p-[...] call-site; .ae-screen-bare; min-w-0
apps/desktop/DESIGN.md                               ghi nhận thang --ae-* + bridge points
apps/desktop/package.json                            + three, @react-three/fiber, @types/three; pin react/react-dom <19.3
apps/desktop/vite.config.ts                          + 'three' vào dedupe
```

**Tạo mới:**
```
apps/desktop/src/aether/ui/theme/geometry.ts             TS const chân lý (nav/avatar/orb/titlebar bridge); test CSS==TS
apps/desktop/src/aether/ui/shell/use-titlebar-inset.ts   windowButtonPosition + isFullscreen + onWindowStateChanged → inset
apps/desktop/src/aether/ui/motion/aether-canvas.tsx      <Canvas> chia sẻ (shell root) + frameloop demand + guards + dispose
apps/desktop/src/aether/ui/motion/living-orb-gl.tsx      orb mesh + GLSL
apps/desktop/src/aether/ui/motion/ambient-field.tsx      nền fluid shader plane
apps/desktop/src/aether/ui/motion/shaders/*.ts           GLSL template-strings
apps/desktop/src/aether/ui/motion/use-motion-enabled.ts  reduced-motion AND !remoteDisplay AND webgl-probe → mount/không
apps/desktop/src/aether/domain/motion/motion-store.ts    $orbState (derive từ $busy/$gatewayState), $motionActive
+ test kề bên mỗi module
```

## 7. Testing

- **Unit (vitest + jsdom):**
  - `useTitlebarInset`/NavRail: `padding-top == 34px` khi `windowButtonPosition!=null && !isFullscreen`; `0` khi `windowButtonPosition==null`; **`0` khi fullscreen-với-position-non-null** (đúng case regression); cập nhật khi `onWindowStateChanged` bắn.
  - `geometry.ts` mirror khớp giá trị CSS (`CSS == TS`).
  - `use-motion-enabled`: reduced-motion / remote-display / webgl-probe fail → `false` (không mount Canvas).
  - `motion-store`: `$busy/$gatewayState` → `$orbState` đúng bảng map.
  - **Double-pad (shell-level, KHÔNG render màn đơn lẻ):** mount screen **bên trong** shell wrapper → assert screen root không còn `p-[...]` **và** chỉ 1 gutter trên content wrapper. (Test màn đơn lẻ hiện tại không bắt được double-pad.)
- **WebGL:** jsdom không chạy GL → test logic guard (mount/unmount/dispose gọi đúng, frameloop demand, gate đa lớp), không test pixel.
- **Visual/thủ công (máy thật):** macOS traffic-light KHÔNG đè glyph (window + fullscreen); remote-display → fallback CSS orb (không Canvas trắng); 4 màn canh đều.
- **E2E:** tái dùng harness `scripts/test-desktop.mjs` + `electron/*.test.cjs`.
- Mỗi bước TDD: đỏ → code → xanh → commit.

## 8. Thứ tự thực thi (đã chỉnh chống double-edit)

1. **§4.1 traffic-light** — landing kèm `geometry.ts` + token `--ae-titlebar-inset`/`--ae-nav-*` (token-driven ngay từ đầu, không hardcode rồi sửa lại). Test inset.
2. **§4.2 tầng token còn lại** + bake `.ae-slab`/`.ae-cmd` (atomic per-primitive với gỡ call-site).
3. **§4.3 layering + polish 4 màn** (nền lên shell root, screen trong suốt, gỡ self-pad, min-w-0).
4. **§5 nền WebGL** (deps + pin react + Canvas + orb GL + ambient + gate + guards).

Cầm máu (1–3) **không phụ thuộc** WebGL → app hết "lỗi nhìn thấy" trước khi (4) xong.

## 9. Rủi ro & giảm thiểu

- **GPU off (remote display)** → gate `getRemoteDisplayReason()` + webgl-probe; fallback CSS orb. *(Đây là lỗ hổng lớn nhất nếu bỏ sót.)*
- **Peer R3F v9 vỡ khi React trôi 19.3+** → pin `<19.3`; `three` vào dedupe.
- **Double-pad khi bake** → migration atomic per-primitive; enumerate đủ call-site (§4.2).
- **Layering che/cắt Canvas** → nền lên shell root, screen trong suốt (§4.3).
- **Nav indicator desync** → `geometry.ts` 1 nguồn; test CSS==TS.
- **Inset sai khi fullscreen** → đọc `isFullscreen` + subscribe `onWindowStateChanged`.
- **Perf WebGL trong Electron** (backgroundThrottling:false) → tự lái pause hidden/idle, demand loop, DPR cap, dispose; budget FPS≥50 active / idle CPU ~0; reduced-motion tắt hẳn.
- **three phình bundle** (~600KB vào chunk 22MB) → chấp nhận; theo dõi `chunkSizeWarningLimit`.

## 10. Tham chiếu

- Spec chương trình + bản đồ 16 màn: [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md) §4–§6 (SP-0 override §4.6/§10 — xem §2).
- DESIGN.md (house rules token/primitive): [apps/desktop/DESIGN.md](../../apps/desktop/DESIGN.md).
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`.
- Recon + review ground-truth (2026-06-26): inset formula 149px (shell cũ) vs 34px (AETHER), 53 literal hình học, GPU-off-remote, R3F peer `<19.3`, layering `.ae-screen`, orb-state map — số liệu nhúng §4–§5.
