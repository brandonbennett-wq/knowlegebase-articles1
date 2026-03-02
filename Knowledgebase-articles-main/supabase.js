// Supabase Configuration
const SUPABASE_URL = 'https://akormuvqqiwdgnpopkud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrb3JtdXZxcWl3ZGducG9wa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI1MzksImV4cCI6MjA4NzU4ODUzOX0.5OOU5SJNCeBTMOGLtlcdxjRcpyB4d8H8aQS2F4m6bwk';

// Create Supabase client
const { createClient } = window.supabase;
window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase client initialized');
