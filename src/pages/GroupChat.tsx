import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user_id: string | null;
  user_name: string;
  user_photo: string | null;
  message_text: string;
  is_system_message: boolean;
  deleted: boolean;
  created_at: string;
}

interface GroupInfo {
  id: string;
  name: string;
}

const GroupChat = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchData();
      subscribeToMessages();
    }

    return () => {
      supabase.channel(`group-chat-${id}`).unsubscribe();
    };
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async () => {
    if (!id) return;

    try {
      // Get group info
      const { data: groupData } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', id)
        .single();

      if (!groupData) {
        navigate('/');
        return;
      }

      setGroup(groupData);

      // Get messages
      const { data: messagesData } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (messagesData) {
        // Get user profiles using secure RPC function (excludes email, enforces auth)
        const { data: profiles } = await supabase
          .rpc('get_group_member_profiles', { p_group_id: id });

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { name: p.name, photo: p.profile_photo_url }])
        );

        const enrichedMessages: Message[] = messagesData.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          user_name: m.user_id ? profileMap.get(m.user_id)?.name || 'Unknown' : 'System',
          user_photo: m.user_id ? profileMap.get(m.user_id)?.photo || null : null,
          message_text: m.message_text,
          is_system_message: m.is_system_message,
          deleted: m.deleted,
          created_at: m.created_at,
        }));

        setMessages(enrichedMessages);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!id) return;

    supabase
      .channel(`group-chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${id}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Get user profile if needed
          let userName = 'System';
          let userPhoto = null;

          if (newMsg.user_id) {
            // Use secure RPC function to get public profile (excludes email, enforces auth)
            const { data: profile } = await supabase
              .rpc('get_public_profile', { p_user_id: newMsg.user_id });

            if (profile && profile.length > 0) {
              userName = profile[0].name;
              userPhoto = profile[0].profile_photo_url;
            }
          }

          const enrichedMessage: Message = {
            id: newMsg.id,
            user_id: newMsg.user_id,
            user_name: userName,
            user_photo: userPhoto,
            message_text: newMsg.message_text,
            is_system_message: newMsg.is_system_message,
            deleted: newMsg.deleted,
            created_at: newMsg.created_at,
          };

          setMessages((prev) => [...prev, enrichedMessage]);
        }
      )
      .subscribe();
  };

  const handleSend = async () => {
    if (!user || !id || !newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('group_messages').insert({
        group_id: id,
        user_id: user.id,
        message_text: messageText,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(`/group/${id}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-foreground">{group?.name}</h1>
            <p className="text-xs text-muted-foreground">Group Chat</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-4">💬</span>
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Say hi to your crew! 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.user_id === user?.id;
              const showAvatar = !isOwn && (
                index === 0 || messages[index - 1]?.user_id !== message.user_id
              );

              if (message.is_system_message) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <p className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full">
                      {message.message_text}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isOwn && showAvatar && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.user_photo || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {message.user_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!isOwn && !showAvatar && <div className="w-8" />}

                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card text-foreground rounded-bl-sm'
                    )}
                  >
                    {!isOwn && showAvatar && (
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {message.user_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.deleted ? '[Message deleted]' : message.message_text}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 safe-area-bottom">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${group?.name}...`}
            className="min-h-[44px] max-h-32 bg-input border-border resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className={cn(
              'h-11 w-11 flex-shrink-0',
              newMessage.trim() ? 'gradient-primary' : 'bg-muted'
            )}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
