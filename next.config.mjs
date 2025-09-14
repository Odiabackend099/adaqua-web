/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: { formats: ['image/webp','image/avif'] },
  // Exclude archived files from build
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      include: /_archive/,
      use: 'ignore-loader'
    });
    return config;
  }
};
export default config;