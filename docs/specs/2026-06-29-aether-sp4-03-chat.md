# AETHER Desktop — SP-4 #3: Chat (Design Spec)

> Spec thiết kế · 2026-06-29 · trạng thái: chờ user review → writing-plans (session khác).
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.
> Đầu việc #3 trong tracker SP-4: [docs/specs/2026-06-28-aether-sp4-ui-overhaul.md](./2026-06-28-aether-sp4-ui-overhaul.md) §4.
> Nền móng kế thừa: #0 design-language + shell + engine [docs/specs/2026-06-28-aether-sp4-00-design-language.md](./2026-06-28-aether-sp4-00-design-language.md) · #2 HUD (đã hiện thực hoá engine từ snapshot) [docs/specs/2026-06-29-aether-sp4-02-hud.md](./2026-06-29-aether-sp4-02-hud.md).
> Mockup (visual companion, local — gitignored `.superpowers/brainstorm/82259-1782731572/content/`): `engine-manifestation-v2.html` (chốt C), `chat-layout-c.html` (bố cục chốt), `chat-reader-md.html` (trạng thái đọc file chốt).

## 1. Bối cảnh & mục tiêu

#0 đã chốt design-language sinh-thể-sống + dựng engine all-WebGL (`GraphSpec` + 6-verb lifecycle + shared `AetherCanvas` + `OverlayHost` summon/result/connection + fallback SVG). #2 HUD đã hiện thực hoá engine đó **từ snapshot** (sessions-constellation, prompt-cache safe). **#3 Chat là màn DUY NHẤT được phép subscribe stream thật** — nơi engine cuối cùng ăn **event agent/tool live**. Cả #0 lẫn #2 đều **chủ động hoãn** phần này cho #3.

