import React, { useState, useEffect } from 'react';
import type { Manga } from '../App';
import { Star, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface HomeScreenProps {
  onMangaSelect: (manga: Manga) => void;
}

function HomeScreen({ onMangaSelect }: HomeScreenProps) {
  const [featuredManga, setFeaturedManga] = useState<Manga[]>([]);
  const [trendingManga, setTrendingManga] = useState<Manga[]>([]);
  const [recentManga, setRecentManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManga();
  }, []);

  const loadManga = async () => {
    try {
      // Load featured manga (highest rated)
      const { data: featuredData, error: featuredError } = await supabase
        .from('mangas')
        .select(`
          *,
          manga_genres (
            genres (name)
          ),
          chapters (id)
        `)
        .order('rating', { ascending: false })
        .limit(3);

      if (featuredError) throw featuredError;

      // Load trending manga (most chapters in last week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: trendingData, error: trendingError } = await supabase
        .from('mangas')
        .select(`
          *,
          manga_genres (
            genres (name)
          ),
          chapters!inner (id)
        `)
        .gte('chapters.created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(6);

      if (trendingError) throw trendingError;

      // Load recently updated manga
      const { data: recentData, error: recentError } = await supabase
        .from('mangas')
        .select(`
          *,
          manga_genres (
            genres (name)
          ),
          chapters (id)
        `)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (recentError) throw recentError;

      // Transform the data
      const transformManga = (manga: any): Manga => ({
        id: manga.id,
        title: manga.title,
        cover: manga.cover_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/covers/${manga.cover_url}` : 'https://images.unsplash.com/photo-1560415755-bd80d06eda60?w=500',
        genres: manga.manga_genres.map((g: any) => g.genres.name),
        author: manga.author || 'Unknown',
        status: manga.status || 'ongoing',
        rating: manga.rating || 0,
        chapters: manga.chapters?.length || 0,
        description: manga.description || 'No description available'
      });

      setFeaturedManga(featuredData?.map(transformManga) || []);
      setTrendingManga(trendingData?.map(transformManga) || []);
      setRecentManga(recentData?.map(transformManga) || []);
    } catch (error) {
      console.error('Error loading manga:', error);
      toast.error('Failed to load manga');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-gray-800 rounded-lg"></div>
          <div className="grid grid-cols-3 gap-8">
            <div className="h-48 bg-gray-800 rounded-lg"></div>
            <div className="h-48 bg-gray-800 rounded-lg"></div>
            <div className="h-48 bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Featured Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Featured Manga</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredManga.map(manga => (
            <div
              key={manga.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:transform hover:scale-105 transition-transform cursor-pointer"
              onClick={() => onMangaSelect(manga)}
            >
              <img
                src={manga.cover}
                alt={manga.title}
                className="w-full h-64 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{manga.title}</h3>
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Star className="text-yellow-500" size={16} />
                  <span>{manga.rating.toFixed(1)}</span>
                  <span>•</span>
                  <span>{manga.chapters} chapters</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {manga.genres.map(genre => (
                    <span
                      key={genre}
                      className="px-2 py-1 bg-gray-700 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {manga.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-red-500" size={24} />
          <h2 className="text-2xl font-bold">Trending Now</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {trendingManga.map(manga => (
            <div
              key={manga.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onMangaSelect(manga)}
            >
              <img
                src={manga.cover}
                alt={manga.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-2">
                <h3 className="font-medium text-sm line-clamp-1">{manga.title}</h3>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Star className="text-yellow-500" size={12} />
                  <span>{manga.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Updated */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Clock className="text-blue-500" size={24} />
          <h2 className="text-2xl font-bold">Recently Updated</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentManga.map(manga => (
            <div
              key={manga.id}
              className="flex bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onMangaSelect(manga)}
            >
              <img
                src={manga.cover}
                alt={manga.title}
                className="w-24 h-32 object-cover"
              />
              <div className="p-4 flex-1">
                <h3 className="font-semibold mb-2">{manga.title}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <span className="px-2 py-1 bg-gray-700 rounded-full">
                    Ch. {manga.chapters}
                  </span>
                  <span className="text-green-500">New</span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {manga.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeScreen;