import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Filter, Plus, Edit2, Trash2, X, Save, Tag, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Brand, Category } from '../types';
import { cn } from '../lib/utils';

export default function BrandsCategories() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brands' | 'categories'>('brands');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Brand | Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const unsubBrands = onSnapshot(collection(db, 'brands'), (snapshot) => {
      setBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Brand)));
      setLoading(false);
    });
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubBrands();
      unsubCategories();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collectionName = activeTab;
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), formData);
      } else {
        await addDoc(collection(db, collectionName), formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: Brand | Category) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) {
      try {
        await deleteDoc(doc(db, activeTab, id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const items = activeTab === 'brands' ? brands : categories;

  const quickSetupCategories = [
    'Sticker', 'Bottle', 'Cap', 'Applicator', 'Shiner Box', 'Foam', 'Mini Shiner Box'
  ];

  const handleQuickSetup = async () => {
    if (!window.confirm('Add suggested raw material categories?')) return;
    try {
      for (const cat of quickSetupCategories) {
        if (!categories.find(c => c.name.toLowerCase() === cat.toLowerCase())) {
          await addDoc(collection(db, 'categories'), { name: cat, description: `Standard ${cat} category` });
        }
      }
    } catch (error) {
      console.error('Error in quick setup:', error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Brands & Categories</h1>
          <p className="text-gray-500 mt-2">Organize your inventory structure</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'categories' && categories.length === 0 && (
            <button
              onClick={handleQuickSetup}
              className="bg-gray-100 text-gray-600 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all"
            >
              Quick Setup
            </button>
          )}
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', description: '' });
              setIsModalOpen(true);
            }}
            className="bg-[#FF6321] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#FF6321]/20 hover:bg-[#E5591E] transition-all"
          >
            <Plus className="w-5 h-5" />
            Add {activeTab === 'brands' ? 'Brand' : 'Category'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('brands')}
          className={cn(
            "px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'brands' ? "bg-white text-[#FF6321] shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Bookmark className="w-4 h-4" />
          Brands
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            "px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'categories' ? "bg-white text-[#FF6321] shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Tag className="w-4 h-4" />
          Categories
        </button>
      </div>

      {/* List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-3xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Filter className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No {activeTab} found. Add one to get started.</p>
          </div>
        ) : (
          items.map(item => (
            <motion.div
              layout
              key={item.id}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#FF6321] transition-colors">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description || 'No description provided.'}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingItem ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all"
                    placeholder={`e.g. ${activeTab === 'brands' ? 'Olivo' : 'Bottle'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all text-sm resize-none"
                    placeholder={`Brief description of the ${activeTab.slice(0, -1)}...`}
                  />
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#FF6321] text-white rounded-2xl font-bold shadow-lg shadow-[#FF6321]/20 hover:bg-[#E5591E] transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