**Phê bình Chat hiện tại (ground-truth, đã verify):**
- **Frame AETHER mỏng, ruột là @assistant-ui legacy.** [chat-screen.tsx](../../apps/desktop/src/aether/ui/screens/chat-screen.tsx) chỉ bọc `ae-grid-floor` + `ae-vignette` + một busy-badge. Bên trong, thread/composer/tool render bằng `--ui-*` (legacy) + Tailwind `text-*` + **màu trạng thái hardcode** (`text-emerald-*`, `text-destructive`, `text-amber-600` trong [tool-fallback.tsx](../../apps/desktop/src/components/assistant-ui/tool-fallback.tsx)) — đúng "gốc bệnh thiếu đồng bộ" SP-4 đang chữa; chưa bám `--ae-*` / Light.
- **Busy indicator = `LivingOrb` CSS/SVG cũ** ([chat-screen.tsx:18](../../apps/desktop/src/aether/ui/screens/chat-screen.tsx#L18)) — không phải engine #0. Chat **không hề render** chòm sao/summon dù là màn duy nhất được phép subscribe stream.
- **Engine #0 chưa live:** `tool.start` / `subagent.*` / `message.complete` (có sẵn trong [use-message-stream.ts](../../apps/desktop/src/app/session/hooks/use-message-stream.ts)) **không** drive lifecycle/graph. Sub-agent chỉ hiện ở composer status stack ([subagents.ts](../../apps/desktop/src/store/subagents.ts)); tool-call chỉ là disclosure row; `OverlayHost` summon/result đã có khung **nhưng chưa dùng**.
- **Đọc file nghèo nàn:** read_file chỉ hiện args/result thu gọn trong disclosure — không có bề mặt đọc tử tế.

**Mục tiêu #3:** overhaul Chat thành **buồng lái hội thoại sống** theo bố cục **C · Side companion (Light)** — hai lớp soi chiếu cùng một sự thật: (a) **lớp đọc** = thread Light (token chảy, biên bản đầy đủ) + **reader panel** đọc file (.md); (b) **lớp sống** = **dock sinh thể** bên phải feed stream thật (lõi phiên · sub-orb sub-agent · bud tool-call · crystallize). Diệt hardcode → token; light-only; cache-safe.

## 2. Ràng buộc kế thừa (hard-rules — bất khả xâm phạm)

- **Brand `#07397d`** qua token `--ae-*`/`--dt-*`; **không hardcode màu** ngoài hệ token; amber-đang-làm dùng `--ae-energy`.
- **LIGHT-ONLY.** App chỉ có Light. **Không** viết biến thể `[data-aether-mode='dark']`; **gỡ dark fork** trong mọi file Chat #3 đụng tới. (Bộ máy light/dark/system còn sót ở `themes/context.tsx` + aether.css là tech-debt — xoá toàn app là **đầu việc cross-cutting riêng**, ngoài #3.)
- **Localization:** UI tiếng Việt; **KHÔNG dịch "Agent" → "Đại lý"**; platform "HYPERTEK - AGENT PLATFORM".
- **Prompt-cache safety (CỐT TỬ):** Chat *được* subscribe stream cho **thread** (như runtime cũ). Nhưng **engine + reader TUYỆT ĐỐI không** ăn per-token (`message.delta`/`reasoning.delta`); chỉ ăn **event thô** qua `$turnActivity` (§5). KHÔNG để engine/dock subscribe `$messages` (thay ~30×/s).
- **Motion gate SP-0 + `prefers-reduced-motion`** ở mọi animation dock/lean-in/crystallize/reader.
- **Layering SP-0:** `.ae-screen-bare`; content wrapper sở hữu **một** gutter `--ae-page-*`; padding bake qua `GlassSlab size`; `--ae-*` geometry mode-independent.
- **Giữ test xanh + tsc sạch** mỗi slice: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`.
- **KHÔNG viết lại runtime** streaming/tool-call/gateway đã tôi luyện — chỉ nâng **presentation** + thêm **lớp visualization đọc store**.

## 3. North-star màn Chat

Chat = **buồng lái hội thoại sống**. Hai lớp soi chiếu **cùng một sự thật** (mọi thứ trong dock đều có bản ghi inline trong thread):

- **Lớp đọc (hero nội dung):** thread hội thoại Light — token chảy mượt; là **biên bản đầy đủ** (message, reasoning, tool args/result, sub-agent progress). + **reader panel** mở khi đọc file.
- **Lớp sống (hero thị giác):** **dock sinh thể** bên phải — **lõi = phiên hiện tại** (thở theo `$orbState`); **sub-orb = mỗi sub-agent** (phân bào/mitosis); **bud = mỗi tool-call** (mọc → flow → tỉa); **crystallize ✦** khi xong. Lean-in nhẹ lúc spawn.

3 mức zoom #0: glyph rail (mọi màn) → chòm sao HUD (#2) → **summon/live-task = Chat (#3)**. Canvas **LIGHT**.

## 4. Quyết định đã chốt (qua brainstorm + visual companion)

| Quyết định | Chốt | Ghi chú |
|---|---|---|
| **Scope #3** | **Cả hai nửa, engine là hero** | Restyle thread/composer về Light + wire living-engine vào stream thật. |
| **Manifestation** | **C · Side companion** | Thread giữa + dock sinh thể bền bên phải; + lean-in lúc spawn + crystallize→result. (Loại B summon-phủ-màn vì che token; loại A ambient vì chìm; loại D inline vì mất constellation.) |
| **Vai trò dock** | **Overview sống, thread giữ record** | Dock bổ trợ, không thay thế: bấm bud/sub-orb → cuộn tới / mở mục trong thread (hoặc reader). |
| **Render dock** | **GL — tái dùng shared `AetherCanvas`** | Compose `GraphSpec` layout "dock" (vùng phải); DOM overlay = khung/nhãn/hit-target (kiểu `ConstellationOverlay` #2). KHÔNG thêm Canvas (#0 §6). |
| **Reader panel** | **Có — mở khi đọc file** | Bấm "Mở" trên thẻ/bud read_file → chat thu hẹp + panel đọc giữa + dock co slim. **Trigger = thủ công** (agent đọc nhiều file, auto-mở sẽ giật). |
| **Reader format** | **MVP `.md`** | Tái dùng renderer streamdown ([markdown-text.tsx](../../apps/desktop/src/components/assistant-ui/markdown-text.tsx)); code/diff/format khác → "xem thô / tải về", để vòng sau. |
| **Result modal** | **Chỉ auto cho artifact đơn** | Ảnh sinh ra / xác nhận → modal (`OverlayHost` 'result'). **File/text/diff → reader panel** (panel nuốt result-modal phần này). Crystallize ✦ luôn chạy ở node (hiệu ứng, không tự mở gì). Quản lý đầy đủ → #18 Artifacts. |

Ảnh tham chiếu canonical: `chat-layout-c.html` (mặc định) + `chat-reader-md.html` (đang đọc file).

## 5. Kiến trúc & luồng dữ liệu (cache-safe)

Chat có **2 consumer khác tốc độ**, tách bạch để giữ prompt-cache + perf:

```
PER-TOKEN (giữ nguyên):
  message.delta / reasoning.delta ─► $messages (~30×/s) ─► Thread runtime (chỉ RESTYLE render)

COARSE (mới — cô lập engine khỏi per-token):
  tool.start/complete · subagent.* · message.start/complete · $busy
        └─► $turnActivity (store thô) ─► use-chat-graph (throttle ~150ms/rAF)
                                              └─► chat-graph.ts (logic thuần) ─► GraphSpec (dock layout)
                                                       └─► setGraphSpec($graphSpec) ─► AetherCanvas (#0) vẽ dock
  read_file result (snapshot) ─► $readerPanel ─► reader-panel (render md, KHÔNG subscribe stream)
```

- **`$turnActivity`** (mới): cập nhật **chỉ** ở các nhánh **coarse** của [use-message-stream.ts](../../apps/desktop/src/app/session/hooks/use-message-stream.ts) đã có (`tool.start/progress/complete`, `subagent.*`, `message.start/complete`, `$busy`). **KHÔNG** chạm `message.delta`/`reasoning.delta`. Engine subscribe store này — **không** subscribe `$messages`.
- **`chat-graph.ts`** (logic thuần, test jsdom): map `(session, toolActivity[], subagents[])` → `GraphSpec` với **dock layout** (toạ độ dồn về vùng phải; deterministic, không RNG → node không nhảy; **cap bud top-N** + cụm "+k" cho lượt dài; lean-in = transform tạm khi có spawn).
- **`use-chat-graph.ts`**: subscribe `$turnActivity` → recompute → `setGraphSpec` (throttle ~150ms để cụm tool dồn dập gộp). Rời route/unmount → `clearGraphSpec()` (không làm bẩn HUD).
- **Reader** = snapshot tĩnh: bấm "Mở" → lấy content từ `result` của tool read_file (đã nằm trong tool part) → `$readerPanel` → render md. Không stream.

**Tái dùng tối đa engine #0/#2:** `GraphSpec`/`graph-model.ts`, `lifecycle.ts` (6-verb), `AetherCanvas`/`GraphView`/`GraphLabels`/`fallback.tsx`, `OverlayHost`, `$graphSpec`/`setGraphSpec`/`clearGraphSpec`. #3 chỉ thêm: nguồn dữ liệu live (`$turnActivity`), layout dock (`chat-graph.ts`), overlay DOM dock (`living-dock.tsx`), reader.

## 6. Map event thô → 6-verb #0 → dock

| Event (`$turnActivity`) | Verb | Dock visual |
|---|---|---|
| `message.start` / `$busy=true` | **reach** | lõi vươn tua, halo sáng |
| `subagent.start` | **mitosis** | sub-orb tách khỏi lõi (cầu lỏng), hue xanh ngọc `--ae-suborb` |
| `tool.start` | reach→**flow** | bud mọc trên tua; đốm `--ae-energy` chảy RA |
| `tool.progress` / running | **flow** | đốm chảy liên tục (ambient suy từ "đang chạy", **không** phải token) |
| `tool.complete` ok | inhale→**crystallize** | đốm chảy VỀ lõi; bud lóe kết tinh ✦ |
| `tool.complete` error | crystallize (lỗi) | bud sang trạng thái lỗi (`--ae-warn` + nhãn), không lóe |
| `subagent.complete` | **inhale** | sub-orb hút kết quả → mờ dormant |
| `message.complete` / `$busy=false` | crystallize→**breathe** | node tỉa dần; lõi về thở idle |
| tool/sub rớt top-N (lượt dài) | **prune** | node co/tan về lõi |

- **Reasoning ("thinking")** = pha **reach/breathe** ở lõi (không tạo node); thread vẫn có disclosure reasoning (restyled).
- "Đang xử lý" tổng = lõi thở `thinking` (`$orbState`) — **thay** busy-badge `LivingOrb` cũ.
- Mọi "data chạy" là **ambient decoration** suy từ trạng thái tool/sub, **không** phải token thật.

## 7. Bố cục C + reader panel + các trạng thái

**Mặc định (không đọc file)** — `chat-layout-c.html`:
- **Trái = thread** (flex): `ChatHeader` (title + pin/delete) · scroll (bubble user/assistant, reasoning block, thẻ tool-call inline) · composer dock đáy.
- **Phải = dock sinh thể** (~228px): GlassSlab translucent cho GL hiện xuyên qua; DOM overlay khung + nhãn lõi/sub-orb/bud + footer đếm "N tool · M sub-agent".
- **Bỏ** busy-badge `LivingOrb` cũ; **bỏ/gộp** `ThreadTimeline` (rìa phải) vào dock (1 rìa phải, không 2 thanh chồng).

**Đang đọc file (.md)** — `chat-reader-md.html`:
- **Thread thu hẹp** (~268px) · **reader panel** ở giữa (flex): header `tên file` + badge format + ✕; body render md (streamdown). · **dock co slim** (~58px: lõi thở + node dots + đếm + nút expand `⟩`).
- Đóng ✕ → chat bung lại như mặc định; dock nở lại.

**Thu hẹp màn (responsive):** dưới ngưỡng → dock co slim hoặc toggle ẩn (giữ thread đọc được); composer chỉ rộng bằng cột thread.

## 8. Tokenize/restyle thread về Light AETHER (nửa "presentation overhaul")

Diệt hardcode (`text-emerald-*`/`text-destructive`/`text-amber-600`/`--ui-*`) → `--ae-*`:
- **Bubble** user/assistant: nền/viền/ink `--ae-*` (user tint azure · assistant surface trắng glass).
- **Reasoning block** (thinking disclosure): viền-trái + nền `--ae-azure` mờ, nhãn "SUY LUẬN".
- **Tool-call card** [tool-fallback.tsx]: state → `--ae-state-online`/`--ae-warn`/`--ae-energy`; **icon bud** đầu thẻ (đồng ngôn ngữ dock); nút "Mở" cho file/diff; inline diff/image panel giữ chức năng, tokenize màu.
- **Composer** [composer-dock.ts] (+composer files): `--composer-fill`/`border-border` → `--ae-*` glass; status/queue stack theo token.
- **Intro/empty** [intro.tsx]: wordmark + tagline Light; "Bắt đầu trò chuyện".
- **Phạm vi:** các file Chat #3 đụng tới + **gỡ dark fork trong chính các file đó**. Mở rộng guard [no-hardcoded-colors.test.ts](../../apps/desktop/src/aether/ui/theme/no-hardcoded-colors.test.ts) phủ `components/assistant-ui` + `app/chat` **nếu khả thi** (nếu vướng dependency ngoài tầm #3 → ghi rõ lý do, để đầu việc sau).

## 9. Reader · result modal · crystallize

- **Reader panel** (`reader-panel.tsx` + `$readerPanel`): trigger = bấm "Mở" trên thẻ/bud read_file. Thu hẹp chat + co dock slim. MVP render `.md` (streamdown). Format khác → "xem thô / tải về". ✕ đóng, focus-trap nhẹ.
- **Result modal** (`OverlayHost` kind 'result'): **chỉ** auto cho **artifact đơn đáng chú ý** = ảnh sinh ra (`image_generate`, [generated-image-result.tsx](../../apps/desktop/src/components/chat/generated-image-result.tsx)) hoặc xác nhận. File/text/diff → **reader panel** (tránh 2 cơ chế xem-kết-quả trùng).
- **Crystallize ✦** luôn chạy ở node dock khi tool/turn xong (hiệu ứng thị giác, **không** tự mở gì).
- **Click node dock** → cuộn tới + highlight tool tương ứng trong thread; nếu là file → mở reader.

## 10. Fallback (hard-rule #0) & a11y

- `reduced-motion` **HOẶC** GPU-off (`getRemoteDisplayReason()`) **HOẶC** webgl-probe fail → **không** mount Canvas → dock render **tĩnh SVG** ([fallback.tsx](../../apps/desktop/src/aether/ui/motion/graph/fallback.tsx)) từ cùng `GraphSpec`; state đổi màu theo event nhưng **không** animate verb. **Thread + reader + composer chạy bình thường.**
- **a11y:** dock GL là enhancement; mỗi node = nút focusable (kiểu `ConstellationOverlay`) → click cuộn tới tool / mở reader, có `aria-label`. Reader = DOM thật, focusable, ✕ có label, focus-trap nhẹ. Tool state kèm **nhãn** (xong/đang chạy/lỗi), không chỉ dựa màu. Điều hướng chuẩn vẫn qua DOM (nav-rail/thread).

## 11. Cấu trúc file

**Sửa:**
```
apps/desktop/src/aether/ui/screens/chat-screen.tsx              dựng layout C (thread+dock+reader); bỏ busy-badge LivingOrb; mount use-chat-graph; clearGraphSpec khi unmount
apps/desktop/src/components/assistant-ui/tool-fallback.tsx      tokenize + icon bud + nút "Mở" (file/diff)
apps/desktop/src/components/assistant-ui/thread.tsx             tokenize bubble/reasoning; gỡ dark fork
apps/desktop/src/components/assistant-ui/markdown-text.tsx      tokenize (dùng chung cho reader)
apps/desktop/src/components/assistant-ui/thread-timeline.tsx    gộp/bỏ (dock nuốt prompt-rail)
apps/desktop/src/components/chat/composer-dock.ts (+composer)   tokenize glass → --ae-*
apps/desktop/src/app/chat/intro.tsx                             Light wordmark + tagline
apps/desktop/src/app/session/hooks/use-message-stream.ts       đẩy $turnActivity ở nhánh coarse (KHÔNG ở delta)
apps/desktop/src/aether/ui/motion/graph/graph-view.tsx         (nếu cần) hỗ trợ dock layout / lean-in
apps/desktop/src/aether/ui/theme/no-hardcoded-colors.test.ts   mở rộng phạm vi (nếu khả thi)
apps/desktop/DESIGN.md                                          ghi: Chat = living cockpit; $turnActivity; dock layout; reader; bridge points
```

**Tạo mới:**
```
apps/desktop/src/aether/domain/engine/chat-graph.ts            map (session, toolActivity, subagents) → GraphSpec dock layout — logic thuần
apps/desktop/src/aether/domain/session/turn-activity.ts        $turnActivity (store thô) + reducer
apps/desktop/src/aether/domain/chat/reader-store.ts            $readerPanel { open, fileName, format, content }
apps/desktop/src/aether/ui/screens/chat/use-chat-graph.ts      wire $turnActivity → chat-graph → $graphSpec (throttle) + clear on unmount
apps/desktop/src/aether/ui/screens/chat/living-dock.tsx        DOM overlay khung + nhãn + hit-target trên vùng GL; slim/expand
apps/desktop/src/aether/ui/screens/chat/reader-panel.tsx       panel đọc md (streamdown)
+ test kề bên mỗi module
```
> `chat-screen.tsx` đang là frame mỏng; tách dock/reader/wiring ra `screens/chat/` + domain để mỗi đơn vị một việc, test độc lập (nguyên tắc isolation).

## 12. Testing

- **Gate mỗi slice:** `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit` xanh.
- **Unit thuần (jsdom):**
  - `chat-graph`: map tool→bud / subagent→sub-orb đúng state; cap top-N + cụm "+k"; layout **deterministic** (không nhảy giữa cập nhật); lean-in transform; rỗng → lõi đơn.
  - `turn-activity` reducer: `tool.start/progress/complete(ok|error)`, `subagent.*`, `message.start/complete` → state đúng; **assert KHÔNG đổi khi `message.delta`/`reasoning.delta`** (test cache-safe — quan trọng nhất).
  - `lifecycle` map event→verb đúng.
  - `reader-store`: mở/đóng; md content; chat thu hẹp khi open.
  - **Tokenize:** assert dùng `--ae-*`; **hết** `text-emerald-*`/`text-destructive`/`text-amber-600`/`--ui-*` + **hết dark fork** trong file đụng tới.
  - `chat-screen`: **bỏ** busy-badge `LivingOrb` cũ; click node dock → scroll/highlight; click "Mở" → reader.
- **Guard (WebGL, jsdom không chạy GL):** mount/unmount/dispose; `clearGraphSpec` khi rời chat; slim/expand dock.
- **Fallback gate:** reduced-motion/GPU-off/probe-fail → **không** Canvas, dock SVG tĩnh + reader/thread chạy.
- **Thủ công (máy thật):** tool chạy → bud mọc/flow/crystallize; sub-agent → sub-orb phân bào; read_file → "Mở" → reader md; ảnh → result modal; reduced-motion → tĩnh; **token chảy KHÔNG spike CPU** (kiểm cache-safe: engine không recompute theo delta).
- Mỗi bước TDD: đỏ → code → xanh → commit.

## 13. Rủi ro & giảm thiểu

- **Vỡ prompt-cache/perf nếu engine lỡ đọc `$messages`** → bắt buộc qua `$turnActivity`; review chặn mọi import `$messages` vào engine/dock; unit assert reducer không đổi khi delta.
- **Viết lại runtime ngoài ý muốn** → ranh giới cứng: chỉ presentation + viz đọc store; không sửa logic stream/tool/gateway.
- **Dock layout đè vùng đọc** → layout dồn vùng phải; lean-in tạm thời, không khoá; cap node lượt dài.
- **Lượt nhiều tool/sub** → cap top-N + cụm "+k"; throttle recompute.
- **Reader format ngoài md** → MVP md; format khác fallback "xem thô / tải về".
- **Drift token / dark sót** → guard `no-hardcoded-colors`; gỡ dark fork file đụng tới (light-only).
- **Rò three.js** → dispose (đã xử ở #2) — tái dùng.
- **Scope creep** sang #18 Artifacts / #15 Voice → ranh giới §14 cứng.

## 14. Ranh giới scope

**#3 GIAO (Definition of Done):**
1. Chat rebuild **Light · C · Side companion** (`chat-layout-c.html`): thread (restyled) + dock sinh thể + reader panel.
2. Thread/composer/tool/reasoning/sub-agent **tokenize về `--ae-*`** (diệt hardcode); **gỡ dark fork** file đụng tới.
3. **Dock sinh thể GL** (reuse shared `AetherCanvas`) feed stream thật qua **`$turnActivity`** + `chat-graph` (logic thuần, test); map event→6-verb→dock.
4. **Reader panel** đọc `.md` (trigger thủ công "Mở"); chat thu hẹp + dock slim.
5. **Result modal** chỉ artifact đơn (ảnh/xác nhận) + **crystallize ✦** hiệu ứng; click node → scroll/highlight (hoặc reader).
6. Bỏ busy-badge `LivingOrb` cũ; bỏ/gộp `ThreadTimeline`.
7. **Fallback SVG** + a11y. Suite `src/aether` xanh + tsc sạch.

**#3 KHÔNG làm (để màn sau):**
- Reader format ngoài `.md` (code highlight/diff viewer riêng/PDF…) = vòng sau.
- Quản lý/duyệt artifact đầy đủ = **#18 Artifacts**.
- Voice (lái phiên Chat) = **#15 Voice**.
- Xoá bộ máy dark/light/system toàn app (`themes/context.tsx`) = **đầu việc cross-cutting riêng**.
- Viết lại runtime streaming/tool/gateway; multi-tenant/billing.

## 15. Tham chiếu

- Tracker SP-4: [docs/specs/2026-06-28-aether-sp4-ui-overhaul.md](./2026-06-28-aether-sp4-ui-overhaul.md).
- #0 design-language + engine: [docs/specs/2026-06-28-aether-sp4-00-design-language.md](./2026-06-28-aether-sp4-00-design-language.md) · #2 HUD: [docs/specs/2026-06-29-aether-sp4-02-hud.md](./2026-06-29-aether-sp4-02-hud.md).
- Engine #0/#2: [graph-model.ts](../../apps/desktop/src/aether/domain/engine/graph-model.ts), [lifecycle.ts](../../apps/desktop/src/aether/domain/engine/lifecycle.ts), [graph-store.ts](../../apps/desktop/src/aether/domain/motion/graph-store.ts), [motion-store.ts](../../apps/desktop/src/aether/domain/motion/motion-store.ts), [aether-canvas.tsx](../../apps/desktop/src/aether/ui/motion/aether-canvas.tsx), [graph-view.tsx](../../apps/desktop/src/aether/ui/motion/graph/graph-view.tsx), [fallback.tsx](../../apps/desktop/src/aether/ui/motion/graph/fallback.tsx), [overlay-host.tsx](../../apps/desktop/src/aether/ui/shell/overlay-host.tsx), [constellation-overlay.tsx](../../apps/desktop/src/aether/ui/screens/hud/constellation-overlay.tsx).
- Chat runtime (GIỮ NGUYÊN logic): [use-message-stream.ts](../../apps/desktop/src/app/session/hooks/use-message-stream.ts), [chat-runtime.ts](../../apps/desktop/src/lib/chat-runtime.ts), [session.ts](../../apps/desktop/src/store/session.ts), [subagents.ts](../../apps/desktop/src/store/subagents.ts), [tool-fallback.tsx](../../apps/desktop/src/components/assistant-ui/tool-fallback.tsx), [composer-dock.ts](../../apps/desktop/src/components/chat/composer-dock.ts).
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`, `aether-sp4-ui-overhaul`, `aether-light-only-no-dark`.
