import { redirect } from 'next/navigation';

export default function ReservationsPage() {
  redirect('/front-office?tab=reservations');
}
