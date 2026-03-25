import { create } from 'zustand';
import { Vehicle, Buyer, BagWeight, Grade, GradeInventory, BuyerRate } from './types';
import { formatDate } from './calculations';
import { createClient } from './supabase/client';
import { mapVehicle, mapBuyer, mapGrade, mapBagWeight, mapBuyerRate } from './supabase/mappers';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  selectedDate: string;
  vehicles: Vehicle[];
  buyers: Buyer[];
  grades: Grade[];
  bagWeights: BagWeight[];
  buyerRates: BuyerRate[];
  loading: boolean;
  datesWithData: Set<string>;

  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setSelectedDate: (date: string) => void;

  // Fetch methods
  fetchGrades: (date: string) => Promise<void>;
  fetchBuyers: (date: string) => Promise<void>;
  fetchVehiclesForDate: (date: string) => Promise<void>;
  fetchBagWeightsForDate: (date: string) => Promise<void>;
  fetchBuyerRatesForDate: (date: string) => Promise<void>;
  fetchDatesWithData: () => Promise<void>;

  // Mutations (async, Supabase-backed)
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (vehicleId: string, data: { vehicleNumber: string; gradeWiseBags: Record<string, number> }) => Promise<void>;
  addBuyer: (buyer: Omit<Buyer, 'id'>) => Promise<void>;
  updateBuyer: (buyerId: string, data: { name?: string; phone?: string }) => Promise<void>;
  deleteBuyer: (buyerId: string) => Promise<void>;
  addGrade: (gradeName: string, color: string, date: string) => Promise<void>;
  updateGrade: (gradeId: string, color: string) => Promise<void>;
  deleteGrade: (gradeId: string) => Promise<void>;
  addBagWeight: (buyerId: string, grade: string, weight: number, date?: string) => Promise<void>;
  updateBagWeight: (bagId: string, weight: number, grade: string) => Promise<void>;
  deleteBagWeight: (bagId: string) => Promise<void>;
  setBuyerRate: (buyerId: string, grade: string, date: string, rate: number) => Promise<void>;

  resetDay: (date: string) => Promise<void>;

  // Pure client-side
  getInventory: (date: string) => GradeInventory[];
  getBuyerRate: (buyerId: string, grade: string, date: string) => number | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  selectedDate: formatDate(new Date()),
  vehicles: [],
  buyers: [],
  grades: [],
  bagWeights: [],
  buyerRates: [],
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
      buyerRates: [],
      datesWithData: new Set<string>(),
    });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  // --- Fetch methods ---

  fetchGrades: async (date) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('is_active', true)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching grades:', error);
      throw new Error('Failed to load grades. Please check your connection.');
    }
    set({ grades: (data || []).map(mapGrade) });
  },

  fetchBuyers: async (date) => {
    const supabase = createClient();
    // Try fetching with date filter first (per-date buyers model)
    let { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('is_active', true)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback: date column may not exist yet (migration not run)
      const result = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      data = result.data;
      if (result.error) {
        console.error('Error fetching buyers:', result.error);
        throw new Error('Failed to load buyers. Please check your connection.');
      }
    }

    // Also fetch legacy buyers (date IS NULL) so existing data still shows
    if (!error) {
      const { data: legacyData } = await supabase
        .from('buyers')
        .select('*')
        .eq('is_active', true)
        .is('date', null)
        .order('created_at', { ascending: true });
      if (legacyData && legacyData.length > 0) {
        const existingIds = new Set((data || []).map((b: any) => b.id));
        const newLegacy = legacyData.filter((b: any) => !existingIds.has(b.id));
        data = [...(data || []), ...newLegacy];
      }
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
      throw new Error('Failed to load vehicles. Please check your connection.');
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
      throw new Error('Failed to load bag weights. Please check your connection.');
    }
    set({ bagWeights: (data || []).map(mapBagWeight) });
  },

  fetchBuyerRatesForDate: async (date) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('buyer_rates')
      .select('*')
      .eq('date', date);

    if (error) {
      // Table may not exist yet - silently ignore
      console.warn('Could not fetch buyer rates (table may not exist yet):', error.message);
      set({ buyerRates: [] });
      return;
    }
    set({ buyerRates: (data || []).map(mapBuyerRate) });
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
    let user = null;
    try {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser();
      user = fetchedUser;
    } catch {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
    }

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

  updateVehicle: async (vehicleId, data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('vehicles')
      .update({
        vehicle_number: data.vehicleNumber,
        grade_wise_bags: data.gradeWiseBags,
      })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }

    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? { ...v, vehicleNumber: data.vehicleNumber, gradeWiseBags: data.gradeWiseBags }
          : v
      ),
    }));
  },

  addBuyer: async (buyer) => {
    const supabase = createClient();
    const insertData: Record<string, unknown> = {
      name: buyer.name,
      phone: buyer.phone || null,
      is_active: true,
    };
    if (buyer.date) insertData.date = buyer.date;

    let { data, error } = await supabase
      .from('buyers')
      .insert(insertData)
      .select()
      .single();

    // Fallback: if date column doesn't exist yet, retry without it
    if (error && buyer.date) {
      const { date: _, ...withoutDate } = insertData;
      const result = await supabase
        .from('buyers')
        .insert(withoutDate)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error adding buyer:', error);
      throw error;
    }

    set((state) => ({
      buyers: [...state.buyers, mapBuyer(data)],
    }));
  },

  updateBuyer: async (buyerId, data) => {
    const supabase = createClient();
    const updateData: Record<string, string> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const { error } = await supabase
      .from('buyers')
      .update(updateData)
      .eq('id', buyerId);

    if (error) {
      console.error('Error updating buyer:', error);
      throw error;
    }

    set((state) => ({
      buyers: state.buyers.map((b) =>
        b.id === buyerId ? { ...b, ...data } : b
      ),
    }));
  },

  deleteBuyer: async (buyerId) => {
    const supabase = createClient();

    // Delete bag_weights for this buyer first
    const { error: bwError } = await supabase
      .from('bag_weights')
      .delete()
      .eq('buyer_id', buyerId);

    if (bwError) {
      console.error('Error deleting buyer bag weights:', bwError);
      throw bwError;
    }

    // Delete buyer_rates for this buyer
    await supabase.from('buyer_rates').delete().eq('buyer_id', buyerId);

    // Soft-delete the buyer
    const { error } = await supabase
      .from('buyers')
      .update({ is_active: false })
      .eq('id', buyerId);

    if (error) {
      console.error('Error deleting buyer:', error);
      throw error;
    }

    set((state) => ({
      buyers: state.buyers.filter((b) => b.id !== buyerId),
      bagWeights: state.bagWeights.filter((b) => b.buyerId !== buyerId),
      buyerRates: state.buyerRates.filter((r) => r.buyerId !== buyerId),
    }));
  },

  addGrade: async (gradeName, color, date) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('grades')
      .insert({
        name: gradeName,
        color,
        date,
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

  updateGrade: async (gradeId, color) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('grades')
      .update({ color })
      .eq('id', gradeId);

    if (error) {
      console.error('Error updating grade:', error);
      throw error;
    }

    set((state) => ({
      grades: state.grades.map((g) =>
        g.id === gradeId ? { ...g, color } : g
      ),
    }));
  },

  deleteGrade: async (gradeId) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('grades')
      .update({ is_active: false })
      .eq('id', gradeId);

    if (error) {
      console.error('Error deleting grade:', error);
      throw error;
    }

    set((state) => ({
      grades: state.grades.filter((g) => g.id !== gradeId),
    }));
  },

  addBagWeight: async (buyerId, grade, weight, date) => {
    const state = get();
    const effectiveDate = date || state.selectedDate;

    // Inventory validation: block if no pending bags for this grade
    const inventory = get().getInventory(effectiveDate);
    const gradeInv = inventory.find((inv) => inv.grade === grade);
    if (!gradeInv || gradeInv.pendingBags <= 0) {
      throw new Error('No inventory available for this grade');
    }

    const supabase = createClient();
    let user = null;
    try {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser();
      user = fetchedUser;
    } catch {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
    }

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

  setBuyerRate: async (buyerId, grade, date, rate) => {
    const supabase = createClient();

    // Upsert: insert or update on conflict
    const { data, error } = await supabase
      .from('buyer_rates')
      .upsert(
        { buyer_id: buyerId, grade, date, rate },
        { onConflict: 'buyer_id,grade,date' }
      )
      .select()
      .single();

    if (error) {
      console.warn('Could not save buyer rate (table may not exist yet):', error.message);
      return;
    }

    set((state) => {
      const existing = state.buyerRates.findIndex(
        (r) => r.buyerId === buyerId && r.grade === grade && r.date === date
      );
      if (existing >= 0) {
        const updated = [...state.buyerRates];
        updated[existing] = mapBuyerRate(data);
        return { buyerRates: updated };
      }
      return { buyerRates: [...state.buyerRates, mapBuyerRate(data)] };
    });
  },

  resetDay: async (date) => {
    const supabase = createClient();

    // Delete buyer_rates for this date
    await supabase.from('buyer_rates').delete().eq('date', date);

    // Delete bag_weights for this date first (depends on vehicles/grades)
    const { error: bwError } = await supabase
      .from('bag_weights')
      .delete()
      .eq('date', date);
    if (bwError) {
      console.error('Error deleting bag weights:', bwError);
      throw new Error('Failed to reset day: could not delete bag weights.');
    }

    // Delete vehicles for this date
    const { error: vError } = await supabase
      .from('vehicles')
      .delete()
      .eq('date', date);
    if (vError) {
      console.error('Error deleting vehicles:', vError);
      throw new Error('Failed to reset day: could not delete vehicles.');
    }

    // Soft-delete grades for this date
    const { error: gError } = await supabase
      .from('grades')
      .update({ is_active: false })
      .eq('date', date);
    if (gError) {
      console.error('Error deleting grades:', gError);
      throw new Error('Failed to reset day: could not delete grades.');
    }

    // Soft-delete buyers for this date
    const { error: buyerError } = await supabase
      .from('buyers')
      .update({ is_active: false })
      .eq('date', date);
    if (buyerError) {
      console.error('Error deleting buyers:', buyerError);
      throw new Error('Failed to reset day: could not delete buyers.');
    }

    // Clear local state
    set((state) => ({
      bagWeights: state.bagWeights.filter((b) => b.date !== date),
      vehicles: state.vehicles.filter((v) => v.date !== date),
      grades: state.grades.filter((g) => g.date !== date),
      buyers: state.buyers.filter((b) => b.date !== date),
      buyerRates: state.buyerRates.filter((r) => r.date !== date),
    }));
  },

  // --- Pure client-side ---

  getInventory: (date) => {
    const state = get();
    const totalBagsPerGrade: Record<string, number> = {};

    state.vehicles.filter((v) => v.date === date).forEach((vehicle) => {
      Object.entries(vehicle.gradeWiseBags).forEach(([grade, count]) => {
        totalBagsPerGrade[grade] = (totalBagsPerGrade[grade] || 0) + Number(count);
      });
    });

    // Only count bags from active buyers
    const activeBuyerIds = new Set(state.buyers.map((b) => b.id));
    const soldBagsPerGrade: Record<string, number> = {};
    state.bagWeights.filter((b) => b.date === date && activeBuyerIds.has(b.buyerId)).forEach((bag) => {
      soldBagsPerGrade[bag.grade] = (soldBagsPerGrade[bag.grade] || 0) + 1;
    });

    return state.grades
      .filter((g) => g.isActive)
      .map((grade) => ({
        grade: grade.name,
        totalBagsStart: totalBagsPerGrade[grade.name] || 0,
        soldBags: soldBagsPerGrade[grade.name] || 0,
        pendingBags: Math.max(
          0,
          (totalBagsPerGrade[grade.name] || 0) -
          (soldBagsPerGrade[grade.name] || 0)
        ),
        color: grade.color,
      }));
  },

  getBuyerRate: (buyerId, grade, date) => {
    const state = get();
    const found = state.buyerRates.find(
      (r) => r.buyerId === buyerId && r.grade === grade && r.date === date
    );
    return found?.rate;
  },
}));
