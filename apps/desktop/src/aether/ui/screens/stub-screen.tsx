// apps/desktop/src/aether/ui/screens/stub-screen.tsx
export function StubScreen({ title }: { title: string }) {
  return (
    <div className="ae-screen grid h-full place-items-center">
      <div className="ae-slab px-8 py-6 text-center">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">{title}</div>
        <div className="mt-2 text-sm text-[color:var(--ae-dim)]">Sắp ra mắt trong bản cập nhật AETHER tiếp theo.</div>
      </div>
    </div>
  )
}
