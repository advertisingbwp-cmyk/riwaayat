import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import {pathToFileURL} from 'node:url';

const DIST_DIR = path.resolve('dist');
const BASE_HTML = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(BASE_HTML)) {
  console.error('dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

// Transform and load blog-data.ts
const tsSource = fs.readFileSync('src/blog-data.ts', 'utf8');
const { code: jsCode } = await esbuild.transform(tsSource, { loader: 'ts' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(jsCode).toString('base64'));
const blogPosts = mod.blogPosts;

// Render actual article bodies as well as metadata for no-JavaScript readers.
const renderer = await esbuild.build({stdin:{contents: `import React from 'react'; import {renderToString} from 'react-dom/server'; import Blog from './src/Blog.tsx'; export const renderBlog=(slug)=>renderToString(React.createElement(Blog,{slug}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',loader:{'.css':'empty'},write:false});
const rendererPath=path.resolve('.blog-render.mjs');
fs.writeFileSync(rendererPath,renderer.outputFiles[0].text);
let renderBlog;
try { ({renderBlog}=await import(pathToFileURL(rendererPath).href)); } finally { fs.unlinkSync(rendererPath); }
function withBody(html,slug){return html.replace('<div id="root"></div>',`<div id="root">${renderBlog(slug)}</div>`);}

const baseHtmlContent = fs.readFileSync(BASE_HTML, 'utf8');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getArticleImage(slug) {
  if (slug.includes('noor')) {
    return 'https://riwaayat-venue.vercel.app/images/noor.webp';
  }
  if (slug.includes('bloom') || slug.includes('whatsapp') || slug.includes('destination') || slug.includes('do-you-need')) {
    return 'https://riwaayat-venue.vercel.app/images/bloom.webp';
  }
  return 'https://riwaayat-venue.vercel.app/images/royal.webp';
}

function replaceMeta(html, {
  title,
  description,
  url,
  image,
  type = 'article',
  publishedTime,
  jsonLd
}) {
  let result = html;

  // Replace Title
  result = result.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace Description
  result = result.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}"/>`);

  // Replace Canonical
  result = result.replace(/<link rel="canonical" href=".*?"\s*\/?>/i, `<link rel="canonical" href="${url}"/>`);

  // Replace OpenGraph
  result = result.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}"/>`);
  result = result.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}"/>`);
  result = result.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${url}"/>`);
  result = result.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${image}"/>`);
  result = result.replace(/<meta property="og:type" content=".*?"\s*\/?>/i, `<meta property="og:type" content="${type}"/>`);

  // Replace Twitter
  result = result.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}"/>`);
  result = result.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}"/>`);
  result = result.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${image}"/>`);

  // Inject or replace JSON-LD
  const jsonLdScript = `\n  <script id="page-ld-json" type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/</g,'\\u003c')}\n  </script>`;
  result = result.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);

  return result;
}

// 1. Generate /blog hub page
const blogHubDir = path.join(DIST_DIR, 'blog');
if (!fs.existsSync(blogHubDir)) {
  fs.mkdirSync(blogHubDir, { recursive: true });
}

const blogHubHtml = replaceMeta(baseHtmlContent, {
  title: 'Wedding & Celebration Guides, Etiquette & Ideas — Riwaayat',
  description: 'Explore curated guides on digital wedding invitations, online RSVP management, Pakistani wedding traditions, and modern event planning.',
  url: 'https://riwaayat-venue.vercel.app/blog',
  image: 'https://riwaayat-venue.vercel.app/images/royal.webp',
  type: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Riwaayat Guides & Wedding Journal',
    url: 'https://riwaayat-venue.vercel.app/blog',
    description: 'Explore curated guides on digital wedding invitations, online RSVP management, Pakistani wedding traditions, and modern event planning.',
    publisher: {
      '@type': 'Organization',
      name: 'Riwaayat',
      logo: {
        '@type': 'ImageObject',
        url: 'https://riwaayat-venue.vercel.app/images/royal.webp'
      }
    },
    hasPart: blogPosts.map(p => ({
      '@type': 'Article',
      headline: p.title,
      url: `https://riwaayat-venue.vercel.app/blog/${p.slug}`,
      description: p.excerpt
    }))
  }
});

fs.writeFileSync(path.join(blogHubDir, 'index.html'), withBody(blogHubHtml));
console.log('✓ Generated static /blog/index.html');

// 2. Generate each /blog/:slug article page
for (const post of blogPosts) {
  const postDir = path.join(blogHubDir, post.slug);
  if (!fs.existsSync(postDir)) {
    fs.mkdirSync(postDir, { recursive: true });
  }

  const postUrl = `https://riwaayat-venue.vercel.app/blog/${post.slug}`;
  const postImage = getArticleImage(post.slug);

  const articleHtml = replaceMeta(baseHtmlContent, {
    title: `${post.title} — Riwaayat Guides`,
    description: post.excerpt,
    url: postUrl,
    image: postImage,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: [postImage],
      author: {
        '@type': 'Organization',
        name: 'Riwaayat',
        url: 'https://riwaayat-venue.vercel.app'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Riwaayat',
        logo: {
          '@type': 'ImageObject',
          url: 'https://riwaayat-venue.vercel.app/images/royal.webp'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': postUrl
      }
    }
  });

  fs.writeFileSync(path.join(postDir, 'index.html'), withBody(articleHtml,post.slug));
  console.log(`✓ Generated static /blog/${post.slug}/index.html`);
}

console.log(`Successfully generated static HTML pages for all ${blogPosts.length} articles.`);
