// app/components/credentialGenerator/credentialGenerator.ts
'use client';

interface CredentialData {
  clientId: string;
  businessName: string;
  personInCharge: string;
  email: string;
  password: string;
}

export const generateCredentialImage = async (data: CredentialData): Promise<Blob> => {
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Set canvas size
  canvas.width = 800;
  canvas.height = 600;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#7d3c3c';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Header background
  ctx.fillStyle = '#7d3c3c';
  ctx.fillRect(16, 16, canvas.width - 32, 110);

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 35px Roboto Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLIENT CREDENTIALS', canvas.width / 2, 70);

  // Subtitle "Gelato Wholesale Collective"
  ctx.font = '18px Roboto Condensed, sans-serif';
  ctx.fillText('Gelato Wholesale Collective', canvas.width / 2, 108);

  // Subtitle
  ctx.font = '18px "Arial", Arial, sans-serif';
  ctx.fillStyle = '#7d3c3c';
  ctx.fillText('Account Access Information', canvas.width / 2, 170);

  // Credential details
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7d3c3c';
  
  let yPos = 240;
  const lineHeight = 60;
  const labelX = 100;
  const valueX = 340;

  // Helper function to draw credential row
  const drawCredentialRow = (label: string, value: string, y: number) => {
    // Label
    ctx.font = 'bold 20px "Arial", Arial, sans-serif';
    ctx.fillStyle = '#7d3c3c';
    ctx.fillText(label, labelX, y);

    // Value background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(valueX - 10, y - 28, canvas.width - valueX - 90, 40);
    
    // Value border
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.strokeRect(valueX - 10, y - 28, canvas.width - valueX - 90, 40);

    // Value text
    ctx.fillStyle = 'black';
    ctx.font = '18px "Arial", Arial, sans-serif';
    ctx.fillText(value, valueX, y);
  };

  // Draw all credentials
  drawCredentialRow('Client ID:', data.clientId, yPos);
  yPos += lineHeight;
  
  drawCredentialRow('Business Name:', data.businessName, yPos);
  yPos += lineHeight;
  
  drawCredentialRow('Person in Charge:', data.personInCharge, yPos);
  yPos += lineHeight;
  
  drawCredentialRow('Email:', data.email, yPos);
  yPos += lineHeight;
  
  drawCredentialRow('Password:', data.password, yPos);

  // Footer
  ctx.textAlign = 'center';
  ctx.font = 'italic 14px "Arial", Arial, sans-serif';
  ctx.fillStyle = 'black';
  const footerY = canvas.height - 70;
  ctx.fillText('Please keep your credentials secure and confidential. We recommend that you change your', canvas.width / 2, footerY);
  ctx.fillText('password after your first login. Never share your password with anyone.', canvas.width / 2, footerY + 20);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/jpeg', 0.95);
  });
};

export const downloadCredentialImage = async (data: CredentialData) => {
  try {
    const blob = await generateCredentialImage(data);
    
    // Sanitize business name for filename (remove special characters)
    const sanitizedBusinessName = data.businessName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .trim();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedBusinessName}_credentials.png`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    
    // Trigger download
    a.click();
    
    // Small delay before cleanup to ensure download starts
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error downloading credential image:', error);
    throw error;
  }
};