import React from "react";
import "./Stars.css";

function Stars({ rating, className = "" }) {
  const totalStars = 5;
  const filledStars = Math.min(Math.max(Number(rating) || 0, 0), totalStars);
  const emptyStars = totalStars - filledStars;

  return (
    <div className={`stars-left ${className}`}>
      {Array(filledStars)
        .fill(0)
        .map((_, index) => (
          <span key={`filled-${index}`} className="star filled">
            ★
          </span>
        ))}
      {Array(emptyStars)
        .fill(0)
        .map((_, index) => (
          <span key={`empty-${index}`} className="star empty">
            ☆
          </span>
        ))}
    </div>
  );
}

export default Stars;
