import { supabaseAdmin } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createSchema = z.object({
  resourceType: z.enum(['file', 'folder']),
  resourceId: z.string().uuid(),
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).optional()
});

export const linkShareController = {
  async create(req, res, next) {
    try {
      const { resourceType, resourceId, expiresAt, password } = createSchema.parse(req.body);
      const userId = req.user.userId;

      // TODO: Verify resource exists and user owns it

      const token = uuidv4();
      let passwordHash = null;

      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const { data, error } = await supabaseAdmin
        .from('link_shares')
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          token,
          password_hash: passwordHash,
          expires_at: expiresAt || null,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        linkShare: data,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${token}`
      });
    } catch (error) {
      next(error);
    }
  },

  async getByToken(req, res, next) {
    try {
      const { token } = req.params;
      const { password } = req.query;

      const { data: linkShare, error } = await supabaseAdmin
        .from('link_shares')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !linkShare) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Share link not found' }
        });
      }

      // Check expiry
      if (linkShare.expires_at && new Date(linkShare.expires_at) < new Date()) {
        return res.status(410).json({
          error: { code: 'EXPIRED', message: 'Share link has expired' }
        });
      }

      // Check password
      if (linkShare.password_hash) {
        if (!password) {
          return res.status(403).json({
            error: { code: 'PASSWORD_REQUIRED', message: 'Password required' }
          });
        }

        const isValid = await bcrypt.compare(password, linkShare.password_hash);
        if (!isValid) {
          return res.status(403).json({
            error: { code: 'INVALID_PASSWORD', message: 'Invalid password' }
          });
        }
      }

      // Get resource
      const resourceTable = linkShare.resource_type === 'file' ? 'files' : 'folders';
      const { data: resource, error: resourceError } = await supabaseAdmin
        .from(resourceTable)
        .select('*')
        .eq('id', linkShare.resource_id)
        .eq('is_deleted', false)
        .single();

      if (resourceError || !resource) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Resource not found' }
        });
      }

      res.json({ resource, linkShare });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const { error } = await supabaseAdmin
        .from('link_shares')
        .delete()
        .eq('id', id)
        .eq('created_by', userId);

      if (error) throw error;

      res.json({ message: 'Link share deleted' });
    } catch (error) {
      next(error);
    }
  }
};
