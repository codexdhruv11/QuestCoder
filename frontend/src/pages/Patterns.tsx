import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { SearchInput } from '../components/ui/SearchInput';
import { FilterDropdown } from '../components/ui/FilterDropdown';
import { PaginationControls } from '../components/ui/PaginationControls';
import ProblemCard from '../components/ui/ProblemCard';
import ProblemListErrorBoundary from '../components/ProblemListErrorBoundary';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { Pattern, Problem, PatternsListResponse } from '../types';
import { patternsAPI } from '../lib/api';
import { 
  flattenPatternsToProblems,
  debounceToggle,
  getOptimisticKey,
  animationVariants
} from '../lib/utils';
import { useSocket } from '../contexts/SocketContext';

const Patterns: React.FC = () => {
  // State management
  const [allPatterns, setAllPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, boolean>>(new Map());
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const { toast } = useToast();
  const socket = useSocket();

  // Constants
  const PROBLEMS_PER_PAGE = 20;

  // Flatten patterns to problems and apply filters
  const flattenedProblems = useMemo(() => {
    return flattenPatternsToProblems(allPatterns);
  }, [allPatterns]);

  // Derive filter options dynamically from the data
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const platforms = new Set<string>();
    const difficulties = new Set<string>();
    
    flattenedProblems.forEach(problem => {
      if (problem.category) categories.add(problem.category);
      if (problem.platform) platforms.add(problem.platform);
      if (problem.difficulty) difficulties.add(problem.difficulty);
    });
    
    // Convert to sorted arrays and add 'All' option
    const categoryOptions = [{ value: 'all', label: 'All Categories' }];
    Array.from(categories).sort().forEach(cat => {
      categoryOptions.push({ value: cat, label: cat });
    });
    
    const platformOptions = [{ value: 'all', label: 'All Platforms' }];
    Array.from(platforms).sort().forEach(plat => {
      platformOptions.push({ value: plat, label: plat });
    });
    
    const difficultyOptions = [{ value: 'all', label: 'All Difficulties' }];
    // Sort difficulties in specific order
    const difficultyOrder = ['Easy', 'Medium', 'Hard'];
    Array.from(difficulties)
      .sort((a, b) => {
        const aIndex = difficultyOrder.indexOf(a);
        const bIndex = difficultyOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      })
      .forEach(diff => {
        difficultyOptions.push({ value: diff, label: diff });
      });
    
    return { categoryOptions, platformOptions, difficultyOptions };
  }, [flattenedProblems]);

  // Apply filters to problems
  const filteredProblems = useMemo(() => {
    return flattenedProblems.filter(problem => {
      const matchesSearch = !searchTerm || 
        problem.problemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.patternName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.subPatternName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        problem.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesPlatform = selectedPlatform === 'all' || 
        problem.platform?.toLowerCase() === selectedPlatform.toLowerCase();
      const matchesDifficulty = selectedDifficulty === 'all' || 
        problem.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
      
      return matchesSearch && matchesCategory && matchesPlatform && matchesDifficulty;
    });
  }, [flattenedProblems, searchTerm, selectedCategory, selectedPlatform, selectedDifficulty]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROBLEMS_PER_PAGE;
  const endIndex = startIndex + PROBLEMS_PER_PAGE;
  const currentProblems = filteredProblems.slice(startIndex, endIndex);

  // Fetch all patterns once
  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit: 500, // Get all patterns at once
        offset: 0,
      };
      
      const response: PatternsListResponse = await patternsAPI.getPatterns(params);

      if (response.success && response.data) {
        setAllPatterns(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch patterns');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patterns');
      // Toast will be shown in the error UI, no need to include it in fetchPatterns
    } finally {
      setLoading(false);
    }
  }, []); // Remove toast dependency - error handling is done via error state

  // Initial fetch only once
  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Show toast for errors when error state changes
  useEffect(() => {
    if (error && !loading) {
      toast({
        title: "Error",
        description: "Failed to load patterns. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, loading, toast]);

  // Socket integration for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handlePatternUpdate = (data: { patternId: string; problemId: string; solved: boolean }) => {
      setAllPatterns(prev => prev.map(pattern => {
        if (pattern.id === data.patternId) {
          return {
            ...pattern,
            subPatterns: pattern.subPatterns.map(subPattern => ({
              ...subPattern,
              problems: subPattern.problems.map(problem => 
                problem.id === data.problemId 
                  ? { ...problem, solved: data.solved }
                  : problem
              )
            }))
          };
        }
        return pattern;
      }));

      // Clear optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(getOptimisticKey(data.patternId, data.problemId));
        return newMap;
      });
    };

    const unsubscribe = socket.subscribe('pattern:problem:updated', handlePatternUpdate);
    
    return () => {
      unsubscribe();
    };
  }, [socket]);

  // Toggle problem function for individual problems
  const toggleProblemImmediate = useCallback(async (problem: Problem) => {
    // Guard against undefined patternId
    if (!problem.patternId) {
      toast({
        title: "Error",
        description: "Cannot toggle problem: Pattern information is missing. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const optimisticKey = getOptimisticKey(problem.patternId, problem.id);
    const newSolvedState = !problem.solved;

    // Apply optimistic update
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(optimisticKey, newSolvedState);
      return newMap;
    });

    try {
      const response = await patternsAPI.toggleProblem(problem.patternId, problem.id);
      
      if (response.success) {
        // Update the actual state
        setAllPatterns(prev => prev.map(pattern => {
          if (pattern.id === problem.patternId) {
            return {
              ...pattern,
              subPatterns: pattern.subPatterns.map(subPattern => ({
                ...subPattern,
                problems: subPattern.problems.map(p => 
                  p.id === problem.id 
                    ? { ...p, solved: newSolvedState }
                    : p
                )
              }))
            };
          }
          return pattern;
        }));

        toast({
          title: "Success",
          description: `Problem ${newSolvedState ? 'completed' : 'marked as unsolved'}!`,
        });
      } else {
        throw new Error(response.error || 'Failed to update problem');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update problem status",
        variant: "destructive",
      });
    } finally {
      // Clear optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(optimisticKey);
        return newMap;
      });
    }
  }, [toast]);

  // Debounced toggle problem handler for per-card toggles
  const handleToggleProblemDebounced = useMemo(
    () => debounceToggle(toggleProblemImmediate, 300),
    [toggleProblemImmediate]
  );

  // Filter handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((type: string, value: string) => {
    switch (type) {
      case 'category':
        setSelectedCategory(value);
        break;
      case 'platform':
        setSelectedPlatform(value);
        break;
      case 'difficulty':
        setSelectedDifficulty(value);
        break;
    }
    setCurrentPage(1);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(PROBLEMS_PER_PAGE)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );

  // Error state
  if (error && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load patterns</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchPatterns} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-xl font-semibold">
                    Coding Patterns
                  </CardTitle>
                  <CardDescription>
                    Master algorithmic patterns through structured practice
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {filteredProblems.length} problems
                </div>
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search patterns and problems..."
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <FilterDropdown
                  label="Problem Type"
                  value={selectedCategory}
                  onChange={(value: string) => handleFilterChange('category', value)}
                  options={filterOptions.categoryOptions}
                />
                <FilterDropdown
                  label="Platform"
                  value={selectedPlatform}
                  onChange={(value: string) => handleFilterChange('platform', value)}
                  options={filterOptions.platformOptions}
                />
                <FilterDropdown
                  label="Difficulty"
                  value={selectedDifficulty}
                  onChange={(value: string) => handleFilterChange('difficulty', value)}
                  options={filterOptions.difficultyOptions}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Problems List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSkeleton />
          </motion.div>
        ) : (
          <ProblemListErrorBoundary>
            <motion.div
              key="problems"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Problems Grid */}
              <div className="grid gap-4">
                {currentProblems.map((problem, index) => {
                  const optimisticKey = getOptimisticKey(problem.patternId || '', problem.id);
                  const isOptimistic = optimisticUpdates.has(optimisticKey);
                  
                  return (
                    <motion.div
                      key={`${problem.patternId}-${problem.id}`}
                      variants={animationVariants.fadeIn}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProblemCard
                        problem={problem}
                        onToggle={() => handleToggleProblemDebounced(problem)}
                        isOptimistic={isOptimistic}
                        showMetadata={true}
                        showPatternInfo={true}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Empty State */}
              {currentProblems.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No problems found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setSelectedPlatform('all');
                      setSelectedDifficulty('all');
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </ProblemListErrorBoundary>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {!loading && filteredProblems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showResultsInfo={true}
            totalItems={filteredProblems.length}
            itemsPerPage={PROBLEMS_PER_PAGE}
          />
        </motion.div>
      )}
    </div>
  );
};

export default Patterns;