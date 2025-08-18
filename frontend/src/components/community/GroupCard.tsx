import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyGroup } from '@/types';
import { Users, Target, Crown, Shield, User } from 'lucide-react';

interface GroupCardProps {
  group: StudyGroup;
  currentUserId?: string;
  onJoin?: (groupId: string) => Promise<void>;
  onLeave?: (groupId: string) => Promise<void>;
  className?: string;
}

export function GroupCard({ group, currentUserId, onJoin, onLeave, className }: GroupCardProps) {
  const [loading, setLoading] = useState(false);

  const isOwner = group.ownerId === currentUserId;
  const isMember = group.members.some(member => member.userId === currentUserId);
  const memberRole = group.members.find(member => member.userId === currentUserId)?.role;

  const handleJoinLeave = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      if (isMember) {
        await onLeave?.(group._id);
      } else {
        await onJoin?.(group._id);
      }
    } catch (error) {
      console.error('Error joining/leaving group:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {group.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            {group.isPrivate && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
            {isMember && (
              <Badge variant="outline" className={`text-xs ${getRoleColor(memberRole || 'member')}`}>
                <span className="flex items-center gap-1">
                  {getRoleIcon(memberRole || 'member')}
                  {memberRole}
                </span>
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {group.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Member Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Target Patterns */}
        {group.targetPatterns && group.targetPatterns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Target Patterns ({group.targetPatterns.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {group.targetPatterns.slice(0, 3).map((pattern, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {pattern}
                </Badge>
              ))}
              {group.targetPatterns.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{group.targetPatterns.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Member Avatars */}
        {group.members.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Members</div>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map((member, index) => (
                  <div
                    key={member.userId}
                    className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-background"
                    title={`Member ${index + 1}`}
                  >
                    {(index + 1).toString()}
                  </div>
                ))}
              </div>
              {group.members.length > 5 && (
                <span className="ml-3 text-sm text-muted-foreground">
                  +{group.members.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        {currentUserId && (
          <div className="flex gap-2 w-full">
            {!isMember ? (
              <Button
                onClick={handleJoinLeave}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Joining...' : 'Join Group'}
              </Button>
            ) : !isOwner ? (
              <Button
                variant="outline"
                onClick={handleJoinLeave}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Leaving...' : 'Leave Group'}
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Owner
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
