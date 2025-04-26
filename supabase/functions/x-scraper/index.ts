import { createClient } from "jsr:@supabase/supabase-js";
import { DOMParser } from "jsr:@b-fuze/deno-dom";
import type { Element } from "jsr:@b-fuze/deno-dom";

type TweetRow = {
  tweet_id: string;
  text_content: string;
  is_retweet: boolean;
};

const SUPABASE = createClient(
  Deno.env.get("MY_SUPABASE_URL")!,
  Deno.env.get("MY_SUPABASE_KEY")!,
);

async function fetchProfileHTML(username: string): Promise<string> {
  // Try multiple Nitter instances, as they might be more reliable than the main one
  const instances = [
    `https://nitter.net/${username}`,
    `https://nitter.lacontrevoie.fr/${username}`,
    `https://nitter.pussthecat.org/${username}`,
  ];
  
  const headers: HeadersInit = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  };
  
  let html = "";
  let lastError = null;
  
  // Try each instance until one works
  for (const url of instances) {
    try {
      console.log(`Fetching profile for ${username} via ${url}...`);
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        console.log(`Instance ${url} responded with ${res.status}`);
        lastError = new Error(`Instance responded ${res.status}`);
        continue;
      }
      
      html = await res.text();
      console.log(`Response status: ${res.status}`);
      console.log(`HTML length: ${html.length} bytes`);
      console.log(`HTML preview (first 500 chars):\n${html.substring(0, 500)}`);
      
      // If we got HTML with some content, stop trying
      if (html.length > 1000) {
        return html;
      }
    } catch (err) {
      console.log(`Error fetching from ${url}: ${err}`);
      lastError = err;
    }
  }
  
  // If we get here, all instances failed
  if (html.length > 0) {
    return html; // Return whatever we got, even if it's not ideal
  }
  
  throw lastError || new Error("All Nitter instances failed");
}

