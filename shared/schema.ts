import { z } from "zod";

export const extractRequestSchema = z.object({
  url: z.string().url("Must be a valid URL").regex(/linkedin\.com/, "Must be a LinkedIn URL"),
  demoMode: z.boolean().default(false)
});

export const extractedContentSchema = z.object({
  text: z.string(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string(),
    filename: z.string()
  })),
  videos: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    duration: z.string(),
    filename: z.string()
  })),
  documents: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    type: z.string(),
    size: z.string(),
    filename: z.string()
  }))
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
export type ExtractedContent = z.infer<typeof extractedContentSchema>;
