#!/usr/bin/env npx ts-node

/**
 * Traverser CLI Tool
 *
 * Commands:
 *   yarn traverse analyze <url>  - Analyze a site and generate config
 *   yarn traverse test <url>     - Test extraction on a URL
 *   yarn traverse list           - List configured sites
 *   yarn traverse show <domain>  - Show config for a domain
 */

import { analyzeSite, saveSiteConfig, loadSiteConfig, listConfiguredSites } from "../lib/traverser/analyzer";
import { traverse, extractContent, getDomain, getSearchUrl, extractSearchResults } from "../lib/traverser";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command) {
    printHelp();
    process.exit(1);
  }

  switch (command) {
    case "analyze":
      await handleAnalyze(args[1]);
      break;
    case "test":
      await handleTest(args[1]);
      break;
    case "list":
      handleList();
      break;
    case "show":
      handleShow(args[1]);
      break;
    case "search":
      await handleSearch(args[1], args.slice(2).join(" "));
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      // If it looks like a URL, treat it as a test command
      if (command.startsWith("http")) {
        await handleTest(command);
      } else {
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
      }
  }
}

function printHelp() {
  console.log(`
Traverser CLI - AI-powered site configuration generator

Usage:
  yarn traverse <command> [options]

Commands:
  analyze <url>           Analyze a website and generate navigation config
  test <url>              Test content extraction on a URL
  search <domain> <query> Test search on a configured site
  list                    List all configured sites
  show <domain>           Show config for a specific domain

Examples:
  yarn traverse analyze https://sunnah.com
  yarn traverse test https://sunnah.com/bukhari:1
  yarn traverse search sunnah.com "fasting in ramadan"
  yarn traverse list
  yarn traverse show sunnah.com
`);
}

async function handleAnalyze(url: string) {
  if (!url) {
    console.error("Error: Please provide a URL to analyze");
    console.error("Usage: yarn traverse analyze <url>");
    process.exit(1);
  }

  console.log("\n=== Site Analyzer ===\n");

  const config = await analyzeSite(url, (msg) => console.log(msg));

  if (config) {
    console.log("\n=== Generated Config ===\n");
    console.log(JSON.stringify(config, null, 2));

    // Save config
    const filePath = saveSiteConfig(config);
    console.log(`\nConfig saved to: ${filePath}`);
  } else {
    console.error("\nFailed to generate config");
    process.exit(1);
  }
}

async function handleTest(url: string) {
  if (!url) {
    console.error("Error: Please provide a URL to test");
    console.error("Usage: yarn traverse test <url>");
    process.exit(1);
  }

  console.log("\n=== Testing URL ===\n");
  console.log(`URL: ${url}`);

  const domain = getDomain(url);
  console.log(`Domain: ${domain}`);

  // Check if we have a config
  const config = loadSiteConfig(domain);
  if (config) {
    console.log(`Config: ${config.name}`);
  } else {
    console.log(`Config: None (using generic extraction)`);
  }

  // Fetch the page
  console.log(`\nFetching page...`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes\n`);

    // Extract content
    const result = await traverse(url, html);

    console.log("=== Extraction Result ===\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error fetching URL: ${error}`);
    process.exit(1);
  }
}

async function handleSearch(domain: string, query: string) {
  if (!domain || !query) {
    console.error("Error: Please provide domain and search query");
    console.error("Usage: yarn traverse search <domain> <query>");
    process.exit(1);
  }

  // Remove .com etc if user included it
  domain = domain.replace("www.", "");

  console.log("\n=== Testing Search ===\n");
  console.log(`Domain: ${domain}`);
  console.log(`Query: ${query}`);

  const config = loadSiteConfig(domain);
  if (!config) {
    console.error(`\nNo config found for ${domain}`);
    console.error(`Run: yarn traverse analyze https://${domain}`);
    process.exit(1);
  }

  const searchUrl = getSearchUrl(query, config);
  console.log(`Search URL: ${searchUrl}\n`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status}`);
      process.exit(1);
    }

    const html = await response.text();
    const results = extractSearchResults(html, config);

    console.log(`=== Search Results (${results.length} found) ===\n`);
    results.slice(0, 10).forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

function handleList() {
  console.log("\n=== Configured Sites ===\n");

  const sites = listConfiguredSites();

  if (sites.length === 0) {
    console.log("No sites configured yet.");
    console.log("\nRun: yarn traverse analyze <url>");
    return;
  }

  sites.forEach((site) => {
    const config = loadSiteConfig(site);
    if (config) {
      console.log(`- ${site}: ${config.name}`);
    } else {
      console.log(`- ${site}`);
    }
  });
}

function handleShow(domain: string) {
  if (!domain) {
    console.error("Error: Please provide a domain");
    console.error("Usage: yarn traverse show <domain>");
    process.exit(1);
  }

  domain = domain.replace("www.", "").replace("https://", "").replace("http://", "");

  const config = loadSiteConfig(domain);

  if (!config) {
    console.error(`No config found for ${domain}`);
    console.error(`\nRun: yarn traverse analyze https://${domain}`);
    process.exit(1);
  }

  console.log("\n=== Site Config ===\n");
  console.log(JSON.stringify(config, null, 2));
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
