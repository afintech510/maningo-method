import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function AdminPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="space-y-3">
        <Link href="/admin/schedule">
          <Card className="hover:border-primary transition-colors">
            <p className="font-semibold">Schedule</p>
            <p className="text-sm text-muted-foreground">Create a recurring weekly schedule in one go</p>
          </Card>
        </Link>
        <Link href="/admin/classes">
          <Card className="hover:border-primary transition-colors">
            <p className="font-semibold">Classes</p>
            <p className="text-sm text-muted-foreground">Edit individual classes, view enrollments, cancel</p>
          </Card>
        </Link>
        <Link href="/admin/students">
          <Card className="hover:border-primary transition-colors">
            <p className="font-semibold">Students</p>
            <p className="text-sm text-muted-foreground">View all registered students</p>
          </Card>
        </Link>
        <Link href="/admin/manual-payments">
          <Card className="hover:border-primary transition-colors">
            <p className="font-semibold">Manual Payments</p>
            <p className="text-sm text-muted-foreground">Cash, Zelle, and Venmo &mdash; mark paid to apply credits</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
