import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getCurrentUserId } from "@/lib/db/profiles";
import { getDmConversationForFriend, getDmMessages } from "@/lib/db/dm";
import { DmChatPanel } from "@/components/features/dm/dm-chat-panel";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { safePageLoad } from "@/lib/server/safe-page";

interface DmThreadPageProps {
  params: Promise<{ userId: string }>;
}

export default async function DmThreadPage({ params }: DmThreadPageProps) {
  const { userId: friendUserId } = await params;
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) redirect("/login");

  if (friendUserId === currentUserId) notFound();

  const result = await safePageLoad(async () => {
    const thread = await getDmConversationForFriend(currentUserId, friendUserId);
    if (!thread) return null;

    const messages = await getDmMessages(thread.conversationId);
    return { ...thread, messages };
  });

  if (result.error) {
    return (
      <PageShell
        title="Messages"
        description="Private chat"
        status="error"
        errorMessage={result.error}
      />
    );
  }

  if (!result.data) {
    return (
      <PageShell
        title="Messages"
        description="Private chat"
        status="ready"
      >
        <EmptyPanel
          title="Friends only"
          description="You can only message people on your friends list."
          icon={<Users className="h-7 w-7" />}
          action={
            <Button asChild variant="outline">
              <Link href="/friends">Go to Friends</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { conversationId, friend, messages } = result.data;

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/messages">
            <ArrowLeft className="h-4 w-4" />
            All messages
          </Link>
        </Button>
      </div>
      <DmChatPanel
        conversationId={conversationId}
        friend={friend}
        currentUserId={currentUserId}
        initialMessages={messages}
      />
    </div>
  );
}
