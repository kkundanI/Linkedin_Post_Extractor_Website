import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { extractRequestSchema, type ExtractedContent } from "@shared/schema";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import UserAgent from "user-agents";
import axios from "axios";

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
      images: images.slice(0, 10), // Limit to first 10 images
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

    // Extract images - focus on post content images only
    const images: Array<{url: string, alt: string, filename: string}> = [];
    
    // Specific selectors for post content images, excluding profile pics and logos
    const postImageSelectors = [
      '.feed-shared-image img',                    // Main post images
      '.feed-shared-article img',                  // Article images  
      '.media-entity img',                         // Media entities
      '.image-attachment img',                     // Image attachments
      '[data-view-name="feed-shared-image"] img',  // Feed shared images
      '.shared-image img'                          // Shared images
    ];
    
    postImageSelectors.forEach(selector => {
      $(selector).each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        // Filter out profile pictures, logos, and UI elements
        const isContentImage = src && 
          src.startsWith('http') && 
          !src.includes('data:') &&
          !src.includes('profile-displayphoto') &&        // Profile pictures
          !src.includes('logo') &&                        // Company logos
          !src.includes('avatar') &&                      // Avatar images
          !src.includes('emoji') &&                       // Emoji images
          !src.includes('icon') &&                        // Icon images
          !alt.toLowerCase().includes('profile') &&       // Profile related
          !alt.toLowerCase().includes('logo') &&          // Logo related
          !alt.toLowerCase().includes('avatar') &&        // Avatar related
          src.includes('media') ||                        // Media URLs are usually content
          src.includes('image') ||                        // Image URLs
          src.includes('photo');                          // Photo URLs
        
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

    // Extract videos (limited with simple fetch)
    const videos: Array<{url: string, title: string, duration: string, filename: string}> = [];
    $('video').each((index, element) => {
      const src = $(element).attr('src');
      if (src && src.startsWith('http')) {
        const title = `LinkedIn post video ${index + 1}`;
        const duration = 'Unknown';
        const filename = `linkedin-video-${index + 1}.mp4`;
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
        const extractedContent = await browserlessLinkedInExtraction(url);
        return res.json(extractedContent);
      } catch (browserlessError) {
        console.log('Browserless extraction failed, trying simple extraction:', browserlessError instanceof Error ? browserlessError.message : 'Unknown error');
        
        try {
          // Fallback to simple HTML extraction (text only, limited media)
          const extractedContent = await simpleLinkedInExtraction(url);
          return res.json(extractedContent);
        } catch (simpleError) {
          console.error('All extraction methods failed:', simpleError);
          return res.status(500).json({
            error: `Failed to extract content from LinkedIn post. Please make sure the URL is valid and publicly accessible. For media extraction, a Browserless API key is required.`
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
