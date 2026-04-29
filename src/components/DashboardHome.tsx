import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface DashboardHomeProps {
  onNavigate: (view: any) => void;
}

export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const clientCount = useLiveQuery(() => db.clients.count()) || 0;
  const eventCount = useLiveQuery(() => db.events.where('status').notEqual('Cancelled').count()) || 0;
  const draftQuotes = useLiveQuery(() => db.quotations.where('status').equals('Draft').count()) || 0;
  const approvedQuotes = useLiveQuery(() => db.quotations.where('status').equals('Approved').count()) || 0;
  const settings = (useLiveQuery(() => db.settings.toArray()) || [])[0];
  
  const [timeRange, setTimeRange] = useState('month');

  const recentActivity = useLiveQuery(() => 
    db.activityLogs.orderBy('timestamp').reverse().limit(6).toArray()
  ) || [];

  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.amountPaid), 0);
  
  const payments = useLiveQuery(() => db.payments.toArray()) || [];
  const recentPayments = useLiveQuery(async () => {
    const ps = await db.payments.reverse().limit(5).toArray();
    const clients = await db.clients.toArray();
    return ps.map(p => ({
      ...p,
      clientName: clients.find(c => c.id === p.clientId)?.fullName || 'Unknown'
    }));
  }) || [];
  const monthEarnings = payments
    .filter(p => new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0);

  const stats = [
    { label: 'Total Clients', value: clientCount, icon: Users, color: 'bg-blue-500', trend: '+12%', target: 'clients' },
    { label: 'Active Events', value: eventCount, icon: Calendar, color: 'bg-gold-500', trend: '+5%', target: 'events' },
    { label: 'Draft Quotations', value: draftQuotes, icon: FileText, color: 'bg-orange-500', trend: '-2%', target: 'quotations' },
    { label: 'Month Earnings', value: formatCurrency(monthEarnings), icon: TrendingUp, color: 'bg-green-500', trend: '+18%', target: 'receipts' },
  ];

  const chartData = React.useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let dateFormat = 'MMM'; // default format

    switch(timeRange) {
      case 'biweekly': startDate.setDate(now.getDate() - 14); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case '90days': startDate.setDate(now.getDate() - 90); break;
      case '6months': startDate.setMonth(now.getMonth() - 6); break;
      case '1year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setFullYear(now.getFullYear() - 1);
    }
    
    const filteredPayments = payments.filter(p => new Date(p.date) >= startDate);
    
    // Aggregate by month for long ranges, days/weeks for short? 
    // Let's just group by month for now, it's safer for starters, 
    // or maybe group by day for month/biweekly?
    
    const buckets: Record<string, number> = {};
    
    filteredPayments.forEach(p => {
      const date = new Date(p.date);
      let key = '';
      if (['biweekly', 'month'].includes(timeRange)) {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      buckets[key] = (buckets[key] || 0) + p.amount;
    });

    return Object.entries(buckets).map(([name, revenue]) => ({ name, revenue }));
  }, [payments, timeRange]);

  const displayedData = chartData;

  return (
    <div className="space-y-4 md:space-y-6 p-0 md:p-0">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-0">
        <div>
          <h1 className="text-xl md:text-3xl font-serif font-black text-black">Welcome, {settings?.adminName || 'Admin'}</h1>
          <p className="text-[10px] md:text-sm text-gray-500 mt-0.5">{settings?.name || 'EventFlow'} Management today.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => onNavigate('clients')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium text-[10px] md:text-sm"
          >
            <Plus size={14} />
            Client
          </button>
          <button 
            onClick={() => onNavigate('quotations')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 bg-white text-black rounded-lg hover:bg-gray-50 transition-all font-medium text-[10px] md:text-sm"
          >
            Quote
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
        {stats.map((stat, i) => (
          <button 
            key={i} 
            onClick={() => onNavigate(stat.target)}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group text-left w-full flex items-center gap-3"
          >
            <div className={cn("p-2.5 rounded-lg text-white shrink-0", stat.color === 'bg-gold-500' ? 'bg-[#D4AF37]' : stat.color)}>
              <stat.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-lg font-black text-black truncate">{stat.value}</p>
                <span className={cn(
                  "text-[8px] font-bold px-1 py-0.5 rounded-full",
                  stat.trend.startsWith('+') ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                )}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Chart */}
        <div className="md:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight">Revenue</h3>
            </div>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none font-bold uppercase tracking-widest text-[#D4AF37]"
            >
              <option value="biweekly">Bi-Weekly</option>
              <option value="month">Month</option>
              <option value="90days">Last 90 Days</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
            </select>
          </div>
          <div className="h-64 md:h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAFAFA" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#BBB' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#BBB' }}
                />
                <Tooltip 
                  cursor={{ fill: '#F5F5F5', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-base uppercase tracking-tight">Activity</h3>
            <button 
              onClick={() => onNavigate('history')}
              className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest"
            >
              All
            </button>
          </div>
          <div className="space-y-4 flex-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <button 
                  key={i} 
                  onClick={() => activity.linkedType && onNavigate(
                    activity.linkedType === 'Client' ? 'clients' :
                    activity.linkedType === 'Event' ? 'events' :
                    activity.linkedType === 'Quotation' ? 'quotations' :
                    activity.linkedType === 'Invoice' ? 'invoices' :
                    activity.linkedType === 'Receipt' ? 'receipts' : 'dashboard'
                  )}
                  className="flex gap-3 group w-full text-left"
                  disabled={!activity.linkedType}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 shrink-0 border border-gray-50">
                    <Clock size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-black leading-tight truncate-2-lines">{activity.description}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-tighter mt-0.5">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activity.user}
                    </p>
                  </div>
                  {activity.linkedType && activity.linkedType !== 'Catalog' && (activity.linkedType as string) !== 'ActivityLog' && (
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      <span className="text-[8px] font-black text-gold-deep uppercase tracking-widest border border-gold-deep/20 px-2 py-1 rounded hover:bg-gold-deep hover:text-white transition-all">View</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-gray-300 italic text-[10px]">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions / Recent Settlements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-0">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-base uppercase tracking-tight">Schedule</h3>
            <button 
              onClick={() => onNavigate('events')}
              className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest"
            >
              View
            </button>
          </div>
          <div className="flex items-center justify-center py-10 border border-dashed border-gray-100 rounded-xl">
            <p className="text-gray-300 text-[10px] uppercase tracking-widest">No upcoming events</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-base uppercase tracking-tight">Settlements</h3>
            <button 
              onClick={() => onNavigate('receipts')}
              className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest"
            >
              Ledger
            </button>
          </div>
          <div className="space-y-4">
            {recentPayments.length > 0 ? (
              recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 grow-0 shrink-0">
                  <div className="min-w-0 mr-2">
                    <p className="text-xs font-bold text-black truncate">{p.clientName}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{p.method}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-green-600">{formatCurrency(p.amount)}</p>
                    <p className="text-[9px] text-gray-400">{p.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-gray-300 italic text-[10px]">No payments recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
