import { redirect } from 'next/navigation';

export default function Home() {
  // In Phase 1 we redirect to /upload. 
  // Later this can redirect to /login if unauthenticated.
  redirect('/upload');
}
