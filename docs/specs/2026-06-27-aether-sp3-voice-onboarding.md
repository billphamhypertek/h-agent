# AETHER Desktop — SP-3: Voice / Ambient + Onboarding (Design Spec)

> Spec thiết kế · 2026-06-27 · trạng thái: ✅ **đã triển khai xong** — cả 3 slice (orb foundation + Voice + Onboarding) đã merge vào `main`; **đóng trọn 16 màn**. Plans: [SP-3.1 orb](../plans/2026-06-27-aether-sp3-1-orb-foundation.md) · [SP-3.2 voice](../plans/2026-06-27-aether-sp3-2-voice-screen.md) · [SP-3.3 onboarding](../plans/2026-06-27-aether-sp3-3-onboarding-screen.md). Kiểm chứng (2026-06-28): suite `src/aether` xanh (411 test), `tsc` sạch.
> Ngôn ngữ: tiếng Việt + thuật ngữ kỹ thuật tiếng Anh.

## 1. Bối cảnh

SP-0 (4 màn lõi + nền WebGL), **SP-1 daily-driver** (8 màn cấu hình/vận hành + ⌘K), và **SP-2 4 trụ cột** (Dev/Inbox/Ops/Content + aggregator hợp nhất + default light) đã hoàn tất và merge. Bản đồ 16 màn ([program-spec](./2026-06-25-aether-desktop-design.md) §5) còn **2 màn cuối** chưa dựng: **màn 15 — Voice / Ambient** và **màn 16 — Onboarding**. **SP-3 đóng trọn 16 màn.**

**SP-3 = sprint presentation-layer thuần.** Runtime của *cả hai* màn **đã tồn tại và đã tôi luyện** trong renderer:
- **Voice:** vòng hands-free hoàn chỉnh ở [use-voice-conversation.ts](../../apps/desktop/src/app/chat/composer/hooks/use-voice-conversation.ts) (mic → `transcribeAudio` → gửi → `speakText` → lặp), [voice-activity.tsx](../../apps/desktop/src/app/chat/composer/voice-activity.tsx), store `$voicePlayback` (`idle|preparing|speaking`, source `'voice-conversation'`), bridge `transcribeAudio`/`speakText` ([aether-api.ts](../../apps/desktop/src/aether-api.ts)), và handler gateway `voice.record/toggle/tts` ở [aether_cli/voice.py](../../aether_cli/voice.py).
- **Onboarding:** state machine first-run hoàn chỉnh ở [store/onboarding.ts](../../apps/desktop/src/store/onboarding.ts) (cờ `configured`, `dismissFirstRunOnboarding`, model picker, provider OAuth, lưu API key, manual mode) + overlay legacy [desktop-onboarding-overlay.tsx](../../apps/desktop/src/components/desktop-onboarding-overlay.tsx).

Vì vậy SP-3 chỉ **dựng vỏ AETHER** (restyle qua token) và **nối dây mỏng** vào runtime cũ — đúng triết lý hybrid của program-spec §3.3 ("reuse runtime đã tôi luyện, build mới shell/màn/orb"). **0 thay đổi Python core.**

Lộ trình tổng: **SP-0** (xong) → **SP-1 daily-driver** (xong) → **SP-2 4 trụ cột** (xong) → **SP-3 Voice + Onboarding** (**xong** — đóng trọn 16 màn). **Toàn bộ bản đồ 16 màn đã dựng.**

## 2. Mục tiêu & Phi-mục-tiêu

**Mục tiêu (SP-3):** 3 deliverable.
- **Màn 15 — Voice / Ambient** (`VOICE_ROUTE = '/voice'`): buồng lái hands-free — Living Orb lớn state-reactive + transcript + control Nghe/Dừng — thao tác **trên phiên Chat đang active**, tái dùng vòng `useVoiceConversation` + `$voicePlayback`.
- **Màn 16 — Onboarding**: wizard first-run vỏ AETHER nối thẳng `store/onboarding.ts`; **gate first-run bỏ qua được**, mở lại qua ⌘K.
- **Orb state mới `listening` + `speaking`**: mở rộng `motion-store` + Living Orb (GL + CSS fallback) để orb phản ứng đúng khi đang nghe / đang đáp.
- Mỗi deliverable ≥ test phủ render + interaction + state-derive theo §8.

