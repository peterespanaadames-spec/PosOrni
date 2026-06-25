/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      // Offline / Local fallback mode
      handleDemoLogin('Google Admin (Local)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (e: any) {
      console.error("Google login failed", e);
      setError("El inicio de sesión con Google falló. Es posible que esté bloqueado por restricciones del iframe. Intente usar el Acceso de Demostración.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, rellene todos los campos.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (auth) {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          onLoginSuccess(result.user);
        } else {
          handleDemoLogin(email);
        }
      } else {
        if (auth) {
          const result = await signInWithEmailAndPassword(auth, email, password);
          onLoginSuccess(result.user);
        } else {
          handleDemoLogin(email);
        }
      }
    } catch (e: any) {
      console.error("Email auth failed", e);
      setError(e.message || "Error al autenticar. Verifique sus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (username: string = "Administrador de Demostración") => {
    const demoUser = {
      uid: 'demo_user_123',
      displayName: username,
      email: email || 'admin@ventaspro.demo',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      isDemo: true
    };
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8ff] p-4 font-sans select-none" id="login-container">
      <div className="w-full max-w-md bg-white border border-[#eaedff] rounded-2xl shadow-xl shadow-[#eaedff]/30 overflow-hidden" id="login-card">
        {/* Brand Header */}
        <div className="p-8 pb-6 bg-[#003535] text-white relative overflow-hidden" id="login-header">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0d4d4d] rounded-full filter blur-xl opacity-50 -mr-8 -mt-8"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10" id="login-logo-area">
            <span className="material-symbols-outlined text-3xl text-[#85bdbc] fill">point_of_sale</span>
            <span className="text-2xl font-bold tracking-tight">VentasPRO</span>
          </div>
          <p className="text-[#85bdbc] text-sm font-medium relative z-10">Terminal TPV inteligente y Control de Inventario</p>
        </div>

        {/* Form area */}
        <div className="p-8" id="login-body">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5" id="login-error">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4" id="login-email-form">
            <div>
              <label className="block text-xs font-semibold text-[#595f66] mb-1.5">CORREO ELECTRÓNICO</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[#bfc8c8]">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] transition-colors"
                  id="login-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#595f66] mb-1.5">CONTRASEÑA</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[#bfc8c8]">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] transition-colors"
                  id="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#003535] hover:bg-[#0d4d4d] text-white text-sm font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-[#003535]/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
              id="login-submit-button"
            >
              {loading ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : (
                <>
                  <span>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center" id="register-toggle">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-[#003535] hover:underline font-semibold cursor-pointer"
            >
              {isRegister ? '¿Ya tiene cuenta? Iniciar sesión' : '¿No tiene cuenta? Regístrese gratis'}
            </button>
          </div>

          <div className="relative my-6 flex items-center justify-center" id="login-divider">
            <div className="border-t border-[#eaedff] w-full"></div>
            <span className="absolute bg-white px-3 text-[10px] font-bold text-[#bfc8c8] tracking-widest uppercase">O CONTINUAR CON</span>
          </div>

          <div className="space-y-3" id="social-login-actions">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full border border-[#eaedff] bg-white hover:bg-gray-50 text-[#131b2e] text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-55"
              id="login-google-button"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
                referrerPolicy="no-referrer"
              />
              <span>Inicia sesión con Google</span>
            </button>

            <button
              onClick={() => handleDemoLogin()}
              disabled={loading}
              className="w-full bg-[#eaedff] hover:bg-[#dae2fd] text-[#003535] text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
              id="login-demo-button"
            >
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              <span>Acceso de Demostración (Rápido)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2f3ff] border-t border-[#eaedff] text-center" id="login-footer">
          <p className="text-[10px] font-medium text-[#5f656c]">
            {auth ? "🔒 Base de datos Firestore conectada" : "ℹ️ Modo local habilitado (sin Firestore)"}
          </p>
        </div>
      </div>
    </div>
  );
};
