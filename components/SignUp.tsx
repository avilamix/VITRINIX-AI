import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, User, CheckCircle2 } from 'lucide-react';

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      // Simulação de chamada
      console.log('Tentando registrar:', { name, email, password });
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Registro efetuado (Simulado)');
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      
      {/* LADO ESQUERDO - BRANDING (Igual ao Login) */}
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
                Junte-se à revolução do marketing autônomo.
              </h2>
              <p className="text-lg text-indigo-100 max-w-md">
                Crie sua conta corporativa e tenha acesso ao poder do Gemini e Google Veo integrados.
              </p>
            </div>
             
             {/* Feature List */}
             <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Setup Rápido em 2 Minutos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Integração Multi-Organização</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-indigo-300">
            © 2025 VitrineX AI Inc. All rights reserved.
          </div>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO DE REGISTRO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[400px] space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Criar Conta</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Preencha seus dados para começar.
            </p>
          </div>

          <form onSubmit={handleRegister} className="mt-8 space-y-6">
            
            {/* Input Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Seu Nome"
                />
              </div>
            </div>

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
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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

             {/* Input Confirm Password */}
             <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirmar Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                  Já tem uma conta?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline">
                Fazer Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;