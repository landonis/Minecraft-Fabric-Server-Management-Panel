import React, { useState, useEffect } from 'react';
import { Users, User, Clock, Activity } from 'lucide-react';
import { api } from '../utils/api';
import { Player } from '../types';

export const PlayerViewer: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await api.getPlayers();
      setPlayers(response.data);
    } catch (err) {
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 10000);
    return () => clearInterval(interval);
  }, []);

  const onlinePlayers = players.filter(p => p.online);
  const offlinePlayers = players.filter(p => !p.online);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Player Viewer
        </h2>
        <button
          onClick={fetchPlayers}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            Online Players ({onlinePlayers.length})
          </h3>
          <div className="space-y-3">
            {onlinePlayers.map((player) => (
              <div key={player.uuid} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-green-400 mr-3" />
                  <div>
                    <h4 className="text-white font-medium">{player.username}</h4>
                    <p className="text-gray-400 text-sm">
                      Playtime: {player.playtime || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-green-400">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="text-sm">Online</span>
                </div>
              </div>
            ))}
            {onlinePlayers.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No players online
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2" />
            Recent Players ({offlinePlayers.length})
          </h3>
          <div className="space-y-3">
            {offlinePlayers.slice(0, 5).map((player) => (
              <div key={player.uuid} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <h4 className="text-white font-medium">{player.username}</h4>
                    <p className="text-gray-400 text-sm">
                      Last seen: {player.lastSeen || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">Offline</span>
                </div>
              </div>
            ))}
            {offlinePlayers.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No recent players
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-100">
              Integration Required
            </h3>
            <div className="mt-2 text-sm text-blue-200">
              <p>
                This component requires a custom Fabric mod to provide real-time player data. 
                Currently showing mock data for demonstration purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};