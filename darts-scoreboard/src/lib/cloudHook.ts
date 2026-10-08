// Convenience bridge so UI components don't import supabase internals directly.
import { supabaseReady } from './supabase'

export const supabaseReadySafe = () => supabaseReady
export { pushMatches } from './cloud'
