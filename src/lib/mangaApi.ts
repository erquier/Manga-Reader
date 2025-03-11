import axios from 'axios';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

interface JikanMangaResponse {
  data: {
    mal_id: number;
    title: string;
    synopsis: string;
    genres: Array<{ name: string }>;
    status: string;
    score: number;
    images: {
      jpg: {
        large_image_url: string;
      };
    };
    authors: Array<{
      name: string;
    }>;
  };
}

export async function searchManga(title: string) {
  try {
    const response = await axios.get(`${JIKAN_API_BASE}/manga`, {
      params: {
        q: title,
        limit: 1
      }
    });

    if (response.data.data.length === 0) {
      return null;
    }

    const manga = response.data.data[0];
    return {
      title: manga.title,
      description: manga.synopsis,
      genres: manga.genres.map((g: { name: string }) => g.name),
      status: manga.status.toLowerCase() === 'publishing' ? 'ongoing' : 'completed',
      rating: manga.score || 0,
      cover: manga.images.jpg.large_image_url,
      author: manga.authors?.[0]?.name || 'Unknown'
    };
  } catch (error) {
    console.error('Error fetching manga data:', error);
    return null;
  }
}