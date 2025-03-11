import React, { useState, useEffect } from 'react';
import { Book, Star, Clock, ArrowLeft, Plus, BookOpen } from 'lucide-react';
import type { Manga } from '../App';
import type { User } from '../App';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface MangaDetailsProps {
  manga: Manga;
  user: User | null;
  onBack: () => void;
  onReadChapter: (mangaId: string, chapterNumber: number) => void;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  created_at: string;
}

interface LibraryStatus {
  status: 'reading' | 'completed' | 'planned' | 'on-hold';
  current_chapter: number;
}

function MangaDetails({ manga, user, onBack, onReadChapter }: MangaDetailsProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus | null>(null);

  useEffect(() => {
    loadChapters();
    if (user) {
      loadLibraryStatus();
    }
  }, [manga.id, user]);

  const loadChapters = async () => {
    try {
      // Ensure manga.id is a valid UUID
      if (!manga.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(manga.id)) {
        throw new Error('Invalid manga ID');
      }

      const { data, error } = await supabase
        .from('chapters')
        .select('id, number, title, created_at')
        .eq('manga_id', manga.id)
        .order('number');

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const loadLibraryStatus = async () => {
    if (!user || !manga.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(manga.id)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_library')
        .select('status, current_chapter')
        .eq('manga_id', manga.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setLibraryStatus(data || null);
    } catch (error) {
      console.error('Error loading library status:', error);
      setLibraryStatus(null);
    }
  };

  const addToLibrary = async (status: 'reading' | 'completed' | 'planned' | 'on-hold') => {
    if (!user) {
      toast.error('Please login to add manga to your library');
      return;
    }

    if (!manga.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(manga.id)) {
      toast.error('Invalid manga ID');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_library')
        .upsert({
          user_id: user.id,
          manga_id: manga.id,
          status,
          current_chapter: libraryStatus?.current_chapter || 1
        });

      if (error) throw error;
      
      setLibraryStatus({
        status,
        current_chapter: libraryStatus?.current_chapter || 1
      });
      
      toast.success('Added to library');
    } catch (error) {
      console.error('Error updating library:', error);
      toast.error('Failed to update library');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Directory</span>
      </button>

      {/* Manga Info */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="md:flex">
          {/* Cover Image */}
          <div className="md:w-1/3 lg:w-1/4">
            <img
              src={manga.cover || 'https://via.placeholder.com/300x400'}
              alt={manga.title}
              className="w-full h-[400px] object-cover"
            />
          </div>

          {/* Details */}
          <div className="p-6 md:flex-1">
            <h1 className="text-3xl font-bold mb-4">{manga.title}</h1>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Star className="text-yellow-500" size={20} />
                <span>{manga.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Book size={20} />
                <span>{chapters.length} Chapters</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={20} />
                <span className="capitalize">{manga.status}</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {manga.genres.map(genre => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-300">{manga.description}</p>
            </div>

            {/* Library Actions */}
            {user && (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => addToLibrary('reading')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    libraryStatus?.status === 'reading'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <BookOpen size={20} />
                  <span>Reading</span>
                </button>
                <button
                  onClick={() => addToLibrary('planned')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    libraryStatus?.status === 'planned'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Clock size={20} />
                  <span>Plan to Read</span>
                </button>
                <button
                  onClick={() => addToLibrary('completed')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    libraryStatus?.status === 'completed'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Star size={20} />
                  <span>Completed</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Chapters</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <Book size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400">No chapters available yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {chapters.map(chapter => (
              <button
                key={chapter.id}
                onClick={() => onReadChapter(manga.id, chapter.number)}
                className="flex items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors text-left"
              >
                <div>
                  <h3 className="font-medium">Chapter {chapter.number}</h3>
                  {chapter.title && (
                    <p className="text-sm text-gray-400">{chapter.title}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    {new Date(chapter.created_at).toLocaleDateString()}
                  </span>
                  <Plus size={20} className="text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MangaDetails;