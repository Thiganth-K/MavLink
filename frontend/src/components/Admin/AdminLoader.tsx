import React from "react";

const angles = [0, 45, 90, 135, 180, 225, 270, 315];

type Props = {
  className?: string;
};

const Loader: React.FC<Props> = ({ className = "" }) => {
  // The inner spans use percentages for size so they scale with the container.
  // Outer container uses responsive Tailwind sizes so loader is mobile-friendly.
  return (
    <div className={`relative flex items-center justify-center ${className} h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12`}>
      <div className="relative flex h-full w-full items-center justify-center">
        {angles.map((angle, index) => (
          <div
            key={index}
            className="absolute top-0 left-0 flex h-full w-full items-center justify-start"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span
              className="block rounded-full opacity-60"
              style={{
                height: "20%",
                width: "20%",
                backgroundColor: "#183153",
                animation: "pulseAnim 1s ease-in-out infinite",
                animationDelay: `${-0.125 * index}s`,
                boxShadow: "0 0 18px rgba(18, 31, 53, 0.22)",
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
