import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import React, { useState, useEffect } from 'react'
import { 
  Search, 
  User, 
  UserCheck, 
  UserX, 
  Shield,
  ShieldCheck,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface User {
  _id: string
  username: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  leetcodeHandle?: string
  codeforcesHandle?: string
  githubHandle?: string
  hackerrankHandle?: string
  hackerearthHandle?: string
}

interface SearchOptions {
  search: string
  role: 'all' | 'user' | 'admin'
  isActive: 'all' | 'true' | 'false'
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface UserResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    search: '',
    role: 'all',
    isActive: 'all',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [userResponse, setUserResponse] = useState<UserResponse | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchOptions.search) params.append('search', searchOptions.search)
      if (searchOptions.role !== 'all') params.append('role', searchOptions.role)
      if (searchOptions.isActive !== 'all') params.append('isActive', searchOptions.isActive)
      params.append('page', searchOptions.page.toString())
      params.append('limit', searchOptions.limit.toString())
      params.append('sortBy', searchOptions.sortBy)
      params.append('sortOrder', searchOptions.sortOrder)

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load users')
      }

      const result = await response.json()
      setUserResponse(result.data)
      setUsers(result.data.users)
    } catch (error) {
      console.error('Error loading users:', error)
      setError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Load users on mount and when search options change
  useEffect(() => {
    loadUsers()
  }, [searchOptions])

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchOptions(prev => ({
      ...prev,
      search: value,
      page: 1 // Reset to first page when searching
    }))
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchOptions, value: any) => {
    setSearchOptions(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setSearchOptions(prev => ({ ...prev, page }))
  }

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Select all users on current page
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(u => u._id)))
    }
  }

  // Update user status
  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      // Refresh users list
      await loadUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setActionLoading(null)
    }
  }

  // Update user role
  const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role })
      })

      if (!response.ok) {
        throw new Error('Failed to update user role')
      }

      // Refresh users list
      await loadUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      setError(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setActionLoading(null)
    }
  }

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      // Refresh users list
      await loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk update selected users
  const bulkUpdateUsers = async (updateData: any) => {
    if (selectedUsers.size === 0) {
      alert('Please select users to update')
      return
    }

    try {
      setActionLoading('bulk')
      
      const response = await fetch('/api/admin/users/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          updateData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update users')
      }

      // Clear selection and refresh
      setSelectedUsers(new Set())
      await loadUsers()
    } catch (error) {
      console.error('Error updating users:', error)
      setError(error instanceof Error ? error.message : 'Failed to update users')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? 
      <ShieldCheck className="h-4 w-4 text-blue-600" /> : 
      <User className="h-4 w-4 text-gray-600" />
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inactive</Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">User</Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by username or email..."
                  value={searchOptions.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={searchOptions.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={searchOptions.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              <Button
                onClick={loadUsers}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedUsers.size} users selected
              </span>
              <Button
                size="sm"
                onClick={() => bulkUpdateUsers({ isActive: true })}
                disabled={actionLoading === 'bulk'}
              >
                Activate
              </Button>
              <Button
                size="sm"
                onClick={() => bulkUpdateUsers({ isActive: false })}
                disabled={actionLoading === 'bulk'}
                variant="destructive"
              >
                Deactivate
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="animate-spin h-6 w-6 text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              {getRoleIcon(user.role)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLoginAt ? 
                          new Date(user.lastLoginAt).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user._id, !user.isActive)}
                            disabled={actionLoading === user._id}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserRole(user._id, user.role === 'admin' ? 'user' : 'admin')}
                            disabled={actionLoading === user._id}
                          >
                            {user.role === 'admin' ? (
                              <>
                                <User className="h-4 w-4 mr-1" />
                                Make User
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {userResponse && userResponse.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((userResponse.page - 1) * userResponse.limit) + 1} to{' '}
                {Math.min(userResponse.page * userResponse.limit, userResponse.total)} of{' '}
                {userResponse.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userResponse.page - 1)}
                  disabled={userResponse.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-700">
                  Page {userResponse.page} of {userResponse.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userResponse.page + 1)}
                  disabled={userResponse.page === userResponse.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UserManagement





