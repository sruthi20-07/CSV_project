'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Settings, Database, Key, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { toast } from 'sonner';

export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Initial Theme check
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }

    const storedKey = localStorage.getItem('user_gemini_key') || '';
    setApiKey(storedKey);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
      toast.success('Dark mode enabled');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
      toast.success('Light mode enabled');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('user_gemini_key', apiKey.trim());
    setIsSettingsOpen(false);
    if (apiKey.trim()) {
      toast.success('Gemini API key saved in local storage');
    } else {
      toast.info('API key cleared. System environment keys will be used.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/70 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                GrowEasy
              </span>
              <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                AI CSV Importer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 animate-in fade-in zoom-in-75" />
              ) : (
                <Sun className="h-5 w-5 animate-in fade-in zoom-in-75" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="hidden items-center gap-1.5 rounded-xl border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:flex"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="flex rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:hidden"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-950 dark:text-white">
              <Key className="h-5 w-5 text-indigo-500" />
              Configuration Settings
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              Provide credentials to enable AI mapping and normalization features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Google Gemini API Key
              </label>
              <Input
                type="password"
                placeholder="Enter AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="rounded-xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                This key is saved locally in your browser storage and is passed securely via headers for your API transactions.
              </p>
            </div>

            <div className="flex gap-2.5 rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">Security Note:</span> If empty, the server will check for the <code className="font-mono bg-amber-500/20 px-1 rounded">GEMINI_API_KEY</code> variable configured in the server's backend environment.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => setIsSettingsOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
