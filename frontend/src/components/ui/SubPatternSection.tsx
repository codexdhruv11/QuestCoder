import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Target, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from './card';
import { Progress } from './progress';
import { Button } from './button';
import { Badge } from './badge';
import ProblemCard from './ProblemCard';
import { SubPattern } from '../../types';
import { calculateCompletionPercentage, formatProblemCount } from '../../lib/utils';

interface SubPatternSectionProps {
  subPattern: SubPattern;
  patternId: string;
  onToggleProblem: (problemId: string) => void;
  onToggleProblemImmediate?: (problemId: string) => void;
  optimisticUpdates: Map<string, boolean>;
  defaultExpanded?: boolean;
}

const SubPatternSection: React.FC<SubPatternSectionProps> = ({
  subPattern,
  patternId,
  onToggleProblem,
  onToggleProblemImmediate,
  optimisticUpdates,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Calculate progress
  const solvedCount = subPattern.problems.filter(p => p.solved).length;
  const totalCount = subPattern.problems.length;
  const completionPercentage = calculateCompletionPercentage(solvedCount, totalCount);
  const isCompleted = solvedCount === totalCount;

  // Persist expanded state in localStorage
  const storageKey = `subpattern-${patternId}-${subPattern.name.replace(/\s+/g, '-').toLowerCase()}`;
  
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setIsExpanded(JSON.parse(saved));
    }
  }, [storageKey]);

  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem(storageKey, JSON.stringify(newExpanded));
  };

  const handleMarkAllSolved = () => {
    const toggleFn = onToggleProblemImmediate || onToggleProblem;
    subPattern.problems.forEach(problem => {
      if (!problem.solved) {
        toggleFn(problem.id);
      }
    });
  };

  const handleMarkAllUnsolved = () => {
    const toggleFn = onToggleProblemImmediate || onToggleProblem;
    subPattern.problems.forEach(problem => {
      if (problem.solved) {
        toggleFn(problem.id);
      }
    });
  };

  return (
    <Card className="mb-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpanded}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} />
              </motion.div>
            </Button>

            <div className="flex items-center gap-2">
              <Target size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {subPattern.name}
              </h3>
              {isCompleted && (
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
              )}
            </div>

            <Badge variant="secondary" className="text-xs">
              {formatProblemCount(solvedCount, totalCount)}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Mini Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-2">
                <Progress 
                  value={completionPercentage} 
                  className="h-2"
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[3rem]">
                {Math.round(completionPercentage)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="pt-0">
              {/* Batch Operations */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllSolved}
                  disabled={isCompleted}
                  className="text-xs"
                >
                  Mark All Solved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllUnsolved}
                  disabled={solvedCount === 0}
                  className="text-xs"
                >
                  Mark All Unsolved
                </Button>
              </div>

              {/* Problem Cards */}
              <div className="space-y-3">
                {subPattern.problems.map((problem) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    onToggle={() => onToggleProblem(problem.id)}
                    isOptimistic={optimisticUpdates.has(`${patternId}-${problem.id}`)}
                    showMetadata={true}
                  />
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default React.memo(SubPatternSection);