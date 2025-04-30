// This is a mock authentication service
// In a real app, this would call an API

// Type for user data
export interface User {
  id: string
  email: string
  name: string
  avatar: string
}

// Mock user data
const mockUser: User = {
  id: "user-1",
  email: "user@example.com",
  name: "John Doe",
  avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
}

// Mock delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Login function
export async function login(email: string, password: string): Promise<User> {
  // Simulate API call
  await delay(1000)
  
  // Simple validation - in a real app, this would verify credentials with a backend
  if (email !== "user@example.com" || password !== "password") {
    throw new Error("Invalid email or password")
  }
  
  // Store user in session storage
  sessionStorage.setItem("user", JSON.stringify(mockUser))
  
  return mockUser
}

// Signup function
export async function signup(email: string, password: string, name: string): Promise<User> {
  // Simulate API call
  await delay(1000)
  
  // In a real app, this would create a new user account
  const newUser = { ...mockUser, email, name }
  
  // Store user in session storage
  sessionStorage.setItem("user", JSON.stringify(newUser))
  
  return newUser
}

// Logout function
export async function logout(): Promise<void> {
  // Simulate API call
  await delay(300)
  
  // Clear user from session storage
  sessionStorage.removeItem("user")
}

// Get current user
export function getCurrentUser(): User | null {
  const userJson = sessionStorage.getItem("user")
  return userJson ? JSON.parse(userJson) : null
}