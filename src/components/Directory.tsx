import React, { useState, useEffect } from 'react';
import { Filter, Star, Loader } from 'lucide-react';
import type { Manga } from '../App';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface DirectoryProps {
  onMangaSelect: (manga: Manga) => void;
}

function Directory({ onMangaSelect }: DirectoryProps) {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [sortBy, setSortBy] = useState('Latest');
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    loadGenres();
    loadMangas();
  }, [selectedGenres, selectedStatus, sortBy]);

  const loadGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('name')
        .order('name');

      if (error) throw error;
      setGenres(data.map(g => g.name));
    } catch (error) {
      console.error('Error loading genres:', error);
      toast.error('Failed to load genres');
    }
  };

  const loadMangas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('mangas')
        .select(`
          *,
          manga_genres (
            genres (name)
          )
        `);

      // Apply filters
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      // Apply sorting
      switch (sortBy) {
        case 'Latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'Title A-Z':
          query = query.order('title', { ascending: true });
          break;
        case 'Title Z-A':
          query = query.order('title', { ascending: false });
          break;
        case 'Rating':
          query = query.order('rating', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by genres if any are selected
      let filteredData = data;
      if (selectedGenres.length > 0) {
        filteredData = data.filter(manga => 
          manga.manga_genres.some((g: any) => 
            selectedGenres.includes(g.genres.name)
          )
        );
      }

      // Transform the data to match the Manga type
      const transformedMangas: Manga[] = filteredData.map(manga => ({
        id: manga.id,
        title: manga.title,
        cover: manga.cover_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/covers/${manga.cover_url}` : '',
        genres: manga.manga_genres.map((g: any) => g.genres.name),
        author: manga.author,
        status: manga.status,
        rating: manga.rating || 0,
        chapters: 0, // We'll update this with actual chapter count
        description: manga.description
      }));

      setMangas(transformedMangas);
    } catch (error) {
      console.error('Error loading mangas:', error);
      toast.error('Failed to load mangas');
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = ['Latest', 'Rating', 'Title A-Z', 'Title Z-A'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 bg-gray-800 p-6 rounded-lg h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Filter size={20} />
            <h2 className="text-xl font-bold">Filters</h2>
          </div>

          {/* Status Filter */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Status</h3>
            <div className="flex flex-col gap-2">
              {['all', 'ongoing', 'completed'].map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={selectedStatus === status}
                    onChange={() => setSelectedStatus(status as typeof selectedStatus)}
                    className="text-blue-500"
                  />
                  <span className="capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Genres Filter */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenres(prev =>
                    prev.includes(genre)
                      ? prev.filter(g => g !== genre)
                      : [...prev, genre]
                  )}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedGenres.includes(genre)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h3 className="font-semibold mb-3">Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Manga Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="animate-spin" size={32} />
            </div>
          ) : mangas.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <p className="text-gray-400">No manga found matching your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {mangas.map(manga => (
                <div
                  key={manga.id}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:transform hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => onMangaSelect(manga)}
                >
                  <img
                    src={manga.cover || 'https://via.placeholder.com/300x400'}
                    alt={manga.title}
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-1">{manga.title}</h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Star className="text-yellow-500" size={16} />
                      <span>{manga.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {manga.genres.slice(0, 2).map(genre => (
                        <span
                          key={genre}
                          className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                        >
                          {genre}
                        </span>
                      ))}
                      {manga.genres.length > 2 && (
                        <span className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                          +{manga.genres.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Directory;