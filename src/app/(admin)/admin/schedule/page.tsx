import { ScheduleCreatorForm } from '@/components/admin/ScheduleCreatorForm';

export default function AdminSchedulePage() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Classes &middot; Create</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Schedule classes</h1>
        <p className="text-sm text-muted-foreground">
          Create a one-off class or generate a recurring weekly series in one go.
        </p>
      </div>
      <ScheduleCreatorForm />
    </div>
  );
}
