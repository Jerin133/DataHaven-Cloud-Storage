import { supabaseAdmin } from '../config/supabase.js';

export const userController = {
  async getStorage(req, res, next) {
    try {
      const userId = req.user.userId;

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('storage_used, storage_limit')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'User not found' }
        });
      }

      res.json({
        used: data.storage_used,
        limit: data.storage_limit
      });
    } catch (err) {
      next(err);
    }
  }
};
