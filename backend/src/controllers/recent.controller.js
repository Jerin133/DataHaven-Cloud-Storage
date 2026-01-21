import { supabaseAdmin } from '../config/supabase.js';

export const recentController = {
  async touch(req, res, next) {
    try {
      const { resourceType, resourceId } = req.body;
      const userId = req.user.userId;

      const { error } = await supabaseAdmin
        .from('recent_items')
        .upsert({
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
          last_opened_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,resource_type,resource_id'
        });

      if (error) throw error;

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const userId = req.user.userId;
      const { folderId } = req.query;

      /* ===============================
        🔹 FOLDER OPEN MODE
      =============================== */
      if (folderId) {
        const [foldersRes, filesRes] = await Promise.all([
          supabaseAdmin
            .from('folders')
            .select('*')
            .eq('parent_id', folderId)
            .eq('owner_id', userId)
            .eq('is_deleted', false),

          supabaseAdmin
            .from('files')
            .select('*')
            .eq('folder_id', folderId)
            .eq('owner_id', userId)
            .eq('is_deleted', false)
        ]);

        return res.json({
          items: [
            ...(foldersRes.data || []).map(f => ({
              type: 'folder',
              data: f
            })),
            ...(filesRes.data || []).map(f => ({
              type: 'file',
              data: f
            }))
          ]
        });
      }

      /* ===============================
        🔹 NORMAL RECENT MODE
      =============================== */

      const { data: recentItems, error } = await supabaseAdmin
        .from('recent_items')
        .select('*')
        .eq('user_id', userId)
        .order('last_opened_at', { ascending: false });

      if (error) throw error;

      const folderIds = recentItems
        .filter(r => r.resource_type === 'folder')
        .map(r => r.resource_id);

      const fileIds = recentItems
        .filter(r => r.resource_type === 'file')
        .map(r => r.resource_id);

      const [foldersRes, filesRes] = await Promise.all([
        folderIds.length
          ? supabaseAdmin.from('folders').select('*').in('id', folderIds)
          : { data: [] },
        fileIds.length
          ? supabaseAdmin.from('files').select('*').in('id', fileIds)
          : { data: [] }
      ]);

      const folderMap = new Map((foldersRes.data || []).map(f => [f.id, f]));
      const fileMap = new Map((filesRes.data || []).map(f => [f.id, f]));

      const items = recentItems
        .map(r => {
          if (r.resource_type === 'folder') {
            return { type: 'folder', lastOpenedAt: r.last_opened_at, data: folderMap.get(r.resource_id) };
          }
          return { type: 'file', lastOpenedAt: r.last_opened_at, data: fileMap.get(r.resource_id) };
        })
        .filter(i => i.data);

      res.json({ items });
    } catch (err) {
      next(err);
    }
  }
};