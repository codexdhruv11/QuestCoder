import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/8bit/card';
import { Button } from '@/components/ui/8bit/button';
import { Badge } from '@/components/ui/8bit/badge';
import { Progress } from '@/components/ui/8bit/progress';
import { Challenge } from '@/types';
import { Calendar, Users, Target, Trophy, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

interface ChallengeCardProps {
  challenge: Challenge;
  currentUserId?: string;
  onJoin?: (challengeId: string) => Promise<void>;
  onLeave?: (challengeId: string) => Promise<void>;
  className?: string;
}

export function ChallengeCard({ challenge, currentUserId, onJoin, onLeave, className }: ChallengeCardProps) {
  const [loading, setLoading] = useState(false);

  const isParticipant = challenge.participants.some(p => p.userId === currentUserId);
  const participant = challenge.participants.find(p => p.userId === currentUserId);
  const isCreator = challenge.creatorId === currentUserId;

  // const now = new Date();
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  
  // const isUpcoming = isFuture(startDate);
  const isActive = !isPast(endDate) && !isFuture(startDate);
  const isCompleted = isPast(endDate);

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge variant="secondary">Completed</Badge>;
    } else if (isActive) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
    } else {
      return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  const getTimeRemaining = () => {
    if (isCompleted) {
      return `Ended ${formatDistanceToNow(endDate)} ago`;
    } else if (isActive) {
      return `Ends ${formatDistanceToNow(endDate)}`;
    } else {
      return `Starts ${formatDistanceToNow(startDate)}`;
    }
  };

  const calculateProgress = () => {
    if (!participant || !challenge.targetPatterns) return 0;
    return Math.round((participant.progress.problemsSolved / challenge.targetPatterns.length) * 100);
  };

  const handleJoinLeave = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      if (isParticipant) {
        await onLeave?.(challenge._id);
      } else {
        await onJoin?.(challenge._id);
      }
    } catch (error) {
      console.error('Error joining/leaving challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {challenge.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {getStatusBadge()}
            {challenge.difficultyFilter && (
              <Badge variant="outline" className={`text-xs ${getDifficultyColor(challenge.difficultyFilter)}`}>
                {challenge.difficultyFilter}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {challenge.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Time Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{getTimeRemaining()}</span>
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{challenge.participants.length} participant{challenge.participants.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Target Patterns */}
        {challenge.targetPatterns && challenge.targetPatterns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Target Patterns ({challenge.targetPatterns.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {challenge.targetPatterns.slice(0, 3).map((pattern, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {pattern}
                </Badge>
              ))}
              {challenge.targetPatterns.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{challenge.targetPatterns.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Progress (for participants) */}
        {isParticipant && participant && challenge.targetPatterns && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Progress</span>
              <span className="font-medium">{participant.progress.problemsSolved}/{challenge.targetPatterns.length}</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        )}

        {/* Rewards */}
        {challenge.rewards && challenge.rewards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span>Rewards</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {challenge.rewards.slice(0, 3).map((reward, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {reward.type === 'xp' ? `${reward.value} XP` : reward.value}
                  {reward.position && ` (${reward.position.replace('_', ' ')})`}
                </Badge>
              ))}
              {challenge.rewards.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{challenge.rewards.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        {currentUserId && (
          <div className="flex gap-2 w-full">
            {!isParticipant && !isCompleted ? (
              <Button
                onClick={handleJoinLeave}
                disabled={loading || isCompleted}
                className="w-full"
              >
                {loading ? 'Joining...' : 'Join Challenge'}
              </Button>
            ) : isParticipant && !isCreator ? (
              <Button
                variant="outline"
                onClick={handleJoinLeave}
                disabled={loading || isCompleted}
                className="w-full"
              >
                {loading ? 'Leaving...' : 'Leave Challenge'}
              </Button>
            ) : isCreator ? (
              <Button variant="outline" className="w-full" disabled>
                Creator
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Completed
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
