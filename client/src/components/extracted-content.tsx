import { useState } from "react";
import { Copy, Check, FileText, Image, Video, FileType, Download, CheckSquare, Archive, Eye, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { type ExtractedContent } from "@shared/schema";
import { MediaPreviewModal } from "./media-preview-modal";
import { downloadAsZip, downloadSelectedAsZip } from "@/lib/zip-utils";

interface ExtractedContentProps {
  content: ExtractedContent;
}

interface SelectedItems {
  text: boolean;
  images: string[];
  videos: string[];
  documents: string[];
}

export function ExtractedContent({ content }: ExtractedContentProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ type: string; url: string; title: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    text: true,
    images: content.images.map(img => img.url),
    videos: content.videos.map(vid => vid.url),
    documents: content.documents.map(doc => doc.url)
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.text);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Text content has been copied to your clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive"
      });
    }
  };

  const handleItemSelection = (type: keyof SelectedItems, value: string | boolean) => {
    setSelectedItems(prev => {
      if (type === "text") {
        return { ...prev, text: value as boolean };
      }
      
      const currentList = prev[type] as string[];
      if (typeof value === "string") {
        const isSelected = currentList.includes(value);
        return {
          ...prev,
          [type]: isSelected 
            ? currentList.filter(item => item !== value)
            : [...currentList, value]
        };
      }
      
      return prev;
    });
  };

  const getTotalSelectedCount = () => {
    return (selectedItems.text ? 1 : 0) + 
           selectedItems.images.length + 
           selectedItems.videos.length + 
           selectedItems.documents.length;
  };

  const handleDownloadSelected = async () => {
    try {
      await downloadSelectedAsZip(content, selectedItems);
      toast({
        title: "Download started",
        description: "Your selected content is being prepared for download."
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to prepare download. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = async () => {
    try {
      await downloadAsZip(content);
      toast({
        title: "Download started",
        description: "All content is being prepared for download."
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to prepare download. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openPreview = (type: string, url: string, title: string) => {
    setPreviewModal({ type, url, title });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Text Content */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="text-blue-600 mr-2 h-5 w-5" />
                Extracted Text
              </h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-text"
                  checked={selectedItems.text}
                  onCheckedChange={(checked) => handleItemSelection("text", checked as boolean)}
                  data-testid="checkbox-text"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  data-testid="button-copy-text"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap" data-testid="text-content">
                {content.text}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Media Content */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Image className="text-green-600 mr-2 h-5 w-5" />
                Media Content
              </h3>
              <div className="flex space-x-2">
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {content.images.length} Images
                </Badge>
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  {content.videos.length} Videos
                </Badge>
              </div>
            </div>

            {/* Images Grid */}
            {content.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {content.images.map((image, index) => {
                  const isSelected = selectedItems.images.includes(image.url);
                  return (
                    <div key={index} className="relative group cursor-pointer">
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600 group-hover:opacity-75 transition-opacity"
                        onClick={() => openPreview("image", image.url, image.alt)}
                        data-testid={`img-preview-${index}`}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                        <Eye className="text-white opacity-0 group-hover:opacity-100 text-xl" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemSelection("images", image.url)}
                          className="bg-white"
                          data-testid={`checkbox-image-${index}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Videos */}
            {content.videos.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Videos</h4>
                {content.videos.map((video, index) => {
                  const isSelected = selectedItems.videos.includes(video.url);
                  return (
                    <div key={index} className="relative group cursor-pointer bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="aspect-video flex items-center justify-center" onClick={() => openPreview("video", video.url, video.title)}>
                        <div className="text-center">
                          <Video className="mx-auto h-12 w-12 text-blue-600 mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-video-title-${index}`}>{video.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Duration: {video.duration}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemSelection("videos", video.url)}
                          className="bg-white"
                          data-testid={`checkbox-video-${index}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        {content.documents.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileType className="text-red-600 mr-2 h-5 w-5" />
                  Documents
                </h3>
                <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                  {content.documents.length} Documents
                </Badge>
              </div>

              <div className="space-y-3">
                {content.documents.map((doc, index) => {
                  const isSelected = selectedItems.documents.includes(doc.url);
                  return (
                    <div key={index} className="flex items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <FileType className="text-red-600 text-xl mr-4" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white" data-testid={`text-doc-title-${index}`}>{doc.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{doc.size} • {doc.type}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview("document", doc.url, doc.title)}
                          data-testid={`button-preview-doc-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemSelection("documents", doc.url)}
                          data-testid={`checkbox-document-${index}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Actions */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Download className="text-blue-600 mr-2 h-5 w-5" />
              Download Options
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Button
                variant="outline"
                className="p-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold"
                onClick={handleDownloadSelected}
                data-testid="button-download-selected"
              >
                <CheckSquare className="mr-2 h-5 w-5" />
                Download Selected ({getTotalSelectedCount()} items)
              </Button>

              <Button
                className="p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={handleDownloadAll}
                data-testid="button-download-all"
              >
                <Archive className="mr-2 h-5 w-5" />
                Download All as ZIP
              </Button>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Your ZIP file will include all selected content organized in folders: text.txt, images/, videos/, and documents/
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {previewModal && (
        <MediaPreviewModal
          type={previewModal.type}
          url={previewModal.url}
          title={previewModal.title}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </>
  );
}
