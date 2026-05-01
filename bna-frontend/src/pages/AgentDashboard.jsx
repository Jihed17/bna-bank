import React, { useState } from 'react'

import AgentCalendar from '../clients/agent/AgentCalendar'
import PendingQueue from '../clients/agent/PendingQueue'
import { useCurrentUser } from '../store/hooks'

export default function AgentDashboard() {
  const user = useCurrentUser()
  const [view, setView] = useState('queue')

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour, {user?.first_name} 👋
          </h1>
          <p className="text-gray-500 mt-1">Tableau de bord agent</p>
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'queue', label: "📋 File d'attente" },
            { id: 'calendar', label: '📅 Planning' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${view === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'queue' && <PendingQueue />}
      {view === 'calendar' && <AgentCalendar />}
    </div>
  )
}
