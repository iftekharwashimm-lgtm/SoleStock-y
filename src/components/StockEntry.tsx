import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeftRight, Package, ArrowUpRight, ArrowDownRight, ShoppingCart, Save, Calendar, FileText, Search, ChevronDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, TransactionType, Category, Brand } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function StockEntry() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'IN' as TransactionType,
    quantity: 1,
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    note: ''
  });

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const unsubBrands = onSnapshot(collection(db, 'brands'), (snapshot) => {
      setBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand)));
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBrands();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      const transactionRef = collection(db, 'transactions');

      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Product does not exist!");

        const currentStock = productDoc.data().stock;
        let newStock = currentStock;

        if (formData.type === 'IN') {
          newStock += formData.quantity;
        } else {
          // Allow negative stock to handle recording delays, but we can still log it
          newStock -= formData.quantity;
        }

        transaction.update(productRef, { stock: newStock });

        const newTxRef = doc(transactionRef);
        transaction.set(newTxRef, {
          productId: selectedProduct.id,
          type: formData.type,
          quantity: formData.quantity,
          date: new Date(formData.date).toISOString(),
          note: formData.note,
          userId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
      });

      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
      setFormData({ ...formData, quantity: 1, note: '' });
      setSelectedProduct(null);
      setSearchTerm('');
    } catch (error: any) {
      console.error('Transaction error:', error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.WRITE, `products/${selectedProduct.id} or transactions`);
      }
      alert(error.message || 'Error processing transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedProducts = categories
    .map(cat => ({
      ...cat,
      items: filteredProducts.filter(p => p.categoryId === cat.id)
    }))
    .filter(group => group.items.length > 0);

  const uncategorizedItems = filteredProducts.filter(p => !categories.find(c => c.id === p.categoryId));
  if (uncategorizedItems.length > 0) {
    groupedProducts.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      items: uncategorizedItems
    } as any);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Stock Entry</h1>
          <p className="text-gray-500 mt-2">Manage IN, OUT, and DELIVERY movements</p>
        </div>
        
        {/* Transaction Type at the Top */}
        <div className="grid grid-cols-3 gap-3 bg-white p-2 rounded-3xl shadow-sm border border-gray-100">
          <TypeButton
            type="IN"
            active={formData.type === 'IN'}
            onClick={() => setFormData({ ...formData, type: 'IN' })}
            icon={ArrowUpRight}
            label="Stock In"
            color="green"
          />
          <TypeButton
            type="OUT"
            active={formData.type === 'OUT'}
            onClick={() => setFormData({ ...formData, type: 'OUT' })}
            icon={ArrowDownRight}
            label="Stock Out"
            color="red"
          />
          <TypeButton
            type="DELIVERY"
            active={formData.type === 'DELIVERY'}
            onClick={() => setFormData({ ...formData, type: 'DELIVERY' })}
            icon={ShoppingCart}
            label="Delivery"
            color="blue"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Material Selection Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="space-y-6">
              {/* Step 1: Select Category */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 px-2">Step 1: Select Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                      selectedCategory === 'all' ? "bg-[#FF6321] text-white border-[#FF6321]" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                    )}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                        selectedCategory === cat.id ? "bg-[#FF6321] text-white border-[#FF6321]" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Product */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Step 2: Select Raw Material</label>
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6321] transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {groupedProducts.length === 0 ? (
                    <div className="text-center py-10">
                      <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No raw materials found</p>
                    </div>
                  ) : (
                    groupedProducts.map(group => (
                      <div key={group.id} className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-300 px-2">{group.name}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.items.map(product => {
                            const brandName = brands.find(b => b.id === product.brandId)?.name || 'Generic';
                            return (
                              <button
                                key={product.id}
                                onClick={() => setSelectedProduct(product)}
                                className={cn(
                                  "text-left p-3 rounded-xl transition-all border-2 flex flex-col justify-between",
                                  selectedProduct?.id === product.id
                                    ? "border-[#FF6321] bg-[#FF6321]/5 shadow-sm"
                                    : "border-transparent bg-gray-50 hover:bg-gray-100"
                                )}
                              >
                                <div>
                                  <p className="text-[9px] font-bold text-[#FF6321] uppercase tracking-widest">{brandName}</p>
                                  <h5 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h5>
                                  {product.variant && (
                                    <p className="text-[10px] text-gray-500 font-medium italic">{product.variant}</p>
                                  )}
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200/50">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase">Stock</span>
                                  <span className="text-xs font-bold text-gray-700">
                                    {product.stock} <span className="text-[9px]">{product.unit}</span>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Details Form */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {!selectedProduct ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]"
              >
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                  <ArrowLeftRight className="text-gray-300 w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Record</h3>
                <p className="text-gray-400 max-w-[240px] mx-auto">Select a raw material from the list to start your {formData.type} transaction.</p>
              </motion.div>
            ) : (
              <motion.form
                key={selectedProduct.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8 sticky top-8"
              >
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                  <div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-2 inline-block",
                      formData.type === 'IN' ? "bg-green-100 text-green-600" : 
                      formData.type === 'OUT' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                      Recording {formData.type}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {brands.find(b => b.id === selectedProduct.brandId)?.name} {selectedProduct.name}
                    </h2>
                    {selectedProduct.variant && (
                      <p className="text-gray-500 font-medium">{selectedProduct.variant}</p>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <ChevronDown className="w-6 h-6 text-gray-400 rotate-90" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex justify-between">
                      Quantity to {formData.type}
                      <span className="text-gray-400 font-normal">Unit: {selectedProduct.unit}</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.quantity || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFormData({ ...formData, quantity: isNaN(val) ? 0 : val });
                      }}
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all font-bold text-2xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        required
                        type="datetime-local"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Transaction Note</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 text-gray-400 w-4 h-4" />
                      <textarea
                        rows={3}
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all text-sm resize-none"
                        placeholder="e.g. Received from supplier, Production batch #..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-5 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 text-lg",
                      isSubmitting ? "bg-gray-200 text-gray-400 cursor-not-allowed" : 
                      formData.type === 'IN' ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700" :
                      formData.type === 'OUT' ? "bg-red-600 text-white shadow-red-600/20 hover:bg-red-700" :
                      "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
                    )}
                  >
                    {isSubmitting ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Save className="w-6 h-6" />
                        Complete {formData.type}
                      </>
                    )}
                  </button>
                </div>

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 text-green-700 rounded-2xl text-center font-bold text-sm border border-green-100"
                  >
                    Transaction recorded successfully!
                  </motion.div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TypeButton({ type, active, onClick, icon: Icon, label, color }: { type: string, active: boolean, onClick: () => void, icon: any, label: string, color: string }) {
  const colors = {
    green: active ? "bg-green-500 text-white shadow-green-500/20" : "bg-green-50 text-green-600 hover:bg-green-100",
    red: active ? "bg-red-500 text-white shadow-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100",
    blue: active ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-blue-50 text-blue-600 hover:bg-blue-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl transition-all gap-2 border-2 border-transparent",
        colors[color as keyof typeof colors],
        active && "shadow-lg scale-105"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
