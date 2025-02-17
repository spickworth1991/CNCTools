import "../styles/styles.css"; // Ensure the path to styles is correct
import React from "react"; // Import React
import Head from "next/head"; // Import Head for managing the document head

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
