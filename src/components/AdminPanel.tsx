import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Edit, Plus, Save, X, Image, Search, Loader, BookOpen, AlertTriangle, Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { searchManga } from '../lib/mangaApi';
import toast from 'react-hot-toast';
import ChapterManager from './ChapterManager';

interface MangaForm {
  title: string;
  description: string;
  author: string;
  status: 'ongoing' | 'completed';
  cover: File | null;
  genres: string[];
  rating: number;
}

interface AdminNotification {
  id: string;
  type: string;
  data: any;
  read: boolean;
  created_at: string;
}

interface Report {
  id: string;
  manga_id: string;
  chapter: number;
  user_id: string;
  issue_type: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  resolved_at: string | null;
  created_at: string;
  mangas: {
    title: string;
  };
  profiles: {
    username: string | null;
    email: string;
  };
}

const initialForm: MangaForm = {
  title: '',
  description: '',
  author: '',
  status: 'ongoing',
  cover: null,
  genres: [],
  rating: 0
};

function AdminPanel() {
  const [mangas, setMangas] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [form, setForm] = useState<MangaForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showChapterManager, setShowChapterManager] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadMangas();
    loadGenres();
    if (showReports) {
      loadReports();
    }
    loadNotifications();
    subscribeToNotifications();

    return () => {
      supabase.removeAllChannels();
    };
  }, [showReports]);

  const subscribeToNotifications = () => {
    try {
      const channel = supabase
        .channel('admin_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications'
          },
          (payload) => {
            console.log('New notification received:', payload);
            setNotifications(prev => [payload.new as AdminNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast((t) => (
              <div onClick={() => {
                setShowReports(true);
                setShowNotifications(false);
                toast.dismiss(t.id);
              }}>
                <h3 className="font-bold">New Report</h3>
                <p className="text-sm">A new manga report has been submitted</p>
              </div>
            ), {
              duration: 5000,
              icon: <AlertTriangle className="text-yellow-500" />,
            });
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
        });

      return () => {
        console.log('Cleaning up notification subscription');
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      console.log('Loading notifications...');
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      console.log('Notifications loaded:', data);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      console.log('Marking notification as read:', id);
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error updating notification:', error);
        throw error;
      }

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const loadMangas = async () => {
    try {
      console.log('Loading mangas...');
      const { data, error } = await supabase
        .from('mangas')
        .select(`
          *,
          manga_genres (
            genres (name)
          ),
          chapters (id)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mangas:', error);
        throw error;
      }

      console.log('Mangas loaded:', data);
      setMangas(data || []);
    } catch (error) {
      console.error('Error in loadMangas:', error);
      toast.error('Failed to load mangas');
    }
  };

  const loadGenres = async () => {
    try {
      console.log('Loading genres...');
      const { data, error } = await supabase
        .from('genres')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching genres:', error);
        throw error;
      }

      console.log('Genres loaded:', data);
      setGenres(data.map(g => g.name));
    } catch (error) {
      console.error('Error in loadGenres:', error);
      toast.error('Failed to load genres');
    }
  };

  const loadReports = async () => {
    try {
      console.log('Loading reports...');
      setLoadingReports(true);

      const { data, error } = await supabase
        .from('manga_reports')
        .select(`
          *,
          mangas (
            title
          ),
          profiles (
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }

      console.log('Reports loaded:', data);
      setReports(data || []);
    } catch (error) {
      console.error('Error in loadReports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleFetchInfo = async () => {
    if (!form.title) {
      toast.error('Please enter a title to search');
      return;
    }

    setSearching(true);
    try {
      const mangaData = await searchManga(form.title);
      if (mangaData) {
        setForm(prev => ({
          ...prev,
          description: mangaData.description || prev.description,
          author: mangaData.author || prev.author,
          status: mangaData.status as 'ongoing' | 'completed',
          genres: mangaData.genres || prev.genres,
          rating: mangaData.rating || 0
        }));
        toast.success('Manga information fetched successfully');
      } else {
        toast.error('No manga information found');
      }
    } catch (error) {
      console.error('Error fetching manga info:', error);
      toast.error('Failed to fetch manga information');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let coverUrl = null;

      if (form.cover) {
        const fileExt = form.cover.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(fileName, form.cover, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;
        coverUrl = fileName;
      }

      const mangaData = {
        title: form.title,
        description: form.description,
        author: form.author,
        status: form.status,
        rating: form.rating,
        ...(coverUrl && { cover_url: coverUrl })
      };

      let mangaId;
      if (editingId) {
        const { error } = await supabase
          .from('mangas')
          .update(mangaData)
          .eq('id', editingId);

        if (error) throw error;
        mangaId = editingId;
      } else {
        const { data, error } = await supabase
          .from('mangas')
          .insert(mangaData)
          .select()
          .single();

        if (error) throw error;
        mangaId = data.id;
      }

      if (mangaId) {
        await supabase
          .from('manga_genres')
          .delete()
          .eq('manga_id', mangaId);

        const genrePromises = form.genres.map(async (genreName) => {
          const { data: existingGenre } = await supabase
            .from('genres')
            .select('id')
            .eq('name', genreName)
            .single();

          let genreId;
          if (existingGenre) {
            genreId = existingGenre.id;
          } else {
            const { data: newGenre } = await supabase
              .from('genres')
              .insert({ name: genreName })
              .select()
              .single();
            genreId = newGenre.id;
          }

          return supabase
            .from('manga_genres')
            .insert({ manga_id: mangaId, genre_id: genreId });
        });

        await Promise.all(genrePromises);
      }

      toast.success(editingId ? 'Manga updated successfully' : 'Manga created successfully');
      setForm(initialForm);
      setEditingId(null);
      loadMangas();
    } catch (error) {
      console.error('Error saving manga:', error);
      toast.error('Failed to save manga');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this manga?')) return;

    try {
      const { error } = await supabase
        .from('mangas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Manga deleted successfully');
      loadMangas();
    } catch (error) {
      console.error('Error deleting manga:', error);
      toast.error('Failed to delete manga');
    }
  };

  const handleEdit = (manga: any) => {
    setForm({
      title: manga.title,
      description: manga.description,
      author: manga.author,
      status: manga.status,
      cover: null,
      genres: manga.manga_genres.map((g: any) => g.genres.name),
      rating: manga.rating || 0
    });
    setEditingId(manga.id);
  };

  const handleReportStatus = async (reportId: string, status: string) => {
    try {
      console.log('Updating report status:', { reportId, status });
      const { error } = await supabase
        .from('manga_reports')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', reportId);

      if (error) {
        console.error('Error updating report status:', error);
        throw error;
      }

      await loadReports();
      toast.success('Report status updated');
    } catch (error) {
      console.error('Error in handleReportStatus:', error);
      toast.error('Failed to update report');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <div className="flex gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-semibold mb-4">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No notifications</p>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg ${
                            notification.read ? 'bg-gray-700' : 'bg-gray-700/50'
                          } cursor-pointer`}
                          onClick={() => {
                            if (!notification.read) {
                              markNotificationAsRead(notification.id);
                            }
                            setShowReports(true);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle
                              size={20}
                              className="text-yellow-500 flex-shrink-0"
                            />
                            <div>
                              <p className="text-sm">
                                New report for Chapter {notification.data.chapter}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowReports(!showReports)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showReports ? 'bg-yellow-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <AlertTriangle size={20} />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {showReports ? (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Manga Reports</h3>
          
          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin" size={32} />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No reports found
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div
                  key={report.id}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{report.mangas.title}</h4>
                      <p className="text-sm text-gray-400">
                        Chapter {report.chapter} • Reported by {report.profiles.username || report.profiles.email}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      report.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                      report.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Issue Type</p>
                    <p className="text-gray-300">{report.issue_type.replace('_', ' ')}</p>
                  </div>

                  {report.description && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-gray-300">{report.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleReportStatus(report.id, 'in_progress')}
                        className="px-3 py-1 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Start Working
                      </button>
                    )}
                    {report.status === 'in_progress' && (
                      <button
                        onClick={() => handleReportStatus(report.id, 'resolved')}
                        className="px-3 py-1 bg-green-500 rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        Mark as Resolved
                      </button>
                    )}
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleReportStatus(report.id, 'rejected')}
                        className="px-3 py-1 bg-red-500 rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Manga' : 'Add New Manga'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleFetchInfo}
                    disabled={searching}
                    className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    {searching ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Search size={20} />
                    )}
                    <span>Fetch Info</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Author</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'ongoing' | 'completed' })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cover Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => setForm({ ...form, cover: e.target.files?.[0] || null })}
                    accept="image/*"
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Upload size={20} />
                    <span>Choose File</span>
                  </label>
                  {form.cover && (
                    <span className="text-sm text-gray-400">{form.cover.name}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        genres: prev.genres.includes(genre)
                          ? prev.genres.filter(g => g !== genre)
                          : [...prev.genres, genre]
                      }))}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        form.genres.includes(genre)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Save size={20} />
                  <span>{editingId ? 'Update' : 'Create'} Manga</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(initialForm);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <X size={20} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Manage Manga</h3>
            <div className="space-y-4">
              {mangas.map(manga => (
                <div
                  key={manga.id}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    {manga.cover_url ? (
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/covers/${manga.cover_url}`}
                        alt={manga.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-600 flex items-center justify-center">
                        <Image size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{manga.title}</h4>
                      <p className="text-sm text-gray-400">{manga.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm">{manga.rating?.toFixed(1) || 'N/A'}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm">{manga.chapters?.length || 0} chapters</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowChapterManager(manga.id)}
                      className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Manage Chapters"
                    >
                      <BookOpen size={20} />
                    </button>
                    <button
                      onClick={() => handleEdit(manga)}
                      className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit Manga"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(manga.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Manga"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showChapterManager && (
        <ChapterManager
          mangaId={showChapterManager}
          onClose={() => setShowChapterManager(null)}
        />
      )}
    </div>
  );
}

export default AdminPanel;