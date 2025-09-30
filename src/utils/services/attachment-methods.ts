// src/utils/storage/attachment-methods.ts
import { supabaseAdmin } from '@/lib/supabase';
import { Attachment } from '@/types';
import { StorageService } from '../storage';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png', 
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadAttachment(
  this: StorageService,
  file: File,
  ticketId: string,
  uploadedBy: string
): Promise<Attachment> {
  try {
    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    if (!ticketId || !uploadedBy) {
      throw new Error('Missing ticketId or uploadedBy');
    }

    console.log('Upload attachment params:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      ticketId,
      uploadedBy
    });

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single();
    
    if (ticketError || !ticket) {
      console.error('Ticket verification error:', ticketError);
      throw new Error(`Ticket not found: ${ticketError?.message || 'Unknown error'}`);
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', uploadedBy.toLowerCase())
      .single();
    
    if (userError || !user) {
      console.error('User verification error:', userError);
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`);
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
    }

    // Create unique file path with timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${ticketId}/${timestamp}_${safeName}`;

    console.log('Uploading to storage path:', fileName);

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);
    
    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      // Clean up uploaded file
      await supabaseAdmin.storage.from('ticket-attachments').remove([fileName]);
      throw new Error('Failed to get public URL');
    }

    console.log('File uploaded successfully, saving to database...');

    // Save to database
    const attachmentData = {
      ticket_id: ticketId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: uploadedBy.toLowerCase(),
      uploaded_at: new Date().toISOString(),
      file_url: urlData.publicUrl,
    };

    const { data, error } = await supabaseAdmin
      .from('attachments')
      .insert(attachmentData)
      .select()
      .single();
    
    if (error) {
      console.error('Database insert error:', error);
      // Clean up uploaded file
      await supabaseAdmin.storage.from('ticket-attachments').remove([fileName]);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    console.log('Attachment saved to database:', data);

    // Add audit log (don't let this fail the entire operation)
    try {
      await this.addAuditLog({
        ticketId,
        action: 'attachment_added',
        details: `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        performedBy: uploadedBy.toLowerCase(),
      });
    } catch (auditError) {
      console.warn('Failed to add audit log for attachment:', auditError);
      // Log the error but don't fail the upload
      await supabaseAdmin.from('error_logs').insert({
        error_message: (auditError as Error).message,
        context: `uploadAttachment: audit log failed, ticketId=${ticketId}, fileName=${file.name}`,
      });
    }

    // Return the attachment object
    return {
      id: data.id,
      ticketId: data.ticket_id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      uploadedBy: data.uploaded_by,
      uploadedAt: data.uploaded_at,
      fileUrl: data.file_url,
    };
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    
    // Log error to database
    try {
      await supabaseAdmin.from('error_logs').insert({
        error_message: error.message,
        context: `uploadAttachment: ticketId=${ticketId}, fileName=${file?.name || 'unknown'}, uploadedBy=${uploadedBy}`,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    throw error;
  }
}


// src/utils/storage/attachment-methods.ts
export async function getAttachments(this: StorageService, ticketId: string): Promise<Attachment[]> {
  try {
    console.log('Fetching attachments for ticketId:', ticketId);
    const { data, error } = await supabaseAdmin
      .from('attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Get attachments error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }
    
    console.log('Attachments fetched:', data);
    return (
      data?.map((item) => ({
        id: item.id,
        ticketId: item.ticket_id,
        fileName: item.file_name,
        fileSize: item.file_size,
        fileType: item.file_type,
        uploadedBy: item.uploaded_by,
        uploadedAt: item.uploaded_at,
        fileUrl: item.file_url,
      })) || []
    );
  } catch (error: any) {
    console.error('Failed to get attachments:', {
      message: error.message,
      stack: error.stack,
      ticketId,
    });
    
    // Log error to database
    try {
      await supabaseAdmin.from('error_logs').insert({
        error_message: error.message,
        context: `getAttachments: ticketId=${ticketId}`,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return []; // Return empty array instead of throwing
  }
}

export async function deleteAttachment(
  this: StorageService,
  attachmentId: string,
  performedBy: string
): Promise<void> {
  try {
    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabaseAdmin
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();
    
    if (fetchError || !attachment) {
      throw new Error(`Attachment not found: ${fetchError?.message || 'Unknown error'}`);
    }

    // Delete from storage
    const fileName = attachment.file_url.split('/').pop();
    if (fileName) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('ticket-attachments')
        .remove([`${attachment.ticket_id}/${fileName}`]);
      
      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('attachments')
      .delete()
      .eq('id', attachmentId);
    
    if (deleteError) {
      throw new Error(`Failed to delete attachment: ${deleteError.message}`);
    }

    // Add audit log
    try {
      await this.addAuditLog({
        ticketId: attachment.ticket_id,
        action: 'attachment_deleted',
        details: `File deleted: ${attachment.file_name}`,
        performedBy: performedBy.toLowerCase(),
      });
    } catch (auditError) {
      console.warn('Failed to add audit log for attachment deletion:', auditError);
    }
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    
    // Log error to database
    try {
      await supabaseAdmin.from('error_logs').insert({
        error_message: error.message,
        context: `deleteAttachment: attachmentId=${attachmentId}, performedBy=${performedBy}`,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    throw error;
  }
}