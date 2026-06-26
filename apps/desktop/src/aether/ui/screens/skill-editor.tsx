// apps/desktop/src/aether/ui/screens/skill-editor.tsx
import { useStore } from '@nanostores/react'

import {
  $editorContent,
  $editorSkill,
  $editorStatus,
  closeEditor,
  saveEditor,
  setEditorContent,
} from '@/aether/domain/skills/skills-content-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function SkillEditor() {
  const skill = useStore($editorSkill)
  const content = useStore($editorContent)
  const status = useStore($editorStatus)

  if (!skill) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[40] grid place-items-center bg-[rgba(2,12,29,.55)] backdrop-blur-sm"
      onClick={() => closeEditor()}
    >
      <GlassSlab
        className="flex max-h-[78vh] w-[min(720px,90vw)] flex-col gap-3"
        size="lg"
      >
        <div className="flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
          <div className="text-[13px] font-semibold text-white">
            Sửa skill · <span className="text-[color:var(--ae-azure-soft)]">{skill}</span>
          </div>
          <button
            aria-label="Đóng"
            className="rounded-[8px] px-2 py-1 text-[12px] text-[color:var(--ae-dim)]"
            onClick={() => closeEditor()}
            type="button"
          >
            Đóng
          </button>
        </div>

        {status === 'loading' && (
          <div className="text-[12px] text-[color:var(--ae-dim)]" onClick={e => e.stopPropagation()}>
            Đang tải nội dung…
          </div>
        )}

        {status === 'error' && (
          <div className="text-[12px]" onClick={e => e.stopPropagation()} style={{ color: 'var(--ae-warn)' }}>
            Không đọc/ghi được nội dung skill.
          </div>
        )}

        {status !== 'loading' && (
          <textarea
            className="min-h-[320px] flex-1 resize-none rounded-[10px] p-3 font-mono text-[12px] leading-[1.5] text-white outline-none"
            onChange={e => setEditorContent(e.target.value)}
            onClick={e => e.stopPropagation()}
            spellCheck={false}
            style={{ background: 'rgba(8,24,46,.6)', border: '1px solid rgba(120,200,255,.16)' }}
            value={content}
          />
        )}

        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
            disabled={status === 'saving'}
            onClick={() => void saveEditor()}
            style={{
              background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
              border: '1px solid rgba(120,210,255,.34)',
              color: 'var(--ae-azure-soft)',
            }}
            type="button"
          >
            {status === 'saving' ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </GlassSlab>
    </div>
  )
}
