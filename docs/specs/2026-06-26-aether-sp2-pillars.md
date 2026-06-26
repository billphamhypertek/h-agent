# AETHER Desktop — SP-2: 4 Trụ Cột Kinh Doanh (Design Spec)

> Spec thiết kế · 2026-06-26 · trạng thái: đã chốt design, chờ review để chuyển sang implementation plan(s).
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.

## 1. Bối cảnh

SP-0 (4 màn lõi + nền WebGL) và **SP-1 daily-driver** (8 màn cấu hình/vận hành + ⌘K Command Palette) đã hoàn tất và merge. AETHER Desktop hiện đủ để chủ sở hữu dùng hằng ngày để cấu hình và quan sát hệ agent. 4 màn "trụ cột kinh doanh" (screen 5–8 trong bản đồ 16 màn) vẫn render `<StubScreen>`.

**SP-2 = "4 trụ cột kinh doanh":** biến 4 màn stub thành **buồng lái quan sát read-only** — Dev/DevOps cockpit, Inbox + CRM, Content engine, Vận hành & Tài chính — mỗi màn tổng hợp tín hiệu từ các nguồn sẵn có và trình bày để chủ sở hữu *nhìn thấy toàn bộ hoạt động công ty một người*. SP-2 **không** build mới shell, **không** đụng Python backend REST, **không** viết lại runtime — chỉ dựng presentation AETHER mới trên nền SP-0/SP-1, đọc dữ liệu qua cơ chế cron-artifact đã chứng minh ở SP-0 (Morning Briefing).

Lộ trình tổng: **SP-0** (xong) → **SP-1 daily-driver** (xong) → **SP-2 4 trụ cột** (spec này) → **SP-3 Voice + Onboarding**. Xem [program-spec](./2026-06-25-aether-desktop-design.md) §5 (bản đồ 16 màn) và [sp1-daily-driver](./2026-06-26-aether-sp1-daily-driver.md).

## 2. Mục tiêu & Phi-mục-tiêu

**Mục tiêu (SP-2):** 5 deliverable.
- **4 màn cockpit read-only** (mỗi màn = 1 route trong `app/routes.ts`, thay `<StubScreen>` tương ứng trong `aether-shell.tsx`, 1 màn / commit-slice): **Dev cockpit · Inbox+CRM · Content engine · Vận hành & Tài chính**.
- **1 hạ tầng tổng hợp:** **một** skill aggregator hợp nhất (`company-os-aggregator`) chạy bằng **một** cron job, phát **một** JSON artifact là **superset cộng dồn** của briefing schema hiện có. Renderer đọc qua một read layer chung (`read-company-os`), mỗi màn chọn slice của mình.
- **Default theme = Light "Arctic Glass".** First-run paint đổi từ Dark sang Light; người dùng vẫn đổi sang Dark được (Settings → Appearance + ⌘K), lựa chọn người dùng vẫn được tôn trọng & lưu.
- Mỗi màn ≥ 1 render test + 1 interaction test + 1 prompt-cache guard test (vitest + jsdom).

**Mô hình "đọc-tổng-hợp" (đã chốt):** mọi trụ cột là **dashboard quan sát read-only**. Section nào **có nguồn sống** thì nối dây thật; section nào **chưa có nguồn** thì render khung + **empty-state tiếng Việt trung thực** (`"Chưa có nguồn dữ liệu"` + một dòng gợi ý) — **không bao giờ** dựng số liệu giả. Đây chính là quy tắc "degrade gracefully" mà `morning-briefing-aggregator` đã dùng.

**Phi-mục-tiêu (KHÔNG làm ở SP-2):**
- **Mọi thao tác ghi/CRUD** (tạo/sửa/xóa deal, post, chi tiêu) — chưa làm. SP-2 chỉ đọc.
- **Store persisted mới** cho dữ liệu source-less (deals.json/content/ledger) — không thêm.
- **Thêm/sửa REST endpoint trong `aether_cli/web_server.py`** — **0 thay đổi Python core**. Đúng nguyên tắc "core là eo thắt hẹp, năng lực ở rìa; renderer chỉ trình bày & điều khiển" ([program-spec](./2026-06-25-aether-desktop-design.md) §2). Năng lực mới nằm ở **rìa** (skill aggregator + cron).
- Backend CRM/finance/content (chưa có nguồn) — sub-project sau khi có nguồn.
- Voice (orb state `listening`), Onboarding — **SP-3**.
- Multi-tenant, billing, auth nhiều người.

