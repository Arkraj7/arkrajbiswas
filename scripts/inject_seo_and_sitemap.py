#!/usr/bin/env python3
"""
Upgrades SEO, Schema.org JSON-LD (Person/Researcher + ScholarlyArticle),
OpenGraph/Twitter cards, Google Scholar citation_* tags, sitemap.xml, and robots.txt
across arkrajbiswas.com without touching favicons.

Design rules (to protect existing SEO):
- Canonical URLs keep the site's existing extensionless style
  (https://arkrajbiswas.com/about, never /about.html, never www.).
- Only MISSING meta tags are injected; existing description, author,
  canonical, OpenGraph and Twitter tags are never duplicated.
- The knowledge-graph JSON-LD block is idempotent: re-runs replace the
  previously injected block instead of appending another one.
- <title> elements are never rewritten.

Usage:
  python3 scripts/inject_seo_and_sitemap.py
Stdlib only.
"""
import datetime
import json
import pathlib
import re

SITE_URL = "https://arkrajbiswas.com"
DEFAULT_OG_IMAGE = f"{SITE_URL}/assets/fieldwork/cover.jpg"
TODAY = datetime.date.today().isoformat()

PERSON_SCHEMA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": ["Person", "Researcher"],
            "@id": f"{SITE_URL}/#arkraj-biswas",
            "name": "Arkraj Biswas",
            "givenName": "Arkraj",
            "familyName": "Biswas",
            "jobTitle": "Environmental & Climate Researcher | Research Associate",
            "description": "Environmental and climate researcher working across satellite remote sensing, GIS, urban heat islands, urban forestry (Nagar Van Yojana), and environmental policy evaluation.",
            "url": f"{SITE_URL}/",
            "image": DEFAULT_OG_IMAGE,
            "email": "mailto:arkraj.biswas6@gmail.com",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "New Delhi",
                "addressCountry": "IN"
            },
            "worksFor": [
                {
                    "@type": "GovernmentOrganization",
                    "name": "National CAMPA, Ministry of Environment, Forest and Climate Change (MoEFCC)"
                },
                {
                    "@type": "NGO",
                    "name": "EcoServe Development Foundation"
                }
            ],
            "alumniOf": [
                {
                    "@type": "CollegeOrUniversity",
                    "name": "Banaras Hindu University (BHU)"
                },
                {
                    "@type": "CollegeOrUniversity",
                    "name": "University of Agricultural Sciences, Dharwad"
                }
            ],
            "knowsAbout": [
                "Climate Change",
                "Urban Heat Island (UHI) Mitigation",
                "Urban Forestry",
                "Nagar Van Yojana",
                "Geographic Information Systems (GIS)",
                "Satellite Remote Sensing",
                "Landsat 8/9 & Sentinel-2",
                "Environmental Policy Evaluation",
                "Biodiversity and Conservation Policy"
            ],
            "sameAs": [
                "https://in.linkedin.com/in/arkraj-biswas-kugel",
                "https://scholar.google.com/citations?hl=en&user=t79hnZAAAAAJ",
                "https://github.com/Arkraj7",
                "https://questionofcities.org/the-etawah-design-an-123-acre-urban-forest-as-its-lungs/"
            ]
        },
        {
            "@type": "WebSite",
            "@id": f"{SITE_URL}/#website",
            "url": f"{SITE_URL}/",
            "name": "Arkraj Biswas | Environmental & Climate Researcher",
            "publisher": {"@id": f"{SITE_URL}/#arkraj-biswas"},
            "inLanguage": "en"
        }
    ]
}