function extractTweets(html: string, username: string): TweetRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("DOMParser returned null – invalid HTML?");
  
  // Normalize username for comparison (lowercase)
  const normalizedUsername = username.toLowerCase();
  
  console.log("Document parsed successfully");
  
  // Try various selectors for tweet elements - Nitter might change its HTML structure
  let tweetElems: any[] = [];
  
  // Try multiple selectors in order of preference
  const selectors = [
    '.timeline-item:not(.pinned)',
    '.tweet-card:not(.pinned)',
    '.tweet:not(.pinned)',
    '.timeline-tweet',
    '.main-tweet',
    '.tweet-body',
  ];
  
  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      console.log(`Found ${elements.length} elements with selector '${selector}'`);
      tweetElems = Array.from(elements);
      break;
    }
  }
  
  // If no elements found with our selectors, try to find any elements with "tweet" in class name
  if (tweetElems.length === 0) {
    console.log("No elements found with standard selectors, trying generic approach");
    const allElements = doc.querySelectorAll('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const className = el.getAttribute('class') || '';
      if (className.toLowerCase().includes('tweet')) {
        tweetElems.push(el);
      }
    }
    console.log(`Found ${tweetElems.length} elements with 'tweet' in class name`);
  }
  
  if (tweetElems.length === 0) {
    // Debug if no tweets found
    console.log("No tweet elements found, checking for containers or error messages");
    
    const containerElems = doc.querySelectorAll('.timeline, .timeline-container');
    console.log(`Found ${containerElems.length} timeline containers`);
    
    // Check for errors or empty account messages
    const errorElems = doc.querySelectorAll('.error-panel, .empty-state');
    console.log(`Found ${errorElems.length} error/empty state messages`);
    if (errorElems.length > 0) {
      console.log(`Error message: ${errorElems[0].textContent?.trim()}`);
    }
    
    // Dump HTML body for debugging
    console.log("HTML body snippet (for debugging):");
    const body = doc.querySelector('body');
    if (body) {
      console.log(body.innerHTML.substring(0, 1500) + "...");
    }
    
    throw new Error("No tweet elements found");
  }

  const rows: TweetRow[] = [];
  let skippedCount = 0;
  
  tweetElems.forEach((el, index) => {
    console.log(`Processing tweet ${index+1}/${tweetElems.length}`);
    
    // Try to find tweet ID from various possible elements
    // First try the standard selector
    let linkEl = el.querySelector('.tweet-link');
    
    // If that fails, try other potential selectors
    if (!linkEl) {
      // Try to find any link containing '/status/'
      const allLinks = el.querySelectorAll('a');
      for (let i = 0; i < allLinks.length; i++) {
        const href = allLinks[i].getAttribute('href') || '';
        if (href.includes('/status/')) {
          linkEl = allLinks[i];
          break;
        }
      }
    }
    
    if (!linkEl) {
      console.log(`Tweet ${index+1}: Could not find link with status ID`);
      skippedCount++;
      return;
    }
    
    const href = linkEl.getAttribute("href") ?? "";
    console.log(`Tweet ${index+1}: href = "${href}"`);
    
    // Extract the tweet ID from the URL
    const idMatch = href.match(/\/status\/(\d+)/);
    if (!idMatch) {
      console.log(`Tweet ${index+1}: Invalid href format, no status ID found in ${href}`);
      skippedCount++;
      return;
    }
    const tweetId = idMatch[1];
    
    // Check if this is a retweet by extracting the username from href
    // The href format is typically /username/status/123456789 for original tweets
    // or /otheruser/status/123456789 for retweets
    const pathParts = href.split('/');
    const tweetAuthor = pathParts.length > 1 ? pathParts[1].toLowerCase() : '';
    const isRetweet = tweetAuthor !== normalizedUsername;
    console.log(`Tweet ${index+1}: Author = ${tweetAuthor}, isRetweet = ${isRetweet}`);
    
    // Try various selectors for tweet content
    let textEl = el.querySelector('.tweet-content');
    if (!textEl) {
      const contentSelectors = [
        '.tweet-text',
        '.timeline-tweet-text',
        '.post-content',
        '.tweet-body p',
        '.tweet-content-wrapper',
      ];
      
      for (const selector of contentSelectors) {
        textEl = el.querySelector(selector);
        if (textEl) break;
      }
    }
    
    let textContent = "";
    
    if (textEl) {
      textContent = textEl.textContent?.trim() || "";
    } else {
      // As a last resort, try to get text from the tweet element
      // But exclude child elements that are clearly not the tweet content
      const clone = el.cloneNode(true) as Element;
      
      // Remove potential noise elements
      const excludeSelectors = [
        '.tweet-stats',
        '.tweet-footer',
        '.tweet-date',
        '.tweet-header',
        '.tweet-media',
        '.tweet-reactions',
        '.tweet-info',
        '.tweet-name',
      ];
      
      for (const selector of excludeSelectors) {
        const elements = clone.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          elements[i].remove();
        }
      }
      
      textContent = clone.textContent?.trim() || "";
      
      // Limit to reasonable tweet length and remove excessive whitespace
      textContent = textContent
        .substring(0, 500)
        .replace(/\s+/g, ' ');
      
      console.log(`Tweet ${index+1}: Using full element text as fallback`);
    }
    
    if (!textContent) {
      console.log(`Tweet ${index+1}: Empty tweet content, skipping`);
      skippedCount++;
      return;
    }
    
    console.log(`Tweet ${index+1}: Successfully extracted tweet with ID ${tweetId}`);
    rows.push({
      tweet_id: tweetId,
      text_content: textContent,
      is_retweet: isRetweet,
    });
  });
  
  console.log(`Extraction complete: ${rows.length} tweets extracted, ${skippedCount} tweets skipped`);
  
  return rows;
}

async function upsertTweets(rows: TweetRow[]) {
  if (!rows.length) return;
  const { error } = await SUPABASE.from("x_posts_table")
    .upsert(rows, { onConflict: "tweet_id" });
  if (error) throw error;
}

async function handler() {
  try {
    const username = Deno.env.get("X_USERNAME");
    if (!username) throw new Error("X_USERNAME env var not set.");

    console.log("Starting scrape for user:", username);
    const html = await fetchProfileHTML(username);
    const tweets = extractTweets(html, username);

    await upsertTweets(tweets);
    console.log(
      `Scrape complete – processed ${tweets.length} tweet(s).`,
    );

    return new Response(JSON.stringify({ 
      ok: true,
      count: tweets.length,
      source: "nitter" 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 },
    );
  }
}

Deno.serve(handler);