import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
