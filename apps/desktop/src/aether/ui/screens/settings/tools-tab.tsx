import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $computerUse,
  $computerUseStatus,
  $toolsets,
  $toolsetsStatus,
  grantComputerUse,
  loadComputerUse,
  loadToolsets,
  setToolsetEnabled
} from '@/aether/domain/settings/toolsets-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ToolsTab({ onToggle }: { onToggle?: (name: string, enabled: boolean) => void }) {
  const status = useStore($toolsetsStatus)
  const toolsets = useStore($toolsets)
  const cuStatus = useStore($computerUseStatus)
  const cu = useStore($computerUse)

  useEffect(() => {
    if ($toolsetsStatus.get() === 'idle') {
      void loadToolsets()
    }

    if ($computerUseStatus.get() === 'idle') {
      void loadComputerUse()
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">BỘ CÔNG CỤ</div>
        {(status === 'loading' || status === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải công cụ…</div>
        )}
        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được bộ công cụ.</div>
            <button
              className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)]"
              onClick={() => void loadToolsets()}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        )}
        {status === 'empty' && <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có bộ công cụ nào.</div>}
        {status === 'ready' &&
          (toolsets ?? []).map(ts => (
            <label className="flex items-center gap-3 text-[12.5px]" key={ts.name}>
              <input
                checked={ts.enabled}
                data-testid={`ae-toolset-${ts.name}`}
                onChange={e =>
                  onToggle ? onToggle(ts.name, e.target.checked) : void setToolsetEnabled(ts.name, e.target.checked)
                }
                type="checkbox"
              />
              <span className="flex-1 font-semibold text-[color:var(--ae-ink)]">{ts.label}</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{ts.description}</span>
            </label>
          ))}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          ĐIỀU KHIỂN MÁY TÍNH
        </div>
        {(cuStatus === 'loading' || cuStatus === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang kiểm tra trạng thái…</div>
        )}
        {cuStatus === 'error' && (
          <div className="text-[12px] text-[color:var(--ae-warn)]">Không kiểm tra được trạng thái điều khiển máy tính.</div>
        )}
        {cuStatus === 'ready' && cu && (
          <>
            <div className="text-[12.5px] text-[color:var(--ae-ink)]">
              Trạng thái:{' '}
              <b style={{ color: cu.ready ? 'var(--ae-ok)' : 'var(--ae-warn)' }}>
                {cu.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
              </b>
            </div>
            {cu.can_grant && !cu.ready && (
              <button
                className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)]"
                onClick={() => void grantComputerUse()}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Cấp quyền
              </button>
            )}
          </>
        )}
      </GlassSlab>
    </div>
  )
}
