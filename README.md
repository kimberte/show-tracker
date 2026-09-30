# Show Tracker

Simple TV show tracking app built with Next.js, Supabase and TVmaze.

## Current build
- TVmaze-powered show search
- Show detail pages with episode information
- Supabase schema for shows, episodes, profiles and tracked shows
- RLS policies for user-owned tracking
- Today and Discover routes ready for schedule/discovery work

## Vercel setup
After importing this repository into Vercel, add:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Get both from the new Show Tracker Supabase project. TVmaze requires no API key.

## Database
The initial migration is already applied to the Show Tracker Supabase project.