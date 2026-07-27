import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App.jsx'
import { PrerenderDataProvider } from './lib/prerenderData.jsx'
import { buildHeadTags, buildPrerenderDataScript, selectPrerenderData } from './lib/seo.js'

export function render({ url, data = {}, siteUrl }) {
  const routeData = selectPrerenderData(url, data)
  const html = renderToString(
    <StaticRouter location={url}>
      <PrerenderDataProvider initialData={routeData}>
        <App />
      </PrerenderDataProvider>
    </StaticRouter>,
  )

  return {
    html,
    head: buildHeadTags({ url, data: routeData, siteUrl }),
    dataScript: buildPrerenderDataScript(routeData),
  }
}
