import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const FREE_PAID_REGEX = /\[\s*(free|paid)\s*\]/i;

const url = new URL('https://www.reddit.com/r/jailbreak/search.json');

url.searchParams.append('q', 'subreddit:jailbreak (flair:Release OR flair:Update OR flair:Upcoming OR flair:News)');
url.searchParams.append('restrict_sr', 'on');
url.searchParams.append('t', 'month');


if (!existsSync('reddit-news')) {
	mkdirSync('reddit-news');
}

await Promise.all([
	generateNews('relevance'),
	generateNews('new')
]);


async function generateNews(sortBy) {
	const sortByCreated = sortBy !== 'new';

	const posts = [
		{
			title: 'r/jailbreak’s stance in Reddit’s recent API policy change',
			url: 'https://www.reddit.com/r/jailbreak/comments/141hva3/meta_rjailbreaks_stance_in_reddits_recent_api/',
			thumbnail: 'https://getzbra.com/assets/reddit_api_warning.jpg',
			tags: '',
			created: sortByCreated ? new Date('2030-01-01T00:00:00Z') : undefined
		}
	];

	// TEMPORARY: Blackout for Reddit protest June 12th - 13th PST
	if (Date.now() > new Date('2023-06-12T00:00:00-0700') && Date.now() < new Date('2023-06-14T00:00:00-0700')) {
		delete posts[0].created;
		writeToFile(posts, sortBy);
		return;
	}

	url.searchParams.set('sort', sortBy);
	const response = await fetch(url);
	const json = await response.json();

	for (const { data } of json.data.children) {
		validatePost(data);

		const thumbnail = getThumbnail(data);
		const title = cleanupTitle(data.title);
		const tags = createTags(data.title, data.link_flair_css_class);

		posts.push({
			title,
			url: `https://www.reddit.com${data.permalink}`,
			thumbnail,
			tags,
			created: sortByCreated ? data.created_utc : undefined
		});
	}

	if (posts.length === 0) throw new Error('No reddit news available. Houston we have a problem. Like seriously this is not good.');

	if (sortByCreated) {
		posts.sort((a, b) => b.created - a.created);
		posts.forEach(post => delete post.created);
	}

	writeToFile(posts, sortBy);
}


function validatePost(post) {
	if (!post.permalink || post.permalink.length === 0 || !(new URL(`https://www.reddit.com${post.permalink}`))) {
		throw new Error('Post permalink missing, did they change the JSON?');
	}

	if (!post.link_flair_css_class || post.link_flair_css_class.length === 0) {
		throw new Error('Post flair missing, did they change the JSON?');
	}

	if (!post.title || post.title.length === 0) {
		throw new Error('Post title missing, did they change the JSON?');
	}
}

function getThumbnail(post) {
	let thumbnail;
	if (post.thumbnail && post.thumbnail != 'nsfw') {
		if (post.preview?.images[0]?.source) {
			thumbnail = post.preview.images[0].source.url;
		}
		else if (post.media_metadata) {
			const entries = Object.values(post.media_metadata);
			for (const entry of entries) {
				if (entry.e === 'Image' && entry.s?.u) {
					thumbnail = entry.s.u;
				}
			}
		} else {
			try {
				// check that it is a valid URL
				new URL(post.thumbnail);
				thumbnail = post.thumbnail;
			} catch { }
		}
	}

	return thumbnail ?? null;
}

function cleanupTitle(title) {
	let cleaned = title.trim();

	let i = 0;
	while (cleaned.startsWith('[') && i < 5) {
		cleaned = cleaned
			.substring(cleaned.indexOf(']') + 1)
			.trimStart();
		i++;
	}

	return cleaned;
}

function createTags(title, postTag) {
	const match = title.match(FREE_PAID_REGEX);

	return match ? `${postTag},${match[1].toLowerCase()}` : postTag;
}

function writeToFile(posts, sort) {
	const filename = `reddit-news/${sort}.json`;

	writeFileSync(filename, JSON.stringify({
		data: posts
	}));

	console.log(`Written news sorted by ${sort} to ${filename}`);
}
