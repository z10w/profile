import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject too long'),
  message: z.string().min(10, 'Message too short').max(2000, 'Message too long'),
});

/**
 * POST /api/support/contact
 * Handle support contact form submissions
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = validationResult.data;

    // In a real implementation, you would:
    // 1. Store in database (support_tickets table)
    // 2. Send email notification to support team
    // 3. Create support ticket
    // 4. Send confirmation email to user

    // For now, we'll just log it and return success
    console.log('=== SUPPORT CONTACT ===');
    console.log(\`From: \${name} <\${email}>\`);
    console.log(\`Subject: \${subject}\`);
    console.log(\`Message: \${message}\`);
    console.log('============================');

    // Store in database (optional)
    // const ticket = await db.supportTicket.create({
    //   data: {
    //     name,
    //     email,
    //     subject,
    //     message,
    //     status: 'OPEN',
    //   },
    // });

    // Send email notification (requires email service like SendGrid, AWS SES, or Mailgun)
    // await sendSupportEmail({ name, email, subject, message });

    return NextResponse.json(
      { 
        message: 'Contact message sent successfully',
        ticketId: 'TKT-' + Date.now().toString(36).toUpperCase(),
        ticketStatus: 'OPEN',
        responseTime: 'Within 24 hours',
        note: 'Our support team will review your message and get back to you within 24 hours on business days.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Support contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