**Mô hình (đã chốt — 4 quyết định brainstorm):**
1. **Voice = hands-free trên 1 chat session thật** (Phương án A): màn Voice chỉ là *presentation*, tái dùng runtime voice; Voice **được phép stream** vì nó *là* bề mặt hội thoại (như Chat).
2. **Onboarding = gate first-run, bỏ qua được, mở lại từ ⌘K**; "ready" = ≥1 provider+model hợp lệ; bước kênh/giọng tùy chọn.
3. **Giữ 0 Python core** — reuse handler `voice.*` sẵn có; gap (nếu có) → sub-project riêng, không phình SP-3.
4. **Voice thao tác trên phiên Chat đang active**; chưa có phiên → tự mở phiên mới.

**Phi-mục-tiêu (KHÔNG làm ở SP-3):**
- **Viết lại runtime** STT/TTS/VAD/voice-conversation loop hoặc onboarding flow/OAuth — chỉ restyle + wire (Phương án B/C bị loại ở brainstorm).
- **Thêm/sửa Python core** (`aether_cli/*`, gateway handler) — 0 thay đổi. Năng lực voice đã ở gateway; SP-3 chỉ là renderer.
- **Stream ở màn non-chat khác** — luật prompt-cache SP-2 giữ nguyên; Voice là **ngoại lệ có giới hạn & ghi rõ** (§6).
- Voice analytics, đa-ngôn-ngữ STT mới, wake-word, đào tạo giọng riêng — sau.
- Onboarding multi-step phức tạp (import workspace, team invite, billing) — sau.

## 3. Ràng buộc kế thừa (hard rules — copy từ SP-2, không paraphrase)

- **Giữ runtime đã tôi luyện.** Không viết lại streaming/tool-call/terminal/gateway WS/voice-conversation/onboarding-flow — restyle qua token/className.
- **Brand `#07397d`** (deep navy). Tokens, không literal. **Không hardcode màu ngoài hệ `--ae-*` / `--dt-*`.**
- **Localization (cứng):** UI tiếng Việt. **KHÔNG dịch "Agent" → "Đại lý".** Giữ "Agent". Platform name hiển thị: **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety (cứng, có 1 ngoại lệ ghi rõ):** màn non-chat **KHÔNG** subscribe `message.delta`/`reasoning.delta`/`thinking.*`, **KHÔNG** poll hội thoại live. **Ngoại lệ duy nhất:** màn **Voice** (§6) — vì nó lái một phiên Chat thật nên dùng đúng đường stream SP-0. Onboarding tuyệt đối không stream.
- **Tôn trọng `prefers-reduced-motion`** + motion gate SP-0 ở mọi transition/overlay/orb. Orb state mới phải tôn trọng gate (false → fallback CSS, không mount Canvas).
- **`--ae-*` geometry mode-independent**; chỉ color tokens fork dưới `[data-aether-mode='light']`. `--ae-*` chỉ resolve khi `[data-aether-theme='aether']`.
- **Layering SP-0:** màn dùng `.ae-screen-bare` (transparent, không tự pad, `min-w-0`); content wrapper sở hữu **một** gutter `--ae-page-*`. Padding bake qua `GlassSlab size`. Không double-pad.
- **Geometry tokens:** chỉ tokenize arbitrary `[...]` Tailwind values; shorthand chuẩn (`mt-3`, `gap-1.5`) giữ nguyên.
- **0 thay đổi Python core** (mở rộng hard-rule SP-2): năng lực mới ở rìa renderer.

## 4. Kiến trúc — Phương án A (reuse hook/store, restyle vỏ)

```
aether/domain/motion/motion-store.ts     EDIT: OrbState += 'listening' | 'speaking'; deriveOrbState mở rộng (§5)
aether/domain/voice/voice-presence.ts    NEW (mỏng): $voiceListening atom + selector transcript của phiên active
aether/ui/screens/voice-screen.tsx       NEW: presentation; gọi useVoiceConversation() + subscribe $voicePlayback
aether/ui/screens/onboarding-screen.tsx  NEW: vỏ AETHER nối store/onboarding.ts (state machine cũ)
aether/ui/motion/living-orb-gl.tsx       EDIT: STATE_VALUE += listening/speaking; shaders/orb.ts nhận uniform mới
aether/ui/orb/living-orb.tsx             EDIT: CSS fallback class cho 2 state mới
app/routes.ts                            EDIT: + VOICE_ROUTE='/voice'; AppView/AppRouteId += 'voice'
aether/ui/shell/nav-items.tsx            EDIT: + mục Voice (.tsx, KHÔNG .ts)
aether/ui/shell/aether-shell.tsx         EDIT: + <Route> /voice
app/command-palette/index.tsx            EDIT: + nav Voice, + "Mở lại Onboarding"
app/desktop-controller.tsx               EDIT: gate first-run trỏ sang onboarding-screen AETHER (thay overlay legacy)
```

