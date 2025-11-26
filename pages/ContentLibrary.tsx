import React, { useState, useEffect, useCallback } from 'react';
import { LibraryItem } from '../types';
// FIX: Import saveLibraryItem from firestoreService
import { getLibraryItems, deleteLibraryItem, saveLibraryItem } from '../services/firestoreService';
import { uploadFile } from '../services/cloudStorageService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
// FIX: Import DocumentTextIcon
import { TrashIcon, ArrowDownTrayIcon, ShareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useNavigate } from '../hooks/useNavigate'; // Custom hook for navigation

const ContentLibrary: React.FC = () => {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [uploading, setUploading] = useState<boolean>(false);
  const { navigateTo } = useNavigate();

  const userId = 'mock-user-123'; // Mock user ID

  const fetchLibrary = useCallback(async (tags?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const items = await getLibraryItems(userId, tags);
      setLibraryItems(items);
    } catch (err) {
      console.error('Failed to fetch library items:', err);
      setError('Failed to load library content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      setError(null);
      try {
        const type: LibraryItem['type'] = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'text'; // Default to text for others
        const newItem = await uploadFile(file, userId, type);
        await saveLibraryItem(newItem); // Save metadata to Firestore
        setLibraryItems((prev) => [newItem, ...prev]);
        alert('Arquivo enviado com sucesso!');
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Failed to upload file: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setUploading(false);
        event.target.value = ''; // Clear input
      }
    }
  }, [userId]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      setError(null);
      try {
        await deleteLibraryItem(itemId);
        // Also delete from cloud storage (mock)
        // await deleteFile(itemId); // Uncomment and implement if CloudStorageService has delete
        setLibraryItems((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err) {
        console.error('Error deleting item:', err);
        setError(`Failed to delete item: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, []);

  const handleDownloadItem = useCallback((item: LibraryItem) => {
    const link = document.createElement('a');
    link.href = item.file_url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleUseInCalendar = useCallback((item: LibraryItem) => {
    // Navigate to SmartScheduler and pre-fill with this item
    console.log('Using item in calendar:', item);
    navigateTo('SmartScheduler'); // Will need to enhance SmartScheduler to receive item
    alert(`Item "${item.name}" adicionado ao calendário (funcionalidade completa no SmartScheduler).`);
  }, [navigateTo]);

  // Extract all unique tags
  const allTags = Array.from(new Set(libraryItems.flatMap(item => item.tags)));
  const filteredItems = libraryItems
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(item => selectedTag === 'all' || item.tags.includes(selectedTag));

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Content Library</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Gerenciar Conteúdo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            id="searchContent"
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="col-span-1 md:col-span-2"
          />
          <div>
            <label htmlFor="tagFilter" className="sr-only">Filtrar por Tag</label>
            <select
              id="tagFilter"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="all">Todas as Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* FIX: Remove Button component and style label directly */}
          <label
            htmlFor="file-upload-input"
            className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out
              ${uploading ? 'opacity-60 cursor-not-allowed bg-primary text-white' : 'bg-primary text-white hover:bg-indigo-700 focus:ring-primary'}`}
          >
            {uploading ? <LoadingSpinner /> : 'Enviar Arquivo'}
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {/* <Button variant="secondary" onClick={() => alert('Editar not implemented.')}>Editar Item</Button> */}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
          <p className="ml-2 text-gray-600">Loading library...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-600">
          Nenhum item encontrado na biblioteca.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group">
              <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                {item.type === 'image' || item.type === 'video' ? (
                  <img
                    src={item.thumbnail_url || item.file_url || 'https://picsum.photos/200/150'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-center p-4">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Arquivo de Texto</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-2">
                  <Button
                    onClick={() => handleDownloadItem(item)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-gray-700"
                    title="Baixar"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleUseInCalendar(item)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-gray-700"
                    title="Usar no Calendário"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteItem(item.id)}
                    variant="danger"
                    size="sm"
                    className="text-white hover:bg-red-700"
                    title="Excluir"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                <p className="text-sm text-gray-500 mt-1">Tipo: {item.type}</p>
                {item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;