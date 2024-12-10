import React from "react";
import "./Stars.css";

const starFilled = "/static/resources/estrellas/star-filled.png";
const starEmpty = "/static/resources/estrellas/star-empty.png";
const starHalf = "/static/resources/estrellas/star-half.png";

function Stars({ rating, className = "" }) {
  // Aseguramos que el rating esté en el rango de 0 a 5
  const validRating = Math.max(0, Math.min(rating, 5));

  const totalStars = 5;
  const fullStars = Math.floor(validRating); // Estrellas completas
  const halfStar = validRating % 1 >= 0.5; // Si la calificación tiene medio punto

  return (
    <div className="stars-left">
      {/* Renderizar estrellas completas */}
      {Array(fullStars)
        .fill(0)
        .map((_, index) => (
          <img
            key={`filled-${index}`}
            src={starFilled}
            alt="Full Star"
            className="star"
          />
        ))}

      {/* Renderizar una estrella medio llena */}
      {halfStar && (
        <img key="half" src={starHalf} alt="Half Star" className="star" />
      )}

      {/* Renderizar estrellas vacías */}
      {Array(totalStars - fullStars - (halfStar ? 1 : 0))
        .fill(0)
        .map((_, index) => (
          <img
            key={`empty-${index}`}
            src={starEmpty}
            alt="Empty Star"
            className="star"
          />
        ))}
    </div>
  );
}

export default Stars;
