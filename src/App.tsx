import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useConversations } from './stores/conversationStore';
import ChatLayout from './components/ChatLayout';
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { fetchConversations } = useConversations();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    }
  }, [session, fetchConversations]);

  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(username)) {
      return "Le pseudo ne peut contenir que des lettres, des chiffres et des underscores";
    }
    if (username.length < 3 || username.length > 20) {
      return "Le pseudo doit contenir entre 3 et 20 caractères";
    }
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        const usernameError = validateUsername(username);
        if (usernameError) {
          throw new Error(usernameError);
        }

        // Créer l'utilisateur dans Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        });

        if (signUpError) throw signUpError;

        // Créer le profil dans la base de données
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                username: username,
                full_name: username
              }
            ]);

          if (profileError) throw profileError;
        }
      } else {
        // Connexion
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome to Chat App</h2>
            <p className="mt-2 text-gray-600">
              {authMode === 'signin' ? 'Sign in to continue' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="mt-8 space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 text-red-500 p-3 rounded text-sm"
              >
                {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Pseudo
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Choisissez un pseudo"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Lettres, chiffres et underscores uniquement
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : authMode === 'signin' ? 'Sign in' : 'Sign up'}
              </motion.button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <ChatLayout 
              currentUserId={session.user.id} 
            />
          } 
        />
        <Route 
          path="/chat/:conversationId" 
          element={
            <ChatLayout 
              currentUserId={session.user.id}
              selectedConversationId={window.location.pathname.split('/').pop()}
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;