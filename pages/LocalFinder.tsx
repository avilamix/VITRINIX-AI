
import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { findPlacesWithMaps } from '../services/geminiService';
import { PlaceResult } from '../types';
import { useToast } from '../contexts/ToastContext';
import { MapPinIcon, GlobeAltIcon, ArrowTopRightOnSquareIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const LocalFinder: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [locationQuery, setLocationQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PlaceResult | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState<'pending' | 'success' | 'denied'>('pending');

    const { addToast } = useToast();

    const requestLocation = useCallback(() => {
        setLocationStatus('pending');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setLocationStatus('success');
                },
                (err) => {
                    console.warn('Geolocation access denied or failed:', err);
                    setLocationStatus('denied');
                    if (err.code === 1) { // PERMISSION_DENIED
                        addToast({ type: 'warning', message: 'Permissão de localização negada. Digite o local manualmente.' });
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocationStatus('denied');
            addToast({ type: 'error', message: 'Geolocalização não suportada neste navegador.' });
        }
    }, [addToast]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    const handleSearch = useCallback(async () => {
        if (!prompt.trim()) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Por favor, insira o que você está procurando.' });
            return;
        }
        // Se não digitou local E não tem GPS, bloqueia
        if (!locationQuery.trim() && !location) {
            addToast({ type: 'error', title: 'Localização Necessária', message: 'Ative o GPS ou digite uma cidade/bairro.' });
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Se locationQuery existir, ela terá prioridade no serviço
            const response = await findPlacesWithMaps(prompt, location, locationQuery);
            setResult(response);
            addToast({ type: 'success', title: 'Busca Concluída', message: `${response.places.length} locais encontrados.` });
        } catch (err) {
            console.error('Error finding places:', err);
            const errorMessage = `Falha na busca: ${err instanceof Error ? err.message : String(err)}`;
            setError(errorMessage);
            addToast({ type: 'error', title: 'Erro', message: errorMessage });
        } finally {
            setLoading(false);
        }
    }, [prompt, location, locationQuery, addToast]);

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-title">Explorador Local</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                    <p className="text-muted">Encontre lugares usando a IA com informações do Google Maps.</p>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 mb-8">
                <h3 className="text-lg font-semibold text-title mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5 text-primary" />
                    Busca Local com IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        id="localFinderPrompt"
                        label="O que você procura?"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: 'Cafeterias com Wi-Fi', 'Mecânico aberto agora'"
                        className="mb-0"
                    />
                    
                    <div className="relative">
                        <label htmlFor="locationQuery" className="block text-sm font-medium text-title mb-1.5 flex justify-between">
                            <span>Localização</span>
                            {locationStatus === 'success' && !locationQuery && (
                                <span className="text-xs text-success flex items-center gap-1 animate-pulse">
                                    <GlobeAltIcon className="w-3 h-3" /> Usando GPS
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                id="locationQuery"
                                type="text"
                                className={`block w-full px-3 py-2.5 bg-surface border rounded-lg shadow-sm text-body placeholder-muted transition-colors focus:outline-none sm:text-sm ${
                                    locationStatus === 'success' && !locationQuery 
                                    ? 'border-success/50 ring-1 ring-success/20 pl-9' 
                                    : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary'
                                }`}
                                value={locationQuery}
                                onChange={(e) => setLocationQuery(e.target.value)}
                                placeholder={locationStatus === 'success' ? "Localização atual (Digite para alterar)" : "Digite cidade ou bairro..."}
                            />
                            {locationStatus === 'success' && !locationQuery && (
                                <MapPinIcon className="absolute left-3 top-2.5 w-4 h-4 text-success" />
                            )}
                            
                            <div className="absolute right-2 top-2">
                                {locationStatus === 'denied' ? (
                                    <button 
                                        onClick={requestLocation}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-muted px-2 py-1 rounded transition-colors"
                                        title="Tentar ativar GPS"
                                    >
                                        Ativar GPS
                                    </button>
                                ) : locationStatus === 'pending' ? (
                                    <LoadingSpinner className="w-4 h-4 text-primary" />
                                ) : (
                                    <button 
                                        onClick={requestLocation}
                                        className="text-muted hover:text-primary transition-colors p-1"
                                        title="Atualizar GPS"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted mt-1.5 ml-1">
                            {locationQuery 
                                ? "Buscando na localização digitada." 
                                : locationStatus === 'success' 
                                    ? "Usando coordenadas precisas do seu dispositivo." 
                                    : "Digite um local ou ative o GPS."}
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    <Button
                        onClick={handleSearch}
                        isLoading={loading}
                        variant="primary"
                        className="w-full sm:w-auto"
                        disabled={!prompt.trim() || (!locationQuery.trim() && locationStatus !== 'success') || loading}
                    >
                        {loading ? 'Buscando...' : 'Encontrar Lugares'}
                    </Button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center h-48 bg-surface rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-center">
                        <LoadingSpinner className="w-8 h-8 mb-3" />
                        <p className="text-body font-medium">Analisando o mapa e buscando locais...</p>
                    </div>
                </div>
            )}
            
            {error && (
               <div className="bg-error/10 border-l-4 border-error text-error p-4 rounded-r-lg mb-6" role="alert">
                  <p className="font-bold">Erro na Busca</p>
                  <p>{error}</p>
               </div>
            )}

            {result && (
                <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-semibold text-title mb-4">Recomendação da IA</h3>
                    <div className="prose prose-sm max-w-none text-body leading-relaxed mb-8" style={{ whiteSpace: 'pre-wrap' }}>
                        {result.text}
                    </div>

                    {result.places.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Locais Encontrados</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {result.places.map((place, index) => (
                                    <a
                                        key={index}
                                        href={place.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block bg-background p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-title group-hover:text-primary truncate pr-2">{place.title}</p>
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocalFinder;
