import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function LoadingState() {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Extracting Content</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we extract content from the LinkedIn post...
          </p>
          <Progress value={65} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
