# LinkedIn Post Extractor

A modern web application that extracts content from LinkedIn posts, including text, images, videos, and documents. Built with React, TypeScript, Express.js, and Tailwind CSS.

## Features

- **Complete Content Extraction**: Extract text, images, videos, and documents from LinkedIn posts
- **Multi-Image Support**: Handles carousel posts with multiple images
- **Dark/Light Theme**: Professional UI with theme toggle
- **Selective Downloads**: Choose which content to download
- **ZIP Export**: Download all content as organized ZIP files
- **Real-time Preview**: Modal preview for all media types
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager

## Installation & Setup

1. **Clone or download this project folder**

2. **Install dependencies:**
```bash
cd "LinkedIn Post Extractor"
npm install
```

3. **Environment Setup (Optional):**
   - For enhanced media extraction, you can add a Browserless API key
   - Create a `.env` file in the root directory:
```bash
BROWSERLESS_API_KEY=your_api_key_here
```

## Running the Application

### Development Mode
```bash
npm run dev
```

This will start both the frontend and backend servers:
- Frontend: http://localhost:5000 
- Backend API: http://localhost:5000/api

### Production Build
```bash
npm run build
npm start
```

## How to Use

1. **Open the application** in your browser at http://localhost:5000

2. **Enter a LinkedIn post URL** in the input field
   - Example: `https://www.linkedin.com/posts/username_activity-123456789`

3. **Click "Extract Content"** to process the post

4. **Preview and select content:**
   - View extracted text, images, videos, and documents
   - Click on media items to preview them in full size
   - Use checkboxes to select which items to download

5. **Download content:**
   - Click "Download Selected" for chosen items
   - Click "Download All" to get everything as a ZIP file

## Demo Mode

Toggle "Demo Mode" to test the application with sample content without needing real LinkedIn URLs.

## Technical Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript  
- **UI Library**: shadcn/ui components with Radix UI
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **File Processing**: JSZip for ZIP file creation

## Project Structure

```
LinkedIn Post Extractor/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   ├── pages/         # Page components
│   │   └── App.tsx        # Main app component
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── vite.ts           # Vite integration
├── shared/               # Shared TypeScript schemas
└── package.json         # Project dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run type-check` - Run TypeScript checks

## Troubleshooting

**Port already in use:**
- Make sure no other applications are running on port 5000
- Or modify the port in `server/index.ts`

**LinkedIn content not extracting:**
- Ensure the LinkedIn post URL is public and accessible
- Some LinkedIn posts may require authentication to access
- Try using Demo Mode to test application functionality

**Missing images in carousel posts:**
- The app attempts to extract all images from multi-image posts
- LinkedIn's dynamic loading may limit extraction capabilities
- For best results, ensure the post is fully loaded and public

## License

This project is for educational and personal use only. Please respect LinkedIn's Terms of Service when using this tool.