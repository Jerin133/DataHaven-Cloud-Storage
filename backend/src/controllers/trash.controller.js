import { supabaseAdmin } from '../config/supabase.js';

export const trashController = {
  async list(req, res, next) {
    try {
      const userId = req.user.userId;

      const [filesResult, foldersResult] = await Promise.all([
        supabaseAdmin
          .from('files')
          .select('*')
          .eq('owner_id', userId)
          .eq('is_deleted', true),
        supabaseAdmin
          .from('folders')
          .select('*')
          .eq('owner_id', userId)
          .eq('is_deleted', true)
      ]);

      if (filesResult.error) throw filesResult.error;
      if (foldersResult.error) throw foldersResult.error;

      res.json({
        trash: {
          files: filesResult.data || [],
          folders: foldersResult.data || []
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      const { resourceType, resourceId } = req.body;
      const userId = req.user.userId;

      if (!resourceType || !resourceId) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'resourceType and resourceId required' }
        });
      }

      const table = resourceType === 'file' ? 'files' : 'folders';
      const { data, error } = await supabaseAdmin
        .from(table)
        .update({ is_deleted: false })
        .eq('id', resourceId)
        .eq('owner_id', userId)
        .eq('is_deleted', true)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Resource not found in trash' }
        });
      }

      res.json({ message: 'Resource restored', [resourceType]: data });
    } catch (error) {
      next(error);
    }
  },

  async empty(req, res, next) {
    try {
      const userId = req.user.userId;

      // 🔥 Permanently delete ALL trashed files
      await supabaseAdmin
        .from('files')
        .delete()
        .eq('owner_id', userId)
        .eq('is_deleted', true);

      // 🔥 Permanently delete ALL trashed folders
      await supabaseAdmin
        .from('folders')
        .delete()
        .eq('owner_id', userId)
        .eq('is_deleted', true);

      res.json({ message: 'Trash emptied permanently' });
    } catch (error) {
      next(error);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const { resourceType, resourceId } = req.body;
      const userId = req.user.userId;

      const table = resourceType === 'file' ? 'files' : 'folders';

      await supabaseAdmin
        .from(table)
        .delete()
        .eq('id', resourceId)
        .eq('owner_id', userId)
        .eq('is_deleted', true);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};
