import React, { useState, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { executeCode } from '../services/geminiService';
import { GeminiPart } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CodeBracketIcon, CommandLineIcon, SparklesIcon } from '@heroicons/react/24/outline';

const CodePlayground: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.');
  const [resultParts, setResultParts] = useState<GeminiPart[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  const { addToast } = useToast();

  const handleExecute = useCallback(async () => {
    if (!prompt.trim()) {
      addToast({ type: 'warning', title: 'Atenção', message: 'Por favor, insira um prompt para a execução.' });
      return;
    }
    setLoading(true);
    setResultParts([]);
    try {
      const parts = await executeCode(prompt);
      setResultParts(parts);
      addToast({ type: 'success', title: 'Execução Concluída', message: 'O código foi gerado e executado com sucesso.' });
    } catch (err) {
      console.error('Error executing code:', err);
      addToast({ type: 'error', title: 'Erro na Execução', message: `Falha: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  }, [prompt, addToast]);

  const renderPart = (part: GeminiPart, index: number) => {
    if (part.text) {
      return (
        <div key={index} className="prose prose-sm max-w-none text-body leading-relaxed">
          <p>{part.text}</p>
        </div>
      );
    }
    if (part.executableCode) {
      return (
        <div key={index} className="mt-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center">
            <CodeBracketIcon className="w-4 h-4 mr-2" />
            Código Gerado (Python)
          </h4>
          <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
            <code>{part.executableCode.code}</code>
          </pre>
        </div>
      );
    }
    if (part.codeExecutionResult) {
      return (
        <div key={index} className="mt-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center">
            <CommandLineIcon className="w-4 h-4 mr-2" />
            Saída da Execução
          </h4>
          <pre className={`p-4 rounded-lg text-xs overflow-x-auto ${part.codeExecutionResult.outcome === 'OUTCOME_FAILED' ? 'bg-red-900/50 text-red-300' : 'bg-gray-900/50 text-gray-300'}`}>
            <code>{part.codeExecutionResult.output}</code>
          </pre>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-title">Laboratório de Código</h2>
        <p className="text-muted mt-1">Peça à IA para escrever e executar código Python para resolver problemas.</p>
      </div>

      <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-title mb-4 flex items-center gap-2">
           <SparklesIcon className="w-5 h-5 text-primary"/>
           Prompt de Execução
        </h3>
        <Textarea
          id="codePrompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Ex: 'Plote um gráfico de barras com os dados [10, 20, 15, 25]' ou 'Ordene esta lista de números em ordem decrescente: [5, 2, 8, 1, 9]'"
        />
        <div className="mt-4">
          <Button
            onClick={handleExecute}
            isLoading={loading}
            variant="primary"
            className="w-full sm:w-auto"
            disabled={!prompt.trim()}
          >
            {loading ? 'Executando...' : 'Gerar e Executar Código'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-48 bg-surface rounded-xl p-6">
            <LoadingSpinner />
            <p className="ml-3 text-body font-medium">A IA está trabalhando...</p>
        </div>
      )}

      {resultParts.length > 0 && (
        <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-title mb-4">Resultado da Execução</h3>
          <div className="space-y-4">
            {resultParts.map(renderPart)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;