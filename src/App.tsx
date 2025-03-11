import React, { useState, useEffect } from 'react';
import { Book, Search, Home, Settings, Library, LogIn, User, Moon, Sun } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Reader from './components/Reader';
import Directory from './components/Directory';
import HomeScreen from './components/HomeScreen';
import Auth from './components/Auth';
import UserLibrary from './components/UserLibrary';
import UserProfile from './components/UserProfile';
import MangaDetails from './components/MangaDetails';
import AdminPanel from './components/AdminPanel';
import { supabase } from './lib/supabaseClient';
import { useAuthStore } from './lib/store';

export type Manga = {
  id: string;
  title: string;
  cover: string;
  genres: string[];
  author: string;
  status: 'ongoing' | 'completed';
  rating: number;
  chapters: number;
  description: string;
};

export type User = {
  id: string;
  email: string;
  isAdmin: boolean;
  username?: string;
  avatar_url?: string;
};

type View = 'home' | 'directory' | 'manga-details' | 'reader' | 'library' | 'admin';

function App() {
  const { user, loading, fetchUserProfile } = useAuthStore();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : true;
  });

  useEffect(() => {
    // Set dark mode class on initial load
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowSettingsDropdown(false);
    setCurrentView('home');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleMangaSelect = (manga: Manga) => {
    setSelectedManga(manga);
    setCurrentView('manga-details');
  };

  const handleReadChapter = (mangaId: string, chapterNumber: number) => {
    setSelectedChapter(chapterNumber);
    setCurrentView('reader');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className={`fixed top-0 w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg z-50`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">Manga Reader</h1>
              <nav className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('home')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'home' 
                      ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200' 
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Home size={20} />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setCurrentView('directory')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'directory'
                      ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <Book size={20} />
                  <span>Directory</span>
                </button>
                {user && (
                  <button
                    onClick={() => setCurrentView('library')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      currentView === 'library'
                        ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Library size={20} />
                    <span>My Library</span>
                  </button>
                )}
                {user?.isAdmin && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      currentView === 'admin'
                        ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Settings size={20} />
                    <span>Admin</span>
                  </button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search manga..."
                  className={`w-64 px-4 py-2 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 focus:ring-blue-500' 
                      : 'bg-gray-200 focus:ring-blue-400'
                  } focus:outline-none focus:ring-2`}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    {user.avatar_url ? (
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${user.avatar_url}`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                    <span className="text-sm">{user.username || user.email}</span>
                  </button>
                  
                  {showSettingsDropdown && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } ring-1 ring-black ring-opacity-5`}>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setShowSettingsDropdown(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          Profile Settings
                        </button>
                        <button
                          onClick={toggleDarkMode}
                          className={`flex items-center w-full px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {isDarkMode ? (
                            <>
                              <Sun size={16} className="mr-2" />
                              Light Mode
                            </>
                          ) : (
                            <>
                              <Moon size={16} className="mr-2" />
                              Dark Mode
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleLogout}
                          className={`block w-full text-left px-4 py-2 text-sm text-red-600 ${
                            isDarkMode 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <LogIn size={20} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {currentView === 'home' && <HomeScreen onMangaSelect={handleMangaSelect} />}
        {currentView === 'directory' && <Directory onMangaSelect={handleMangaSelect} />}
        {currentView === 'manga-details' && selectedManga && (
          <MangaDetails
            manga={selectedManga}
            user={user}
            onBack={() => setCurrentView('directory')}
            onReadChapter={handleReadChapter}
          />
        )}
        {currentView === 'reader' && selectedManga && selectedChapter && (
          <Reader
            manga={selectedManga}
            user={user}
            chapterNumber={selectedChapter}
            onBack={() => setCurrentView('manga-details')}
          />
        )}
        {currentView === 'library' && user && <UserLibrary userId={user.id} onMangaSelect={handleMangaSelect} />}
        {currentView === 'admin' && user?.isAdmin && <AdminPanel />}
      </main>

      {/* Modals */}
      {showAuthModal && (
        <Auth onClose={() => setShowAuthModal(false)} />
      )}
      {showProfileModal && user && (
        <UserProfile
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={useAuthStore.getState().setUser}
        />
      )}
    </div>
  );
}

export default App;