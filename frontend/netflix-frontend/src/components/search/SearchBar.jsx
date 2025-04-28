import { useState, useEffect } from "react";
import useDebounce from "../../hooks/useDebounce";

export default function SearchBar({ query, onQueryChange }) {
    const [value, setValue] = useState(query);
    const debounced = useDebounce(value, 300);

    useEffect(() => {
        onQueryChange(debounced);
    }, [debounced, onQueryChange]);

    return (
        <input
            type="text"
            placeholder="Search videos..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400"
        />
    );
}
