import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Activity, Users, Clock, HardDrive } from 'lucide-react';
import { api } from '../utils/api';
import { ServerStatus } from '../types';

export const ServerControls: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await api.getServerStatus();
      setStatus(response.data);
    } catch (err) {
      setError('Failed to fetch server status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true);
    setError('');

    try {
      if (action === 'start') {
        await api.startServer();
      } else if (action === 'stop') {
        await api.stopServer();
      } else {
        await api.restartServer();
      }
      
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setError(`Failed to ${action} server`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Server Controls
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${status.running ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${status.running ? 'text-green-400' : 'text-red-400'}`}>
            {status.running ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Players</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.players || 0}</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Uptime</span>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.uptime || '--'}</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Memory</span>
            <HardDrive className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.memory || '--'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleServerAction('start')}
          disabled={loading || status.running}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-4 w-4 mr-2" />
          Start Server
        </button>
        
        <button
          onClick={() => handleServerAction('stop')}
          disabled={loading || !status.running}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop Server
        </button>
        
        <button
          onClick={() => handleServerAction('restart')}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restart Server
        </button>
      </div>
    </div>
  );
};