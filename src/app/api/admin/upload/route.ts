import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type (only audio files allowed)
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio files are allowed.' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // In production, you would upload to S3 or a storage service
    // For now, we simulate by returning a mock URL
    // You can integrate with S3, Cloudinary, or any storage service here

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;

    // Simulated storage - in production, upload to actual storage
    const mockUrl = `/uploads/audio/${filename}`;
    const mockS3Key = `audio/${filename}`;

    console.log('=== FILE UPLOAD SIMULATION ===');
    console.log(`Admin: ${admin.email}`);
    console.log(`Filename: ${file.name}`);
    console.log(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Type: ${file.type}`);
    console.log(`S3 Key (simulated): ${mockS3Key}`);
    console.log(`URL (simulated): ${mockUrl}`);
    console.log('============================');

    return NextResponse.json({
      message: 'File uploaded successfully',
      filename,
      url: mockUrl,
      s3Key: mockS3Key,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
