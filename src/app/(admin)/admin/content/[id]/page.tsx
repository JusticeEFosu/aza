import { createAdminClient } from '@/lib/supabase/admin';
import ContentEditor from './ContentEditor';

export default async function AdminContentEditorPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const isNew = resolvedParams.id === 'new';
  let initialData = null;

  if (!isNew) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('platform_pages')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();
      
    initialData = data;
  }

  return <ContentEditor initialData={initialData} />;
}