**Quy ước (kế thừa SP-2 §4):**
- Màn = root `.ae-screen-bare flex h-full min-w-0 flex-col`; **không** `p-[...]`, **không** background riêng. Card/section dùng `<GlassSlab size>`.
- **Presentation tách khỏi logic:** màn AETHER chỉ render + bind action; mọi state machine/loop nằm ở hook/store cũ được reuse. Cẩn thận **không** kéo style legacy vào — chỉ gọi hành vi, vẽ lại bằng `--ae-*`.
- **Reuse, không port:** Voice dùng trực tiếp `useVoiceConversation`, `$voicePlayback`, `voice-activity`; Onboarding dùng trực tiếp `store/onboarding.ts`. Không tái tạo trong `aether/domain` (Phương án B loại).

**Hạ tầng tái dùng nguyên (không sửa):** `nav-rail.tsx`, PageTransition "Depth", motion gate (`use-motion-enabled`), `AetherCanvas`, `GlassSlab`, `--ae-*` tokens, session store (transcript phiên active), `transcribeAudio`/`speakText`/`getGlobalModelOptions` bridge, `store/onboarding.ts`, `use-mic-recorder`.

## 5. Các màn — chi tiết

### 5.1 — Màn 15: Voice / Ambient (`VOICE_ROUTE = '/voice'`)

- **Phiên:** thao tác trên **phiên Chat đang active**; chưa có phiên → tự mở phiên mới. Transcript = tin nhắn của chính phiên đó, đọc read-only từ session store (reuse).
- **Bố cục (trên xuống):**
  1. **Living Orb lớn** giữa màn — state-reactive `idle | listening | thinking | speaking` (§5.3).
  2. **Transcript** cuộn (bạn / agent) của phiên active.
  3. **Control bar:** nút **Nghe / Dừng** (toggle hands-free) · mic-level meter (từ `use-mic-recorder` `onLevel`) · chỉ báo giọng + provider hiện tại · link "Settings → Voice".
- **Runtime reuse:** `useVoiceConversation()` (vòng mic→transcribe→gửi→speak→lặp), `$voicePlayback`, `voice-activity` viz. **Không** tự viết STT/TTS/VAD.
- **Stream:** dùng **đúng đường stream SP-0** của phiên Chat (§6). Voice + Chat là hai bề mặt stream duy nhất.
- **Empty/disabled (trung thực):** chưa cấu hình TTS → vẫn nghe + phiên âm + hiển thị text, báo `"Chưa cấu hình giọng đọc — bật ở Settings → Voice"`; gateway paused → khóa hands-free + paused overlay SP-0; mic lỗi → §7.

### 5.2 — Màn 16: Onboarding (gate first-run + ⌘K)

- **Vỏ AETHER full-screen wizard** nối thẳng `store/onboarding.ts` (state machine cũ). **Restyle, không viết lại flow.**
- **Bước:** provider → model → API key / OAuth → *(tùy chọn)* kết nối kênh → *(tùy chọn)* giọng & tính cách (`display.personality`) → **Sẵn sàng**.
- **Gate:** first-run khi `onboarding.configured === false` → hiện wizard **trước** shell (reuse gate hiện ở [desktop-controller.tsx](../../apps/desktop/src/app/desktop-controller.tsx), đổi overlay legacy → màn AETHER). Nút **"Bỏ qua"** → `dismissFirstRunOnboarding` → vào app.
- **"Ready" = ≥1 provider+model hợp lệ** (cờ `configured`); bước kênh/giọng **tùy chọn, bỏ qua được**.
- **Mở lại** bất cứ lúc nào qua **⌘K** ("Mở lại Onboarding", manual mode — reuse `onboarding.manual`).
- **Trình bày:** Living Orb presence, Orbitron heading, brand navy, `GlassSlab` — đồng nhất SP-0; tôn trọng motion gate.

### 5.3 — Orb state `listening` / `speaking`

