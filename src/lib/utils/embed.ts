/**
 * Safely parses a YouTube or Vimeo link and returns the corresponding embed iframe URL.
 * If the link is not recognized, it returns null.
 */
export function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1];
      } else if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1].replace(/\/$/, '');
      } else {
        videoId = urlObj.searchParams.get('v') || '';
      }
      
      if (videoId) {
        // Strip any trailing parameters from the videoId (e.g. if there was a ?si=...)
        videoId = videoId.split('?')[0].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      // Handle standard vimeo.com/123456789
      const match = urlObj.pathname.match(/^\/(\d+)/);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
      
      // Handle vimeo.com/manage/videos/123456789
      if (urlObj.pathname.includes('/videos/')) {
         const id = urlObj.pathname.split('/videos/')[1]?.split('/')[0];
         if (id && /^\d+$/.test(id)) {
             return `https://player.vimeo.com/video/${id}`;
         }
      }
    }
  } catch (e) {
    // Invalid URL format
    return null;
  }
  
  return null;
}
