import React from "react";
import { Helmet } from "react-helmet";

const MetaTags = ({ title, description, image }) => {
  return (
    <Helmet>
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={window.location.href} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
};

export default MetaTags;
