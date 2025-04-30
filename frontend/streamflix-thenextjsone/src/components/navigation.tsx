"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search, Bell, ChevronDown, User, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearch(false)
      setSearchQuery("")
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-colors duration-300",
        scrolled || pathname !== "/" ? "bg-black/90 backdrop-blur-sm" : "bg-gradient-to-b from-black/80 to-transparent",
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-red-600 font-bold text-2xl">
            StreamFlix
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={cn("text-sm font-medium", pathname === "/" ? "text-white" : "text-gray-300 hover:text-white")}
            >
              Home
            </Link>
            <Link
              href="/tv-shows"
              className={cn(
                "text-sm font-medium",
                pathname === "/tv-shows" ? "text-white" : "text-gray-300 hover:text-white",
              )}
            >
              TV Shows
            </Link>
            <Link
              href="/movies"
              className={cn(
                "text-sm font-medium",
                pathname === "/movies" ? "text-white" : "text-gray-300 hover:text-white",
              )}
            >
              Movies
            </Link>
            <Link
              href="/new"
              className={cn(
                "text-sm font-medium",
                pathname === "/new" ? "text-white" : "text-gray-300 hover:text-white",
              )}
            >
              New & Popular
            </Link>
            <Link
              href="/my-list"
              className={cn(
                "text-sm font-medium",
                pathname === "/my-list" ? "text-white" : "text-gray-300 hover:text-white",
              )}
            >
              My List
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {showSearch ? (
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Titles, people, genres"
                className="w-[200px] md:w-[300px] bg-black/80 border-gray-700 focus:border-white pr-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 text-gray-400"
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-gray-300 hover:text-white">
                <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-sm border-gray-800">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/profile" className="w-full">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/account" className="w-full">
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/help" className="w-full">
                  Help Center
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/auth/logout" className="w-full">
                  Sign out of StreamFlix
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
