import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { LoadingCard } from '@/components/ui/loading';
import { ChallengeCard } from '@/components/community/ChallengeCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useSocketSubscription } from '@/hooks/useSocket';
import { communityAPI } from '@/lib/api';
import { Challenge } from '@/types';
import { 
  Search, 
  Plus, 
  Trophy, 
  Users,
  Zap,
  Target
} from 'lucide-react';

type ChallengeFilter = 'all' | 'active' | 'upcoming' | 'completed' | 'joined';

export default function Challenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { joinChallenge, leaveChallenge } = useSocket();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Challenge creation form state
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    targetPatterns: '',
    difficultyFilter: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
    isPublic: true,
    maxParticipants: '',
  });

  // Load challenges
  useEffect(() => {
    fetchChallenges();
  }, [filter]);

  // Join challenge rooms for visible challenges
  useEffect(() => {
    if (!challenges || challenges.length === 0) return;
    
    // Join rooms for all visible challenges
    const challengeIds = challenges.map(c => c._id);
    challengeIds.forEach(id => joinChallenge(id));

    // Cleanup: leave all challenge rooms on unmount
    return () => {
      challengeIds.forEach(id => leaveChallenge(id));
    };
  }, [challenges.length]); // Only re-run when number of challenges changes

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await communityAPI.getChallenges({
        status: filter === 'all' ? undefined : filter,
        search: searchQuery || undefined,
      } as any);
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

  const handleCreateChallenge = async () => {
    if (!challengeForm.title.trim() || !challengeForm.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (title and description).",
        variant: "destructive",
      });
      return;
    }

    if (challengeForm.startDate >= challengeForm.endDate) {
      toast({
        title: "Validation Error", 
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreateLoading(true);
      
      const challengeData = {
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim(),
        targetPatterns: challengeForm.targetPatterns
          .split(',')
          .map(p => p.trim())
          .filter(Boolean),
        difficultyFilter: challengeForm.difficultyFilter === 'all' ? undefined : challengeForm.difficultyFilter || undefined,
        startDate: challengeForm.startDate.toISOString(),
        endDate: challengeForm.endDate.toISOString(),
        isPublic: challengeForm.isPublic,
        maxParticipants: challengeForm.maxParticipants 
          ? parseInt(challengeForm.maxParticipants) 
          : undefined,
      };

      await communityAPI.createChallenge({
        ...challengeData,
        difficulty: challengeData.difficultyFilter || 'all'
      } as any);
      
      // Reset form
      setChallengeForm({
        title: '',
        description: '',
        targetPatterns: '',
        difficultyFilter: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPublic: true,
        maxParticipants: '',
      });
      
      setShowCreateModal(false);
      await fetchChallenges(); // Refresh challenges list

      toast({
        title: "Success",
        description: "Challenge created successfully!",
      });

    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Filter challenges based on current filter
  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    const isParticipant = challenge.participants.some(p => p.userId === (user as any)?.id);

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
      c.participants.some(p => p.userId === (user as any)?.id)
    ).length,
    completed: challenges.filter(c => {
      const participant = c.participants.find(p => p.userId === (user as any)?.id);
      return participant && c.targetPatterns && 
             participant.progress.problemsSolved >= c.targetPatterns.length;
    }).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded animate-pulse w-48"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-96"></div>
          </div>
          <div className="h-10 bg-muted rounded animate-pulse w-32"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i} />
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
              currentUserId={(user as any)?.id}
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

      {/* Create Challenge Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Challenge Title *</Label>
              <Input
                id="title"
                value={challengeForm.title}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter challenge title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={challengeForm.description}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your challenge objectives and rules..."
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="targetPatterns">Target Patterns (comma-separated)</Label>
              <Input
                id="targetPatterns"
                value={challengeForm.targetPatterns}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, targetPatterns: e.target.value }))}
                placeholder="e.g., Two Pointers, Dynamic Programming, Binary Search"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficultyFilter">Difficulty Filter</Label>
                <Select 
                  value={challengeForm.difficultyFilter} 
                  onValueChange={(value) => setChallengeForm(prev => ({ ...prev, difficultyFilter: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={challengeForm.maxParticipants}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, maxParticipants: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                  min="2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  date={challengeForm.startDate}
                  onDateChange={(date: Date | undefined) => date && setChallengeForm(prev => ({ ...prev, startDate: date }))}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  date={challengeForm.endDate}
                  onDateChange={(date: Date | undefined) => date && setChallengeForm(prev => ({ ...prev, endDate: date }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="privacy">Privacy</Label>
              <Select 
                value={challengeForm.isPublic ? 'public' : 'private'} 
                onValueChange={(value) => setChallengeForm(prev => ({ ...prev, isPublic: value === 'public' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can join</SelectItem>
                  <SelectItem value="private">Private - Invitation only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateChallenge}
                disabled={createLoading}
              >
                {createLoading ? 'Creating...' : 'Create Challenge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
