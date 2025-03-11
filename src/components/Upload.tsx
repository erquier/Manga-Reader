import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, X, Plus, Image } from 'lucide-react';

function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Upload Manga</h2>
        
        {/* Upload Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter manga title"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              className="w-full px-4 py-2 rounded-lg bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              placeholder="Enter manga description"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                onChange={handleChange}
                className="hidden"
                accept="image/*,.pdf"
              />
              <UploadIcon className="mx-auto mb-4" size={32} />
              <p className="mb-2">Drag & drop your files here</p>
              <p className="text-sm text-gray-400 mb-4">or</p>
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Browse Files
              </button>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Selected Files</h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Image size={20} />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button className="w-full px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium">
              Upload Manga
            </button>
          </div>
        </div>

        {/* Quick Upload */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="font-bold mb-4">Quick Upload</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((_, index) => (
              <button
                key={index}
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <Plus size={24} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;