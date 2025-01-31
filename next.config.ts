import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
    quietDeps: true,
  },
  images: {
    domains: ['api.universalprofile.cloud']
  },
};

export default nextConfig;
