import React, { useState, useMemo } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { EMOJI_CATEGORIES, EMOJIS_BY_CATEGORY } from '../../utils/emojiData';
import styles from './EmojiGallery.module.scss';

export const EmojiGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(EMOJI_CATEGORIES[0]);
  const [search, setSearch] = useState('');
  const selectedEmoji = useWhiteboardStore((s) => s.selectedEmoji);
  const { setSelectedEmoji } = useWhiteboardStore();

  const isSearching = search.trim().length > 0;

  const displayEmojis = useMemo(() => {
    if (!isSearching) return EMOJIS_BY_CATEGORY[activeCategory] ?? [];
    const q = search.trim().toLowerCase();
    return Object.values(EMOJIS_BY_CATEGORY).flat().filter(
      (def) => def.label.toLowerCase().includes(q) || def.emoji.includes(q)
    );
  }, [activeCategory, search, isSearching]);

  return (
    <div className={styles.gallery} data-scroll-overlay onMouseDown={(e) => e.stopPropagation()}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="6.5" cy="6.5" r="4" />
          <line x1="10" y1="10" x2="14" y2="14" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search emoji…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        />
        {isSearching && (
          <button className={styles.searchClear} onClick={() => setSearch('')} title="Clear">×</button>
        )}
      </div>

      {/* Category tabs — hidden while searching */}
      {!isSearching && (
        <div className={styles.tabs}>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeCategory === cat ? styles.activeTab : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className={styles.grid}>
        {displayEmojis.length === 0 && (
          <span className={styles.noResults}>No results for "{search}"</span>
        )}
        {displayEmojis.map((def) => (
          <button
            key={def.emoji + def.label}
            className={`${styles.emojiBtn} ${selectedEmoji === def.emoji ? styles.activeEmoji : ''}`}
            title={def.label}
            onClick={() => setSelectedEmoji(def.emoji)}
          >
            <span className={styles.emojiChar}>{def.emoji}</span>
            <span className={styles.emojiLabel}>{def.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
