import { redirect } from 'next/navigation';

// Legacy URL — Members section moved to /admin/members
export default function StudentsRedirect() {
  redirect('/admin/members');
}
