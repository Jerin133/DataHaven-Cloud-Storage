import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const initUploadSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  folderId: z.string().uuid().nullable().optional()
});

const completeUploadSchema = z.object({
  fileId: z.string().uuid(),
  parts: z.array(z.object({
    partNumber: z.number().int(),
    etag: z.string()
  })).optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  folderId: z.string().uuid().nullable().optional()
});

export const fileController = {
  async initUpload(req, res, next) {
    try {
      const { name, mimeType, sizeBytes, folderId } = initUploadSchema.parse(req.body);
      const userId = req.user.userId;
      // 🔹 STORAGE QUOTA CHECK (ADD THIS)
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('storage_used, storage_limit')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(400).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      if (user.storage_used + sizeBytes > user.storage_limit) {
        return res.status(403).json({
          error: {
            code: 'STORAGE_LIMIT_EXCEEDED',
            message: 'Storage limit exceeded'
          }
        });
      }

      // Validate file size
      const maxSize =
        process.env.MAX_FILE_SIZE
          ? parseInt(process.env.MAX_FILE_SIZE)
          : 300 * 1024 * 1024; // 300 MB
      if (sizeBytes > maxSize) {
        return res.status(400).json({
          error: { code: 'FILE_TOO_LARGE', message: `File size exceeds ${maxSize} bytes` }
        });
      }

      // Generate storage key
      const fileId = uuidv4();
      const storageKey = `tenants/${userId}/files/${fileId}-${name}`;

      // Create file record
      const { data: file, error } = await supabaseAdmin
        .from('files')
        .insert({
          id: fileId,
          name,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          storage_key: storageKey,
          owner_id: userId,
          folder_id: folderId || null
        })
        .select()
        .single();

        // 🔹 INCREASE USER STORAGE (ADD THIS)
        await supabaseAdmin
          .from('users')
          .update({
            storage_used: user.storage_used + sizeBytes
          })
          .eq('id', userId);

      if (error) throw error;

      // Get upload URL from Supabase Storage
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'drive';
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUploadUrl(storageKey);

      if (uploadError) throw uploadError;

      res.status(201).json({
        fileId: file.id,
        file,
        upload: {
          method: 'signed-url',
          url: uploadData.signedUrl,
          path: uploadData.path
        },
        storageKey
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const userId = req.user.userId;
      const { folderId } = req.query;

      const query = supabaseAdmin
        .from('files')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_deleted', false);

      if (folderId === 'null' || !folderId) {
        query.is('folder_id', null);
      } else {
        query.eq('folder_id', folderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json({ files: data || [] });
    } catch (error) {
      next(error);
    }
  },

  async completeUpload(req, res, next) {
    try {
      const { fileId } = completeUploadSchema.parse(req.body);

      // Update file status (if needed)
      const { data: file, error } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !file) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'File not found' }
        });
      }

      // TODO: Verify file upload, create thumbnail job, etc.

      res.json({ file, message: 'Upload completed' });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const { data: file, error } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error || !file) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'File not found' }
        });
      }

      // TODO: Check permissions

      // Generate signed URL for download
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'drive';
      const { data: signedUrlData, error: urlError } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(file.storage_key, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      res.json({
        file,
        signedUrl: signedUrlData.signedUrl
      });
    } catch (error) {
      next(error);
    }
  },

  async download(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const { data: file, error } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error || !file) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'File not found' }
        });
      }

      // TODO: Check permissions
      // TODO: Log activity

      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'drive';
      const { data: signedUrlData, error: urlError } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(file.storage_key, 3600);

      if (urlError) throw urlError;

      res.json({
        downloadUrl: signedUrlData.signedUrl,
        fileName: file.name,
        mimeType: file.mime_type
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = updateSchema.parse(req.body);
      const userId = req.user.userId;

      const updateData = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;

      const { data, error } = await supabaseAdmin
        .from('files')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'File not found' }
        });
      }

      res.json({ file: data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const { data, error } = await supabaseAdmin
        .from('files')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      // 🔹 UPDATE STORAGE USED (ADD THIS BLOCK)
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('storage_used')
        .eq('id', userId)
        .single();

      await supabaseAdmin
        .from('users')
        .update({
          storage_used: Math.max(0, user.storage_used - data.size_bytes)
        })
        .eq('id', userId);

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'File not found' }
        });
      }

      res.json({ message: 'File deleted', file: data });
    } catch (error) {
      next(error);
    }
  }
};
