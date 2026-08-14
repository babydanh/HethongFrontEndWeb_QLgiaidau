import { redirect } from 'next/navigation';

/** Keep the public dashboard link valid while the organizer area is grouped by resource. */
export default function OrganizerIndexPage() {
  redirect('/organizer/tournaments');
}
