import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FileText, TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subMonths, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Product, Transaction, Category } from '../types';
import { cn } from '../lib/utils';

export default function Reports() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubTransactions();
    };
  }, []);

  // Movement Data
  const getMovementData = () => {
    const now = new Date();
    if (timeRange === 'daily') {
      const last7Days = eachDayOfInterval({
        start: startOfDay(subMonths(now, 0).setDate(now.getDate() - 6)),
        end: endOfDay(now)
      });

      return last7Days.map(day => {
        const dayTxs = transactions.filter(tx => {
          const txDate = new Date(tx.date);
          return isWithinInterval(txDate, { start: startOfDay(day), end: endOfDay(day) });
        });

        return {
          name: format(day, 'EEE'),
          in: dayTxs.filter(tx => tx.type === 'IN').reduce((acc, tx) => acc + tx.quantity, 0),
          out: dayTxs.filter(tx => tx.type === 'OUT').reduce((acc, tx) => acc + tx.quantity, 0),
          delivery: dayTxs.filter(tx => tx.type === 'DELIVERY').reduce((acc, tx) => acc + tx.quantity, 0)
        };
      });
    } else {
      const last6Months = [5, 4, 3, 2, 1, 0].map(i => subMonths(now, i));

      return last6Months.map(month => {
        const monthTxs = transactions.filter(tx => {
          const txDate = new Date(tx.date);
          return isWithinInterval(txDate, { start: startOfMonth(month), end: endOfMonth(month) });
        });

        return {
          name: format(month, 'MMM'),
          in: monthTxs.filter(tx => tx.type === 'IN').reduce((acc, tx) => acc + tx.quantity, 0),
          out: monthTxs.filter(tx => tx.type === 'OUT').reduce((acc, tx) => acc + tx.quantity, 0),
          delivery: monthTxs.filter(tx => tx.type === 'DELIVERY').reduce((acc, tx) => acc + tx.quantity, 0)
        };
      });
    }
  };

  // Most Delivered/Used Raw Materials
  const getTopProducts = () => {
    const productUsage: Record<string, number> = {};
    transactions.filter(tx => tx.type === 'DELIVERY' || tx.type === 'OUT').forEach(tx => {
      productUsage[tx.productId] = (productUsage[tx.productId] || 0) + tx.quantity;
    });

    return Object.entries(productUsage)
      .map(([id, qty]) => ({
        name: products.find(p => p.id === id)?.name || 'Unknown',
        value: qty
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const movementData = getMovementData();
  const topProducts = getTopProducts();

  const handleDownload = () => {
    const headers = ['Name', 'Category', 'Current Stock', 'Unit'];
    const rows = products.map(p => [
      p.name,
      categories.find(c => c.id === p.categoryId)?.name || 'N/A',
      p.stock,
      p.unit
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#FF6321', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-96 bg-gray-100 rounded-3xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-64 bg-gray-100 rounded-3xl" />
      <div className="h-64 bg-gray-100 rounded-3xl" />
    </div>
  </div>;

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-2">Analyze your raw material movement and delivery</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-10 pr-10 py-3 bg-white border border-gray-100 rounded-2xl appearance-none focus:ring-2 focus:ring-[#FF6321] transition-all cursor-pointer font-bold text-sm shadow-sm"
            >
              <option value="daily">Last 7 Days</option>
              <option value="monthly">Last 6 Months</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
          <button 
            onClick={handleDownload}
            className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xl font-bold">Stock Movement</h2>
            <p className="text-sm text-gray-500">Comparison of stock IN vs OUT/DELIVERY</p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">In</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Out</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Delivery</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={movementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: '#F9FAFB' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="in" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="out" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="delivery" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Raw Materials Pie Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-8">Most Used/Delivered Raw Materials</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-8">Raw Material Performance</h2>
          <div className="space-y-6">
            {topProducts.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Total movement: {item.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>{Math.round((item.value / topProducts.reduce((acc, p) => acc + p.value, 0)) * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Share</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
