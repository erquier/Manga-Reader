import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function convertPDFToImages(url: string): Promise<string[]> {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.8);
    });

    return Promise.all(pagePromises);
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw error;
  }
}