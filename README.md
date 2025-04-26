# Social Media Scraper for Portfolio

This project contains a Supabase Edge Function that scrapes your X (Twitter) profile page via Nitter and stores the tweets in a Supabase database.

## GitHub Actions Setup

The GitHub Actions workflow will automatically deploy your Supabase Edge Functions when changes are pushed to the `main` branch. To set this up:

1. Go to your GitHub repository settings > Secrets and variables > Actions
2. Add the following repository secrets:
   - `SUPABASE_ACCESS_TOKEN`: Generate this from your Supabase dashboard under Account > Access Tokens
   - `SUPABASE_PROJECT_ID`: Your Supabase project reference ID (found in the URL of your Supabase dashboard or settings page)
   - `X_USERNAME`: Your X (Twitter) username without the @ symbol
   - `MY_SUPABASE_URL`: Your Supabase project URL (found in your Supabase project dashboard under Settings > API)
   - `MY_SUPABASE_KEY`: Your Supabase anon key (found in your Supabase project dashboard under Settings > API)

## Local Development

To run the function locally:

```bash
supabase start
supabase functions serve x-scraper --env-file .env.local
```

Create a `.env.local` file with:
```
X_USERNAME=your_twitter_handle
MY_SUPABASE_URL=your_supabase_project_url
MY_SUPABASE_KEY=your_supabase_anon_key
```

You can find your Supabase URL and anon key in your Supabase project dashboard under Settings > API.

## Deployment

The function is automatically deployed via GitHub Actions when you push changes to the main branch. You can also manually trigger the workflow from the Actions tab in your GitHub repository.

To deploy manually using the Supabase CLI:

```bash
supabase functions deploy x-scraper --project-ref your-project-id
supabase secrets set X_USERNAME=your_twitter_handle --project-ref your-project-id
supabase secrets set MY_SUPABASE_URL=your_supabase_project_url --project-ref your-project-id
supabase secrets set MY_SUPABASE_KEY=your_supabase_anon_key --project-ref your-project-id
```

## How It Works

The function:
1. Scrapes your X (Twitter) profile using Nitter instances
2. Extracts tweets, including text content and engagement metrics
3. Stores the data in the `x_posts_table` table in your Supabase database 