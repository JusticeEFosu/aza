import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_TYPES = ['bug', 'feature', 'general'];
const VALID_STATUSES = ['new', 'in_progress', 'resolved'];

export async function POST(request: Request) {
  try {
    const { type, message, email, page_url, screenshot } = await request.json();

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message must be 2000 characters or less' }, { status: 400 });
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Check if user is logged in (optional — anonymous is fine)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Upload screenshot to Cloudinary if provided (base64 data URL)
    let screenshot_url: string | null = null;
    if (screenshot && typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (cloudName && apiKey && apiSecret) {
          const timestamp = Math.round(Date.now() / 1000);
          const folder = 'feedback_screenshots';
          const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
          const crypto = await import('crypto');
          const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

          const formData = new FormData();
          formData.append('file', screenshot);
          formData.append('folder', folder);
          formData.append('timestamp', String(timestamp));
          formData.append('api_key', apiKey);
          formData.append('signature', signature);

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
          );

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            screenshot_url = uploadData.secure_url;
          } else {
            console.error('Cloudinary upload failed:', await uploadRes.text());
          }
        }
      } catch (uploadErr) {
        console.error('Screenshot upload error:', uploadErr);
        // Non-blocking — still save the feedback without the screenshot
      }
    }

    // Use admin client for insert to bypass any potential RLS issues with anon
    const admin = createAdminClient();

    const { error } = await admin
      .from('platform_feedback')
      .insert({
        user_id: user?.id || null,
        email: email?.trim() || null,
        type: type || 'general',
        message: message.trim(),
        page_url: page_url || null,
        screenshot_url,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('platform_feedback')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Feedback update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Feedback IDs are required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the items to get screenshot_urls for Cloudinary cleanup
    const { data: itemsToDelete } = await admin
      .from('platform_feedback')
      .select('screenshot_url')
      .in('id', ids);

    // Delete images from Cloudinary
    if (itemsToDelete && itemsToDelete.length > 0) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudName && apiKey && apiSecret) {
        const crypto = await import('crypto');

        for (const item of itemsToDelete) {
          if (item.screenshot_url) {
            try {
              // Extract public_id from URL
              // URL format: https://res.cloudinary.com/cloudName/image/upload/v123456789/folder/file.ext
              const urlParts = item.screenshot_url.split('/upload/');
              if (urlParts.length === 2) {
                // Remove version (v123456789/) and extension (.png)
                const pathParts = urlParts[1].split('/');
                pathParts.shift(); // remove version
                const publicIdWithExt = pathParts.join('/');
                const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

                if (publicId) {
                  const timestamp = Math.round(Date.now() / 1000);
                  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
                  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

                  const formData = new FormData();
                  formData.append('public_id', publicId);
                  formData.append('timestamp', String(timestamp));
                  formData.append('api_key', apiKey);
                  formData.append('signature', signature);

                  const destroyRes = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
                    { method: 'POST', body: formData }
                  );
                  
                  if (!destroyRes.ok) {
                    console.error('Failed to destroy Cloudinary image:', await destroyRes.text());
                  }
                }
              }
            } catch (err) {
              console.error('Cloudinary destroy error:', err);
            }
          }
        }
      }
    }

    // Delete records from database
    const { error } = await admin
      .from('platform_feedback')
      .delete()
      .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Feedback deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
