import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, ExternalLink, Play } from 'lucide-react';
import { Button } from './8bit/button';
import { Badge } from './8bit/badge';
import { Problem } from '../../types';
import { getPlatformColor, getDifficultyColor } from '../../lib/utils';
import '@/components/ui/8bit/styles/retro.css'

interface ProblemCardProps {
  problem: Problem;
  onToggle: () => void;
  isOptimistic?: boolean;
  showMetadata?: boolean;
  showPatternInfo?: boolean;
}

const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onToggle,
  isOptimistic = false,
  showMetadata = true,
  showPatternInfo = false
}) => {
  const CheckIcon = problem.solved ? CheckSquare : Square;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isOptimistic ? 0.7 : 1, 
        y: 0,
        scale: 1
      }}
      whileHover={{ 
        scale: 1.02
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      className="bg-card border border-border rounded-md p-4 shadow-sm hover:shadow-md transition-all duration-200 min-h-[88px]"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Checkbox and Problem Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className={`flex-shrink-0 transition-all duration-200 ${
              problem.solved 
                ? 'text-green-600 hover:text-green-700 drop-shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={problem.solved ? 'Mark as unsolved' : 'Mark as solved'}
          >
            <CheckIcon 
              size={20} 
              className={`${problem.solved ? 'animate-check' : ''}`}
            />
          </button>
          
          <div className="flex-1 min-w-0">
            <h4
              className={`retro font-medium truncate ${
                problem.solved
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
              title={problem.problemName}
            >
              {problem.problemName}
            </h4>
            
            {showMetadata && (
              <div className="hidden sm:flex items-center gap-2 mt-1 flex-wrap">
                <Badge font="retro" 
                  variant="outline" 
                  className={`text-xs ${getDifficultyColor(problem.difficulty)}`}
                >
                  {problem.difficulty}
                </Badge>
                
                <Badge font="retro" 
                  variant="outline" 
                  className={`text-xs ${getPlatformColor(problem.platform)}`}
                >
                  {problem.platform}
                </Badge>
                
                {showPatternInfo && problem.patternName && (
                  <Badge font="retro" 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {problem.patternName}
                  </Badge>
                )}
                
                {showPatternInfo && problem.subPatternName && (
                  <Badge font="retro" 
                    variant="secondary" 
                    className="text-xs opacity-80"
                  >
                    {problem.subPatternName}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {problem.problemUrl && (
            <Button font="retro"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(problem.problemUrl, '_blank')}
              aria-label="Open problem link"
            >
              <ExternalLink size={14} />
            </Button>
          )}
          
          {problem.videoSolutionUrl && (
            <Button font="retro"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(problem.videoSolutionUrl, '_blank')}
              aria-label="Watch video solution"
            >
              <Play size={14} />
            </Button>
          )}
          
          {isOptimistic && (
            <div className="flex items-center justify-center h-8 w-8">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-primary"></div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout - Stack vertically on small screens */}
      <div className="sm:hidden mt-3 flex flex-col gap-2">
        {showMetadata && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge font="retro" 
              variant="outline" 
              className={`text-xs ${getDifficultyColor(problem.difficulty)}`}
            >
              {problem.difficulty}
            </Badge>
            
            <Badge font="retro" 
              variant="outline" 
              className={`text-xs ${getPlatformColor(problem.platform)}`}
            >
              {problem.platform}
            </Badge>
            
            {showPatternInfo && problem.patternName && (
              <Badge font="retro" 
                variant="secondary" 
                className="text-xs"
              >
                {problem.patternName}
              </Badge>
            )}
            
            {showPatternInfo && problem.subPatternName && (
              <Badge font="retro" 
                variant="secondary" 
                className="text-xs opacity-80"
              >
                {problem.subPatternName}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {problem.problemUrl && (
            <Button font="retro"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(problem.problemUrl, '_blank')}
            >
              <ExternalLink size={14} className="mr-1" />
              Problem
            </Button>
          )}
          
          {problem.videoSolutionUrl && (
            <Button font="retro"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(problem.videoSolutionUrl, '_blank')}
            >
              <Play size={14} className="mr-1" />
              Solution
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProblemCard);