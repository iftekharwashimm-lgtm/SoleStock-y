import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { LayoutDashboard, Package, ArrowLeftRight, FileText, LogOut, LogIn, Filter, Menu, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Types
import { User } from './types';

// Components
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import StockEntry from './components/StockEntry';
import Reports from './components/Reports';
import BrandsCategories from './components/BrandsCategories';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) errorMessage = parsedError.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-500 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-gray-900 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData({ id: firebaseUser.uid, ...userDoc.data() } as User);
        } else {
          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'user',
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
          });
          setUserData(newUser);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#FF6321] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center"
        >
          <div className="w-20 h-20 bg-[#FF6321] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FF6321]/20">
            <Package className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SoleStock</h1>
          <p className="text-gray-500 mb-8">Inventory Management for Shoe Care</p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-black text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 transition-transform duration-300 lg:translate-x-0 lg:static",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-[#FF6321] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6321]/20">
                <Package className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">SoleStock</span>
            </div>

            <nav className="flex-1 space-y-1">
              <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/products" icon={Package} label="Raw Materials List" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/stock-entry" icon={ArrowLeftRight} label="Stock Actions (IN/OUT/DELIVERY)" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/brands-categories" icon={Filter} label="Inventory Structure" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/reports" icon={FileText} label="Reports" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">
                  {userData?.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{userData?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-gray-50 text-gray-600 rounded-xl font-medium flex items-center gap-3 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock-entry" element={<StockEntry />} />
              <Route path="/brands-categories" element={<BrandsCategories />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}

function SidebarLink({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group",
        isActive
          ? "bg-[#FF6321] text-white shadow-lg shadow-[#FF6321]/20"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
      <span className="font-medium">{label}</span>
      {isActive && (
        <motion.div
          layoutId="active-pill"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </Link>
  );
}

export default App;
