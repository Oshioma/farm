import { EmptyState } from "@/app/community/_ui/primitives";

export default function AutomationsAdminPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Automations</h1>
      <p className="mt-1 text-sm text-zinc-500">Trigger-based rules — welcome messages, role changes, notifications — for your community.</p>

      <div className="mt-6">
        <EmptyState
          icon="workflow"
          title="Automations are on the roadmap"
          description="The Space and event model this platform is built on (every action already fans out to Growth Journey timeline events) is designed to support a rule engine here next: trigger on an event type, run an action. See IMPLEMENTATION_PLAN.md for the design."
        />
      </div>
    </div>
  );
}
