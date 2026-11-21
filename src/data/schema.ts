// Small builders for the structured data (JSON-LD) on the library pages, so every page describes
// itself the same way: a WebPage in the site, its breadcrumbs, and its questions.
import { SITE, stripTags } from './site';
import type { QA } from './library';

export const pageUrl = (path: string) => `${SITE}${path}`;

export function breadcrumbs(url: string, trail: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#crumbs`,
    itemListElement: [['Sleep Moore', '/'], ...trail].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: pageUrl(path) })),
  };
}

export function webPage(url: string, name: string, description: string, image?: string) {
  return {
    '@type': 'WebPage',
    '@id': url,
    url,
    name,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE}/#website` },
    breadcrumb: { '@id': `${url}#crumbs` },
    ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image } } : {}),
  };
}

export function faqPage(url: string, faq: QA[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: stripTags(f.q), acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) } })),
  };
}

export const graph = (...nodes: object[]) => JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
