import "../styles/styles.css"; // Make sure this path is correct
import React from "react"; // Import React

// eslint-disable-next-line react/prop-types
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
