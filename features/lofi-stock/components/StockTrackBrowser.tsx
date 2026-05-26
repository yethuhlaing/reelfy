'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import { cn } from '@/shared/lib/utils'
import {
  fetchBrowseTracksAction,
  fetchSearchTracksAction,
} from '@/features/lofi-stock/actions/browse-tracks'
import { BROWSE_TABS, CURATED_CATEGORIES, type BrowseTab } from '@/features/lofi-stock/lib/constants'
import { StockTrackList } from './StockTrackList'
import { StockTrackListSkeleton } from './StockTrackCardSkeleton'
import { StockTrackPagination } from './StockTrackPagination'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function StockTrackBrowser({
  isTrackSelected,
  onToggleTrack,
  disabled,
  enabled = true,
}: {
  isTrackSelected: (id: string) => boolean
  onToggleTrack: (track: FreetouseTrack) => void
  disabled?: boolean
  /** When false, skips initial fetch (e.g. user left the music step). */
  enabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<BrowseTab>('popular')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [tracks, setTracks] = useState<FreetouseTrack[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchPage, setSearchPage] = useState(1)
  const [searchTracks, setSearchTracks] = useState<FreetouseTrack[]>([])
  const [searchHasMore, setSearchHasMore] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)

  const isInSearchMode = !!debouncedSearch.trim()
  const displayTracks = isInSearchMode ? searchTracks : tracks
  const displayPage = isInSearchMode ? searchPage : page
  const displayHasMore = isInSearchMode ? searchHasMore : hasMore
  const loading = showSkeleton || isPending

  const scrollListToTop = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const loadBrowse = useCallback((tab: BrowseTab, categoryId: string | null, nextPage: number) => {
    setShowSkeleton(true)
    startTransition(() => {
      void fetchBrowseTracksAction({ tab, categoryId, page: nextPage })
        .then((result) => {
          setTracks(result.tracks)
          setHasMore(result.hasMore)
          setPage(result.page)
          setShowSkeleton(false)
        })
        .catch((err) => {
          setShowSkeleton(false)
          toast.error(toUserErrorMessage(err, 'Could not load tracks.'))
        })
    })
  }, [])

  const loadSearch = useCallback((query: string, nextPage: number) => {
    if (!query.trim()) {
      setSearchTracks([])
      setSearchHasMore(false)
      setSearchPage(1)
      setShowSkeleton(false)
      return
    }
    setShowSkeleton(true)
    startTransition(() => {
      void fetchSearchTracksAction({ query: query.trim(), page: nextPage })
        .then((result) => {
          setSearchTracks(result.tracks)
          setSearchHasMore(result.hasMore)
          setSearchPage(result.page)
          setShowSkeleton(false)
        })
        .catch((err) => {
          setShowSkeleton(false)
          toast.error(toUserErrorMessage(err, 'Could not search for tracks.'))
          setSearchTracks([])
        })
    })
  }, [])

  useEffect(() => {
    if (!enabled || isInSearchMode) return
    loadBrowse(activeTab, activeCategory, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isInSearchMode, activeTab, activeCategory, page])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!enabled || !isInSearchMode) return
    loadSearch(debouncedSearch, searchPage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedSearch, searchPage])

  const handleTabChange = (tab: BrowseTab) => {
    if (tab === activeTab || disabled) return
    setShowSkeleton(true)
    scrollListToTop()
    setActiveTab(tab)
    setPage(1)
  }

  const handleCategoryChange = (categoryId: string | null) => {
    if (categoryId === activeCategory || disabled) return
    setShowSkeleton(true)
    scrollListToTop()
    setActiveCategory(categoryId)
    setPage(1)
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
    if (!value.trim()) {
      setDebouncedSearch('')
      setSearchTracks([])
      setSearchHasMore(false)
      setSearchPage(1)
      setShowSkeleton(false)
      return
    }
    setShowSkeleton(true)
    scrollListToTop()
    setSearchPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    scrollListToTop()
    if (isInSearchMode) {
      setSearchPage(nextPage)
    } else {
      setPage(nextPage)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6 lg:pb-0">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-11 pr-10 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
          placeholder="Search lofi, chill, piano…"
          value={searchInput}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          disabled={disabled}
        />
        {searchInput && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
            onClick={() => handleSearchInputChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!isInSearchMode && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-0.5 sm:w-auto"
            role="tablist"
            aria-label="Browse sort"
          >
            {BROWSE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-[0.78rem] font-medium transition-all duration-200 sm:flex-none sm:px-4',
                  activeTab === tab.value
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--text)]',
                  (disabled || loading) && activeTab !== tab.value && 'opacity-60',
                )}
                onClick={() => handleTabChange(tab.value)}
                disabled={disabled}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[140px] sm:w-[160px]">
            <SlidersHorizontal
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <select
              className="w-full cursor-pointer appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-8 text-[0.78rem] text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
              value={activeCategory ?? ''}
              onChange={(e) => handleCategoryChange(e.target.value || null)}
              disabled={disabled || loading}
              aria-label="Filter by genre"
            >
              <option value="">All genres</option>
              {CURATED_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isInSearchMode && (
        <p className="text-[0.75rem] text-[var(--muted)]">
          Results for &quot;{debouncedSearch}&quot;
        </p>
      )}

      <div
        ref={listRef}
        className={cn(
          'min-h-[200px] transition-opacity duration-300 ease-out',
          loading && displayTracks.length > 0 ? 'opacity-50' : 'opacity-100',
        )}
      >
        {loading && <StockTrackListSkeleton count={6} />}

        {!loading && displayTracks.length > 0 && (
          <StockTrackList
            tracks={displayTracks}
            isTrackSelected={isTrackSelected}
            onToggleTrack={onToggleTrack}
          />
        )}

        {!loading && displayTracks.length === 0 && isInSearchMode && debouncedSearch && (
          <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-[0.85rem] text-[var(--muted)]">
            No tracks found. Try &quot;lofi&quot;, &quot;chill&quot;, or &quot;piano&quot;.
          </div>
        )}

        {!loading && displayTracks.length === 0 && !isInSearchMode && (
          <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-[0.85rem] text-[var(--muted)]">
            No tracks in this category. Try another genre or tab.
          </div>
        )}
      </div>

      {!loading && displayTracks.length > 0 && (
        <StockTrackPagination
          page={displayPage}
          hasMore={displayHasMore}
          hasPrev={displayPage > 1}
          onPageChange={handlePageChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}
