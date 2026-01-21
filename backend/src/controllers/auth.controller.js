import { supabaseAdmin } from '../config/supabase.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authController = {
  async register(req, res, next) {
    try {
      const { email, password, name } = registerSchema.parse(req.body);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Auto-confirm for MVP
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return res.status(409).json({
            error: { code: 'USER_EXISTS', message: 'User already exists' }
          });
        }
        throw authError;
      }

      // Create profile in public.users
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name: name || email.split('@')[0]
        });

      if (profileError) throw profileError;

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        userId: authData.user.id,
        email: authData.user.email
      });

      // Set cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name || email.split('@')[0]
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.user) {
        return res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        userId: data.user.id,
        email: data.user.email
      });

      // Set cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        user: profile || {
          id: data.user.id,
          email: data.user.email
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  },

  async getMe(req, res, next) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.userId)
        .single();

      if (error) throw error;

      res.json({ user: data });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Refresh token required' }
        });
      }

      const decoded = verifyRefreshToken(refreshToken);
      
      const { accessToken, refreshToken: newRefreshToken } = generateTokens({
        userId: decoded.userId,
        email: decoded.email
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ message: 'Token refreshed' });
    } catch (error) {
      next(error);
    }
  }
};
