import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ginger Trading - Smart Inventory',
    short_name: 'Ginger Trade',
    description: 'Smart inventory and weight management for ginger trading',
    start_url: '/calendar',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4F46E5',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
