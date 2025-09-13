/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: { formats: ['image/webp','image/avif'] }
};
export default config;