import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface ChapterManagerProps {
  mangaId: string;
  onClose: () => void;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  pages: string[];
}

function ChapterManager({ mangaId, onClose }: ChapterManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChapter, setNewChapter] = useState({
    number: 1,
    title: '',
    pages: [] as File[]
  });

  useEffect(() => {
    loadChapters();
  }, [mangaId]);

  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('manga_id', mangaId)
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

  const handlePageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewChapter(prev => ({
        ...prev,
        pages: [...Array.from(e.target.files || [])]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload pages
      const uploadedPages = await Promise.all(
        newChapter.pages.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${mangaId}/${newChapter.number}/${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('pages')
            .upload(fileName, file, {
              upsert: true,
              cacheControl: '3600'
            });

          if (uploadError) throw uploadError;
          return fileName;
        })
      );

      // Create chapter
      const { error: insertError } = await supabase
        .from('chapters')
        .insert({
          manga_id: mangaId,
          number: newChapter.number,
          title: newChapter.title,
          pages: uploadedPages
        });

      if (insertError) throw insertError;

      toast.success('Chapter added successfully');
      setNewChapter({
        number: Math.max(...chapters.map(c => c.number), 0) + 1,
        title: '',
        pages: []
      });
      loadChapters();
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('Failed to add chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;
      toast.success('Chapter deleted successfully');
      loadChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6">Manage Chapters</h2>

        {/* Add Chapter Form */}
        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="w-24">
              <label className="block text-sm font-medium mb-2">Number</label>
              <input
                type="number"
                value={newChapter.number}
                onChange={(e) => setNewChapter(prev => ({ ...prev, number: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={newChapter.title}
                onChange={(e) => setNewChapter(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pages</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePageUpload}
                className="hidden"
                id="page-upload"
              />
              <label
                htmlFor="page-upload"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
              >
                <Upload size={20} />
                <span>Upload Pages</span>
              </label>
              {newChapter.pages.length > 0 && (
                <span className="text-sm text-gray-400">
                  {newChapter.pages.length} pages selected
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Chapter</span>
          </button>
        </form>

        {/* Chapter List */}
        <div className="space-y-4">
          {chapters.map(chapter => (
            <div
              key={chapter.id}
              className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
            >
              <div>
                <h4 className="font-medium">Chapter {chapter.number}</h4>
                <p className="text-sm text-gray-400">{chapter.title}</p>
                <p className="text-xs text-gray-500">{chapter.pages.length} pages</p>
              </div>
              <button
                onClick={() => handleDelete(chapter.id)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChapterManager;