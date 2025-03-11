import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Play, Pause, MessageSquare, ArrowLeft, Columns, Bell, BellOff, AlertTriangle } from 'lucide-react';
import type { Manga } from '../App';
import type { User } from '../App';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ReaderProps {
  manga: Manga;
  user: User | null;
  chapterNumber: number;
  onBack: () => void;
}

interface Comment {
  id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface CommentSubscription {
  user_id: string;
  manga_id: string;
  chapter: number;
}

function Reader({ manga, user, chapterNumber, onBack }: ReaderProps) {
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<'paginated' | 'cascade'>('cascade');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('unreadable');
  const [reportDescription, setReportDescription] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number>();

  useEffect(() => {
    loadChapter();
    loadComments();
    if (user) {
      checkSubscription();
      subscribeToComments();
    }

    // Add keyboard event listener
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore key events if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (readingMode === 'paginated') {
            handlePageChange('prev');
          }
          break;
        case 'ArrowRight':
          if (readingMode === 'paginated') {
            handlePageChange('next');
          }
          break;
        case ' ': // Spacebar
          e.preventDefault(); // Prevent page scroll
          if (readingMode === 'cascade') {
            setAutoScroll(prev => !prev);
          }
          break;
        case 'Escape':
          if (showReportModal) {
            setShowReportModal(false);
          } else if (showComments) {
            setShowComments(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      supabase.removeAllChannels();
      if (scrollIntervalRef.current) {
        window.clearInterval(scrollIntervalRef.current);
      }
    };
  }, [manga.id, chapterNumber, user, readingMode, showReportModal, showComments]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && readingMode === 'cascade' && contentRef.current) {
      const scrollStep = scrollSpeed * 0.5; // Adjust this multiplier to control base scroll speed
      
      scrollIntervalRef.current = window.setInterval(() => {
        window.scrollBy({
          top: scrollStep,
          behavior: 'smooth'
        });

        // Check if we've reached the bottom
        const scrolledToBottom = 
          window.innerHeight + window.pageYOffset >= 
          document.documentElement.scrollHeight - 50;

        if (scrolledToBottom) {
          setAutoScroll(false);
          if (scrollIntervalRef.current) {
            window.clearInterval(scrollIntervalRef.current);
          }
        }
      }, 16); // ~60fps

      return () => {
        if (scrollIntervalRef.current) {
          window.clearInterval(scrollIntervalRef.current);
        }
      };
    }
  }, [autoScroll, scrollSpeed, readingMode]);

  const loadChapter = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('pages')
        .eq('manga_id', manga.id)
        .eq('number', chapterNumber)
        .single();

      if (error) throw error;
      
      if (!data || !data.pages || !Array.isArray(data.pages)) {
        throw new Error('Invalid chapter data');
      }

      const pageUrls = await Promise.all(
        data.pages.map(async (page: string) => {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/pages/${page}`;
          if (page.endsWith('.pdf')) {
            // Convert PDF pages to images
            const pdf = await pdfjsLib.getDocument(url).promise;
            const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
              const pdfPage = await pdf.getPage(i + 1);
              const viewport = pdfPage.getViewport({ scale: 2 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const context = canvas.getContext('2d')!;
              await pdfPage.render({
                canvasContext: context,
                viewport,
              }).promise;
              return canvas.toDataURL('image/jpeg');
            });
            return Promise.all(pagePromises);
          }
          return url;
        })
      );

      setPages(pageUrls.flat());
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast.error('Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Please login to report issues');
      return;
    }

    try {
      const { error } = await supabase
        .from('manga_reports')
        .insert({
          manga_id: manga.id,
          chapter: chapterNumber,
          user_id: user.id,
          issue_type: reportType,
          description: reportDescription,
        });

      if (error) throw error;

      toast.success('Report submitted successfully');
      setShowReportModal(false);
      setReportDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    }
  };

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('comment_subscriptions')
        .select('*')
        .eq('manga_id', manga.id)
        .eq('chapter', chapterNumber)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsSubscribed(!!data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${manga.id}:${chapterNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `manga_id=eq.${manga.id},chapter=eq.${chapterNumber}`
        },
        (payload) => {
          setComments(prev => [payload.new as Comment, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, user_email, content, created_at')
        .eq('manga_id', manga.id)
        .eq('chapter', chapterNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          manga_id: manga.id,
          chapter: chapterNumber,
          user_id: user.id,
          user_email: user.email,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const toggleSubscription = async () => {
    if (!user) {
      toast.error('Please login to subscribe to comments');
      return;
    }

    try {
      if (isSubscribed) {
        const { error } = await supabase
          .from('comment_subscriptions')
          .delete()
          .eq('manga_id', manga.id)
          .eq('chapter', chapterNumber)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsSubscribed(false);
        toast.success('Unsubscribed from comments');
      } else {
        const { error } = await supabase
          .from('comment_subscriptions')
          .insert({
            manga_id: manga.id,
            chapter: chapterNumber,
            user_id: user.id
          });

        if (error) throw error;
        setIsSubscribed(true);
        toast.success('Subscribed to comments');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    setCurrentPage(prev => {
      if (direction === 'prev') return Math.max(0, prev - 1);
      return Math.min(pages.length - 1, prev + 1);
    });
  };

  const toggleReadingMode = () => {
    setReadingMode(prev => prev === 'paginated' ? 'cascade' : 'paginated');
    setCurrentPage(0);
    setAutoScroll(false);
    if (scrollIntervalRef.current) {
      window.clearInterval(scrollIntervalRef.current);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 bg-gray-800 shadow-lg z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Manga</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleReadingMode}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              title={`Switch to ${readingMode === 'paginated' ? 'cascade' : 'paginated'} mode`}
            >
              <Columns size={20} />
              <span>{readingMode === 'paginated' ? 'Cascade' : 'Paginated'}</span>
            </button>

            {readingMode === 'cascade' && (
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                  autoScroll ? 'text-blue-500' : ''
                }`}
                title={`${autoScroll ? 'Pause' : 'Auto-scroll'} (Space)`}
              >
                {autoScroll ? <Pause size={20} /> : <Play size={20} />}
              </button>
            )}

            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="Comments"
            >
              <MessageSquare size={20} />
            </button>

            {user && (
              <>
                <button
                  onClick={toggleSubscription}
                  className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                    isSubscribed ? 'text-blue-500' : 'text-gray-400'
                  }`}
                  title={isSubscribed ? 'Unsubscribe from comments' : 'Subscribe to comments'}
                >
                  {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-yellow-500"
                  title="Report an issue"
                >
                  <AlertTriangle size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 pb-16">
        {readingMode === 'cascade' ? (
          <div 
            ref={contentRef}
            className="container mx-auto px-4 max-w-4xl space-y-4"
          >
            {pages.map((page, index) => (
              <img
                key={index}
                src={page}
                alt={`${manga.title} - Chapter ${chapterNumber} - Page ${index + 1}`}
                className="w-full rounded-lg shadow-2xl"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="container mx-auto px-4 max-w-4xl">
            <img
              src={pages[currentPage]}
              alt={`${manga.title} - Chapter ${chapterNumber} - Page ${currentPage + 1}`}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>

      {/* Auto-scroll Speed Control */}
      {readingMode === 'cascade' && autoScroll && (
        <div className="fixed top-24 right-4 bg-gray-800 rounded-lg shadow-lg p-4 z-40">
          <label className="block text-sm font-medium mb-2">Scroll Speed</label>
          <input
            type="range"
            min="1"
            max="10"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(Number(e.target.value))}
            className="w-24"
          />
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="fixed right-4 top-24 w-80 bg-gray-800 rounded-lg shadow-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Comments</h3>
            {user && (
              <button
                onClick={toggleSubscription}
                className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                  isSubscribed ? 'text-blue-500' : 'text-gray-400'
                }`}
                title={isSubscribed ? 'Unsubscribe from comments' : 'Subscribe to comments'}
              >
                {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
              </button>
            )}
          </div>
          
          {user ? (
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add a comment..."
                rows={3}
              />
              <button
                onClick={handleComment}
                className="mt-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                disabled={!newComment.trim()}
              >
                Post
              </button>
            </div>
          ) : (
            <p className="text-gray-400 mb-4">Please login to comment</p>
          )}

          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">{comment.user_email}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-gray-400">No comments yet</p>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Report Issue</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Issue Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="unreadable">Content Unreadable</option>
                <option value="missing">Missing Pages</option>
                <option value="wrong_order">Wrong Page Order</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Please describe the issue..."
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReport}
                className="flex-1 px-4 py-2 bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                Submit Report
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls (Only shown in paginated mode) */}
      {readingMode === 'paginated' && (
        <div className="fixed bottom-0 w-full bg-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 0}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page (Left Arrow)"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-sm">
              Page {currentPage + 1} of {pages.length}
            </span>
            <button
              onClick={() => handlePageChange('next')}
              disabled={currentPage === pages.length - 1}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page (Right Arrow)"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reader;