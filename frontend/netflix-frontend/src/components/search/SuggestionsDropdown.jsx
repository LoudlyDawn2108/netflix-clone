export default function SuggestionsDropdown({ suggestions, onSelect }) {
    if (!suggestions.length) return null;

    return (
        <ul className="absolute z-10 bg-gray-700 text-white w-full mt-1 rounded shadow">
            {suggestions.map((item, idx) => (
                <li
                    key={idx}
                    className="p-2 hover:bg-gray-600 cursor-pointer"
                    onClick={() => onSelect(item)}
                >
                    {item}
                </li>
            ))}
        </ul>
    );
}
