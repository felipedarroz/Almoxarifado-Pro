
import React, { useState } from 'react';

import { Package, Lock, User as UserIcon, Key, ArrowRight, UserPlus, AlertCircle, Building2 } from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let authUser = null;
      let isSignUp = isRegistering;

      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não conferem.');
        }
        if (username.length < 3) {
          throw new Error('Usuário muito curto.');
        }
        if (!email.includes('@')) {
          throw new Error('E-mail inválido.');
        }

        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (authError) {
          // Check if user already exists
          if (authError.message.includes('already registered') || authError.status === 400 || authError.message.includes('User already registered')) {
            // Attempt to sign in instead
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (signInError) {
              throw new Error('Usuário já cadastrado, mas a senha informada está incorreta.');
            }

            authUser = signInData.user;
            isSignUp = false; // Switch to login flow behavior for profile check
          } else {
            throw authError; // Rethrow other errors
          }
        } else {
          authUser = authData.user;
        }

        if (!authUser) throw new Error("Erro ao criar ou autenticar usuário.");

        await ensureProfileExists(authUser, company, username, email);

        if (isSignUp) {
          setRegistrationSuccess(true);
        } else {
          await checkUserStatusAndRedirect(authUser);
        }

      } else {
        // Login Flow
        let emailToLogin = username;

        if (!username.includes('@')) {
          const { data: resolvedEmail, error: lookupError } = await supabase.rpc('get_email_by_username_public', {
            username_input: username
          });

          if (lookupError || !resolvedEmail) {
            // Fallback
            emailToLogin = `${username.toLowerCase().replace(/\s+/g, '')}@temp.com`;
          } else {
            emailToLogin = resolvedEmail;
          }
        }

        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email: emailToLogin,
          password: password,
        });

        if (error || !user) throw new Error('Usuário ou senha incorretos.');
        authUser = user;

        const effectiveUsername = username || user.email?.split('@')[0] || 'User';
        await ensureProfileExists(authUser, company, effectiveUsername, user.email || '');
        await checkUserStatusAndRedirect(authUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro.');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (user: any, companyName: string, userName: string, userEmail: string) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    const normalizedCompany = companyName.trim();
    if (!normalizedCompany) return; // Cannot heal without company name

    let companyId: string;
    const { data: existingCompany } = await supabase.from('companies').select('id').eq('name', normalizedCompany).single();
    if (existingCompany) companyId = existingCompany.id;
    else {
      const { data: newCompany, error: createError } = await supabase.from('companies').insert({ name: normalizedCompany }).select('id').single();
      if (createError) throw new Error("Erro ao registrar empresa: " + createError.message);
      companyId = newCompany.id;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: userName,
        email: userEmail,
        company: normalizedCompany,
        company_id: companyId,
        role: UserRole.VIEWER,
        status: UserStatus.PENDING
      });

    if (profileError) throw profileError;
    return { status: UserStatus.PENDING, company: normalizedCompany };
  };

  const checkUserStatusAndRedirect = async (user: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company, company_id, status, companies(name)')
      .eq('id', user.id)
      .single();

    if (profile) {
      if (profile.status === UserStatus.PENDING) {
        await supabase.auth.signOut();
        throw new Error('Sua solicitação de acesso está em análise. Por favor, aguarde.');
      }
      if (profile.status === UserStatus.BLOCKED) {
        await supabase.auth.signOut();
        throw new Error('Acesso bloqueado. Contate o suporte.');
      }

      const storedCompany = profile.company || (profile.companies as any)?.name;
      if (company && storedCompany && storedCompany.toLowerCase() !== company.trim().toLowerCase()) {
        await supabase.auth.signOut();
        throw new Error(`Este usuário não pertence à empresa "${company}". Pertence a: ${storedCompany}`);
      }
    }
    onLoginSuccess();
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setCompany('');
    setConfirmPassword('');
    setRegistrationSuccess(false);
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastro em Análise</h2>
          <p className="text-slate-600 mb-6">
            Aguardando aprovação do Administrador.
          </p>
          <button
            onClick={toggleMode}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row z-10 min-h-[500px]">

        {/* Lado Esquerdo (Info) */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 md:w-5/12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col mb-8">
              <h1 className="text-6xl font-black text-white tracking-wide leading-none mb-2">PRUMO</h1>
              <span className="text-xl text-white/90 font-medium tracking-[0.3em] uppercase">Gestor de Processos</span>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Sistema integrado de gestão de entregas, pendências e controle comercial.
            </p>
          </div>

          <div className="relative z-10 mt-8 md:mt-0">
            <p className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-2">Módulos</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-50/80"><div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div> Gestão de Notas</div>
              <div className="flex items-center gap-2 text-sm text-blue-50/80"><div className="w-1.5 h-1.5 rounded-full bg-orange-300"></div> Pendências de Técnicos</div>
              <div className="flex items-center gap-2 text-sm text-blue-50/80"><div className="w-1.5 h-1.5 rounded-full bg-purple-300"></div> Planejamento Comercial</div>
            </div>
          </div>

          {/* Círculos decorativos internos */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Lado Direito (Form) */}
        <div className="p-8 md:w-7/12 flex flex-col justify-center bg-white relative">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">
              {isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {isRegistering ? 'Preencha os dados para começar.' : 'Insira suas credenciais para acessar.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Empresa</label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-900 outline-none"
                      placeholder="Nome da empresa"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">E-mail</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-900 outline-none"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">
                    {isRegistering ? 'Usuário' : 'Usuário ou E-mail'}
                  </label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-900 outline-none"
                      placeholder={isRegistering ? "Nome de usuário" : "Usuário ou e-mail"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Senha</label>
                  <div className="relative group">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-900 outline-none"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Confirmar Senha</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
                      <input
                        type="password"
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-900 outline-none"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Carregando...' : (
                  isRegistering ? (
                    <>
                      Criar Conta <UserPlus size={18} />
                    </>
                  ) : (
                    <>
                      Acessar Sistema <ArrowRight size={18} />
                    </>
                  )
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {isRegistering ? 'Já tem uma conta?' : 'Não tem acesso?'}
                <button
                  onClick={toggleMode}
                  className="ml-1 font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline"
                >
                  {isRegistering ? 'Fazer Login' : 'Criar Conta'}
                </button>
              </p>
            </div>

            {!isRegistering && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] text-center text-slate-400 font-medium mb-2 uppercase tracking-wide">Acesso Rápido (Demo)</p>
                <div className="flex flex-wrap justify-center gap-2 text-[10px] text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">admin / 1234</span>
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">editor / 1234</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 text-center w-full z-10 text-slate-500 text-xs opacity-60">
        &copy; {new Date().getFullYear()} PRUMO Gestor de Processos. Todos os direitos reservados.
      </div>

      {/* Helper icon for errors */}
      {/* Keep existing AlertCircle import */}
    </div>
  );
};


