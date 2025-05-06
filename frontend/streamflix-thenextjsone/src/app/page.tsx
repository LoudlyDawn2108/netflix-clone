import { Suspense } from "react";
import Hero from "@/components/hero";
import ContentRow from "@/components/content-row";
import RecommendationRow from "@/components/recommendation-row";
import { getHomePageContent } from "@/lib/api/content-service";

export default async function HomePage() {
    const {
        featured,
        trending,
        popular,
        newReleases,
        continueWatching,
        myList,
        becauseYouWatched,
        topPicks,
        watchAgain,
    } = await getHomePageContent();

    return (
        <div className="min-h-screen pb-20">
            <Hero featured={featured} />

            <div className="space-y-8 mt-4 px-4 md:px-8">
                {continueWatching.items.length > 0 && (
                    <Suspense
                        fallback={
                            <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                        }
                    >
                        <ContentRow
                            title="Continue Watching"
                            items={continueWatching.items}
                            type="continue-watching"
                        />
                    </Suspense>
                )}

                {myList.items.length > 0 && (
                    <Suspense
                        fallback={
                            <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                        }
                    >
                        <ContentRow
                            title="My List"
                            items={myList.items}
                            type="my-list"
                        />
                    </Suspense>
                )}

                {/* Personalized Recommendations */}
                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <RecommendationRow
                        title={becauseYouWatched.title}
                        items={becauseYouWatched.items}
                        type="because-you-watched"
                    />
                </Suspense>

                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <RecommendationRow
                        title={topPicks.title}
                        subtitle={topPicks.subtitle}
                        items={topPicks.items}
                        type="top-picks"
                    />
                </Suspense>

                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <ContentRow
                        title="Trending Now"
                        items={trending.items}
                        type="trending"
                    />
                </Suspense>

                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <RecommendationRow
                        title={watchAgain.title}
                        subtitle={watchAgain.subtitle}
                        items={watchAgain.items}
                        type="watch-again"
                    />
                </Suspense>

                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <ContentRow
                        title="Popular on StreamFlix"
                        items={popular.items}
                        type="popular"
                    />
                </Suspense>

                <Suspense
                    fallback={
                        <div className="h-40 bg-gray-900 animate-pulse rounded-lg"></div>
                    }
                >
                    <ContentRow
                        title="New Releases"
                        items={newReleases.items}
                        type="new-releases"
                    />
                </Suspense>
            </div>
        </div>
    );
}
