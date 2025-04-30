"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { switchProfile } from "@/lib/auth-service"
import type { Profile } from "@/lib/types"

export default function ProfilePage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([
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
  ])
  const [isManaging, setIsManaging] = useState(false)

  const handleProfileSelect = async (profileId: string) => {
    if (isManaging) return

    try {
      await switchProfile(profileId)
      router.push("/")
    } catch (error) {
      console.error("Failed to switch profile", error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-8">{isManaging ? "Manage Profiles" : "Who's watching?"}</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-8 mb-8">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col items-center"
              onClick={() => !isManaging && handleProfileSelect(profile.id)}
            >
              <div className="relative group cursor-pointer">
                <div
                  className={`rounded-md overflow-hidden border-2 ${isManaging ? "border-gray-600" : "border-transparent group-hover:border-white"} transition-all`}
                >
                  <Image
                    src={profile.avatarPath || "/placeholder.svg"}
                    alt={profile.name}
                    width={200}
                    height={200}
                    className="w-full aspect-square object-cover"
                  />
                </div>

                {isManaging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-col items-center">
                <span
                  className={`text-lg ${profile.isKids ? "text-blue-400" : "text-gray-300"} group-hover:text-white transition-colors`}
                >
                  {profile.name}
                </span>

                {isManaging && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-500 hover:bg-transparent p-0"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Add Profile Button */}
          {profiles.length < 5 && (
            <div className="flex flex-col items-center">
              <div className="rounded-md overflow-hidden border-2 border-transparent group-hover:border-white transition-all cursor-pointer">
                <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
                  <svg className="h-20 w-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <span className="mt-2 text-lg text-gray-300">Add Profile</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="lg"
          className="border-gray-600 text-gray-300 hover:text-white hover:border-white"
          onClick={() => setIsManaging(!isManaging)}
        >
          {isManaging ? "Done" : "Manage Profiles"}
        </Button>
      </div>
    </div>
  )
}
