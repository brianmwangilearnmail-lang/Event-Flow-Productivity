import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testValidInsert() {
  // First, find a valid client
  const { data: clients } = await supabase.from('clients').select('id').limit(1);
  if (!clients || clients.length === 0) {
    console.log('No clients found to associate the quotation with.');
    return;
  }
  const clientId = clients[0].id;
  
  const testData = {
    clientId: clientId,
    number: 'TEST-INS-' + Date.now().toString().slice(-6),
    items: [],
    subtotal: 0,
    discountTotal: 0,
    globalDiscount: 0,
    taxTotal: 0,
    depositRequired: 0,
    grandTotal: 0,
    version: 1,
    preparedBy: 'Test Inspector'
  };
  
  const { data, error } = await supabase.from('quotations').insert(testData).select();
  if (error) {
    console.error('Error inserting valid quotation:', error);
  } else {
    console.log('Inserted successfully! Row keys/columns:');
    console.log(Object.keys(data[0]));
    console.log('Full row content:', data[0]);
    
    // Clean up
    const { error: deleteError } = await supabase.from('quotations').delete().eq('id', data[0].id);
    console.log('Cleanup error (if any):', deleteError);
  }
}

testValidInsert().catch(console.error);
