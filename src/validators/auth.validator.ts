import { z } from 'zod';
import { ROLES } from '../constants/index.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, dots, dashes, underscores')
    .toLowerCase()
    .trim(),
  password: passwordSchema,
  firstName: z.string().min(1).max(60).trim(),
  lastName: z.string().min(1).max(60).trim(),
  phone: z.string().min(7).max(20).optional(),
  role: z.nativeEnum(ROLES).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Provide an email or username').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
  allDevices: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
