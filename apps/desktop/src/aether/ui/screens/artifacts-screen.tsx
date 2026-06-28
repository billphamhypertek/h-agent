import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $artifactQuery,
  $artifacts,
  $artifactsStatus,
  $fileOutputs,
  $previewStatus,
  $selectedArtifact,
  $selectedPreview,
  loadArtifacts,
  openArtifact,
  searchArtifacts,
} from '@/aether/domain/artifacts/artifacts-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_LABEL = 'text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

function messageText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map(part =>
        typeof part === 'string'
          ? part
          : part && typeof part === 'object' && 'text' in part && typeof (part as { text: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '',
      )
      .join('')
  }

  return ''
}

export function ArtifactsScreen() {
  const artifacts = useStore($artifacts)
  const status = useStore($artifactsStatus)
  const query = useStore($artifactQuery)
  const selected = useStore($selectedArtifact)
  const preview = useStore($selectedPreview)
  const previewStatus = useStore($previewStatus)
  const fileOutputs = useStore($fileOutputs)

  useEffect(() => {
    if ($artifactsStatus.get() === 'idle') {
      void loadArtifacts()
    }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[22px] font-semibold leading-[1.1]">Thư viện Artifacts</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">
            Phiên làm việc và tệp kết quả — xem lại nhanh.
          </div>
        </div>
        <span
          className="flex-none rounded-full px-3 py-1 text-[11px] font-semibold"
          data-testid="ae-readonly-badge"
          style={{
            background: 'linear-gradient(180deg,rgba(120,195,245,.12),rgba(120,195,245,.03))',
            border: '1px solid rgba(120,200,255,.28)',
            color: 'var(--ae-azure-soft)',
          }}
        >
          Chỉ đọc
        </span>
      </div>

      <div className="z-[2] mt-4">
        <input
          className="w-full rounded-[12px] bg-[rgba(8,22,44,.5)] px-4 py-2.5 text-[13px] text-white outline-none"
          onChange={e => void searchArtifacts(e.target.value)}
          placeholder="Tìm trong artifacts…"
          style={{ border: '1px solid rgba(120,200,255,.18)' }}
          type="search"
          value={query}
        />
      </div>

      {fileOutputs && fileOutputs.length > 0 && (
        <div className="z-[2] mt-3">
          <div className={SECTION_LABEL}>TỆP KẾT QUẢ · CHỈ ĐỌC</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {fileOutputs.map(f => (
              <span
                className="rounded-[10px] px-3 py-1.5 text-[11.5px] text-[#D7ECFA]"
                key={f.path}
                style={{ background: 'rgba(120,195,245,.06)', border: '1px solid rgba(120,200,255,.12)' }}
              >
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-3.5">
        <div className="min-h-0 overflow-auto">
        {status === 'loading' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                className="h-[96px] animate-pulse rounded-[14px] bg-[rgba(120,195,245,.06)]"
                data-testid="ae-artifact-skeleton"
                key={i}
              />
            ))}
          </div>
        )}

        {status === 'empty' && (
          <GlassSlab className="text-center" size="lg">
            <div className={SECTION_LABEL}>THƯ VIỆN TRỐNG</div>
            <div className="mt-2 text-sm text-[color:var(--ae-dim)]">
              Chưa có artifact nào. Các phiên làm việc sẽ xuất hiện ở đây.
            </div>
          </GlassSlab>
        )}

        {status === 'error' && (
          <GlassSlab className="flex flex-col items-center gap-3 text-center" size="lg">
            <div className="text-sm text-[color:var(--ae-warn)]">Không tải được thư viện artifacts.</div>
            <button
              className="rounded-[11px] px-4 py-2 text-[13px] font-semibold text-white"
              onClick={() => void searchArtifacts($artifactQuery.get())}
              style={{
                background: 'linear-gradient(180deg,rgba(74,163,255,.18),rgba(120,195,245,.05))',
                border: '1px solid rgba(120,210,255,.34)',
              }}
              type="button"
            >
              Thử lại
            </button>
          </GlassSlab>
        )}

        {status === 'ready' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {(artifacts ?? []).map(a => (
              <button
                className="flex flex-col gap-2 rounded-[14px] p-[14px] text-left"
                data-testid="ae-artifact-card"
                key={a.id}
                onClick={() => void openArtifact(a.id)}
                style={{
                  background: 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))',
                  border: '1px solid rgba(120,200,255,.12)',
                }}
                type="button"
              >
                <div className="truncate text-[13px] font-semibold text-white">
                  {a.title ?? 'Phiên không tên'}
                </div>
                <div className="line-clamp-2 text-[11.5px] text-[color:var(--ae-dim)]">
                  {a.preview ?? '—'}
                </div>
                <div className="mt-auto flex items-center gap-2 text-[10.5px] text-[color:var(--ae-azure-soft)]">
                  {a.model && <span className="truncate">{a.model}</span>}
                  {a.message_count > 0 && <span>· {a.message_count} tin nhắn</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        </div>

        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="mb-2 flex items-center justify-between">
            <div className={SECTION_LABEL}>XEM TRƯỚC · CHỈ ĐỌC</div>
          </div>

          {previewStatus === 'idle' && (
            <div className="text-[12px] text-[color:var(--ae-dim)]">
              Chọn một artifact để xem nội dung tĩnh.
            </div>
          )}
          {previewStatus === 'loading' && (
            <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải…</div>
          )}
          {previewStatus === 'error' && (
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không mở được artifact.</div>
          )}
          {previewStatus === 'ready' && (
            <div className="flex min-h-0 flex-col gap-2" data-testid="ae-artifact-preview">
              <div className="text-[13px] font-semibold text-white">
                {selected?.title ?? 'Phiên không tên'}
              </div>
              <div className="text-[10.5px] text-[color:var(--ae-azure-soft)]">
                {selected?.model} · {selected?.message_count ?? 0} tin nhắn
              </div>
              <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-[12px] leading-[1.5] text-[#CFE2F7]">
                {(preview ?? []).map((m, i) => (
                  <p className="mb-2" key={i}>
                    <b className="text-[color:var(--ae-azure-soft)]">{m.role}: </b>
                    {messageText(m.content) || messageText(m.text)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </GlassSlab>
      </div>
    </div>
  )
}
