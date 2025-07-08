import React, { useState } from 'react';
import { Globe, Download, Upload, Archive } from 'lucide-react';
import { api } from '../utils/api';

export const WorldManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExportWorld = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const blob = await api.exportWorld();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world-backup-${new Date().toISOString().split('T')[0]}.tar`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccess('World exported successfully!');
    } catch (err) {
      setError('Failed to export world');
    } finally {
      setLoading(false);
    }
  };

  const handleImportWorld = async (file: File) => {
    if (!file.name.endsWith('.tar')) {
      setError('Only .tar files are allowed');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.importWorld(file);
      setSuccess('World imported successfully! Restart the server to apply changes.');
    } catch (err) {
      setError('Failed to import world');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Globe className="h-5 w-5 mr-2" />
        World Manager
      </h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Download className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Export World</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Download your current world as a .tar archive for backup or transfer.
          </p>
          <button
            onClick={handleExportWorld}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Archive className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : 'Export World'}
          </button>
        </div>

        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-green-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Import World</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Replace your current world with a .tar archive. This will overwrite existing world data.
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
            <input
              type="file"
              accept=".tar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportWorld(file);
              }}
              className="hidden"
            />
            <Archive className="h-4 w-4 mr-2" />
            {loading ? 'Importing...' : 'Import World'}
          </label>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-100">
              Important Notice
            </h3>
            <div className="mt-2 text-sm text-yellow-200">
              <p>
                Always stop the server before importing a world. The server must be restarted after world import to load the new world data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};