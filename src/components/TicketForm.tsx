// src/components/TicketForm.tsx
import { useState, FormEvent } from 'react';
import { User, Ticket, TicketCategory, TicketPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/utils/storage';
import { supabase } from '@/lib/supabase';
import { File, Plus, Trash2 } from 'lucide-react';

interface TicketFormProps {
  user: User;
  onSubmit: () => void;
}

export default function TicketForm({ user, onSubmit }: TicketFormProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: FormEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.currentTarget.files || []);
    
    // Validate file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    selectedFiles.forEach(file => {
      if (allowedTypes.includes(file.type)) {
        if (file.size <= 10 * 1024 * 1024) { // 10MB limit
          validFiles.push(file);
        } else {
          invalidFiles.push(`${file.name} (exceeds 10MB limit)`);
        }
      } else {
        invalidFiles.push(`${file.name} (unsupported file type)`);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid Files',
        description: `The following files were rejected: ${invalidFiles.join(', ')}`,
        variant: 'destructive',
      });
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }

    // Reset input value to allow re-selecting the same file
    e.currentTarget.value = '';
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileToRemove.name];
      return newProgress;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !category || !priority) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    let createdTicket: Ticket | null = null;
    let successfulUploads = 0;
    let attachmentErrors: string[] = [];

    try {
      const ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'attachments'> = {
        subject: subject.trim(),
        description: description.trim(),
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        status: 'Open',
        employeeId: user.employeeId!,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department || null,
        subDepartment: user.sub_department || null,
        assignedTo: null,
        slaViolated: false,
        slaDueDate: '',
      };

      // Create the ticket first
      createdTicket = await storageService.addTicket(ticketData, user.email, user.role);

      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          try {
            setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }));
            
            // Fix: Use correct parameter order (file, ticketId, uploadedBy)
            await storageService.uploadAttachment(file, createdTicket.id, user.email);
            
            successfulUploads++;
            setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
          } catch (error: any) {
            console.error(`Failed to upload ${file.name}:`, error);
            attachmentErrors.push(`Failed to upload ${file.name}: ${error.message}`);
            setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
          }
        }
      }

      // Construct toast message
      const attachmentMessage = files.length > 0
        ? ` (${successfulUploads}/${files.length} attachments uploaded)`
        : '';
      const errorMessage = attachmentErrors.length > 0
        ? `\nIssues with attachments: ${attachmentErrors.join('; ')}`
        : '';

      toast({
        title: 'Ticket Created',
        description: `Ticket #${createdTicket.id.slice(0, 8)} created successfully${attachmentMessage}${errorMessage}`,
        variant: attachmentErrors.length > 0 && successfulUploads === 0 ? 'destructive' : 'default',
      });

      // Reset form and call onSubmit
      setSubject('');
      setDescription('');
      setCategory('');
      setPriority('');
      setFiles([]);
      setUploadProgress({});
      onSubmit();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      await supabase.from('error_logs').insert({
        error_message: error.message,
        context: `TicketForm: create ticket, email=${user.email}`,
      });
      toast({
        title: 'Creation Failed',
        description: `Failed to create ticket: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter ticket subject"
          disabled={isSubmitting}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue"
          rows={4}
          disabled={isSubmitting}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={setCategory} disabled={isSubmitting} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {['IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others'].map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority *</Label>
          <Select value={priority} onValueChange={setPriority} disabled={isSubmitting} required>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {['Low', 'Medium', 'High', 'Critical'].map((pri) => (
                <SelectItem key={pri} value={pri}>
                  {pri}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Attachments</Label>
        <div className="border-2 border-dashed border-gray-300 p-4 rounded-md hover:border-gray-400 transition-colors">
          <Input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={isSubmitting}
            accept="image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            className="cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: JPEG, PNG, PDF, Word, Excel, Text files (Max 10MB each)
          </p>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Selected Files:</h4>
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-gray-600" />
                    <div>
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {uploadProgress[file.name] !== undefined && (
                      <span className="text-xs text-blue-600">
                        {uploadProgress[file.name] === 100 ? '✓' : `${uploadProgress[file.name]}%`}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isSubmitting}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSubmit} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}