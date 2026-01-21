import { supabaseAdmin } from '../config/supabase.js';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional()
});

export const folderController = {
  async create(req, res, next) {
    try {
      const { name, parentId } = createSchema.parse(req.body);
      const userId = req.user.userId;

      const { data, error } = await supabaseAdmin
        .from('folders')
        .insert({
          name,
          owner_id: userId,
          parent_id: parentId || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          return res.status(409).json({
            error: { code: 'DUPLICATE_FOLDER', message: 'Folder with this name already exists' }
          });
        }
        throw error;
      }

      res.status(201).json({ folder: data });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const userId = req.user.userId;
      const { parentId } = req.query;

      const query = supabaseAdmin
        .from('folders')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_deleted', false);

      // Handle root level vs subfolders
      if (parentId === 'null' || !parentId) {
        query.is('parent_id', null);
      } else {
        query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json({ folders: data || [] });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Get folder
      const { data: folder, error: folderError } = await supabaseAdmin
        .from('folders')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (folderError || !folder) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Folder not found' }
        });
      }

      // TODO: Check permissions (owner or shared)

      // Get children
      const { data: children, error: childrenError } = await supabaseAdmin
        .from('folders')
        .select('*')
        .eq('parent_id', id)
        .eq('is_deleted', false);

      // Get files
      const { data: files, error: filesError } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('folder_id', id)
        .eq('is_deleted', false);

      // TODO: Build path (breadcrumbs) using recursive query

      res.json({
        folder,
        children: {
          folders: children || [],
          files: files || []
        },
        path: [] // TODO: Implement path building
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

      // TODO: Check permissions

      const updateData = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;

      const { data, error } = await supabaseAdmin
        .from('folders')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Folder not found' }
        });
      }

      res.json({ folder: data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // TODO: Check permissions

      const { data, error } = await supabaseAdmin
        .from('folders')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Folder not found' }
        });
      }

      res.json({ message: 'Folder deleted', folder: data });
    } catch (error) {
      next(error);
    }
  }
};
