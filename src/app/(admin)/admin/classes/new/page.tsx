'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      starts_at: new Date(formData.get('starts_at') as string).toISOString(),
      duration_minutes: Number(formData.get('duration_minutes')),
      max_capacity: Number(formData.get('max_capacity')),
    };

    const res = await fetch('/api/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push('/admin/classes/manage');
    } else {
      const data = await res.json();
      setError(data.error?.message || 'Failed to create class');
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Class</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" name="title" required placeholder="e.g. Mat Pilates × Sculpt" defaultValue="Mat Pilates × Sculpt" />
        <Input label="Description" name="description" placeholder="Optional description" />
        <Input label="Start Date & Time" name="starts_at" type="datetime-local" required />
        <Input label="Duration (minutes)" name="duration_minutes" type="number" required placeholder="50" defaultValue="50" />
        <Input label="Max Capacity" name="max_capacity" type="number" required placeholder="20" defaultValue="20" />
        <Button type="submit" loading={loading} className="w-full">
          Create Class
        </Button>
      </form>
    </div>
  );
}
