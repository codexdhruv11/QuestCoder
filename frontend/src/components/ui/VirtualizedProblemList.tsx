import React, { useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import ProblemCard from './ProblemCard';
import { Badge } from './badge';
import { Target } from 'lucide-react';
import { FlatProblemItem } from '../../types';

interface VirtualizedProblemListProps {
  problems: FlatProblemItem[];
  onToggleProblem: (patternId: string, problemId: string) => void;
  optimisticUpdates: Map<string, boolean>;
  height: number;
  problemItemSize?: number;
}

interface ItemRendererProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: FlatProblemItem[];
    onToggleProblem: (patternId: string, problemId: string) => void;
    optimisticUpdates: Map<string, boolean>;
  };
}

const ItemRenderer: React.FC<ItemRendererProps> = ({ index, style, data }) => {
  const { items, onToggleProblem, optimisticUpdates } = data;
  const item = items[index];

  if (!item) {
    return <div style={style} />;
  }

  if (item.type === 'header') {
    return (
      <div style={style} className="px-4">
        <div className="flex items-center gap-2 h-full border-b border-gray-200 dark:border-gray-700">
          <Target size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {item.subPatternName}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {item.solvedCount}/{item.totalCount} solved
          </Badge>
        </div>
      </div>
    );
  }

  if (item.type === 'problem' && item.problem && item.patternId) {
    return (
      <div style={style} className="px-4 py-1">
        <div className="h-full flex items-center">
          <ProblemCard
            problem={item.problem}
            onToggle={() => onToggleProblem(item.patternId!, item.problem!.id)}
            isOptimistic={optimisticUpdates.has(`${item.patternId}-${item.problem.id}`)}
            showMetadata={true}
          />
        </div>
      </div>
    );
  }

  return <div style={style} />;
};

const VirtualizedProblemList: React.FC<VirtualizedProblemListProps> = ({
  problems,
  onToggleProblem,
  optimisticUpdates,
  height,
  problemItemSize = 96
}) => {
  const listRef = useRef<List>(null);
  const scrollPositionRef = useRef<number>(0);
  const filterKey = useRef<string>('');

  // Use consistent item size for all items (headers and problems)
  const ITEM_SIZE = problemItemSize;

  // Save scroll position with filter context
  const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
    scrollPositionRef.current = scrollOffset;
    // Save to sessionStorage with current filter context
    if (filterKey.current) {
      sessionStorage.setItem(`scroll-${filterKey.current}`, scrollOffset.toString());
    }
  };

  // Generate filter key from problems
  useEffect(() => {
    // Create a simple key from the first few problems to identify the filter state
    const key = problems.slice(0, 3).map(p => p.key).join('-');
    filterKey.current = key;
    
    // Restore scroll position from sessionStorage
    const savedPosition = sessionStorage.getItem(`scroll-${key}`);
    if (savedPosition && listRef.current) {
      const position = parseInt(savedPosition, 10);
      listRef.current.scrollTo(position);
      scrollPositionRef.current = position;
    }
  }, [problems]);

  const itemData = {
    items: problems,
    onToggleProblem,
    optimisticUpdates
  };

  try {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <List
          ref={listRef}
          height={height}
          width="100%"
          itemCount={problems.length}
          itemSize={ITEM_SIZE}
          itemData={itemData}
          onScroll={handleScroll}
          className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        >
          {ItemRenderer}
        </List>
      </div>
    );
  } catch (error) {
    console.error('Virtualization failed, falling back to regular list:', error);
    
    // Fallback to regular rendering
    return (
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {problems.map((item, index) => (
          <div key={item.key}>
            <ItemRenderer
              index={index}
              style={{}}
              data={itemData}
            />
          </div>
        ))}
      </div>
    );
  }
};

export default React.memo(VirtualizedProblemList);