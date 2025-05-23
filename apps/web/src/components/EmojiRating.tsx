import { useState } from "react";

export default function EmojiRating({ onRate }) {
  const [selectedRating, setSelectedRating] = useState(null);

  const faces = [
    { id: 4, hint: "I hated it", emoji: "😡", color: "bg-red-500", value: 1 },
    { id: 3, hint: "Not so good", emoji: "🙁", color: "bg-orange-500", value: 2 },
    { id: 2, hint: "It's ok. I guess.", emoji: "😐", color: "bg-yellow-400", value: 3 },
    { id: 1, hint: "This is great!", emoji: "🙂", color: "bg-green-300", value: 4 },
    { id: 0, hint: "I love it!", emoji: "😀", color: "bg-green-500", value: 5 }
  ];

  const barColors = [
    "bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-green-300", "bg-green-500"
  ];

  const handleRating = (face) => {
    setSelectedRating(face.id);
    if (onRate) {
      onRate(face.value);
    }
  };

  return (
    <div className="flex flex-col items-center mt-4">
      <div className="flex space-x-4">
        {faces.map((face) => (
          <button
            key={face.id}
            onClick={() => handleRating(face)}
            className={`w-16 h-16 flex items-center justify-center rounded-full shadow-md cursor-pointer transition-transform transform hover:scale-110 ${
              selectedRating === face.id ? face.color : "bg-gray-200"
            }`}
            aria-label={face.hint}
          >
            <span className="text-3xl">{face.emoji}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 text-lg text-gray-600 h-6">
        {selectedRating !== null ? faces.find(face => face.id === selectedRating).hint : "Select your feedback"}
      </div>

      <div className="flex w-full mt-4">
        {barColors.map((color, index) => (
          <div
            key={index}
            className={`flex-grow h-2 transition-all duration-300 ${
              selectedRating !== null && index <= (4 - selectedRating) ? color : "bg-gray-200"
            } ${index === 0 ? "rounded-l-full" : ""} ${index === barColors.length - 1 ? "rounded-r-full" : ""}`}
          ></div>
        ))}
      </div>
    </div>
  );
}
