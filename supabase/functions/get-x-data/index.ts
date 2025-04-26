import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get("MY_SUPABASE_URL")!,
  Deno.env.get("MY_SUPABASE_KEY")!,
);

type TweetRow = {
  tweet_id: string;
  text_content: string;
  is_retweet: boolean;
};

type UserTweetData = {
  user_tweets: string[];
  user_retweets: string[];
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { data, error } = await supabase.from('x_posts_table').select('*')
  if (error) { 
    throw error 
  }

  // Convert data to TweetRow[] and ensure type safety
  const tweets = data as TweetRow[];
  
  // Transform TweetRow[] to UserTweetData
  const userTweetData: UserTweetData = {
    user_tweets: tweets.filter(tweet => !tweet.is_retweet).map(tweet => tweet.text_content),
    user_retweets: tweets.filter(tweet => tweet.is_retweet).map(tweet => tweet.text_content)
  };

  return new Response(
    JSON.stringify(userTweetData),
    { headers: { "Content-Type": "application/json" } },
  )
})
