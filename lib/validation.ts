import { z } from 'zod';

// Vehicle form schema
export const vehicleFormSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(1, 'Vehicle number is required')
    .max(20, 'Vehicle number must be 20 characters or less')
    .transform((v) => v.toUpperCase()),
  gradeWiseBags: z
    .record(z.string(), z.number().int().min(0))
    .refine(
      (bags) => Object.values(bags).reduce((sum, n) => sum + n, 0) > 0,
      'Please enter bags for at least one grade'
    ),
});

// Buyer form schema
export const buyerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Buyer name is required')
    .max(100, 'Name must be 100 characters or less'),
  phone: z
    .string()
    .trim()
    .transform((v) => v || undefined)
    .pipe(
      z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
        .optional()
    ),
});

// Grade form schema
export const gradeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Grade name is required')
    .max(10, 'Grade name must be 10 characters or less')
    .transform((v) => v.toUpperCase()),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format'),
});

// Bag weight schema
export const bagWeightSchema = z.object({
  buyerId: z.string().uuid('Invalid buyer ID'),
  grade: z.string().min(1, 'Grade is required'),
  weight: z.number().min(1, 'Weight must be at least 1 kg').max(200, 'Weight must be 200 kg or less'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

// Generic validation helper
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}
