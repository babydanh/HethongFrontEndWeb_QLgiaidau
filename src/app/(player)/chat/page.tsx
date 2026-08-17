import { redirect } from 'next/navigation';

/** Chat is rendered by UnifiedChatWidget, not as a second full-page inbox. */
export default function ChatPage() {
  redirect('/');
}