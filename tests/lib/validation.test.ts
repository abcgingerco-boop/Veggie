import { describe, it, expect } from 'vitest';
import {
  vehicleFormSchema,
  buyerFormSchema,
  gradeFormSchema,
  bagWeightSchema,
  validateForm,
} from '@/lib/validation';

describe('vehicleFormSchema', () => {
  it('passes with valid data', () => {
    const result = validateForm(vehicleFormSchema, {
      vehicleNumber: 'mh-01-1234',
      gradeWiseBags: { A: 10, B: 5 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleNumber).toBe('MH-01-1234'); // uppercased
    }
  });

  it('fails when vehicleNumber is empty', () => {
    const result = validateForm(vehicleFormSchema, {
      vehicleNumber: '',
      gradeWiseBags: { A: 10 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors['vehicleNumber']).toBeDefined();
    }
  });

  it('fails when total bags is zero', () => {
    const result = validateForm(vehicleFormSchema, {
      vehicleNumber: 'MH-01-1234',
      gradeWiseBags: { A: 0, B: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('trims and uppercases vehicleNumber', () => {
    const result = validateForm(vehicleFormSchema, {
      vehicleNumber: '  ka-05-ab-1234  ',
      gradeWiseBags: { A: 1 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleNumber).toBe('KA-05-AB-1234');
    }
  });
});

describe('buyerFormSchema', () => {
  it('passes with valid name only', () => {
    const result = validateForm(buyerFormSchema, {
      name: 'Rajesh Kumar',
      phone: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Rajesh Kumar');
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('passes with valid name and phone', () => {
    const result = validateForm(buyerFormSchema, {
      name: 'Rajesh Kumar',
      phone: '9876543210',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('9876543210');
    }
  });

  it('fails when name is empty', () => {
    const result = validateForm(buyerFormSchema, {
      name: '   ',
      phone: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors['name']).toBeDefined();
    }
  });

  it('fails with invalid Indian phone number', () => {
    const result = validateForm(buyerFormSchema, {
      name: 'Test',
      phone: '1234567890', // starts with 1, not 6-9
    });
    expect(result.success).toBe(false);
  });

  it('allows phone starting with 6, 7, 8, or 9', () => {
    for (const prefix of ['6', '7', '8', '9']) {
      const result = validateForm(buyerFormSchema, {
        name: 'Test',
        phone: `${prefix}000000000`,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('gradeFormSchema', () => {
  it('passes with valid data and uppercases name', () => {
    const result = validateForm(gradeFormSchema, {
      name: 'premium',
      color: '#10b981',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('PREMIUM');
    }
  });

  it('fails when name is empty', () => {
    const result = validateForm(gradeFormSchema, {
      name: '',
      color: '#10b981',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid hex color', () => {
    const result = validateForm(gradeFormSchema, {
      name: 'A',
      color: 'red',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors['color']).toBeDefined();
    }
  });

  it('fails when name exceeds 10 characters', () => {
    const result = validateForm(gradeFormSchema, {
      name: 'SUPERPREMIUMPLUS',
      color: '#10b981',
    });
    expect(result.success).toBe(false);
  });
});

describe('bagWeightSchema', () => {
  it('passes with valid data', () => {
    const result = validateForm(bagWeightSchema, {
      buyerId: '550e8400-e29b-41d4-a716-446655440000',
      grade: 'A',
      weight: 60,
      date: '2024-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid UUID', () => {
    const result = validateForm(bagWeightSchema, {
      buyerId: 'not-a-uuid',
      grade: 'A',
      weight: 60,
      date: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('fails when weight is below 1', () => {
    const result = validateForm(bagWeightSchema, {
      buyerId: '550e8400-e29b-41d4-a716-446655440000',
      grade: 'A',
      weight: 0,
      date: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('fails when weight exceeds 200', () => {
    const result = validateForm(bagWeightSchema, {
      buyerId: '550e8400-e29b-41d4-a716-446655440000',
      grade: 'A',
      weight: 201,
      date: '2024-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid date format', () => {
    const result = validateForm(bagWeightSchema, {
      buyerId: '550e8400-e29b-41d4-a716-446655440000',
      grade: 'A',
      weight: 60,
      date: '15-01-2024',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateForm helper', () => {
  it('returns success with transformed data on valid input', () => {
    const result = validateForm(gradeFormSchema, { name: 'a', color: '#ff0000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('A');
    }
  });

  it('returns errors object on invalid input', () => {
    const result = validateForm(gradeFormSchema, { name: '', color: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.errors).toBe('object');
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }
  });
});
