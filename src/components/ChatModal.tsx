// src/components/ChatModal.tsx

import { useState, useEffect, useRef, useMemo } from 'react';
import { storageService } from '@/utils/storage';
import { Ticket, User, ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, X, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { nanoid } from 'nanoid';

interface ChatModalProps {
  ticket: Ticket;
  user: User | null;
}

interface PendingMessage extends Omit<ChatMessage, 'id' | 'timestamp'> {
  tempId: string;
  timestamp: string;
}

const ChatModal = ({ ticket, user }: ChatModalProps) => {
  // Early return if props are invalid
  if (!ticket?.id || !user?.email) {
    console.error('ChatModal: Missing required props', { ticket, user });
    return null;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Memoized combined messages to stabilize rendering
  const allMessages = useMemo(() => {
    const combined = [...messages, ...pendingMessages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    console.log('Combined messages:', combined); // Debug
    return combined;
  }, [messages, pendingMessages]);

  // Auto-scroll to latest message, but not on initial load
  useEffect(() => {
    console.log('Messages updated:', { messages, pendingMessages }); // Debug
    if (isInitialLoad.current) {
      messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      isInitialLoad.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Load existing messages on open
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoadingInitial(true);
        const chatMessages = await storageService.getChatMessages(ticket.id);
        console.log('Initial chat messages:', chatMessages);
        setMessages(chatMessages || []);
        isInitialLoad.current = true; // Reset for next open
      } catch (error: any) {
        console.error('Failed to load initial chat messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat messages',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInitial(false);
      }
    };

    if (open) {
      loadMessages();
    }
  }, [ticket.id, toast, open]);

  // Polling for messages every 3 seconds when modal is open
  useEffect(() => {
    if (!open) return;

    const fetchMessages = async () => {
      try {
        const chatMessages = await storageService.getChatMessages(ticket.id);
        console.log('Polled chat messages:', chatMessages);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = chatMessages?.filter((m) => !existingIds.has(m.id)) || [];
          if (newMessages.length === 0) {
            console.log('No new messages from polling');
            return prev;
          }
          const updatedMessages = [...prev, ...newMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          console.log('Updated messages from polling:', updatedMessages);
          // Remove pending messages that match confirmed messages
          setPendingMessages((prevPending) =>
            prevPending.filter(
              (pm) => !newMessages.some((nm) => nm.senderId === pm.senderId && nm.message === pm.message)
            )
          );
          return updatedMessages;
        });
      } catch (error: any) {
        console.error('Failed to poll chat messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch chat messages',
          variant: 'destructive',
        });
      }
    };

    const intervalId = setInterval(fetchMessages, 3000); // Poll every 3 seconds

    return () => {
      console.log('Clearing polling interval for ticket:', ticket.id);
      clearInterval(intervalId);
    };
  }, [open, ticket.id, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!ticket.id) {
      console.error('ChatModal: No ticket ID provided');
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      console.log('Setting up chat subscription for ticket:', ticket.id);
      subscription = storageService.subscribeToChat(ticket.id, (message: ChatMessage) => {
        console.log('Received real-time message:', message);
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            console.log('Duplicate message ignored:', message.id);
            return prev;
          }
          const updatedMessages = [...prev, message].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          console.log('Updated messages from subscription:', updatedMessages);
          // Remove matching pending message
          setPendingMessages((prevPending) =>
            prevPending.filter((pm) => !(pm.senderId === message.senderId && pm.message === message.message))
          );
          return updatedMessages;
        });
      });
    } catch (error: any) {
      console.error('Failed to subscribe to chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to chat',
        variant: 'destructive',
      });
    }

    return () => {
      try {
        console.log('Cleaning up chat subscription for ticket:', ticket.id);
        subscription?.unsubscribe?.();
      } catch (error) {
        console.error('Failed to unsubscribe from chat:', error);
      }
    };
  }, [ticket.id, toast]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // Create a pending message
    const tempId = nanoid();
    const pendingMessage: PendingMessage = {
      tempId,
      ticketId: ticket.id,
      senderId: user.email,
      senderName: user.name || 'Unknown',
      senderRole: user.role || 'employee',
      message: newMessage,
      timestamp: new Date().toISOString(),
    };

    // Add to pending messages and clear input
    setPendingMessages((prev) => {
      const updatedPending = [...prev, pendingMessage];
      console.log('Added pending message:', updatedPending);
      return updatedPending;
    });
    setNewMessage('');

    // Send to backend asynchronously
    try {
      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        ticketId: ticket.id,
        senderId: user.email,
        senderName: user.name || 'Unknown',
        senderRole: user.role || 'employee',
        message: newMessage,
      };
      const sentMessage = await storageService.addChatMessage(message);
      console.log('Sent message:', sentMessage);
      // Move from pending to confirmed messages
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) {
          console.log('Duplicate confirmed message ignored:', sentMessage.id);
          return prev;
        }
        const updatedMessages = [...prev, sentMessage].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        console.log('Confirmed message added:', updatedMessages);
        return updatedMessages;
      });
      setPendingMessages((prev) => {
        const updatedPending = prev.filter((pm) => pm.tempId !== tempId);
        console.log('Removed pending message:', updatedPending);
        return updatedPending;
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setPendingMessages((prev) => {
        const updatedPending = prev.filter((pm) => pm.tempId !== tempId);
        console.log('Removed failed pending message:', updatedPending);
        return updatedPending;
      });
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCurrentUser = (msg: ChatMessage | PendingMessage) => {
    return msg.senderId === user.email;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-muted/30 transition-colors"
                disabled={isLoadingInitial}
              >
                <Clock className="h-4 w-4 mr-1" />
                Chat
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat for Ticket #{ticket.id.slice(0, 8)}</TooltipContent>
          </Tooltip>
        </DialogTrigger>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card max-w-[95vw] md:max-w-2xl w-full h-[80vh] flex flex-col rounded-lg shadow-md border border-primary/20">
          <DialogHeader className="relative bg-gradient-to-r from-primary/10 to-muted/50 p-4 shrink-0">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Ticket #{ticket.id.slice(0, 8)} Chat
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close chat modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <Card className="flex-1 m-6 border border-primary/20 overflow-hidden">
            <CardContent
              className="p-4 h-[400px] md:h-[300px] overflow-y-auto flex flex-col"
              ref={messagesContainerRef}
            >
              {isLoadingInitial ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading messages...</span>
                </div>
              ) : allMessages.length > 0 ? (
                allMessages.map((msg) => {
                  const isOwnMessage = isCurrentUser(msg);
                  return (
                    <div
                      key={'id' in msg ? msg.id : msg.tempId}
                      className={`mb-4 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] flex flex-col space-y-1 ${isOwnMessage ? 'ml-4 items-end' : 'mr-4 items-start'}`}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold text-foreground line-clamp-1">
                              {msg.senderName} ({msg.senderId})
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>{msg.senderName} ({msg.senderId})</TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground">{msg.senderRole}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className={`inline-block p-2 rounded-lg text-sm ${
                                isOwnMessage ? 'bg-primary text-white' : 'bg-muted/50 text-foreground'
                              } ${'tempId' in msg ? 'opacity-70' : ''}`}
                            >
                              {msg.message}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>{msg.message}</TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-orange-600 font-medium">
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <FileText className="h-5 w-5 mr-2" />
                  No messages yet
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>
          <div className="flex space-x-2 m-6 shrink-0">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="border-primary/20"
              aria-label="Chat message input"
            />
            <Button
              variant="outline"
              size="sm"
              className="border-primary/20 hover:bg-muted/30 transition-colors"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              aria-label="Send chat message"
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default ChatModal;