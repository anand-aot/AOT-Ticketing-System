import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Clock } from "lucide-react";
import { storageService, type Ticket, type ChatMessage, type User } from "@/utils/storage";
import { useToast } from "@/hooks/use-toast";

interface ChatModalProps {
  ticket: Ticket | null;
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const ChatModal = ({ ticket, user, isOpen, onClose }: ChatModalProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (ticket) {
      setMessages(ticket.messages);
    }
  }, [ticket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ticket) return;

    storageService.addChatMessage(ticket.id, {
      ticketId: ticket.id,
      senderId: user.email,
      senderName: user.name,
      senderRole: user.role,
      message: newMessage.trim()
    });

    // Refresh messages from storage
    const updatedTickets = storageService.getTickets();
    const updatedTicket = updatedTickets.find(t => t.id === ticket.id);
    if (updatedTicket) {
      setMessages(updatedTicket.messages);
    }

    setNewMessage("");
    
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "employee": return "bg-info/10 text-info border-info/20";
      case "it_owner": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "hr_owner": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "admin_owner": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "accounts_owner": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "owner": return "bg-primary/10 text-primary border-primary/20";
      default: return "bg-muted";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "employee": return "Employee";
      case "it_owner": return "IT Team";
      case "hr_owner": return "HR Team";
      case "admin_owner": return "Admin Team";
      case "accounts_owner": return "Accounts Team";
      case "owner": return "System Admin";
      default: return "User";
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Chat - {ticket.id}</span>
            <Badge variant="outline">{ticket.subject}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4 border rounded-lg" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user.email ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.senderId === user.email ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getRoleColor(message.senderRole)}>
                          {getRoleLabel(message.senderRole)}
                        </Badge>
                        <span className="text-sm font-medium">{message.senderName}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatMessageTime(message.timestamp)}
                        </div>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.senderId === user.email
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted mr-4'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;