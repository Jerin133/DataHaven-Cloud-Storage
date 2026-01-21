import { supabaseAdmin } from '../config/supabase.js';
import { z } from 'zod';

const createSchema = z.object({
  resourceType: z.enum(['file', 'folder']),
  resourceId: z.string().uuid(),
  email: z.string().email(), // ✅ accept email
  role: z.enum(['viewer', 'editor'])
});

export const shareController = {
  async create(req, res, next) {
    try {
      const { resourceType, resourceId, email, role } =
        createSchema.parse(req.body);

      const userId = req.user.userId;

      // 🔍 Find user by email
      const { data: grantee, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !grantee) {
        return res.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      // ✅ Insert share
      const { data, error } = await supabaseAdmin
        .from('shares')
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          grantee_user_id: grantee.id,
          role,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            error: {
              code: 'ALREADY_SHARED',
              message: 'Resource already shared with this user'
            }
          });
        }
        throw error;
      }

      res.status(201).json({ share: data });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const { resourceType, resourceId } = req.params;

      const { data, error } = await supabaseAdmin
        .from('shares')
        .select(`
          *,
          grantee:users!shares_grantee_user_id_fkey(id, email, name)
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (error) throw error;

      res.json({ shares: data || [] });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const { error } = await supabaseAdmin
        .from('shares')
        .delete()
        .eq('id', id)
        .eq('created_by', userId); // Only creator can delete

      if (error) throw error;

      res.json({ message: 'Share revoked' });
    } catch (error) {
      next(error);
    }
  },

  async sharedWithMe(req, res, next) {
    try {
      const userId = req.user.userId;

      const { data: shares, error } = await supabaseAdmin
        .from('shares')
        .select(`
          id,
          role,
          resource_type,
          resource_id,
          created_by,
          owner:users!shares_created_by_fkey (
            id,
            email
          )
        `)
        .eq('grantee_user_id', userId);

      if (error) throw error;
      if (!shares.length) return res.json({ items: [] });

      const fileIds = shares
        .filter(s => s.resource_type === 'file')
        .map(s => s.resource_id);

      const folderIds = shares
        .filter(s => s.resource_type === 'folder')
        .map(s => s.resource_id);

      const { data: files = [] } = fileIds.length
        ? await supabaseAdmin
            .from('files')
            .select('*')
            .in('id', fileIds)
            .eq('is_deleted', false)
        : { data: [] };

      const { data: folders = [] } = folderIds.length
        ? await supabaseAdmin
            .from('folders')
            .select('*')
            .in('id', folderIds)
            .eq('is_deleted', false)
        : { data: [] };

      const items = shares.map(share => {
        const data =
          share.resource_type === 'file'
            ? files.find(f => f.id === share.resource_id)
            : folders.find(f => f.id === share.resource_id);

        if (!data) return null;

        return {
          type: share.resource_type,
          role: share.role,
          data,
          sharedBy: share.owner
        };
      }).filter(Boolean);

      res.json({ items });
    } catch (err) {
      next(err);
    }
  },

  async sharedContents(req, res, next) {
    try {
      const userId = req.user.userId;
      const { folderId } = req.params;

      // 1️⃣ Get folder and its parent chain
      const { data: folder, error: folderError } = await supabaseAdmin
        .from('folders')
        .select('id, parent_id')
        .eq('id', folderId)
        .single();

      if (folderError || !folder) {
        return res.status(404).json({ items: [] });
      }

      // 2️⃣ Walk up the tree to find ANY shared parent
      let currentFolderId = folder.id;
      let hasAccess = false;

      while (currentFolderId) {
        const { data: share } = await supabaseAdmin
          .from('shares')
          .select('id')
          .eq('resource_type', 'folder')
          .eq('resource_id', currentFolderId)
          .eq('grantee_user_id', userId)
          .maybeSingle();

        if (share) {
          hasAccess = true;
          break;
        }

        const { data: parent } = await supabaseAdmin
          .from('folders')
          .select('parent_id')
          .eq('id', currentFolderId)
          .single();

        currentFolderId = parent?.parent_id;
      }

      if (!hasAccess) {
        return res.status(403).json({ items: [] });
      }

      // ✅ Fetch folders inside
      const { data: folders = [] } = await supabaseAdmin
        .from('folders')
        .select('*')
        .eq('parent_id', folderId)
        .eq('is_deleted', false);

      // ✅ Fetch files inside
      const { data: files = [] } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('folder_id', folderId)
        .eq('is_deleted', false);

      // ✅ Normalize response (IMPORTANT)
      const items = [
        ...folders.map(f => ({ type: 'folder', data: f })),
        ...files.map(f => ({ type: 'file', data: f }))
      ];

      res.json({ items });
    } catch (err) {
      next(err);
    }
  },

  async downloadSharedFile(req, res, next) {
    try {
      const { fileId } = req.params;

      // 1️⃣ Fetch file metadata (NO public_url)
      const { data: file } = await supabaseAdmin
        .from('files')
        .select('id, folder_id, storage_path')
        .eq('id', fileId)
        .eq('is_deleted', false)
        .single();

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // 2️⃣ Check direct file share
      const { data: fileShare } = await supabaseAdmin
        .from('shares')
        .select('id')
        .eq('resource_type', 'file')
        .eq('resource_id', fileId)
        .maybeSingle();

      let hasAccess = !!fileShare;
      let currentFolderId = file.folder_id;

      // 3️⃣ Check parent folder shares
      while (!hasAccess && currentFolderId) {
        const { data: folderShare } = await supabaseAdmin
          .from('shares')
          .select('id')
          .eq('resource_type', 'folder')
          .eq('resource_id', currentFolderId)
          .maybeSingle();

        if (folderShare) {
          hasAccess = true;
          break;
        }

        const { data: parent } = await supabaseAdmin
          .from('folders')
          .select('parent_id')
          .eq('id', currentFolderId)
          .single();

        currentFolderId = parent?.parent_id;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // 4️⃣ Generate signed URL (THIS IS THE KEY)
      const { data: signedData, error } = await supabaseAdmin.storage
        .from('files')
        .createSignedUrls([file.storage_path], 3600, {
          download: file.name || true
        });

      if (error || !signedData?.data?.[0]) {
        return res.status(500).json({ error: 'Failed to generate URL' });
      }

      return res.redirect(signedData.data[0].signedUrl);

    } catch (err) {
      next(err);
    }
  }
};
