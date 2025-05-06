import { CastMember } from "../lib/types";

interface TitleCastProps {
    cast: CastMember[];
}

export default function TitleCast({ cast }: TitleCastProps) {
    if (!cast || cast.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-2xl font-medium mb-4">Cast</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {cast.map((person) => (
                    <div key={person.id} className="text-center">
                        <div className="aspect-square rounded-md overflow-hidden bg-gray-800 mb-2">
                            <img
                                src={person.profilePath || "/placeholder.svg"}
                                alt={person.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h4 className="font-medium text-sm">{person.name}</h4>
                        <p className="text-gray-400 text-xs line-clamp-1">
                            {person.character}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