PAGE_META = {
    "index.html": {
        "desc": "Arkraj Biswas is an Environmental & Climate Researcher at National CAMPA (MoEFCC) specializing in satellite remote sensing, GIS, urban heat islands, urban forestry (Nagar Van Yojana), and environmental policy.",
        "canonical": f"{SITE_URL}/",
        "keywords": "Arkraj Biswas, Environmental Researcher India, Climate Researcher, National CAMPA MoEFCC, Nagar Van Yojana, Urban Heat Island Bengaluru, GIS Remote Sensing, Banaras Hindu University, UAS Dharwad"
    },
    "about.html": {
        "desc": "Background and research trajectory of Arkraj Biswas—from Agricultural Sciences at UAS Dharwad and Atmospheric Sciences at BHU to environmental policy evaluation at National CAMPA (MoEFCC).",
        "canonical": f"{SITE_URL}/about",
        "keywords": "Arkraj Biswas CV, Arkraj Biswas biography, National CAMPA Research Associate, Embark India Fellow IIPA, UGC NET JRF Environmental Science, EcoServe Development Foundation"
    },
    "research.html": {
        "desc": "Empirical studies, GIS assessments, SSRN policy briefs, and field writing by Arkraj Biswas on the Nagar Van Yojana, Bengaluru Urban Heat Islands, and India's Biodiversity-Poverty Paradox.",
        "canonical": f"{SITE_URL}/research",
        "keywords": "Arkraj Biswas publications, Nagar Van Yojana assessment, Bengaluru Urban Heat Island thesis, Systemic Bio-Inequity India, SSRN urban forestry policy brief"
    },
    "contact.html": {
        "desc": "Get in touch with environmental and climate researcher Arkraj Biswas for research collaborations, urban forestry policy discussions, speaking invitations, or GIS mentorship.",
        "canonical": f"{SITE_URL}/contact",
        "keywords": "Contact Arkraj Biswas, Arkraj Biswas email, Environmental researcher New Delhi, GIS mentorship"
    },
    "projects/bengaluru-urban-heat.html": {
        "desc": "Decadal Landsat 8/9 OLI-TIRS and spatial econometric (GWR, Local Moran's I) study of Land Surface Temperature (LST), NDVI, and NDBI across Bengaluru (2014, 2019, 2024) by Arkraj Biswas.",
        "canonical": f"{SITE_URL}/projects/bengaluru-urban-heat",
        "keywords": "Bengaluru Urban Heat Island, LST NDVI NDBI Bengaluru, Park Cool Island Cubbon Park Lalbagh, Arkraj Biswas BHU thesis",
        "scholar": {
            "title": "Bengaluru: Urban Heat, Green Spaces and Urban Development (April 2014, 2019 and 2024)",
            "date": "2025/05"
        }
    },
    "projects/nagar-van-assessment.html": {
        "desc": "Multi-state field and GIS evaluation of 14 Nagar Van and Nagar Vatika urban forest sites across India by Arkraj Biswas.",
        "canonical": f"{SITE_URL}/projects/nagar-van-assessment",
        "keywords": "Nagar Van Yojana assessment, Urban forestry India MoEFCC CAMPA, Human-centric urban forestry, Arkraj Biswas",
        "scholar": {
            "title": "Comprehensive Technical Assessment of Nagar Van and Nagar Vatika Yojana",
            "date": "2026"
        }
    },
    "projects/bio-inequity.html": {
        "desc": "Spatial analysis of the overlap between biodiversity hotspots and multidimensional poverty across Indian states by Arkraj Biswas.",
        "canonical": f"{SITE_URL}/projects/bio-inequity",
        "keywords": "Biodiversity poverty paradox India, Systemic bio-inequity, Conservation justice GIS India, Arkraj Biswas",
        "scholar": {
            "title": "Systemic Bio-Inequity in India: Exploring the Biodiversity-Poverty Paradox",
            "date": "2026"
        }
    }
}

BEGIN = "<!-- BEGIN ARKRAJ SEO & KNOWLEDGE GRAPH -->"
END = "<!-- END ARKRAJ SEO & KNOWLEDGE GRAPH -->"


def has_tag(head: str, marker: str) -> bool:
    """True when the head already contains a tag matching marker (case-insensitive)."""
    return re.search(marker, head, flags=re.IGNORECASE) is not None


