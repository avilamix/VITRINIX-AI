
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignUp: () => void;
  error?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignUp, error: propError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError('');

    try {
      // For now, we trigger the Google Login flow from App.tsx via onLogin
      // In a full implementation with email/pass, we would call authService.loginWithEmail(email, password)
      await onLogin();
    } catch (err) {
      setLocalError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      
      {/* LADO ESQUERDO - BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-600">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-800 opacity-90 z-10" />
        
        {/* Abstract Background Shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500 blur-3xl opacity-30 z-0"></div>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-purple-500 blur-3xl opacity-20 z-0"></div>

        <div className="relative z-20 flex flex-col justify-between h-full p-16 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">VitrineX AI</h1>
            <p className="text-indigo-200 font-medium">Enterprise Marketing OS</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold leading-tight">
                Transforme sua estratégia de marketing com Inteligência Artificial.
              </h2>
              <p className="text-lg text-indigo-100 max-w-md">
                Deixe o Gemini gerenciar suas campanhas, criar seus criativos e analisar seus dados em uma única plataforma.
              </p>
            </div>

            {/* Feature List Mini */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Geração de Vídeo com Google Veo</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Analytics Preditivo em Tempo Real</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Automação de Redes Sociais</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-indigo-300">
            © 2025 VitrineX AI Inc. All rights reserved.
          </div>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO DE LOGIN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[400px] space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
          
          <div className="text-center lg:text-left">
            <div className="lg:hidden mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600">
               <span className="font-bold text-xl">V</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bem-vindo de volta</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Digite suas credenciais para acessar o painel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            
            {/* Input Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {(localError || propError) && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium animate-pulse">
                {localError || propError}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              variant="primary"
              className="w-full py-3"
            >
              Entrar na Plataforma <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                  Ainda não tem acesso?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button 
                onClick={onSwitchToSignUp}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                Solicitar uma demonstração
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