## 3. Ràng buộc kế thừa (hard rules — copy từ SP-1, không paraphrase)

- **Giữ runtime đã tôi luyện.** Không viết lại streaming/tool-call/terminal/gateway WS/cmdk core — restyle qua token/className.
- **Brand `#07397d`** (deep navy). Tokens, không literal. **Không hardcode màu ngoài hệ `--ae-*` / `--dt-*`.**
- **Localization (cứng):** UI tiếng Việt. **KHÔNG dịch "Agent" → "Đại lý".** Giữ "Agent". Platform name hiển thị: **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety (cứng):** màn non-chat **KHÔNG** subscribe `message.delta`/`reasoning.delta`/`thinking.*`, **KHÔNG** poll hội thoại live, **KHÔNG** gọi `appendAssistantDelta`. Chỉ đọc REST + message của **cron run đã kết thúc** + event không-thuộc-hội-thoại + `/status`. Không re-trigger LLM.
- **Tôn trọng `prefers-reduced-motion`** + motion gate SP-0 ở mọi transition/overlay.
- **`--ae-*` geometry mode-independent**; chỉ color tokens fork dưới `[data-aether-mode='light']`. `--ae-*` chỉ resolve khi `[data-aether-theme='aether']`.
- **Layering SP-0:** màn dùng `.ae-screen-bare` (transparent, không tự pad, `min-w-0`); content wrapper sở hữu **một** gutter `--ae-page-*` duy nhất. Không double-pad. Padding bake qua `GlassSlab size`.
- **Geometry tokens:** chỉ tokenize arbitrary `[...]` Tailwind values; shorthand chuẩn (`mt-3`, `gap-1.5`) giữ nguyên.

## 4. Kiến trúc — pattern dùng chung (mở rộng cơ chế cron-artifact của SP-0)

SP-0 đã chứng minh cơ chế **prompt-cache-safe** cho dữ liệu không có REST endpoint: một skill chạy bằng cron → phát **một** JSON artifact ở message cuối của session → renderer đọc run mới nhất + parse. SP-2 **mở rộng đúng cơ chế đó**, hợp nhất thành một artifact cho cả 4 trụ cột.

```
skills/productivity/company-os-aggregator/SKILL.md      MỘT skill, chạy bằng MỘT cron job
        │  emit MỘT fenced ```json conforming references/company-os-schema.json
        │  (superset cộng dồn của briefing schema — HUD/Brief vẫn đọc field cũ)
domain/company-os/read-company-os.ts                    đọc latest cron run → parse JSON (một read layer chung)
        │  (read-briefing.ts được generalize để dùng lại reader này cho slice "briefing")
domain/<pillar>/<pillar>-store.ts                       nanostore: chọn SLICE của mình từ artifact
        │  $<pillar> + $<pillar>Status + load<Pillar>()
