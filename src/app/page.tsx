import { Metadata } from "next";
import SubscriptionTiers from "@/components/SubscriptionTiers";
import FileUpload from "@/components/FileUpload";
import { auth } from "@/lib/firebase/firebase";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PDF2MD - Convert PDFs to Markdown",
  description: "Convert PDF documents to Markdown with image extraction and formatting",
};

export default function Home() {
  return (
    <main className="container max-w-6xl mx-auto py-10 px-4">
      <Toaster position="top-right" />
      
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Convert PDF to Markdown
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform your PDF documents into clean, well-formatted Markdown with image extraction 
          for easy integration with note-taking apps like Obsidian.
        </p>
      </section>
      
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Choose Your Plan
        </h2>
        <SubscriptionTiers />
      </section>
      
      <section className="border rounded-xl p-8 bg-card mb-10">
        <h2 className="text-2xl font-bold mb-6">Upload Your PDF</h2>
        <FileUpload />
      </section>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">High Quality Conversion</h3>
          <p className="text-muted-foreground">
            Our AI-powered OCR extracts text and images with high accuracy, preserving the original document structure.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Image Extraction</h3>
          <p className="text-muted-foreground">
            Automatically extract and include images from your PDFs in the converted Markdown file.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Obsidian Compatible</h3>
          <p className="text-muted-foreground">
            Get Markdown files optimized for Obsidian with proper formatting and image references.
          </p>
        </div>
      </section>
      
      <footer className="text-center text-sm text-muted-foreground pt-8 border-t">
        <p>© {new Date().getFullYear()} PDF2MD. All rights reserved.</p>
      </footer>
    </main>
  );
}
