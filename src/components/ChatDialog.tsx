import { useState, useEffect, useRef } from "react";
import { Send, User, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatDialogProps {
  requestId: string;
  title: string;
  onClose: () => void;
}

export function ChatDialog({ requestId, title, onClose }: ChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:request_id=eq.${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: user.id,
      content,
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(content); // Restore message on error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-sm font-bold text-primary">{title}</h3>
            <p className="text-[10px] text-muted-foreground">محادثة مع الإدارة</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="size-5" />
          </Button>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {loading ? (
              <p className="text-center text-xs text-muted-foreground">جارٍ تحميل الرسائل...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">لا توجد رسائل بعد. ابدأ المحادثة الآن.</p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                         {isMe ? (
                            <User className="size-3 opacity-70" />
                         ) : (
                            <ShieldCheck className="size-3 text-primary" />
                         )}
                         <span className="text-[10px] opacity-70">
                            {isMe ? "أنت" : "الإدارة"}
                         </span>
                      </div>
                      <p className="leading-relaxed">{m.content}</p>
                      <span className="mt-1 block text-right text-[9px] opacity-50">
                        {format(new Date(m.created_at), "HH:mm", { locale: ar })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 rounded-full bg-muted/50 border-none focus-visible:ring-primary"
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
