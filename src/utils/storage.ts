import { AppState, Card, Statement, PayoffStrategy, Asset } from '../types';
import { SAMPLE_CARDS, SAMPLE_STATEMENTS } from '../data/sampleData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'debt_command_center_state';

const DEFAULT_ASSETS: Asset[] = [
  { id: 'a1', label: 'Emergency Fund', amount: 5000, category: 'savings' },
  { id: 'a2', label: '401(k)', amount: 18000, category: 'retirement' },
];

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migration guards — add missing fields from older saves
      if (!parsed.payments)       parsed.payments = [];
      if (!parsed.monthlyReviews) parsed.monthlyReviews = [];
      if (!parsed.manualEvents)   parsed.manualEvents = [];
      if (!parsed.assets)         parsed.assets = DEFAULT_ASSETS;
      if (!parsed.snowflakes)     parsed.snowflakes = [];
      if (!parsed.scenarios)      parsed.scenarios = [];
      if (!parsed.incomeSources)  parsed.incomeSources = [];
      if (!parsed.householdExpenses) parsed.householdExpenses = [];
      if (parsed.income === undefined)           parsed.income = 5000;
      if (parsed.monthlyExpenses === undefined)  parsed.monthlyExpenses = 3000;
      if (parsed.brightStashBalance === undefined) parsed.brightStashBalance = 0;
      if (parsed.isPrivacyMode === undefined)    parsed.isPrivacyMode = false;
      return parsed;
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return {
    cards: SAMPLE_CARDS,
    statements: SAMPLE_STATEMENTS,
    payments: [],
    monthlyBudget: 1000,
    income: 5000,
    monthlyExpenses: 3000,
    brightStashBalance: 0,
    preferredStrategy: PayoffStrategy.AVALANCHE,
    manualEvents: [],
    monthlyReviews: [],
    assets: DEFAULT_ASSETS,
    snowflakes: [],
    scenarios: [],
    incomeSources: [],
    householdExpenses: [],
    isPrivacyMode: false,
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const syncToSupabase = async (state: AppState) => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Skipping sync.');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase
    .from('user_data')
    .upsert({ 
      user_id: session.user.id, 
      state_json: state,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error syncing to Supabase:', error);
    throw error;
  }
};

export const loadFromSupabase = async (): Promise<AppState | null> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Skipping cloud load.');
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('state_json')
    .eq('user_id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error loading from Supabase:', error);
    return null;
  }

  return data?.state_json || null;
};
