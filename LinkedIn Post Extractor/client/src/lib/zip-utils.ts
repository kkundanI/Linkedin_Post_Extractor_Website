import JSZip from "jszip";
import { saveAs } from "file-saver";
import { type ExtractedContent } from "@shared/schema";

interface SelectedItems {
  text: boolean;
  images: string[];
  videos: string[];
  documents: string[];
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.blob();
}

export async function downloadAsZip(content: ExtractedContent): Promise<void> {
  const zip = new JSZip();
  
  // Add text content
  if (content.text) {
    zip.file("text.txt", content.text);
  }

  // Create folders
  const imagesFolder = zip.folder("images");
  const videosFolder = zip.folder("videos");
  const documentsFolder = zip.folder("documents");

  // Add images
  for (const image of content.images) {
    try {
      const blob = await fetchAsBlob(image.url);
      imagesFolder?.file(image.filename, blob);
    } catch (error) {
      console.warn(`Failed to download image: ${image.filename}`, error);
    }
  }

  // Add videos
  for (const video of content.videos) {
    try {
      const blob = await fetchAsBlob(video.url);
      videosFolder?.file(video.filename, blob);
    } catch (error) {
      console.warn(`Failed to download video: ${video.filename}`, error);
    }
  }

  // Add documents
  for (const doc of content.documents) {
    try {
      const blob = await fetchAsBlob(doc.url);
      documentsFolder?.file(doc.filename, blob);
    } catch (error) {
      console.warn(`Failed to download document: ${doc.filename}`, error);
    }
  }

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "linkedin-post-content.zip");
}

export async function downloadSelectedAsZip(content: ExtractedContent, selected: SelectedItems): Promise<void> {
  const zip = new JSZip();
  
  // Add text content if selected
  if (selected.text && content.text) {
    zip.file("text.txt", content.text);
  }

  // Create folders only if needed
  const hasSelectedImages = selected.images.length > 0;
  const hasSelectedVideos = selected.videos.length > 0;
  const hasSelectedDocuments = selected.documents.length > 0;

  const imagesFolder = hasSelectedImages ? zip.folder("images") : null;
  const videosFolder = hasSelectedVideos ? zip.folder("videos") : null;
  const documentsFolder = hasSelectedDocuments ? zip.folder("documents") : null;

  // Add selected images
  for (const image of content.images) {
    if (selected.images.includes(image.url)) {
      try {
        const blob = await fetchAsBlob(image.url);
        imagesFolder?.file(image.filename, blob);
      } catch (error) {
        console.warn(`Failed to download image: ${image.filename}`, error);
      }
    }
  }

  // Add selected videos
  for (const video of content.videos) {
    if (selected.videos.includes(video.url)) {
      try {
        const blob = await fetchAsBlob(video.url);
        videosFolder?.file(video.filename, blob);
      } catch (error) {
        console.warn(`Failed to download video: ${video.filename}`, error);
      }
    }
  }

  // Add selected documents
  for (const doc of content.documents) {
    if (selected.documents.includes(doc.url)) {
      try {
        const blob = await fetchAsBlob(doc.url);
        documentsFolder?.file(doc.filename, blob);
      } catch (error) {
        console.warn(`Failed to download document: ${doc.filename}`, error);
      }
    }
  }

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "linkedin-post-selected-content.zip");
}
