import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { extractRequestSchema, type ExtractedContent } from "@shared/schema";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import UserAgent from "user-agents";
import axios from "axios";
import JSZip from "jszip";

// Cloud-based browser extraction using Browserless.io
async function browserlessLinkedInExtraction(url: string): Promise<ExtractedContent> {
  try {
    const browserlessKey = process.env.BROWSERLESS_API_KEY;
    
    if (!browserlessKey) {
      throw new Error('Browserless API key not configured');
    }

    console.log('Using Browserless.io for media extraction...');
    
    // Get fully rendered HTML from Browserless
    const response = await axios.post(
      `https://chrome.browserless.io/content?token=${browserlessKey}`,
      { 
        url: url,
        waitForSelector: 'article, [data-id]',
        waitForTimeout: 5000
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const renderedHtml = response.data;
    const $ = cheerio.load(renderedHtml);

    // Extract text content
    let textContent = '';
    const textSelectors = [
      '[data-view-name="feed-shared-text"] span[dir="ltr"]',
      '.feed-shared-text span[dir="ltr"]',
      '.attributed-text-segment-list__content',
      '.feed-shared-text',
      '[data-test-id="main-feed-activity-card"] .break-words',
      'article .break-words'
    ];
    
    for (const selector of textSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        textContent = element.text().trim();
        break;
      }
    }

    // If no specific text found, try meta or title
    if (!textContent) {
      textContent = $('meta[property="og:description"]').attr('content') || 
                   $('meta[name="description"]').attr('content') || 
                   $('title').text() || 
                   'No text content found in this LinkedIn post.';
    }

    // Extract images from fully rendered content
    const images: Array<{url: string, alt: string, filename: string}> = [];
    const postImageSelectors = [
      '.feed-shared-image img',
      '.feed-shared-article img',
      '.media-entity img',
      '.image-attachment img',
      '[data-view-name="feed-shared-image"] img',
      '.shared-image img',
      '.media-outlet-card__image img',
      'article .shared-image img'
    ];
    
    postImageSelectors.forEach(selector => {
      $(selector).each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        // Filter out profile pictures, logos, and UI elements
        const isContentImage = src && 
          src.startsWith('http') && 
          !src.includes('data:') &&
          !src.includes('profile-displayphoto') &&
          !src.includes('logo') &&
          !src.includes('avatar') &&
          !src.includes('emoji') &&
          !src.includes('icon') &&
          !alt.toLowerCase().includes('profile') &&
          !alt.toLowerCase().includes('logo') &&
          !alt.toLowerCase().includes('avatar') &&
          (src.includes('media') || src.includes('image') || src.includes('photo') || src.includes('dms/image'));
        
        if (isContentImage) {
          const filename = `post-image-${images.length + 1}.jpg`;
          images.push({ 
            url: src, 
            alt: alt || `LinkedIn post content image ${images.length + 1}`, 
            filename 
          });
        }
      });
    });

    // Extract videos from fully rendered content
    const videos: Array<{url: string, title: string, duration: string, filename: string}> = [];
    $('video').each((index, element) => {
      const src = $(element).attr('src') || $(element).find('source').first().attr('src');
      if (src && src.startsWith('http')) {
        const title = `LinkedIn post video ${index + 1}`;
        const duration = 'Unknown';
        const filename = `post-video-${index + 1}.mp4`;
        videos.push({ url: src, title, duration, filename });
      }
    });

    // Extract documents
    const documents: Array<{url: string, title: string, type: string, size: string, filename: string}> = [];
    $('a[href*=".pdf"], a[href*=".doc"], a[href*=".ppt"]').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const title = $(element).text().trim() || `Document ${index + 1}`;
        const type = 'Document';
        const size = 'Unknown';
        const filename = title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
        documents.push({ url: href, title, type, size, filename });
      }
    });

    return {
      text: textContent,
      images: images, // return all images (removed .slice(0, 10))
      videos,
      documents
    };

  } catch (error) {
    console.error('Browserless extraction error:', error);
    throw new Error(`Failed to extract content using cloud browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Simple fetch-based extraction as fallback
async function simpleLinkedInExtraction(url: string): Promise<ExtractedContent> {
  try {
    const userAgent = new UserAgent();
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent.toString(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text content
    let textContent = '';
    
    // Try different selectors for LinkedIn post text
    const textSelectors = [
      '.feed-shared-text',
      '.attributed-text-segment-list__content',
      '[data-view-name="feed-shared-text"]',
      '.break-words',
      'article .break-words'
    ];

    for (const selector of textSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        textContent = element.text().trim();
        break;
      }
    }

    // If no specific text found, try to extract from meta description or title
    if (!textContent) {
      textContent = $('meta[property="og:description"]').attr('content') || 
                   $('meta[name="description"]').attr('content') || 
                   $('title').text() || 
                   'No text content found in this LinkedIn post.';
    }

    // Extract ALL images from post content (not profile/slideshow images)
    const images: Array<{url: string, alt: string, filename: string}> = [];
    
    // Search comprehensively for ALL LinkedIn media URLs
    const scriptContent = $('script').text();
    
    // Comprehensive patterns for LinkedIn multi-image posts and carousels
    const mediaPatterns = [
      // Standard image patterns
      /"imageUrl":"([^"]+)"/g,
      /"url":"([^"]*(?:media|image|photo|dms)[^"]*)"/g,
      /"src":"([^"]*(?:media|image|photo|dms)[^"]*)"/g,
      /"image":"([^"]+)"/g,
      /"vectorImage":"([^"]+)"/g,
      /"displayImageUrl":"([^"]+)"/g,
      /"backgroundImage":"([^"]+)"/g,
      
      // Multi-image and carousel specific patterns
      /"images":\s*\[([^\]]+)\]/g,
      /"media":\s*\[([^\]]+)\]/g,
      /"content":\s*\[([^\]]+)\]/g,
      /"displayImages":\s*\[([^\]]+)\]/g,
      /"carouselMedia":\s*\[([^\]]+)\]/g,
      
      // Direct LinkedIn CDN URLs
      /https:\/\/media\.licdn\.com\/dms\/image\/[^"'\s,}]+/g,
      /https:\/\/dms\.licdn\.com\/[^"'\s,}]+/g,
      /https:\/\/media-exp\d*\.licdn\.com\/[^"'\s,}]+/g,
      
      // Feedshare and post-specific patterns
      /feedshare-shrink_\d+\/[^"'\s,}]+/g,
      /feedshare-shrink_800[^"'\s,}]*/g,
      /feedshare-shrink_2048[^"'\s,}]*/g,
      
      // Image ID patterns for carousel posts
      /"([^"]*D\d+AQ[^"]*feedshare[^"]*)"/g,
      /"([^"]*v2\/D\d+AQ[^"]*)"/g
    ];
    
    console.log('Searching for media content in script data...');
    let foundMediaCount = 0;
    
    mediaPatterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(scriptContent)) !== null) {
        let url = match[1] || match[0]; // Some patterns capture full URL, others capture group
        
        // Handle array matches (for patterns that capture image arrays)
        if (url && url.includes('[') || url.includes(',')) {
          // Parse arrays of URLs
          const arrayMatches = url.match(/"([^"]*(?:media|dms|image)[^"]*)"/g);
          if (arrayMatches) {
            arrayMatches.forEach(arrayUrl => {
              const cleanArrayUrl = arrayUrl.replace(/"/g, '').replace(/\\u[\dA-F]{4}/gi, '').replace(/\\\//g, '/');
              if (cleanArrayUrl.startsWith('http') && !images.some(img => img.url === cleanArrayUrl)) {
                foundMediaCount++;
                images.push({
                  url: cleanArrayUrl,
                  alt: `LinkedIn post image ${images.length + 1}`,
                  filename: `post-image-${images.length + 1}.jpg`
                });
                console.log(`Found array media ${foundMediaCount}:`, cleanArrayUrl.substring(0, 80) + '...');
              }
            });
          }
        } else if (url) {
          // Handle single URLs
          url = url.replace(/\\u[\dA-F]{4}/gi, '').replace(/\\\//g, '/').replace(/\\"/g, '"');
          
          // Make sure it's a complete URL
          if (!url.startsWith('http') && url.includes('dms/image')) {
            url = 'https://media.licdn.com/' + url;
          }
          
          // Enhanced filtering for post content media
          const isPostContentMedia = url && 
            url.startsWith('http') &&
            !url.includes('profile-displayphoto') &&
            !url.includes('profile-photo') &&
            !url.includes('company-logo') &&
            !url.includes('logo') &&
            !url.includes('icon') &&
            !url.includes('emoji') &&
            !url.includes('/in/') &&  // Profile paths
            !url.includes('headshot') &&
            !url.includes('avatar') &&
            (url.includes('dms') ||              // LinkedIn DMS media
             url.includes('media.licdn.com') ||  // LinkedIn CDN
             url.includes('media-exp') ||        // LinkedIn media
             url.includes('image') ||            // Image URLs
             url.includes('photo') ||            // Photo URLs
             url.includes('feedshare') ||        // LinkedIn post sharing
             url.includes('video')) &&           // Video URLs
            !images.some(img => img.url === url) &&  // Avoid duplicates
            url.length > 30; // Filter out tiny URLs
          
          if (isPostContentMedia) {
            foundMediaCount++;
            images.push({
              url: url,
              alt: `LinkedIn post media ${images.length + 1}`,
              filename: `post-media-${images.length + 1}.jpg`
            });
            console.log(`Found media ${foundMediaCount}:`, url.substring(0, 80) + '...');
          }
        }
      }
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
    });
    
    console.log(`Total media items found in scripts: ${foundMediaCount}`);
    
    // Additional aggressive search for carousel/multi-image posts
    console.log('Performing aggressive search for multi-image content...');
    const allScriptTexts = $('script').map((i, el) => $(el).text()).get();
    const combinedScript = allScriptTexts.join(' ');
    
    // Look for specific LinkedIn image ID patterns that indicate multiple images
    const imageIdPatterns = [
      /D\d+AQG[A-Za-z0-9_-]+/g,  // LinkedIn image IDs
      /D\d+AQF[A-Za-z0-9_-]+/g,  // More LinkedIn image IDs
      /D\d+AQE[A-Za-z0-9_-]+/g,  // Even more LinkedIn image IDs
    ];
    
    imageIdPatterns.forEach(pattern => {
      const matches = combinedScript.match(pattern);
      if (matches) {
        console.log(`Found ${matches.length} potential image IDs:`, matches.slice(0, 5));
        matches.forEach((imageId, index) => {
          // Construct full LinkedIn image URLs from IDs
          const possibleUrls = [
            `https://media.licdn.com/dms/image/v2/${imageId}/feedshare-shrink_800/0/`,
            `https://media.licdn.com/dms/image/v2/${imageId}/feedshare-shrink_2048/0/`,
            `https://media.licdn.com/dms/image/${imageId}/feedshare-shrink_800/0/`,
            `https://media.licdn.com/dms/image/${imageId}/feedshare-shrink_2048/0/`
          ];
          
          possibleUrls.forEach(url => {
            if (!images.some(img => img.url.includes(imageId))) {
              foundMediaCount++;
              images.push({
                url: url,
                alt: `LinkedIn carousel image ${images.length + 1}`,
                filename: `carousel-image-${images.length + 1}.jpg`
              });
              console.log(`Constructed image URL ${foundMediaCount}:`, url);
            }
          });
        });
      }
    });
    
    console.log(`Final total media items found: ${images.length}`);

    // Deep search in JSON-LD and other structured data
    $('script[type="application/ld+json"], script:contains("media"), script:contains("image")').each((index, element) => {
      try {
        const content = $(element).text();
        
        // Try to parse as JSON first
        if ($(element).attr('type') === 'application/ld+json') {
          const jsonData = JSON.parse(content);
          const extractFromStructuredData = (obj: any, path: string = '') => {
            if (typeof obj === 'object' && obj !== null) {
              Object.keys(obj).forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;
                if ((key.toLowerCase().includes('image') || key.toLowerCase().includes('media') || key.toLowerCase().includes('url')) && typeof obj[key] === 'string') {
                  const mediaUrl = obj[key];
                  if (mediaUrl.startsWith('http') && 
                      (mediaUrl.includes('media') || mediaUrl.includes('image') || mediaUrl.includes('photo')) &&
                      !mediaUrl.includes('profile') && 
                      !mediaUrl.includes('avatar') &&
                      !mediaUrl.includes('logo') &&
                      !images.some(img => img.url === mediaUrl)) {
                    images.push({
                      url: mediaUrl,
                      alt: `LinkedIn structured data media`,
                      filename: `structured-${images.length + 1}.jpg`
                    });
                    console.log('Found structured data media:', mediaUrl.substring(0, 60) + '...');
                  }
                } else if (Array.isArray(obj[key])) {
                  obj[key].forEach((item: any, idx: number) => extractFromStructuredData(item, `${currentPath}[${idx}]`));
                } else if (typeof obj[key] === 'object') {
                  extractFromStructuredData(obj[key], currentPath);
                }
              });
            }
          };
          extractFromStructuredData(jsonData);
        } else {
          // Search for URLs in non-JSON script content
          const urlMatches = content.match(/https:\/\/[^"'\s,}]+(?:media|image|photo|dms)[^"'\s,}]*/g);
          if (urlMatches) {
            urlMatches.forEach(url => {
              if (!url.includes('profile') && 
                  !url.includes('avatar') && 
                  !url.includes('logo') &&
                  !images.some(img => img.url === url)) {
                images.push({
                  url: url,
                  alt: `LinkedIn script media`,
                  filename: `script-media-${images.length + 1}.jpg`
                });
                console.log('Found script media:', url.substring(0, 60) + '...');
              }
            });
          }
        }
      } catch (e) {
        // Continue if parsing fails
      }
    });

    // Extract from Open Graph meta tags (but verify they're post content, not profile)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && 
        ogImage.startsWith('http') && 
        !ogImage.includes('profile') && 
        !ogImage.includes('slideshow') &&
        !images.some(img => img.url === ogImage)) {
      images.push({
        url: ogImage,
        alt: 'LinkedIn post main image',
        filename: 'post-main-image.jpg'
      });
    }

    // Extract from img elements with very strict filtering for post content only
    $('img').each((index, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      const parentClass = $(element).parent().attr('class') || '';
      
      // Very strict filtering - only images that are clearly post content
      const isPostContentImage = src && 
        src.startsWith('http') && 
        !src.includes('data:') &&
        !src.includes('profile-displayphoto') &&
        !src.includes('profile-photo') &&
        !src.includes('company-logo') &&
        !src.includes('background') &&
        !src.includes('slideshow') &&
        !src.includes('carousel') &&
        !src.includes('avatar') &&
        !src.includes('emoji') &&
        !src.includes('/p/') &&  // Profile paths
        !alt.toLowerCase().includes('profile') &&
        !alt.toLowerCase().includes('avatar') &&
        !alt.toLowerCase().includes('logo') &&
        !parentClass.includes('profile') &&
        !parentClass.includes('avatar') &&
        (src.includes('dms-image') ||    // LinkedIn media service
         src.includes('media-exp') ||    // LinkedIn media
         src.includes('media.licdn.com') ||  // LinkedIn CDN
         (src.includes('media') && src.includes('licdn'))) &&  // LinkedIn media URLs
        !images.some(img => img.url === src);  // Avoid duplicates
      
      if (isPostContentImage) {
        images.push({ 
          url: src, 
          alt: alt || `LinkedIn post content image ${images.length + 1}`, 
          filename: `content-image-${images.length + 1}.jpg`
        });
      }
    });

    // Enhanced video extraction
    const videos: Array<{url: string, title: string, duration: string, filename: string}> = [];
    
    // Look for video elements
    $('video').each((index, element) => {
      const src = $(element).attr('src') || $(element).find('source').first().attr('src');
      if (src && src.startsWith('http')) {
        videos.push({
          url: src,
          title: `LinkedIn post video ${videos.length + 1}`,
          duration: 'Unknown',
          filename: `post-video-${videos.length + 1}.mp4`
        });
      }
    });
    
    // Search for video URLs in script content
    const videoPatterns = [
      /"videoUrl":"([^"]+)"/g,
      /"url":"([^"]*video[^"]*)"/g,
      /https:\/\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]+video[^"'\s]*/g
    ];
    
    videoPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(scriptContent)) !== null) {
        let videoUrl = match[1] || match[0];
        if (videoUrl && videoUrl.startsWith('http') && !videos.some(v => v.url === videoUrl)) {
          videos.push({
            url: videoUrl,
            title: `LinkedIn post video ${videos.length + 1}`,
            duration: 'Unknown', 
            filename: `script-video-${videos.length + 1}.mp4`
          });
          console.log('Found video:', videoUrl.substring(0, 60) + '...');
        }
      }
      pattern.lastIndex = 0;
    });
    
    console.log(`Total videos found: ${videos.length}`);

    // Extract documents
    const documents: Array<{url: string, title: string, type: string, size: string, filename: string}> = [];
    $('a[href*=".pdf"], a[href*=".doc"], a[href*=".ppt"]').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const title = $(element).text().trim() || `Document ${index + 1}`;
        const type = 'Document';
        const size = 'Unknown';
        const filename = title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
        documents.push({ url: href, title, type, size, filename });
      }
    });

    return {
      text: textContent,
      images: images.slice(0, 10), // Limit to first 10 images
      videos,
      documents
    };

  } catch (error) {
    console.error('Simple extraction error:', error);
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// LinkedIn post extraction function
async function extractLinkedInPost(url: string): Promise<ExtractedContent> {
  let browser;
  try {
    // Launch browser with stealth settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    const userAgent = new UserAgent();
    await page.setUserAgent(userAgent.toString());
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    // Navigate to the LinkedIn post
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await page.waitForSelector('article, [data-id]', { timeout: 10000 });

    // Extract content using page.evaluate
    const extractedData = await page.evaluate(() => {
      // Extract text content
      const textSelectors = [
        '[data-view-name="feed-shared-text"] span[dir="ltr"]',
        '.feed-shared-text span[dir="ltr"]',
        '.attributed-text-segment-list__content',
        '.feed-shared-text',
        '[data-test-id="main-feed-activity-card"] .break-words',
        'article .break-words'
      ];
      
      let textContent = '';
      for (const selector of textSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          textContent = element.textContent.trim();
          break;
        }
      }

      // If no text found with specific selectors, try broader approach
      if (!textContent) {
        const article = document.querySelector('article');
        if (article) {
          // Look for any text content within the article
          const textElements = article.querySelectorAll('span, p, div');
          for (const el of textElements) {
            if (el.textContent && el.textContent.length > 50 && !el.querySelector('img, video')) {
              textContent = el.textContent.trim();
              break;
            }
          }
        }
      }

      // Extract images - focus on post content images only
      const images: Array<{url: string, alt: string, filename: string}> = [];
      const imgSelectors = [
        '.feed-shared-image img',                    // Main post images
        '.feed-shared-article img',                  // Article images
        '.media-entity img',                         // Media entities
        '.image-attachment img',                     // Image attachments
        '[data-view-name="feed-shared-image"] img',  // Feed shared images
        '.shared-image img',                         // Shared images
        '.media-outlet-card__image img',             // Media outlet images
        'article .shared-image img'                  // Article shared images
      ];
      
      const imageElements = new Set<HTMLImageElement>();
      for (const selector of imgSelectors) {
        const nodeList = document.querySelectorAll(selector);
        for (let i = 0; i < nodeList.length; i++) {
          const img = nodeList[i];
          if (img instanceof HTMLImageElement) {
            imageElements.add(img);
          }
        }
      }

      let imageIndex = 0;
      imageElements.forEach((img) => {
        // Filter out profile pictures, logos, and UI elements
        const isContentImage = img.src && 
          img.src.startsWith('http') && 
          !img.src.includes('data:') &&
          !img.src.includes('profile-displayphoto') &&        // Profile pictures
          !img.src.includes('logo') &&                        // Company logos
          !img.src.includes('avatar') &&                      // Avatar images
          !img.src.includes('emoji') &&                       // Emoji images
          !img.src.includes('icon') &&                        // Icon images
          !img.alt?.toLowerCase().includes('profile') &&      // Profile related
          !img.alt?.toLowerCase().includes('logo') &&         // Logo related
          !img.alt?.toLowerCase().includes('avatar') &&       // Avatar related
          (img.src.includes('media') ||                       // Media URLs are usually content
           img.src.includes('image') ||                       // Image URLs
           img.src.includes('photo') ||                       // Photo URLs
           img.src.includes('dms/image'));                     // LinkedIn media service images
        
        if (isContentImage) {
          const alt = img.alt || `LinkedIn post content image ${imageIndex + 1}`;
          const filename = `post-image-${imageIndex + 1}.jpg`;
          images.push({ url: img.src, alt, filename });
          imageIndex++;
        }
      });

      // Extract videos
      const videos: Array<{url: string, title: string, duration: string, filename: string}> = [];
      const videoElements = document.querySelectorAll('video, [data-view-name*="video"]');
      
      for (let i = 0; i < videoElements.length; i++) {
        const video = videoElements[i];
        if (video instanceof HTMLVideoElement && video.src) {
          const title = `LinkedIn post video ${i + 1}`;
          const duration = video.duration ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
          const filename = `linkedin-video-${i + 1}.mp4`;
          videos.push({ url: video.src, title, duration, filename });
        }
      }

      // Extract documents/attachments
      const documents: Array<{url: string, title: string, type: string, size: string, filename: string}> = [];
      const docSelectors = [
        'a[href*=".pdf"]',
        'a[href*=".doc"]',
        'a[href*=".docx"]',
        'a[href*=".ppt"]',
        'a[href*=".pptx"]',
        'a[href*=".xls"]',
        'a[href*=".xlsx"]',
        '[data-view-name*="document"]',
        '.document-attachment'
      ];

      let docIndex = 0;
      for (const selector of docSelectors) {
        const docElements = document.querySelectorAll(selector);
        for (let i = 0; i < docElements.length; i++) {
          const link = docElements[i];
          if (link instanceof HTMLAnchorElement && link.href) {
            const title = link.textContent?.trim() || `Document ${docIndex + 1}`;
            const type = 'Document';
            const size = 'Unknown';
            const filename = title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
            documents.push({ url: link.href, title, type, size, filename });
            docIndex++;
          }
        }
      }

      return { textContent, images, videos, documents };
    });

    // Format the extracted data
    const extractedContent: ExtractedContent = {
      text: extractedData.textContent || 'No text content found in this LinkedIn post.',
      images: extractedData.images || [],
      videos: extractedData.videos || [],
      documents: extractedData.documents || []
    };

    return extractedContent;

  } catch (error) {
    console.error('LinkedIn extraction error:', error);
    throw new Error(`Failed to extract content from LinkedIn post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // LinkedIn post extraction endpoint
  app.post("/api/linkedin/extract", async (req, res) => {
    try {
      const { url, demoMode } = extractRequestSchema.parse(req.body);
      
      // Clean and validate the URL
      const cleanUrl = url.trim();
      if (!cleanUrl) {
        return res.status(400).json({
          error: "Please provide a LinkedIn post URL"
        });
      }
      
      console.log('Processing URL:', cleanUrl);

      // If demo mode is enabled, return sample data
      if (demoMode) {
        const demoContent: ExtractedContent = {
          text: `🚀 Excited to share our latest innovation in AI technology! Our team has been working tirelessly to develop a revolutionary machine learning platform that will transform how businesses approach data analytics. The future of intelligent automation is here, and we're proud to be leading the charge.

Key highlights:
✅ 40% faster processing speed
✅ Enhanced accuracy with 99.2% precision
✅ Seamless integration with existing systems
✅ Cost-effective solution for enterprises

Thank you to everyone who supported this journey. Looking forward to the amazing possibilities ahead!

#Innovation #Technology #AI #MachineLearning #Future #Startup #Tech`,
          images: [
            {
              url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              alt: "AI technology dashboard interface showing analytics",
              filename: "ai-dashboard.jpg"
            },
            {
              url: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              alt: "Modern office space with technology",
              filename: "office-tech.jpg"
            },
            {
              url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              alt: "Team collaboration meeting",
              filename: "team-collaboration.jpg"
            }
          ],
          videos: [
            {
              url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
              title: "Product Demo Video",
              duration: "2:45",
              filename: "product-demo.mp4"
            }
          ],
          documents: [
            {
              url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              title: "AI Innovation Whitepaper.pdf",
              type: "PDF Document",
              size: "2.3 MB",
              filename: "ai-whitepaper.pdf"
            },
            {
              url: "https://file-examples.com/storage/fe68c1a5c4b6b7a6f42ac4e/2017/10/file_example_PPT_1MB.ppt",
              title: "Product Roadmap 2024.pptx",
              type: "PowerPoint Presentation",
              size: "5.7 MB",
              filename: "roadmap-2024.pptx"
            }
          ]
        };

        return res.json(demoContent);
      }

      // For real LinkedIn extraction, try cloud browser first, then fallback methods
      try {
        // Try Browserless.io first (best for media extraction)
        const extractedContent = await browserlessLinkedInExtraction(cleanUrl);
        return res.json(extractedContent);
      } catch (browserlessError) {
        console.log('Browserless extraction failed, trying simple extraction:', browserlessError instanceof Error ? browserlessError.message : 'Unknown error');
        
        try {
          // Fallback to simple HTML extraction (text only, limited media)
          const extractedContent = await simpleLinkedInExtraction(cleanUrl);
          return res.json(extractedContent);
        } catch (simpleError) {
          console.error('All extraction methods failed:', simpleError);
          return res.status(500).json({
            error: `Failed to extract content from LinkedIn post. Please make sure the URL is valid and publicly accessible.`
          });
        }
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors
        });
      }

      console.error("Extraction error:", error);
      return res.status(500).json({
        error: "Failed to extract LinkedIn post content"
      });
    }
  });

  // Media proxy to stream LinkedIn CDN assets via your server
  app.get("/api/proxy", async (req, res) => {
    try {
      const url = (req.query.url as string) || "";
      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ message: "Invalid or missing 'url' parameter" });
      }

      const userAgent = new UserAgent().toString();
      const response = await axios.get(url, {
        responseType: "stream",
        timeout: 30000,
        headers: {
          "User-Agent": userAgent,
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.linkedin.com/",
          "Connection": "keep-alive",
        },
        maxRedirects: 5,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        return res.status(response.status).end();
      }

      const contentType = response.headers["content-type"] || "application/octet-stream";
      const contentLength = response.headers["content-length"];
      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      response.data.pipe(res);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Media proxy error" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
