import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MediaPreviewModalProps {
  type: string;
  url: string;
  title: string;
  onClose: () => void;
}

export function MediaPreviewModal({ type, url, title, onClose }: MediaPreviewModalProps) {
  const renderContent = () => {
    switch (type) {
      case "image":
        return (
          <img
            src={url}
            alt={title}
            className="max-w-full h-auto rounded-lg"
            data-testid="img-modal-preview"
          />
        );
      case "video":
        return (
          <video
            src={url}
            controls
            className="max-w-full h-auto rounded-lg"
            data-testid="video-modal-preview"
          >
            Your browser does not support the video tag.
          </video>
        );
      case "document":
        return (
          <div className="text-center p-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Document preview is not available. Click the link below to view or download.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
              data-testid="link-document-external"
            >
              Open {title}
            </a>
          </div>
        );
      default:
        return (
          <div className="text-center p-8">
            <p className="text-gray-600 dark:text-gray-400">Preview not available for this content type.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span data-testid="text-modal-title">{title}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
