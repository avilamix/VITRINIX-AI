import React, { useState, useEffect, useCallback } from 'react';
import { LibraryItem } from '../types';
import { getLibraryItems, deleteLibraryItem } from '../services/firestoreService';
import { createFileSearchStore, uploadFileToSearchStore } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import { TrashIcon, ArrowDownTrayIcon, ShareIcon, DocumentTextIcon, MusicalNoteIcon, CircleStackIcon, CloudArrowUpIcon, LinkIcon, DocumentIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useNavigate } from '../hooks/useNavigate';
import { LIBRARY_ITEM_TYPES } from '../constants'; // Import from frontend constants
import { uploadFileAndCreateLibraryItemViaBackend } from '../services/firestoreService'; // Import from firestoreService

interface ContentLibraryProps {
  organizationId: string | undefined;
  userId: string | undefined;
}

const ContentLibrary: React.FC<ContentLibraryProps> = ({ organizationId, userId }) => {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadName, setUploadName] = useState<string>('');
  const [uploadType, setUploadType] = useState<LibraryItem['type']>('image');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string>('');

  const [kbStoreName, setKbStoreName] = useState<string | null>(null);
  const [creatingKb, setCreatingKb] = useState<boolean>(false);
  const [addingFileToKb, setAddingFileToKb] = useState<boolean>(false);

  const { navigateTo } = useNavigate();


  const fetchLibraryItems = useCallback(async () => {
    if (!organizationId) {
      setError('No active organization found. Please login.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters = {
        searchTerm: searchTerm || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        tags: filterTags ? filterTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      const items = await getLibraryItems(filters); // Pass filters directly
      setLibraryItems(items);
    } catch (err) {
      console.error('Failed to fetch library items:', err);
      setError(`Failed to load library items: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, searchTerm, filterType, filterTags]);

  const fetchKbStoreName = useCallback(async () => {
    if (!organizationId) return;
    try {
      // Assuming createFileSearchStore will either find existing or create new store via backend
      const store = await createFileSearchStore(organizationId); 
      setKbStoreName(store.storeName);
      localStorage.setItem('vitrinex_kb_name', store.storeName); // Persist for chatbot
    } catch (err) {
      console.error('Failed to fetch or create KB store:', err);
      setError(`Failed to set up Knowledge Base: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchLibraryItems();
    fetchKbStoreName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLibraryItems, fetchKbStoreName, organizationId]); // Add organizationId as dep

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadName(file.name.split('.').slice(0, -1).join('.'));
      if (file.type.startsWith('image')) setUploadType('image');
      else if (file.type.startsWith('video')) setUploadType('video');
      else if (file.type.startsWith('audio')) setUploadType('audio');
      else setUploadType('text'); // Default to text for other types
      setError(null);
    }
  };

  const handleUploadFile = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (!uploadName.trim()) {
      setError('Please provide a name for the file.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
      return;
    }
    if (!userId) {
      setError('User not identified. Please login.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const tagsArray = uploadTags.split(',').map(tag => tag.trim()).filter(Boolean);
      // Use the centralized upload function from firestoreService
      const uploadedItem = await uploadFileAndCreateLibraryItemViaBackend(
        organizationId,
        userId, // Pass userId
        selectedFile,
        uploadName,
        uploadType,
        tagsArray
      );
      
      // The backend now returns a LibraryItemResponseDto which should be mapped to frontend LibraryItem
      const newLibraryItem: LibraryItem = {
        id: uploadedItem.id,
        organizationId: uploadedItem.organizationId,
        userId: uploadedItem.userId,
        name: uploadedItem.name,
        type: uploadedItem.type,
        fileUrl: uploadedItem.fileUrl,
        thumbnailUrl: uploadedItem.thumbnailUrl,
        tags: uploadedItem.tags,
        createdAt: new Date(uploadedItem.createdAt),
        updatedAt: new Date(uploadedItem.updatedAt),
      };
      setLibraryItems((prev) => [newLibraryItem, ...prev]);

      // If KB is available, also offer to add to KB
      if (kbStoreName) {
         setAddingFileToKb(true);
         try {
            await uploadFileToSearchStore(organizationId, userId, selectedFile, { documentType: uploadedItem.type, campaign: uploadName, sector: tagsArray.join(', ') });
            alert('File uploaded to library and added to Knowledge Base!');
         } catch (kbErr: any) { // Type 'any' for kbErr to handle different error types
            console.warn('Failed to add file to Knowledge Base:', kbErr);
            alert(`File uploaded to library, but failed to add to Knowledge Base: ${kbErr.message || String(kbErr)}`);
         } finally {
            setAddingFileToKb(false);
         }
      } else {
         alert('File uploaded to library successfully!');
      }

      setSelectedFile(null);
      setUploadName('');
      setUploadTags('');
      // No need to call fetchLibraryItems, we already updated state with newLibraryItem
    } catch (err: any) { // Type 'any' for err
      console.error('Error uploading file:', err);
      setError(`Failed to upload file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, uploadName, uploadType, uploadTags, organizationId, userId, kbStoreName]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    if (!organizationId) {
      setError('No active organization found. Cannot delete item.');
      return;
    }
    setLoading(true); // Reuse loading for delete operation
    setError(null);
    try {
      await deleteLibraryItem(itemId);
      setLibraryItems((prev) => prev.filter((item) => item.id !== itemId));
      alert('Item deleted successfully!');
    } catch (err: any) { // Type 'any' for err
      console.error('Error deleting library item:', err);
      setError(`Failed to delete item: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const handleCreateKnowledgeBase = useCallback(async () => {
    if (!organizationId) {
      setError('No active organization found. Please login.');
      return;
    }
    if (!userId) {
      setError('User not identified. Please login.');
      return;
    }
    setCreatingKb(true);
    setError(null);
    try {
      const store = await createFileSearchStore(organizationId);
      setKbStoreName(store.storeName);
      localStorage.setItem('vitrinex_kb_name', store.storeName);
      alert('Knowledge Base created successfully!');
    } catch (err: any) { // Type 'any' for err
      console.error('Error creating KB:', err);
      setError(`Failed to create Knowledge Base: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreatingKb(false);
    }
  }, [organizationId, userId]);


  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Content Library</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Upload & KB Section */}
      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5 flex items-center gap-2">
          <CloudArrowUpIcon className="w-5 h-5 text-primary" />
          Upload & Knowledge Base
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload */}
          <div>
            <h4 className="text-lg font-semibold text-textlight mb-3">Upload Novo Arquivo</h4>
            <Input
              id="fileInput"
              type="file"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 mb-4"
            />
            {selectedFile && (
              <p className="text-sm text-textmuted mb-4">Selected: {selectedFile.name}</p>
            )}
            <Input
              id="uploadName"
              label="Nome do Item na Biblioteca:"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Ex: 'Relatório Anual 2023'"
            />
            <div className="mb-4">
              <label htmlFor="uploadType" className="block text-sm font-medium text-textlight mb-1">
                Tipo de Mídia:
              </label>
              <select
                id="uploadType"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as LibraryItem['type'])}
                className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
              >
                {LIBRARY_ITEM_TYPES.map(typeOption => (
                  <option key={typeOption} value={typeOption}>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</option>
                ))}
              </select>
            </div>
            <Input
              id="uploadTags"
              label="Tags (separadas por vírgula):"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder="Ex: 'financeiro, relatório, 2023'"
            />
            <Button
              onClick={handleUploadFile}
              isLoading={uploading || addingFileToKb}
              variant="primary"
              className="w-full mt-4"
              disabled={!selectedFile || !uploadName.trim()}
            >
              {(uploading || addingFileToKb) ? 'Processando Upload...' : 'Upload para Biblioteca'}
            </Button>
          </div>

          {/* Knowledge Base */}
          <div>
            <h4 className="text-lg font-semibold text-textlight mb-3">Base de Conhecimento (RAG)</h4>
            {!kbStoreName ? (
              <>
                <p className="text-textmuted mb-4">
                  Integre a IA com seus próprios documentos para respostas contextuais.
                </p>
                <Button
                  onClick={handleCreateKnowledgeBase}
                  isLoading={creatingKb}
                  variant="outline"
                  className="w-full"
                >
                  {creatingKb ? 'Criando KB...' : 'Criar Knowledge Base'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-textlight mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  Knowledge Base Ativa: <span className="font-mono text-primary">{kbStoreName.split('/').pop()}</span>
                </p>
                <p className="text-sm text-textmuted">
                  Novos arquivos adicionados à biblioteca podem ser automaticamente indexados.
                </p>
                 <Button
                    onClick={() => navigateTo('Chatbot')}
                    variant="secondary"
                    className="w-full mt-4"
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2"/> Ir para o Chatbot com KB
                  </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Library Items List */}
      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="text-xl font-semibold text-textlight flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5 text-primary" />
            Seus Ativos de Mídia
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Input
              id="searchLibrary"
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48"
            />
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            >
              <option value="all">Todos os Tipos</option>
              {LIBRARY_ITEM_TYPES.map(typeOption => (
                  <option key={typeOption} value={typeOption}>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner />
            <p className="ml-2 text-textlight">Loading library...</p>
          </div>
        )}
        {!loading && libraryItems.length === 0 && (
          <div className="text-center text-textmuted p-8 border border-dashed border-gray-700 rounded-lg">
            Nenhum item na biblioteca. Faça um upload para começar!
          </div>
        )}
        {!loading && libraryItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {libraryItems.map((item) => (
              <div key={item.id} className="bg-darkbg rounded-lg shadow-md border border-gray-700 flex flex-col overflow-hidden">
                <div className="relative w-full aspect-video bg-gray-900 flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    item.type === 'video' ? (
                      <video src={item.thumbnailUrl} className="w-full h-full object-cover" controls muted />
                    ) : (
                      <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                    )
                  ) : item.type === 'audio' ? (
                    <MusicalNoteIcon className="w-16 h-16 text-gray-500" />
                  ) : item.type === 'text' ? (
                    <DocumentIcon className="w-16 h-16 text-gray-500" />
                  ) : (
                    <img src="https://via.placeholder.com/150?text=No+Preview" alt="No Preview" className="w-full h-full object-cover" />
                  )}
                  <span className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded-full capitalize">
                    {item.type}
                  </span>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h4 className="font-semibold text-textlight text-lg mb-2">{item.name}</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-textmuted mb-3">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="bg-gray-700 px-2 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs text-textmuted mb-4">
                    Uploaded: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="p-2 border border-gray-700 hover:bg-gray-700/50">
                        <LinkIcon className="w-4 h-4 mr-1" /> Ver
                      </Button>
                    </a>
                    <Button onClick={() => handleDeleteItem(item.id)} variant="danger" size="sm" className="p-2">
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentLibrary;