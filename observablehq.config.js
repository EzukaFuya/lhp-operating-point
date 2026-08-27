// See https://observablehq.com/framework/config for the full option list.

export default {
  title: 'Loop heat pipe operating point',
  root: 'src',

  // The page carries the design's own visual language, so the built-in
  // themes are replaced outright rather than layered under.
  theme: [],
  style: 'style.css',

  // A single-page site: the tool is the homepage, so there is nothing to
  // navigate between.
  pages: [],
  sidebar: false,
  pager: false,
  toc: false,
  search: false,

  head: `
    <meta name="description" content="Interactive loop heat pipe study model: how the compensation chamber temperature sets the loop operating point, the capillary and subcooling margins, and the cycle on the P–T and T–s planes." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap" rel="stylesheet" />
  `,

  footer: '',
  cleanUrls: true,
}
