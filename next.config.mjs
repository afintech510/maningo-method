/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep these out of the SWC server bundle. The Resend SDK internally calls
  // @react-email/render to convert React email templates to HTML, and the
  // server minifier mangles those calls into "TypeError: t is not a function"
  // at runtime. Treating them as external loads the real package from
  // node_modules at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['resend', '@react-email/components', '@react-email/render'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
