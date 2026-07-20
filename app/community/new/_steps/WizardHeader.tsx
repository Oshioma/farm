import { DynamicIcon } from "@/lib/community/icon";

const STEPS = [
  { label: "Basics", icon: "layout-grid" },
  { label: "Template", icon: "sparkles" },
  { label: "Customize", icon: "layers" },
  { label: "Navigation", icon: "menu" },
  { label: "Launch", icon: "rocket" },
];

export function WizardHeader({ step }: { step: number }) {
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-5">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const index = i + 1;
            const isActive = index === step;
            const isDone = index < step;
            return (
              <div key={s.label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : isDone
                          ? "border-zinc-900 bg-white text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-300"
                    }`}
                  >
                    {isDone ? <DynamicIcon name="check" size={16} /> : index}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-zinc-900" : "text-zinc-400"}`}>{s.label}</span>
                </div>
                {index < STEPS.length && <div className={`mx-2 h-0.5 flex-1 rounded ${isDone ? "bg-zinc-900" : "bg-zinc-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
