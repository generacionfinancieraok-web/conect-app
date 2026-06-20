import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL || 'https://conect-app-production.up.railway.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/', '/inbox/', '/payment/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
