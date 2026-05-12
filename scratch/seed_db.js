
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedData() {
  console.log('Seeding dummy data...');
  
  // 1. Create a client
  const { data: client, error: clientError } = await supabase.from('clients').insert({
    fullName: 'Test Client',
    phone: '123456789',
    email: 'test@example.com',
    address: '123 Test St',
    communicationChannel: 'Email',
    tags: [],
    notes: 'Test notes',
    status: 'New Inquiry',
    assignedStaff: 'Admin'
  }).select().single();
  
  if (clientError) {
    console.error('Error creating client:', clientError.message);
    return;
  }
  
  console.log('Created client:', client.id);
  
  // 2. Create an event
  const { data: event, error: eventError } = await supabase.from('events').insert({
    clientId: client.id,
    title: 'Test Event',
    type: 'Wedding',
    date: '2026-12-25',
    time: '18:00',
    venueName: 'Test Venue',
    venueAddress: 'Test Address',
    guestCount: 100,
    themeNotes: '',
    serviceRequirements: '',
    assignedPlanner: 'Admin',
    status: 'Proposed',
    requirements: {}
  }).select().single();
  
  if (eventError) {
    console.error('Error creating event:', eventError.message);
    return;
  }
  
  console.log('Created event:', event.id);
  
  // 3. Create an invoice
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
    clientId: client.id,
    eventId: event.id,
    number: 'INV-TEST-01',
    type: 'Full',
    issueDate: '2026-05-11',
    dueDate: '2026-05-20',
    status: 'Sent',
    items: [],
    subtotal: 1000,
    taxTotal: 0,
    discountTotal: 0,
    amountPaid: 0,
    grandTotal: 1000,
    notes: 'Test invoice'
  }).select().single();
  
  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError.message);
  } else {
    console.log('Created invoice:', invoice.id);
  }
}

seedData();
