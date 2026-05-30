import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const testData = {
    clientId: 1,
    number: 'TEST-INSERT-2',
    items: [],
    subtotal: 0,
    discountTotal: 0,
    globalDiscount: 0,
    taxTotal: 0,
    depositRequired: 0,
    grandTotal: 0,
    version: 1,
    preparedBy: 'Test',
    // Try snake_case
    transport_price: 100,
    labor_price: 100,
    labor_staff_count: 2
  };
  
  const { data, error } = await supabase.from('quotations').insert(testData).select();
  console.log('Insert result snake_case:', error?.message);
}

testInsert().catch(console.error);
