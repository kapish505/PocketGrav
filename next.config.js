/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Google accounts (profile photos)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
}

module.exports = nextConfig
