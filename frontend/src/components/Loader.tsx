import React from "react";

const angles = [0, 45, 90, 135, 180, 225, 270, 315];

const Loader: React.FC = () => {
  return (
    <div className="relative flex h-12 w-12 items-center justify-start">
      <div className="relative flex h-full w-full items-center justify-start">
        {angles.map((angle, index) => (
          <div
            key={index}
            className="absolute top-0 left-0 flex h-full w-full items-center justify-start"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span
              className="block rounded-full opacity-50"
              style={{
                height: "20%",
                width: "20%",
                backgroundColor: "#183153",
                animation: "pulseAnim 1s ease-in-out infinite",
                animationDelay: `${-0.125 * index}s`,
                boxShadow: "0 0 20px rgba(18, 31, 53, 0.3)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Inline keyframes so index.css is untouched */}
      <style>
        {`
          @keyframes pulseAnim {
            0%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Loader;
