import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChallengeCard } from '@/components/community/ChallengeCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket, useSocketSubscription } from '@/hooks/useSocket';
import { communityAPI } from '@/lib/api';
import { Challenge } from '@/types';
import { 
  Search, 
  Filter, 
  Plus, 
  Trophy, 
  Calendar, 
  Users,
  Zap,
  Target
} from 'lucide-react';

type ChallengeFilter = 'all' | 'active' | 'upcoming' | 'completed' | 'joined';

export default function Challenges() {
  const { user } = useAuth();
  const { joinChallenge, leaveChallenge } = useSocket();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load challenges
  useEffect(() => {
    fetchChallenges();
  }, [filter]);

  // Join challenge rooms for visible challenges
  useEffect(() => {
    // Join rooms for all visible challenges
    challenges.forEach(challenge => {
      joinChallenge(challenge._id);
    });

    // Cleanup: leave all challenge rooms on unmount or when challenges change
    return () => {
      challenges.forEach(challenge => {
        leaveChallenge(challenge._id);
      });
    };
  }, [challenges, joinChallenge, leaveChallenge]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await communityAPI.getChallenges({
        status: filter === 'all' ? undefined : filter,
        search: searchQuery || undefined,
      });
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time challenge updates - single subscription
  useSocketSubscription('challenge_update', (data: { 
    challengeId: string;
    update: {
      type: 'participant_joined' | 'participant_left' | 'progress_update' | 'challenge_completed' | 'leaderboard_update';
      userId?: string;
      username?: string;
      data?: any;
      timestamp: string;
    }
  }) => {
    setChallenges(prev => 
      prev.map(challenge => {
        if (challenge._id === data.challengeId) {
          switch (data.update.type) {
            case 'participant_joined':
              if (data.update.userId) {
                return {
                  ...challenge,
                  participants: [
                    ...challenge.participants,
                    { 
                      userId: data.update.userId, 
                      progress: {
                        problemsSolved: 0,
                        patternsCompleted: [],
                        lastActivity: undefined
                      },
                      joinedAt: data.update.timestamp 
                    }
                  ]
                };
              }
              break;
            case 'participant_left':
              if (data.update.userId) {
                return {
                  ...challenge,
                  participants: challenge.participants.filter(p => p.userId !== data.update.userId)
                };
              }
              break;
            case 'progress_update':
              if (data.update.data && data.update.userId) {
                // Update the specific participant's progress
                return {
                  ...challenge,
                  participants: challenge.participants.map(p => 
                    p.userId === data.update.userId 
                      ? { ...p, progress: { ...p.progress, ...data.update.data } }
                      : p
                  )
                };
              }
              break;
            case 'challenge_completed':
              // Handle challenge completion
              return { ...challenge, status: 'completed' as const };
            case 'leaderboard_update':
              // Handle leaderboard updates if needed
              return challenge;
            default:
              return challenge;
          }
        }
        return challenge;
      })
    );
  });

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await communityAPI.joinChallenge(challengeId);
      await fetchChallenges(); // Refresh challenges
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    try {
      await communityAPI.leaveChallenge(challengeId);
      await fetchChallenges(); // Refresh challenges
    } catch (error) {
      console.error('Error leaving challenge:', error);
    }
  };

  const handleSearch = () => {
    fetchChallenges();
  };

  // Filter challenges based on current filter
  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    const isParticipant = challenge.participants.some(p => p.userId === user?.id);

    switch (filter) {
      case 'active':
        return startDate <= now && endDate >= now;
      case 'upcoming':
        return startDate > now;
      case 'completed':
        return endDate < now;
      case 'joined':
        return isParticipant;
      default:
        return true;
    }
  });

  // Calculate statistics
  const stats = {
    total: challenges.length,
    active: challenges.filter(c => {
      const now = new Date();
      return new Date(c.startDate) <= now && new Date(c.endDate) >= now;
    }).length,
    joined: challenges.filter(c => 
      c.participants.some(p => p.userId === user?.id)
    ).length,
    completed: challenges.filter(c => {
      const participant = c.participants.find(p => p.userId === user?.id);
      return participant && c.targetPatterns && 
             participant.progress.problemsSolved >= c.targetPatterns.length;
    }).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Challenges</h1>
          <p className="text-muted-foreground">
            Join coding challenges to test your skills and compete with others
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Challenge
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.joined}</p>
                <p className="text-sm text-muted-foreground">Joined</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'active', 'upcoming', 'completed', 'joined'] as ChallengeFilter[]).map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterOption)}
              className="text-xs"
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Challenges Grid */}
      {filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No challenges found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {filter === 'all' 
                ? "There are no challenges available at the moment. Be the first to create one!"
                : `No ${filter} challenges found. Try adjusting your filters or search query.`
              }
            </p>
            {filter === 'all' && (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge._id}
              challenge={challenge}
              currentUserId={user?.id}
              onJoin={handleJoinChallenge}
              onLeave={handleLeaveChallenge}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredChallenges.length > 0 && filteredChallenges.length % 12 === 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={fetchChallenges}>
            Load More
          </Button>
        </div>
      )}

      {/* Create Challenge Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Challenge creation interface will be implemented here.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCreateModal(false)}>
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
