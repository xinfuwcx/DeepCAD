import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReportTemplate from '../components/reporting/ReportTemplate';

/**
 * Options for generating the report.
 */
interface GenerateReportOptions {
  /** A React ref to the DOM element that contains the 3D viewport and legend. */
  reportContentRef: React.RefObject<HTMLDivElement>;
}

/**
 * Generates a PDF report from the current application state and a viewport snapshot.
 * @param options - The options for report generation, including the ref to the content to capture.
 */
export const generatePdfReport = async (options: GenerateReportOptions): Promise<void> => {
  const { reportContentRef } = options;

  if (!reportContentRef.current) {
    console.error('Report content reference is not available for capturing.');
    // Here you might want to show a user-facing notification.
    return;
  }

  // --- Step 1: Capture the viewport and legend as a single image ---
  const viewportCanvas = await html2canvas(reportContentRef.current, {
    useCORS: true, // Important for external resources
    allowTaint: true, // Necessary for WebGL canvas
    backgroundColor: '#18181b', // A dark background similar to the app's theme
    // Setting a fixed width can help standardize captures
    width: reportContentRef.current.clientWidth, 
    height: reportContentRef.current.clientHeight,
  });
  const viewportImage = viewportCanvas.toDataURL('image/png');

  // --- Step 2: Render the full report template off-screen ---
  const reportRootElement = document.createElement('div');
  // This class moves the element off-screen and gives it A4 paper dimensions
  reportRootElement.className = 'report-hidden-container';
  document.body.appendChild(reportRootElement);

  const reactRoot = createRoot(reportRootElement);
  const reportTemplateRef = React.createRef<HTMLDivElement>();

  // Render the template with the captured image. We'll wait for it to be ready.
  await new Promise<void>((resolve) => {
    reactRoot.render(
      React.createElement(ReportTemplate, {
        viewportImage: viewportImage,
        legendImage: null // legend is part of viewportImage now
      })
    );
    // A short timeout allows React to render and the browser to load the image into the template.
    setTimeout(resolve, 500);
  });
  
  if (!reportTemplateRef.current) {
    console.error('Failed to render the report template off-screen.');
    reactRoot.unmount();
    document.body.removeChild(reportRootElement);
    return;
  }
  
  // --- Step 3: Convert the rendered HTML report to a canvas ---
  const reportCanvas = await html2canvas(reportTemplateRef.current, {
    scale: 2, // Use a higher scale for better PDF quality
    windowWidth: reportTemplateRef.current.scrollWidth,
    windowHeight: reportTemplateRef.current.scrollHeight,
  });

  // --- Step 4: Create the PDF using jsPDF ---
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgData = reportCanvas.toDataURL('image/jpeg', 0.98); // High quality JPEG
  
  // Calculate the image height in the PDF to maintain aspect ratio
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  // --- Step 5: Add pages to the PDF, handling content that spans multiple pages ---
  let heightLeft = imgHeight;
  let position = 0;

  // Add the first page
  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Add more pages if the content is longer than one page
  while (heightLeft > 0) {
    position -= pdfHeight; // Move the image "up" on the next page
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  // --- Step 6: Save the PDF and clean up ---
  pdf.save(`DeepCAD-Report-${new Date().toISOString().slice(0, 10)}.pdf`);

  // Unmount the React component and remove the temporary DOM element
  reactRoot.unmount();
  document.body.removeChild(reportRootElement);
}; 