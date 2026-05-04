import React from 'react'

/**
 * Light client-side search bar. The parent owns the value (controlled
 * input) so it can run the actual filtering against whatever it just
 * fetched from RTK Query — no debouncing needed since it's in-memory.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-bna-primary focus:ring-bna-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )
}

/**
 * Helper: case-insensitive substring match against any of the provided
 * fields. Use in `.filter()` — empty needle returns true (no filtering).
 */
export function matchesQuery(needle, ...haystacks) {
  const n = (needle || '').trim().toLowerCase()
  if (!n) return true
  return haystacks.some(
    (h) => typeof h === 'string' && h.toLowerCase().includes(n),
  )
}
