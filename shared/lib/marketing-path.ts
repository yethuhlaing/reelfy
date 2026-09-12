/** Public marketing routes that stay dark regardless of the product theme. */
export function isMarketingPath(pathname: string | null | undefined) {
  return pathname === '/' || pathname === '/waitlist'
}
