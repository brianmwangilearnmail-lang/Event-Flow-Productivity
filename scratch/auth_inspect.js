import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const email = `inspect_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  // 1. Sign up a user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (signUpError) {
    console.error('Error signing up:', signUpError);
    return;
  }
  
  const user = authData.user;
  console.log('Signed up temporary user:', user.email);

  // Set the session
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token
  });

  if (sessionError) {
    console.error('Error setting session:', sessionError);
    return;
  }
  
  // 2. Create client
  const { data: client, error: clientError } = await supabase.from('clients').insert({
    fullName: 'Test Inspect Client',
    phone: '123456789',
    email: 'inspect_client@example.com',
    address: '123 Test St',
    communicationChannel: 'Email',
    tags: [],
    notes: 'Test notes',
    status: 'New Inquiry',
    assignedStaff: 'Admin'
  }).select().single();
  
  if (clientError) {
    console.error('Error creating client:', clientError);
    return;
  }
  console.log('Created client:', client.id);

  // 3. Create quotation
  const { data: quotation, error: quoteError } = await supabase.from('quotations').insert({
    clientId: client.id,
    number: 'QTN-' + Date.now().toString().slice(-6),
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'KES',
    status: 'Draft',
    items: [],
    subtotal: 0,
    discountTotal: 0,
    globalDiscount: 0,
    taxTotal: 0,
    depositRequired: 0,
    grandTotal: 0,
    version: 1,
    preparedBy: 'Test Inspector'
  }).select().single();

  if (quoteError) {
    console.error('Error creating quotation:', quoteError);
  } else {
    console.log('Quotation Columns:');
    console.log(Object.keys(quotation));
    console.log('Quotation Data:', quotation);
    
    // Clean up
    await supabase.from('quotations').delete().eq('id', quotation.id);
  }
  
  // Delete client
  await supabase.from('clients').delete().eq('id', client.id);
  
  // Delete user is not possible from client SDK, but that's fine for test
}

inspect().catch(console.error);
