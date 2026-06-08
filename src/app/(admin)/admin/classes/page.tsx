import { redirect } from 'next/navigation';

// The standalone class list has been retired in favor of the unified Class
// manager — filters + inline detail/roster/email + a create drawer, all in
// one place. Anyone landing on the old URL is forwarded to the new interface.
export default function AdminClassesPage() {
  redirect('/admin/classes/manage');
}
