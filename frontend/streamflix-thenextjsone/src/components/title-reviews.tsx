"use client"

import { useState } from "react"
import { Star, ThumbsUp, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Review } from "@/lib/types"

interface TitleReviewsProps {
  reviews: {
    user: Review[]
    critic: Review[]
    averageRating: number
    totalReviews: number
    ratingDistribution: number[]
  }
}

export default function TitleReviews({ reviews }: TitleReviewsProps) {
  const [activeTab, setActiveTab] = useState("user")
  const [showAllReviews, setShowAllReviews] = useState(false)

  const displayedReviews = showAllReviews
    ? reviews[activeTab as "user" | "critic"]
    : reviews[activeTab as "user" | "critic"].slice(0, 3)

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-500"}`}
      />
    ))
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Reviews</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rating Summary */}
        <div className="bg-zinc-900/50 rounded-lg p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="text-5xl font-bold mr-3">{reviews.averageRating.toFixed(1)}</div>
            <div className="flex flex-col">
              <div className="flex">{renderStars(reviews.averageRating)}</div>
              <div className="text-sm text-gray-400 mt-1">{reviews.totalReviews} reviews</div>
            </div>
          </div>

          <div className="space-y-2">
            {reviews.ratingDistribution.map((count, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-8 text-right">{5 - index}</div>
                <Progress
                  value={(count / reviews.totalReviews) * 100}
                  className="h-2 bg-zinc-800"
                  indicatorClassName="bg-yellow-500"
                />
                <div className="w-8 text-gray-400 text-sm">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="user" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900/50">
              <TabsTrigger value="user" className="data-[state=active]:bg-red-600">
                User Reviews ({reviews.user.length})
              </TabsTrigger>
              <TabsTrigger value="critic" className="data-[state=active]:bg-red-600">
                Critic Reviews ({reviews.critic.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="mt-4 space-y-6">
              {displayedReviews.map((review) => (
                <div key={review.id} className="border-b border-zinc-800 pb-4 last:border-0">
                  <div className="flex items-center mb-2">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={review.authorImage || "/placeholder.svg"} alt={review.author} />
                      <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{review.author}</div>
                      <div className="text-sm text-gray-400">{review.date}</div>
                    </div>
                    <div className="ml-auto flex">{renderStars(review.rating)}</div>
                  </div>
                  <h4 className="font-medium mb-1">{review.title}</h4>
                  <p className="text-gray-300 mb-3">{review.content}</p>
                  <div className="flex items-center text-sm text-gray-400">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <ThumbsUp className="h-4 w-4 mr-1" /> {review.helpfulCount}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <MessageSquare className="h-4 w-4 mr-1" /> Reply
                    </Button>
                  </div>
                </div>
              ))}

              {reviews[activeTab as "user" | "critic"].length > 3 && (
                <Button
                  variant="outline"
                  className="w-full border-zinc-700"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                >
                  {showAllReviews ? "Show Less" : "Show All Reviews"}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="critic" className="mt-4 space-y-6">
              {displayedReviews.map((review) => (
                <div key={review.id} className="border-b border-zinc-800 pb-4 last:border-0">
                  <div className="flex items-center mb-2">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={review.authorImage || "/placeholder.svg"} alt={review.author} />
                      <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{review.author}</div>
                      <div className="text-sm text-gray-400">{review.publication}</div>
                    </div>
                    <div className="ml-auto flex">{renderStars(review.rating)}</div>
                  </div>
                  <h4 className="font-medium mb-1">{review.title}</h4>
                  <p className="text-gray-300 mb-3">{review.content}</p>
                  <div className="flex items-center text-sm text-gray-400">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <ThumbsUp className="h-4 w-4 mr-1" /> {review.helpfulCount}
                    </Button>
                  </div>
                </div>
              ))}

              {reviews[activeTab as "user" | "critic"].length > 3 && (
                <Button
                  variant="outline"
                  className="w-full border-zinc-700"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                >
                  {showAllReviews ? "Show Less" : "Show All Reviews"}
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
