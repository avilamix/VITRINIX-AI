
import React, { useState } from 'react';
import Button from './Button';
import { BookmarkSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
// FIX: Removed import { uploadFile } from '../services/cloudStorageService';
import { saveLibraryItem, uploadFileAndCreateLibraryItemViaBackend } from '../services/firestoreService';
import { LibraryItem } from '../types';
import { getActiveOrganization } from '../services/authService';


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

  const activeOrganization = getActiveOrganization();
  const organizationId = activeOrganization?.organization.id;

  const handleSave = async () => {
    if (!content) return;
    if (!organizationId) {
      alert('No active organization found. Please login.');
      return;
    }

    setLoading(true);
    try {
      let itemToSave: LibraryItem;
      const fileName = initialName || `Saved ${type} ${Date.now()}`;
      const tagsArray = tags.filter(Boolean); // Ensure tags are clean strings

      if (content instanceof File || content instanceof Blob) {
        // Handle File/Blob upload
        const fileToUpload = content instanceof File ? content : new File([content], fileName, { type: type === 'image' ? 'image/png' : type === 'video' ? 'video/mp4' : 'text/plain' });
        
        // FIX: Replaced direct uploadFile with new backend-driven upload function
        const uploadedItem = await uploadFileAndCreateLibraryItemViaBackend(
          organizationId,
          userId,
          fileToUpload,
          fileName,
          type,
          tagsArray
        );
        itemToSave = uploadedItem; // The backend now returns a complete LibraryItem
      } else {
        // Handle Text/URL string content
        let fileUrl: string;
        let thumbnailUrl: string | undefined;
        let fileType: LibraryItem['type'] = type;

        if (type === 'text' || type === 'post' || type === 'ad') {
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], `${fileName}.txt`, { type: 'text/plain' });
            const uploadedItem = await uploadFileAndCreateLibraryItemViaBackend(
              organizationId,
              userId,
              file,
              fileName,
              fileType,
              tagsArray
            );
            itemToSave = uploadedItem;
        } else {
             // Assume URL string for image/video (already hosted or data uri)
             if (content.startsWith('data:')) {
                 const res = await fetch(content);
                 const blob = await res.blob();
                 const extension = type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'bin';
                 const file = new File([blob], `${fileName}.${extension}`, { type: blob.type });
                 const uploadedItem = await uploadFileAndCreateLibraryItemViaBackend(
                    organizationId,
                    userId,
                    file,
                    fileName,
                    fileType,
                    tagsArray
                 );
                 itemToSave = uploadedItem;
             } else {
                 // Remote URL - save metadata directly if the file is already hosted externally
                 // The backend's `files` endpoint supports creating LibraryItems with external `fileUrl`
                 const newItem: LibraryItem = {
                    id: '', // Backend will assign
                    organizationId,
                    userId,
                    type: fileType,
                    fileUrl: content,
                    thumbnailUrl: content, // Assuming content URL can also serve as thumbnail if applicable
                    tags: tagsArray,
                    name: fileName,
                    // FIX: createdAt should be a Date object
                    createdAt: new Date(), 
                    updatedAt: new Date() // Backend will set both
                 };
                 itemToSave = await saveLibraryItem(newItem); // Use saveLibraryItem for metadata only
             }
        }
      }

      setSaved(true);
      if (onSave) onSave(itemToSave);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving to library:", error);
      alert(`Failed to save to library: ${error.message || String(error)}`);
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