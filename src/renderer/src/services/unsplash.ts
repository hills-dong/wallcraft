import { UnsplashPhoto, UnsplashTopic } from '../../../../shared/types'

const BASE_URL = 'https://api.unsplash.com'
const PER_PAGE = 20

function getHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Client-ID ${apiKey}`,
    'Accept-Version': 'v1'
  }
}

export async function fetchTopics(apiKey: string): Promise<UnsplashTopic[]> {
  const response = await fetch(`${BASE_URL}/topics?per_page=20&order_by=featured`, {
    headers: getHeaders(apiKey)
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch topics: ${response.status}`)
  }
  return response.json()
}

export async function fetchTopicPhotos(
  apiKey: string,
  topicSlug: string,
  page: number = 1
): Promise<UnsplashPhoto[]> {
  const response = await fetch(
    `${BASE_URL}/topics/${topicSlug}/photos?page=${page}&per_page=${PER_PAGE}`,
    { headers: getHeaders(apiKey) }
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch photos: ${response.status}`)
  }
  return response.json()
}

export async function searchPhotos(
  apiKey: string,
  query: string,
  page: number = 1
): Promise<{ results: UnsplashPhoto[]; total_pages: number }> {
  const response = await fetch(
    `${BASE_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&orientation=landscape`,
    { headers: getHeaders(apiKey) }
  )
  if (!response.ok) {
    throw new Error(`Failed to search photos: ${response.status}`)
  }
  return response.json()
}

export async function trackDownload(apiKey: string, downloadLocation: string): Promise<void> {
  await fetch(downloadLocation, {
    headers: getHeaders(apiKey)
  })
}

export function getFullResUrl(photo: UnsplashPhoto): string {
  // Use raw URL with quality parameters for full resolution
  return `${photo.urls.raw}&q=90&w=${Math.max(photo.width, 3840)}`
}