def build_seo_block(head: str, meta: dict) -> str:
    """Emit only tags missing from the existing head. Never duplicates."""
    lines = []
    if not has_tag(head, r'<meta\s+name="keywords"'):
        lines.append(f'  <meta name="keywords" content="{meta["keywords"]}">')
    if not has_tag(head, r'<meta\s+name="robots"'):
        lines.append('  <meta name="robots" content="index, follow, max-image-preview:large">')
    if not has_tag(head, r'<meta\s+property="og:title"'):
        lines.append(f'  <meta property="og:title" content="{meta["desc"]}">')
    if not has_tag(head, r'<meta\s+property="og:description"'):
        lines.append(f'  <meta property="og:description" content="{meta["desc"]}">')
    if not has_tag(head, r'<meta\s+property="og:url"'):
        lines.append(f'  <meta property="og:url" content="{meta["canonical"]}">')
    if not has_tag(head, r'<meta\s+property="og:image"'):
        lines.append(f'  <meta property="og:image" content="{DEFAULT_OG_IMAGE}">')
    if not has_tag(head, r'<meta\s+name="twitter:title"'):
        lines.append(f'  <meta name="twitter:title" content="{meta["desc"]}">')
    if not has_tag(head, r'<meta\s+name="twitter:description"'):
        lines.append(f'  <meta name="twitter:description" content="{meta["desc"]}">')
    if not has_tag(head, r'<meta\s+name="twitter:image"'):
        lines.append(f'  <meta name="twitter:image" content="{DEFAULT_OG_IMAGE}">')

    scholar_tags = ""
    if "scholar" in meta and not has_tag(head, r'<meta\s+name="citation_title"'):
        s = meta["scholar"]
        scholar_tags = (
            f'\n  <meta name="citation_title" content="{s["title"]}">'
            f'\n  <meta name="citation_author" content="Biswas, Arkraj">'
            f'\n  <meta name="citation_publication_date" content="{s["date"]}">'
            f'\n  <meta name="citation_public_url" content="{meta["canonical"]}">'
        )

    json_ld = json.dumps(PERSON_SCHEMA, ensure_ascii=False)
    lines.append(f'  <script type="application/ld+json">{json_ld}</script>')
    return f"{BEGIN}\n" + "\n".join(lines) + scholar_tags + f"\n  {END}"


def process_html_files():
    for rel_path, meta in PAGE_META.items():
        p = pathlib.Path(rel_path)
        if not p.exists():
            print(f"skip (missing): {rel_path}")
            continue
        html = p.read_text(encoding="utf-8")
        # Remove block from a previous run so re-runs stay idempotent.
        html = re.sub(
            re.escape(BEGIN) + r".*?" + re.escape(END) + r"\s*",
            "",
            html,
            flags=re.DOTALL,
        )
        head = html.split("</head>")[0]
        block = build_seo_block(head, meta)
        html = html.replace("</head>", f"  {block}\n</head>", 1)
        p.write_text(html, encoding="utf-8")
        print(f"Injected SEO & JSON-LD into {rel_path}")


def generate_sitemap_and_robots():
    urls = [
        (meta["canonical"], "1.0" if meta["canonical"].endswith(".com/") else "0.85")
        for rel, meta in PAGE_META.items()
        if pathlib.Path(rel).exists()
    ]
    xml_items = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>weekly</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for u, pr in urls
    )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{xml_items}\n"
        "</urlset>\n"
    )
    pathlib.Path("sitemap.xml").write_text(sitemap, encoding="utf-8")

    robots = "User-agent: *\nAllow: /\n\nSitemap: " + SITE_URL + "/sitemap.xml\n"
    pathlib.Path("robots.txt").write_text(robots, encoding="utf-8")
    print("Generated sitemap.xml and robots.txt")


if __name__ == "__main__":
    process_html_files()
    generate_sitemap_and_robots()
