import { supabaseAdmin } from '../config/supabase.js';
import { z } from 'zod';

const createSchema = z.object({
  resourceType: z.enum(['file', 'folder']),
  resourceId: z.string().uuid()
});

export const starController = {
  async create(req, res, next) {
    try {
      const { resourceType, resourceId } = createSchema.parse(req.body);
      const userId = req.user.userId;

      const { data, error } = await supabaseAdmin
        .from('stars')
        .insert({
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            error: { code: 'ALREADY_STARRED', message: 'Resource already starred' }
          });
        }
        throw error;
      }

      res.status(201).json({ star: data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { resourceType, resourceId } = req.query;
      const userId = req.user.userId;

      if (!resourceType || !resourceId) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'resourceType and resourceId required' }
        });
      }

      const { error } = await supabaseAdmin
        .from('stars')
        .delete()
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (error) throw error;

      res.json({ message: 'Star removed' });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const userId = req.user.userId;

      const { data: stars, error } = await supabaseAdmin
        .from('stars')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const folderIds = stars
        .filter(s => s.resource_type === 'folder')
        .map(s => s.resource_id);

      const fileIds = stars
        .filter(s => s.resource_type === 'file')
        .map(s => s.resource_id);

      const [foldersRes, filesRes] = await Promise.all([
        folderIds.length
          ? supabaseAdmin.from('folders').select('*').in('id', folderIds)
          : { data: [] },
        fileIds.length
          ? supabaseAdmin.from('files').select('*').in('id', fileIds)
          : { data: [] }
      ]);

      res.json({
        folders: foldersRes.data || [],
        files: filesRes.data || [],
      });
    } catch (error) {
      next(error);
    }
  }
};

