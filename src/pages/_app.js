import "../styles/styles.css"; // Make sure this path is correct
import React from "react"; // Import React

// eslint-disable-next-line react/prop-types
function MyApp({ Component, pageProps }) {

      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
  return <Component {...pageProps} />;
}

export default MyApp;
