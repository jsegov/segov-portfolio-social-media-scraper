# Social Media Scraper for Portfolio

This project contains Supabase Edge Functions that scrape your social media profiles (currently X/Twitter) and store the data in a Supabase PostgreSQL database. It also provides API endpoints to retrieve the stored data for use in your portfolio or other applications.

## Functions

1. **x-scraper**: Scrapes your X (Twitter) profile via Nitter and stores tweets in the Supabase database.
2. **get-x-data**: Retrieves stored tweets from the database, separating regular tweets and retweets.

## GitHub Actions Setup

The GitHub Actions workflow will automatically deploy your Supabase Edge Functions when changes are pushed to the `main` branch. To set this up:

1. Go to your GitHub repository settings > Secrets and variables > Actions
2. Add the following repository secrets:
   - `SUPABASE_ACCESS_TOKEN`: Generate this from your Supabase dashboard under Account > Access Tokens
   - `PROJECT_ID`: Your Supabase project reference ID (found in the URL of your Supabase dashboard or settings page)
   - `X_USERNAME`: Your X (Twitter) username without the @ symbol
   - `MY_SUPABASE_URL`: Your Supabase project URL (found in your Supabase project dashboard under Settings > API)
   - `MY_SUPABASE_KEY`: Your Supabase anon key (found in your Supabase project dashboard under Settings > API)

## Local Development

To run the functions locally:

```bash
supabase start
# To run the scraper function
supabase functions serve x-scraper --env-file .env.local
# To run the data retrieval function
supabase functions serve get-x-data --env-file .env.local
```

Create a `.env.local` file with:
```
X_USERNAME=your_twitter_handle
MY_SUPABASE_URL=your_supabase_project_url
MY_SUPABASE_KEY=your_supabase_anon_key
```

You can find your Supabase URL and anon key in your Supabase project dashboard under Settings > API.

## Deployment

The functions are automatically deployed via GitHub Actions when you push changes to the main branch. You can also manually trigger the workflow from the Actions tab in your GitHub repository.

To deploy manually using the Supabase CLI:

```bash
# Deploy scraper function
supabase functions deploy x-scraper --project-ref your-project-id
# Deploy data retrieval function
supabase functions deploy get-x-data --project-ref your-project-id

# Set required secrets
supabase secrets set X_USERNAME=your_twitter_handle MY_SUPABASE_URL=your_supabase_project_url MY_SUPABASE_KEY=your_supabase_anon_key --project-ref your-project-id
```

## How It Works

### Scraper Function
1. Scrapes your X (Twitter) profile using Nitter instances
2. Extracts tweets, including text content and engagement metrics
3. Stores the data in the `x_posts_table` table in your Supabase database

### Data Retrieval Function
1. Connects to your Supabase database
2. Queries the `x_posts_table` to fetch stored tweets
3. Returns a structured JSON response with your tweets separated into regular tweets and retweets 