import React, { useState, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { executeCode } from '../services/geminiService';
import { GeminiPart } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CodeBracketIcon, CommandLineIcon, SparklesIcon } from '@heroicons/react/24/outline';

const CodePlayground: React.FC = () => {
  // Alterado para um prompt inicial focado em Vendas/Marketing
  const [prompt, setPrompt] = useState<string>('Crie 3 ideias curtas de frases para vender "Óculos de Sol" no Instagram, usando emojis e um tom de verão.');
  const [resultParts, setResultParts] = useState<GeminiPart[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  const { addToast } = useToast();

  const handleExecute = useCallback(async () => {
    if (!prompt.trim()) {
      addToast({ type: 'warning', title: 'Atenção', message: 'Por favor, descreva o que você deseja criar.' });
      return;
    }
    setLoading(true);
    setResultParts([]);
    try {
      const parts = await executeCode(prompt);
      setResultParts(parts);
      addToast({ type: 'success', title: 'Conteúdo Gerado', message: 'Sua estratégia foi criada com sucesso!' });
    } catch (err) {
      console.error('Error executing code:', err);
      addToast({ type: 'error', title: 'Erro na Criação', message: `Não foi possível gerar o conteúdo: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  }, [prompt, addToast]);

  const renderPart = (part: GeminiPart, index: number) => {
    // Exibição de texto simples (A resposta da IA)
    if (part.text) {
      return (
        <div key={index} className="prose prose-sm max-w-none text-body leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
          <p className="whitespace-pre-wrap">{part.text}</p>
        </div>
      );
    }
    // Exibição do código (Caso a IA gere scripts para análise)
    if (part.executableCode) {
      return (
        <div key={index} className="mt-4 opacity-80 hover:opacity-100 transition-opacity">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center">
            <CodeBracketIcon className="w-4 h-4 mr-2" />
            Estrutura Técnica (Código Gerado)
          </h4>
          <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
            <code>{part.executableCode.code}</code>
          </pre>
        </div>
      );
    }
    // Exibição do Resultado da Execução
    if (part.codeExecutionResult) {
      return (
        <div key={index} className="mt-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center">
            <CommandLineIcon className="w-4 h-4 mr-2" />
            Resultado da Análise
          </h4>
          <pre className={`p-4 rounded-lg text-xs overflow-x-auto ${part.codeExecutionResult.outcome === 'OUTCOME_FAILED' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
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
        {/* Título e Descrição atualizados */}
        <h2 className="text-2xl font-bold text-title">Estúdio de Criação</h2>
        <p className="text-muted mt-1">
          Descreva o que você precisa vender hoje e deixe nossa Inteligência Artificial criar os melhores textos e estratégias para você.
        </p>
      </div>

      <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-title mb-4 flex items-center gap-2">
           <SparklesIcon className="w-5 h-5 text-primary"/>
           O que vamos criar hoje?
        </h3>
        <Textarea
          id="codePrompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          // Placeholder focado em comércio
          placeholder="Ex: 'Crie uma legenda divertida para vender camisetas estampadas' ou 'Calcule o lucro se eu vender 50 unidades a R$29,90 com custo de R$15,00'"
        />
        <div className="mt-4">
          <Button
            onClick={handleExecute}
            isLoading={loading}
            variant="primary"
            className="w-full sm:w-auto"
            disabled={!prompt.trim()}
          >
            {loading ? 'Criando...' : 'Gerar Conteúdo'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-48 bg-surface rounded-xl p-6">
            <LoadingSpinner />
            <p className="ml-3 text-body font-medium">A IA está criando sua estratégia...</p>
        </div>
      )}

      {resultParts.length > 0 && (
        <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-title mb-4">Sua Criação</h3>
          <div className="space-y-4">
            {resultParts.map(renderPart)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;