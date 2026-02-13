"use client";
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { UserCircle, Mail, Bell, Save, Lock, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setEmail(user.email || '');
        setDisplayName(user.user_metadata?.full_name || '');
        setNotifications(user.user_metadata?.notifications ?? true);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!user) {
      setError("You must be logged in to update your profile.");
      setLoading(false);
      return;
    }

    try {
      // Update email and username
      const { error: updateError } = await supabase.auth.updateUser({
        email: email,
        data: { full_name: displayName, notifications: notifications }
      });

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully!');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setPasswordLoading(true);

    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;

      setSuccess('Password updated successfully!');
      setNewPassword('');
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      setModalError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading && !user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">User Profile</h2>
        <p className="text-slate-400">Manage your account settings and preferences.</p>
      </header>

      <div className="bg-slate-900 max-w-2xl rounded-xl border border-slate-800">
        <form onSubmit={handleProfileUpdate}>
          <div className="p-6 space-y-6">
            {error && <p className="text-red-500 text-center">{error}</p>}
            {success && <p className="text-green-500 text-center">{success}</p>}
            
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-400 mb-2">Display Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between pt-4">
               <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-500"/>
                    <div>
                        <h4 className="font-medium text-white">Email Notifications</h4>
                        <p className="text-sm text-slate-400">Receive alerts and summaries via email.</p>
                    </div>
               </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={notifications} 
                    onChange={() => setNotifications(!notifications)} 
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {/* Change Password Trigger */}
            <div className="pt-4 border-t border-slate-800">
                 <h4 className="font-medium text-white mb-3">Security</h4>
                 <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg border border-slate-700 transition-colors"
                 >
                    <Lock size={16} /> Change Password
                 </button>
            </div>

          </div>
          <footer className="p-6 border-t border-slate-800 flex justify-end">
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </footer>
        </form>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-800 shadow-2xl p-6 m-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Change Password</h3>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handlePasswordUpdate}>
                {modalError && <p className="text-red-500 text-sm mb-4 text-center">{modalError}</p>}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-400 mb-2">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new password"  
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsPasswordModalOpen(false)}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={passwordLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                    >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
