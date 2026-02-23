import { create } from 'zustand';
import { Vehicle, Buyer, BagWeight, Grade, GradeInventory } from './types';
import { formatDate } from './calculations';
import { createClient } from './supabase/client';
import { mapVehicle, mapBuyer, mapGrade, mapBagWeight } from './supabase/mappers';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  selectedDate: string;
  vehicles: Vehicle[];
  buyers: Buyer[];
  grades: Grade[];
  bagWeights: BagWeight[];
  loading: boolean;
  datesWithData: Set<string>;

  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setSelectedDate: (date: string) => void;

  // Fetch methods
  fetchGrades: () => Promise<void>;
  fetchBuyers: () => Promise<void>;
  fetchVehiclesForDate: (date: string) => Promise<void>;
  fetchBagWeightsForDate: (date: string) => Promise<void>;
  fetchDatesWithData: () => Promise<void>;

  // Mutations (async, Supabase-backed)
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  addBuyer: (buyer: Omit<Buyer, 'id'>) => Promise<void>;
  addGrade: (gradeName: string, color: string) => Promise<void>;
  addBagWeight: (buyerId: string, grade: string, weight: number, date?: string) => Promise<void>;
  updateBagWeight: (bagId: string, weight: number, grade: string) => Promise<void>;
  deleteBagWeight: (bagId: string) => Promise<void>;

  // Pure client-side
  getInventory: (date: string) => GradeInventory[];
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  selectedDate: formatDate(new Date()),
  vehicles: [],
  buyers: [],
  grades: [],
  bagWeights: [],
  loading: false,
  datesWithData: new Set<string>(),

  setUser: (user) => set({ user }),

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({
      user: null,
      vehicles: [],
      buyers: [],
      bagWeights: [],
      datesWithData: new Set<string>(),
    });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  // --- Fetch methods ---

  fetchGrades: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching grades:', error);
      return;
    }
    set({ grades: (data || []).map(mapGrade) });
  },

  fetchBuyers: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching buyers:', error);
      return;
    }
    set({ buyers: (data || []).map(mapBuyer) });
  },

  fetchVehiclesForDate: async (date) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return;
    }
    set({ vehicles: (data || []).map(mapVehicle) });
  },

  fetchBagWeightsForDate: async (date) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bag_weights')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching bag weights:', error);
      return;
    }
    set({ bagWeights: (data || []).map(mapBagWeight) });
  },

  fetchDatesWithData: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vehicles')
      .select('date');

    if (error) {
      console.error('Error fetching dates:', error);
      return;
    }
    const dates = new Set((data || []).map((r: { date: string }) => r.date));
    set({ datesWithData: dates });
  },

  // --- Mutations ---

  addVehicle: async (vehicle) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        date: vehicle.date,
        vehicle_number: vehicle.vehicleNumber,
        grade_wise_bags: vehicle.gradeWiseBags,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle:', error);
      throw error;
    }

    set((state) => ({
      vehicles: [...state.vehicles, mapVehicle(data)],
      datesWithData: new Set([...state.datesWithData, vehicle.date]),
    }));
  },

  addBuyer: async (buyer) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('buyers')
      .insert({
        name: buyer.name,
        phone: buyer.phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding buyer:', error);
      throw error;
    }

    set((state) => ({
      buyers: [...state.buyers, mapBuyer(data)],
    }));
  },

  addGrade: async (gradeName, color) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('grades')
      .insert({
        name: gradeName,
        color,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding grade:', error);
      throw error;
    }

    set((state) => ({
      grades: [...state.grades, mapGrade(data)],
    }));
  },

  addBagWeight: async (buyerId, grade, weight, date) => {
    const state = get();
    const effectiveDate = date || state.selectedDate;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Query max bag_number from DB to avoid race conditions
    const { data: maxData } = await supabase
      .from('bag_weights')
      .select('bag_number')
      .eq('buyer_id', buyerId)
      .eq('grade', grade)
      .eq('date', effectiveDate)
      .order('bag_number', { ascending: false })
      .limit(1);

    const nextBagNumber = (maxData && maxData.length > 0 ? maxData[0].bag_number : 0) + 1;

    const { data, error } = await supabase
      .from('bag_weights')
      .insert({
        date: effectiveDate,
        buyer_id: buyerId,
        grade,
        bag_number: nextBagNumber,
        weight,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding bag weight:', error);
      throw error;
    }

    set((state) => ({
      bagWeights: [...state.bagWeights, mapBagWeight(data)],
    }));
  },

  updateBagWeight: async (bagId, weight, grade) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('bag_weights')
      .update({ weight, grade })
      .eq('id', bagId);

    if (error) {
      console.error('Error updating bag weight:', error);
      throw error;
    }

    set((state) => ({
      bagWeights: state.bagWeights.map((bag) =>
        bag.id === bagId ? { ...bag, weight, grade } : bag
      ),
    }));
  },

  deleteBagWeight: async (bagId) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('bag_weights')
      .delete()
      .eq('id', bagId);

    if (error) {
      console.error('Error deleting bag weight:', error);
      throw error;
    }

    set((state) => ({
      bagWeights: state.bagWeights.filter((bag) => bag.id !== bagId),
    }));
  },

  // --- Pure client-side ---

  getInventory: (date) => {
    const state = get();
    const totalBagsPerGrade: Record<string, number> = {};

    state.vehicles.filter((v) => v.date === date).forEach((vehicle) => {
      Object.entries(vehicle.gradeWiseBags).forEach(([grade, count]) => {
        totalBagsPerGrade[grade] = (totalBagsPerGrade[grade] || 0) + count;
      });
    });

    const soldBagsPerGrade: Record<string, number> = {};
    state.bagWeights.filter((b) => b.date === date).forEach((bag) => {
      soldBagsPerGrade[bag.grade] = (soldBagsPerGrade[bag.grade] || 0) + 1;
    });

    return state.grades
      .filter((g) => g.isActive)
      .map((grade) => ({
        grade: grade.name,
        totalBagsStart: totalBagsPerGrade[grade.name] || 0,
        soldBags: soldBagsPerGrade[grade.name] || 0,
        pendingBags:
          (totalBagsPerGrade[grade.name] || 0) -
          (soldBagsPerGrade[grade.name] || 0),
        color: grade.color,
      }));
  },
}));
