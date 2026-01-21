import { supabaseAdmin } from '../config/supabase.js';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['file', 'folder']).optional(),
  owner: z.string().uuid().optional(),
  starred: z.boolean().optional()
});

export const searchController = {
  async search(req, res, next) {
    try {
      const userId = req.user.userId;
      const query = searchSchema.parse(req.query);

      let filesQuery = supabaseAdmin
        .from('files')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_deleted', false);

      let foldersQuery = supabaseAdmin
        .from('folders')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_deleted', false);

      // Search term
      if (query.q) {
        filesQuery = filesQuery.ilike('name', `%${query.q}%`);
        foldersQuery = foldersQuery.ilike('name', `%${query.q}%`);
      }

      // Type filter
      if (query.type === 'file') {
        const { data: files, error } = await filesQuery;
        if (error) throw error;
        return res.json({ results: { files: files || [], folders: [] } });
      }

      if (query.type === 'folder') {
        const { data: folders, error } = await foldersQuery;
        if (error) throw error;
        return res.json({ results: { files: [], folders: folders || [] } });
      }

      // Get both
      const [filesResult, foldersResult] = await Promise.all([
        filesQuery,
        foldersQuery
      ]);

      if (filesResult.error) throw filesResult.error;
      if (foldersResult.error) throw foldersResult.error;

      // TODO: Filter by starred if requested
      // TODO: Include shared items

      res.json({
        results: {
          files: filesResult.data || [],
          folders: foldersResult.data || []
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
