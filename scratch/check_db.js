
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase.from('invoices').select('*').limit(1);
  if (error) {
    console.error('Error fetching invoices:', error.message);
  } else {
    console.log('Columns in invoices:', Object.keys(data[0] || {}));
  }
  
  const { data: qData, error: qError } = await supabase.from('quotations').select('*').limit(1);
  if (qError) {
    console.error('Error fetching quotations:', qError.message);
  } else {
    console.log('Columns in quotations:', Object.keys(qData[0] || {}));
  }
}

checkColumns();
