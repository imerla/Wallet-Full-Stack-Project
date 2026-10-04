import { useState, useEffect, useCallback, useRef } from 'react';
import { searchUsers } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import type { UserSearchResult } from '../types/user';

interface UserSearchProps {
  onUserSelect: (user: UserSearchResult) => void;
  selectedUser?: UserSearchResult | null;
  onClearSelection?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

function UserSearch({
  onUserSelect,
  selectedUser,
  onClearSelection,
  placeholder = 'Search recipient...',
  disabled = false,
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      if (isMountedRef.current) {
        setResults([]);
        setShowResults(false);
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError('');
    try {
      const searchResults = await searchUsers(searchQuery);
      if (isMountedRef.current && !abortController.signal.aborted) {
        setResults(searchResults);
        setShowResults(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Search error:', err);
      if (isMountedRef.current) {
        setError('Unable to search users. Please try again.');
        setResults([]);
        setShowResults(false);
      }
    } finally {
      if (isMountedRef.current && !abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery && !selectedUser) {
      performSearch(debouncedQuery);
    } else {
      if (isMountedRef.current) {
        setResults([]);
        setShowResults(false);
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, selectedUser, performSearch]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    onUserSelect(user);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setQuery('');
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  if (selectedUser) {
    return (
      <div className="user-search-selected">
        <div className="selected-user-card">
          <div className="selected-user-info">
            <div className="selected-user-avatar">👤</div>
            <div className="selected-user-details">
              <div className="selected-user-name">{selectedUser.username}</div>
              <div className="selected-user-email">{selectedUser.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="selected-user-clear"
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-search-container" ref={containerRef}>
      <div className="form-group">
        <label htmlFor="user-search" className="form-label">
          {placeholder}
        </label>
        <input
          type="text"
          id="user-search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className="form-input"
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="search-loading">
            <span className="loading-spinner">Searching...</span>
          </div>
        )}
        {error && <span className="form-error">{error}</span>}
      </div>

      {showResults && !loading && (
        <div className="search-results-dropdown">
          {results.length === 0 ? (
            <div className="search-no-results">No users found</div>
          ) : (
            <div className="search-results-list">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="search-result-item"
                  onClick={() => handleUserSelect(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUserSelect(user);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${user.username}`}
                >
                  <div className="search-result-avatar">👤</div>
                  <div className="search-result-info">
                    <div className="search-result-name">{user.username}</div>
                    <div className="search-result-email">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserSearch;
