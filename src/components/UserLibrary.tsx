import React, { useState, useEffect } from 'react';
import { Bookmark, CheckCircle, Clock, List, Star } from 'lucide-react';
import type { Manga } from '../App';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface UserLibraryProps {
  userId: string;
  onMangaSelect: (manga: Manga) => void;
}

type LibraryStatus = 'reading' | 'completed' | 'planned' | 'on-hold';

interface LibraryEntry {
  manga_id: string;
  manga_title: string;
  cover_url: string;
  author: string;
  rating: number;
  current_chapter: number;
  status: LibraryStatus;
}

function UserLibrary({ userId, onMangaSelect }: UserLibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryStatus>('reading');
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, [activeTab]);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_library_view')
        .select('*')
        .eq('user_id', userId)
        .eq('status', activeTab);

      if (error) throw error;

      setEntries(data || []);
    } catch (error: any) {
      console.error('Error loading library:', error);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: LibraryStatus; label: string; icon: React.ReactNode }[] = [
    { id: 'reading', label: 'Reading', icon: <Bookmark size={20} /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle size={20} /> },
    { id: 'planned', label: 'Plan to Read', icon: <Clock size={20} /> },
    { id: 'on-hold', label: 'On Hold', icon: <List size={20} /> },
  ];

  const handleMangaSelect = (mangaId: string) => {
    // Convert library entry to manga format
    const entry = entries.find(e => e.manga_id === mangaId);
    if (entry) {
      const manga: Manga = {
        id: entry.manga_id,
        title: entry.manga_title,
        cover: entry.cover_url,
        author: entry.author,
        rating: entry.rating,
        status: 'ongoing', // You might want to include this in the view
        genres: [], // You might want to include this in the view
        chapters: entry.current_chapter,
        description: '' // You might want to include this in the view
      };
      onMangaSelect(manga);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">My Library</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your library...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <div className="mb-4">
            <Bookmark size={48} className="mx-auto text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No manga in this category</h3>
          <p className="text-gray-400">
            Start adding manga to your {activeTab} list!
          </p>
        </div>
      )}

      {/* Manga Grid */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {entries.map(entry => (
            <div
              key={entry.manga_id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:transform hover:scale-105 transition-transform cursor-pointer"
              onClick={() => handleMangaSelect(entry.manga_id)}
            >
              <img
                src={entry.cover_url}
                alt={entry.manga_title}
                className="w-full h-48 object-cover"
              />
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-1">{entry.manga_title}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className="text-yellow-500" size={14} />
                    <span>{entry.rating}</span>
                  </div>
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                    Ch. {entry.current_chapter}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserLibrary;