'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatStudioDateTime } from '@/lib/timezone';

interface Enrollment {
  booking_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  payment_type: string;
  status: string;
  booked_at: string;
}

export default function AdminClassDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState<{ class_title: string; starts_at: string; max_capacity: number } | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/classes/${id}/enrollments`)
      .then((res) => res.json())
      .then((data) => {
        setClassData({ class_title: data.class_title, starts_at: data.starts_at, max_capacity: data.max_capacity });
        setEnrollments(data.enrollments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/admin/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    if (res.ok) {
      router.push('/admin/classes');
    } else {
      setCancelling(false);
      setShowCancel(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">{classData?.class_title}</h1>
      <p className="text-muted-foreground mb-4">
        {classData?.starts_at && formatStudioDateTime(classData.starts_at)}
      </p>

      <div className="flex gap-2 mb-6">
        <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
          Cancel Class
        </Button>
      </div>

      <h2 className="text-lg font-semibold mb-3">
        Enrollment ({enrollments.length}/{classData?.max_capacity})
      </h2>

      {enrollments.length === 0 ? (
        <EmptyState title="No students booked yet" />
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <Card key={e.booking_id}>
              <p className="font-medium">{e.student_name}</p>
              <p className="text-sm text-muted-foreground">{e.student_email}</p>
              {e.student_phone && (
                <a href={`tel:${e.student_phone}`} className="text-sm text-primary hover:underline">
                  {e.student_phone}
                </a>
              )}
              <div className="mt-1">
                <Badge variant={e.payment_type === 'subscription' ? 'success' : 'neutral'}>
                  {e.payment_type}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Class">
        <p className="text-sm text-muted-foreground mb-4">
          This will cancel all bookings and notify students. Drop-in students will receive a refund report.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" className="flex-1" onClick={handleCancel} loading={cancelling}>
            Cancel Class
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>
            Keep Class
          </Button>
        </div>
      </Modal>
    </div>
  );
}
