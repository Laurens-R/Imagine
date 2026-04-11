import React, { useState } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { EMOJI_CATEGORIES, EMOJIS_BY_CATEGORY } from '../../utils/emojiData';
import styles from './EmojiGallery.module.scss';

export const EmojiGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(EMOJI_CATEGORIES[0]);
  const selectedEmoji = useWhiteboardStore((s) => s.selectedEmoji);
  const { setSelectedEmoji } = useWhiteboardStore();

  const emojis = EMOJIS_BY_CATEGORY[activeCategory] ?? [];

  return (
    <div className={styles.gallery} onMouseDown={(e) => e.stopPropagation()}>
      {/* Category tabs */}
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

      {/* Emoji grid */}
      <div className={styles.grid}>
        {emojis.map((def) => (
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
