import type { User, Profile, AuthState } from "@/lib/types"

// Mock user data
const mockUser: User = {
  id: "user-1",
  name: "John Doe",
  email: "john.doe@example.com",
  subscription: {
    plan: "Premium",
    status: "active",
    renewalDate: "2023-12-31",
  },
}

// Mock profiles
const mockProfiles: Profile[] = [
  {
    id: "profile-1",
    name: "John",
    avatarPath: "/placeholder.svg?height=200&width=200&text=J",
    isKids: false,
  },
  {
    id: "profile-2",
    name: "Jane",
    avatarPath: "/placeholder.svg?height=200&width=200&text=J",
    isKids: false,
  },
  {
    id: "profile-3",
    name: "Kids",
    avatarPath: "/placeholder.svg?height=200&width=200&text=K",
    isKids: true,
  },
]

// Initial auth state
const initialAuthState: AuthState = {
  isAuthenticated: true, // Set to true for demo purposes
  user: mockUser,
  profiles: mockProfiles,
  currentProfile: mockProfiles[0],
  token: "mock-jwt-token",
}

// Login
export async function login(email: string, password: string): Promise<AuthState> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // In a real app, this would validate credentials with the backend
  if (email && password) {
    return initialAuthState
  }

  throw new Error("Invalid credentials")
}

// Signup
export async function signup(name: string, email: string, password: string): Promise<AuthState> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real app, this would register a new user with the backend
  if (name && email && password) {
    return {
      ...initialAuthState,
      user: {
        ...mockUser,
        name,
        email,
      },
    }
  }

  throw new Error("Invalid user information")
}

// Logout
export async function logout(): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // In a real app, this would invalidate the token on the backend
  return
}

// Get current user
export async function getCurrentUser(): Promise<AuthState> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // In a real app, this would validate the token and return the current user
  return initialAuthState
}

// Switch profile
export async function switchProfile(profileId: string): Promise<Profile | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Find the profile
  const profile = mockProfiles.find((p) => p.id === profileId) || null
  return profile
}
