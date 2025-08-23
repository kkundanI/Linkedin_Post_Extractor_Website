import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { extractRequestSchema, type ExtractedContent } from "@shared/schema";

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

      // For real LinkedIn extraction, implement actual scraping logic here
      // This would require LinkedIn API access or web scraping capabilities
      // For now, return an error indicating real extraction is not implemented
      return res.status(501).json({
        error: "Real LinkedIn extraction not implemented yet. Please use demo mode."
      });

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