- `motion-store.ts`: `OrbState` thêm `'listening'` (mic đang thu) + `'speaking'` (TTS đang phát). `deriveOrbState` ưu tiên: **`speaking` > `listening` > `thinking` > `idle` > `paused`**.
- **Nguồn:** `speaking` từ `$voicePlayback.status === 'speaking'`; `listening` từ `$voiceListening` (atom mới ở `aether/domain/voice/voice-presence.ts`, set bởi `useVoiceConversation` khi mic active). **Không** re-trigger LLM.
- `living-orb-gl.tsx` `STATE_VALUE` (hiện `{ thinking, idle, paused }`) thêm `listening`/`speaking`; `shaders/orb.ts` nhận uniform mới (intensity/hue khác cho mỗi state); `living-orb.tsx` (CSS fallback) thêm class state mới.
- *Ghi chú phạm vi:* program-spec chỉ nêu `listening`; thêm `speaking` để màn Voice phân biệt "đang nghe" vs "đang đáp" — bounded, ít rủi ro, cùng một cơ chế.

## 6. Data flow & prompt-cache

- **Voice (ngoại lệ stream có giới hạn & ghi rõ):** Voice lái một **phiên Chat thật** nên dùng **đúng đường stream SP-0** (`message.*`/`tool.*` của phiên active). Đây là ngoại lệ **duy nhất** của luật "màn non-chat không stream" (SP-2 §3) — chỉ **Voice + Chat** stream; **không màn nào khác đổi hành vi**. Voice **không** tạo LLM call phụ ngoài phiên đang nói (vòng `useVoiceConversation` gửi vào đúng phiên đó).
- **Onboarding (prompt-cache-safe tuyệt đối):** chỉ REST config / `getGlobalModelOptions` + provider OAuth; **không** subscribe delta, **không** hội thoại LLM, **không** `appendAssistantDelta`.
- **Orb:** `listening`/`speaking` derive từ tín hiệu voice **local** (`$voicePlayback`, `$voiceListening`); không chạm LLM.
- Reconnect/paused overlay: kế thừa hành vi shell SP-0 (`$gatewayState`); Voice khóa hands-free khi paused.

## 7. Error / edge handling

- **Voice — mic:** denied / no-mic / in-use → inline error trong GlassSlab, reuse copy `MicRecorderErrorCopy` (`use-mic-recorder`); không crash shell.
- **Voice — TTS:** provider chưa cấu hình / lỗi phát → degrade về text-only + thông điệp trung thực `"Chưa cấu hình giọng đọc"`; không treo trạng thái `speaking` (reuse guard stall của `voice-playback.ts`).
- **Voice — phiên:** không có phiên & không tạo được → inline error + "Thử lại".
- **Voice — gateway:** mất kết nối → khóa hands-free + paused overlay SP-0.
- **Onboarding:** OAuth / API-key lỗi → reuse error state cũ (`isProviderSetupErrorMessage`); luôn có **"Bỏ qua"**; đóng wizard không làm hỏng shell.

## 8. Testing

- **Voice screen (vitest + jsdom):** render test (mock `useVoiceConversation`) + interaction (toggle **Nghe** gọi start/stop của hook) + orb-state test (`listening`/`speaking` reflect đúng). **Không** prompt-cache-guard (được phép stream), **nhưng** có test khẳng định màn **chỉ** lái phiên active, **không** spawn LLM call phụ ngoài vòng voice.
- **Onboarding screen:** render gate (hiện khi `onboarding.configured === false`) + interaction (đủ provider+model → `onCompleted`/`configured`; **"Bỏ qua"** → `dismissFirstRunOnboarding`) + reopen qua ⌘K (manual mode).
- **motion-store:** unit test `deriveOrbState` cho state mới + **thứ tự ưu tiên** speaking>listening>thinking>idle>paused; cập nhật test `STATE_VALUE` của `living-orb-gl`.
- **⌘K:** catalog chứa **Voice** (navigate `VOICE_ROUTE`) + **"Mở lại Onboarding"** (mở manual); điều hướng/hành vi đúng.
- **Motion gate:** test orb state mới tôn trọng `prefers-reduced-motion` (false → fallback CSS, không mount Canvas).
- **E2E desktop:** tái dùng harness `scripts/test-desktop.mjs` + `electron/*.test.cjs` smoke `/voice` render trong shell thật.
- Giữ test xanh giữa mỗi slice.

## 9. Decomposition → plans

Spec này phủ 3 deliverable. writing-plans tách thành **1 plan / slice** theo thứ tự phụ thuộc:

