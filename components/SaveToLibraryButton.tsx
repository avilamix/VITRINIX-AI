
import React, { useState } from 'react';
import Button from './Button';
import { BookmarkSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { uploadFile } from '../services/cloudStorageService';
import { saveLibraryItem } from '../services/firestoreService';
import { LibraryItem } from '../types';

interface SaveToLibraryButtonProps {
  content: string | Blob | File | null;
  type: LibraryItem['type'];
  userId: string;
  initialName?: string;
  tags?: string[];
  onSave?: (item: LibraryItem) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  label?: string;
  disabled?: boolean;
}

const SaveToLibraryButton: React.FC<SaveToLibraryButtonProps> = ({
  content,
  type,
  userId,
  initialName = 'Untitled',
  tags = [],
  onSave,
  className = '',
  variant = 'secondary',
  label = 'Salvar na Biblioteca',
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!content) return;
    setLoading(true);
    try {
      let itemToSave: LibraryItem;
      const fileName = initialName || `Saved ${type} ${Date.now()}`;

      if (content instanceof File || content instanceof Blob) {
        // Handle File/Blob
        const fileToUpload = content instanceof File ? content : new File([content], fileName, { type: type === 'image' ? 'image/png' : type === 'video' ? 'video/mp4' : 'text/plain' });
        const uploadedItem = await uploadFile(fileToUpload, userId, type);
        itemToSave = { ...uploadedItem, name: fileName, tags };
        await saveLibraryItem(itemToSave);
      } else {
        // Handle Text/URL string
        if (type === 'text' || type === 'post' || type === 'ad') {
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], `${fileName}.txt`, { type: 'text/plain' });
            const uploadedItem = await uploadFile(file, userId, type);
             itemToSave = { ...uploadedItem, name: fileName, tags };
             await saveLibraryItem(itemToSave);
        } else {
             // URL string for image/video (already hosted or data uri)
             if (content.startsWith('data:')) {
                 const res = await fetch(content);
                 const blob = await res.blob();
                 const extension = type === 'image' ? 'png' : 'mp4';
                 const file = new File([blob], `${fileName}.${extension}`, { type: blob.type });
                 const uploadedItem = await uploadFile(file, userId, type);
                 itemToSave = { ...uploadedItem, name: fileName, tags };
                 await saveLibraryItem(itemToSave);
             } else {
                 // Remote URL - in a real app we might fetch and re-upload, 
                 // but here we trust the URL or mock logic
                 const newItem: LibraryItem = {
                    id: `lib-${Date.now()}`,
                    userId,
                    type,
                    file_url: content,
                    thumbnail_url: content,
                    tags,
                    name: fileName,
                    createdAt: new Date().toISOString()
                 };
                 await saveLibraryItem(newItem);
                 itemToSave = newItem;
             }
        }
      }

      setSaved(true);
      if (onSave) onSave(itemToSave);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving to library:", error);
      alert("Failed to save to library");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      isLoading={loading} 
      variant={saved ? 'outline' : variant}
      className={`${saved ? 'border-green-500 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : ''} ${className}`}
      disabled={disabled || saved || !content}
    >
      {saved ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <BookmarkSquareIcon className="w-5 h-5 mr-2" />}
      {saved ? 'Salvo!' : label}
    </Button>
  );
};

export default SaveToLibraryButton;
