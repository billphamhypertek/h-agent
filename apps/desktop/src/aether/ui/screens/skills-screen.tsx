// apps/desktop/src/aether/ui/screens/skills-screen.tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { openEditor } from '@/aether/domain/skills/skills-content-store'
import { $skills, $skillsStatus, loadSkills, toggleSkillEnabled } from '@/aether/domain/skills/skills-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { SkillInfo } from '@/types/aether'

import { SkillEditor } from './skill-editor'
import { SkillsHubPanel } from './skills-hub-panel'

function SkillCard({ skill }: { skill: SkillInfo }) {
  return (
    <GlassSlab className="flex flex-col gap-2" data-testid="ae-skill-card" size="sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white">{skill.name}</div>
          <div className="mt-1 line-clamp-2 text-[11.5px] leading-[1.35] text-[color:var(--ae-dim)]">
            {skill.description}
          </div>
        </div>
        <span
          className="flex-none rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.1em]"
          style={{
            background: 'rgba(120,195,245,.07)',
            border: '1px solid rgba(120,200,255,.18)',
            color: 'var(--ae-azure-soft)',
          }}
        >
          {skill.category}
        </span>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <button
          aria-checked={skill.enabled}
          aria-label={`${skill.enabled ? 'Tắt' : 'Bật'} ${skill.name}`}
          className="flex items-center gap-2 rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
          onClick={() => void toggleSkillEnabled(skill.name, !skill.enabled)}
          role="switch"
          style={{
            background: skill.enabled
              ? 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))'
              : 'rgba(120,195,245,.04)',
            border: `1px solid ${skill.enabled ? 'rgba(120,210,255,.34)' : 'rgba(120,200,255,.12)'}`,
            color: skill.enabled ? 'var(--ae-azure-soft)' : 'var(--ae-dim)',
          }}
          type="button"
        >
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: skill.enabled ? 'var(--ae-ok)' : 'var(--ae-dim)',
              boxShadow: skill.enabled ? '0 0 8px var(--ae-ok)' : 'none',
            }}
          />
          {skill.enabled ? 'Đã bật' : 'Đã tắt'}
        </button>
        <button
          className="rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
          onClick={() => void openEditor(skill.name)}
          style={{ background: 'rgba(120,195,245,.05)', border: '1px solid rgba(120,200,255,.14)', color: 'var(--ae-dim)' }}
          type="button"
        >
          Sửa
        </button>
      </div>
    </GlassSlab>
  )
}

export function SkillsScreen() {
  const skills = useStore($skills)
  const status = useStore($skillsStatus)

  useEffect(() => {
    if ($skillsStatus.get() === 'idle') {
      void loadSkills()
    }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[24px] font-semibold leading-[1.05]">Skills</div>
          <div className="text-[12.5px] text-[color:var(--ae-dim)]">
            Bật/tắt và quản lý các skill của Agent.
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div
          className="z-[2] mt-4 grid grid-cols-2 gap-3.5"
          data-testid="ae-skills-skeleton"
        >
          {[0, 1, 2, 3].map(i => (
            <GlassSlab className="h-[78px] animate-pulse opacity-60" key={i} size="sm">
              <span className="sr-only">Đang tải…</span>
            </GlassSlab>
          ))}
        </div>
      )}

      {status === 'error' && (
        <GlassSlab className="z-[2] mt-4 flex items-center justify-between gap-3" size="md">
          <span className="text-[12.5px]" style={{ color: 'var(--ae-warn)' }}>
            Không tải được danh sách skill.
          </span>
          <button
            className="flex-none rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
            onClick={() => void loadSkills()}
            style={{
              background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
              border: '1px solid rgba(120,210,255,.34)',
            }}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      )}

      {status === 'empty' && (
        <GlassSlab className="z-[2] mt-4 text-center" size="lg">
          <div className="text-[13px] font-semibold text-white">Chưa có skill nào</div>
          <div className="mt-1 text-[11.5px] text-[color:var(--ae-dim)]">
            Cài thêm skill từ Hub bên dưới.
          </div>
        </GlassSlab>
      )}

      {status === 'ready' && (
        <div className="z-[2] mt-4 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-auto">
          {(skills ?? []).map(s => (
            <SkillCard key={s.name} skill={s} />
          ))}
        </div>
      )}

      <SkillsHubPanel />
      <SkillEditor />
    </div>
  )
}