1. **Orb foundation** — `motion-store` (`OrbState += listening|speaking`, `deriveOrbState` + thứ tự) + `aether/domain/voice/voice-presence.ts` (`$voiceListening`) + `living-orb-gl` `STATE_VALUE` + `shaders/orb.ts` + `living-orb.tsx` CSS fallback + tests. **Chưa có màn.** Nền cho Voice.
2. **Voice / Ambient screen** — `voice-screen.tsx` (+render/interaction/orb-state test) → wire `useVoiceConversation`/`$voicePlayback`/mic-level + transcript phiên active → `VOICE_ROUTE` vào `app/routes.ts` + `AppView`/`AppRouteId` + `nav-items` + `<Route>` trong `aether-shell.tsx` → catalog ⌘K → commit.
3. **Onboarding screen** — `onboarding-screen.tsx` (vỏ AETHER trên `store/onboarding.ts`) + đổi gate first-run ở `desktop-controller.tsx` (overlay legacy → màn AETHER) + ⌘K "Mở lại Onboarding" + tests → commit.

Thứ tự: **1 → 2** (Voice phụ thuộc orb foundation); **3 độc lập** (song song hoặc cuối).

## 10. Self-Review (đối chiếu mục tiêu)

- **3 deliverable (Voice + Onboarding + orb listening/speaking):** §5.1–5.3 — đủ. ✓
- **Reuse runtime, restyle vỏ (Phương án A):** §4 — Voice dùng `useVoiceConversation`/`$voicePlayback`; Onboarding dùng `store/onboarding.ts`; không viết lại loop/flow. ✓
- **0 thay đổi Python core:** §2/§3 — handler `voice.*` đã có; SP-3 chỉ renderer. ✓
- **Voice trên phiên Chat active, được phép stream (ngoại lệ ghi rõ):** §5.1 + §6 — chỉ Voice+Chat stream, màn khác không đổi. ✓
- **Onboarding gate bỏ qua được + ⌘K reopen, ready = provider+model:** §5.2. ✓
- **Orb listening/speaking + thứ tự ưu tiên + tôn trọng motion gate:** §5.3 + §8. ✓
- **Brand/token/localization/layering/reduced-motion:** §3 ràng buộc kế thừa SP-2/SP-0. ✓
- **Đóng trọn 16 màn:** §1 — màn 15 + 16 là hai màn cuối. ✓
- **Decomposition:** §9 — 1 plan/slice, orb foundation trước, Voice phụ thuộc, Onboarding độc lập. ✓
- **Non-goals rõ:** §2 — không viết lại runtime/Python; không stream màn khác; voice analytics/wake-word/onboarding phức tạp để sau. ✓

## 11. Tham chiếu

- SP-2 (4 trụ cột): [docs/specs/2026-06-26-aether-sp2-pillars.md](./2026-06-26-aether-sp2-pillars.md).
- SP-1 (daily-driver): [docs/specs/2026-06-26-aether-sp1-daily-driver.md](./2026-06-26-aether-sp1-daily-driver.md).
- SP-0 (nền móng + bảng map orb-state §5): [docs/specs/2026-06-26-aether-sp0-design.md](./2026-06-26-aether-sp0-design.md).
- Program-spec (16 màn §5 — màn 15 Voice/Ambient, màn 16 Onboarding; reuse-vs-rebuild §3.3; orb-state wiring): [docs/specs/2026-06-25-aether-desktop-design.md](./2026-06-25-aether-desktop-design.md).
- Voice runtime (reuse): `apps/desktop/src/app/chat/composer/hooks/use-voice-conversation.ts`, `apps/desktop/src/app/chat/composer/voice-activity.tsx`, `apps/desktop/src/app/chat/composer/hooks/use-mic-recorder.ts`, `apps/desktop/src/lib/voice-playback.ts`, `apps/desktop/src/store/voice-playback.ts`, bridge `transcribeAudio`/`speakText` ở `apps/desktop/src/aether-api.ts`, gateway `aether_cli/voice.py`.
- Onboarding runtime (reuse): `apps/desktop/src/store/onboarding.ts`, `apps/desktop/src/components/desktop-onboarding-overlay.tsx` (overlay legacy — thay bằng màn AETHER), gate ở `apps/desktop/src/app/desktop-controller.tsx`.
- Orb / motion: `apps/desktop/src/aether/domain/motion/motion-store.ts`, `apps/desktop/src/aether/ui/motion/living-orb-gl.tsx`, `apps/desktop/src/aether/ui/motion/shaders/orb.ts`, `apps/desktop/src/aether/ui/orb/living-orb.tsx`, `apps/desktop/src/aether/ui/motion/aether-canvas.tsx`.
- Routing / nav / ⌘K: `apps/desktop/src/app/routes.ts`, `apps/desktop/src/aether/ui/shell/nav-items.tsx`, `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, `apps/desktop/src/app/command-palette/index.tsx`.
- Memory: `hypertek-brand-color`, `hypertek-naming-localization`, `aether-total-rebrand`, `aether-desktop-redesign`.
