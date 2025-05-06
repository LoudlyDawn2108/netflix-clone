import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getContentDetails } from "@/lib/content-service"
import TitleHero from "@/components/title-hero"
import TitleOverview from "@/components/title-overview"
import TitleCast from "@/components/title-cast"
import TitleReviews from "@/components/title-reviews"
import TitleSimilar from "@/components/title-similar"
import TitleEpisodes from "@/components/title-episodes"
import TitleDetails from "@/components/title-details"
import LoadingSpinner from "@/components/loading-spinner"

interface TitlePageProps {
  params: {
    id: string
  }
}

export default async function TitlePage({ params }: TitlePageProps) {
  const content = await getContentDetails(params.id)

  if (!content) {
    notFound()
  }


  return (
    <div className="min-h-fit pb-20">
      <TitleHero content={content} />

      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 -mt-16 relative z-10 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/*<TitleOverview content={content} />*/}
          </div>
          <div className="space-y-8">
            <TitleDetails content={content} />
          </div>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <TitleCast cast={content.cast} />
        </Suspense>

        {content.type === "series" && (
          <Suspense fallback={<LoadingSpinner />}>
            <TitleEpisodes series={content} />
          </Suspense>
        )}

        <Suspense fallback={<LoadingSpinner />}>
          <TitleReviews reviews={content.reviews} />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <TitleSimilar similar={content.similar} />
        </Suspense>
      </div>
    </div>
  )
}
