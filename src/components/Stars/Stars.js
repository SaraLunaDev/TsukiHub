import React from "react";
import "./Stars.css";

const starFilled = "/static/resources/estrellas/star-filled.png";
const starEmpty = "/static/resources/estrellas/star-empty.png";
const starHalf = "/static/resources/estrellas/star-half.png";

function Stars({ rating }) {
  // Asegura que el rating esta entre 0 y 5
  const validRating = Math.max(0, Math.min(rating, 5));

  const totalStars = 5;
  const fullStars = Math.floor(validRating); // Estrellas completas
  const halfStar = validRating % 1 >= 0.5; // Si hay media estrella

  return (
    <div className="stars">
      {/* Estrellas completas */}
      {Array(fullStars)
        .fill(0)
        .map((_, index) => (
          <img
            key={`filled-${index}`}
            src={starFilled}
            alt="Estrella completa"
            className="star"
          />
        ))}

      {/* Estrella media */}
      {halfStar && (
        <img key="half" src={starHalf} alt="Media estrella" className="star" />
      )}

      {/* Estrellas vacias */}
      {Array(totalStars - fullStars - (halfStar ? 1 : 0))
        .fill(0)
        .map((_, index) => (
          <img
            key={`empty-${index}`}
            src={starEmpty}
            alt="Estrella vacia"
            className="star"
          />
        ))}
    </div>
  );
}

export default Stars;
