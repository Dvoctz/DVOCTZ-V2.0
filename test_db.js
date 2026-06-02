import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'missing';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'missing';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('fixtures').update({ 
    officiating_team_id: null 
  }).eq('id', 1);

  console.log('Error 1:', error);
  
  const { error: e2 } = await supabase.from('fixtures').update({
    stage: 'quarterfinal'
  }).eq('id', 1);
  console.log('Error 2:', e2);
  
  const { error: e3 } = await supabase.from('fixtures').update({
    best_of: 3
  }).eq('id', 1);
  console.log('Error 3:', e3);
  
}
test();