ui/screens/<pillar>-screen.tsx                          presentation AETHER (.ae-screen-bare, GlassSlab, --ae-* tokens)
```

**Quy ước (kế thừa SP-1 §4):**
- Màn = root `.ae-screen-bare flex h-full min-w-0 flex-col`; **không** `p-[...]`, **không** background riêng. Card/section dùng `<GlassSlab size>`.
- Store mỗi trụ cột: `$<pillar>` (atom dữ liệu = slice), `$<pillar>Status` (`'idle'|'loading'|'ready'|'empty'|'error'`), action `load<Pillar>()` gọi `readLatestCompanyOs()` rồi set slice. Non-render đọc `$atom.get()`; component subscribe `useStore`.
- **Read-only, REST + cron-run message only, không mở socket hội thoại.** Live update bằng nút "Làm mới" (re-read latest run). Freshness = cadence của cron.
- Loading/empty/error: skeleton GlassSlab + thông điệp tiếng Việt; lỗi → inline error + "Thử lại".
- Stub→real: thay `<StubScreen title="…" />` trong [aether-shell.tsx](../../apps/desktop/src/aether/ui/shell/aether-shell.tsx) bằng màn thật, **1 màn / slice**, giữ test xanh giữa các slice.

**Một artifact, nhiều reader (đã chốt):** aggregator phát một JSON với các section `{ briefing (cũ), dev, inbox, content, ops }`. HUD bento + Morning Brief tiếp tục đọc field cũ (back-compatible); mỗi pillar store đọc section mới của mình. Một cron, một parse path. 4 store gọi **cùng** `readLatestCompanyOs()`, mỗi store chọn key của mình (cân nhắc cache nhẹ artifact đã parse để 4 lần mount không fetch gấp 4 — quyết ở writing-plans).

**Skill identity / back-compat (đã chốt):** **đổi tên nội dung skill thành `company-os-aggregator`** và mở rộng schema *tại chỗ*; **giữ nguyên tên cron job đã đăng ký** để cron đang chạy của user (`docs/aether-briefing-cron-setup.md`) không gãy. `read-briefing` được trỏ về reader chung và đọc slice `briefing` của artifact mới. `BRIEFING_JOB_NAME` hiện tại (`morning-briefing-aggregator`) được giữ làm job name để back-compat (reader resolve theo job name này); hằng số có thể rename biến cho rõ nghĩa nhưng **giá trị string giữ nguyên**.

**Hạ tầng tái dùng nguyên (không sửa):** `app/routes.ts` (thêm 4 route mới nếu chưa có: `DEV_ROUTE`, `INBOX_ROUTE`, `CONTENT_ROUTE`, `OPS_ROUTE`), `nav-rail.tsx` + `nav-items.tsx`, PageTransition "Depth", motion gate, Living Orb, `GlassSlab`, `--ae-*` tokens, `app/command-palette/index.tsx` (catalog).

## 5. Các màn — chi tiết

> Mỗi section khai báo: **nguồn sống** (wired) hoặc **empty-state** (khung + "Chưa có nguồn …"). Aggregator **omit** section không có nguồn; store coi missing/empty là empty-state. Không số liệu giả.

### 5.1 — Dev & DevOps cockpit (`DEV_ROUTE`) — nguồn mạnh nhất

- **Server vitals (wired):** skill `*-server-manage` (`hypertekvn-main-server-manage`, `h-workspace-server-manage`) → name/status/cpu/mem/disk mỗi host. Micro-viz ring/sparkline.
- **Deploys / incidents / logs (wired-lite):** deploy gần nhất + vài dòng log tail mà server skill xuất được; nếu không có → empty-state.
- Artifact keys: `dev.servers[]`, `dev.deploys[]`, `dev.incidents[]`.

### 5.2 — Inbox + CRM (`INBOX_ROUTE`) — nửa thật

- **Email triage (wired):** skill `google-workspace` → unread count, thread cần trả lời, sender/subject/snippet. Danh sách read-only, **không gửi**.
- **Deal pipeline (empty-state):** chưa có CRM native → render khung cột pipeline với `"Chưa có nguồn CRM"`. Key có mặt nhưng rỗng.
- Artifact keys: `inbox.threads[]`, `inbox.deals[]`.

### 5.3 — Content engine (`CONTENT_ROUTE`) — phần lớn empty-state

- **Calendar đa kênh + idea→nháp→lịch (empty-state):** chưa có store nội dung → render khung calendar đa kênh + bảng idea với `"Chưa có nguồn nội dung"`.
- **Sự kiện lịch hôm nay (wired, optional reuse):** có thể surface event `google-workspace` làm nền time-grid để màn không trống trơn.
- Artifact keys: `content.calendar[]`, `content.ideas[]`.

### 5.4 — Vận hành & Tài chính (`OPS_ROUTE`) — một phần thật

- **Lịch & tasks (wired):** event `google-workspace` + task/deadline từ cron/sessions/memory.
- **Second-brain search (wired-lite):** memory entries surface read-only.
- **Finance ledger (empty-state):** chưa có nguồn tài chính → KPI tiles + khung ledger với `"Chưa có nguồn tài chính"`.
- Artifact keys: `ops.calendar[]`, `ops.tasks[]`, `ops.finance{}`, `ops.notes[]`.

### 5.5 — Schema artifact hợp nhất (`references/company-os-schema.json`)

Superset **cộng dồn** — HUD/Brief không đụng. Mọi section mới **optional**; aggregator omit cái không source được; store coi missing/empty là empty-state.

```
{
  generatedAt, greetingName,                                  // cũ
  priorities[], servers[], bento{}, feed[], vitals{},         // briefing cũ — HUD/Brief vẫn đọc
  dev:    { servers[], deploys[], incidents[] },              // MỚI
  inbox:  { threads[], deals[] },                             // MỚI
  content:{ calendar[], ideas[] },                            // MỚI
  ops:    { calendar[], tasks[], finance{}, notes[] }         // MỚI
}
```

### 5.6 — Default theme = Light "Arctic Glass"

- First-run paint hiện ép Dark tại [desktop-controller.tsx](../../apps/desktop/src/app/desktop-controller.tsx) (`setMode('dark')` trong effect `aether-default-applied`). Đổi thành `setMode('light')`. Phần còn lại đã default light (`normalizeMode` → `'light'`, context default `mode: 'light'`).
- Lựa chọn người dùng vẫn thắng & lưu (effect chỉ chạy first-run khi chưa có key `aether-default-applied`). Toggle Dark vẫn còn ở Settings → Appearance + ⌘K.
- Cập nhật test đang assert first-run paint Dark → assert `setMode('light')`.

## 6. Data flow & prompt-cache

- Mỗi trụ cột: mount → `load<Pillar>()` → `readLatestCompanyOs()` (resolve cron job theo job name → latest run → `getSessionMessages` → parse JSON → trả artifact) → store set slice + status.
- Nút **"Làm mới"** re-read latest run. Freshness = cadence cron (một job duy nhất). **Không** poll hội thoại, **không** `message.delta`, **không** `appendAssistantDelta`.
- Reader chung được dùng lại bởi cả 4 store + slice `briefing` (HUD/Brief). Cân nhắc cache nhẹ artifact đã parse trong một khoảng ngắn để tránh fetch lặp khi nhiều màn mount — quyết ở writing-plans.
- **Tuyệt đối không** subscribe delta ở 4 màn này; chỉ Chat (SP-0) được stream.
- Reconnect/paused overlay: kế thừa hành vi shell SP-0 (`$gatewayState`).

## 7. Error / edge handling

- Lỗi REST mỗi màn → inline error trong GlassSlab + "Thử lại"; không crash shell.
- Chưa có artifact (cron chưa chạy lần nào) → empty-state `"Chưa có bản tổng hợp — cron chưa chạy"`.
- Section thiếu nguồn → empty-state riêng từng section (không làm hỏng section có nguồn — degrade gracefully).
- Artifact parse fail / sai schema → status `error` + thông điệp rõ; không dựng dữ liệu một phần sai.
- Mất kết nối gateway → paused overlay SP-0; màn vẫn thử đọc REST nếu backend còn sống.

## 8. Testing

- **Unit (vitest + jsdom):** mỗi store có test action (mock `readLatestCompanyOs`, assert chọn đúng slice + empty/error path). Mỗi màn ≥ 1 render test + 1 interaction test (mock reader).
- **Prompt-cache guard test (cứng):** mỗi màn có test khẳng định **không** subscribe delta / **không** gọi `appendAssistantDelta` (mount màn, assert handler stream không được gọi).
- **Parser/back-compat:** fixture `company-os` validate qua guard schema mới; **fixture briefing cũ vẫn pass** (HUD/Brief không gãy).
- **Light theme:** cập nhật test first-run paint → assert `setMode('light')`.
- **⌘K:** test catalog chứa 4 route mới; điều hướng item gọi navigate đúng route.
- **E2E desktop:** tái dùng harness `scripts/test-desktop.mjs` + `electron/*.test.cjs` smoke mỗi route render được trong shell thật.
- Giữ test xanh giữa mỗi slice màn (stub→real từng cái).

## 9. Decomposition → plans

Spec này phủ 5 deliverable nhưng **quá lớn cho một implementation plan**. writing-plans tách thành chuỗi plan độc lập, **1 plan / slice**, theo thứ tự phụ thuộc:

1. **Foundation tổng hợp** — skill `company-os-aggregator` (evolve `morning-briefing-aggregator` tại chỗ, **giữ tên cron job**) + `references/company-os-schema.json` + `domain/company-os/read-company-os.ts` (+ generalize `read-briefing` để dùng lại reader) + fixtures + parser/back-compat test. **Chưa có màn.** Đây là nền cho 4 màn sau.
2. **Default light theme** — đổi `desktop-controller.tsx` (`setMode('dark')`→`'light'`) + cập nhật test. (Nhỏ; có thể land đầu hoặc gộp Foundation.)
3. **Dev cockpit** — store + screen (nguồn mạnh nhất, chứng minh pattern end-to-end).
4. **Inbox + CRM** — store + screen.
5. **Vận hành & Tài chính** — store + screen.
6. **Content engine** — store + screen (nhiều empty-state nhất, ít rủi ro, làm cuối).

Mỗi plan màn: tạo `domain/<pillar>/<pillar>-store.ts` (+test) → tạo `ui/screens/<pillar>-screen.tsx` (+render/interaction/guard test) → thêm route vào `app/routes.ts` + `nav-items` nếu cần → thay stub trong `aether-shell.tsx` → mở rộng catalog ⌘K → commit.

## 10. Self-Review (đối chiếu mục tiêu)

- **5 deliverable (4 màn cockpit + 1 hạ tầng aggregator) + default light:** §5.1–5.6 — đủ. ✓
- **Read-only aggregate, honest empty-states:** §2 mô hình + §5 source-vs-empty mỗi section; không số liệu giả. ✓
- **Một aggregator hợp nhất, một cron, một artifact:** §4 + §5.5 schema superset cộng dồn; HUD/Brief back-compat. ✓
- **0 thay đổi Python core:** mọi màn đọc cron-artifact + REST sẵn có; năng lực mới ở rìa (skill+cron). ✓
- **Prompt-cache (cứng):** §6 + §8 guard test mọi màn; chỉ đọc cron-run đã kết thúc. ✓
- **Brand/token/localization/layering:** §3 ràng buộc kế thừa SP-1/SP-0. ✓
- **Back-compat cron job name:** §4 skill-identity — giữ string job name, tránh gãy cron đã đăng ký. ✓
- **Decomposition:** §9 — 1 plan/slice, Foundation trước, Content cuối. ✓
- **Non-goals rõ:** §2 — không CRUD/store/Python; CRM/finance/content backend & Voice/Onboarding để sau. ✓

## 11. Tham chiếu

- SP-1 (daily-driver): [docs/specs/2026-06-26-aether-sp1-daily-driver.md](./2026-06-26-aether-sp1-daily-driver.md).
- SP-0 (nền móng): [docs/specs/2026-06-26-aether-sp0-design.md](./2026-06-26-aether-sp0-design.md).
- Program-spec (16 màn, kiến trúc, reuse-vs-rebuild, §5 bản đồ 4 trụ cột, §7 cơ chế cron-artifact): [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md).
- Cơ chế tham chiếu (đọc cron-artifact): `apps/desktop/src/aether/domain/briefing/read-briefing.ts`, `briefing-schema.ts`, `parse-briefing.ts`.
- Skill mẫu: `skills/productivity/morning-briefing-aggregator/SKILL.md`, `skills/productivity/google-workspace/`. Cron setup: `docs/aether-briefing-cron-setup.md`.
- Default theme: `apps/desktop/src/app/desktop-controller.tsx`, `apps/desktop/src/themes/context.tsx`.
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`.
