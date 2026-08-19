import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const orgCount = await db.organization.count();
  const userCount = await db.user.count();

  // If no property or admin exists, redirect to first-run setup wizard
  if (orgCount === 0 || userCount === 0) {
    redirect('/setup');
  }

  // Check if session active
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
