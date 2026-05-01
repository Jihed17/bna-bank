import React, { Fragment, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { fr } from 'date-fns/locale'

import { useGetAgentScheduleQuery } from '../../store/services/appointmentApi'

const VIEWS = { MONTH: 'month', WEEK: 'week', DAY: 'day' }
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const STATUS_COLOR = {
  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', text: 'text-yellow-800' },
  assigned: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-800' },
  confirmed: { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', text: 'text-green-800' },
  completed: { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400', text: 'text-gray-700' },
}

const colorOf = (status) => STATUS_COLOR[status] || STATUS_COLOR.assigned

// ── Main component ──────────────────────────────────────────────────────────

export default function AgentCalendar() {
  const [view, setView] = useState(VIEWS.MONTH)
  const [cursor, setCursor] = useState(new Date())

  // Date window for the active view — passed to the API.
  let fromDt
  let toDt
  let title
  if (view === VIEWS.MONTH) {
    fromDt = startOfMonth(cursor)
    toDt = endOfMonth(cursor)
    title = format(cursor, 'MMMM yyyy', { locale: fr })
  } else if (view === VIEWS.WEEK) {
    fromDt = startOfWeek(cursor, { weekStartsOn: 1 })
    toDt = addDays(fromDt, 6)
    title = `${format(fromDt, 'd MMM', { locale: fr })} — ${format(toDt, 'd MMM yyyy', { locale: fr })}`
  } else {
    fromDt = startOfDay(cursor)
    toDt = endOfDay(cursor)
    title = format(cursor, 'EEEE d MMMM yyyy', { locale: fr })
  }

  const { data: calendar = {}, isLoading } = useGetAgentScheduleQuery({
    from_dt: fromDt.toISOString(),
    to_dt: toDt.toISOString(),
  })

  const goPrev = () => {
    if (view === VIEWS.MONTH) setCursor((c) => subMonths(c, 1))
    else if (view === VIEWS.WEEK) setCursor((c) => subWeeks(c, 1))
    else setCursor((c) => addDays(c, -1))
  }
  const goNext = () => {
    if (view === VIEWS.MONTH) setCursor((c) => addMonths(c, 1))
    else if (view === VIEWS.WEEK) setCursor((c) => addWeeks(c, 1))
    else setCursor((c) => addDays(c, 1))
  }
  const goToday = () => setCursor(new Date())

  const pickDay = (day) => {
    setCursor(day)
    setView(VIEWS.DAY)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
            aria-label="Précédent"
          >
            ←
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Aujourd'hui
          </button>
          <button
            onClick={goNext}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
            aria-label="Suivant"
          >
            →
          </button>
          <h3 className="ml-3 font-semibold text-gray-900 capitalize">{title}</h3>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: VIEWS.MONTH, label: 'Mois' },
            { id: VIEWS.WEEK, label: 'Semaine' },
            { id: VIEWS.DAY, label: 'Jour' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                ${view === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-2 border-b border-gray-50 text-xs text-gray-500">
        {[
          ['Assigné', 'bg-blue-500'],
          ['Confirmé', 'bg-green-500'],
          ['Effectué', 'bg-gray-400'],
        ].map(([label, dot]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Chargement du planning...</div>
      ) : view === VIEWS.MONTH ? (
        <MonthView cursor={cursor} calendar={calendar} onPickDay={pickDay} />
      ) : view === VIEWS.WEEK ? (
        <WeekView weekStart={fromDt} calendar={calendar} onPickDay={pickDay} />
      ) : (
        <DayView day={cursor} calendar={calendar} />
      )}
    </div>
  )
}

// ── Month view ──────────────────────────────────────────────────────────────

function MonthView({ cursor, calendar, onPickDay }) {
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
          <div
            key={label}
            className="text-xs text-gray-400 uppercase font-medium text-center py-1 tracking-wide"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const entries = calendar[key] || []
          const inMonth = isSameMonth(day, cursor)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={key}
              onClick={() => onPickDay(day)}
              className={`min-h-[96px] p-2 rounded-lg border text-left transition-colors
                ${inMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'}
                ${isToday ? 'border-bna-primary ring-1 ring-bna-primary/30' : 'border-gray-100'}`}
            >
              <div
                className={`text-sm font-medium mb-1
                  ${isToday ? 'text-bna-primary' : inMonth ? 'text-gray-900' : 'text-gray-300'}`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {entries.slice(0, 3).map((e) => {
                  const c = colorOf(e.status)
                  return (
                    <div
                      key={e.appointment_id}
                      className={`flex items-center gap-1 text-[10px] px-1 py-0.5 rounded ${c.bg} ${c.text} truncate`}
                    >
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="truncate">
                        {format(parseISO(e.scheduled_at), 'HH:mm')} {e.service_name}
                      </span>
                    </div>
                  )
                })}
                {entries.length > 3 && (
                  <div className="text-[10px] text-gray-400 px-1">
                    + {entries.length - 3} autre{entries.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view ───────────────────────────────────────────────────────────────

function WeekView({ weekStart, calendar, onPickDay }) {
  // Mon → Sat (Sundays are agency-closed in the SchedulingEngine).
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[760px] grid"
        style={{ gridTemplateColumns: '72px repeat(6, 1fr)' }}
      >
        {/* Header row */}
        <div className="border-b border-gray-100" />
        {days.map((d) => {
          const isToday = isSameDay(d, new Date())
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDay(d)}
              className={`text-center py-3 border-b border-l border-gray-100 transition-colors hover:bg-gray-50
                ${isToday ? 'bg-bna-light' : 'bg-gray-50/50'}`}
            >
              <div className="text-[10px] text-gray-400 uppercase">
                {format(d, 'EEE', { locale: fr })}
              </div>
              <div
                className={`text-base font-bold ${isToday ? 'text-bna-primary' : 'text-gray-700'}`}
              >
                {format(d, 'd')}
              </div>
            </button>
          )
        })}

        {/* Hour rows */}
        {HOURS.map((h) => (
          <Fragment key={h}>
            <div className="text-[11px] text-gray-400 text-right pr-2 py-2 border-b border-gray-50">
              {String(h).padStart(2, '0')}:00
            </div>
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd')
              const entries = (calendar[key] || []).filter(
                (e) => getHours(parseISO(e.scheduled_at)) === h,
              )
              return (
                <div
                  key={`${d.toISOString()}-${h}`}
                  className="border-l border-b border-gray-50 p-1 min-h-[60px]"
                >
                  {entries.map((e) => {
                    const c = colorOf(e.status)
                    return (
                      <div
                        key={e.appointment_id}
                        className={`text-[10px] px-1.5 py-1 rounded ${c.bg} ${c.border} border ${c.text} mb-1`}
                      >
                        <div className="font-medium leading-tight">
                          {format(parseISO(e.scheduled_at), 'HH:mm')} · {e.service_name}
                        </div>
                        <div className="truncate opacity-75">{e.client_name}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Day view ────────────────────────────────────────────────────────────────

function DayView({ day, calendar }) {
  const key = format(day, 'yyyy-MM-dd')
  const dayEntries = calendar[key] || []
  const totalCount = dayEntries.length

  return (
    <div className="p-6">
      <div className="text-xs text-gray-500 mb-4">
        {totalCount === 0
          ? 'Aucun rendez-vous ce jour.'
          : `${totalCount} rendez-vous`}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '72px 1fr' }}>
        {HOURS.map((h) => {
          const entries = dayEntries
            .filter((e) => getHours(parseISO(e.scheduled_at)) === h)
            .sort(
              (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at),
            )

          return (
            <Fragment key={h}>
              <div className="text-xs text-gray-400 text-right pr-3 py-3 border-t border-gray-100">
                {String(h).padStart(2, '0')}:00
              </div>
              <div className="border-t border-gray-100 py-2 min-h-[64px] space-y-2">
                {entries.map((e) => {
                  const c = colorOf(e.status)
                  return (
                    <div
                      key={e.appointment_id}
                      className={`px-3 py-2 rounded-lg ${c.bg} ${c.border} border`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${c.text}`}>
                          {format(parseISO(e.scheduled_at), 'HH:mm')} ·{' '}
                          {e.service_name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${c.text} ${c.bg} border ${c.border}`}
                        >
                          {e.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {e.client_name} · {e.agency_name}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
