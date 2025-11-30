import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { getLibraryItems, getScheduleEntries, saveScheduleEntry, deleteScheduleEntry } from '../services/firestoreService';
import { ScheduleEntry, LibraryItem } from '../types';
import { PlusIcon, TrashIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { LIBRARY_ITEM_TYPES } from '../constants';

interface SmartSchedulerProps {
  organizationId: string | undefined;
  userId: string | undefined;
}

const SmartScheduler: React.FC<SmartSchedulerProps> = ({ organizationId, userId }) => {
  const [scheduledItems, setScheduledItems] = useState<ScheduleEntry[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New schedule form state
  const [newSchedulePlatform, setNewSchedulePlatform] = useState<string>('');
  const [newScheduleDate, setNewScheduleDate] = useState<string>('');
  const [newScheduleTime, setNewScheduleTime] = useState<string>('');
  const [newScheduleContentId, setNewScheduleContentId] = useState<string>('');
  const [newScheduleContentType, setNewScheduleContentType] = useState<ScheduleEntry['contentType']>('post'); // Use generic content type
  const [scheduling, setScheduling] = useState<boolean>(false);


  const fetchSchedulerData = useCallback(async () => {
    if (!organizationId) {
      setError('No active organization found. Please login.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // getScheduleEntries no longer takes userId as an argument
      const fetchedSchedule = await getScheduleEntries();
      // getLibraryItems no longer takes userId as an argument, but filters
      const fetchedLibrary = await getLibraryItems();
      setScheduledItems(fetchedSchedule.sort((a, b) => a.datetime.getTime() - b.datetime.getTime()));
      setLibraryItems(fetchedLibrary);

      // Set default content for new schedule if available
      if (fetchedLibrary.length > 0 && !newScheduleContentId) {
        setNewScheduleContentId(fetchedLibrary[0].id);
        setNewScheduleContentType(fetchedLibrary[0].type); // Set default content type based on library item
      }
    } catch (err) {
      console.error('Failed to fetch scheduler data:', err);
      setError('Failed to load scheduler data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, newScheduleContentId]); // Depend on organizationId to refetch if active org changes

  useEffect(() => {
    fetchSchedulerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]); // Depend on organizationId to refetch if active org changes

  const handleScheduleContent = useCallback(async () => {
    if (!newSchedulePlatform || !newScheduleDate || !newScheduleTime || !newScheduleContentId) {
      setError('Please fill all fields for scheduling.');
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

    setScheduling(true);
    setError(null);

    try {
      const combinedDateTime = `${newScheduleDate}T${newScheduleTime}:00`;
      const newEntry: ScheduleEntry = {
        id: `schedule-${Date.now()}`, // Backend will assign ID
        organizationId: organizationId, // Explicitly pass organizationId
        userId: userId, // Pass userId
        // datetime should be a Date object, not an ISO string, when assigned to newEntry
        datetime: new Date(combinedDateTime), 
        platform: newSchedulePlatform,
        contentId: newScheduleContentId,
        contentType: newScheduleContentType, // Use the selected content type
        status: 'scheduled',
        createdAt: new Date(), // Backend will set
        updatedAt: new Date(), // Backend will set
      };
      const savedEntry = await saveScheduleEntry(newEntry);
      setScheduledItems((prev) => [...prev, savedEntry].sort((a, b) => a.datetime.getTime() - b.datetime.getTime()));

      // Reset form
      setNewSchedulePlatform('');
      setNewScheduleDate('');
      setNewScheduleTime('');
      // Keep selected content, but maybe clear if user wants
      // setNewScheduleContentId(libraryItems.length > 0 ? libraryItems[0].id : '');
      alert('Conteúdo agendado com sucesso!');
    } catch (err) {
      console.error('Error scheduling content:', err);
      setError(`Failed to schedule content: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setScheduling(false);
    }
  }, [newSchedulePlatform, newScheduleDate, newScheduleTime, newScheduleContentId, newScheduleContentType, organizationId, userId]);

  const handleDeleteSchedule = useCallback(async (entryId: string) => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      if (!organizationId) {
        setError('No active organization found. Cannot delete item.');
        return;
      }
      setError(null);
      try {
        await deleteScheduleEntry(entryId);
        setScheduledItems((prev) => prev.filter((entry) => entry.id !== entryId));
      } catch (err) {
        console.error('Error deleting schedule entry:', err);
        setError(`Failed to delete schedule entry: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [organizationId]);

  // Helper to get item details for display
  const getItemDetails = useCallback((contentId: string) => {
    return libraryItems.find(item => item.id === contentId);
  }, [libraryItems]);

  const getStatusIcon = (status: ScheduleEntry['status']) => {
    switch (status) {
      case 'published':
        return <CheckCircleIcon className="w-5 h-5 text-accent" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'scheduled':
      default:
        return <ClockIcon className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Smart Scheduler (Autopost)</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* New Schedule Form */}
      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Agendar Nova Publicação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contentSelect" className="block text-sm font-medium text-textlight mb-1">
              Conteúdo para Publicar:
            </label>
            <select
              id="contentSelect"
              value={newScheduleContentId}
              onChange={(e) => {
                setNewScheduleContentId(e.target.value);
                const selectedItem = libraryItems.find(item => item.id === e.target.value);
                if (selectedItem) {
                  setNewScheduleContentType(selectedItem.type); // Set content type based on selected library item
                }
              }}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm mb-2"
            >
              <option value="">Selecione um item da Biblioteca</option>
              {libraryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.type})
                </option>
              ))}
            </select>
            {newScheduleContentId && getItemDetails(newScheduleContentId)?.thumbnailUrl && (
              <img
                // Changed thumbnail_url to thumbnailUrl
                src={getItemDetails(newScheduleContentId)?.thumbnailUrl || 'https://picsum.photos/100/100'}
                alt="Selected content thumbnail"
                className="w-24 h-24 object-cover rounded-md mt-2 border border-gray-700"
              />
            )}
          </div>
          <div>
            <label htmlFor="platformSelect" className="block text-sm font-medium text-textlight mb-1">
              Plataforma:
            </label>
            <select
              id="platformSelect"
              value={newSchedulePlatform}
              onChange={(e) => setNewSchedulePlatform(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            >
              <option value="">Selecione uma plataforma</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
              <option value="Pinterest">Pinterest</option>
              <option value="GoogleMyBusiness">Google My Business</option>
            </select>
          </div>
          <Input
            id="scheduleDate"
            label="Data:"
            type="date"
            value={newScheduleDate}
            onChange={(e) => setNewScheduleDate(e.target.value)}
          />
          <Input
            id="scheduleTime"
            label="Hora:"
            type="time"
            value={newScheduleTime}
            onChange={(e) => setNewScheduleTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={handleScheduleContent}
            isLoading={scheduling}
            variant="primary"
            className="w-full md:w-auto"
            disabled={!newScheduleContentId || !newSchedulePlatform || !newScheduleDate || !newScheduleTime}
          >
            {scheduling ? 'Agendando...' : 'Agendar'}
          </Button>
          <Button
            onClick={() => alert('Publicar Agora not implemented. (Would trigger immediate backend autopost)')}
            variant="secondary"
            className="w-full md:w-auto"
            disabled={!newScheduleContentId || !newSchedulePlatform}
          >
            Publicar Agora
          </Button>
        </div>
      </div>

      {/* Scheduled Posts & History */}
      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
        <h3 className="text-xl font-semibold text-textlight mb-5">Próximos Agendamentos e Histórico</h3>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner />
            <p className="ml-2 text-textlight">Loading schedule...</p>
          </div>
        ) : scheduledItems.length === 0 ? (
          <div className="text-center text-textlight p-4">Nenhum agendamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-darkbg">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textmuted uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textmuted uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textmuted uppercase tracking-wider">
                    Conteúdo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textmuted uppercase tracking-wider">
                    Plataforma
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textmuted uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-lightbg divide-y divide-gray-700">
                {scheduledItems.map((entry) => {
                  const item = getItemDetails(entry.contentId);
                  const dateTime = entry.datetime; // Now a Date object
                  const isPast = dateTime < new Date();
                  return (
                    <tr key={entry.id} className={isPast ? 'bg-darkbg text-textmuted' : 'text-textlight'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center">
                          {getStatusIcon(entry.status)}
                          <span className="ml-2 capitalize">{entry.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {dateTime.toLocaleDateString()} {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item ? item.name : 'Conteúdo não encontrado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.platform}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!isPast && (
                          <Button
                            onClick={() => handleDeleteSchedule(entry.id)}
                            variant="danger"
                            size="sm"
                            className="mr-2"
                          >
                            <TrashIcon className="w-4 h-4 text-red-300" /> Cancelar
                          </Button>
                        )}
                        {/* <Button variant="secondary" size="sm">
                          <ShareIcon className="w-4 h-4" /> Repostar (TODO)
                        </Button> */}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartScheduler;