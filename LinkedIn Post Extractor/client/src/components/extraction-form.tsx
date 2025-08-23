import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { extractRequestSchema, type ExtractRequest, type ExtractedContent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ExtractionFormProps {
  onExtracted: (content: ExtractedContent) => void;
  onLoading: (loading: boolean) => void;
}

export function ExtractionForm({ onExtracted, onLoading }: ExtractionFormProps) {
  const [demoMode, setDemoMode] = useState(false);

  const form = useForm<ExtractRequest>({
    resolver: zodResolver(extractRequestSchema),
    defaultValues: {
      url: "",
      demoMode: false
    }
  });

  const extractMutation = useMutation({
    mutationFn: async (data: ExtractRequest) => {
      const response = await apiRequest("POST", "/api/linkedin/extract", data);
      return response.json() as Promise<ExtractedContent>;
    },
    onMutate: () => {
      onLoading(true);
    },
    onSuccess: (data) => {
      onLoading(false);
      onExtracted(data);
    },
    onError: (error) => {
      onLoading(false);
      console.error("Extraction failed:", error);
    }
  });

  const onSubmit = (data: ExtractRequest) => {
    extractMutation.mutate({ ...data, demoMode });
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Extract LinkedIn Post</h2>
          
          <div className="flex items-center space-x-3">
            <Label htmlFor="demo-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Demo Mode
            </Label>
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
              data-testid="switch-demo-mode"
            />
          </div>
        </div>

        {demoMode ? (
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Demo mode is enabled. Sample data will be used for extraction preview.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Real extraction mode is enabled. Content will be extracted directly from the LinkedIn post URL.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    LinkedIn Post URL
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="url"
                        placeholder="Enter LinkedIn post URL here..."
                        className="pr-10"
                        data-testid="input-linkedin-url"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter a valid LinkedIn post URL to extract its content
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6"
              disabled={extractMutation.isPending}
              data-testid="button-extract"
            >
              <Download className="w-5 h-5 mr-2" />
              {extractMutation.isPending ? "Extracting..." : "Extract Content"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
