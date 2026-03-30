import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownRight, ShoppingCart, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Product, Transaction, TransactionType } from '../types';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productList);
      setLoading(false);
    });

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(5)),
      (snapshot) => {
        const transactionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transactionList);
      }
    );

    return () => {
      unsubProducts();
      unsubTransactions();
    };
  }, []);

  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl" />)}
    </div>
    <div className="h-64 bg-gray-100 rounded-3xl" />
  </div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of your raw material inventory</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label="Total Raw Materials"
          value={totalProducts}
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Stock"
          value={totalStock}
          color="bg-green-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={lowStockItems.length}
          color="bg-amber-500"
          alert={lowStockItems.length > 0}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Recent Activity"
          value={transactions.length}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Low Stock Alerts</h2>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
              {lowStockItems.length} Items
            </span>
          </div>
          <div className="space-y-4">
            {lowStockItems.length === 0 ? (
              <p className="text-gray-400 text-sm italic">All stock levels are healthy.</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.variant || 'Standard'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">{item.stock} {item.unit}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Threshold: {item.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-widest border-bottom border-gray-50">
                  <th className="pb-4 font-medium">Raw Material</th>
                  <th className="pb-4 font-medium">Type</th>
                  <th className="pb-4 font-medium">Qty</th>
                  <th className="pb-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => {
                  const product = products.find(p => p.id === tx.productId);
                  return (
                    <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4">
                        <p className="font-semibold text-gray-900">{product?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{tx.note || 'No note'}</p>
                      </td>
                      <td className="py-4">
                        <TransactionBadge type={tx.type} />
                      </td>
                      <td className="py-4 font-mono font-bold">
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        {format(new Date(tx.date), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, color, alert }: { icon: any, label: string, value: number, color: string, alert?: boolean }) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", color, alert && "animate-pulse")}>
        <Icon className="text-white w-7 h-7" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TransactionBadge({ type }: { type: TransactionType }) {
  const styles = {
    IN: "bg-green-100 text-green-700",
    OUT: "bg-red-100 text-red-700",
    DELIVERY: "bg-blue-100 text-blue-700"
  };

  const icons = {
    IN: ArrowUpRight,
    OUT: ArrowDownRight,
    DELIVERY: ShoppingCart
  };

  const Icon = icons[type];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", styles[type])}>
      <Icon className="w-3.5 h-3.5" />
      {type}
    </span>
  );
}
