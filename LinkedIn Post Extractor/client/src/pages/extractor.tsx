import { useState } from "react";
import { Header } from "@/components/header";
import { ExtractionForm } from "@/components/extraction-form";
import { LoadingState } from "@/components/loading-state";
import { ExtractedContent as ExtractedContentComponent } from "@/components/extracted-content";
import { type ExtractedContent } from "@shared/schema";

export default function Extractor() {
  const [isLoading, setIsLoading] = useState(false);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);

  const handleExtracted = (content: ExtractedContent) => {
    setExtractedContent(content);
    // Scroll to results
    setTimeout(() => {
      const element = document.getElementById("extracted-content");
      element?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExtractionForm onExtracted={handleExtracted} onLoading={setIsLoading} />
        
        {isLoading && (
          <div className="mt-8">
            <LoadingState />
          </div>
        )}
        
        {extractedContent && !isLoading && (
          <div id="extracted-content" className="mt-8">
            <ExtractedContentComponent content={extractedContent} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © 2024 LinkedIn Post Extractor. Built with modern web technologies.
            </p>
            <div className="mt-2 flex justify-center space-x-4 text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">Privacy Policy</a>
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">Terms of Service</a>
              <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
