import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

export const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }),
  phone: z.string().trim().regex(/^(?:\+8801|01)[3-9]\d{8}$/, { message: 'Invalid Bangladesh phone number format (e.g. 01XXXXXXXXX)' }),
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address format' }),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  phone: z.string().trim().min(1, { message: 'Phone number or email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * @param {import('zod').ZodSchema} schema
 */
export const validateRequest = (schema) => {
  /**
   * @param {any} req
   * @param {any} res
   * @param {any} next
   */
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((err) => err.message);
      return res.status(400).json({ error: errors[0], details: errors });
    }
    // Set validated data on body
    req.body = result.data;
    next();
  };
};
