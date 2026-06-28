# AETHER Desktop — SP-4: UI Overhaul toàn app (Program Tracking)

> Tracking chương trình · 2026-06-28 · trạng thái: 🟡 đang làm đầu việc #0 — BS ✅ · MU ✅ · SP 🟡 (chờ user review spec → writing-plans).
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
| **0** | **Design Language + App shell** *(north-star sinh-thể-sống; nav-rail nở, top bar + ⌘K, vital-sign, overlay host, page-transition, living engine all-WebGL; dọn `/command-center` stub)* | cross-cutting | ✅ | ✅ | 🟡 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 | [spec](./2026-06-28-aether-sp4-00-design-language.md) |
| 1 | Boot Sequence | `boot-sequence.tsx` · pre-shell | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
| 2 | HUD / Trang chủ | `command-center.tsx` · `/hud` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | — |
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

**Tiến độ tổng:** 0/20 xong.

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
