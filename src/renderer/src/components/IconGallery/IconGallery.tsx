import React, { useState } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { ICON_CATEGORIES, ICONS_BY_CATEGORY } from '../../utils/iconData';
import styles from './IconGallery.module.scss';

export const IconGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(ICON_CATEGORIES[0]);
  const selectedIconId = useWhiteboardStore((s) => s.selectedIconId);
  const { setSelectedIconId } = useWhiteboardStore();

  const icons = ICONS_BY_CATEGORY[activeCategory] ?? [];

  return (
    <div className={styles.gallery} onMouseDown={(e) => e.stopPropagation()}>
      {/* Category tabs */}
      <div className={styles.tabs}>
        {ICON_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.tab} ${activeCategory === cat ? styles.activeTab : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div className={styles.grid}>
        {icons.map((icon) => (
          <button
            key={icon.id}
            className={`${styles.iconBtn} ${selectedIconId === icon.id ? styles.activeIcon : ''}`}
            title={icon.label}
            onClick={() => setSelectedIconId(icon.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {icon.paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>
            <span>{icon.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
