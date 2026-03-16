/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["pdfjs-dist"],
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
};
module.exports = nextConfig;
