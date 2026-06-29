# AETHER Desktop — SP-4: UI Overhaul toàn app (Program Tracking)

> Tracking chương trình · cập nhật 2026-06-29 · trạng thái: 🟢 **#0 (Design Language + App shell) XONG** (BS→RL ✅, landed `origin/main` @ `e1016a027`) · 🟢 **#2 HUD XONG** (BS→RL ✅, subagent-driven theo plan, landed `origin/main` @ `f12531d4d`; src/aether 518/518 green, tsc 0, eslint 0; zero Critical/Important qua mọi review + final whole-branch review 6-dimension) · 🟢 **Light "Arctic Glass" mode XONG** (cross-cutting — xem §4.1; landed `origin/main` @ `300e63d2b`). Tiếp theo: **#3 Chat** — chạy ở session khác.
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.
> Program-spec (bản đồ 16 màn, đã đóng ở SP-3): [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md) §5.

## 1. Bối cảnh & mục tiêu

SP-0..SP-3 đã **đóng trọn 16 màn** về mặt *chức năng* (xem [program-spec §5](./2026-06-25-aether-desktop-design.md#5-bản-đồ-16-màn-hình)). Nhưng chất lượng **thị giác / trải nghiệm** chưa đạt — UI hiện tại "chưa được", thiếu đồng bộ. **SP-4 là sprint nâng cấp UI cho TOÀN BỘ desktop app**, làm **từng màn một, thật chi tiết**.

**Mục tiêu:** mỗi surface UI thật trong app được nâng cấp qua **full pipeline** (brainstorm → mockup → spec → plan → implement → review → fix findings → release), tất cả bám một **design language chung** (đầu việc #0) để đạt sự nhất quán.

**Mô hình:** 1 surface = 1 đầu việc (sub-project) = 1 spec + 1 plan riêng. Đầu việc #0 (Design Language + App shell) làm **trước tiên** vì nó là nền + khung cho mọi màn. Xử lý **tuần tự, không song song**.

**Phi-mục-tiêu:** không thêm năng lực backend/Python mới chỉ để overhaul UI (giữ tinh thần 0-Python-core của SP-2/SP-3 trừ khi một màn thực sự cần); không viết lại runtime đã tôi luyện (streaming/tool-call/gateway/voice/onboarding flow) — chỉ nâng presentation; không over-engineer multi-tenant/billing (để "bán-sau", ngoài SP-4).

## 2. Ràng buộc kế thừa (hard-rules — giữ nguyên từ SP-0..SP-3)

- **Brand `#07397d`** (deep navy) qua token `--ae-*` / `--dt-*`; **không hardcode màu** ngoài hệ token.
- **Localization:** UI tiếng Việt; **KHÔNG dịch "Agent" → "Đại lý"**; platform name **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety:** màn non-chat **không** subscribe `message.delta`/`reasoning.delta`/`thinking.*`; ngoại lệ duy nhất là **Voice** (lái phiên Chat thật) — đã ghi ở SP-3.
- **Tôn trọng `prefers-reduced-motion`** + motion gate SP-0 ở mọi transition/overlay/orb.
- **Layering SP-0:** màn dùng `.ae-screen-bare`; content wrapper sở hữu **một** gutter `--ae-page-*`; padding bake qua `GlassSlab size`; không double-pad. `--ae-*` geometry mode-independent; chỉ color tokens fork dưới `[data-aether-mode='light']`.
- **Giữ test xanh + `tsc` sạch** giữa mỗi slice: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`.

## 3. Pipeline cho mỗi đầu việc (Definition of Done từng stage)

| Stage | Ý nghĩa / DoD |
|---|---|
| **BS** Brainstorm | Dùng skill `superpowers:brainstorming`: phê bình UI hiện tại, chốt intent + hướng tiếp cận. |
| **MU** Mockup | Mockup thị giác (visual companion / HTML / ảnh) được duyệt trước khi viết spec. |
| **SP** Spec | Design spec viết tại `docs/specs/…-sp4-NN-<screen>.md` + self-review + user-approved. |
| **PL** Plan | Implementation plan (skill `superpowers:writing-plans`) tại `docs/plans/…-sp4-NN-<screen>.md`. |
| **IM** Implement | Code theo plan; suite `src/aether` xanh + `tsc` sạch. |
| **RV** Review | Chạy `superpowers:requesting-code-review` hoặc `/code-review` trên diff. |
| **FX** Fix findings | Xử lý hết findings từ review (hoặc ghi rõ lý do bỏ qua). |
| **RL** Release | Merge vào `main` (+ build/smoke desktop nếu màn cần). |

Ô trạng thái: `⬜` chưa · `🟡` đang làm · `✅` xong.

## 4. Bảng đầu việc (#0 + 19 surface = 20 mục)

| # | Surface | Component / Route | BS | MU | SP | PL | IM | RV | FX | RL | Tổng | Docs |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **0** | **Design Language + App shell** *(north-star sinh-thể-sống; nav-rail nở, top bar + ⌘K, vital-sign, overlay host, page-transition, living engine all-WebGL; dọn `/command-center` stub)* | cross-cutting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [spec](./2026-06-28-aether-sp4-00-design-language.md) · [plan](../plans/2026-06-28-aether-sp4-00-design-language.md) |
| 1 | Boot Sequence | `boot-sequence.tsx` · pre-shell | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 2 | HUD / Trang chủ | `command-center.tsx` · `/hud` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [spec](./2026-06-29-aether-sp4-02-hud.md) · [plan](../plans/2026-06-29-aether-sp4-02-hud.md) |
| 3 | Chat | `chat-screen.tsx` · `/` `/:sessionId` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 4 | Brief sáng | `morning-brief.tsx` · `/brief` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 5 | Dev cockpit | `dev-screen.tsx` · `/dev` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 6 | Inbox + CRM | `inbox-screen.tsx` · `/inbox` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 7 | Content engine | `content-screen.tsx` · `/content` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 8 | Vận hành (Ops) | `ops-screen.tsx` · `/ops` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 9 | Agents | `agents-screen.tsx` · `/agents` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 10 | Skills | `skills-screen.tsx` (+hub-panel, editor) · `/skills` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 11 | Memory | `memory-screen.tsx` · `/memory` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 12 | Cron | `cron-screen.tsx` (+cron-form) · `/cron` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 13 | Command Palette ⌘K | `app/command-palette` · overlay | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 14 | Settings | `settings-screen.tsx` · `/settings` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 15 | Voice | `voice-screen.tsx` · `/voice` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 16 | Onboarding | `onboarding-screen.tsx` (+onboarding/) · first-run | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 17 | Messaging | `messaging-screen.tsx` · `/messaging` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 18 | Artifacts | `artifacts-screen.tsx` · `/artifacts` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 19 | Profiles | `profiles-screen.tsx` · `/profiles` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |

**Tiến độ tổng:** 2/20 xong (#0 ✅, #2 ✅) · Tiếp theo: #3 Chat.

### 4.1 Cross-cutting: Light "Arctic Glass" mode (XONG @ `300e63d2b`)

Không phải 1 trong 20 surface — là việc **xuyên suốt cả app**, fulfil hard-rule §2 ("không hardcode màu ngoài hệ token", "color tokens fork dưới `[data-aether-mode='light']`").

- **Root cause** đã sửa: app vốn dark-only nhưng `apply-aether-default` ép light (chưa build) → 126+ màu dark hardcode trên 27 file + tầng GL không có biến thể light → "light/dark lẫn lộn".
- **Token foundation** (`aether.css`): bộ `--ae-*` mode-aware đầy đủ (surfaces/wells/fills/lines/glows/text-grad/state tints) — dark defaults + light overrides; recipe light cho `.ae-slab`/`.ae-vignette`/`.ae-bar`/`.ae-cmd`/`.ae-orb`.
- **27 file** component: mọi hex/rgba → token. **Tầng GL** (ambient shader + constellation labels) theo mode qua prop `light` (r3f Canvas **không** nhận React context — `useTheme()` trong Canvas luôn đọc default → đã sửa, đọc mode ở `AetherCanvas` ngoài Canvas).
- **Polish (skill ui-ux-pro-max):** navy ink; heading mid-azure đọc rõ (`#8fc0ff` ~1.9:1 → `#1f5fb8` ~6.2:1); dim ~8:1; orb navy-dominant; ambient light wash dịu; **bỏ orb nền giữa màn (cả light & dark)** — nó loá/xuyên glass; glass light 0.62→0.8; nav-rail **hover-expand → toggle tường minh** (default collapse, persisted) + focus states.
- **Guard:** `theme/no-hardcoded-colors.test.ts` cấm hex/rgba + `text-white`/`bg-black` không-flip trên toàn `aether/ui`.
- **Verify:** tsc 0, eslint 0, `src/aether` 571/571, ban test 52/52.
- ⚠️ **Manual GUI check chưa chạy** (headless không có GL): cần `npm run dev` xác nhận orb nền đã biến mất + nền sáng phẳng dịu + cả 2 mode đồng nhất.

> **Carry-over từ #0 (xử lý ở các đầu việc màn sau, không chặn #0):**
> - **Dual ⌘K** — top-bar ⌘K (global) + CommandBar trong màn HUD (`command-center.tsx`) cùng hiện trên `/hud`; **#2 HUD** sở hữu việc bỏ thanh ⌘K trong-màn.
> - **Living-engine GL polish** (làm trước khi wiring GL thật ở **#3 Chat**): `graph-view.tsx` dispose `BufferGeometry` trong `useMemo` (rò three.js, chỉ active ở route dev `/playground`); link-tendril color đang hardcode `stateColor('online')` → đổi sang theo endpoint; core orb đang fix `state="thinking"` (bỏ qua `spec.state`/`phase`).
> - **Polish nhỏ:** VitalSign `aria-label` đang chèn status tiếng Anh (online/retrying/down) vào chuỗi VN (i18n); ⌘K glyph hiển thị mọi nền tảng (Ctrl trên Win/Linux). `--ae-scrim` token đã thêm (overlay scrim).
> - **Manual GUI checklist** (Task 22 §4) **chưa chạy** (headless không có GL) — cần user chạy `npm run dev` để xác nhận thị giác: nav-rail nở 62↔172 + group headers, glyph thở/về Home, 1 avatar, ⌘K mở palette, vital azure/amber/red, `/playground` cảnh 6-verb + label sắc nét, reduced-motion → fallback SVG (không trắng canvas), macOS traffic-lights không đè glyph, ngắt gateway → overlay kết nối + vital đỏ-phẳng.

## 5. Thứ tự đề xuất

Bắt buộc **#0 trước tiên** (design language + shell = nền/khung cho mọi màn). Sau đó ưu tiên các màn **tần suất nhìn cao nhất**, phần còn lại linh hoạt:

**#0 → #2 HUD → #3 Chat → #4 Brief → #14 Settings → (4 trụ #5–#8) → (hệ agent #9–#12) → #13 ⌘K → #15 Voice → #16 Onboarding → #1 Boot → #17 Messaging → #18 Artifacts → #19 Profiles.**

Xử lý **tuần tự, từng mục một**. Khi bắt đầu một mục: đổi ô `BS`→`🟡`, cập nhật dần theo pipeline; khi `RL`=✅ thì `Tổng`=✅ và điền link spec/plan vào cột **Docs**.

## 6. Quy ước file (mỗi đầu việc)

- Spec: `docs/specs/YYYY-MM-DD-aether-sp4-NN-<screen>.md` (NN = số đầu việc, 00..19).
- Plan: `docs/plans/YYYY-MM-DD-aether-sp4-NN-<screen>.md`.
- Mockup: visual companion (brainstorming) hoặc file HTML/ảnh tham chiếu — link vào spec.
- Mỗi mục hoàn tất → cập nhật dòng tương ứng trong bảng §4 + tiến độ tổng §4.

## 7. Tham chiếu

- Sprint trước: SP-3 [voice+onboarding](./2026-06-27-aether-sp3-voice-onboarding.md) · SP-2 [4 trụ cột](./2026-06-26-aether-sp2-pillars.md) · SP-1 [daily-driver](./2026-06-26-aether-sp1-daily-driver.md) · SP-0 [cinematic](./2026-06-26-aether-sp0-design.md).
- Design tokens & shell: `apps/desktop/src/aether/ui/theme/aether.css`, `apps/desktop/src/aether/ui/shell/`, `apps/desktop/src/aether/ui/components/`.
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`.
